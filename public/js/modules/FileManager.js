// ========================================
// File Management Module
// ========================================

class FileManager {
    constructor(viewer) {
        this.viewer = viewer;
        this.currentVideoFilename = null;
        this.currentAnnotationsFilename = null;
    }

    // ========================================
    // File Upload
    // ========================================

    /**
     * Upload video file
     */
    async uploadVideo() {
        const fileInput = document.getElementById('videoUpload');
        const file = fileInput.files[0];
        
        if (!file) {
            alert('Please select a video file');
            return;
        }

        const formData = new FormData();
        formData.append('video', file);

        this.viewer.showProgressModal('Uploading Video', 'Please wait...');

        try {
            const xhr = new XMLHttpRequest();
            
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    this.viewer.updateProgressModal(percentComplete, 'Uploading Video', `${percentComplete.toFixed(1)}%`);
                }
            });

            xhr.addEventListener('load', async () => {
                if (xhr.status === 200) {
                    const result = JSON.parse(xhr.responseText);
                    console.log('Video upload successful:', result);
                    
                    // Start monitoring frame extraction progress
                await this.viewer.monitorFrameExtraction(result.filename, {
                    title: 'Frame Extraction',
                    showFileInfo: false
                });
                    
                    // Reload file list
                    await this.loadFileList();
                    
                    // Reset file input display
                    const videoFileDisplay = document.getElementById('videoFileDisplay');
                    if (videoFileDisplay) {
                        videoFileDisplay.textContent = 'No file selected';
                        videoFileDisplay.classList.remove('has-file');
                    }
                    
                    // Clear file input
                    const videoUpload = document.getElementById('videoUpload');
                    if (videoUpload) {
                        videoUpload.value = '';
                    }
                    
                    this.viewer.hideProgressModal();
                } else {
                    console.error('Upload failed:', xhr.statusText);
                    this.viewer.hideProgressModal();
                    alert('Upload failed: ' + xhr.statusText);
                }
            });

            xhr.addEventListener('error', () => {
                console.error('Upload error');
                this.viewer.hideProgressModal();
                alert('Upload error occurred');
            });

            xhr.open('POST', '/api/upload/video');
            xhr.send(formData);
            
        } catch (error) {
            console.error('Upload error:', error);
            this.viewer.hideProgressModal();
            alert('Upload error: ' + error.message);
        }
    }

    /**
     * Upload annotation file
     */
    async uploadAnnotations() {
        const fileInput = document.getElementById('annotationsUpload');
        const file = fileInput.files[0];
        
        if (!file) {
            alert('Please select an annotations file');
            return;
        }

        const formData = new FormData();
        formData.append('annotations', file);

        this.viewer.showProgressModal('Uploading Annotations', 'Please wait...');

        try {
            const xhr = new XMLHttpRequest();
            
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    this.viewer.updateProgressModal(percentComplete, 'Uploading Annotations', `${percentComplete.toFixed(1)}%`);
                }
            });

            xhr.addEventListener('load', async () => {
                if (xhr.status === 200) {
                    const result = JSON.parse(xhr.responseText);
                    console.log('Annotations upload successful:', result);
                    
                    // Reload file list
                    await this.loadFileList();
                    
                    // Reset file input display
                    const annotationsFileDisplay = document.getElementById('annotationsFileDisplay');
                    if (annotationsFileDisplay) {
                        annotationsFileDisplay.textContent = 'No file selected';
                        annotationsFileDisplay.classList.remove('has-file');
                    }
                    
                    // Clear file input
                    const annotationsUpload = document.getElementById('annotationsUpload');
                    if (annotationsUpload) {
                        annotationsUpload.value = '';
                    }
                    
                    this.viewer.hideProgressModal();
                } else {
                    console.error('Upload failed:', xhr.statusText);
                    this.viewer.hideProgressModal();
                    alert('Upload failed: ' + xhr.statusText);
                }
            });

            xhr.addEventListener('error', () => {
                console.error('Upload error');
                this.viewer.hideProgressModal();
                alert('Upload error occurred');
            });

            xhr.open('POST', '/api/upload/annotations');
            xhr.send(formData);
            
        } catch (error) {
            console.error('Upload error:', error);
            this.viewer.hideProgressModal();
            alert('Upload error: ' + error.message);
        }
    }

    // ========================================
    // File List Management
    // ========================================

    /**
     * Load file list
     */
    async loadFileList() {
        try {
            const response = await fetch('/api/files');
            if (!response.ok) {
                throw new Error('Failed to load file list');
            }
            
            const files = await response.json();
            this.displayFileList(files);
            
        } catch (error) {
            console.error('Error loading file list:', error);
            this.displayFileList([]);
        }
    }

    /**
     * Display file list
     */
    displayFileList(files) {
        const videoFileList = document.getElementById('videoFileList');
        const annotationFileList = document.getElementById('annotationFileList');
        
        if (!videoFileList || !annotationFileList) {
            console.error('File list containers not found');
            return;
        }

        // Clear existing lists
        videoFileList.innerHTML = '';
        annotationFileList.innerHTML = '';

        if (files.length === 0) {
            videoFileList.innerHTML = '<div class="no-files">No video files uploaded</div>';
            annotationFileList.innerHTML = '<div class="no-files">No annotation files uploaded</div>';
            return;
        }

        // Separate video files and annotation files
        const videoFiles = files.filter(file => this.isVideoFile(file.filename));
        const annotationFiles = files.filter(file => this.isAnnotationFile(file.filename));

        // Display video files
        if (videoFiles.length > 0) {
            videoFiles.forEach(file => {
                const fileItem = this.createFileItem(file, 'video');
                videoFileList.appendChild(fileItem);
            });
        } else {
            videoFileList.innerHTML = '<div class="no-files">No video files uploaded</div>';
        }

        // Display annotation files
        if (annotationFiles.length > 0) {
            annotationFiles.forEach(file => {
                const fileItem = this.createFileItem(file, 'annotation');
                annotationFileList.appendChild(fileItem);
            });
        } else {
            annotationFileList.innerHTML = '<div class="no-files">No annotation files uploaded</div>';
        }
    }

    /**
     * Create file item
     */
    createFileItem(file, type) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.dataset.filename = file.filename;
        fileItem.dataset.type = type;

        // Create file icon based on type
        const fileIcon = document.createElement('img');
        fileIcon.className = 'file-type-icon';
        if (type === 'video') {
            fileIcon.src = 'icon/video upload icon.png';
            fileIcon.alt = 'Video';
        } else if (type === 'annotation') {
            fileIcon.src = 'icon/transcript icon.png';
            fileIcon.alt = 'Annotation';
        }
        fileItem.appendChild(fileIcon);

        const fileInfo = document.createElement('div');
        fileInfo.className = 'file-info';
        
        const fileName = document.createElement('div');
        fileName.className = 'file-name';
        fileName.textContent = file.filename;
        fileInfo.appendChild(fileName);

        const fileDetails = document.createElement('div');
        fileDetails.className = 'file-details';
        
        // Create file size element
        const fileSize = document.createElement('span');
        fileSize.className = 'file-size';
        fileSize.textContent = window.PPE_UTILS.formatFileSize(file.size);
        fileDetails.appendChild(fileSize);
        
        // Add frame info for video files only
        if (type === 'video' && file.videoInfo) {
            const { totalFrames } = file.videoInfo;
            if (totalFrames > 0) {
                const frameInfo = document.createElement('span');
                frameInfo.className = 'frame-info';
                frameInfo.textContent = ` • ${totalFrames} Frames generated`;
                fileDetails.appendChild(frameInfo);
            }
        }
        
        fileInfo.appendChild(fileDetails);

        fileItem.appendChild(fileInfo);

        // Add checkbox only for video files
        if (type === 'video') {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'file-checkbox';
            fileItem.appendChild(checkbox);
        }

        // Create delete button with icon
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'file-delete-btn';
        deleteBtn.title = 'Delete file';
        
        // Create image element for delete icon
        const deleteIcon = document.createElement('img');
        deleteIcon.src = 'icon/delete_icon.png';
        deleteIcon.alt = 'Delete';
        deleteIcon.className = 'delete-icon-img';
        deleteBtn.appendChild(deleteIcon);
        
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent file selection
            this.deleteSingleFile(file.filename, file.filename);
        });
        fileItem.appendChild(deleteBtn);

        // Add click event
        fileItem.addEventListener('click', (e) => {
            if (e.target.type !== 'checkbox' && !e.target.classList.contains('file-delete-btn') && !e.target.classList.contains('delete-icon-img')) {
                this.handleFileClick(file, type);
            }
        });

        // Check frame status (only for video files)
        if (type === 'video') {
            this.checkFileFrameStatus(file.filename, fileItem);
        }

        return fileItem;
    }

    /**
     * Handle file click
     */
    handleFileClick(file, type) {
        if (type === 'video') {
            this.loadVideo(file.filename);
        } else if (type === 'annotation') {
            this.loadAnnotations(file.filename);
        }
    }

    /**
     * Load video
     */
    async loadVideo(filename) {
        try {
            this.currentVideoFilename = filename;
            
            // Load video info
            await this.viewer.videoPlayer.loadVideoInfo(filename);
            
            // Try to load PNG frame list
            await this.viewer.videoPlayer.tryLoadPngFrameList(filename);
            
            // Display first frame
            await this.viewer.displayCurrentFrame();
            
            console.log('Video loaded:', filename);
            
        } catch (error) {
            console.error('Error loading video:', error);
            alert('Error loading video: ' + error.message);
        }
    }

    /**
     * Load annotations
     */
    async loadAnnotations(filename) {
        try {
            this.currentAnnotationsFilename = filename;
            
            // Load annotation data
            await this.viewer.annotationRenderer.loadAnnotations(filename);
            
            // Redraw current frame to show annotations
            await this.viewer.displayCurrentFrame();
            
            console.log('Annotations loaded:', filename);
            
        } catch (error) {
            console.error('Error loading annotations:', error);
            alert('Error loading annotations: ' + error.message);
        }
    }

    // ========================================
    // File Status Check
    // ========================================

    /**
     * Check file frame status
     */
    async checkFileFrameStatus(filename, fileItem) {
        try {
            const videoBase = filename.replace(/\.[^/.]+$/, "");
            const response = await fetch(`/api/frames/status/frames/${encodeURIComponent(videoBase)}`);
            
            if (response.ok) {
                const data = await response.json();
                
                // Update file item display
                const statusIndicator = document.createElement('div');
                statusIndicator.className = 'frame-status';
                
                if (data.completed) {
                    statusIndicator.textContent = ` ${data.frameCount} frames`;
                    statusIndicator.style.color = '#4CAF50';
                } else if (data.frameCount > 0) {
                    statusIndicator.textContent = `⏳${data.frameCount} frames`;
                    statusIndicator.style.color = '#FF9800';
                } else {
                    statusIndicator.textContent = ' No frames';
                    statusIndicator.style.color = '#F44336';
                }
                
                // Remove old status indicator
                const oldStatus = fileItem.querySelector('.frame-status');
                if (oldStatus) {
                    oldStatus.remove();
                }
                
                fileItem.appendChild(statusIndicator);
            }
        } catch (error) {
            console.error('Error checking frame status:', error);
        }
    }

    /**
     * Check current video frame status
     */
    async checkCurrentVideoFrameStatus() {
        if (!this.currentVideoFilename) {
            alert('No video loaded');
            return;
        }
        
        await this.checkFileFrameStatus(this.currentVideoFilename, null);
    }

    // ========================================
    // Frame Generation
    // ========================================

    /**
     * Generate frames for selected files
     */
    async generateFramesForSelected() {
        const selectedFiles = this.getSelectedFiles();
        const videoFiles = selectedFiles.filter(file => this.isVideoFile(file.filename));
        
        if (videoFiles.length === 0) {
            alert('Please select video files to generate frames');
            return;
        }

        // Check frame status for each video file
        const filesNeedingFrames = [];
        for (const file of videoFiles) {
            try {
                const videoBase = file.filename.replace(/\.[^/.]+$/, "");
                const response = await fetch(`/api/frames/status/frames/${encodeURIComponent(videoBase)}`);
                
                if (response.ok) {
                    const data = await response.json();
                    if (!data.completed) {
                        filesNeedingFrames.push(file);
                    }
                } else {
                    // If status cannot be obtained, assume frames need to be generated
                    filesNeedingFrames.push(file);
                }
            } catch (error) {
                console.error(`Error checking frame status for ${file.filename}:`, error);
                // If check fails, assume frames need to be generated
                filesNeedingFrames.push(file);
            }
        }

        if (filesNeedingFrames.length === 0) {
            alert('All selected video files already have complete frame sets. No frame generation needed.');
            return;
        }

        this.viewer.showProgressModal('Generating Frames', `Generating frames for ${filesNeedingFrames.length} file(s)...`);

        for (let i = 0; i < filesNeedingFrames.length; i++) {
            const file = filesNeedingFrames[i];
            
            try {
                // Start frame generation and monitor real-time progress
                await this.generateFramesForFileWithProgress(file.filename, i + 1, filesNeedingFrames.length);
            } catch (error) {
                console.error(`Error generating frames for ${file.filename}:`, error);
                this.viewer.updateProgressModal(0, 'Generating Frames', `Error processing ${file.filename}`);
                await new Promise(resolve => setTimeout(resolve, 2000)); // Show error for 2 seconds
            }
        }

        this.viewer.updateProgressModal(100, 'Generating Frames', 'All frames generated successfully!');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Show completion status for 1 second
        this.viewer.hideProgressModal();
        await this.loadFileList();
    }

    /**
     * Generate frames for a single file
     */
    async generateFramesForFile(filename) {
        try {
            const response = await fetch('/api/generate-frames', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ filename })
            });

            if (!response.ok) {
                throw new Error('Failed to start frame generation');
            }

            const result = await response.json();
            console.log('Frame generation started:', result);

            // Monitor frame generation progress
            await this.monitorFrameGeneration(filename);
            
        } catch (error) {
            console.error('Error generating frames:', error);
            throw error;
        }
    }

    /**
     * Generate frames for a single file (with real-time progress)
     */
    async generateFramesForFileWithProgress(filename, currentFileIndex, totalFiles) {
        try {
            const response = await fetch('/api/generate-frames', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ filename })
            });

            if (!response.ok) {
                throw new Error('Failed to start frame generation');
            }

            const result = await response.json();
            console.log('Frame generation started:', result);

            // Use generic progress monitoring method
            await this.viewer.monitorFrameExtraction(filename, {
                title: 'Generating Frames',
                showFileInfo: true,
                currentFileIndex: currentFileIndex,
                totalFiles: totalFiles
            });
            
        } catch (error) {
            console.error('Error generating frames:', error);
            throw error;
        }
    }

    /**
     * Monitor frame generation progress
     */
    async monitorFrameGeneration(filename) {
        const videoBase = filename.replace(/\.[^/.]+$/, "");
        let attempts = 0;
        const maxAttempts = 300; // Wait up to 5 minutes

        while (attempts < maxAttempts) {
            try {
                const response = await fetch(`/api/extraction/progress/${encodeURIComponent(videoBase)}`);
                if (response.ok) {
                    const data = await response.json();
                    
                    if (data.status === 'completed') {
                        console.log('Frame generation completed for:', filename);
                        return;
                    } else if (data.status === 'error') {
                        console.error('Frame generation failed for:', filename);
                        return;
                    }
                }
            } catch (error) {
                console.log('Checking frame generation progress...', error.message);
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
        }
        
        console.log('Frame generation monitoring timed out for:', filename);
    }



    // ========================================
    // File Deletion
    // ========================================

    /**
     * Delete selected files
     */
    async deleteSelectedFiles() {
        const selectedFiles = this.getSelectedFiles();
        
        if (selectedFiles.length === 0) {
            alert('Please select files to delete');
            return;
        }

        if (!confirm(`Are you sure you want to delete ${selectedFiles.length} file(s)?`)) {
            return;
        }

        this.viewer.showProgressModal('Deleting Files', 'Please wait...');

        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            const progress = ((i + 1) / selectedFiles.length) * 100;
            
            this.viewer.updateProgressModal(progress, 'Deleting Files', `Deleting ${file.filename} (${i + 1}/${selectedFiles.length})`);
            
            try {
                await this.deleteFile(file.filename);
            } catch (error) {
                console.error(`Error deleting ${file.filename}:`, error);
            }
        }

        this.viewer.hideProgressModal();
        await this.loadFileList();
    }

    /**
     * Delete a single file
     */
    async deleteFile(filename) {
        try {
            const response = await fetch(`/api/delete/file/${encodeURIComponent(filename)}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Failed to delete file');
            }

            const result = await response.json();
            console.log('File deleted:', result);
            
        } catch (error) {
            console.error('Error deleting file:', error);
            throw error;
        }
    }

    /**
     * Delete a single file with confirmation
     */
    async deleteSingleFile(filename, displayName) {
        if (!confirm(`Are you sure you want to delete "${displayName}"?`)) {
            return;
        }

        try {
            await this.deleteFile(filename);
            
            // Reload file list to reflect changes
            await this.loadFileList();
            
            // If the deleted file was currently loaded, clear the current selection
            if (this.currentVideoFilename === filename) {
                this.currentVideoFilename = null;
                // Clear video display
                this.viewer.videoPlayer.clearVideo();
            }
            
            if (this.currentAnnotationsFilename === filename) {
                this.currentAnnotationsFilename = null;
                // Clear annotations
                this.viewer.annotationRenderer.clearAnnotations();
            }
            
            // Redraw current frame
            await this.viewer.displayCurrentFrame();
            
            console.log('File deleted successfully:', filename);
            
        } catch (error) {
            console.error('Error deleting file:', error);
            alert('Failed to delete file: ' + error.message);
        }
    }

    // ========================================
    // Utility Methods
    // ========================================

    /**
     * Get selected files
     */
    getSelectedFiles() {
        const checkboxes = document.querySelectorAll('.file-checkbox:checked');
        return Array.from(checkboxes).map(checkbox => {
            const fileItem = checkbox.closest('.file-item');
            return {
                filename: fileItem.dataset.filename,
                type: fileItem.dataset.type
            };
        });
    }

    /**
     * Check if it's a video file
     */
    isVideoFile(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        return ['mp4', 'avi', 'mov', 'mkv', 'wmv', 'flv'].includes(ext);
    }

    /**
     * Check if it's an annotation file
     */
    isAnnotationFile(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        return ext === 'json';
    }

    // ========================================
    // Getter Methods
    // ========================================

    getCurrentVideoFilename() {
        return this.currentVideoFilename;
    }

    getCurrentAnnotationsFilename() {
        return this.currentAnnotationsFilename;
    }
}

// Export module
window.FileManager = FileManager; 