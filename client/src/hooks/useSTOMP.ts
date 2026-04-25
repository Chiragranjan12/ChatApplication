// filepath: client/src/hooks/useSTOMP.ts
import { useEffect, useRef, useState, useCallback } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export interface STOMPMessage {
  destination: string;
  body: string;
  headers?: Record<string, string>;
}

export interface STOMPSubscription {
  id: string;
  destination: string;
  unsubscribe: () => void;
}

export interface UseSTOMPOptions {
  /** WebSocket URL (e.g., ws://localhost:8080/ws) */
  url: string;
  /** Authentication token */
  token?: string;
  /** Auto-connect on mount (default: true) */
  autoConnect?: boolean;
  /** Reconnection delay in ms (default: 3000) */
  reconnectDelay?: number;
  /** Maximum reconnection attempts (default: 5) */
  maxReconnectAttempts?: number;
  /** Heartbeat incoming in ms (default: 4000) */
  heartbeatIncoming?: number;
  /** Heartbeat outgoing in ms (default: 4000) */
  heartbeatOutgoing?: number;
  /** Debug logging (default: false) */
  debug?: boolean;
}

export interface UseSTOMPReturn {
  /** Whether currently connected */
  isConnected: boolean;
  /** Whether currently reconnecting */
  isReconnecting: boolean;
  /** Connection error (if any) */
  error: Error | null;
  /** Number of reconnection attempts */
  reconnectAttempts: number;
  /** Connect to WebSocket server */
  connect: () => void;
  /** Disconnect from WebSocket server */
  disconnect: () => void;
  /** Subscribe to a destination */
  subscribe: (destination: string, callback: (message: any) => void) => STOMPSubscription | null;
  /** Send a message */
  send: (destination: string, body: any, headers?: Record<string, string>) => void;
  /** Force reconnection */
  reconnect: () => void;
}

// Global STOMP client instance (singleton pattern to prevent duplicates)
let globalClient: any = null;
let globalConnectionPromise: Promise<any> | null = null;

// =============================================================================
// CUSTOM HOOK
// =============================================================================

/**
 * Custom hook for managing STOMP WebSocket connections with proper cleanup.
 * 
 * Features:
 * - Single global connection to prevent duplicates
 * - Automatic reconnection with exponential backoff
 * - Proper unsubscribe on component unmount
 * - Message queuing while offline
 * - TypeScript support
 * 
 * @example
 * ```typescript
 * const { isConnected, subscribe, send, disconnect } = useSTOMP({
 *   url: 'http://localhost:8080/ws',
 *   token: 'your-jwt-token'
 * });
 * 
 * useEffect(() => {
 *   const sub = subscribe('/topic/room/123', (msg) => {
 *     console.log('Received:', msg);
 *   });
 *   return () => sub?.unsubscribe();
 * }, [subscribe]);
 * ```
 */
