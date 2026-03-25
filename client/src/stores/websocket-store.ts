import { create } from 'zustand';
import { websocketService } from '@/lib/websocket';
import { tokenManager } from '@/lib/api';

interface WebSocketState {
    connectionStatus: 'connecting' | 'connected' | 'disconnected';
    error: string | null;
    connectWebSocket: () => void;
    disconnectWebSocket: () => void;
}

export const useWebSocketStore = create<WebSocketState>((set) => {
    // Register single-slot callbacks ONCE at module level.
    // The websocket service now uses single-slot overwrite, so calling these
    // again from connectWebSocket() doesn't accumulate stale closures.
    websocketService.onConnection(() => {
        console.log('[WS] Connected');
        set({ connectionStatus: 'connected', error: null });
    });

    websocketService.onError((error: Error) => {
        console.error('[WS] Error:', error.message);
        set({ connectionStatus: 'disconnected', error: 'Real-time connection error' });
    });

    websocketService.onWebSocketClose(() => {
        console.log('[WS] Connection closed');
        set({ connectionStatus: 'disconnected' });
    });

    websocketService.onDisconnection(() => {
        console.log('[WS] Disconnected');
        set({ connectionStatus: 'disconnected' });
    });

    return {
        connectionStatus: 'disconnected',
        error: null,

        connectWebSocket: () => {
            if (!tokenManager.isAuthenticated() && !import.meta.env.DEV) {
                console.warn('Cannot connect WebSocket: Not authenticated');
                return;
            }
            set({ connectionStatus: 'connecting' });
            websocketService.connect();
        },

        disconnectWebSocket: () => {
            websocketService.disconnect();
            set({ connectionStatus: 'disconnected' });
        },
    };
});

// Auto-connect if already authenticated (or in dev mode)
if (tokenManager.isAuthenticated() || import.meta.env.DEV) {
    useWebSocketStore.getState().connectWebSocket();
}
