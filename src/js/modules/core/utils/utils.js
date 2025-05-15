/**
 * Utility functions for the recipe viewer application
 */

/**
 * Format a duration in minutes into a human-readable string
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted time string
 */
export function formatTime(minutes) {
    if (!minutes) return 'N/A';
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
        return `${hours} hr${hours > 1 ? 's' : ''} ${mins > 0 ? `${mins} min${mins > 1 ? 's' : ''}` : ''}`;
    }
    
    return `${mins} min${mins > 1 ? 's' : ''}`;
}

/**
 * Format a date into a human-readable string
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(date);
}

/**
 * Debounce a function call
 * @param {Function} func - Function to debounce
 * @param {number} wait - Time to wait in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Create a unique ID
 * @returns {string} Unique ID
 */
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Check if a value is empty (null, undefined, empty string, or empty array)
 * @param {*} value - Value to check
 * @returns {boolean} True if empty
 */
export function isEmpty(value) {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
}

/**
 * Check if we're in a browser environment
 * @returns {boolean} True if in browser environment
 */
export function isBrowserEnvironment() {
    return typeof window !== 'undefined';
}

/**
 * Determine if we're in development or production environment
 * @returns {string} 'development' or 'production'
 */
export function getEnvironment() {
    const isBrowser = isBrowserEnvironment();
    
    const isDevelopment = isBrowser ? 
        (window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1' ||
         window.location.hostname === '') :
        true; // Default to development in Node.js environment
        
    return isDevelopment ? 'development' : 'production';
}

/**
 * Resolve a path based on the current environment
 * @param {string} path - The path to resolve
 * @returns {string} The resolved path with appropriate prefix
 */
export function resolvePath(path) {
    const env = getEnvironment();
    const basePath = env === 'production' ? '/recipe_viewer' : '';
    
    // Ensure path starts with a slash
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    
    return `${basePath}${normalizedPath}`;
} 