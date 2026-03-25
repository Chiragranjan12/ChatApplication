import { create } from 'zustand';
import {
    userApi,
    roomApi,
    messageApi,
    randomMatchingApi,
} from '@/lib/api';
import { websocketService } from '@/lib/websocket';
import type { User, Room, Message, WebSocketMessage, WebSocketTypingEvent } from '@/types';
import { useAuthStore } from './auth-store';
import { toast } from '@/hooks/use-toast';

// State interface
interface ChatState {
    rooms: Room[];
    publicRooms: Room[];
    messages: Record<string, Message[]>; // roomId -> messages
    activeRoomId: string | null;
    onlineUsers: User[];
    isLoading: boolean;
    randomState: 'idle' | 'searching' | 'matched' | 'disconnected'; // Explicit state machine
    error: string | null;
    unreadCounts: Record<string, number>; // roomId -> unread count
    typingUsers: Record<string, string[]>; // roomId -> list of typing usernames

    // User management
    fetchOnlineUsers: () => Promise<void>;

    // Room management
    fetchRooms: () => Promise<void>;
    fetchPublicRooms: () => Promise<void>;
    selectRoom: (roomId: string) => Promise<void>;
    joinAndSelectPublicRoom: (roomId: string) => Promise<void>;
    createRoom: (name: string, type: 'PUBLIC' | 'PRIVATE_GROUP', description?: string) => Promise<void>;
    createDirectRoom: (userId: string) => Promise<void>;
    createPrivateGroup: (name: string) => Promise<void>;
    joinRoom: (roomId: string) => Promise<void>;
    joinRoomByInvite: (inviteCode: string) => Promise<void>;
    leaveRoom: (roomId: string) => Promise<void>;

    // Messaging
    fetchMessages: (roomId: string) => Promise<void>;
    sendMessage: (content: string) => Promise<void>;
    addMessage: (message: Message) => void;
    markRoomRead: (roomId: string) => void;

    // Random matching
    joinRandomChat: () => Promise<void>;
    leaveRandomChat: () => Promise<void>;

    // Utility
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    clearError: () => void;
    initPresence: () => void;
}

// Phase 7: Module-level lock to prevent rapid room-switch race conditions.
// Tracks the roomId of the in-flight selectRoom call. If a newer call arrives,
// the stale callback sees `selectingRoomId !== roomId` and silently exits.
let selectingRoomId: string | null = null;

