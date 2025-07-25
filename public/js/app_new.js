// ========================================
// PPE video viewer - modular main application
// ========================================

class PPEVideoViewer {
    constructor() {
        console.log('PPEVideoViewer constructor called');
        
        // Initialize modules
        this.videoPlayer = new VideoPlayer(this);
        this.annotationRenderer = new AnnotationRenderer(this);
        this.fileManager = new FileManager(this);
        this.ui = new UI(this);
        
        // Scaling and offset
        this.scaleX = 1;
        this.scaleY = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        
        // Progress monitoring related
        this.monitorFrameExtractionWithOutput = this.monitorFrameExtractionWithOutput.bind(this);
        
        console.log('PPEVideoViewer constructor completed');
    }

    // ========================================
    // Initialization
    // ========================================

    /**
     * Initialize application
     */
    async initialize() {
        console.log('Initializing PPEVideoViewer...');
        
        // Ensure all DOM elements exist
        const fileList = document.getElementById('fileList');
        if (!fileList) {
            console.error('fileList element not found during initialization');
            return;
        }
        
        // Wait for icons to load
        try {
            await this.annotationRenderer.loadIcons();
            console.log('✅ Icons loaded successfully');
        } catch (error) {
            console.warn('⚠️ Some icons failed to load:', error);
        }
        
        // Load file list
        await this.fileManager.loadFileList();
        
        console.log('PPEVideoViewer initialization completed');
    }

    // ========================================
    // Frame display
    // ========================================

    /**
     * Display current frame
     */
    async displayCurrentFrame() {
        if (!this.videoPlayer.getVideoInfo()) return;

        const currentFrame = this.videoPlayer.getCurrentFrame();
        
        // Check cache
        if (this.videoPlayer.getFrameCache().has(currentFrame)) {
            const cachedImg = this.videoPlayer.getFrameCache().get(currentFrame);
            await this.ui.drawFrame(cachedImg);
            return;
        }

        // If not in cache, load frame immediately
        const img = await this.videoPlayer.loadFrameImmediate(currentFrame);
        if (img) {
            await this.ui.drawFrame(img);
        }
    }

    // ========================================
    // Progress monitoring
    // ========================================

    /**
     * Real-time monitor frame extraction progress and output
     */
    async monitorFrameExtractionWithOutput(filename) {
        return this.monitorFrameExtraction(filename, {
            title: 'Frame Extraction',
            showFileInfo: false
        });
    }

