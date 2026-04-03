// Vanilla JS Global State Management (Zustand equivalent)
class AppState {
    constructor() {
        this.state = {
            auth: {
                currentUser: null,
                isLoading: false,
                isCheckingAuth: true
            },
            chat: {
                rooms: [],
                publicRooms: [],
                messages: {}, // roomId -> messages[]
                activeRoomId: null,
                onlineUsers: [],
                isLoading: false,
                randomState: 'idle',
                error: null,
                unreadCounts: {},
                typingUsers: {}
            }
        };
        this.listeners = new Set();
    }

    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    notify() {
        for (const listener of this.listeners) {
            listener(this.state);
        }
    }

    // AUTH ACTIONS
    setAuth(authUpdates) {
        this.state.auth = { ...this.state.auth, ...authUpdates };
        this.notify();
    }

    setCurrentUser(user) {
        this.state.auth.currentUser = user;
        this.state.auth.isCheckingAuth = false;
        this.notify();
    }

    // CHAT ACTIONS
    setChat(chatUpdates) {
        this.state.chat = { ...this.state.chat, ...chatUpdates };
        this.notify();
    }

    setActiveRoom(roomId) {
        if (this.state.chat.activeRoomId === roomId) return;
        this.state.chat.activeRoomId = roomId;
        this.state.chat.unreadCounts[roomId] = 0;
        this.notify();
    }

    addMessage(message) {
        const roomId = message.roomId;
        const roomMessages = this.state.chat.messages[roomId] || [];
        
        // Dedup
        if (roomMessages.some(m => m.id === message.id)) return;

        const isOptimistic = message.id.startsWith('optimistic-');
        const isActiveRoom = this.state.chat.activeRoomId === roomId;

        if (!isActiveRoom && !isOptimistic) {
            this.state.chat.unreadCounts[roomId] = (this.state.chat.unreadCounts[roomId] || 0) + 1;
            // Native Toast can be triggered here
            if (window.appUI) window.appUI.toast('New Message', message.text);
        }

        // Reconcile optimistic
        const RECONCILE_WINDOW = 30000;
        const msgTime = new Date(message.createdAt).getTime();
        const optIndex = roomMessages.findIndex(m => 
            m.id.startsWith('optimistic-') && 
            m.senderId === message.senderId && 
            m.text === message.text && 
            Math.abs(new Date(m.createdAt).getTime() - msgTime) < RECONCILE_WINDOW
        );

        if (optIndex !== -1) {
            roomMessages[optIndex] = { ...message, status: 'sent' };
        } else {
            roomMessages.push(message);
        }

        roomMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        this.state.chat.messages[roomId] = roomMessages;

        // Clear typing
        if (message.senderUsername) {
            const typingList = new Set(this.state.chat.typingUsers[roomId] || []);
            if (typingList.has(message.senderUsername)) {
                typingList.delete(message.senderUsername);
                this.state.chat.typingUsers[roomId] = Array.from(typingList);
            }
        }

        this.notify();
    }

    setTyping(roomId, username, isTyping) {
        const typingList = new Set(this.state.chat.typingUsers[roomId] || []);
        if (isTyping) typingList.add(username);
        else typingList.delete(username);
        
        this.state.chat.typingUsers[roomId] = Array.from(typingList);
        this.notify();
    }
}

window.stateStore = new AppState();
