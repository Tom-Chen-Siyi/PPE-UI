// ========================================
// Annotation Renderer Module
// ========================================

class AnnotationRenderer {
    constructor(viewer) {
        this.viewer = viewer;
        this.annotations = {};
        this.selectedBox = null;
        this.alertEnabled = false;
        this.showAllBoxesEnabled = false;
        this.activeAlertBox = null;
        this.debugMode = false;
        
        // Preload icons
        this.iconImages = {};
        // Note: loadIcons() now returns Promise, needs to be awaited during initialization
        this.iconsLoaded = false;
        
        // Exclamation icon click state management
        this.clickedExclamationIcons = new Set();
        
        // Start loading icons immediately
        this.loadIcons().then(() => {
            console.log('✅ Icons loaded in constructor');
        }).catch((error) => {
            console.error('❌ Failed to load icons in constructor:', error);
        });
    }

    // ========================================
    // Icon Management
    // ========================================

    /**
     * Load icons
     */
    loadIcons() {
        console.log('Starting to load icons...');
        const iconPromises = [];
        
        for (const [key, path] of Object.entries(window.PPE_CONFIG.ICON_PATHS)) {
            console.log(`Loading icon: ${key} from ${path}`);
            const img = new Image();
            const promise = new Promise((resolve, reject) => {
                img.onload = () => {
                    this.iconImages[key] = img;
                    console.log(`✅ Icon loaded: ${key}`);
                    resolve();
                };
                img.onerror = () => {
                    console.warn(`❌ Failed to load icon: ${path}`);
                    reject(new Error(`Failed to load icon: ${path}`));
                };
            });
            
            img.src = path;
            iconPromises.push(promise);
        }
        
        // Wait for all icons to load
        return Promise.all(iconPromises).then(() => {
            this.iconsLoaded = true;
            console.log('✅ All icons loaded successfully');
            console.log('Available icons:', Object.keys(this.iconImages));
            return true;
        }).catch((error) => {
            console.error('❌ Icon loading failed:', error);
            return false;
        });
    }

    /**
     * Reload icons
     */
    async reloadIcons() {
        console.log('🔄 Reloading icons...');
        this.iconsLoaded = false;
        this.iconImages = {};
        return await this.loadIcons();
    }

    // ========================================
    // Annotation Data Management
    // ========================================

    /**
     * Load annotation data
     */
    async loadAnnotations(filename) {
        try {
            const response = await fetch(`/api/annotations/${encodeURIComponent(filename)}`);
            if (!response.ok) {
                throw new Error('Failed to load annotations');
            }
            
            this.annotations = await response.json();
            this.viewer.updateAdherenceInfo();
            
            console.log('Annotations loaded:', Object.keys(this.annotations).length, 'frames');
            return this.annotations;
        } catch (error) {
            console.error('Error loading annotations:', error);
            throw error;
        }
    }

    /**
     * Get annotations for the current frame
     * Handle the mismatch between JSON frame rate and video frame rate
     * JSON: 2 frames per annotation box state (15 per second)
     * Video: 30 frames per second
     */
    getCurrentFrameAnnotations() {
        const currentVideoFrame = this.viewer.videoPlayer.getCurrentFrame();
        
        const jsonFrameNumber = Math.floor((currentVideoFrame - 1) / 2) + 1;
        const frameKey = jsonFrameNumber.toString().padStart(5, '0');
        
        console.log(`Video frame: ${currentVideoFrame}, JSON frame: ${jsonFrameNumber}, Frame key: ${frameKey}`);
        
        const frameData = this.annotations[frameKey];
        
        if (!frameData || !frameData.objects) {
            console.log('No frame data or objects found for JSON frame:', jsonFrameNumber);
            return [];
        }
        
        console.log('Processing', frameData.objects.length, 'objects for JSON frame:', jsonFrameNumber);
        
        return frameData.objects.map(obj => {
            console.log('Processing object:', obj);
            
            const bbox = obj.bbox;
            const attrs = obj.attributes;
            
            // Calculate the width and height of the bounding box
            const w = bbox.xmax - bbox.xmin;
            const h = bbox.ymax - bbox.ymin;
            
            // Determine all non-compliance types
            let classTypes = [];
            
            // Check various PPE states
            if (attrs.gown === 'GA') classTypes.push('ga'); // Gown Absent
            if (attrs.gown === 'GI') classTypes.push('gi'); // Gown Improper
            if (attrs.mask === 'MA') classTypes.push('ma'); // Mask Absent
            if (attrs.mask === 'MI') classTypes.push('mi'); // Mask Improper
            if (attrs.mask === 'RC') classTypes.push('rc'); // Mask Removed
            if (attrs.eyewear === 'EA') classTypes.push('ea'); // Eyewear Absent
            if (attrs.gloves_left === 'HA' || attrs.gloves_right === 'HA') classTypes.push('ha'); // Gloves Absent
            
            // Use the first type as the primary type (for compatibility)
            const classType = classTypes.length > 0 ? classTypes[0] : null;
            
            const result = {
                x: bbox.xmin,
                y: bbox.ymin,
                w: w,
                h: h,
                class: classType,
                classTypes: classTypes, // Add all non-compliance types
                id: obj.id,
                attributes: attrs
            };
            
            console.log('Converted object:', result);
            return result;
        });
    }

