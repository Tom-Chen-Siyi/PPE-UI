// ========================================
// Utility functions
// ========================================

/**
 * Format file size
 * @param {number} bytes - number of bytes
 * @returns {string} formatted file size
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format time
 * @param {number} seconds - number of seconds
 * @returns {string} formatted time
 */
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Debounce function
 * @param {Function} func - function to debounce
 * @param {number} wait - wait time
 * @returns {Function} debounced function
 */
function debounce(func, wait) {
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
 * Throttle function
 * @param {Function} func - function to throttle
 * @param {number} limit - limit time
 * @returns {Function} throttled function
 */
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Check file type
 * @param {string} filename - file name
 * @returns {string} file type
 */
function getFileType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const videoTypes = ['mp4', 'avi', 'mov', 'mkv', 'wmv', 'flv'];
    const annotationTypes = ['json'];
    
    if (videoTypes.includes(ext)) return 'video';
    if (annotationTypes.includes(ext)) return 'annotation';
    return 'other';
}

/**
 * Validate JSON format
 * @param {string} jsonString - JSON string
 * @returns {boolean} whether it is a valid JSON
 */
function isValidJSON(jsonString) {
    try {
        JSON.parse(jsonString);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Generate unique ID
 * @returns {string} unique ID
 */
function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Deep clone object
 * @param {any} obj - object to clone
 * @returns {any} cloned object
 */
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (typeof obj === 'object') {
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
}

// Export utility functions
window.PPE_UTILS = {
    formatFileSize,
    formatTime,
    debounce,
    throttle,
    getFileType,
    isValidJSON,
    generateUniqueId,
    deepClone
}; 