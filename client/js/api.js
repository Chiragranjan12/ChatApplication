// API Service for Spring Boot Backend Integration in Vanilla JS
const API_BASE_URL = window.CONFIG.API_BASE_URL + '/api';

window.tokenManager = {
    getToken: () => localStorage.getItem('jwt_token'),
    setToken: (token) => localStorage.setItem('jwt_token', token),
    removeToken: () => localStorage.removeItem('jwt_token'),
    isAuthenticated: () => !!window.tokenManager.getToken()
};

// Generic API request function
async function apiRequest(endpoint, options = {}) {
    const token = window.tokenManager.getToken();
    const headers = { 'Content-Type': 'application/json' };

    if (options.headers) {
        Object.assign(headers, options.headers);
    }
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText || response.statusText}`);
    }

    if (response.status === 204) {
        return {};
    }
    return response.json();
}

// Global API Objects
window.api = {
    auth: {
        register: async (data) => {
            const res = await apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(data) });
            if (res.token) window.tokenManager.setToken(res.token);
            return res;
        },
        verifyOtp: async (email, otp) => {
            const res = await apiRequest('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ email, otp }) });
            window.tokenManager.setToken(res.token);
            return res;
        },
        resendOtp: (email) => apiRequest('/auth/resend-otp', { method: 'POST', body: JSON.stringify({ email }) }),
        login: async (data) => {
            const res = await apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(data) });
            window.tokenManager.setToken(res.token);
            return res;
        },
        logout: async () => {
            await apiRequest('/auth/logout', { method: 'POST' });
            window.tokenManager.removeToken();
        }
    },
    user: {
        getCurrentUser: () => apiRequest('/users/me'),
        getOnlineUsers: () => apiRequest('/users/online'),
        updateProfile: (data) => apiRequest('/users/me', { method: 'PUT', body: JSON.stringify(data) })
    },
    room: {
        getAllRooms: () => apiRequest('/rooms'),
        getPublicRooms: () => apiRequest('/rooms/public'),
        getRoom: (roomId) => apiRequest(`/rooms/${roomId}`),
        createRoom: (data) => apiRequest('/rooms', { method: 'POST', body: JSON.stringify(data) }),
        createDirectRoom: (userId) => apiRequest(`/rooms/direct/${userId}`, { method: 'POST' }),
        createPrivateGroup: (name) => apiRequest('/rooms/private', { method: 'POST', body: JSON.stringify({ name }) }),
        joinRoom: (roomId) => apiRequest(`/rooms/${roomId}/join`, { method: 'POST' }),
        joinRoomByInvite: (inviteCode) => apiRequest(`/rooms/join`, { method: 'POST', body: JSON.stringify({ inviteCode }) }),
        leaveRoom: (roomId) => apiRequest(`/rooms/${roomId}/leave`, { method: 'POST' })
    },
    message: {
        getRoomMessages: (roomId) => apiRequest(`/messages/room/${roomId}`),
        deleteMessage: (messageId) => apiRequest(`/messages/${messageId}`, { method: 'DELETE' })
    },
    random: {
        startMatching: () => apiRequest('/random/start', { method: 'POST' }),
        stopMatching: () => apiRequest('/random/stop', { method: 'POST' }),
        getMatchingStatus: () => apiRequest('/random/queue/status')
    }
};
