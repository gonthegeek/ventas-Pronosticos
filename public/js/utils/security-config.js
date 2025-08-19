/**
 * Security Configuration
 * Centralizes security settings and policies for the application
 */

export const SECURITY_CONFIG = {
    // Development vs Production modes
    PRODUCTION_MODE: true, // Set to true in production
    
    // Console logging settings
    ENABLE_DEBUG_LOGS: false, // Set to false in production
    ENABLE_PERMISSION_LOGS: false, // Set to false in production
    ENABLE_AUTH_LOGS: false, // Set to false in production
    
    // Admin function exposure settings
    EXPOSE_ADMIN_FUNCTIONS: false, // Only expose to admin users
    
    // Security headers and policies
    ENFORCE_HTTPS: true,
    ENABLE_CSP: true,
    
    // Session and authentication settings
    SESSION_TIMEOUT: 3600000, // 1 hour in milliseconds
    REQUIRE_STRONG_PASSWORDS: true,
    
    // Error handling
    SHOW_DETAILED_ERRORS: false, // Set to false in production
    
    // Rate limiting (if implemented)
    ENABLE_RATE_LIMITING: true,
    MAX_LOGIN_ATTEMPTS: 3,
    
    // Audit logging
    ENABLE_AUDIT_LOGS: true,
    LOG_USER_ACTIONS: true,
    
    // Data validation
    STRICT_INPUT_VALIDATION: true,
    SANITIZE_USER_INPUT: true
};

/**
 * Check if application is in development mode
 */
export function isDevelopmentMode() {
    return !SECURITY_CONFIG.PRODUCTION_MODE;
}

/**
 * Check if debug logs should be enabled
 */
export function shouldEnableDebugLogs() {
    return SECURITY_CONFIG.ENABLE_DEBUG_LOGS && isDevelopmentMode();
}

/**
 * Secure console log - only logs in development mode
 */
export function secureLog(message, ...args) {
    if (shouldEnableDebugLogs()) {
        console.log(message, ...args);
    }
}

/**
 * Secure console warn - only logs in development mode
 */
export function secureWarn(message, ...args) {
    if (shouldEnableDebugLogs()) {
        console.warn(message, ...args);
    }
}

/**
 * Secure console error - always logs errors but with different detail levels
 */
export function secureError(message, ...args) {
    if (SECURITY_CONFIG.SHOW_DETAILED_ERRORS || isDevelopmentMode()) {
        console.error(message, ...args);
    } else {
        // In production, log generic error message
        console.error('Application error occurred');
    }
}

/**
 * Check if admin functions should be exposed globally
 */
export function shouldExposeAdminFunctions(userRole) {
    return SECURITY_CONFIG.EXPOSE_ADMIN_FUNCTIONS && userRole === 'admin';
}

export default SECURITY_CONFIG;
