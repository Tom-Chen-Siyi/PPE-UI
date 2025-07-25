// ========================================
// Frontend Configuration
// ========================================

// Protective Equipment Icon Mapping
const ICON_PATHS = {
    gi: '/icon/gown.png',      // Gown - Improper/Absent
    ga: '/icon/gown.png',
    rc: '/icon/mask.png',      // Mask - Removed
    mi: '/icon/mask.png',      // Mask - Improper
    ma: '/icon/mask.png',      // Mask - Absent
    ha: '/icon/gloves.png',    // Gloves - Absent
    ea: '/icon/eyewear.png',   // Eyewear - Absent
    alert: '/icon/exclamation icon.png' // Exclamation Mark
};

// Default Configuration
const DEFAULT_CONFIG = {
    maxCacheSize: 50,           // Frame Cache Size
    preloadBuffer: 3,          // Preload Buffer
    adaptivePlayback: true,    // Adaptive Playback
    debugMode: false,          // Debug Mode
    playbackSpeed: 1           // Playback Speed
};

// API Endpoints
const API_ENDPOINTS = {
    UPLOAD_VIDEO: '/api/upload/video',
    UPLOAD_ANNOTATIONS: '/api/upload/annotations',
    GET_FILES: '/api/files',
    GET_VIDEO_INFO: '/api/video',
    GET_ANNOTATIONS: '/api/annotations',
    GET_FRAME_STATUS: '/api/frames/status',
    GET_EXTRACTION_PROGRESS: '/api/extraction/progress',
    GENERATE_FRAMES: '/api/generate-frames',
    DELETE_FILE: '/api/delete/file'
};

// Export Configuration
window.PPE_CONFIG = {
    ICON_PATHS,
    DEFAULT_CONFIG,
    API_ENDPOINTS
}; 