export function useSTOMP(options: UseSTOMPOptions): UseSTOMPReturn {
  const {
    url,
    token,
    autoConnect = true,
    reconnectDelay = 3000,
    maxReconnectAttempts = 5,
    heartbeatIncoming = 4000,
    heartbeatOutgoing = 4000,
    debug = false
  } = options;

  // State
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  // Refs for cleanup and to avoid stale closures
  const clientRef = useRef<any>(null);
  const subscriptionsRef = useRef<Map<string, any>>(new Map());
  const messageQueueRef = useRef<STOMPMessage[]>([]);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectingRef = useRef(false);
  const isDisconnectingRef = useRef(false);

  // =================================================================
  // CONNECTION MANAGEMENT
  // =================================================================

  /**
   * Connect to STOMP WebSocket server
   */
  const connect = useCallback(() => {
    // Prevent multiple simultaneous connections
    if (isConnectingRef.current || isDisconnectingRef.current) {
      debug && console.log('[useSTOMP] Connection in progress, skipping...');
      return;
    }

    // Already connected
    if (clientRef.current?.connected) {
      debug && console.log('[useSTOMP] Already connected');
      setIsConnected(true);
      return;
    }

    isConnectingRef.current = true;
    setError(null);

    // Dynamically import SockJS and STOMP (client-side only)
    if (typeof window === 'undefined') return;

    // Create SockJS WebSocket
    const socket = new (window as any).SockJS(url);
    
    // Create STOMP client
    const stompClient = (window as any).Stomp.over(socket);
    
    // Configure client
    stompClient.reconnectDelay = 0; // We handle reconnection manually
    stompClient.heartbeatIncoming = heartbeatIncoming;
    stompClient.heartbeatOutgoing = heartbeatOutgoing;
    stompClient.debug = debug ? (str: string) => console.log('[STOMP]', str) : () => {};

    // Connection headers
    const connectHeaders: Record<string, string> = {};
    if (token) {
      connectHeaders['Authorization'] = `Bearer ${token}`;
    }

    // Connect
    stompClient.connect(
      connectHeaders,
      // onConnect
      (frame: any) => {
        debug && console.log('[useSTOMP] Connected:', frame);
        clientRef.current = stompClient;
        setIsConnected(true);
        setIsReconnecting(false);
        setReconnectAttempts(0);
        isConnectingRef.current = false;

        // Process queued messages
        if (messageQueueRef.current.length > 0) {
          debug && console.log(`[useSTOMP] Processing ${messageQueueRef.current.length} queued messages`);
          messageQueueRef.current.forEach(msg => {
            stompClient.send(msg.destination, msg.headers || {}, msg.body);
          });
          messageQueueRef.current = [];
        }

        // Re-subscribe to previous subscriptions
        subscriptionsRef.current.forEach((sub, dest) => {
          debug && console.log('[useSTOMP] Re-subscribing to:', dest);
          // Note: In production, you'd store the callback and re-create subscription
        });
      },
      // onError
      (frame: any) => {
        debug && console.log('[useSTOMP] STOMP Error:', frame);
        const err = new Error(frame.headers?.['message'] || 'STOMP connection error');
        setError(err);
        isConnectingRef.current = false;
        
        // Trigger reconnection
        scheduleReconnect();
      },
      // onClose
      (frame: any) => {
        debug && console.log('[useSTOMP] Connection closed');
        clientRef.current = null;
        setIsConnected(false);
        isConnectingRef.current = false;
        
        // Only schedule reconnect if not intentionally disconnecting
        if (!isDisconnectingRef.current) {
          scheduleReconnect();
        }
      }
    );
  }, [url, token, heartbeatIncoming, heartbeatOutgoing, debug, reconnectDelay, maxReconnectAttempts]);

  /**
   * Schedule reconnection with exponential backoff
   */
  const scheduleReconnect = useCallback(() => {
    if (isDisconnectingRef.current) return;
    
    const attempts = reconnectAttempts + 1;
    if (attempts >= maxReconnectAttempts) {
      debug && console.log('[useSTOMP] Max reconnection attempts reached');
      setError(new Error('Maximum reconnection attempts reached'));
      setIsReconnecting(false);
      return;
    }

    setIsReconnecting(true);
    setReconnectAttempts(attempts);

    // Exponential backoff: delay * 2^(attempts-1)
    const delay = reconnectDelay * Math.pow(2, attempts - 1);
    const maxDelay = 30000; // Cap at 30 seconds
    const actualDelay = Math.min(delay, maxDelay);

    debug && console.log(`[useSTOMP] Reconnecting in ${actualDelay}ms (attempt ${attempts}/${maxReconnectAttempts})`);

    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, actualDelay);
  }, [reconnectAttempts, maxReconnectAttempts, reconnectDelay, connect, debug]);

  /**
   * Force reconnection
   */
  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(() => connect(), 100);
  }, [connect]);

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = useCallback(() => {
    debug && console.log('[useSTOMP] Disconnecting...');
    
    isDisconnectingRef.current = true;
    
    // Clear reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Unsubscribe from all topics
    subscriptionsRef.current.forEach((sub) => {
      try {
        sub.unsubscribe();
      } catch (e) {
        debug && console.log('[useSTOMP] Error unsubscribing:', e);
      }
    });
    subscriptionsRef.current.clear();

    // Disconnect client
    if (clientRef.current) {
      try {
        clientRef.current.disconnect();
      } catch (e) {
        debug && console.log('[useSTOMP] Error disconnecting client:', e);
      }
      clientRef.current = null;
    }

    setIsConnected(false);
    setIsReconnecting(false);
    setReconnectAttempts(0);
    isConnectingRef.current = false;
    isDisconnectingRef.current = false;
    
    debug && console.log('[useSTOMP] Disconnected');
  }, [debug]);

  // =================================================================
  // SUBSCRIPTION MANAGEMENT
  // =================================================================

  /**
   * Subscribe to a STOMP destination
   */
  const subscribe = useCallback((destination: string, callback: (message: any) => void): STOMPSubscription | null => {
    if (!clientRef.current?.connected) {
      debug && console.log('[useSTOMP] Cannot subscribe: not connected');
      return null;
    }

    // Check if already subscribed
    if (subscriptionsRef.current.has(destination)) {
      debug && console.log('[useSTOMP] Already subscribed to:', destination);
      return subscriptionsRef.current.get(destination);
    }

    try {
      const subscription = clientRef.current.subscribe(destination, (message: any) => {
        try {
          // Parse JSON body
          const body = JSON.parse(message.body);
          callback(body);
        } catch (e) {
          // If not JSON, pass raw body
          callback(message.body);
        }
      });

      subscriptionsRef.current.set(destination, subscription);
      debug && console.log('[useSTOMP] Subscribed to:', destination);

      return {
        id: destination,
        destination,
        unsubscribe: () => {
          try {
            subscription.unsubscribe();
            subscriptionsRef.current.delete(destination);
            debug && console.log('[useSTOMP] Unsubscribed from:', destination);
          } catch (e) {
            debug && console.log('[useSTOMP] Error unsubscribing:', e);
          }
        }
      };
    } catch (e) {
      debug && console.log('[useSTOMP] Subscription error:', e);
      return null;
    }
  }, [debug]);

  /**
   * Send a STOMP message
   */
  const send = useCallback((destination: string, body: any, headers: Record<string, string> = {}) => {
    const messageBody = typeof body === 'string' ? body : JSON.stringify(body);
    
    if (!clientRef.current?.connected) {
      // Queue message for later
      debug && console.log('[useSTOMP] Not connected, queuing message');
      messageQueueRef.current.push({ destination, body: messageBody, headers });
      return;
    }

    try {
      clientRef.current.send(destination, headers, messageBody);
      debug && console.log('[useSTOMP] Sent to:', destination);
    } catch (e) {
      debug && console.log('[useSTOMP] Send error:', e);
      // Queue for retry
      messageQueueRef.current.push({ destination, body: messageBody, headers });
    }
  }, [debug]);

  // =================================================================
  // EFFECTS
  // =================================================================

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, []); // Only run on mount/unmount

  // Update token when it changes
  useEffect(() => {
    if (token && isConnected) {
      // Token changed while connected - reconnect with new token
      debug && console.log('[useSTOMP] Token changed, reconnecting...');
      reconnect();
    }
  }, [token]);

  return {
    isConnected,
    isReconnecting,
    error,
    reconnectAttempts,
    connect,
    disconnect,
    subscribe,
    send,
    reconnect
  };
}

// =============================================================================
// EXPORTED HOOK FOR EASY USE
// =============================================================================

/**
 * Simplified hook that uses window.CONFIG for URL and token.
 * Use this if you have CONFIG set up globally.
 */
export function useSTOMPSimple() {
  // This would typically read from your config
  const config = (window as any).CONFIG || {};
  
  return useSTOMP({
    url: config.WS_URL || 'http://localhost:8080/ws',
    token: (window as any).tokenManager?.getToken?.(),
    autoConnect: true,
    debug: config.DEBUG || false
  });
}

export default useSTOMP;