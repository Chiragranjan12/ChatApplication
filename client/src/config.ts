/**
 * =============================================================================
 * NEXUS CHAT - Frontend Configuration
 * =============================================================================
 * Centralized configuration for environment variables, API URLs, and logging.
 * 
 * Usage:
 *   import { config, getApiUrl, getWebsocketUrl, log, isDev, isProd } from './config';
 * 
 * Environment Variables (set in .env.local, .env.production, or deployment platform):
 *   - VITE_API_URL: Base URL for REST API (e.g., http://localhost:8080/api)
 *   - VITE_WEBSOCKET_URL: WebSocket URL (e.g., ws://localhost:8080/ws)
 *   - VITE_APP_ENV: Current environment (development, staging, production)
 * =============================================================================
 */

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/** Environment types */
export type AppEnvironment = 'development' | 'staging' | 'production';

/** Configuration object type */
export interface AppConfig {
  /** Base URL for REST API */
  apiUrl: string;
  /** WebSocket URL for real-time communication */
  websocketUrl: string;
  /** Current environment */
  environment: AppEnvironment;
  /** Whether running in development mode */
  isDevelopment: boolean;
  /** Whether running in staging mode */
  isStaging: boolean;
  /** Whether running in production mode */
  isProduction: boolean;
  /** Application version from package.json */
  appVersion: string | undefined;
  /** Debug mode enabled */
  debugMode: boolean;
}

// =============================================================================
// ENVIRONMENT VARIABLE ACCESSORS
// =============================================================================

/**
 * Safely get a required environment variable
 * @throws Error if variable is not set and no fallback provided
 */
function getRequiredEnv(key: string, fallback?: string): string {
  const value = import.meta.env[key] as string | undefined;
  
  if (!value) {
    if (fallback !== undefined) {
      return fallback;
    }
    throw new Error(
      `Missing required environment variable: ${key}\n` +
      `Please set ${key} in your .env file or deployment platform.`
    );
  }
  
  return value;
}

/**
 * Safely get an optional environment variable
 * Returns undefined if not set
 */
function getOptionalEnv(key: string): string | undefined {
  return import.meta.env[key] as string | undefined;
}

// =============================================================================
// CONFIGURATION OBJECT
// =============================================================================

/**
 * Application configuration object
 * Use this for direct access to config values
 * 
 * @example
 * import { config } from './config';
 * console.log(config.apiUrl);
 */
