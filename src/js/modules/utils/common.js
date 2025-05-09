/**
 * Common utility functions for the recipe viewer application
 */

/**
 * Format a duration in seconds into a human-readable string (mm:ss)
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted time string (mm:ss)
 */
export function formatTimeMMSS(seconds) {
    if (!seconds && seconds !== 0) return '00:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format a duration in seconds into a human-readable string
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted time string
 */
export function formatDuration(seconds) {
    if (!seconds && seconds !== 0) return '0 seconds';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0 && remainingSeconds > 0) {
        return `${minutes} min ${remainingSeconds} sec`;
    } else if (minutes > 0) {
        return `${minutes} min`;
    } else {
        return `${remainingSeconds} sec`;
    }
}

/**
 * Format a duration in seconds into a human-readable string
 * This is an alias for formatDuration to maintain compatibility
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted time string
 */
export function formatTime(seconds) {
    return formatDuration(seconds);
}

/**
 * Create a unique ID
 * @returns {string} Unique ID
 */
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

/**
 * Check if a value is undefined or null
 * @param {*} value - Value to check
 * @returns {boolean} True if value is undefined or null
 */
export function isNil(value) {
    return value === undefined || value === null;
}

/**
 * Safely parse a string to JSON
 * @param {string} str - String to parse
 * @param {*} defaultValue - Default value to return if parsing fails
 * @returns {*} Parsed JSON or default value
 */
export function safeJsonParse(str, defaultValue = {}) {
    try {
        return JSON.parse(str);
    } catch (e) {
        return defaultValue;
    }
}

/**
 * Safely stringify an object to JSON
 * @param {*} value - Value to stringify
 * @param {string} defaultValue - Default value to return if stringification fails
 * @returns {string} Stringified JSON or default value
 */
export function safeJsonStringify(value, defaultValue = '{}') {
    try {
        return JSON.stringify(value);
    } catch (e) {
        return defaultValue;
    }
}

/**
 * Saves data to localStorage
 * @param {string} key - Storage key
 * @param {*} data - Data to store
 * @returns {boolean} Success indicator
 */
export function setToStorage(key, data) {
    try {
        localStorage.setItem(key, safeJsonStringify(data));
        return true;
    } catch (e) {
        console.error('Failed to save to localStorage:', e);
        return false;
    }
}

/**
 * Gets data from localStorage
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if not found
 * @returns {*} Retrieved data or default value
 */
export function getFromStorage(key, defaultValue = null) {
    try {
        const data = localStorage.getItem(key);
        return data ? safeJsonParse(data, defaultValue) : defaultValue;
    } catch (e) {
        console.error('Failed to get from localStorage:', e);
        return defaultValue;
    }
}

/**
 * Delays execution for the specified time
 * @param {number} ms - Time to delay in milliseconds
 * @returns {Promise} Promise that resolves after the delay
 */
export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Clean up a voice transcript text
 * @param {string} text - The transcript text to clean
 * @returns {string} Cleaned transcript text
 */
export function cleanTranscript(text) {
    if (!text) return '';
    
    // Trim whitespace, convert to lowercase, and remove extra spaces
    return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

export default {
    formatTimeMMSS,
    formatDuration,
    formatTime,
    generateId,
    isNil,
    safeJsonParse,
    safeJsonStringify,
    setToStorage,
    getFromStorage,
    delay,
    cleanTranscript
}; 