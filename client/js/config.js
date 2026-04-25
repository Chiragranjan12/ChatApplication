// =============================================================================
// NEXUS CHAT - Frontend Configuration
// =============================================================================
// This config uses environment variables for flexibility across environments
// Vite environment variables must be prefixed with VITE_
// =============================================================================

window.CONFIG = {
  // API Base URL - loaded from environment variable with fallback
  // Development: http://localhost:8080
  // Production: https://your-backend-domain.com
  API_BASE_URL: import.meta.env.VITE_API_URL || "http://localhost:8080",

  // WebSocket URL - loaded from environment variable with fallback
  // Development: ws://localhost:8080/ws
  // Production: wss://your-backend-domain.com/ws
  WS_URL: import.meta.env.VITE_WEBSOCKET_URL || "ws://localhost:8080/ws",

  // Environment flag for conditional logic
  isProduction: import.meta.env.PROD || false,

  // Debug mode - disable in production
  debug: import.meta.env.DEV || true
};