export const config: AppConfig = {
  /** API base URL - required */
  apiUrl: getRequiredEnv('VITE_API_URL'),
  
  /** WebSocket URL - required */
  websocketUrl: getRequiredEnv('VITE_WEBSOCKET_URL'),
  
  /** Current environment - defaults to 'development' */
  environment: (getOptionalEnv('VITE_APP_ENV') as AppEnvironment) || 'development',
  
  /** Development mode flag */
  isDevelopment: (getOptionalEnv('VITE_APP_ENV') || 'development') === 'development',
  
  /** Staging mode flag */
  isStaging: (getOptionalEnv('VITE_APP_ENV') || 'development') === 'staging',
  
  /** Production mode flag */
  isProduction: (getOptionalEnv('VITE_APP_ENV') || 'development') === 'production',
  
  /** Application version from Vite */
  appVersion: import.meta.env.VITE_APP_VERSION as string | undefined,
  
  /** Debug mode flag */
  debugMode: getOptionalEnv('VITE_DEBUG_MODE') === 'true',
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get full API URL for a specific endpoint
 * 
 * @param endpoint - API endpoint path (e.g., '/auth/login' or 'auth/login')
 * @returns Full URL with base API URL prepended
 * 
 * @example
 * const url = getApiUrl('/auth/login');
 * // Returns: 'http://localhost:8080/api/auth/login'
 * 
 * const url = getApiUrl('auth/login');
 * // Returns: 'http://localhost:8080/api/auth/login'
 */
export function getApiUrl(endpoint: string): string {
  // Ensure endpoint starts with / if not already
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // Remove trailing slash from apiUrl if present
  const normalizedApiUrl = config.apiUrl.replace(/\/$/, '');
  
  return `${normalizedApiUrl}${normalizedEndpoint}`;
}

/**
 * Get full WebSocket URL for a specific path
 * 
 * @param path - WebSocket path (e.g., '/ws' or 'ws')
 * @returns Full WebSocket URL
 * 
 * @example
 * const wsUrl = getWebsocketUrl('/ws');
 * // Returns: 'ws://localhost:8080/ws'
 */
export function getWebsocketUrl(path: string = ''): string {
  // Ensure path starts with / if not already
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // Remove trailing slash from websocketUrl if present
  const normalizedWsUrl = config.websocketUrl.replace(/\/$/, '');
  
  return `${normalizedWsUrl}${normalizedPath}`;
}

/**
 * Shorthand for checking if in development mode
 * 
 * @returns true if environment is 'development'
 * 
 * @example
 * if (isDev()) {
 *   console.log('Running in development');
 * }
 */
export function isDev(): boolean {
  return config.isDevelopment;
}

/**
 * Shorthand for checking if in staging mode
 * 
 * @returns true if environment is 'staging'
 */
export function isStaging(): boolean {
  return config.isStaging;
}

/**
 * Shorthand for checking if in production mode
 * 
 * @returns true if environment is 'production'
 * 
 * @example
 * if (isProd()) {
 *   // Disable debug features
 * }
 */
export function isProd(): boolean {
  return config.isProduction;
}

// =============================================================================
// SAFE LOGGING
// =============================================================================

/** Log levels */
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Safe logging function that only logs in development/staging
 * Prevents sensitive data leaks in production
 * 
 * @param level - Log level (debug, info, warn, error)
 * @param message - Log message
 * @param data - Optional data to log (only in development)
 * 
 * @example
 * log('info', 'User logged in', { userId: 123 });
 * log('debug', 'API response:', responseData);
 * log('warn', 'Deprecated feature used');
 * log('error', 'Failed to connect', error);
 */
export function log(
  level: LogLevel,
  message: string,
  data?: unknown
): void {
  // Always log errors and warnings in all environments
  if (level === 'error' || level === 'warn') {
    switch (level) {
      case 'error':
        console.error(`[NEXUS] ${message}`, data ?? '');
        break;
      case 'warn':
        console.warn(`[NEXUS] ${message}`, data ?? '');
        break;
    }
    return;
  }

  // Only log debug/info in development/staging
  if (config.isDevelopment || config.isStaging) {
    const timestamp = new Date().toISOString();
    const prefix = `[NEXUS] [${timestamp}]`;
    
    switch (level) {
      case 'debug':
        console.debug(`${prefix} ${message}`, data ?? '');
        break;
      case 'info':
        console.info(`${prefix} ${message}`, data ?? '');
        break;
    }
  }
  // In production: debug and info logs are completely suppressed
}

/**
 * Convenience method for debug logging
 * Only logs in development mode
 * 
 * @param message - Debug message
 * @param data - Optional data to log
 * 
 * @example
 * debugLog('API called:', { endpoint: '/users', method: 'GET' });
 */
export function debugLog(message: string, data?: unknown): void {
  log('debug', message, data);
}

/**
 * Convenience method for info logging
 * Logs in development and staging
 * 
 * @param message - Info message
 * @param data - Optional data to log
 * 
 * @example
 * infoLog('User action:', { action: 'send_message', roomId: 'abc123' });
 */
export function infoLog(message: string, data?: unknown): void {
  log('info', message, data);
}

/**
 * Convenience method for warning logging
 * Always logs (even in production)
 * 
 * @param message - Warning message
 * @param data - Optional data to log
 * 
 * @example
 * warnLog('Rate limit approaching', { remaining: 5 });
 */
export function warnLog(message: string, data?: unknown): void {
  log('warn', message, data);
}

/**
 * Convenience method for error logging
 * Always logs (even in production)
 * 
 * @param message - Error message
 * @param error - Optional error object
 * 
 * @example
 * errorLog('API request failed', error);
 */
export function errorLog(message: string, error?: unknown): void {
  log('error', message, error);
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate configuration on module load
 * Logs warnings for missing optional variables
 */
function validateConfig(): void {
  // Warn if using localhost in production
  if (config.isProduction) {
    if (config.apiUrl.includes('localhost')) {
      warnLog('PRODUCTION WARNING: Using localhost in production API URL');
    }
    if (config.websocketUrl.includes('localhost')) {
      warnLog('PRODUCTION WARNING: Using localhost in production WebSocket URL');
    }
    if (!config.apiUrl.startsWith('https://')) {
      warnLog('PRODUCTION WARNING: API URL should use HTTPS in production');
    }
  }

  // Log config summary in development
  if (config.isDevelopment) {
    debugLog('Configuration loaded', {
      environment: config.environment,
      apiUrl: config.apiUrl,
      websocketUrl: config.websocketUrl,
      appVersion: config.appVersion || 'not set',
    });
  }
}

// Run validation
validateConfig();

// =============================================================================
// EXPORTS SUMMARY
// =============================================================================

/**
 * Default export for convenience
 * Allows: import config from './config';
 */
export default config;

// =============================================================================
// USAGE EXAMPLES
// =============================================================================
/*
// Import specific items
import { 
  config,           // Full config object
  getApiUrl,        // Get full API URL
  getWebsocketUrl,  // Get full WebSocket URL
  log,              // Safe logging function
  debugLog,         // Debug logging (dev only)
  infoLog,          // Info logging (dev/staging)
  warnLog,          // Warning logging (always)
  errorLog,         // Error logging (always)
  isDev,            // Shorthand: config.isDevelopment
  isProd,           // Shorthand: config.isProduction
} from './config';

// Using config object
console.log(config.apiUrl);
console.log(config.isDevelopment);

// Using helper functions
const loginUrl = getApiUrl('/auth/login');
const wsUrl = getWebsocketUrl('/ws');

// Using safe logging
log('info', 'User logged in', { userId: 123 });
debugLog('API response:', data);
errorLog('Failed to send message', error);

// Conditional logic
if (isDev()) {
  // Development-only code
}

if (isProd()) {
  // Production-only code
}
*/