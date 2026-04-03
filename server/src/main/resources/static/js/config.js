// ============================================================
// App Configuration — Replaces Vite env variables
// ============================================================
// Set API_URL to your backend URL for cross-origin deployments.
// Leave empty string "" to use same-origin (when frontend is served by Spring Boot).

window.APP_CONFIG = {
    // For Railway/Render: set to your deployed backend URL, e.g.:
    //   "https://your-backend.up.railway.app"
    // For local dev or same-origin: leave as ""
    API_URL: "https://chatapplication-6jyl.onrender.com",

    // WebSocket URL — auto-detected from API_URL
    // Override if needed (e.g. wss://your-backend.up.railway.app/ws)
    WS_URL: ""
};

// Auto-resolve: if API_URL is empty, use current origin (same-origin mode)
(function () {
    const cfg = window.APP_CONFIG;
    if (!cfg.API_URL) {
        cfg.API_URL = window.location.origin;
    }
    // Strip trailing slash
    cfg.API_URL = cfg.API_URL.replace(/\/+$/, '');

    if (!cfg.WS_URL) {
        cfg.WS_URL = cfg.API_URL + '/ws';
    }
})();
