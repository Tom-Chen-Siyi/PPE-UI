// ========================================
// 视频播放器模块
// ========================================

class VideoPlayer {
    constructor(viewer) {
        this.viewer = viewer;
        this.videoInfo = null;
        this.currentFrame = 1;
        this.isPlaying = false;
        this.playbackTimer = null;
        this.playbackSpeed = 1;
        this.adaptivePlayback = true;
        this.preloadBuffer = 3;
        
        // 帧缓存机制
        this.frameCache = new Map();
        this.maxCacheSize = 50;
        
        // 帧加载队列管理
        this.isLoadingFrame = false;
        this.frameQueue = [];
        this.currentLoadingFrame = null;
        
        // 帧加载状态管理
        this.frameLoadingState = {
            isLoading: false,
            currentFrame: null,
            loadingStartTime: null,
            loadingTimeout: null
        };
        
        this.frameImageList = [];
        this.usePngFrames = false;
        
        // 初始化播放按钮图标状态
        this.initializePlayButtonIcon();
    }

    // ========================================
    // 视频信息管理
    // ========================================

    /**
     * 加载视频信息
     */
    async loadVideoInfo(filename) {
        try {
            const response = await fetch(`/api/video/${encodeURIComponent(filename)}/info`);
            if (!response.ok) {
                throw new Error('Failed to load video info');
            }
            
            this.videoInfo = await response.json();
            this.viewer.updateProgressBar();
            this.viewer.updateTimeLabel();
            
            console.log('Video info loaded:', this.videoInfo);
            return this.videoInfo;
        } catch (error) {
            console.error('Error loading video info:', error);
            throw error;
        }
    }

    /**
     * 尝试加载PNG帧列表
     */
    async tryLoadPngFrameList(filename) {
        try {
            const response = await fetch(`/api/video/${encodeURIComponent(filename)}/frames`);
            if (response.ok) {
                const data = await response.json();
                this.frameImageList = data.frames;
                this.usePngFrames = true;
                console.log(`Loaded ${this.frameImageList.length} PNG frames`);
                return true;
            } else {
                console.log('No PNG frames found, using video extraction');
                this.usePngFrames = false;
                return false;
            }
        } catch (error) {
            console.error('Error loading PNG frame list:', error);
            this.usePngFrames = false;
            return false;
        }
    }

    // ========================================
    // 帧加载和缓存
    // ========================================

    /**
     * 加载指定帧
     */
    async loadFrame(frameNumber) {
        if (this.frameCache.has(frameNumber)) {
            console.log(`Frame ${frameNumber} found in cache`);
            return this.frameCache.get(frameNumber);
        }

        // 添加到加载队列
        if (!this.frameQueue.includes(frameNumber)) {
            this.frameQueue.push(frameNumber);
        }

        // 如果当前没有在加载，开始处理队列
        if (!this.isLoadingFrame) {
            this.processNextQueuedFrame();
        }

        return null;
    }

    /**
     * 立即加载指定帧（用于当前帧显示）
     */
    async loadFrameImmediate(frameNumber) {
        if (this.frameCache.has(frameNumber)) {
            console.log(`Frame ${frameNumber} found in cache`);
            return this.frameCache.get(frameNumber);
        }

        // 如果帧正在加载中，等待加载完成
        if (this.currentLoadingFrame === frameNumber) {
            return new Promise((resolve) => {
                const checkLoaded = () => {
                    if (this.frameCache.has(frameNumber)) {
                        resolve(this.frameCache.get(frameNumber));
                    } else if (this.currentLoadingFrame !== frameNumber) {
                        resolve(null);
                    } else {
                        setTimeout(checkLoaded, 50);
                    }
                };
                checkLoaded();
            });
        }

        // 立即加载帧
        console.log(`Loading frame ${frameNumber} immediately...`);
        // this.viewer.showFrameLoadingIndicator(); // 禁用帧加载指示器

        const loadStartTime = performance.now();

        return new Promise((resolve) => {
            if (this.usePngFrames && this.frameImageList.length > 0) {
                // 使用PNG帧
                const frameIndex = frameNumber - 1;
                if (frameIndex < this.frameImageList.length) {
                    const frameName = this.frameImageList[frameIndex];
                    const img = new Image();
                    img.onload = () => {
                        const loadTime = performance.now() - loadStartTime;
                        console.log(`PNG frame ${frameNumber} loaded in ${loadTime.toFixed(2)}ms`);
                        
                        this.cacheFrame(frameNumber, img);
                        // this.viewer.hideFrameLoadingIndicator(); // 禁用帧加载指示器
                        resolve(img);
                    };
                    img.onerror = () => {
                        console.error(`Failed to load PNG frame ${frameNumber}`);
                        // this.viewer.hideFrameLoadingIndicator(); // 禁用帧加载指示器
                        resolve(null);
                    };
                    img.src = `/api/video/${encodeURIComponent(this.viewer.currentVideoFilename)}/frame-png/${frameNumber}`;
                } else {
                    // this.viewer.hideFrameLoadingIndicator(); // 禁用帧加载指示器
                    resolve(null);
                }
            } else {
                // 使用视频帧提取
                const img = new Image();
                img.onload = () => {
                    const loadTime = performance.now() - loadStartTime;
                    console.log(`Video frame ${frameNumber} loaded in ${loadTime.toFixed(2)}ms`);
                    
                    this.cacheFrame(frameNumber, img);
                    // this.viewer.hideFrameLoadingIndicator(); // 禁用帧加载指示器
                    resolve(img);
                };
                img.onerror = () => {
                    console.error(`Failed to load video frame ${frameNumber}`);
                    // this.viewer.hideFrameLoadingIndicator(); // 禁用帧加载指示器
                    resolve(null);
                };
                img.src = `/api/video/${encodeURIComponent(this.viewer.currentVideoFilename)}/frame/${frameNumber}`;
            }
        });
    }

