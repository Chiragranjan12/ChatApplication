// Application Controller - App.js
const { api, tokenManager, websocketService, stateStore } = window;

// --- UTILS ---
function createEl(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstElementChild;
}

/** Generate a consistent HSL color from a string */
function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return `hsl(${Math.abs(hash) % 360}, 55%, 45%)`;
}

/** Get initials from a username */
function getInitials(name) {
    if (!name) return '?';
    return name.slice(0, 2).toUpperCase();
}

/** Render an avatar — image if valid URL, initials fallback otherwise */
function renderAvatar(url, name, sizeClass = 'w-8 h-8') {
    if (url && url !== '#' && url !== 'null' && url !== 'undefined') {
        return `<img src="${url}" alt="${name}" class="${sizeClass} rounded-full bg-secondary object-cover" onerror="this.outerHTML='<div class=\\'avatar-initials ${sizeClass}\\' style=\\'background:${stringToColor(name || '')}\\'>${getInitials(name)}</div>'">`;
    }
    return `<div class="avatar-initials ${sizeClass}" style="background:${stringToColor(name || '')}">${getInitials(name)}</div>`;
}

/** Escape HTML to prevent XSS in message rendering */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/** Format a timestamp to HH:MM */
function formatTime(dateStr) {
    try {
        const d = new Date(dateStr);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
}

// ============================================================
// UI OBJECT — All rendering logic
// ============================================================
const UI = {
    root: document.getElementById('app-root'),
    toastContainer: document.getElementById('toast-container'),
    _typingTimeout: null,
    _currentView: null, // track which view is rendered

    toast(title, description = '') {
        const t = createEl(`
            <div class="bg-card text-card-foreground p-4 rounded-lg shadow-lg border animate-accordion-down min-w-[200px]">
                <h4 class="font-semibold text-sm">${escapeHtml(title)}</h4>
                ${description ? `<p class="text-sm text-muted-foreground mt-1">${escapeHtml(description)}</p>` : ''}
            </div>
        `);
        this.toastContainer.appendChild(t);
        setTimeout(() => {
            t.classList.add('hidden-fade');
            setTimeout(() => t.remove(), 200);
        }, 3000);
    },

    renderLoader() {
        this._currentView = 'loader';
        this.root.innerHTML = `<div class="h-full w-full flex items-center justify-center"><i data-lucide="loader-2" class="h-8 w-8 animate-spin text-primary"></i></div>`;
        lucide.createIcons();
    },

    // =============================================
    // SAFETY GUARD MODAL
    // =============================================
    showSafetyGuard() {
        if (localStorage.getItem('nexus_guidelines_accepted')) return;

        const overlay = createEl(`
            <div class="modal-overlay" id="safety-guard-overlay">
                <div class="modal-content text-center">
                    <div class="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <i data-lucide="shield" class="w-6 h-6 text-primary"></i>
                    </div>
                    <h2 class="text-xl font-bold font-display mb-2">Community Guidelines</h2>
                    <p class="text-sm text-muted-foreground mb-6">To keep Nexus Chat safe and friendly, please follow our rules:</p>

                    <div class="space-y-3 text-left mb-8">
                        <div class="flex gap-3 items-start">
                            <div class="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                                <i data-lucide="check" class="w-3 h-3 text-emerald-500"></i>
                            </div>
                            <p class="text-sm text-muted-foreground"><span class="font-semibold text-foreground">Be Respectful:</span> Treat others with kindness and respect.</p>
                        </div>
                        <div class="flex gap-3 items-start">
                            <div class="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center shrink-0 mt-0.5">
                                <i data-lucide="user-x" class="w-3 h-3 text-red-500"></i>
                            </div>
                            <p class="text-sm text-muted-foreground"><span class="font-semibold text-foreground">No Harassment:</span> Bullying or hate speech is not tolerated.</p>
                        </div>
                        <div class="flex gap-3 items-start">
                            <div class="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                                <i data-lucide="alert-triangle" class="w-3 h-3 text-amber-500"></i>
                            </div>
                            <p class="text-sm text-muted-foreground"><span class="font-semibold text-foreground">Keep it Legal:</span> Do not share illegal content or personal information.</p>
                        </div>
                    </div>

                    <button id="safety-accept-btn" class="w-full h-10 bg-primary text-primary-foreground font-medium rounded-full hover:bg-primary/90 transition-colors">
                        I Agree & Continue
                    </button>
                </div>
            </div>
        `);
        document.body.appendChild(overlay);
        lucide.createIcons();

        document.getElementById('safety-accept-btn').addEventListener('click', () => {
            localStorage.setItem('nexus_guidelines_accepted', 'true');
            overlay.remove();
        });
    },

    // =============================================
    // ROOM CREATION MODAL
    // =============================================
    showCreateRoomModal() {
        const overlay = createEl(`
            <div class="modal-overlay" id="create-room-overlay">
                <div class="modal-content">
                    <div class="flex items-center justify-between mb-6">
                        <h2 class="text-lg font-bold font-display">Create or Join</h2>
                        <button id="close-modal-btn" class="p-1 hover:bg-secondary rounded-md transition-colors">
                            <i data-lucide="x" class="w-5 h-5 text-muted-foreground"></i>
                        </button>
                    </div>

                    <!-- Tab buttons -->
                    <div class="flex gap-1 bg-secondary/50 p-1 rounded-lg mb-6">
                        <button data-tab="public" class="room-tab flex-1 py-2 px-3 text-sm font-medium rounded-md bg-primary text-primary-foreground transition-colors">Public Channel</button>
                        <button data-tab="private" class="room-tab flex-1 py-2 px-3 text-sm font-medium rounded-md text-muted-foreground hover:text-foreground transition-colors">Private Group</button>
                        <button data-tab="invite" class="room-tab flex-1 py-2 px-3 text-sm font-medium rounded-md text-muted-foreground hover:text-foreground transition-colors">Join Invite</button>
                    </div>

                    <!-- Public tab -->
                    <form id="create-public-form" class="space-y-4">
                        <div class="space-y-2">
                            <label class="text-sm font-medium">Channel Name</label>
                            <input id="public-name" class="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none" placeholder="e.g. general, random" required />
                        </div>
                        <div class="space-y-2">
                            <label class="text-sm font-medium">Description (optional)</label>
                            <input id="public-desc" class="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none" placeholder="What's this channel about?" />
                        </div>
                        <button type="submit" class="w-full h-10 bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 transition-colors">Create Channel</button>
                    </form>

                    <!-- Private tab (hidden initially) -->
                    <form id="create-private-form" class="space-y-4 hidden">
                        <div class="space-y-2">
                            <label class="text-sm font-medium">Group Name</label>
                            <input id="private-name" class="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none" placeholder="e.g. project-alpha" required />
                        </div>
                        <button type="submit" class="w-full h-10 bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 transition-colors">Create Private Group</button>
                    </form>

                    <!-- Invite tab (hidden initially) -->
                    <form id="join-invite-form" class="space-y-4 hidden">
                        <div class="space-y-2">
                            <label class="text-sm font-medium">Invite Code</label>
                            <input id="invite-code" class="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none" placeholder="Paste invite code here" required />
                        </div>
                        <button type="submit" class="w-full h-10 bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 transition-colors">Join Group</button>
                    </form>
                </div>
            </div>
        `);
        document.body.appendChild(overlay);
        lucide.createIcons();

        // Close button
        document.getElementById('close-modal-btn').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

        // Tab switching
        const tabs = overlay.querySelectorAll('.room-tab');
        const forms = {
            public: document.getElementById('create-public-form'),
            private: document.getElementById('create-private-form'),
            invite: document.getElementById('join-invite-form'),
        };
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.dataset.tab;
                tabs.forEach(t => { t.classList.remove('bg-primary', 'text-primary-foreground'); t.classList.add('text-muted-foreground'); });
                tab.classList.add('bg-primary', 'text-primary-foreground');
                tab.classList.remove('text-muted-foreground');
                Object.values(forms).forEach(f => f.classList.add('hidden'));
                forms[target].classList.remove('hidden');
            });
        });

        // Public channel creation
        forms.public.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('public-name').value.trim();
            const desc = document.getElementById('public-desc').value.trim();
            if (!name) return;
            try {
                const room = await api.room.createRoom({ name, type: 'PUBLIC', description: desc || null });
                const rooms = [...stateStore.state.chat.rooms, room];
                stateStore.setChat({ rooms });
                overlay.remove();
                UI.toast('Channel Created', `#${name} is ready!`);
            } catch (err) { UI.toast('Error', err.message); }
        });

        // Private group creation
        forms.private.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('private-name').value.trim();
            if (!name) return;
            try {
                const room = await api.room.createPrivateGroup(name);
                const rooms = [...stateStore.state.chat.rooms, room];
                stateStore.setChat({ rooms });
                overlay.remove();
                UI.toast('Group Created', `${name} is ready!`);
            } catch (err) { UI.toast('Error', err.message); }
        });

        // Join by invite code
        forms.invite.addEventListener('submit', async (e) => {
            e.preventDefault();
            const code = document.getElementById('invite-code').value.trim();
            if (!code) return;
            try {
                const room = await api.room.joinRoomByInvite(code);
                const rooms = [...stateStore.state.chat.rooms, room];
                stateStore.setChat({ rooms });
                overlay.remove();
                UI.toast('Joined!', `Welcome to ${room.name}`);
            } catch (err) { UI.toast('Error', err.message); }
        });
    },

    // =============================================
    // AUTH VIEW
    // =============================================
    renderAuth() {
        this._currentView = 'auth';
        this.root.innerHTML = `
            <div class="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
                <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background"></div>
                
                <div class="glass-card w-full max-w-md p-8 rounded-xl z-10 relative">
                    <div class="text-center space-y-2 mb-8">
                        <div class="flex justify-center mb-4">
                            <div class="p-3 bg-primary/10 rounded-full">
                                <i data-lucide="message-square" class="w-8 h-8 text-primary"></i>
                            </div>
                        </div>
                        <h1 class="text-3xl font-bold tracking-tight font-display text-foreground">Welcome to Nexus Chat</h1>
                        <p class="text-sm text-muted-foreground">Connect with your team in real-time</p>
                    </div>

                    <form id="login-form" class="space-y-4">
                        <div class="space-y-2">
                            <label class="text-sm font-medium">Username</label>
                            <input id="login-username" class="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none" required />
                        </div>
                        <div class="space-y-2">
                            <label class="text-sm font-medium">Password</label>
                            <input id="login-password" type="password" class="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none" required />
                        </div>
                        <button type="submit" class="w-full h-10 bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 transition-colors">
                            Sign In
                        </button>
                    </form>
                </div>
            </div>
        `;
        lucide.createIcons();

        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('login-username').value;
            const password = document.getElementById('login-password').value;
            try {
                UI.toast('Logging in...');
                await api.auth.login({ username, password });
                await App.initSession();
            } catch (err) {
                UI.toast('Login Failed', err.message);
            }
        });
    },

    // =============================================
    // CHAT LAYOUT — Sidebar + Chat Area
    // =============================================
    renderChatLayout() {
        this._currentView = 'chat';
        const state = stateStore.state;
        const user = state.auth.currentUser;
        
        this.root.innerHTML = `
            <div class="flex h-screen overflow-hidden bg-background">
                <!-- Sidebar -->
                <div class="w-80 border-r bg-card/50 flex flex-col h-full shrink-0">
                    <div class="p-4 border-b flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <i data-lucide="message-square" class="w-6 h-6 text-primary"></i>
                            <h2 class="font-bold text-lg hidden sm:block font-display">Nexus Chat</h2>
                        </div>
                        <div class="flex items-center gap-1 relative" id="sidebar-actions">
                            <button id="create-room-btn" title="Create or Join" class="p-2 hover:bg-accent rounded-md transition-colors">
                                <i data-lucide="plus" class="w-4 h-4"></i>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Random Chat Button -->
                    <div class="px-2 pt-2">
                        <button id="random-chat-btn" class="w-full text-left p-3 rounded-md transition-colors flex items-center gap-3 hover:bg-accent hover:text-accent-foreground group ${state.chat.randomState !== 'idle' ? 'bg-primary/10 text-primary' : ''}">
                            <div class="p-1.5 bg-primary/10 rounded-md group-hover:bg-primary/20 transition-colors">
                                <i data-lucide="shuffle" class="w-4 h-4 text-primary"></i>
                            </div>
                            <div class="flex flex-col">
                                <span class="text-sm font-medium">Random Chat</span>
                                <span class="text-[11px] text-muted-foreground">Talk to strangers</span>
                            </div>
                        </button>
                    </div>

                    <div class="px-3 pt-3 pb-1">
                        <span class="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Your Rooms</span>
                    </div>
                    
                    <div class="flex-1 overflow-y-auto p-2 scrollbar-hide" id="room-list">
                        <!-- Rooms render here -->
                    </div>
                    
                    <div class="p-4 border-t bg-muted/30">
                        <div class="flex items-center gap-3">
                            ${renderAvatar(user.avatarUrl, user.username, 'w-10 h-10')}
                            <div class="flex flex-col overflow-hidden">
                                <span class="font-medium text-sm truncate">${escapeHtml(user.username)}</span>
                                <span class="text-xs text-muted-foreground truncate">${escapeHtml(user.email || 'No email set')}</span>
                            </div>
                            <button id="logout-btn" class="ml-auto p-2 hover:bg-destructive/10 hover:text-destructive rounded-md transition-colors">
                                <i data-lucide="log-out" class="w-4 h-4"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Chat Area -->
                <div class="flex-1 flex flex-col h-full bg-background" id="chat-area">
                    <div class="flex-1 flex items-center justify-center text-muted-foreground p-4 text-center">
                        <div class="max-w-md">
                            <div class="p-4 bg-primary/5 rounded-full inline-flex mb-4">
                                <i data-lucide="message-circle" class="w-10 h-10 text-primary/50"></i>
                            </div>
                            <h2 class="text-xl font-bold mb-2 font-display text-foreground">Welcome to Nexus Chat</h2>
                            <p class="text-sm">Select a chat from the sidebar or create a new one to start messaging.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        lucide.createIcons();

        // Event listeners
        document.getElementById('logout-btn').addEventListener('click', async () => {
            try { await api.auth.logout(); } catch (e) { /* ignore */ }
            websocketService.disconnect();
            stateStore.setAuth({ currentUser: null });
            UI.renderAuth();
        });

        document.getElementById('create-room-btn').addEventListener('click', () => {
            UI.showCreateRoomModal();
        });

        document.getElementById('random-chat-btn').addEventListener('click', () => {
            App.startRandomChat();
        });

        this.updateRoomList();
        this.showSafetyGuard();
    },

    // =============================================
    // ROOM LIST
    // =============================================
    updateRoomList() {
        const list = document.getElementById('room-list');
        if (!list) return;

        const state = stateStore.state;
        const rooms = state.chat.rooms.filter(r => r.type !== 'RANDOM');
        const activeId = state.chat.activeRoomId;

        if (rooms.length === 0) {
            list.innerHTML = `
                <div class="text-center py-8 text-muted-foreground">
                    <i data-lucide="inbox" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
                    <p class="text-sm">No rooms yet</p>
                    <p class="text-xs mt-1">Create or join one!</p>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        list.innerHTML = rooms.map(room => {
            const isActive = room.id === activeId;
            const unreadCount = state.chat.unreadCounts[room.id] || 0;
            const typeIcon = room.type === 'PUBLIC' ? 'hash' : room.type === 'PRIVATE_GROUP' ? 'lock' : 'user';
            const lastMsg = room.lastMessage ? escapeHtml(room.lastMessage) : 'No messages yet';

            return `
                <button onclick="App.selectRoom('${room.id}')" class="w-full text-left p-3 mb-1 rounded-md transition-all flex items-center gap-3 ${isActive ? 'bg-primary/10 text-primary ring-1 ring-primary/20' : 'hover:bg-accent hover:text-accent-foreground'}">
                    <div class="p-1.5 rounded-md ${isActive ? 'bg-primary/20' : 'bg-secondary'}">
                        <i data-lucide="${typeIcon}" class="w-4 h-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}"></i>
                    </div>
                    <div class="flex-1 overflow-hidden">
                        <div class="flex justify-between items-center w-full">
                            <span class="truncate pr-2 text-sm font-medium">${escapeHtml(room.name)}</span>
                            ${unreadCount > 0 ? `<span class="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">${unreadCount}</span>` : ''}
                        </div>
                        <p class="text-[11px] text-muted-foreground truncate mt-0.5">${lastMsg}</p>
                    </div>
                </button>
            `;
        }).join('');
        lucide.createIcons();
    },

    // =============================================
    // ACTIVE ROOM — Header + Messages + Input
    // =============================================
    renderActiveRoom() {
        const state = stateStore.state;

        // Check if Random Chat is active
        if (state.chat.randomState && state.chat.randomState !== 'idle') {
            this.renderRandomChatArea();
            return;
        }

        const activeRoom = state.chat.rooms.find(r => r.id === state.chat.activeRoomId);
        const domArea = document.getElementById('chat-area');
        if (!activeRoom || !domArea) return;

        const typeIcon = activeRoom.type === 'PUBLIC' ? 'hash' : activeRoom.type === 'PRIVATE_GROUP' ? 'lock' : 'user';

        domArea.innerHTML = `
            <!-- Header -->
            <div class="border-b px-6 py-4 flex items-center justify-between glass-card z-10 sticky top-0">
                <div class="flex items-center gap-3">
                    <div class="p-2 bg-primary/10 rounded-lg">
                        <i data-lucide="${typeIcon}" class="w-5 h-5 text-primary"></i>
                    </div>
                    <div class="flex flex-col">
                        <h2 class="font-bold text-lg font-display tracking-tight">${escapeHtml(activeRoom.name)}</h2>
                        <p class="text-xs text-muted-foreground">${activeRoom.memberCount || activeRoom.members?.length || 0} members</p>
                    </div>
                </div>
            </div>
            
            <!-- Messages List -->
            <div id="messages-list" class="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-hide"></div>

            <!-- Typing Indicator -->
            <div id="typing-area" class="px-4"></div>

            <!-- Input Area -->
            <div class="p-4 border-t bg-background">
                <form id="message-form" class="flex gap-2 p-2 glass-card rounded-lg border group focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all">
                    <input id="message-input" autocomplete="off" class="flex-1 bg-transparent border-0 focus:ring-0 focus:outline-none px-2 text-sm" placeholder="Type a message..." />
                    <button type="submit" class="p-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-transform active:scale-95 disabled:opacity-50 flex items-center justify-center">
                        <i data-lucide="send" class="w-4 h-4"></i>
                    </button>
                </form>
            </div>
        `;
        lucide.createIcons();

        // Message form submit
        document.getElementById('message-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('message-input');
            const val = input.value.trim();
            if (!val) return;
            input.value = '';
            App.sendMessage(val);
        });

        // Typing event on input
        const msgInput = document.getElementById('message-input');
        msgInput.addEventListener('input', () => {
            const roomId = stateStore.state.chat.activeRoomId;
            if (!roomId) return;

            websocketService.sendTypingEvent(roomId, true);
            if (UI._typingTimeout) clearTimeout(UI._typingTimeout);
            UI._typingTimeout = setTimeout(() => {
                websocketService.sendTypingEvent(roomId, false);
            }, 2000);
        });

        this.updateMessages();
    },

    // =============================================
    // MESSAGES — Smart re-render
    // =============================================
    updateMessages() {
        const list = document.getElementById('messages-list');
        if (!list) return;

        const state = stateStore.state;
        const activeId = state.chat.activeRoomId;
        const messages = state.chat.messages[activeId] || [];
        const user = state.auth.currentUser;

        // Preserve scroll position
        const wasAtBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 100;

        list.innerHTML = messages.map(m => {
            const isMe = m.senderId === user.id;
            const isSending = m.status === 'sending';
            const isFailed = m.status === 'failed';
            const isSystem = m.type === 'SYSTEM';

            if (isSystem) {
                return `
                    <div class="flex justify-center my-4">
                        <span class="text-xs bg-muted/50 px-3 py-1 rounded-full text-muted-foreground">${escapeHtml(m.text)}</span>
                    </div>
                `;
            }

            const deleteBtn = isMe && !isSending ? `
                <button onclick="App.deleteMessage('${m.id}', '${activeId}')" class="msg-delete-btn" title="Delete message">
                    <i data-lucide="trash-2" class="w-3 h-3"></i>
                </button>
            ` : '';

            return `
                <div class="flex flex-col ${isMe ? 'items-end' : 'items-start'} mb-4">
                    <div class="flex items-end gap-2 max-w-[75%] ${isMe ? 'flex-row-reverse' : ''}">
                        ${renderAvatar(m.senderAvatarUrl, m.senderUsername)}
                        <div class="flex flex-col ${isMe ? 'items-end' : 'items-start'}">
                            <span class="text-[11px] text-muted-foreground mb-1 ml-1">${escapeHtml(m.senderUsername || 'Unknown')}</span>
                            <div class="msg-bubble px-4 py-2 rounded-2xl text-sm ${isMe ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-secondary text-secondary-foreground rounded-bl-sm'} ${isSending ? 'opacity-70' : ''} ${isFailed ? 'bg-destructive' : ''}">
                                ${escapeHtml(m.text)}
                                ${deleteBtn}
                                <div class="text-[10px] mt-1 ${isMe ? 'text-primary-foreground/60' : 'text-muted-foreground'} text-right">
                                    ${formatTime(m.createdAt)}
                                    ${isSending ? ' ⏳' : ''}${isFailed ? ' ❌' : ''}${m.isEdited ? ' (edited)' : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        lucide.createIcons();

        // Auto-scroll only if user was at bottom
        if (wasAtBottom || messages.length <= 10) {
            list.scrollTop = list.scrollHeight;
        }

        // Update typing indicator
        this.updateTypingIndicator();
    },

    // =============================================
    // TYPING INDICATOR
    // =============================================
    updateTypingIndicator() {
        const area = document.getElementById('typing-area');
        if (!area) return;

        const state = stateStore.state;
        const activeId = state.chat.activeRoomId;
        const typingList = (state.chat.typingUsers[activeId] || [])
            .filter(u => u !== state.auth.currentUser?.username);

        if (typingList.length === 0) {
            area.innerHTML = '';
            return;
        }

        const names = typingList.length <= 2
            ? typingList.join(' and ')
            : `${typingList[0]} and ${typingList.length - 1} others`;

        area.innerHTML = `
            <div class="typing-indicator">
                <span>${escapeHtml(names)} ${typingList.length === 1 ? 'is' : 'are'} typing</span>
                <span class="typing-dots"><span></span><span></span><span></span></span>
            </div>
        `;
    },

    // =============================================
    // RANDOM CHAT — Full flow
    // =============================================
    renderRandomChatArea() {
        const state = stateStore.state;
        const domArea = document.getElementById('chat-area');
        if (!domArea) return;

        const randomState = state.chat.randomState;

        // IDLE state
        if (randomState === 'idle') {
            domArea.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full p-8 text-center">
                    <div class="max-w-md w-full space-y-8">
                        <div class="w-20 h-20 bg-background rounded-full mx-auto flex items-center justify-center shadow-xl ring-4 ring-secondary">
                            <i data-lucide="users" class="w-8 h-8 text-muted-foreground"></i>
                        </div>
                        <div class="space-y-3">
                            <h2 class="text-3xl font-display font-bold">Talk to Strangers</h2>
                            <p class="text-muted-foreground">Connect anonymously. No history saved. Skip anytime.</p>
                            <div class="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-2">
                                <i data-lucide="shield" class="w-4 h-4"></i>
                                <span>Stay safe. Be respectful.</span>
                            </div>
                        </div>
                        <div class="pt-4">
                            <button onclick="App.findRandomMatch()" class="px-12 py-3 bg-primary text-primary-foreground font-medium rounded-full hover:bg-primary/90 transition-transform active:scale-95 shadow-xl shadow-primary/20 text-lg">
                                <span class="flex items-center gap-2"><i data-lucide="skip-forward" class="w-5 h-5"></i> Find Stranger</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        // SEARCHING state
        if (randomState === 'searching') {
            domArea.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full p-8 text-center">
                    <div class="max-w-md w-full space-y-8">
                        <div class="w-20 h-20 bg-background rounded-full mx-auto flex items-center justify-center shadow-xl ring-4 ring-secondary pulse-ring">
                            <i data-lucide="loader-2" class="w-8 h-8 text-primary animate-spin"></i>
                        </div>
                        <div class="space-y-3">
                            <h2 class="text-3xl font-display font-bold">Finding a stranger...</h2>
                            <p class="text-muted-foreground">Connecting you with someone random.</p>
                        </div>
                        <div class="pt-4">
                            <button onclick="App.stopRandomChat()" class="px-8 py-2 border border-border text-foreground font-medium rounded-full hover:bg-secondary transition-colors">
                                Cancel Search
                            </button>
                        </div>
                    </div>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        // CONNECTED or DISCONNECTED state — show chat
        const activeRoom = state.chat.rooms.find(r => r.id === state.chat.activeRoomId);
        const messages = activeRoom ? (state.chat.messages[activeRoom.id] || []) : [];
        const user = state.auth.currentUser;
        const isDisconnected = randomState === 'disconnected';

        domArea.innerHTML = `
            <!-- Header -->
            <div class="border-b px-6 py-3 flex items-center justify-between glass-card z-10">
                <div class="flex items-center gap-3">
                    <div>
                        <h2 class="font-semibold">Anonymous Chat</h2>
                        <p class="text-xs ${isDisconnected ? 'text-destructive' : 'text-muted-foreground'} flex items-center gap-1.5">
                            <span class="w-1.5 h-1.5 rounded-full ${isDisconnected ? 'bg-destructive' : 'bg-emerald-500 animate-pulse'}"></span>
                            ${isDisconnected ? 'Stranger disconnected' : 'Stranger connected'}
                        </p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    ${isDisconnected ? `
                        <button onclick="App.findRandomMatch()" class="px-4 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors flex items-center gap-1.5">
                            <i data-lucide="skip-forward" class="w-4 h-4"></i> Find New
                        </button>
                    ` : `
                        <button onclick="App.nextRandom()" class="px-4 py-1.5 border border-border text-sm font-medium rounded-md hover:bg-secondary transition-colors flex items-center gap-1.5">
                            <i data-lucide="skip-forward" class="w-4 h-4"></i> Next
                        </button>
                    `}
                    <button onclick="App.stopRandomChat()" class="px-3 py-1.5 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-md transition-colors">
                        End Chat
                    </button>
                </div>
            </div>

            <!-- Messages -->
            <div id="messages-list" class="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-hide">
                ${messages.length === 0 ? `
                    <div class="text-center text-muted-foreground py-12">
                        <p>Say hello to start chatting! 👋</p>
                        <p class="text-xs mt-2">Remember: Be respectful and stay safe</p>
                    </div>
                ` : messages.map(m => {
                    const isMe = m.senderId === user.id;
                    const isSystem = m.type === 'SYSTEM';
                    if (isSystem) return `<div class="flex justify-center my-4"><span class="text-xs bg-muted/50 px-3 py-1 rounded-full text-muted-foreground">${escapeHtml(m.text)}</span></div>`;

                    return `
                        <div class="flex flex-col ${isMe ? 'items-end' : 'items-start'} mb-4">
                            <div class="flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'}">
                                <span class="text-xs font-medium text-muted-foreground mb-1">${isMe ? 'You' : 'Stranger'}</span>
                                <div class="px-4 py-2.5 rounded-2xl text-sm shadow-sm ${isMe ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-secondary border border-border rounded-tl-none'}">
                                    <div>${escapeHtml(m.text)}</div>
                                    <div class="text-[10px] text-right opacity-70 mt-1">${formatTime(m.createdAt)}${m.status === 'sending' ? ' ⏳' : ''}${m.status === 'failed' ? ' ❌' : ''}</div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>

            <!-- Typing Indicator -->
            <div id="typing-area" class="px-4"></div>

            <!-- Input -->
            <div class="p-4 border-t bg-background">
                ${isDisconnected ? `
                    <div class="flex flex-col items-center justify-center p-4">
                        <p class="text-muted-foreground mb-4">Stranger left the chat.</p>
                        <button onclick="App.findRandomMatch()" class="px-8 py-2 bg-primary text-primary-foreground font-medium rounded-full hover:bg-primary/90 transition-colors flex items-center gap-2">
                            <i data-lucide="skip-forward" class="w-4 h-4"></i> Find New Stranger
                        </button>
                    </div>
                ` : `
                    <form id="message-form" class="flex gap-2 p-2 glass-card rounded-lg border group focus-within:ring-1 focus-within:ring-primary transition-all">
                        <input id="message-input" autocomplete="off" class="flex-1 bg-transparent border-0 focus:ring-0 focus:outline-none px-2 text-sm" placeholder="Type anonymously..." />
                        <button type="submit" class="p-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-transform active:scale-95">
                            <i data-lucide="send" class="w-4 h-4"></i>
                        </button>
                    </form>
                `}
            </div>
        `;
        lucide.createIcons();

        // Message form
        const form = document.getElementById('message-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const input = document.getElementById('message-input');
                const val = input.value.trim();
                if (!val) return;
                input.value = '';
                App.sendMessage(val);
            });

            // Typing
            const msgInput = document.getElementById('message-input');
            if (msgInput) {
                msgInput.addEventListener('input', () => {
                    const roomId = stateStore.state.chat.activeRoomId;
                    if (!roomId) return;
                    websocketService.sendTypingEvent(roomId, true);
                    if (UI._typingTimeout) clearTimeout(UI._typingTimeout);
                    UI._typingTimeout = setTimeout(() => websocketService.sendTypingEvent(roomId, false), 2000);
                });
            }
        }

        // Auto-scroll
        const msgList = document.getElementById('messages-list');
        if (msgList) msgList.scrollTop = msgList.scrollHeight;
    }
};

window.appUI = UI;

// ============================================================
// APP CONTROLLER
// ============================================================
const App = {
    async init() {
        // State change → UI update (smart diffing)
        stateStore.subscribe((state) => {
            if (!state.auth.currentUser && !state.auth.isCheckingAuth) {
                if (UI._currentView !== 'auth') UI.renderAuth();
            } else if (state.auth.currentUser) {
                if (UI._currentView !== 'chat') {
                    UI.renderChatLayout();
                } else {
                    UI.updateRoomList();

                    // Handle Random Chat views
                    if (state.chat.randomState && state.chat.randomState !== 'idle') {
                        UI.renderRandomChatArea();
                    } else if (state.chat.activeRoomId && document.getElementById('chat-area')) {
                        if (!document.getElementById('messages-list')) {
                            UI.renderActiveRoom();
                        } else {
                            UI.updateMessages();
                        }
                    }
                }
            }
        });

        // Check authentication on boot
        try {
            if (tokenManager.isAuthenticated()) {
                await this.initSession();
            } else {
                stateStore.setAuth({ isCheckingAuth: false });
            }
        } catch (e) {
            console.warn("Session invalid", e);
            tokenManager.removeToken();
            stateStore.setAuth({ isCheckingAuth: false });
        }
    },

    async initSession() {
        const user = await api.user.getCurrentUser();
        stateStore.setCurrentUser(user);
        
        websocketService.onConnection(() => {
            console.log("App WS Connected");
        });
        
        websocketService.connect();

        const rooms = await api.room.getAllRooms();
        stateStore.setChat({ rooms });

        // Subscribe to global WS presence
        websocketService.subscribeToPresence(event => {
            console.log("Presence", event);
        });

        // Subscribe to match queue for random chat
        websocketService.subscribeToMatchQueue(event => {
            console.log("Match event", event);
            if (event.status === 'MATCHED' && event.roomId) {
                // We got matched — load the room
                stateStore.setChat({ randomState: 'connected' });
                App.selectRoom(event.roomId);
            } else if (event.status === 'DISCONNECTED') {
                stateStore.setChat({ randomState: 'disconnected' });
            }
        });
    },

    async selectRoom(roomId) {
        // Exit random chat mode when selecting a regular room
        const room = stateStore.state.chat.rooms.find(r => r.id === roomId);
        if (room && room.type !== 'RANDOM') {
            stateStore.setChat({ randomState: 'idle' });
        }

        stateStore.setActiveRoom(roomId);

        try {
            const msgs = await api.message.getRoomMessages(roomId);
            const messagesObj = { ...stateStore.state.chat.messages, [roomId]: msgs };
            stateStore.setChat({ messages: messagesObj });
        } catch (e) {
            console.error(e);
        }

        // Render active room (needed because selectRoom might be called before state updates)
        UI.renderActiveRoom();

        // Subscribe to WS
        websocketService.subscribeToRoom(roomId, (wsEvent) => {
            if (wsEvent.type === 'TYPING') {
                stateStore.setTyping(roomId, wsEvent.username, wsEvent.isTyping);
            } else if (wsEvent.type === 'MESSAGE_DELETED') {
                // Remove message from state
                const msgs = (stateStore.state.chat.messages[roomId] || []).filter(m => m.id !== wsEvent.messageId);
                const messagesObj = { ...stateStore.state.chat.messages, [roomId]: msgs };
                stateStore.setChat({ messages: messagesObj });
            } else if (wsEvent.type === 'MESSAGE_EDITED') {
                // Update message in state
                const msgs = (stateStore.state.chat.messages[roomId] || []).map(m => m.id === wsEvent.message.id ? wsEvent.message : m);
                const messagesObj = { ...stateStore.state.chat.messages, [roomId]: msgs };
                stateStore.setChat({ messages: messagesObj });
            } else {
                stateStore.addMessage(wsEvent);
            }
        });
    },

    sendMessage(text) {
        const state = stateStore.state;
        const roomId = state.chat.activeRoomId;
        const user = state.auth.currentUser;
        
        const optimisticMsg = {
            id: 'optimistic-' + crypto.randomUUID(),
            text,
            senderId: user.id,
            senderUsername: user.username,
            senderAvatarUrl: user.avatarUrl,
            roomId,
            createdAt: new Date().toISOString(),
            type: 'TEXT',
            status: 'sending'
        };

        stateStore.addMessage(optimisticMsg);
        
        try {
            websocketService.sendMessage(roomId, text);
        } catch (e) {
            optimisticMsg.status = 'failed';
            stateStore.addMessage(optimisticMsg);
        }
    },

    async deleteMessage(messageId, roomId) {
        if (!messageId || messageId.startsWith('optimistic-')) return;
        try {
            await api.message.deleteMessage(messageId);
            // Remove from local state immediately
            const msgs = (stateStore.state.chat.messages[roomId] || []).filter(m => m.id !== messageId);
            const messagesObj = { ...stateStore.state.chat.messages, [roomId]: msgs };
            stateStore.setChat({ messages: messagesObj });
            UI.toast('Message Deleted');
        } catch (err) {
            UI.toast('Error', err.message);
        }
    },

    // --- RANDOM CHAT ---
    startRandomChat() {
        stateStore.setChat({ randomState: 'idle', activeRoomId: null });
        UI.renderRandomChatArea();
    },

    async findRandomMatch() {
        stateStore.setChat({ randomState: 'searching' });
        try {
            const result = await api.random.startMatching();
            if (result.status === 'SEARCHING') {
                // Still searching — wait for WS match event
                return;
            }
            // Immediately matched — got a room back
            if (result.id) {
                const rooms = [...stateStore.state.chat.rooms, result];
                stateStore.setChat({ rooms, randomState: 'connected' });
                App.selectRoom(result.id);
            }
        } catch (err) {
            stateStore.setChat({ randomState: 'idle' });
            UI.toast('Error', err.message);
        }
    },

    async stopRandomChat() {
        try { await api.random.stopMatching(); } catch (e) { /* ignore */ }
        if (stateStore.state.chat.activeRoomId) {
            websocketService.unsubscribeFromRoom(stateStore.state.chat.activeRoomId);
        }
        stateStore.setChat({ randomState: 'idle', activeRoomId: null });
        // Show empty chat area
        const domArea = document.getElementById('chat-area');
        if (domArea) {
            domArea.innerHTML = `
                <div class="flex-1 flex items-center justify-center text-muted-foreground p-4 text-center">
                    <div class="max-w-md">
                        <div class="p-4 bg-primary/5 rounded-full inline-flex mb-4">
                            <i data-lucide="message-circle" class="w-10 h-10 text-primary/50"></i>
                        </div>
                        <h2 class="text-xl font-bold mb-2 font-display text-foreground">Welcome to Nexus Chat</h2>
                        <p class="text-sm">Select a chat from the sidebar or create a new one to start messaging.</p>
                    </div>
                </div>
            `;
            lucide.createIcons();
        }
    },

    async nextRandom() {
        const currentRoomId = stateStore.state.chat.activeRoomId;
        if (currentRoomId) {
            websocketService.unsubscribeFromRoom(currentRoomId);
        }
        await this.findRandomMatch();
    }
};

window.App = App;

// Boot application
App.init();