    // ========================================
    // Rendering Functions
    // ========================================

    /**
     * Draw annotations
     */
    async drawAnnotations() {
        // Clear exclamation icon list
        this.exclamationIcons = [];
        
        // Draw all boxes (if enabled)
        if (this.showAllBoxesEnabled) {
            this.drawAllBoxes();
        }
        // Draw alerts (if enabled)
        else if (this.alertEnabled) {
            await this.drawAlerts();
        }
        
        // Note: Selected boxes are now drawn in drawAlerts, avoiding icon overlap
    }

    /**
     * Clear exclamation icon click states
     */
    clearExclamationIconStates() {
        this.clickedExclamationIcons.clear();
    }

    /**
     * Draw all bounding boxes
     */
    drawAllBoxes() {
        if (!this.showAllBoxesEnabled) return;

        const boxes = this.getCurrentFrameAnnotations();
        
        boxes.forEach(bbox => {
            const color = this.getBoxColor(bbox.class);
            this.drawBoundingBox(bbox, color, true);
        });
    }

    /**
     * Draw alerts
     */
    async drawAlerts() {
        if (!this.alertEnabled) {
            console.log('Alert mode is disabled');
            return;
        }

        const boxes = this.getCurrentFrameAnnotations();
        console.log('Drawing alerts for', boxes.length, 'boxes');
        
        // If no data, return directly
        if (boxes.length === 0) {
            console.log('No boxes found, nothing to draw');
            return;
        }
        
        // Use Promise.all to wait for all icons to be drawn
        const iconPromises = boxes.map(async bbox => {
            const nonadherenceTexts = this.getNonadherenceTexts(bbox);
            console.log('Box ID:', bbox.id, 'Class:', bbox.class, 'ClassTypes:', bbox.classTypes, 'Nonadherence texts:', nonadherenceTexts);
            
            if (nonadherenceTexts.length > 0) {
                console.log('Drawing exclamation icon for box ID:', bbox.id);
                
                // Check if clicked, if so draw red box, otherwise draw blue box
                const iconKey = `${bbox.id}-${bbox.class}`;
                const isClicked = this.clickedExclamationIcons.has(iconKey);
                
                if (isClicked) {
                    // Draw red box (clicked box)
                    this.drawSelectedBoundingBoxForPerson(bbox);
                } else {
                // Draw bounding box (using red)
                this.drawBoundingBox(bbox, [255, 0, 0], false);
                }
                
                // Draw exclamation icon
                await this.drawExclamationIcon(bbox, nonadherenceTexts);
            }
        });
        
        await Promise.all(iconPromises);
    }

    /**
     * Draw selected bounding box
     */
    drawSelectedBoundingBox() {
        // Draw green bounding boxes for all clicked persons
        this.drawSelectedPersonBox();
    }

    /**
     * Draw a single bounding box
     */
    drawBoundingBox(bbox, color, showAll = false, texts = []) {
        const x = bbox.x / this.viewer.scaleX + this.viewer.offsetX;
        const y = bbox.y / this.viewer.scaleY + this.viewer.offsetY;
        const w = bbox.w / this.viewer.scaleX;
        const h = bbox.h / this.viewer.scaleY;

        this.viewer.ctx.strokeStyle = 'rgb(59, 249, 252)';
        this.viewer.ctx.lineWidth = 2;
        this.viewer.ctx.strokeRect(x, y, w, h);

        // // Draw text
        // if (texts.length > 0) {
        //     this.viewer.ctx.fillStyle = 'rgb(59, 249, 252)';
        //     this.viewer.ctx.font = '12px Arial';
        //     this.viewer.ctx.textAlign = 'center';
            
        //     texts.forEach((text, index) => {
        //         const textY = y - 10 - (texts.length - 1 - index) * 15;
        //         this.viewer.ctx.fillText(text, x + w / 2, textY);
        //     });
        // }

        // // Show all information (if enabled)
        // if (showAll && bbox.class) {
        //     this.viewer.ctx.fillStyle = 'rgb(59, 249, 252)';
        //     this.viewer.ctx.font = '10px Arial';
        //     this.viewer.ctx.textAlign = 'left';
            
        //     const infoText = `${bbox.class} (${Math.round(bbox * 100)}%)`;
        //     this.viewer.ctx.fillText(infoText, x, y - 5);
        // }
    }