    /**
     * 处理队列中的下一帧
     */
    processNextQueuedFrame() {
        if (this.frameQueue.length === 0 || this.isLoadingFrame) {
            return;
        }

        this.isLoadingFrame = true;
        const frameNumber = this.frameQueue.shift();
        this.currentLoadingFrame = frameNumber;

        console.log(`Loading frame ${frameNumber}...`);
        // this.viewer.showFrameLoadingIndicator(); // 禁用帧加载指示器

        const loadStartTime = performance.now();

        if (this.usePngFrames && this.frameImageList.length > 0) {
            // 使用PNG帧
            const frameIndex = frameNumber - 1;
            if (frameIndex < this.frameImageList.length) {
                const frameName = this.frameImageList[frameIndex];
                const img = new Image();
                img.onload = () => {
                    const loadTime = performance.now() - loadStartTime;
                    console.log(`PNG frame ${frameNumber} loaded in ${loadTime.toFixed(2)}ms`);
                    
                    this.cacheFrame(frameNumber, img);
                    // this.viewer.hideFrameLoadingIndicator(); // 禁用帧加载指示器
                    this.isLoadingFrame = false;
                    
                    // 继续处理队列
                    setTimeout(() => this.processNextQueuedFrame(), 0);
                };
                img.onerror = () => {
                    console.error(`Failed to load PNG frame ${frameNumber}`);
                    // this.viewer.hideFrameLoadingIndicator(); // 禁用帧加载指示器
                    this.isLoadingFrame = false;
                    setTimeout(() => this.processNextQueuedFrame(), 0);
                };
                img.src = `/api/video/${encodeURIComponent(this.viewer.currentVideoFilename)}/frame-png/${frameNumber}`;
            }
        } else {
            // 使用视频帧提取
            const img = new Image();
            img.onload = () => {
                const loadTime = performance.now() - loadStartTime;
                console.log(`Video frame ${frameNumber} loaded in ${loadTime.toFixed(2)}ms`);
                
                this.cacheFrame(frameNumber, img);
                // this.viewer.hideFrameLoadingIndicator(); // 禁用帧加载指示器
                this.isLoadingFrame = false;
                
                // 继续处理队列
                setTimeout(() => this.processNextQueuedFrame(), 0);
            };
            img.onerror = () => {
                console.error(`Failed to load video frame ${frameNumber}`);
                // this.viewer.hideFrameLoadingIndicator(); // 禁用帧加载指示器
                this.isLoadingFrame = false;
                setTimeout(() => this.processNextQueuedFrame(), 0);
            };
            img.src = `/api/video/${encodeURIComponent(this.viewer.currentVideoFilename)}/frame/${frameNumber}`;
        }
    }

    /**
     * 预加载下一帧
     */
    preloadNextFrame() {
        if (!this.videoInfo) return;

        for (let i = 1; i <= this.preloadBuffer; i++) {
            const nextFrame = this.currentFrame + i;
            if (nextFrame <= this.videoInfo.totalFrames && !this.frameCache.has(nextFrame)) {
                this.loadFrame(nextFrame);
            }
        }
    }

    /**
     * 缓存帧
     */
    cacheFrame(frameNumber, img) {
        this.frameCache.set(frameNumber, img);
        
        // 限制缓存大小
        if (this.frameCache.size > this.maxCacheSize) {
            const firstKey = this.frameCache.keys().next().value;
            this.frameCache.delete(firstKey);
        }
    }

    /**
     * 清除帧缓存
     */
    clearFrameCache() {
        this.frameCache.clear();
        console.log('Frame cache cleared');
    }

    /**
     * 清除帧队列
     */
    clearFrameQueue() {
        this.frameQueue = [];
        this.isLoadingFrame = false;
        this.currentLoadingFrame = null;
        console.log('Frame queue cleared');
    }

    // ========================================
    // 播放控制
    // ========================================

    /**
     * 切换播放状态
     */
    togglePlayback() {
        if (this.isPlaying) {
            this.stopPlayback();
        } else {
            this.startPlayback();
        }
        this.updatePlayButtonIcon();
    }

