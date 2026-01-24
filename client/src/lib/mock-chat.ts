import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';

// Types
export type User = {
  id: string;
  username: string;
  avatar: string;
  isOnline: boolean;
};

export type Message = {
  id: string;
  text: string;
  senderId: string;
  timestamp: number;
  roomId: string;
  type: 'text' | 'system';
};

export type Room = {
  id: string;
  name: string;
  type: 'public' | 'private' | 'random';
  participants: string[]; // User IDs
  lastMessage?: string;
  unreadCount?: number;
};

// Mock Data
const MOCK_USERS: User[] = [
  { id: 'u1', username: 'Sarah Chen', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80', isOnline: true },
  { id: 'u2', username: 'Alex Rivera', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=150&q=80', isOnline: true },
  { id: 'u3', username: 'Jordan Lee', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80', isOnline: false },
  { id: 'u4', username: 'Emily Davis', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80', isOnline: true },
];

const INITIAL_ROOMS: Room[] = [
  { id: 'public-general', name: 'General Lounge', type: 'public', participants: ['u1', 'u2', 'u3', 'u4'], lastMessage: 'Welcome to Nexus Chat!' },
  { id: 'public-tech', name: 'Tech Talk', type: 'public', participants: ['u1', 'u2'], lastMessage: 'Did you see the new release?' },
  { id: 'private-1', name: 'Project Alpha', type: 'private', participants: ['u1'], lastMessage: 'Meeting at 3 PM' },
];

interface ChatState {
  currentUser: User | null;
  rooms: Room[];
  messages: Record<string, Message[]>; // roomId -> messages
  activeRoomId: string | null;
  onlineUsers: User[];
  
  // Actions
  login: (username: string) => void;
  logout: () => void;
  selectRoom: (roomId: string) => void;
  sendMessage: (text: string) => void;
  createPrivateRoom: (name: string) => void;
  joinRandomChat: () => Promise<void>;
  leaveRandomChat: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      rooms: INITIAL_ROOMS,
      messages: {
        'public-general': [
          { id: 'm1', text: 'Welcome to the General Lounge! 👋', senderId: 'u1', timestamp: Date.now() - 100000, roomId: 'public-general', type: 'text' },
          { id: 'm2', text: 'Hey everyone, glad to be here.', senderId: 'u2', timestamp: Date.now() - 90000, roomId: 'public-general', type: 'text' },
        ],
        'public-tech': [],
        'private-1': [],
      },
      activeRoomId: null,
      onlineUsers: MOCK_USERS,

      login: (username) => {
        const user: User = {
          id: nanoid(),
          username,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
          isOnline: true,
        };
        set({ currentUser: user });
      },

      logout: () => set({ currentUser: null, activeRoomId: null }),

      selectRoom: (roomId) => set({ activeRoomId: roomId }),

      sendMessage: (text) => {
        const { currentUser, activeRoomId, messages } = get();
        if (!currentUser || !activeRoomId) return;

        // Basic Profanity Filter
        const bannedWords = ['spam', 'abuse', 'hate', 'toxic'];
        let filteredText = text;
        bannedWords.forEach(word => {
          const reg = new RegExp(word, 'gi');
          filteredText = filteredText.replace(reg, '***');
        });

        const newMessage: Message = {
          id: nanoid(),
          text: filteredText,
          senderId: currentUser.id,
          timestamp: Date.now(),
          roomId: activeRoomId,
          type: 'text',
        };

        const roomMessages = messages[activeRoomId] || [];
        
        set({
          messages: {
            ...messages,
            [activeRoomId]: [...roomMessages, newMessage],
          },
        });

        // Simulate reply in public rooms
        if (activeRoomId.startsWith('public')) {
          setTimeout(() => {
            const randomUser = MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)];
            const reply: Message = {
              id: nanoid(),
              text: ['Nice!', 'Cool point.', 'Totally agree.', 'Interesting...'][Math.floor(Math.random() * 4)],
              senderId: randomUser.id,
              timestamp: Date.now(),
              roomId: activeRoomId,
              type: 'text',
            };
            
            set(state => ({
              messages: {
                ...state.messages,
                [activeRoomId]: [...(state.messages[activeRoomId] || []), reply],
              }
            }));
          }, 2000 + Math.random() * 3000);
        }
      },

      createPrivateRoom: (name) => {
        const newRoom: Room = {
          id: `private-${nanoid()}`,
          name,
          type: 'private',
          participants: [get().currentUser?.id || ''],
        };
        set(state => ({
          rooms: [...state.rooms, newRoom],
          activeRoomId: newRoom.id,
        }));
      },

      joinRandomChat: async () => {
        // Simulate finding a match
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const roomId = `random-${nanoid()}`;
        const newRoom: Room = {
          id: roomId,
          name: 'Anonymous Stranger',
          type: 'random',
          participants: [get().currentUser?.id || '', 'stranger'],
        };

        set(state => ({
          rooms: [...state.rooms, newRoom],
          activeRoomId: roomId,
          messages: {
            ...state.messages,
            [roomId]: [{
              id: nanoid(),
              text: 'You are now connected with a stranger. Say hello!',
              senderId: 'system',
              timestamp: Date.now(),
              roomId,
              type: 'system',
            }]
          }
        }));
      },

      leaveRandomChat: () => {
        const { activeRoomId, rooms } = get();
        if (activeRoomId?.startsWith('random')) {
          set({
            rooms: rooms.filter(r => r.id !== activeRoomId),
            activeRoomId: null,
          });
        }
      },
    }),
    {
      name: 'nexus-chat-storage',
      partialize: (state) => ({ currentUser: state.currentUser }), // Only persist user session
    }
  )
);
