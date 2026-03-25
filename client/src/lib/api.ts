// API Service for Spring Boot Backend Integration
// Handles all HTTP requests to the backend with JWT authentication

import type { User, Room, Message, AuthResponse, RegisterResponse, RegisterRequest, LoginRequest, CreateRoomRequest, MatchResponse } from '@/types';

const API_BASE_URL = '/api';

// Token management
export const tokenManager = {
    getToken: (): string | null => {
        return localStorage.getItem('jwt_token');
    },

    setToken: (token: string): void => {
        localStorage.setItem('jwt_token', token);
    },

    removeToken: (): void => {
        localStorage.removeItem('jwt_token');
    },

    isAuthenticated: (): boolean => {
        return !!tokenManager.getToken();
    }
};

// Generic API request function with JWT
async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const token = tokenManager.getToken();

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    if (options.headers) {
        Object.assign(headers, options.headers);
    }

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include',
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText || response.statusText}`);
    }

    // Handle 204 No Content
    if (response.status === 204) {
        return {} as T;
    }

    return response.json();
}

// Authentication API
export const authApi = {
    register: async (data: RegisterRequest): Promise<RegisterResponse> => {
        // Returns 202 Accepted: { message, email }. No JWT yet — user must verify OTP.
        return apiRequest<RegisterResponse>('/auth/register', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    verifyOtp: async (email: string, otp: string): Promise<AuthResponse> => {
        const response = await apiRequest<AuthResponse>('/auth/verify-otp', {
            method: 'POST',
            body: JSON.stringify({ email, otp }),
        });
        tokenManager.setToken(response.token);
        return response;
    },

    resendOtp: async (email: string): Promise<{ message: string }> => {
        return apiRequest<{ message: string }>('/auth/resend-otp', {
            method: 'POST',
            body: JSON.stringify({ email }),
        });
    },

    login: async (data: LoginRequest): Promise<AuthResponse> => {
        const response = await apiRequest<AuthResponse>('/auth/login', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        tokenManager.setToken(response.token);
        return response;
    },

    logout: async (): Promise<void> => {
        await apiRequest('/auth/logout', { method: 'POST' });
        tokenManager.removeToken();
    },
};

// User API
export const userApi = {
    getCurrentUser: async (): Promise<User> => {
        return apiRequest<User>('/users/me');
    },

    getOnlineUsers: async (): Promise<User[]> => {
        return apiRequest<User[]>('/users/online');
    },

    updateProfile: async (data: Partial<User>): Promise<User> => {
        return apiRequest<User>('/users/me', {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },
};

// Room/Chat API
export const roomApi = {
    getAllRooms: async (): Promise<Room[]> => {
        return apiRequest<Room[]>('/rooms');
    },

    getPublicRooms: async (): Promise<Room[]> => {
        return apiRequest<Room[]>('/rooms/public');
    },

    getRoom: async (roomId: string): Promise<Room> => {
        return apiRequest<Room>(`/rooms/${roomId}`);
    },

    createRoom: async (data: CreateRoomRequest): Promise<Room> => {
        return apiRequest<Room>('/rooms', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    createDirectRoom: async (userId: string): Promise<Room> => {
        return apiRequest<Room>(`/rooms/direct/${userId}`, {
            method: 'POST',
        });
    },

    createPrivateGroup: async (name: string): Promise<Room> => {
        return apiRequest<Room>('/rooms/private', {
            method: 'POST',
            body: JSON.stringify({ name }),
        });
    },

    joinRoom: async (roomId: string): Promise<void> => {
        return apiRequest<void>(`/rooms/${roomId}/join`, {
            method: 'POST',
        });
    },

    joinRoomByInvite: async (inviteCode: string): Promise<Room> => {
        return apiRequest<Room>(`/rooms/join`, {
            method: 'POST',
            body: JSON.stringify({ inviteCode }),
        });
    },

    leaveRoom: async (roomId: string): Promise<void> => {
        return apiRequest<void>(`/rooms/${roomId}/leave`, {
            method: 'POST',
        });
    },
};

// Message API
export const messageApi = {
    getRoomMessages: async (roomId: string): Promise<Message[]> => {
        return apiRequest<Message[]>(`/messages/room/${roomId}`);
    },


    deleteMessage: async (messageId: string): Promise<void> => {
        return apiRequest<void>(`/messages/${messageId}`, {
            method: 'DELETE',
        });
    },
};

// Random Matching API
export const randomMatchingApi = {
    startMatching: async (): Promise<MatchResponse> => {
        return apiRequest<MatchResponse>('/random/start', {
            method: 'POST',
        });
    },

    stopMatching: async (): Promise<void> => {
        return apiRequest<void>('/random/stop', {
            method: 'POST',
        });
    },

    getMatchingStatus: async (): Promise<{ status: string; roomId?: string }> => {
        return apiRequest('/random/queue/status');
    },
};

// Health check
export const healthApi = {
    check: async (): Promise<{ status: string; timestamp: string }> => {
        return apiRequest('/health');
    },
};
