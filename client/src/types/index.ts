// Nexus Chat - Shared Type Definitions

// ─── Models ───
export interface User {
    id: string;
    username: string;
    email: string;
    avatarUrl?: string;
    online: boolean;
    createdAt: string;
}

export interface Room {
    id: string;
    name: string;
    type: 'DIRECT' | 'PUBLIC' | 'PRIVATE_GROUP' | 'RANDOM';
    description?: string;
    inviteCode?: string;
    createdAt: string;
    updatedAt?: string;
    createdBy?: string;
    memberCount?: number;
    lastMessage?: string;
    lastMessageAt?: string;
    members?: User[];
}

export interface Message {
    id: string;
    text: string;
    senderId: string;
    senderUsername: string;
    senderAvatarUrl?: string; // Phase 1: Include avatar URL in messages
    roomId: string;
    createdAt: string;
    type: 'TEXT' | 'SYSTEM';
    status?: 'sending' | 'sent' | 'failed'; // Phase 3: Optimistic message status
}

// ─── API Requests & Responses ───
export interface RegisterRequest {
    username: string;
    email: string;
    password: string;
}

export interface LoginRequest {
    username: string;
    password: string;
}

export interface AuthResponse {
    token: string;
    user: User;
}

export interface RegisterResponse {
    message: string;
    email: string;
}

export interface CreateRoomRequest {
    name: string;
    type: 'PUBLIC' | 'PRIVATE_GROUP';
    description?: string;
}

export interface MatchResponse {
    status?: string;
    roomId?: string;
    partnerId?: string;
    partnerUsername?: string;
}

// ─── WebSocket Interfaces ───
export interface WebSocketMessage {
    id: string;
    text: string;
    senderId: string;
    senderUsername: string;
    senderAvatarUrl?: string;
    roomId: string;
    createdAt: string;
    type: 'TEXT' | 'SYSTEM';
}

export interface WebSocketTypingEvent {
    type: 'TYPING';
    roomId: string;
    username: string;
    isTyping: boolean;
}
