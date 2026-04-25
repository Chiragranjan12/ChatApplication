// Vanilla JS WebSocket Service with Memory Leak Prevention
// =============================================================================
// CONFIGURATION
// =============================================================================
const WS_URL = window.CONFIG?.WS_URL || 'http://localhost:8080/ws';
const MAX_STOMP_ERRORS_BEFORE_RECONNECT = 3;
const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30000;
const RECONNECT_BACKOFF_MULTIPLIER = 2;

// =============================================================================
// WEBSOCKET SERVICE CLASS
// =============================================================================
class WebSocketService {
    constructor() {
        this.client = null;
        
        // Track subscriptions to prevent memory leaks
        this.messageCallbacks = new Map();  // roomId -> callbacks[]
        this.roomSubscriptions = new Map(); // roomId -> subscription object
        
        this.userQueueSubscription = null;
        this.presenceCallbacks = [];
        this.presenceSubscription = null;
        
        this.matchCallbacks = [];
        this.matchSubscription = null;

        // Event callbacks
        this.onConnectionCb = null;
        this.onDisconnectionCb = null;
        this.onCloseCb = null;
        this.onErrorCb = null;

        // Error tracking
        this.stompErrorCount = 0;
        this.reconnectAttempts = 0;
        
        // Reconnection state
        this.reconnectTimeout = null;
        this.isReconnecting = false;
        this.isIntentionallyDisconnecting = false;
        
        // Message queue for offline sending
        this.messageQueue = [];
    }

    // =============================================================================
    // CONNECTION MANAGEMENT
    // =============================================================================
    
    connect() {
        // Prevent multiple simultaneous connections
        if (this.client?.connected) {
            console.log('[WS] Already connected');
            if (this.onConnectionCb) this.onConnectionCb();
            return;
        }

        const token = window.tokenManager?.getToken?.();
        if (!token) {
            console.error('[WS] Cannot connect: No authentication token');
            return;
        }

        const socket = new SockJS(WS_URL);
        
        this.client = new StompJs.Client({
            webSocketFactory: () => socket,
            connectHeaders: { Authorization: `Bearer ${token}` },
            debug: (str) => console.log('[STOMP]', str),
            reconnectDelay: 0, // We handle reconnection manually for exponential backoff
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });

        // -------------------------------------------------------------------------
        // onConnect - Handle successful connection
        // -------------------------------------------------------------------------
        this.client.onConnect = () => {
            console.log('[WS] Connected');
            this.reconnectAttempts = 0;
            this.stompErrorCount = 0;
            this.isReconnecting = false;
            
            if (this.onConnectionCb) this.onConnectionCb();

            // Clear old subscriptions (memory leak prevention)
            this._cleanupSubscriptions();

            // Re-subscribe to all active topics
            this._resubscribeAll();

            // Process queued messages
            this._processMessageQueue();
        };

        // -------------------------------------------------------------------------
        // onStompError - Handle STOMP protocol errors
        // -------------------------------------------------------------------------
        this.client.onStompError = (frame) => {
            this.stompErrorCount++;
            const error = new Error(frame.headers['message'] || 'STOMP error');
            console.error(`[WS] STOMP error #${this.stompErrorCount}:`, error.message);
            if (this.onErrorCb) this.onErrorCb(error);

            if (this.stompErrorCount >= MAX_STOMP_ERRORS_BEFORE_RECONNECT) {
                console.warn(`[WS] ${this.stompErrorCount} STOMP errors — forcing reconnect`);
                this.stompErrorCount = 0;
                this._scheduleReconnect();
            }
        };

        // -------------------------------------------------------------------------
        // onDisconnect - Handle intentional disconnect
        // -------------------------------------------------------------------------
        this.client.onDisconnect = () => {
            console.log('[WS] Disconnected');
            if (this.onDisconnectionCb) this.onDisconnectionCb();
        };

        // -------------------------------------------------------------------------
        // onWebSocketClose - Handle connection loss (auto-reconnect)
        // -------------------------------------------------------------------------
        this.client.onWebSocketClose = () => {
            console.log('[WS] WebSocket closed');
            if (this.onCloseCb) this.onCloseCb();
            
            // Clean up subscriptions
            this._cleanupSubscriptions();
            
            // Schedule reconnection if not intentional
            if (!this.isIntentionallyDisconnecting) {
                this._scheduleReconnect();
            }
        };

        this.client.activate();
    }