    /**
     * Draw exclamation icon
     */
    async drawExclamationIcon(bbox, nonadherenceTexts) {
        console.log('drawExclamationIcon called for box ID:', bbox.id);
        console.log('Icons loaded:', this.iconsLoaded);
        console.log('Alert icon available:', !!this.iconImages['alert']);
        
        // If icons are not loaded, try to reload
        if (!this.iconsLoaded || !this.iconImages['alert']) {
            console.warn('Icons not loaded or alert icon not available, attempting to reload...');
            try {
                await this.reloadIcons();
                console.log('Icons reloaded successfully');
            } catch (error) {
                console.error('Failed to reload icons:', error);
                return;
            }
        }
        
        // Check again if icons are available
        if (!this.iconImages['alert']) {
            console.error('Alert icon still not available after reload');
            return;
        }

        const x = bbox.x / this.viewer.scaleX + this.viewer.offsetX;
        const y = bbox.y / this.viewer.scaleY + this.viewer.offsetY;
        const w = bbox.w / this.viewer.scaleX;
        const h = bbox.h / this.viewer.scaleY;

        // Get canvas boundaries
        const canvasWidth = this.viewer.canvas.width;
        const canvasHeight = this.viewer.canvas.height;

        // Draw exclamation icon in the top-left corner of the bounding box
        const iconSize = 28;
        let iconX = x - iconSize / 2;
        let iconY = y - iconSize / 2;
        
        // Boundary check: ensure exclamation icon is within canvas
        if (iconX < 0) iconX = 0;
        if (iconY < 0) iconY = 0;
        if (iconX + iconSize > canvasWidth) iconX = canvasWidth - iconSize;
        if (iconY + iconSize > canvasHeight) iconY = canvasHeight - iconSize;
        
        console.log('Drawing exclamation icon at:', iconX, iconY, 'for box at:', x, y);
        
        // Check if clicked (to control PPE icon display/hide)
        const iconKey = `${bbox.id}-${bbox.class}`;
        const isClicked = this.clickedExclamationIcons.has(iconKey);
        
        // Draw exclamation icon
        this.viewer.ctx.drawImage(this.iconImages['alert'], iconX, iconY, iconSize, iconSize);
        console.log('Exclamation icon drawn successfully');
        
        // If clicked and there are non-compliance types, draw corresponding PPE icons on the right of the exclamation mark
        if (isClicked && bbox.classTypes && bbox.classTypes.length > 0) {
            const ppeIconSize = 28; // Larger icon
            let currentX = iconX + iconSize + 10; // Start on the right of the exclamation mark
            let ppeIconY = iconY; // Align with exclamation mark
            
            // Boundary check: ensure PPE icons are within canvas
            if (currentX + ppeIconSize > canvasWidth) {
                // If not enough space on the right, try to put it on the left
                currentX = iconX - ppeIconSize - 10;
                if (currentX < 0) {
                    // If not enough space on the left, put it inside the box
                    currentX = x + 5;
                    ppeIconY = y + 5;
                }
            }
            
            // Draw all non-compliant PPE icons
            bbox.classTypes.forEach(classType => {
                if (this.iconImages[classType]) {
                    // Check if current icon would exceed boundaries
                    if (currentX + ppeIconSize <= canvasWidth && currentX >= 0 && 
                        ppeIconY + ppeIconSize <= canvasHeight && ppeIconY >= 0) {
                        
                    // Draw red circular background
                    const circleRadius = ppeIconSize / 2 + 8; // Slightly larger than icon
                    const circleCenterX = currentX + ppeIconSize / 2;
                    const circleCenterY = ppeIconY + ppeIconSize / 2;
                    
                    this.viewer.ctx.fillStyle = 'rgb(237,67,70)'; // Red circular background
                    this.viewer.ctx.beginPath();
                    this.viewer.ctx.arc(circleCenterX, circleCenterY, circleRadius, 0, 2 * Math.PI);
                    this.viewer.ctx.fill();
                    
                    // Draw PPE icon
                    this.viewer.ctx.drawImage(this.iconImages[classType], currentX, ppeIconY, ppeIconSize, ppeIconSize);
                    
                    currentX += ppeIconSize + 25; // Move to the next icon position, increase spacing
                    } else {
                        // If not enough space, try to wrap or adjust position
                        currentX = x + 5;
                        ppeIconY = y + h - ppeIconSize - 5;
                        
                        if (ppeIconY >= 0 && currentX + ppeIconSize <= canvasWidth) {
                            // Draw red circular background
                            const circleRadius = ppeIconSize / 2 + 8;
                            const circleCenterX = currentX + ppeIconSize / 2;
                            const circleCenterY = ppeIconY + ppeIconSize / 2;
                            
                            this.viewer.ctx.fillStyle = 'rgb(237,67,70)';
                            this.viewer.ctx.beginPath();
                            this.viewer.ctx.arc(circleCenterX, circleCenterY, circleRadius, 0, 2 * Math.PI);
                            this.viewer.ctx.fill();
                            
                            // Draw PPE icon
                            this.viewer.ctx.drawImage(this.iconImages[classType], currentX, ppeIconY, ppeIconSize, ppeIconSize);
                            
                            currentX += ppeIconSize + 25;
                        }
                    }
                }
            });
        }
        
        // Store exclamation icon position information for click detection
        if (!this.exclamationIcons) {
            this.exclamationIcons = [];
        }
        
        this.exclamationIcons.push({
            x: iconX,
            y: iconY,
            size: iconSize,
            bbox: bbox,
            texts: nonadherenceTexts,
            iconKey: iconKey
        });
        
        console.log('Exclamation icon added to tracking list');
    }

