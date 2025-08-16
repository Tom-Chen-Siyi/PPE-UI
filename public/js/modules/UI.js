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

        // PPE Non Compliance Metrics toggle
        const nonComplianceMetricsToggle = document.getElementById('non-compliance-metrics');
        if (nonComplianceMetricsToggle) {
            // Set initial state to false (off)
            nonComplianceMetricsToggle.checked = false;
            nonComplianceMetricsToggle.addEventListener('change', async (e) => {
                // TODO: Implement PPE Non Compliance Metrics functionality
                console.log(`PPE Non Compliance Metrics ${e.target.checked ? 'enabled' : 'disabled'}`);
                // Placeholder for future implementation
                // This function will be implemented when the specific functionality is defined
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

        // Drag and drop events
        this.initializeDragAndDrop();

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
        const videoBrowseBtn = document.getElementById('videoBrowseBtn');
        const annotationBrowseBtn = document.getElementById('annotationBrowseBtn');

        if (videoUpload) {
            videoUpload.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    console.log('Video file selected:', file.name);
                    // Directly trigger video upload
                    this.viewer.fileManager.uploadVideo();
                }
            });
        }

        if (annotationsUpload) {
            annotationsUpload.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    console.log('Annotation file selected:', file.name);
                    // Directly trigger annotations upload
                    this.viewer.fileManager.uploadAnnotations();
                }
            });
        }

        // Browse button event listeners
        if (videoBrowseBtn && videoUpload) {
            videoBrowseBtn.addEventListener('click', () => {
                videoUpload.click();
            });
        }

        if (annotationBrowseBtn && annotationsUpload) {
            annotationBrowseBtn.addEventListener('click', () => {
                annotationsUpload.click();
            });
        }
    }

    /**
     * Initialize button listeners
     */
    initializeButtonListeners() {
        // File management buttons
        const refreshBtn = document.getElementById('refreshFilesBtn');
        const generateFramesBtn = document.getElementById('generateFramesBtn');
        
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.viewer.fileManager.loadFileList());
        }
        
        if (generateFramesBtn) {
            generateFramesBtn.addEventListener('click', () => this.viewer.fileManager.generateFramesForSelected());
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

    /**
     * Initialize drag and drop functionality
     */
    initializeDragAndDrop() {
        console.log('Initializing drag and drop...');
        
        // Video upload drag and drop
        const videoDragZone = document.querySelector('.drag-drop-zone[data-type="video"]');
        const videoUpload = document.getElementById('videoUpload');
        
        if (videoDragZone && videoUpload) {
            console.log('Setting up video drag and drop');
            this.setupDragAndDrop(videoDragZone, videoUpload, 'video');
        } else {
            console.warn('Video drag zone or upload input not found');
        }

        // Annotations upload drag and drop
        const annotationsDragZone = document.querySelector('.drag-drop-zone[data-type="annotations"]');
        const annotationsUpload = document.getElementById('annotationsUpload');
        
        if (annotationsDragZone && annotationsUpload) {
            console.log('Setting up annotations drag and drop');
            this.setupDragAndDrop(annotationsDragZone, annotationsUpload, 'annotations');
        } else {
            console.warn('Annotations drag zone or upload input not found');
        }
    }

    /**
     * Setup drag and drop for a specific zone
     */
    setupDragAndDrop(dragZone, fileInput, type) {
        // Prevent default drag behaviors
        dragZone.addEventListener('dragenter', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });

        dragZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dragZone.classList.add('dragover');
        });

        dragZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Only remove dragover class if we're leaving the zone entirely
            if (!dragZone.contains(e.relatedTarget)) {
                dragZone.classList.remove('dragover');
            }
        });

        dragZone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dragZone.classList.remove('dragover');
            
            console.log('File dropped on', type, 'zone');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const file = files[0];
                console.log('Dropped file:', file.name, 'Type:', file.type);
                
                // Check file type
                if (type === 'video' && this.isVideoFile(file.name)) {
                    console.log('Valid video file dropped, starting upload...');
                    fileInput.files = files;
                    fileInput.dispatchEvent(new Event('change'));
                } else if (type === 'annotations' && this.isAnnotationFile(file.name)) {
                    console.log('Valid annotation file dropped, starting upload...');
                    fileInput.files = files;
                    fileInput.dispatchEvent(new Event('change'));
                } else {
                    console.warn('Invalid file type dropped');
                    alert(`Please select a valid ${type === 'video' ? 'video' : 'annotation'} file`);
                }
            }
        });
    }

    /**
     * Check if file is a video file
     */
    isVideoFile(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const videoExtensions = ['mp4', 'avi', 'mov', 'mkv', 'wmv', 'flv'];
        const isValid = videoExtensions.includes(ext);
        console.log('Video file check:', filename, 'Extension:', ext, 'Valid:', isValid);
        return isValid;
    }

    /**
     * Check if file is an annotation file
     */
    isAnnotationFile(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const isValid = ext === 'json';
        console.log('Annotation file check:', filename, 'Extension:', ext, 'Valid:', isValid);
        return isValid;
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
            
            // Update PPE compliance overview
            this.updatePPEComplianceOverview();
            
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
        
        // Update PPE compliance overview
        this.updatePPEComplianceOverview();
        
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
                    detailsHTML += `<div class="member-compliance-section">`;
                    detailsHTML += `<div class="member-title">Member ID: ${person.id}</div>`;
                    detailsHTML += `<div class="ppe-status-grid">`;
                    
                    // Create status cards only for non-compliant PPE types
                    const ppeStatus = this.getPPEStatusForPerson(person);
                    
                    // Only add cards for non-compliant items
                    if (ppeStatus.mask.status !== 'compliant') {
                        detailsHTML += this.createPPEStatusCard('mask', ppeStatus.mask, 'icon/mask.png');
                    }
                    
                    if (ppeStatus.gloves.status !== 'compliant') {
                        detailsHTML += this.createPPEStatusCard('gloves', ppeStatus.gloves, 'icon/gloves.png');
                    }
                    
                    if (ppeStatus.gown.status !== 'compliant') {
                        detailsHTML += this.createPPEStatusCard('gown', ppeStatus.gown, 'icon/gown.png');
                    }
                    
                    if (ppeStatus.eyewear.status !== 'compliant') {
                        detailsHTML += this.createPPEStatusCard('eyewear', ppeStatus.eyewear, 'icon/eyewear.png');
                    }
                    
                    detailsHTML += `</div>`;
                    detailsHTML += `</div>`;
                } 
            });
            
            ppeDetailsDisplay.innerHTML = detailsHTML;
        }
    }

    /**
     * Get PPE status for a specific person
     */
    getPPEStatusForPerson(person) {
        const status = {
            mask: { status: 'compliant', text: 'Mask Proper' },
            gloves: { status: 'compliant', text: 'Gloves Proper' },
            gown: { status: 'compliant', text: 'Gown Proper' },
            eyewear: { status: 'compliant', text: 'Eyewear Proper' }
        };
        
        if (person.classTypes) {
            person.classTypes.forEach(classType => {
                switch (classType) {
                    // Mask classifications
                    case 'ma':
                        status.mask = { status: 'absent', text: 'Mask Absent' };
                        break;
                    case 'mi':
                        status.mask = { status: 'incomplete', text: 'Mask Incomplete' };
                        break;
                    
                    // Gown classifications
                    case 'ga':
                        status.gown = { status: 'absent', text: 'Gown Absent' };
                        break;
                    case 'gi':
                        status.gown = { status: 'incomplete', text: 'Gown Incomplete' };
                        break;
                    
                    // Eyewear classifications
                    case 'ea':
                        status.eyewear = { status: 'absent', text: 'Eyewear Absent' };
                        break;
                    case 'ei':
                        status.eyewear = { status: 'incomplete', text: 'Eyewear Incomplete' };
                        break;
                    // Gloves classifications
                    case 'ha':
                        status.gloves = { status: 'absent', text: 'Glove Absent' };
                        break;
                }
            });
        }
        
        return status;
    }

    /**
     * Create PPE status card
     */
    createPPEStatusCard(ppeType, status, iconPath) {
        let backgroundColor, textColor;
        
        switch (status.status) {
            case 'absent':
                backgroundColor = '#C93D3D'; // Red
                textColor = 'white';
                break;
            case 'incomplete':
                backgroundColor = '#E1A61E'; // Yellow
                textColor = 'white';
                break;
            case 'compliant':
                backgroundColor = '#28a745'; // Green
                textColor = 'white';
                break;
            default:
                backgroundColor = '#6c757d'; // Gray
                textColor = 'white';
        }
        
        return `
            <div class="ppe-status-card" style="background-color: ${backgroundColor}; color: ${textColor};">
                <div class="ppe-status-icon">
                    <img src="${iconPath}" alt="${ppeType}" class="ppe-status-icon-img">
                </div>
                <div class="ppe-status-text">${status.text}</div>
            </div>
        `;
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
        
        // 更新当前时间显示
        const currentTimeElement = document.getElementById('currentTime');
        if (currentTimeElement) {
            currentTimeElement.textContent = window.PPE_UTILS.formatTime(currentTime);
        }
        
        // 更新总时间显示
        const totalTimeElement = document.getElementById('totalTime');
        if (totalTimeElement) {
            totalTimeElement.textContent = window.PPE_UTILS.formatTime(totalTime);
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
            
            // Force re-calculate control bar width
            this.updateControlBarWidth();
        }, 100);
    }

    /**
     * Update control bar width based on panel state
     */
    updateControlBarWidth() {
        const canvasControlsContainer = document.getElementById('canvasControlsContainer');
        const centerPanel = document.querySelector('.center-panel');
        
        if (canvasControlsContainer && centerPanel) {
            // Force a reflow to ensure CSS calculations are applied
            canvasControlsContainer.style.width = canvasControlsContainer.offsetWidth + 'px';
            setTimeout(() => {
                canvasControlsContainer.style.width = '';
            }, 10);
        }
    }

    /**
     * Update PPE compliance overview
     */
    calculatePPECompliance(boxes) {
        const compliance = {
            mask: { total: 0, compliant: 0, absent: 0, incomplete: 0 },
            gloves: { total: 0, compliant: 0, absent: 0 },
            eyewear: { total: 0, compliant: 0, absent: 0, incomplete: 0 },
            gown: { total: 0, compliant: 0, absent: 0, incomplete: 0 }
        };
        
        boxes.forEach(box => {
            // Count masks
            compliance.mask.total++;
            if (box.classTypes) {
                if (box.classTypes.includes('nc')) {
                    compliance.mask.compliant++;
                } else if (box.classTypes.includes('ma')) {
                    compliance.mask.absent++;
                } else if (box.classTypes.includes('mi')) {
                    compliance.mask.incomplete++;
                } else {
                    compliance.mask.compliant++; // Default to compliant if no mask issues detected
                }
            } else {
                compliance.mask.compliant++; // Default to compliant if no classTypes
            }
            
            // Count gloves
            compliance.gloves.total++;
            if (box.classTypes) {
                if (box.classTypes.includes('hc')) {
                    compliance.gloves.compliant++;
                } else if (box.classTypes.includes('ha')) {
                    compliance.gloves.absent++;
                } else {
                    compliance.gloves.compliant++; // Default to compliant if no glove issues detected
                }
            } else {
                compliance.gloves.compliant++; // Default to compliant if no classTypes
            }
            
            // Count eyewear
            compliance.eyewear.total++;
            if (box.classTypes) {
                if (box.classTypes.includes('gg') || box.classTypes.includes('pr')) {
                    compliance.eyewear.compliant++;
                } else if (box.classTypes.includes('ea')) {
                    compliance.eyewear.absent++;
                } else if (box.classTypes.includes('ei')) {
                    compliance.eyewear.incomplete++;
                } else {
                    compliance.eyewear.compliant++; // Default to compliant if no eyewear issues detected
                }
            } else {
                compliance.eyewear.compliant++; // Default to compliant if no classTypes
            }
            
            // Count gowns
            compliance.gown.total++;
            if (box.classTypes) {
                if (box.classTypes.includes('gc')) {
                    compliance.gown.compliant++;
                } else if (box.classTypes.includes('ga')) {
                    compliance.gown.absent++;
                } else if (box.classTypes.includes('gi')) {
                    compliance.gown.incomplete++;
                } else {
                    compliance.gown.compliant++; // Default to compliant if no gown issues detected
                }
            } else {
                compliance.gown.compliant++; // Default to compliant if no classTypes
            }
        });
        
        return compliance;
    }


    /**
     * Update PPE compliance overview
     */
    updatePPEComplianceOverview() {
        const boxes = this.viewer.annotationRenderer.getCurrentFrameAnnotations();
        const compliance = this.calculatePPECompliance(boxes);
        
        // Update display using the new compliance calculation
        this.updateOverviewCard('maskCard', compliance.mask.compliant, compliance.mask.total);
        this.updateOverviewCard('glovesCard', compliance.gloves.compliant, compliance.gloves.total);
        this.updateOverviewCard('eyewearCard', compliance.eyewear.compliant, compliance.eyewear.total);
        this.updateOverviewCard('gownCard', compliance.gown.compliant, compliance.gown.total);
    }

    /**
     * Update individual overview card
     */
    updateOverviewCard(cardId, compliant, total) {
        const card = document.getElementById(cardId);
        const countElement = document.getElementById(cardId.replace('Card', 'Compliant'));
        
        if (card && countElement) {
            countElement.textContent = `${compliant}/${total}`;
            
            // Remove dynamic background setting to prevent color changes
            // The background color is now controlled by CSS only
        }
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