    // -------------------------------------------------------------------------
    // Disconnect - Clean up all resources
    // -------------------------------------------------------------------------
    disconnect() {
        console.log('[WS] Disconnecting...');
        this.isIntentionallyDisconnecting = true;
        
        // Clear reconnection timeout
        this._clearReconnectTimeout();

        // Unsubscribe from all topics (memory leak prevention)
        this._cleanupSubscriptions();

        // Disconnect STOMP client
        if (this.client) {
            try {
                this.client.deactivate();
            } catch (e) {
                console.error('[WS] Error during disconnect:', e);
            }
            this.client = null;
        }

        // Clear all callbacks
        this.messageCallbacks.clear();
        this.presenceCallbacks = [];
        this.matchCallbacks = [];
        
        // Reset state
        this.reconnectAttempts = 0;
        this.stompErrorCount = 0;
        this.isReconnecting = false;
        this.isIntentionallyDisconnecting = false;
        
        console.log('[WS] Disconnected');
    }

    // -------------------------------------------------------------------------
    // Reconnection with Exponential Backoff
    // -------------------------------------------------------------------------
    _scheduleReconnect() {
        if (this.isIntentionallyDisconnecting) return;
        if (this.isReconnecting) return;
        
        if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            console.error('[WS] Max reconnect attempts reached. Giving up.');
            this.isReconnecting = false;
            if (this.onErrorCb) {
                this.onErrorCb(new Error('Maximum reconnection attempts reached'));
            }
            return;
        }

        this.isReconnecting = true;
        this.reconnectAttempts++;
        
        // Exponential backoff: delay * 2^(attempts-1)
        const delay = Math.min(
            INITIAL_RECONNECT_DELAY_MS * Math.pow(RECONNECT_BACKOFF_MULTIPLIER, this.reconnectAttempts - 1),
            MAX_RECONNECT_DELAY_MS
        );
        
        console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
        