    /**
     * Draw the red bounding box for the currently selected person
     */
    drawSelectedPersonBox() {
        // Draw bounding boxes for all clicked persons
        const boxes = this.getCurrentFrameAnnotations();
        
        this.clickedExclamationIcons.forEach(iconKey => {
            const [personId, personClass] = iconKey.split('-');
            const selectedPerson = boxes.find(bbox => bbox.id === personId);
        
        if (selectedPerson) {
                this.drawSelectedBoundingBoxForPerson(selectedPerson);
            }
        });
    }

    /**
     * Draw a red bounding box for a single person
     */
    drawSelectedBoundingBoxForPerson(selectedPerson) {
        // Draw red bounding box
            const x = selectedPerson.x / this.viewer.scaleX + this.viewer.offsetX;
            const y = selectedPerson.y / this.viewer.scaleY + this.viewer.offsetY;
            const w = selectedPerson.w / this.viewer.scaleX;
            const h = selectedPerson.h / this.viewer.scaleY;
            
        // Set red style #ED4346
        this.viewer.ctx.strokeStyle = 'rgb(237,67,70)';
            this.viewer.ctx.lineWidth = 3;
            this.viewer.ctx.strokeRect(x, y, w, h);
            this.viewer.ctx.setLineDash([]); // Reset dash
            
        // Draw ID label (bottom-right)
            this.drawIdLabel(x, y, w, h, selectedPerson.id);
    }
    
    /**
     * Draw ID label
     */
    drawIdLabel(x, y, w, h, id) {
        const labelText = `ID: ${id}`;
        const labelPadding = 6;
        const labelHeight = 20;
        const labelWidth = 60;
        
        // Get canvas boundaries
        const canvasWidth = this.viewer.canvas.width;
        const canvasHeight = this.viewer.canvas.height;
        
        // Calculate label position (bottom-right of the box)
        let labelX = x + w - labelWidth;
        let labelY = y + h + 5;
        
        // Boundary check: ensure ID label is within canvas
        if (labelX < 0) labelX = 0;
        if (labelY < 0) labelY = 0;
        if (labelX + labelWidth > canvasWidth) labelX = canvasWidth - labelWidth;
        if (labelY + labelHeight > canvasHeight) labelY = canvasHeight - labelHeight;
        
        // Draw label background
        this.viewer.ctx.fillStyle = '#ED4346';
        this.viewer.ctx.fillRect(labelX, labelY, labelWidth, labelHeight);
        
        // Draw label text
        this.viewer.ctx.fillStyle = 'white';
        this.viewer.ctx.font = '12px Arial';
        this.viewer.ctx.textAlign = 'left';
        this.viewer.ctx.fillText(labelText, labelX + labelPadding, labelY + 14);
    }

