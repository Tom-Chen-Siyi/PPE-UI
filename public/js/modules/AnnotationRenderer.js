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
        const jsonFrameNumber = currentVideoFrame;
        // const jsonFrameNumber = Math.floor((currentVideoFrame - 1) / 2) + 1;
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
            if (attrs.mask === 'MI'||attrs.mask === 'RC') classTypes.push('mi'); // Mask Improper

            if (attrs.eyewear === 'EA'||attrs.eyewear === 'PG') classTypes.push('ea'); // Eyewear Absent
            if (attrs.eyewear === 'SG'||attrs.eyewear === 'FI') classTypes.push('ei'); // Eyewear Absent

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

        const selectedPPE = this.viewer.ui && this.viewer.ui.selectedPPE ? this.viewer.ui.selectedPPE : null;

        boxes.forEach(bbox => {
            if (selectedPPE && !this.boxMatchesSelectedPPE(bbox, selectedPPE)) return;
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
        // If a PPE filter is active, only consider boxes that match the selected PPE
        const selectedPPE = this.viewer.ui && this.viewer.ui.selectedPPE ? this.viewer.ui.selectedPPE : null;

        const iconPromises = boxes.map(async bbox => {
            if (selectedPPE && !this.boxMatchesSelectedPPE(bbox, selectedPPE)) {
                // Skip boxes that don't match the selected PPE
                return;
            }
            const nonadherenceTexts = this.getNonadherenceTexts(bbox);
            console.log('Box ID:', bbox.id, 'Class:', bbox.class, 'ClassTypes:', bbox.classTypes, 'Nonadherence texts:', nonadherenceTexts);
            
            if (nonadherenceTexts.length > 0) {
                console.log('Drawing exclamation/icon for box ID:', bbox.id);

                // We intentionally do NOT draw the bounding box here (hide bbox) while keeping icons and badges
                const iconKey = `${bbox.id}-${bbox.class}`;
                // Draw exclamation icon / badge and any PPE icons
                await this.drawExclamationIcon(bbox, nonadherenceTexts);
            }
        });
        
        await Promise.all(iconPromises);
    }

    /**
     * Check whether a bbox has non-compliance for the selected PPE type
     * selectedPPE is one of: 'mask','gloves','eyewear','gown'
     */
    boxMatchesSelectedPPE(bbox, selectedPPE) {
        if (!bbox || !bbox.classTypes || !Array.isArray(bbox.classTypes)) return false;

        const map = {
            'mask': ['ma', 'mi'],
            'gloves': ['ha'],
            'eyewear': ['ea', 'ei'],
            'gown': ['ga', 'gi']
        };

        const types = map[selectedPPE] || [];
        return bbox.classTypes.some(cls => types.includes(cls));
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
    }

    /**
     * Draw exclamation icon centered in the bbox. When clicked, replace icon with a centered red badge showing "ID: X".
     */
    async drawExclamationIcon(bbox, nonadherenceTexts) {
        // Ensure icons are available; try to reload silently if needed
        if (!this.iconsLoaded || !this.iconImages['alert']) {
            try { await this.reloadIcons(); } catch (e) { /* fallback to drawing */ }
        }

        const x = bbox.x / this.viewer.scaleX + this.viewer.offsetX;
        const y = bbox.y / this.viewer.scaleY + this.viewer.offsetY;
        const w = bbox.w / this.viewer.scaleX;
        const h = bbox.h / this.viewer.scaleY;

        const canvasWidth = this.viewer.canvas.width;
        const canvasHeight = this.viewer.canvas.height;

        const iconSize = 36;
        let iconX = x + (w / 2) - (iconSize / 2);
        let iconY = y + (h / 2) - (iconSize / 2);

        iconX = Math.max(0, Math.min(iconX, canvasWidth - iconSize));
        iconY = Math.max(0, Math.min(iconY, canvasHeight - iconSize));

        const iconKey = `${bbox.id}-${bbox.class}`;
        const isClicked = this.clickedExclamationIcons.has(iconKey);

        if (!isClicked) {
            // Draw the alert (exclamation) icon only when NOT clicked
            if (this.iconImages['alert']) {
                this.viewer.ctx.drawImage(this.iconImages['alert'], iconX, iconY, iconSize, iconSize);
            } else {
                // fallback circle with '!'
                this.viewer.ctx.fillStyle = '#FFC107';
                this.viewer.ctx.beginPath();
                this.viewer.ctx.arc(iconX + iconSize / 2, iconY + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
                this.viewer.ctx.fill();
                this.viewer.ctx.fillStyle = 'black';
                this.viewer.ctx.font = 'bold 18px Arial';
                this.viewer.ctx.textAlign = 'center';
                this.viewer.ctx.textBaseline = 'middle';
                this.viewer.ctx.fillText('!', iconX + iconSize / 2, iconY + iconSize / 2);
            }
        } else {
            // When clicked: draw centered red badge with "ID: X" (no exclamation)
            // Smaller badge: keep readable but more compact
            const badgeRadius = Math.max(12, Math.min(28, Math.floor(iconSize * 0.6)));
            const badgeCX = iconX + iconSize / 2;
            const badgeCY = iconY + iconSize / 2;

            this.viewer.ctx.fillStyle = 'rgb(237,67,70)';
            this.viewer.ctx.beginPath();
            this.viewer.ctx.arc(badgeCX, badgeCY, badgeRadius, 0, Math.PI * 2);
            this.viewer.ctx.fill();

            this.viewer.ctx.fillStyle = 'white';
            this.viewer.ctx.font = 'bold 12px Arial';
            this.viewer.ctx.textAlign = 'center';
            this.viewer.ctx.textBaseline = 'middle';
            this.viewer.ctx.fillText(`ID: ${bbox.id}`, badgeCX, badgeCY);

            // Draw PPE icons centered along top edge when clicked
            if (bbox.classTypes && bbox.classTypes.length > 0) {
                const ppeIconSize = 26;
                const spacing = 12;

                const selectedPPE = this.viewer.ui && this.viewer.ui.selectedPPE ? this.viewer.ui.selectedPPE : null;
                const allowedMap = {
                    mask: ['ma', 'mi'],
                    gloves: ['ha'],
                    eyewear: ['ea', 'ei'],
                    gown: ['ga', 'gi']
                };

                const iconsToDraw = [];
                bbox.classTypes.forEach(classType => {
                    if (selectedPPE && allowedMap[selectedPPE] && !allowedMap[selectedPPE].includes(classType)) return;
                    if (this.iconImages[classType]) iconsToDraw.push(classType);
                });

                if (iconsToDraw.length > 0) {
                    const totalWidth = iconsToDraw.length * ppeIconSize + (iconsToDraw.length - 1) * spacing;
                    let startX = x + (w / 2) - (totalWidth / 2);
                    let iconY = y - ppeIconSize - 8;
                    if (iconY < 0) iconY = y + 6;
                    startX = Math.max(4, Math.min(startX, canvasWidth - totalWidth - 4));

                    iconsToDraw.forEach((classType, idx) => {
                        const centerX = startX + idx * (ppeIconSize + spacing) + ppeIconSize / 2;
                        const centerY = iconY + ppeIconSize / 2;

                        let circleColor = (classType === 'mi' || classType === 'gi' || classType === 'ei') ? '#E1A61E' : 'rgb(237,67,70)';
                        const circleRadius = ppeIconSize / 2 + 6;
                        this.viewer.ctx.fillStyle = circleColor;
                        this.viewer.ctx.beginPath();
                        this.viewer.ctx.arc(centerX, centerY, circleRadius, 0, Math.PI * 2);
                        this.viewer.ctx.fill();

                        const iconImg = this.iconImages[classType];
                        const aspect = iconImg.naturalWidth / iconImg.naturalHeight;
                        let drawW = ppeIconSize, drawH = ppeIconSize;
                        if (aspect > 1) drawH = ppeIconSize / aspect; else drawW = ppeIconSize * aspect;
                        const drawX = startX + idx * (ppeIconSize + spacing) + (ppeIconSize - drawW) / 2;
                        const drawY = iconY + (ppeIconSize - drawH) / 2;
                        this.viewer.ctx.drawImage(iconImg, drawX, drawY, drawW, drawH);
                    });
                }
            }
        }

        // Track icon/badge for click detection
        if (!this.exclamationIcons) this.exclamationIcons = [];
        this.exclamationIcons.push({ x: iconX, y: iconY, size: iconSize, bbox, texts: nonadherenceTexts, iconKey });
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
            
        // Note: ID label is now shown on the centered badge (handled in drawExclamationIcon)
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
            ei: [255, 165, 0],  // Orange - Eyewear Improper
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
                    case 'ei':
                        texts.push('Eyewear Improper');
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
        return texts;
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
            

            
            // Update PPE compliance overview
            if (this.viewer.ui) {
                this.viewer.ui.updatePPEComplianceOverview();
            }
        } else {
            this.viewer.updateInfoLabel('No PPE detected in this frame');
            

            
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