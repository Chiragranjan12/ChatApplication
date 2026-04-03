// WebSocket Service for Real-Time Messaging
// Connects to Spring Boot WebSocket endpoint using SockJS and STOMP

import { Client, IFrame, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { tokenManager } from './api';
import type { WebSocketMessage, WebSocketTypingEvent } from '@/types';

type MessageCallback = (message: WebSocketMessage | WebSocketTypingEvent) => void;
type PresenceCallback = (message: any) => void;
type ConnectionCallback = () => void;
type ErrorCallback = (error: Error) => void;

// Use dev server URL in dev, configured backend URL in production
const WS_URL = import.meta.env.DEV
    ? 'http://localhost:5000/ws'
    : import.meta.env.VITE_API_BASE_URL
        ? `${import.meta.env.VITE_API_BASE_URL}/ws`
        : `${window.location.origin}/ws`;

// --- Phase 8: Error monitoring thresholds ---
const MAX_STOMP_ERRORS_BEFORE_RECONNECT = 3;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_MS = 3000;

class WebSocketService {
    private client: Client | null = null;

    // Map of roomId -> message callbacks
    private messageCallbacks: Map<string, MessageCallback[]> = new Map();
    private roomSubscriptions: Map<string, StompSubscription> = new Map();
    // Single user-queue subscription ref
    private userQueueSubscription: StompSubscription | null = null;
    
    // Presence subscription
    private presenceCallbacks: PresenceCallback[] = [];
    private presenceSubscription: StompSubscription | null = null;
    
    // Match queue subscription
    private matchCallbacks: PresenceCallback[] = [];
    private matchSubscription: StompSubscription | null = null;

    // Single-slot callbacks (overwrite-safe, never accumulate)
    private onConnectionCb: ConnectionCallback | null = null;
    private onDisconnectionCb: ConnectionCallback | null = null;
    private onCloseCb: ConnectionCallback | null = null;
    private onErrorCb: ErrorCallback | null = null;

    // --- Phase 8: Error counter ---
    private stompErrorCount = 0;

    private reconnectAttempts = 0;

    connect(): void {
        if (this.client?.connected) {
            console.log('[WS] Already connected');
            return;
        }

        const token = tokenManager.getToken();
        if (!token && !import.meta.env.DEV) {
            console.error('[WS] Cannot connect: No authentication token');
            return;
        }

        const socket = new SockJS(WS_URL);

        this.client = new Client({
            webSocketFactory: () => socket as any,
            connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
            // Phase 9: Only show verbose STOMP logs in development
            debug: import.meta.env.DEV ? (str) => console.log('[STOMP]', str) : () => {},
            reconnectDelay: 0, // Manual reconnect handled below
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });

        this.client.onConnect = (_frame: IFrame) => {
            console.log('[WS] Connected');
            this.reconnectAttempts = 0;
            this.stompErrorCount = 0; // Reset error counter on successful connect
            this.onConnectionCb?.();

            // Clear stale STOMP subscription refs (server closed them)
            this.roomSubscriptions.clear();
            this.userQueueSubscription = null;

            // Restore user queue subscription
            this._subscribeUserQueue();
            
            // Restore presence subscription
            this._subscribePresence();

            // Restore match queue subscription
            this._subscribeMatchQueue();

            // Resubscribe all rooms that still have callbacks (reconnect path)
            this.messageCallbacks.forEach((callbacks, roomId) => {
                if (callbacks.length > 0) {
                    console.log('[WS] Restoring subscription to room', roomId);
                    this._subscribeRoomTopic(roomId);
                }
            });
        };

        this.client.onStompError = (frame: IFrame) => {
            this.stompErrorCount++;
            const error = new Error(frame.headers['message'] || 'STOMP error');
            console.error(`[WS] STOMP error #${this.stompErrorCount}:`, error.message);
            this.onErrorCb?.(error);

            // --- Phase 8: Force reconnect after threshold ---
            if (this.stompErrorCount >= MAX_STOMP_ERRORS_BEFORE_RECONNECT) {
                console.warn(`[WS] ${this.stompErrorCount} STOMP errors — forcing reconnect`);
                this.stompErrorCount = 0;
                this._scheduleReconnect();
            }
        };

        this.client.onDisconnect = () => {
            this.onDisconnectionCb?.();
        };

        this.client.onWebSocketClose = () => {
            this.onCloseCb?.();
            this.userQueueSubscription = null;
            this.roomSubscriptions.clear();
            this._scheduleReconnect();
        };

        this.client.activate();
    }

    /** Back-off reconnect — shared by both close and error paths */
    private _scheduleReconnect(): void {
        if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            console.error('[WS] Max reconnect attempts reached. Giving up.');
            return;
        }
        this.reconnectAttempts++;
        const delay = RECONNECT_DELAY_MS * this.reconnectAttempts;
        setTimeout(() => this.connect(), delay);
    }

    disconnect(): void {
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

    /** Subscribe to personal message queue — exactly ONCE per connection */
    private _subscribeUserQueue(): void {
        if (!this.client?.connected || this.userQueueSubscription) return;

        this.userQueueSubscription = this.client.subscribe(
            '/user/queue/messages',
            (message: IMessage) => {
                try {
                    const wsMessage = JSON.parse(message.body);
                    const callbacks = this.messageCallbacks.get(wsMessage.roomId) || [];
                    callbacks.forEach(cb => cb(wsMessage));
                } catch (err) {
                    console.error('[WS] Failed to parse user queue message:', err);
                }
            }
        );
    }

    /** Subscribe to a room topic — ONCE per room per connection session (idempotent) */
    private _subscribeRoomTopic(roomId: string): void {
        if (!this.client?.connected) return;
        if (this.roomSubscriptions.has(roomId)) return; // Already subscribed

        const subscription = this.client.subscribe(
            `/topic/room/${roomId}`,
            (message: IMessage) => {
                try {
                    const wsMessage = JSON.parse(message.body);
                    const callbacks = this.messageCallbacks.get(roomId) || [];
                    callbacks.forEach(cb => cb(wsMessage));
                } catch (err) {
                    console.error('[WS] Failed to parse room message:', err);
                }
            }
        );

        this.roomSubscriptions.set(roomId, subscription);
    }

    /** Subscribe to global presence updates */
    private _subscribePresence(): void {
        if (!this.client?.connected || this.presenceSubscription) return;

        this.presenceSubscription = this.client.subscribe(
            '/topic/presence',
            (message: IMessage) => {
                try {
                    const wsMessage = JSON.parse(message.body);
                    this.presenceCallbacks.forEach(cb => cb(wsMessage));
                } catch (err) {
                    console.error('[WS] Failed to parse presence message:', err);
                }
            }
        );
    }

    subscribeToPresence(callback: PresenceCallback): void {
        this.presenceCallbacks.push(callback);
        if (this.client?.connected) {
            this._subscribePresence();
        }
    }

    private _subscribeMatchQueue(): void {
        if (!this.client?.connected || this.matchSubscription) return;

        this.matchSubscription = this.client.subscribe(
            '/user/queue/match',
            (message: IMessage) => {
                try {
                    const wsMessage = JSON.parse(message.body);
                    this.matchCallbacks.forEach(cb => cb(wsMessage));
                } catch (err) {
                    console.error('[WS] Failed to parse match message:', err);
                }
            }
        );
    }

    subscribeToMatchQueue(callback: PresenceCallback): void {
        this.matchCallbacks.push(callback);
        if (this.client?.connected) {
            this._subscribeMatchQueue();
        }
    }

    subscribeToRoom(roomId: string, callback?: MessageCallback): void {
        if (callback) {
            const callbacks = this.messageCallbacks.get(roomId) || [];
            callbacks.push(callback);
            this.messageCallbacks.set(roomId, callbacks);
        }

        if (!this.client?.connected) {
            console.warn('[WS] Not connected — room subscription queued for', roomId);
            return;
        }

        this._subscribeUserQueue();
        this._subscribeRoomTopic(roomId);
    }

    unsubscribeFromRoom(roomId: string): void {
        const sub = this.roomSubscriptions.get(roomId);
        if (sub) {
            try { sub.unsubscribe(); } catch (_) {}
            this.roomSubscriptions.delete(roomId);
        }
        this.messageCallbacks.delete(roomId);
    }

    sendMessage(roomId: string, text: string, type: 'TEXT' | 'SYSTEM' = 'TEXT'): void {
        if (!this.client?.connected) {
            throw new Error('WebSocket not connected');
        }
        this.client.publish({
            destination: '/app/chat.send',
            body: JSON.stringify({ roomId, text, type }),
        });
    }

    sendTypingEvent(roomId: string, isTyping: boolean): void {
        if (!this.client?.connected) return;
        this.client.publish({
            destination: '/app/chat.typing',
            body: JSON.stringify({ roomId, isTyping: isTyping.toString() }),
        });
    }

    // Single-slot callbacks — overwrite-safe
    onConnection(callback: ConnectionCallback): void { this.onConnectionCb = callback; }
    onDisconnection(callback: ConnectionCallback): void { this.onDisconnectionCb = callback; }
    onWebSocketClose(callback: ConnectionCallback): void { this.onCloseCb = callback; }
    onError(callback: ErrorCallback): void { this.onErrorCb = callback; }

    isConnected(): boolean {
        return this.client?.connected || false;
    }

    // --- Phase 8: Expose error count for monitoring UI if needed ---
    getErrorCount(): number {
        return this.stompErrorCount;
    }
}

export const websocketService = new WebSocketService();
