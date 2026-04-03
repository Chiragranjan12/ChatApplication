// Vanilla JS WebSocket Service
const WS_URL = window.location.origin + '/ws';
const MAX_STOMP_ERRORS_BEFORE_RECONNECT = 3;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_MS = 3000;

class WebSocketService {
    constructor() {
        this.client = null;
        this.messageCallbacks = new Map();
        this.roomSubscriptions = new Map();
        this.userQueueSubscription = null;
        
        this.presenceCallbacks = [];
        this.presenceSubscription = null;
        
        this.matchCallbacks = [];
        this.matchSubscription = null;

        this.onConnectionCb = null;
        this.onDisconnectionCb = null;
        this.onCloseCb = null;
        this.onErrorCb = null;

        this.stompErrorCount = 0;
        this.reconnectAttempts = 0;
    }

    connect() {
        if (this.client && this.client.connected) return;

        const token = window.tokenManager.getToken();
        if (!token) {
            console.error('[WS] Cannot connect: No authentication token');
            return;
        }

        const socket = new SockJS(WS_URL);
        
        this.client = new StompJs.Client({
            webSocketFactory: () => socket,
            connectHeaders: { Authorization: `Bearer ${token}` },
            debug: (str) => console.log('[STOMP]', str),
            reconnectDelay: 0, 
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });

        this.client.onConnect = () => {
            console.log('[WS] Connected');
            this.reconnectAttempts = 0;
            this.stompErrorCount = 0;
            if (this.onConnectionCb) this.onConnectionCb();

            this.roomSubscriptions.clear();
            this.userQueueSubscription = null;

            this._subscribeUserQueue();
            this._subscribePresence();
            this._subscribeMatchQueue();

            this.messageCallbacks.forEach((callbacks, roomId) => {
                if (callbacks.length > 0) {
                    this._subscribeRoomTopic(roomId);
                }
            });
        };

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

        this.client.onDisconnect = () => {
            if (this.onDisconnectionCb) this.onDisconnectionCb();
        };

        this.client.onWebSocketClose = () => {
            if (this.onCloseCb) this.onCloseCb();
            this.userQueueSubscription = null;
            this.roomSubscriptions.clear();
            this._scheduleReconnect();
        };

        this.client.activate();
    }

    _scheduleReconnect() {
        if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            console.error('[WS] Max reconnect attempts reached. Giving up.');
            return;
        }
        this.reconnectAttempts++;
        const delay = RECONNECT_DELAY_MS * this.reconnectAttempts;
        setTimeout(() => this.connect(), delay);
    }

    disconnect() {
        if (this.client) {
            this.client.deactivate();
            this.client = null;
            this.messageCallbacks.clear();
            this.roomSubscriptions.clear();
            this.presenceCallbacks = [];
            this.matchCallbacks = [];
            this.userQueueSubscription = null;
            this.presenceSubscription = null;
            this.matchSubscription = null;
        }
    }

    _subscribeUserQueue() {
        if (!this.client || !this.client.connected || this.userQueueSubscription) return;
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
        if (this.roomSubscriptions.has(roomId)) return;

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