        this.reconnectTimeout = setTimeout(() => {
            this.connect();
        }, delay);
    }

    _clearReconnectTimeout() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
    }

    // -------------------------------------------------------------------------
    // Cleanup - Unsubscribe from all topics (prevents memory leaks)
    // -------------------------------------------------------------------------
    _cleanupSubscriptions() {
        // Clean up room subscriptions
        this.roomSubscriptions.forEach((sub, roomId) => {
            try {
                sub.unsubscribe();
                console.log(`[WS] Unsubscribed from room: ${roomId}`);
            } catch (e) {
                console.warn(`[WS] Error unsubscribing from room ${roomId}:`, e);
            }
        });
        this.roomSubscriptions.clear();
        
        // Clean up user queue subscription
        if (this.userQueueSubscription) {
            try {
                this.userQueueSubscription.unsubscribe();
            } catch (e) {
                console.warn('[WS] Error unsubscribing from user queue:', e);
            }
            this.userQueueSubscription = null;
        }
        
        // Clean up presence subscription
        if (this.presenceSubscription) {
            try {
                this.presenceSubscription.unsubscribe();
            } catch (e) {
                console.warn('[WS] Error unsubscribing from presence:', e);
            }
            this.presenceSubscription = null;
        }
        
        // Clean up match subscription
        if (this.matchSubscription) {
            try {
                this.matchSubscription.unsubscribe();
            } catch (e) {
                console.warn('[WS] Error unsubscribing from match:', e);
            }
            this.matchSubscription = null;
        }
    }

    // -------------------------------------------------------------------------
    // Re-subscribe to all active topics after reconnection
    // -------------------------------------------------------------------------
    _resubscribeAll() {
        // Re-subscribe to user queue
        this._subscribeUserQueue();
        
        // Re-subscribe to presence
        this._subscribePresence();
        
        // Re-subscribe to match queue
        this._subscribeMatchQueue();
        
        // Re-subscribe to all rooms with active callbacks
        this.messageCallbacks.forEach((callbacks, roomId) => {
            if (callbacks.length > 0) {
                this._subscribeRoomTopic(roomId);
            }
        });
    }

    // -------------------------------------------------------------------------
    // Message Queue - Store messages while offline
    // -------------------------------------------------------------------------
    _processMessageQueue() {
        if (this.messageQueue.length > 0) {
            console.log(`[WS] Processing ${this.messageQueue.length} queued messages`);
            this.messageQueue.forEach(msg => {
                this._doSendMessage(msg.destination, msg.body);
            });
            this.messageQueue = [];
        }
    }

    _queueMessage(destination, body) {
        this.messageQueue.push({ destination, body });
        console.log(`[WS] Message queued (${this.messageQueue.length} pending)`);
    }

    // =============================================================================
    // SUBSCRIPTIONS
    // =============================================================================

    _subscribeUserQueue() {
        if (!this.client || !this.client.connected) return;
        if (this.userQueueSubscription) return; // Already subscribed

        this.userQueueSubscription = this.client.subscribe('/user/queue/messages', (message) => {
            try {
                const wsMessage = JSON.parse(message.body);
                const callbacks = this.messageCallbacks.get(wsMessage.roomId) || [];
                callbacks.forEach(cb => cb(wsMessage));
            } catch (err) {
                console.error('[WS] Failed to parse user queue message:', err);
            }
        });
    }

    _subscribeRoomTopic(roomId) {
        if (!this.client || !this.client.connected) return;
        if (this.roomSubscriptions.has(roomId)) return; // Already subscribed

        const subscription = this.client.subscribe(`/topic/room/${roomId}`, (message) => {
            try {
                const wsMessage = JSON.parse(message.body);
                const callbacks = this.messageCallbacks.get(roomId) || [];
                callbacks.forEach(cb => cb(wsMessage));
            } catch (err) {
                console.error('[WS] Failed to parse room message:', err);
            }
        });

        this.roomSubscriptions.set(roomId, subscription);
    }

    _subscribePresence() {
        if (!this.client || !this.client.connected) return;
        if (this.presenceSubscription) return;

        this.presenceSubscription = this.client.subscribe('/topic/presence', (message) => {
            try {
                const wsMessage = JSON.parse(message.body);
                this.presenceCallbacks.forEach(cb => cb(wsMessage));
            } catch (err) {
                console.error('[WS] Failed to parse presence message:', err);
            }
        });
    }

    _subscribeMatchQueue() {
        if (!this.client || !this.client.connected) return;
        if (this.matchSubscription) return;

        this.matchSubscription = this.client.subscribe('/user/queue/match', (message) => {
            try {
                const wsMessage = JSON.parse(message.body);
                this.matchCallbacks.forEach(cb => cb(wsMessage));
            } catch (err) {
                console.error('[WS] Failed to parse match message:', err);
            }
        });
    }

    // =============================================================================
    // PUBLIC API
    // =============================================================================

    subscribeToRoom(roomId, callback) {
        if (callback) {
            const callbacks = this.messageCallbacks.get(roomId) || [];
            callbacks.push(callback);
            this.messageCallbacks.set(roomId, callbacks);
        }

        if (!this.client || !this.client.connected) {
            console.warn('[WS] Not connected — room subscription queued for', roomId);
            return;
        }

        this._subscribeUserQueue();
        this._subscribeRoomTopic(roomId);
    }

    unsubscribeFromRoom(roomId) {
        // Remove subscription
        const sub = this.roomSubscriptions.get(roomId);
        if (sub) {
            try { 
                sub.unsubscribe(); 
                console.log(`[WS] Unsubscribed from room: ${roomId}`);
            } catch (_) {}
            this.roomSubscriptions.delete(roomId);
        }
        
        // Remove callbacks
        this.messageCallbacks.delete(roomId);
    }

    subscribeToPresence(callback) {
        this.presenceCallbacks.push(callback);
        if (this.client && this.client.connected) {
            this._subscribePresence();
        }
    }

    unsubscribeFromPresence(callback) {
        const index = this.presenceCallbacks.indexOf(callback);
        if (index > -1) {
            this.presenceCallbacks.splice(index, 1);
        }
        // Only unsubscribe if no more callbacks
        if (this.presenceCallbacks.length === 0 && this.presenceSubscription) {
            try { this.presenceSubscription.unsubscribe(); } catch (_) {}
            this.presenceSubscription = null;
        }
    }

    subscribeToMatchQueue(callback) {
        this.matchCallbacks.push(callback);
        if (this.client && this.client.connected) {
            this._subscribeMatchQueue();
        }
    }

    unsubscribeFromMatchQueue(callback) {
        const index = this.matchCallbacks.indexOf(callback);
        if (index > -1) {
            this.matchCallbacks.splice(index, 1);
        }
        if (this.matchCallbacks.length === 0 && this.matchSubscription) {
            try { this.matchSubscription.unsubscribe(); } catch (_) {}
            this.matchSubscription = null;
        }
    }

    _doSendMessage(destination, body) {
        if (!this.client || !this.client.connected) {
            throw new Error('WebSocket not connected');
        }
        this.client.publish({
            destination: destination,
            body: body,
        });
    }

    sendMessage(roomId, text, type = 'TEXT') {
        const body = JSON.stringify({ roomId, text, type });
        
        if (!this.client?.connected) {
            this._queueMessage('/app/chat.send', body);
            return;
        }
        
        try {
            this._doSendMessage('/app/chat.send', body);
        } catch (e) {
            this._queueMessage('/app/chat.send', body);
        }
    }

    sendTypingEvent(roomId, isTyping) {
        const body = JSON.stringify({ roomId, isTyping: isTyping.toString() });
        
        if (!this.client?.connected) return;
        
        try {
            this._doSendMessage('/app/chat.typing', body);
        } catch (e) {
            console.warn('[WS] Failed to send typing event:', e);
        }
    }

    // Event handlers
    onConnection(cb) { this.onConnectionCb = cb; }
    onDisconnection(cb) { this.onDisconnectionCb = cb; }
    onClose(cb) { this.onCloseCb = cb; }
    onError(cb) { this.onErrorCb = cb; }

    // Status
    isConnected() { return this.client && this.client.connected; }
    isReconnecting() { return this.isReconnecting; }
    getReconnectAttempts() { return this.reconnectAttempts; }
}