    // ========================================
    // Utility Methods
    // ========================================

    /**
     * Get box color
     */
    getBoxColor(classList) {
        const colors = {
            gi: [255, 165, 0],  // Orange - Gown Improper
            ga: [255, 0, 0],    // Red - Gown Absent
            rc: [255, 255, 0],  // Yellow - Mask Removed
            mi: [255, 165, 0],  // Orange - Mask Improper
            ma: [255, 0, 0],    // Red - Mask Absent
            ha: [255, 0, 0],    // Red - Gloves Absent
            ea: [255, 0, 0]     // Red - Eyewear Absent
        };
        
        return colors[classList] || [255, 255, 255]; // Default white
    }

    /**
     * Get non-compliance texts
     */
    getNonadherenceTexts(bbox) {
        const texts = [];
        
        // Check classTypes (new data structure)
        if (bbox.classTypes && bbox.classTypes.length > 0) {
            bbox.classTypes.forEach(classType => {
                switch (classType) {
                    case 'gi':
                        texts.push('Gown Improper');
                        break;
                    case 'ga':
                        texts.push('Gown Absent');
                        break;
                    case 'rc':
                        texts.push('Mask Removed');
                        break;
                    case 'mi':
                        texts.push('Mask Improper');
                        break;
                    case 'ma':
                        texts.push('Mask Absent');
                        break;
                    case 'ha':
                        texts.push('Gloves Absent');
                        break;
                    case 'ea':
                        texts.push('Eyewear Absent');
                        break;
                }
            });
        }
        // Compatible with old data structure (only check class)
        else if (bbox.class) {
            if (bbox.class === 'gi') texts.push('Gown Improper');
            if (bbox.class === 'ga') texts.push('Gown Absent');
            if (bbox.class === 'rc') texts.push('Mask Removed');
            if (bbox.class === 'mi') texts.push('Mask Improper');
            if (bbox.class === 'ma') texts.push('Mask Absent');
            if (bbox.class === 'ha') texts.push('Gloves Absent');
            if (bbox.class === 'ea') texts.push('Eyewear Absent');
        }
        
        return texts;
    }

    /**
     * Get detailed PPE non-compliance information
     */
    getDetailedPPEInfo(bbox) {
        const info = [];
        
        if (bbox.classTypes) {
            bbox.classTypes.forEach(classType => {
                switch (classType) {
                    case 'ga':
                        info.push('Gown Absent - Missing protective gown');
                        break;
                    case 'gi':
                        info.push('Gown Improper - Incorrectly worn protective gown');
                        break;
                    case 'ma':
                        info.push('Mask Absent - Missing face mask');
                        break;
                    case 'mi':
                        info.push('Mask Improper - Incorrectly worn face mask');
                        break;
                    case 'rc':
                        info.push('Mask Removed - Face mask has been removed');
                        break;
                    case 'ea':
                        info.push('Eyewear Absent - Missing protective eyewear');
                        break;
                    case 'ha':
                        info.push('Gloves Absent - Missing protective gloves');
                        break;
                }
            });
        }
        
        return info;
    }

    /**
     * Get the closest bounding box
     */
    getClosestBox(x, y) {
        const boxes = this.getCurrentFrameAnnotations();
        let closestBox = null;
        let minDistance = Infinity;

        boxes.forEach(bbox => {
            const boxX = bbox.x / this.viewer.scaleX + this.viewer.offsetX;
            const boxY = bbox.y / this.viewer.scaleY + this.viewer.offsetY;
            const boxW = bbox.w / this.viewer.scaleX;
            const boxH = bbox.h / this.viewer.scaleY;

            // Check if click is within the box
            if (x >= boxX && x <= boxX + boxW && y >= boxY && y <= boxY + boxH) {
                const centerX = boxX + boxW / 2;
                const centerY = boxY + boxH / 2;
                const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);

                if (distance < minDistance) {
                    minDistance = distance;
                    closestBox = bbox;
                }
            }
        });

