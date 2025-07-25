// ========================================
// UI Management Module
// ========================================

class UI {
    constructor(viewer) {
        this.viewer = viewer;
        this.holdingClick = false;
        this.lastClickX = null;
        this.lastClickY = null;
        this.selectedPersonId = null; // Track the ID of the currently selected person
        
        // Canvas related
        this.canvas = document.getElementById('videoCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvasInitialized = false;
        this.lastVideoWidth = null;
        this.lastVideoHeight = null;
        this.scaleX = 1;
        this.scaleY = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        
        // Progress related
        this.progressModal = document.getElementById('globalProgressModal');
        this.progressTitle = document.getElementById('progressTitle');
        this.globalProgressFill = document.getElementById('globalProgressFill');
        this.globalProgressText = document.getElementById('globalProgressText');
        this.progressDetails = document.getElementById('progressDetails');
        
        // Upload progress related
        this.videoUploadProgress = document.getElementById('videoUploadProgress');
        this.videoProgressFill = document.getElementById('videoProgressFill');
        this.videoProgressText = document.getElementById('videoProgressText');
        this.annotationsUploadProgress = document.getElementById('annotationsUploadProgress');
        this.annotationsProgressFill = document.getElementById('annotationsProgressFill');
        this.annotationsProgressText = document.getElementById('annotationsProgressText');
        
        // Render performance optimization
        this.renderPerformance = {
            lastRenderTime: 0,
            renderTimes: [],
            maxRenderHistory: 10
        };
        
        this.initializeCanvas();
        this.initializeEventListeners();
    }

    // ========================================
    // Canvas initialization
    // ========================================

    /**
     * Initialize Canvas
     */
    initializeCanvas() {
        // Optimize Canvas rendering performance
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.imageSmoothingQuality = 'low';
    }

    // ========================================
    // Event listeners
    // ========================================

    /**
     * Initialize event listeners
     */
    initializeEventListeners() {
        // Play control buttons
        const playBtn = document.getElementById('playBtn');
        if (playBtn) {
            playBtn.addEventListener('click', () => this.viewer.videoPlayer.togglePlayback());
        }

        // Progress bar
        const progressBar = document.getElementById('progressBar');
        if (progressBar) {
            progressBar.addEventListener('input', (e) => {
                this.viewer.videoPlayer.seekVideo(e.target.value);
            });
        }

        // Alert toggle
        const alertToggle = document.getElementById('alertToggle');
        if (alertToggle) {
            // Synchronize initial state
            alertToggle.checked = this.viewer.annotationRenderer.alertEnabled;
            alertToggle.addEventListener('change', async (e) => {
                this.viewer.annotationRenderer.toggleAlert();
                // Redraw current frame to show/hide PPE icons
                await this.viewer.displayCurrentFrame();
            });
        }

        // Show all boxes toggle
        const showAllBoxesToggle = document.getElementById('showAllBoxesToggle');
        if (showAllBoxesToggle) {
            // Synchronize initial state
            showAllBoxesToggle.checked = this.viewer.annotationRenderer.showAllBoxesEnabled;
            showAllBoxesToggle.addEventListener('change', async (e) => {
                this.viewer.annotationRenderer.toggleShowAllBoxes();
                // Redraw current frame to show/hide all boxes
                await this.viewer.displayCurrentFrame();
            });
        }

        // Adaptive playback toggle
        const adaptivePlaybackToggle = document.getElementById('adaptivePlaybackToggle');
        if (adaptivePlaybackToggle) {
            adaptivePlaybackToggle.addEventListener('change', (e) => {
                this.viewer.videoPlayer.adaptivePlayback = e.target.checked;
                console.log(`Adaptive playback ${this.viewer.videoPlayer.adaptivePlayback ? 'enabled' : 'disabled'}`);
            });
        }

        // Panel hide/show toggle
        this.initializePanelToggleListeners();

        // File input change events
        this.initializeFileInputListeners();

        // Button events
        this.initializeButtonListeners();

        // Canvas mouse events
        this.initializeCanvasListeners();

        // Window resize
        window.addEventListener('resize', () => this.handleResize());
    }

    /**
     * Initialize panel toggle listeners
     */
    initializePanelToggleListeners() {
        // Left panel close button
        const closeLeftPanel = document.getElementById('closeLeftPanel');
        if (closeLeftPanel) {
            closeLeftPanel.addEventListener('click', () => {
                this.closeLeftPanel();
            });
        }

        // Show left panel button
        const showLeftPanel = document.getElementById('showLeftPanel');
        if (showLeftPanel) {
            showLeftPanel.addEventListener('click', () => {
                this.showLeftPanel();
            });
        }

        // Right panel close button
        const closeRightPanel = document.getElementById('closeRightPanel');
        if (closeRightPanel) {
            closeRightPanel.addEventListener('click', () => {
                this.closeRightPanel();
            });
        }

        // Show right panel button
        const showRightPanel = document.getElementById('showRightPanel');
        if (showRightPanel) {
            showRightPanel.addEventListener('click', () => {
                this.showRightPanel();
            });
        }

        // Video controls bar toggle
        const toggleVideoControls = document.getElementById('toggleVideoControls');
        const canvasControlsContainer = document.getElementById('canvasControlsContainer');
        const showVideoControlsBtn = document.getElementById('showVideoControlsBtn');
        if (toggleVideoControls && canvasControlsContainer && showVideoControlsBtn) {
            toggleVideoControls.addEventListener('click', () => {
                // Animate hide
                canvasControlsContainer.classList.remove('showing');
                canvasControlsContainer.classList.add('hiding');
                setTimeout(() => {
                    canvasControlsContainer.classList.remove('hiding');
                    canvasControlsContainer.classList.add('hidden');
                }, 350);
                // Show triangle button with fade
                showVideoControlsBtn.style.display='block';
                
            });
            //点击hide button
            showVideoControlsBtn.addEventListener('click', () => {
                // Animate show
                console.log('click hide showVideoControlsBt button');
                canvasControlsContainer.classList.remove('hidden');
                canvasControlsContainer.classList.add('showing');
                setTimeout(() => {
                    canvasControlsContainer.classList.remove('showing');
                }, 350);
                // Hide triangle button with fade
                showVideoControlsBtn.style.display='none';
            });
        }
    }

    /**
     * Close left panel
     */
    closeLeftPanel() {
        const leftPanel = document.getElementById('leftPanel');
        const centerPanel = document.querySelector('.center-panel');
        const showBtn = document.getElementById('showLeftPanel');
        
        if (leftPanel && centerPanel && showBtn) {
            // Hide panel
            leftPanel.classList.add('hidden');
            centerPanel.classList.add('left-hidden');
            
            // Show button
            showBtn.style.display = 'block';
            
            // Re-adjust Canvas size
            this.handleResize();
        }
    }

    /**
     * Show left panel
     */
    showLeftPanel() {
        const leftPanel = document.getElementById('leftPanel');
        const centerPanel = document.querySelector('.center-panel');
        const showBtn = document.getElementById('showLeftPanel');
        
        if (leftPanel && centerPanel && showBtn) {
            // Show panel
            leftPanel.classList.remove('hidden');
            centerPanel.classList.remove('left-hidden');
            
            // Hide button
            showBtn.style.display = 'none';
            
            // Re-adjust Canvas size
            this.handleResize();
        }
    }

    /**
     * Close right panel
     */
    closeRightPanel() {
        const rightPanel = document.getElementById('rightPanel');
        const centerPanel = document.querySelector('.center-panel');
        const showBtn = document.getElementById('showRightPanel');
        
        if (rightPanel && centerPanel && showBtn) {
            // Hide panel
            rightPanel.classList.add('hidden');
            centerPanel.classList.add('right-hidden');
            
            // Show button
            showBtn.style.display = 'block';
            
            // Re-adjust Canvas size
            this.handleResize();
        }
    }

    /**
     * Show right panel
     */
    showRightPanel() {
        const rightPanel = document.getElementById('rightPanel');
        const centerPanel = document.querySelector('.center-panel');
        const showBtn = document.getElementById('showRightPanel');
        
        if (rightPanel && centerPanel && showBtn) {
            // Show panel
            rightPanel.classList.remove('hidden');
            centerPanel.classList.remove('right-hidden');
            
            // Hide button
            showBtn.style.display = 'none';
            
            // Re-adjust Canvas size
            this.handleResize();
        }
    }

    /**
     * Initialize file input listeners
     */
    initializeFileInputListeners() {
        const videoUpload = document.getElementById('videoUpload');
        const annotationsUpload = document.getElementById('annotationsUpload');
        const videoFileDisplay = document.getElementById('videoFileDisplay');
        const annotationsFileDisplay = document.getElementById('annotationsFileDisplay');

        if (videoUpload && videoFileDisplay) {
            videoUpload.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    videoFileDisplay.textContent = file.name;
                    videoFileDisplay.classList.add('has-file');
                } else {
                    videoFileDisplay.textContent = 'No file selected';
                    videoFileDisplay.classList.remove('has-file');
                }
            });
        }

        if (annotationsUpload && annotationsFileDisplay) {
            annotationsUpload.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    annotationsFileDisplay.textContent = file.name;
                    annotationsFileDisplay.classList.add('has-file');
                } else {
                    annotationsFileDisplay.textContent = 'No file selected';
                    annotationsFileDisplay.classList.remove('has-file');
                }
            });
        }
    }

    /**
     * Initialize button listeners
     */
    initializeButtonListeners() {
        // Upload buttons
        const uploadVideoBtn = document.getElementById('uploadVideoBtn');
        const uploadAnnotationsBtn = document.getElementById('uploadAnnotationsBtn');
        
        if (uploadVideoBtn) {
            uploadVideoBtn.addEventListener('click', () => this.viewer.fileManager.uploadVideo());
        }
        
        if (uploadAnnotationsBtn) {
            uploadAnnotationsBtn.addEventListener('click', () => this.viewer.fileManager.uploadAnnotations());
        }

        // File management buttons
        const refreshBtn = document.getElementById('refreshFilesBtn');
        const checkFrameStatusBtn = document.getElementById('checkFrameStatusBtn');
        const generateFramesBtn = document.getElementById('generateFramesBtn');
        const deleteFilesBtn = document.getElementById('deleteFilesBtn');
        
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.viewer.fileManager.loadFileList());
        }
        
        if (checkFrameStatusBtn) {
            checkFrameStatusBtn.addEventListener('click', () => this.viewer.fileManager.checkCurrentVideoFrameStatus());
        }
        
        if (generateFramesBtn) {
            generateFramesBtn.addEventListener('click', () => this.viewer.fileManager.generateFramesForSelected());
        }
        
        if (deleteFilesBtn) {
            deleteFilesBtn.addEventListener('click', () => this.viewer.fileManager.deleteSelectedFiles());
        }

        // Annotation buttons
        const loadJsonBtn = document.getElementById('loadJsonBtn');
        if (loadJsonBtn) {
            loadJsonBtn.addEventListener('click', () => this.loadNewJson());
        }
    }

    /**
     * Initialize Canvas listeners
     */
    initializeCanvasListeners() {
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    }

    // ========================================
    // Mouse event handling
    // ========================================

    /**
     * Handle mouse down event
     */
    async handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.holdingClick = true;
        this.lastClickX = x;
        this.lastClickY = y;

        // Check if a bounding box was clicked
        const clickedBox = this.viewer.annotationRenderer.getClosestBox(x, y);
        if (clickedBox) {
            // Check if it's an alert box (has non-compliant PPE)
            const nonadherenceTexts = this.viewer.annotationRenderer.getNonadherenceTexts(clickedBox);
            if (nonadherenceTexts.length > 0) {
                // Create icon key
                const iconKey = `${clickedBox.id}-${clickedBox.class}`;
                
                // Toggle PPE icon display state
                if (this.viewer.annotationRenderer.clickedExclamationIcons.has(iconKey)) {
                    // If already displayed, hide
                    this.viewer.annotationRenderer.clickedExclamationIcons.delete(iconKey);
                } else {
                    // If not displayed, add to clicked list (do not clear previous)
                    this.viewer.annotationRenderer.clickedExclamationIcons.add(iconKey);
                }
                
                // Update detailed info display
                this.updateMultiPersonPPEInfo();
                
                this.viewer.annotationRenderer.setActiveAlertBox(clickedBox);
            }
            
            await this.viewer.displayCurrentFrame();
        } else {
            // Clicked on empty area, clear all states
            this.viewer.annotationRenderer.clearSelectedBox();
            this.viewer.annotationRenderer.clearActiveAlertBox();
            this.viewer.annotationRenderer.clickedExclamationIcons.clear();
            this.hideIconPopup();
            this.hideDetailedPPEInfo();
            this.selectedPersonId = null; // Clear selected person ID
            await this.viewer.displayCurrentFrame();
        }
    }

    /**
     * Handle mouse move event
     */
    handleMouseMove(e) {
        if (!this.holdingClick) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Add drag logic here
        this.lastClickX = x;
        this.lastClickY = y;
    }

    /**
     * Handle mouse up event
     */
    handleMouseUp(e) {
        this.holdingClick = false;
        this.lastClickX = null;
        this.lastClickY = null;
    }

    // ========================================
    // Icon popup
    // ========================================

    /**
     * Show icon popup
     */
    showIconPopup(x, y, texts) {
        const iconPopup = document.getElementById('iconPopup');
        if (!iconPopup) return;
    
        let popupContent = '';
        texts.forEach(text => {
            popupContent += `<div style="margin: 4px 0; padding: 6px 10px; background: #ffebee; border-left: 3px solid #d32f2f; border-radius: 2px; font-size: 16px; font-weight: 600; color: #d32f2f;">${text}</div>`;
        });
        
        popupContent += '<div style="margin-top: 8px; font-size: 14px; color: #666;">Click anywhere to close</div>';
        
        iconPopup.innerHTML = popupContent;
        iconPopup.style.left = x + 10 + 'px';
        iconPopup.style.top = y - 10 + 'px';
        iconPopup.style.display = 'block';
        
        // Add functionality to close by clicking elsewhere
        setTimeout(() => {
            const closePopup = (e) => {
                if (!iconPopup.contains(e.target)) {
                    this.hideIconPopup();
                    document.removeEventListener('click', closePopup);
                }
            };
            document.addEventListener('click', closePopup);
        }, 100);
    }

    /**
     * Hide icon popup
     */
    hideIconPopup() {
        const iconPopup = document.getElementById('iconPopup');
        if (iconPopup) {
            iconPopup.style.display = 'none';
        }
    }

    /**
     * Show detailed PPE non-compliance info (deprecated, replaced by updateMultiPersonPPEInfo)
     */
    showDetailedPPEInfo(bbox) {
        // This method is now replaced by updateMultiPersonPPEInfo
        this.updateMultiPersonPPEInfo();
            }
            
    /**
     * Hide detailed PPE non-compliance info
     */
    hideDetailedPPEInfo() {
        const detailedInfoContainer = document.getElementById('detailedInfoContainer');
        if (detailedInfoContainer) {
            // Update compliance rate display
            const complianceRateDisplay = document.getElementById('complianceRateDisplay');
            if (complianceRateDisplay) {
                const boxes = this.viewer.annotationRenderer.getCurrentFrameAnnotations();
                let totalBoxes = 0;
                let nonadherenceCount = 0;

                boxes.forEach(box => {
                    totalBoxes++;
                    const nonadherenceTexts = this.viewer.annotationRenderer.getNonadherenceTexts(box);
                    if (nonadherenceTexts.length > 0) {
                        nonadherenceCount++;
                    }
                });

                if (totalBoxes > 0) {
                    const adherenceRate = ((totalBoxes - nonadherenceCount) / totalBoxes * 100).toFixed(1);
                    complianceRateDisplay.textContent = `${adherenceRate}% (${totalBoxes - nonadherenceCount}/${totalBoxes})`;
                } else {
                    complianceRateDisplay.textContent = 'No data available';
                }
            }
            
            // Update PPE non-compliance details
            const ppeDetailsDisplay = document.getElementById('ppeDetailsDisplay');
            if (ppeDetailsDisplay) {
                ppeDetailsDisplay.innerHTML = 'Please select a frame to view the PPE non-compliance details';
            }
            
            // Update detailed info content
            const detailedInfoContent = document.getElementById('detailedInfoContent');
            if (detailedInfoContent) {
                detailedInfoContent.innerHTML = '<div style="color: #999; font-style: italic;">No data available</div>';
            }
        }
    }

    /**
     * Real-time update of selected person's info
     */
    updateSelectedPersonInfo() {
        // Update multi-person PPE info display
        this.updateMultiPersonPPEInfo();
    }

    /**
     * Update multi-person PPE info display
     */
    updateMultiPersonPPEInfo() {
        const clickedIcons = this.viewer.annotationRenderer.clickedExclamationIcons;
        
        if (clickedIcons.size === 0) {
                this.hideDetailedPPEInfo();
            return;
        }

        const detailedInfoContainer = document.getElementById('detailedInfoContainer');
        if (!detailedInfoContainer) return;

        // Get all annotations for the current frame
        const boxes = this.viewer.annotationRenderer.getCurrentFrameAnnotations();

        // Update compliance rate display
        this.updateComplianceRate(boxes);
        
        // Collect all person info for clicked icons
        const selectedPersons = [];
        clickedIcons.forEach(iconKey => {
            const [personId, personClass] = iconKey.split('-');
            const person = boxes.find(box => box.id === personId);
            if (person) {
                selectedPersons.push(person);
            }
        });

        if (selectedPersons.length === 0) {
            this.hideDetailedPPEInfo();
            return;
        }

        // Update PPE non-compliance details
        this.updatePPEDetails(selectedPersons);
    }

    /**
     * Update compliance rate display
     */
    updateComplianceRate(boxes) {
        const complianceRateDisplay = document.getElementById('complianceRateDisplay');
        if (complianceRateDisplay) {
            let totalBoxes = 0;
            let nonadherenceCount = 0;

            // Sort boxes by ID to maintain consistency with PPE details display
            const sortedBoxes = [...boxes].sort((a, b) => {
                const idA = parseInt(a.id);
                const idB = parseInt(b.id);
                return idA - idB;
            });

            sortedBoxes.forEach(box => {
                totalBoxes++;
                const nonadherenceTexts = this.viewer.annotationRenderer.getNonadherenceTexts(box);
                if (nonadherenceTexts.length > 0) {
                    nonadherenceCount++;
                }
            });

            if (totalBoxes > 0) {
                const adherenceRate = ((totalBoxes - nonadherenceCount) / totalBoxes * 100).toFixed(1);
                complianceRateDisplay.textContent = `${adherenceRate}% (${totalBoxes - nonadherenceCount}/${totalBoxes})`;
            } else {
                complianceRateDisplay.textContent = 'No data available';
            }
            }
        }
        
    /**
     * Update PPE details
     */
    updatePPEDetails(selectedPersons) {
        const ppeDetailsDisplay = document.getElementById('ppeDetailsDisplay');
        if (ppeDetailsDisplay) {
            let detailsHTML = '';
            
            // Sort persons by ID
            const sortedPersons = [...selectedPersons].sort((a, b) => {
                // Convert ID to number for comparison to ensure correct numeric sorting
                const idA = parseInt(a.id);
                const idB = parseInt(b.id);
                return idA - idB;
            });
            
            sortedPersons.forEach((person, index) => {
                const nonadherenceTexts = this.viewer.annotationRenderer.getNonadherenceTexts(person);
                
                if (nonadherenceTexts.length > 0) {
                    detailsHTML += `<div style="margin-bottom: 12px; padding: 8px; background: #fff3cd; border-left: 3px solid #ffc107; border-radius: 4px;">`;
                    detailsHTML += `<div style="margin-bottom: 6px; color: #333; font-weight: 600; font-size: 16px;">Member ID: ${person.id}</div>`;
                    
                    nonadherenceTexts.forEach(text => {
                        detailsHTML += `<div style="margin: 3px 0; padding: 6px 10px; background: #ffebee; border-left: 3px solid #dc3545; border-radius: 3px; color: #dc3545; font-size: 16px; font-weight: 600; display: inline-block; margin-right: 8px; margin-bottom: 4px;">${text}</div>`;
                    });
                    
                    detailsHTML += `</div>`;
                } else {
                    detailsHTML += `<div style="margin-bottom: 12px; padding: 8px; background: #d4edda; border-left: 3px solid #28a745; border-radius: 4px;">`;
                    detailsHTML += `<div style="margin-bottom: 6px; color: #333; font-weight: 600; font-size: 16px;">Member ID: ${person.id}</div>`;
                    detailsHTML += `<div style="color: #28a745; font-size: 16px; font-weight: 600;">✅ All PPE items properly worn</div>`;
                    detailsHTML += `</div>`;
            }
            });
            
            ppeDetailsDisplay.innerHTML = detailsHTML;
        }
    }



    /**
     * Show compliance info (deprecated, replaced by updateMultiPersonPPEInfo)
     */
    showComplianceInfo(person) {
        // This method is now replaced by updateMultiPersonPPEInfo
        this.updateMultiPersonPPEInfo();
    }

    // ========================================
    // Frame rendering
    // ========================================

    /**
     * Draw frame
     */
    async drawFrame(img) {
        const renderStartTime = performance.now();
        
        // Dynamically adjust Canvas size to match video aspect ratio
        const imgWidth = img.width;
        const imgHeight = img.height;
        
        // Only adjust Canvas size on first load or when video info changes
        if (!this.canvasInitialized || this.lastVideoWidth !== imgWidth || this.lastVideoHeight !== imgHeight) {
            this.initializeCanvasSize(imgWidth, imgHeight);
        }

        // Clear Canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw image
        this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);

        // Draw annotations
        await this.viewer.annotationRenderer.drawAnnotations();
        
        // Record render time
        const renderTime = performance.now() - renderStartTime;
        this.recordRenderTime(renderTime);
        
        console.log(`✅ Frame ${this.viewer.videoPlayer.getCurrentFrame()} drawn successfully in ${renderTime.toFixed(2)}ms`);
    }

    /**
     * Initialize Canvas size
     */
    initializeCanvasSize(imgWidth, imgHeight) {
        console.log(`Initializing canvas for video: ${imgWidth}x${imgHeight}`);
        
        // Calculate video aspect ratio
        const videoAspectRatio = imgWidth / imgHeight;
        
        // Check panel state, calculate available space
        const leftPanel = document.getElementById('leftPanel');
        const rightPanel = document.getElementById('rightPanel');
        const leftHidden = leftPanel && leftPanel.classList.contains('hidden');
        const rightHidden = rightPanel && rightPanel.classList.contains('hidden');
        
        // Calculate available width - reserve space for progress module
        let availableWidth = window.innerWidth;
        if (!leftHidden) availableWidth -= 350;  // Left panel width
        if (!rightHidden) availableWidth -= 350; // Right panel width
        
        // Reserve space for show buttons
        if (leftHidden) availableWidth -= 60;  // Left show button space
        if (rightHidden) availableWidth -= 60; // Right show button space
        
        // Reserve space for progress module (left and right 40px margins)
        availableWidth -= 80;
        
        // Calculate container width, ensure coordination with progress module
        const containerWidth = Math.min(1200, availableWidth - 40);
        const containerHeight = containerWidth / videoAspectRatio;
        
        // Adjust max height based on panel state
        let maxHeight;
        if (leftHidden && rightHidden) {
            // When both panels are hidden, use a larger height
            maxHeight = window.innerHeight * 0.85;
        } else if (leftHidden || rightHidden) {
            // When one panel is hidden, use a medium height
            maxHeight = window.innerHeight * 0.8;
        } else {
            // When both panels are visible, use a smaller height
            maxHeight = window.innerHeight * 0.7;
        }
        
        let finalWidth = containerWidth;
        let finalHeight = containerHeight;
        
        if (containerHeight > maxHeight) {
            finalHeight = maxHeight;
            finalWidth = maxHeight * videoAspectRatio;
        }
        
        // Adjust Canvas size
        this.canvas.width = finalWidth;
        this.canvas.height = finalHeight;
        
        // Calculate correct scaling ratio
        this.scaleX = imgWidth / finalWidth;
        this.scaleY = imgHeight / finalHeight;
        this.offsetX = 0;
        this.offsetY = 0;
        
        // Record initialization
        this.canvasInitialized = true;
        this.lastVideoWidth = imgWidth;
        this.lastVideoHeight = imgHeight;
        
        // Update video container style to ensure black border follows Canvas size and is centered
        const videoContainer = this.canvas.closest('.video-container');
        if (videoContainer) {
            videoContainer.style.width = `${finalWidth}px`;
            videoContainer.style.height = `${finalHeight}px`;
            videoContainer.style.minWidth = `${finalWidth}px`;
            videoContainer.style.minHeight = `${finalHeight}px`;
            // Ensure container is centered
            videoContainer.style.margin = '10px auto';
            videoContainer.style.display = 'flex';
            videoContainer.style.alignItems = 'center';
            videoContainer.style.justifyContent = 'center';
        }
        
        // Adjust video controls width
        this.adjustVideoControlsWidth(finalWidth);
        
        console.log(`Canvas initialized: ${finalWidth}x${finalHeight}, Scale: ${this.scaleX.toFixed(3)}x${this.scaleY.toFixed(3)}, Available width: ${availableWidth}, Max height: ${maxHeight}`);
    }

    /**
     * Adjust video controls width
     */
    adjustVideoControlsWidth(canvasWidth) {
        const controlsContainer = document.querySelector('.canvas-controls-container');
        if (controlsContainer) {
            // Calculate available space, ensure appropriate distance from sides
            const availableWidth = window.innerWidth - 80; // Left and right 40px margins
            const targetWidth = Math.min(canvasWidth + 40, availableWidth);
            
            // Set minimum width to ensure usability
            const finalWidth = Math.max(targetWidth, 300);
            
            controlsContainer.style.width = `${finalWidth}px`;
            controlsContainer.style.margin = '20px auto';
            controlsContainer.style.maxWidth = `${availableWidth}px`;
            
            // Ensure appropriate margins on different screen sizes
            controlsContainer.style.boxSizing = 'border-box';
        }
    }

    /**
     * Record render time
     */
    recordRenderTime(renderTime) {
        this.renderPerformance.renderTimes.push(renderTime);
        if (this.renderPerformance.renderTimes.length > this.renderPerformance.maxRenderHistory) {
            this.renderPerformance.renderTimes.shift();
        }
        this.renderPerformance.lastRenderTime = renderTime;
        
        if (renderTime > 16) {
            console.warn(`Slow render detected: ${renderTime.toFixed(2)}ms`);
        }
    }

    /**
     * Get average render time
     */
    getAverageRenderTime() {
        if (this.renderPerformance.renderTimes.length === 0) return 0;
        const sum = this.renderPerformance.renderTimes.reduce((a, b) => a + b, 0);
        return sum / this.renderPerformance.renderTimes.length;
    }

    // ========================================
    // Progress display
    // ========================================

    /**
     * Update progress bar
     */
    updateProgressBar() {
        const videoInfo = this.viewer.videoPlayer.getVideoInfo();
        const currentFrame = this.viewer.videoPlayer.getCurrentFrame();
        
        if (!videoInfo) return;

        const progressBar = document.getElementById('progressBar');
        if (progressBar) {
            progressBar.max = videoInfo.totalFrames;
            progressBar.value = currentFrame;
        }
    }

    /**
     * Update time label
     */
    updateTimeLabel() {
        const videoInfo = this.viewer.videoPlayer.getVideoInfo();
        const currentFrame = this.viewer.videoPlayer.getCurrentFrame();
        
        if (!videoInfo) return;

        const currentTime = (currentFrame - 1) / videoInfo.fps;
        const totalTime = videoInfo.duration;
        
        const timeLabel = document.getElementById('timeLabel');
        if (timeLabel) {
            timeLabel.textContent = `${window.PPE_UTILS.formatTime(currentTime)} / ${window.PPE_UTILS.formatTime(totalTime)}`;
        }
    }

    /**
     * Update info label
     */
    updateInfoLabel(text, isAlert = false) {
        const infoLabel = document.getElementById('infoLabel');
        if (!infoLabel) return;

        infoLabel.textContent = text;
        infoLabel.className = isAlert ? 'alert' : '';
    }

    // ========================================
    // Progress modal
    // ========================================

    /**
     * Show progress modal
     */
    showProgressModal(title, details = '') {
        if (this.progressTitle) this.progressTitle.textContent = title;
        if (this.progressDetails) this.progressDetails.textContent = details;
        if (this.progressModal) this.progressModal.style.display = 'flex';
    }

    /**
     * Hide progress modal
     */
    hideProgressModal() {
        if (this.progressModal) this.progressModal.style.display = 'none';
    }

    /**
     * Update progress modal
     */
    updateProgressModal(percentage, text = '', details = '') {
        if (this.globalProgressFill) this.globalProgressFill.style.width = percentage + '%';
        if (this.globalProgressText) this.globalProgressText.textContent = text;
        if (this.progressDetails) this.progressDetails.textContent = details;
    }

    // ========================================
    // Upload progress
    // ========================================

    /**
     * Show upload progress
     */
    showUploadProgress(type, text = 'Uploading...') {
        const progressElement = type === 'video' ? this.videoUploadProgress : this.annotationsUploadProgress;
        if (progressElement) progressElement.style.display = 'block';
        
        this.updateUploadProgress(type, 0, text);
    }

    /**
     * Hide upload progress
     */
    hideUploadProgress(type) {
        const progressElement = type === 'video' ? this.videoUploadProgress : this.annotationsUploadProgress;
        if (progressElement) progressElement.style.display = 'none';
    }

    /**
     * Update upload progress
     */
    updateUploadProgress(type, percentage, text = '') {
        const progressFill = type === 'video' ? this.videoProgressFill : this.annotationsProgressFill;
        const progressText = type === 'video' ? this.videoProgressText : this.annotationsProgressText;
        
        if (progressFill) progressFill.style.width = percentage + '%';
        if (progressText) progressText.textContent = text;
    }

    // ========================================
    // Frame loading indicator
    // ========================================

    /**
     * Show frame loading indicator
     */
    showFrameLoadingIndicator() {
        // Disable frame loading indicator to avoid flickering
        // this.drawFrameLoadingOverlay();
    }

    /**
     * Hide frame loading indicator
     */
    hideFrameLoadingIndicator() {
        // Disable frame loading indicator to avoid flickering
        // this.clearFrameLoadingOverlay();
    }

    /**
     * Draw frame loading overlay
     */
    drawFrameLoadingOverlay() {
        // Create or get loading overlay
        let overlay = document.getElementById('frameLoadingOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'frameLoadingOverlay';
            overlay.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
                color: white;
                font-size: 16px;
            `;
            overlay.innerHTML = 'Loading frame...';
            this.canvas.parentElement.style.position = 'relative';
            this.canvas.parentElement.appendChild(overlay);
        }
        
        overlay.style.display = 'flex';
    }

    /**
     * Clear frame loading overlay
     */
    clearFrameLoadingOverlay() {
        const overlay = document.getElementById('frameLoadingOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    // ========================================
    // Other functions
    // ========================================

    /**
     * Load new JSON file
     */
    async loadNewJson() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    const text = await file.text();
                    const annotations = JSON.parse(text);
                    this.viewer.annotationRenderer.annotations = annotations;
                    this.viewer.annotationRenderer.updateAdherenceInfo();
                    await this.viewer.displayCurrentFrame();
                    console.log('New annotations loaded from file');
                } catch (error) {
                    console.error('Error loading JSON file:', error);
                    alert('Error loading JSON file: ' + error.message);
                }
            }
        };
        
        input.click();
    }

    /**
     * Handle window resize
     */
    async handleResize() {
        // Add a delay to ensure DOM updates are complete
        setTimeout(async () => {
            // Re-initialize Canvas size
            const videoInfo = this.viewer.videoPlayer.getVideoInfo();
            if (videoInfo && this.canvasInitialized) {
                this.canvasInitialized = false;
                // Force re-calculate Canvas size
                this.initializeCanvasSize(videoInfo.width, videoInfo.height);
                await this.viewer.displayCurrentFrame();
            }
        }, 100);
    }

    // ========================================
    // Getter methods
    // ========================================

    getCanvas() {
        return this.canvas;
    }

    getContext() {
        return this.ctx;
    }

    getScaleX() {
        return this.scaleX;
    }

    getScaleY() {
        return this.scaleY;
    }

    getOffsetX() {
        return this.offsetX;
    }

    getOffsetY() {
        return this.offsetY;
    }
}

// Export module
window.UI = UI; 