    /**
     * Generic frame extraction progress monitoring method
     */
    async monitorFrameExtraction(filename, options = {}) {
        const {
            title = 'Frame Extraction',
            showFileInfo = false,
            currentFileIndex = 1,
            totalFiles = 1
        } = options;

        const videoBase = filename.replace(/\.[^/.]+$/, "");
        let lastProgress = 0;
        let lastFramesSaved = 0;
        let lastOutput = '';
        let maxAttempts = 300; // Wait up to 5 minutes
        let attempts = 0;

        console.log(`🔍 Starting real-time monitoring for: ${videoBase}`);

        while (attempts < maxAttempts) {
            try {
                // Get real-time progress and output
                const response = await fetch(`/api/extraction/progress/${encodeURIComponent(videoBase)}`);
                if (response.ok) {
                    const data = await response.json();
                    
                    console.log(`📊 Progress update: ${data.progress}%, ${data.framesSaved} frames, status: ${data.status}`);
                    
                    // Calculate overall progress (considering multi-file case)
                    const fileWeight = 1 / totalFiles;
                    const overallProgress = showFileInfo 
                        ? ((currentFileIndex - 1) * fileWeight + (data.progress / 100) * fileWeight) * 100
                        : data.progress;
                    
                    // Check for new output
                    const hasNewOutput = data.output && data.output !== lastOutput;
                    const hasProgressChange = data.progress !== lastProgress || data.framesSaved !== lastFramesSaved || data.status !== 'starting';
                    
                    if (hasProgressChange || hasNewOutput) {
                        lastProgress = data.progress;
                        lastFramesSaved = data.framesSaved;
                        lastOutput = data.output || '';
                        
                        let statusText = '';
                        let details = '';
                        
                        switch (data.status) {
                            case 'starting':
                                statusText = showFileInfo 
                                    ? `Starting frame extraction for ${filename} (${currentFileIndex}/${totalFiles})`
                                    : 'Starting frame extraction...';
                                details = 'Initializing Python process...';
                                break;
                            case 'extracting':
                                statusText = `Extracting frames: ${Math.round(data.progress)}%`;
                                details = showFileInfo 
                                    ? `File: ${filename} (${currentFileIndex}/${totalFiles}) - Saved ${data.framesSaved} frames${data.totalFrames ? ` / ${data.totalFrames}` : ''}`
                                    : `Saved ${data.framesSaved} frames${data.totalFrames ? ` / ${data.totalFrames}` : ''}`;
                                break;
                            case 'processing':
                                statusText = `Processing frames: ${Math.round(data.progress)}%`;
                                details = showFileInfo 
                                    ? `File: ${filename} (${currentFileIndex}/${totalFiles}) - Saved ${data.framesSaved} frames${data.totalFrames ? ` / ${data.totalFrames}` : ''}`
                                    : `Saved ${data.framesSaved} frames${data.totalFrames ? ` / ${data.totalFrames}` : ''}`;
                                break;
                            case 'completed':
                                statusText = showFileInfo 
                                    ? `Frame extraction completed for ${filename}`
                                    : 'Frame extraction completed!';
                                details = showFileInfo 
                                    ? `Successfully extracted ${data.framesSaved} frames (${currentFileIndex}/${totalFiles})`
                                    : `Successfully extracted ${data.framesSaved} frames`;
                                this.ui.updateProgressModal(overallProgress, statusText, details);
                                console.log('✅ Frame extraction completed successfully');
                                await new Promise(resolve => setTimeout(resolve, 1000)); // Show completion status for 1 second
                                return;
                            case 'error':
                                statusText = showFileInfo 
                                    ? `Frame extraction failed for ${filename}`
                                    : 'Frame extraction failed!';
                                details = 'An error occurred during frame extraction';
                                this.ui.updateProgressModal(overallProgress, statusText, details);
                                console.error('❌ Frame extraction failed');
                                await new Promise(resolve => setTimeout(resolve, 2000));
                                return;
                            case 'not_found':
                                statusText = showFileInfo 
                                    ? `Waiting for extraction to start for ${filename}`
                                    : 'Waiting for extraction to start...';
                                details = 'Process may still be initializing';
                                break;
                            default:
                                statusText = `Progress: ${Math.round(data.progress)}%`;
                                details = showFileInfo 
                                    ? `File: ${filename} (${currentFileIndex}/${totalFiles}) - Saved ${data.framesSaved} frames${data.totalFrames ? ` / ${data.totalFrames}` : ''}`
                                    : `Saved ${data.framesSaved} frames${data.totalFrames ? ` / ${data.totalFrames}` : ''}`;
                        }        
                        this.ui.updateProgressModal(
                            overallProgress,
                            statusText,
                            details
                        );
                    }
                    
                    // If status is completed or error, exit loop
                    if (data.status === 'completed' || data.status === 'error') {
                        return;
                    }
                } else {
                    console.log(`⚠️ Progress API returned status: ${response.status}`);
                }
            } catch (error) {
                console.log('Checking frame extraction progress...', error.message);
            }
            
            await new Promise(resolve => setTimeout(resolve, 500)); // Check every 0.5 seconds, more frequent updates
            attempts++;
        }
        
        // Timeout handling
        console.log('⏰ Frame extraction monitoring timed out');
        this.ui.updateProgressModal(95, '95%', 'Frame extraction may still be in progress...');
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // ========================================
    // Delegate methods - forwarded to respective modules
    // ========================================

    // Video player related
    get currentFrame() { return this.videoPlayer.getCurrentFrame(); }
    get videoInfo() { return this.videoPlayer.getVideoInfo(); }
    get isPlaying() { return this.videoPlayer.isVideoPlaying(); }

    // Annotation renderer related
    get annotations() { return this.annotationRenderer.annotations; }
    set annotations(value) { this.annotationRenderer.annotations = value; }
    get selectedBox() { return this.annotationRenderer.selectedBox; }
    get alertEnabled() { return this.annotationRenderer.alertEnabled; }
    get showAllBoxesEnabled() { return this.annotationRenderer.showAllBoxesEnabled; }

    // File manager related
    get currentVideoFilename() { return this.fileManager.getCurrentVideoFilename(); }
    get currentAnnotationsFilename() { return this.fileManager.getCurrentAnnotationsFilename(); }

    // UI related
    get canvas() { return this.ui.getCanvas(); }
    get ctx() { return this.ui.getContext(); }
    get scaleX() { return this.ui.getScaleX(); }
    get scaleY() { return this.ui.getScaleY(); }
    get offsetX() { return this.ui.getOffsetX(); }
    get offsetY() { return this.ui.getOffsetY(); }

    // Progress display related
    updateProgressBar() { this.ui.updateProgressBar(); }
    updateTimeLabel() { this.ui.updateTimeLabel(); }
    updateInfoLabel(text, isAlert = false) { this.ui.updateInfoLabel(text, isAlert); }
    updateAdherenceInfo() { this.annotationRenderer.updateAdherenceInfo(); }

    // Progress modal related
    showProgressModal(title, details = '') { this.ui.showProgressModal(title, details); }
    hideProgressModal() { this.ui.hideProgressModal(); }
    updateProgressModal(percentage, text = '', details = '') { this.ui.updateProgressModal(percentage, text, details); }

    // Frame loading indicator related
    showFrameLoadingIndicator() { this.ui.showFrameLoadingIndicator(); }
    hideFrameLoadingIndicator() { this.ui.hideFrameLoadingIndicator(); }
    updateSelectedPersonInfo() { this.ui.updateSelectedPersonInfo(); }
    hideDetailedPPEInfo() { this.ui.hideDetailedPPEInfo(); }
}

// ========================================
// Application startup
// ========================================

// Initialize application after DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing PPEVideoViewer...');
    
    // Create global instance
    window.viewer = new PPEVideoViewer();
    
    // Initialize application
    await window.viewer.initialize();
    
    console.log('PPEVideoViewer application started successfully!');
}); 