        return closestBox;
    }

    /**
     * Get person information by ID from the current frame
     */
    getPersonById(personId) {
        const boxes = this.getCurrentFrameAnnotations();
        return boxes.find(bbox => bbox.id === personId);
    }

    /**
     * Detect exclamation icon click
     */
    checkExclamationIconClick(x, y) {
        if (!this.exclamationIcons) return null;

        for (const icon of this.exclamationIcons) {
            const iconCenterX = icon.x + icon.size / 2;
            const iconCenterY = icon.y + icon.size / 2;
            const distance = Math.sqrt((x - iconCenterX) ** 2 + (y - iconCenterY) ** 2);
            
            if (distance <= icon.size / 2) {
                return icon;
            }
        }
        
        return null;
    }

    /**
     * Update adherence info
     */
    updateAdherenceInfo() {
        const boxes = this.getCurrentFrameAnnotations();
        let totalBoxes = 0;
        let nonadherenceCount = 0;

        boxes.forEach(bbox => {
            totalBoxes++;
            const nonadherenceTexts = this.getNonadherenceTexts(bbox);
            if (nonadherenceTexts.length > 0) {
                nonadherenceCount++;
            }
        });

        if (totalBoxes > 0) {
            const adherenceRate = ((totalBoxes - nonadherenceCount) / totalBoxes * 100).toFixed(1);
            this.viewer.updateInfoLabel(`Compliance Rate: ${adherenceRate}% (${totalBoxes - nonadherenceCount}/${totalBoxes})`, nonadherenceCount > 0);
            
            // Also update the compliance rate display in the detailed info area
            const complianceRateDisplay = document.getElementById('complianceRateDisplay');
            if (complianceRateDisplay) {
                complianceRateDisplay.textContent = `${adherenceRate}% (${totalBoxes - nonadherenceCount}/${totalBoxes})`;
            }
            
            // Update PPE compliance overview
            if (this.viewer.ui) {
                this.viewer.ui.updatePPEComplianceOverview();
            }
        } else {
            this.viewer.updateInfoLabel('No PPE detected in this frame');
            
            // Also update the compliance rate display in the detailed info area
            const complianceRateDisplay = document.getElementById('complianceRateDisplay');
            if (complianceRateDisplay) {
                complianceRateDisplay.textContent = 'No data available';
            }
            
            // Update PPE compliance overview
            if (this.viewer.ui) {
                this.viewer.ui.updatePPEComplianceOverview();
            }
        }
    }

    /**
     * Get total number of boxes
     */
    getTotalBoxes() {
        const boxes = this.getCurrentFrameAnnotations();
        return boxes.length;
    }

    // ========================================
    // State Management
    // ========================================

    /**
     * Toggle alert display
     */
    toggleAlert() {
        this.alertEnabled = !this.alertEnabled;
        this.showAllBoxesEnabled = false;
        
        // Update checkbox state
        const alertToggle = document.getElementById('alertToggle');
        const showAllBoxesToggle = document.getElementById('showAllBoxesToggle');
        if (alertToggle) alertToggle.checked = this.alertEnabled;
        if (showAllBoxesToggle) showAllBoxesToggle.checked = this.showAllBoxesEnabled;
        
        console.log(`Alert mode ${this.alertEnabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Toggle show all boxes
     */
    toggleShowAllBoxes() {
        this.showAllBoxesEnabled = !this.showAllBoxesEnabled;
        this.alertEnabled = false;
        
        // Update checkbox state
        const alertToggle = document.getElementById('alertToggle');
        const showAllBoxesToggle = document.getElementById('showAllBoxesToggle');
        if (alertToggle) alertToggle.checked = this.alertEnabled;
        if (showAllBoxesToggle) showAllBoxesToggle.checked = this.showAllBoxesEnabled;
        
        console.log(`Show all boxes ${this.showAllBoxesEnabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Set selected box
     */
    setSelectedBox(box) {
        this.selectedBox = box;
    }

    /**
     * Set active alert box
     */
    setActiveAlertBox(box) {
        this.activeAlertBox = box;
    }

    /**
     * Clear selected box
     */
    clearSelectedBox() {
        this.selectedBox = null;
    }

    /**
     * Clear active alert box
     */
    clearActiveAlertBox() {
        this.activeAlertBox = null;
    }

    /**
     * Clear annotations
     */
    clearAnnotations() {
        this.annotations = null;
        this.currentFrameAnnotations = [];
        this.clickedExclamationIcons.clear();
        
        // Clear canvas annotations
        const canvas = document.getElementById('videoCanvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            // Redraw current frame without annotations
            this.viewer.videoPlayer.drawCurrentFrame();
        }
    }
}

// Export module
window.AnnotationRenderer = AnnotationRenderer; 