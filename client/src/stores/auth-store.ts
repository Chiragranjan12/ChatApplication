import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
    authApi,
    userApi,
    tokenManager,
} from '@/lib/api';
import type { User, LoginRequest, RegisterRequest, RegisterResponse } from '@/types';
import { useWebSocketStore } from './websocket-store';

interface AuthState {
    currentUser: User | null;
    isLoading: boolean;
    error: string | null;

    register: (data: RegisterRequest) => Promise<void>;
    login: (data: LoginRequest) => Promise<void>;
    logout: () => Promise<void>;
    fetchCurrentUser: () => Promise<void>;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            currentUser: import.meta.env.DEV 
                ? {
                    id: '0dd00000-0000-0000-0000-000000000001',
                    username: 'devUser',
                    email: 'dev@nexus.chat',
                    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=devUser',
                    online: true,
                    createdAt: new Date().toISOString(),
                  } 
                : null,
            isLoading: false,
            error: null,

            register: async (data: RegisterRequest) => {
                try {
                    set({ isLoading: true, error: null });
                    const response: RegisterResponse = await authApi.register(data);
                    // Store the email so verify-email page can use it
                    sessionStorage.setItem('pending_verify_email', response.email);
                    set({ isLoading: false });
                    // Caller should redirect to /verify-email
                } catch (error) {
                    const message = error instanceof Error ? error.message : 'Registration failed';
                    set({ error: message, isLoading: false });
                    throw error;
                }
            },

            login: async (data: LoginRequest) => {
                try {
                    set({ isLoading: true, error: null });
                    const response = await authApi.login(data);
                    set({ currentUser: response.user, isLoading: false });
                    useWebSocketStore.getState().connectWebSocket();
                } catch (error) {
                    const message = error instanceof Error ? error.message : 'Login failed';
                    set({ error: message, isLoading: false });
                    throw error;
                }
            },

            logout: async () => {
                try {
                    await authApi.logout();
                    useWebSocketStore.getState().disconnectWebSocket();
                    set({ currentUser: null });
                } catch (error) {
                    console.error('Logout error:', error);
                }
            },

            fetchCurrentUser: async () => {
                try {
                    if (!tokenManager.isAuthenticated()) return;
                    const user = await userApi.getCurrentUser();
                    set({ currentUser: user });
                } catch (error) {
                    console.error('Fetch current user error:', error);
                    set({ currentUser: null });
                }
            },

            setLoading: (loading: boolean) => set({ isLoading: loading }),
            setError: (error: string | null) => set({ error }),
            clearError: () => set({ error: null }),
        }),
        {
            name: 'nexus-chat-auth',
            partialize: (state) => ({
                currentUser: state.currentUser,
            }),
        }
    )
);

// Auto-fetch user if authenticated
// if (tokenManager.isAuthenticated()) {
//     useAuthStore.getState().fetchCurrentUser();
// }