    /**
     * 初始化播放按钮图标
     */
    initializePlayButtonIcon() {
        // 延迟初始化，确保DOM元素已加载
        setTimeout(() => {
            this.updatePlayButtonIcon();
        }, 100);
    }

    /**
     * 更新播放按钮图标
     */
    updatePlayButtonIcon() {
        const playIcon = document.getElementById('playIcon');
        const pauseIcon = document.getElementById('pauseIcon');
        
        if (playIcon && pauseIcon) {
            if (this.isPlaying) {
                // 正在播放，显示暂停图标
                playIcon.style.display = 'none';
                pauseIcon.style.display = 'block';
            } else {
                // 已暂停，显示播放图标
                playIcon.style.display = 'block';
                pauseIcon.style.display = 'none';
            }
        }
    }

    /**
     * 开始播放
     */
    startPlayback() {
        if (!this.videoInfo || this.isPlaying) return;

        this.isPlaying = true;
        console.log('Starting playback...');
        this.updatePlayButtonIcon();

        const playNextFrame = async () => {
            if (!this.isPlaying) return;

            // 显示当前帧
            await this.viewer.displayCurrentFrame();

            // 实时更新选中人员的信息
            this.viewer.updateSelectedPersonInfo();

            // 预加载下一帧
            this.preloadNextFrame();

            // 计算下一帧的时间间隔
            const fps = this.videoInfo.fps;
            const baseInterval = 1000 / fps;
            const speedCompensation = this.getPlaybackSpeedCompensation();
            const adjustedInterval = baseInterval / this.playbackSpeed * speedCompensation;

            // 更新进度条和时间标签
            this.viewer.updateProgressBar();
            this.viewer.updateTimeLabel();

            // 检查是否到达视频末尾
            if (this.currentFrame >= this.videoInfo.totalFrames) {
                this.stopPlayback();
                return;
            }

            // 前进到下一帧
            this.currentFrame++;

            // 设置下一帧的定时器
            this.playbackTimer = setTimeout(playNextFrame, adjustedInterval);
        };

        // 立即开始播放
        playNextFrame();
    }

    /**
     * 停止播放
     */
    stopPlayback() {
        this.isPlaying = false;
        if (this.playbackTimer) {
            clearTimeout(this.playbackTimer);
            this.playbackTimer = null;
        }
        console.log('Playback stopped');
        this.updatePlayButtonIcon();
    }

    /**
     * 暂停视频
     */
    pauseVideo() {
        this.stopPlayback();
        this.updatePlayButtonIcon();
    }

    /**
     * 跳转到指定位置
     */
    async seekVideo(value) {
        if (!this.videoInfo) return;

        const newFrame = Math.round(value);
        if (newFrame >= 1 && newFrame <= this.videoInfo.totalFrames) {
            this.currentFrame = newFrame;
            
            // 实时更新选中人员的信息
            this.viewer.updateSelectedPersonInfo();
            
            await this.viewer.displayCurrentFrame();
            this.viewer.updateProgressBar();
            this.viewer.updateTimeLabel();

            // 预加载当前帧周围的帧
            this.preloadNextFrame();
        }
    }

    /**
     * 获取播放速度补偿
     */
    getPlaybackSpeedCompensation() {
        if (!this.videoInfo) return 1;
        
        const fps = this.videoInfo.fps || 30;
        const theoreticalInterval = 1000 / (fps * this.playbackSpeed);
        
        // 检查缓存中连续帧的数量
        let consecutiveCachedFrames = 0;
        for (let i = 1; i <= 5; i++) {
            if (this.frameCache.has(this.currentFrame + i)) {
                consecutiveCachedFrames++;
            } else {
                break;
            }
        }
        
        // 根据缓存情况调整播放速度
        if (consecutiveCachedFrames >= 3) {
            return 0.8; // 减少20%的间隔
        } else if (consecutiveCachedFrames >= 1) {
            return 0.9; // 减少10%的间隔
        }
        
        return 1; // 不调整
    }

    // ========================================
    // 获取器方法
    // ========================================

    getCurrentFrame() {
        return this.currentFrame;
    }

    getVideoInfo() {
        return this.videoInfo;
    }

    isVideoPlaying() {
        return this.isPlaying;
    }

    getFrameCache() {
        return this.frameCache;
    }

    /**
     * Clear video
     */
    clearVideo() {
        this.currentVideo = null;
        this.currentFrame = 0;
        this.totalFrames = 0;
        this.fps = 0;
        this.duration = 0;
        this.frameCache.clear();
        
        // Clear canvas
        const canvas = document.getElementById('videoCanvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        
        // Reset progress bar
        const progressBar = document.getElementById('progressBar');
        if (progressBar) {
            progressBar.value = 0;
        }
        
        // Update time display
        const timeDisplay = document.getElementById('timeDisplay');
        if (timeDisplay) {
            timeDisplay.textContent = '00:00 / 00:00';
        }
    }
}

// 导出模块
window.VideoPlayer = VideoPlayer; 