export const useChatStore = create<ChatState>((set, get) => ({
    rooms: [],
    publicRooms: [],
    messages: {},
    activeRoomId: null,
    onlineUsers: [],
    isLoading: false,
    randomState: 'idle',
    error: null,
    unreadCounts: {},
    typingUsers: {},

    fetchOnlineUsers: async () => {
        try {
            const users = await userApi.getOnlineUsers();
            set({ onlineUsers: users });
        } catch (error) {
            console.error('Fetch online users error:', error);
        }
    },

    initPresence: () => {
        websocketService.subscribeToPresence((event: any) => {
            const { onlineUsers } = get();
            console.log('[Chat] Presence event:', event);
            if (event.type === 'USER_JOINED' && event.user) {
                const exists = onlineUsers.some(u => u.id === event.user.id);
                if (!exists) {
                    set({ onlineUsers: [...onlineUsers, event.user] });
                }
            } else if (event.type === 'USER_LEFT' && event.userId) {
                set({ onlineUsers: onlineUsers.filter(u => u.id !== event.userId) });
            }
        });

        // Listen for match events
        websocketService.subscribeToMatchQueue(async (event: any) => {
            console.log('[Chat] Match event:', event);
            if (event.type === 'MATCH_FOUND' && event.roomId) {
                // Partner found from backend queue
                set({ randomState: 'matched' });
                toast({ title: 'Match Found!', description: 'You are now connected with a stranger.' });
                await get().fetchRooms();
                await get().selectRoom(event.roomId);
                console.log('[Chat] Automatically joined room from queue', event.roomId);
            } else if (event.type === 'PARTNER_LEFT' || event.type === 'PARTNER_SKIPPED') {
                console.log('[Chat] Partner disconnected');
                set({ randomState: 'disconnected' });
            }
        });
    },

    fetchRooms: async () => {
        try {
            set({ isLoading: true });
            const rooms = await roomApi.getAllRooms();
            set({ rooms, isLoading: false });
        } catch (error) {
            console.error('Fetch rooms error:', error);
            set({ isLoading: false });
        }
    },

    fetchPublicRooms: async () => {
        try {
            const publicRooms = await roomApi.getPublicRooms();
            set({ publicRooms });
        } catch (error) {
            console.error('Fetch public rooms error:', error);
        }
    },

    selectRoom: async (roomId: string) => {
        const prevRoomId = get().activeRoomId;

        // Phase 3 guard: no-op if already on this room
        if (prevRoomId === roomId) return;

        // Phase 7: Race condition lock — cancel any in-flight room switch
        selectingRoomId = roomId;

        // Unsubscribe from previous room before switching
        if (prevRoomId) {
            console.log('[Chat] Unsubscribed from room', prevRoomId);
            websocketService.unsubscribeFromRoom(prevRoomId);
        }

        console.log('[Chat] Selecting room', roomId);
        set({ activeRoomId: roomId, isLoading: true });

        try {
            // Fetch messages for this room
            await get().fetchMessages(roomId);

            // Phase 7: If a newer selectRoom started while we were fetching, abort
            if (selectingRoomId !== roomId) {
                console.log('[Chat] Room switch superseded, aborting subscription for', roomId);
                return;
            }

            // Reset unread count when entering a room
            set(state => ({ unreadCounts: { ...state.unreadCounts, [roomId]: 0 } }));

            // Subscribe to WebSocket for real-time updates
            websocketService.subscribeToRoom(roomId, (wsEvent: WebSocketMessage | WebSocketTypingEvent) => {
                if (wsEvent.type === 'TYPING') {
                    const ev = wsEvent as WebSocketTypingEvent;
                    set(state => {
                        const roomTyping = new Set(state.typingUsers[roomId] || []);
                        if (ev.isTyping) {
                            roomTyping.add(ev.username);
                        } else {
                            roomTyping.delete(ev.username);
                        }
                        return { typingUsers: { ...state.typingUsers, [roomId]: Array.from(roomTyping) } };
                    });
                    return;
                }

                const wsMessage = wsEvent as WebSocketMessage;
                const message: Message = {
                    id: wsMessage.id,
                    text: wsMessage.text,
                    senderId: wsMessage.senderId,
                    senderUsername: wsMessage.senderUsername,
                    senderAvatarUrl: wsMessage.senderAvatarUrl,
                    roomId: wsMessage.roomId,
                    createdAt: wsMessage.createdAt,
                    type: wsMessage.type,
                };
                console.log('[Chat] Incoming WS message in room', roomId, 'from', wsMessage.senderUsername);
                get().addMessage(message);
            });

            console.log('[Chat] Joined room', roomId);
            set({ isLoading: false });
        } catch (error) {
            console.error('Select room error:', error);
            set({ isLoading: false });
        }
    },

    createRoom: async (name: string, type: 'PUBLIC' | 'PRIVATE_GROUP', description?: string) => {
        try {
            set({ isLoading: true });
            const newRoom = await roomApi.createRoom({ name, type, description });
            set(state => ({
                rooms: [...state.rooms, newRoom],
                isLoading: false,
            }));
            await get().selectRoom(newRoom.id);
            if (type === 'PUBLIC') {
                get().fetchPublicRooms();
            }
        } catch (error) {
            console.error('Create room error:', error);
            set({ isLoading: false });
            throw error;
        }
    },

    joinAndSelectPublicRoom: async (roomId: string) => {
        try {
            const { rooms } = get();
            const isMember = rooms.some(r => r.id === roomId);
            if (!isMember) {
                set({ isLoading: true });
                await roomApi.joinRoom(roomId);
                await get().fetchRooms();
            }
            await get().selectRoom(roomId);
        } catch (error) {
            console.error('Join public room error:', error);
            set({ error: 'Failed to join public room', isLoading: false });
        }
    },

    createDirectRoom: async (userId: string) => {
        try {
            set({ isLoading: true });
            const room = await roomApi.createDirectRoom(userId);
            set((state) => {
                const exists = state.rooms.find(r => r.id === room.id);
                return {
                    rooms: exists ? state.rooms : [...state.rooms, room],
                    isLoading: false
                };
            });
            await get().selectRoom(room.id);
        } catch (error) {
            console.error('Create direct room error:', error);
            set({ error: 'Failed to start direct message', isLoading: false });
        }
    },

    createPrivateGroup: async (name: string) => {
        try {
            set({ isLoading: true });
            const room = await roomApi.createPrivateGroup(name);
            set((state) => ({
                rooms: [...state.rooms, room],
                isLoading: false
            }));
            await get().selectRoom(room.id);
        } catch (error) {
            console.error('Create private group error:', error);
            set({ error: 'Failed to create private group', isLoading: false });
        }
    },

    joinRoom: async (roomId: string) => {
        try {
            await roomApi.joinRoom(roomId);
            await get().fetchRooms();
        } catch (error) {
            console.error('Join room error:', error);
            throw error;
        }
    },

    joinRoomByInvite: async (inviteCode: string) => {
        try {
            set({ isLoading: true });
            const room = await roomApi.joinRoomByInvite(inviteCode);
            set((state) => {
                const exists = state.rooms.find(r => r.id === room.id);
                return {
                    rooms: exists ? state.rooms : [...state.rooms, room],
                    isLoading: false
                };
            });
            await get().selectRoom(room.id);
        } catch (error) {
            console.error('Join room by invite error:', error);
            set({ error: 'Failed to join group with this invite code', isLoading: false });
        }
    },

    leaveRoom: async (roomId: string) => {
        try {
            await roomApi.leaveRoom(roomId);
            websocketService.unsubscribeFromRoom(roomId);
            console.log('[Chat] Left room', roomId);
            set(state => ({
                rooms: state.rooms.filter(r => r.id !== roomId),
                activeRoomId: state.activeRoomId === roomId ? null : state.activeRoomId,
            }));
        } catch (error) {
            console.error('Leave room error:', error);
            throw error;
        }
    },

    fetchMessages: async (roomId: string) => {
        try {
            const messages = await messageApi.getRoomMessages(roomId);
            set(state => ({
                messages: {
                    ...state.messages,
                    [roomId]: messages,
                },
            }));
        } catch (error) {
            console.error('Fetch messages error:', error);
        }
    },

    sendMessage: async (content: string) => {
        if (!content.trim()) return;
        const currentUser = useAuthStore.getState().currentUser;
        const activeRoomId = get().activeRoomId;
        if (!currentUser || !activeRoomId) return;

        const tempId = `optimistic-${crypto.randomUUID()}`;
        const now = new Date().toISOString();

        const optimisticMessage: Message = {
            id: tempId,
            text: content,
            senderId: currentUser.id,
            senderUsername: currentUser.username,
            senderAvatarUrl: currentUser.avatarUrl,
            roomId: activeRoomId,
            createdAt: now,
            type: 'TEXT',
            status: 'sending',
        };

        // Add message optimistically
        set(state => ({
            messages: {
                ...state.messages,
                [activeRoomId]: [...(state.messages[activeRoomId] || []), optimisticMessage],
            },
        }));

        // Phase 3 guard: don't even attempt if WebSocket isn't connected
        if (!websocketService.isConnected()) {
            console.warn('[Chat] WebSocket not connected — marking message as failed');
            set(state => ({
                messages: {
                    ...state.messages,
                    [activeRoomId]: (state.messages[activeRoomId] || []).map(m =>
                        m.id === tempId ? { ...m, status: 'failed' } : m
                    ),
                },
            }));
            return;
        }

        try {
            websocketService.sendMessage(activeRoomId, content);
            console.log('[Chat] Message sent to room', activeRoomId);
            // Mark as 'sent' optimistically — the server echo via WebSocket
            // will reconcile this with an authoritative ID (via addMessage dedup).
            set(state => ({
                messages: {
                    ...state.messages,
                    [activeRoomId]: (state.messages[activeRoomId] || []).map(m =>
                        m.id === tempId ? { ...m, status: 'sent' } : m
                    ),
                },
            }));
        } catch (error) {
            console.error('Send message error:', error);
            set(state => ({
                messages: {
                    ...state.messages,
                    [activeRoomId]: (state.messages[activeRoomId] || []).map(m =>
                        m.id === tempId ? { ...m, status: 'failed' } : m
                    ),
                },
            }));
        }
    },

    addMessage: (message: Message) => {
        set(state => {
            const roomMessages = state.messages[message.roomId] || [];

            // Exact ID dedup (prevents genuine duplicates)
            if (roomMessages.some(m => m.id === message.id)) {
                return state;
            }

            // Increment unread count if this room is not currently active
            // and the message is not our own optimistic echo
            const isActiveRoom = state.activeRoomId === message.roomId;
            const isOptimistic = message.id.startsWith('optimistic-');
            let newUnreadCounts = state.unreadCounts;
            
            if (!isActiveRoom && !isOptimistic) {
                newUnreadCounts = { ...state.unreadCounts, [message.roomId]: (state.unreadCounts[message.roomId] || 0) + 1 };
                // Also show a toast notification for background messages
                const room = state.rooms.find(r => r.id === message.roomId);
                const title = room?.type === 'PRIVATE_GROUP' ? `New message in ${room.name}` : `New message from ${message.senderUsername}`;
                toast({ title, description: message.text });
            }

            // Also clear typing indicator for this user when they send a message
            let newTypingUsers = state.typingUsers;
            if (message.senderUsername) {
                const roomTyping = new Set(state.typingUsers[message.roomId] || []);
                if (roomTyping.has(message.senderUsername)) {
                    roomTyping.delete(message.senderUsername);
                    newTypingUsers = { ...state.typingUsers, [message.roomId]: Array.from(roomTyping) };
                }
            }

            // Reconcile optimistic messages:
            // If an optimistic message (prefixed id) matches by sender + text + recent time, replace it.
            const RECONCILE_WINDOW_MS = 30_000;
            const msgTime = new Date(message.createdAt).getTime();
            const optimisticIndex = roomMessages.findIndex(
                m =>
                    m.id.startsWith('optimistic-') &&
                    m.senderId === message.senderId &&
                    m.text === message.text &&
                    Math.abs(new Date(m.createdAt).getTime() - msgTime) < RECONCILE_WINDOW_MS
            );

            let updatedMessages: Message[];
            if (optimisticIndex !== -1) {
                // Replace the optimistic message with the server-confirmed one
                updatedMessages = [...roomMessages];
                updatedMessages[optimisticIndex] = { ...message, status: 'sent' };
            } else {
                updatedMessages = [...roomMessages, message];
            }

            // Phase 7: Sort by createdAt to handle async WS delivery reordering
            updatedMessages.sort(
                (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );

            return {
                messages: {
                    ...state.messages,
                    [message.roomId]: updatedMessages,
                },
                unreadCounts: newUnreadCounts,
                typingUsers: newTypingUsers,
            };
        });
    },

    joinRandomChat: async () => {
        try {
            if (get().randomState === 'searching') {
                console.log('[Chat] Already searching, preventing duplicate request');
                return;
            }

            set({ isLoading: true, error: null, randomState: 'searching' });
            console.log('[Chat] Joining random chat queue...');
            const matchResponse = await randomMatchingApi.startMatching();
            
            if (matchResponse.status === 'SEARCHING') {
                console.log('[Chat] Placed in queue, waiting for match...');
                set({ isLoading: false }); // Stay in searching mode
                return;
            }

            if (matchResponse.roomId) {
                set({ randomState: 'matched' });
                await get().fetchRooms();
                await get().selectRoom(matchResponse.roomId);
                console.log('[Chat] Matched to room', matchResponse.roomId);
            }
            set({ isLoading: false });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Matching failed';
            set({ error: message, isLoading: false, randomState: 'idle' });
            throw error;
        }
    },

    leaveRandomChat: async () => {
        try {
            set({ randomState: 'idle' });
            await randomMatchingApi.stopMatching();
            const { activeRoomId, rooms } = get();

            if (activeRoomId) {
                const room = rooms.find(r => r.id === activeRoomId);
                if (room?.type === 'RANDOM') {
                    await get().leaveRoom(activeRoomId);
                }
            }
        } catch (error) {
            console.error('Leave random chat error:', error);
        }
    },

    markRoomRead: (roomId: string) =>
        set(state => ({ unreadCounts: { ...state.unreadCounts, [roomId]: 0 } })),

    setLoading: (loading: boolean) => set({ isLoading: loading }),
    setError: (error: string | null) => set({ error }),
    clearError: () => set({ error: null }),
}));