// Create singleton instance
window.websocketService = new WebSocketService();
        if (!this.client || !this.client.connected || this.presenceSubscription) return;
        this.presenceSubscription = this.client.subscribe('/topic/presence', (message) => {
            try {
                const wsMessage = JSON.parse(message.body);
                this.presenceCallbacks.forEach(cb => cb(wsMessage));
            } catch (err) {
                console.error('[WS] Failed to parse presence message:', err);
            }
        });
    }

    subscribeToPresence(callback) {
        this.presenceCallbacks.push(callback);
        if (this.client && this.client.connected) {
            this._subscribePresence();
        }
    }

    _subscribeMatchQueue() {
        if (!this.client || !this.client.connected || this.matchSubscription) return;
        this.matchSubscription = this.client.subscribe('/user/queue/match', (message) => {
            try {
                const wsMessage = JSON.parse(message.body);
                this.matchCallbacks.forEach(cb => cb(wsMessage));
            } catch (err) {
                console.error('[WS] Failed to parse match message:', err);
            }
        });
    }

    subscribeToMatchQueue(callback) {
        this.matchCallbacks.push(callback);
        if (this.client && this.client.connected) {
            this._subscribeMatchQueue();
        }
    }

    subscribeToRoom(roomId, callback) {
        if (callback) {
            const callbacks = this.messageCallbacks.get(roomId) || [];
            callbacks.push(callback);
            this.messageCallbacks.set(roomId, callbacks);
        }

        if (!this.client || !this.client.connected) {
            console.warn('[WS] Not connected — room subscription queued for', roomId);
            return;
        }

        this._subscribeUserQueue();
        this._subscribeRoomTopic(roomId);
    }

    unsubscribeFromRoom(roomId) {
        const sub = this.roomSubscriptions.get(roomId);
        if (sub) {
            try { sub.unsubscribe(); } catch (_) {}
            this.roomSubscriptions.delete(roomId);
        }
        this.messageCallbacks.delete(roomId);
    }

    sendMessage(roomId, text, type = 'TEXT') {
        if (!this.client || !this.client.connected) throw new Error('WebSocket not connected');
        this.client.publish({
            destination: '/app/chat.send',
            body: JSON.stringify({ roomId, text, type }),
        });
    }

    sendTypingEvent(roomId, isTyping) {
        if (!this.client || !this.client.connected) return;
        this.client.publish({
            destination: '/app/chat.typing',
            body: JSON.stringify({ roomId, isTyping: isTyping.toString() }),
        });
    }

    onConnection(cb) { this.onConnectionCb = cb; }

    onDisconnection(cb) { this.onDisconnectionCb = cb; }

    onClose(cb) { this.onCloseCb = cb; }

    onError(cb) { this.onErrorCb = cb; }

    isConnected() { return this.client && this.client.connected; }
}

window.websocketService = new WebSocketService();
