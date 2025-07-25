// ========================================
// Frame extraction and progress monitoring routes
// ========================================

const { app, path, fs, ffmpeg, extractionProgress } = require('../server_config');
const { parsePythonOutput } = require('../utils/parsePythonOutput');

// ========================================
// Frame extraction progress monitoring
// ========================================

/**
 * Get real-time frame extraction progress
 * GET /api/extraction/progress/:videoBase
 */
app.get('/api/extraction/progress/:videoBase', (req, res) => {
  try {
    const videoBase = req.params.videoBase;
    const progress = extractionProgress.get(videoBase);
    
    if (!progress) {
      return res.json({
        progress: 0,
        framesSaved: 0,
        totalFrames: null,
        status: 'not_found',
        lastUpdate: Date.now(),
        output: ''
      });
    }
    
    // Return full progress information, including output
    res.json({
      progress: progress.progress,
      framesSaved: progress.framesSaved,
      totalFrames: progress.totalFrames,
      status: progress.status,
      lastUpdate: progress.lastUpdate,
      output: progress.output || ''
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// Frame status check
// ========================================

/**
 * Check frame extraction status
 * GET /api/frames/status/*
 */
app.get('/api/frames/status/*', (req, res) => {
  try {
    const framesDir = path.join(__dirname, '..', '..', 'uploads', req.params[0]);
    
    if (!fs.existsSync(framesDir)) {
      return res.json({
        frameCount: 0,
        completed: false,
        totalFrames: null
      });
    }

    // Calculate PNG file count
    const files = fs.readdirSync(framesDir).filter(file => file.endsWith('.png'));
    const frameCount = files.length;
    
    // Attempt to get video filename from parent directory
    const pathParts = req.params[0].split('/');
    if (pathParts.length >= 2 && pathParts[0] === 'frames') {
      const videoBase = pathParts[1];
      
      // Find corresponding video file
      const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
      const videoFiles = fs.readdirSync(uploadsDir).filter(file => 
        file.startsWith(videoBase) && 
        (file.endsWith('.mp4') || file.endsWith('.avi') || file.endsWith('.mov') || file.endsWith('.mkv'))
      );
      
      let totalFrames = null;
      if (videoFiles.length > 0) {
        const videoPath = path.join(uploadsDir, videoFiles[0]);
        try {
          // Use ffprobe to get video info
          ffmpeg.ffprobe(videoPath, (err, metadata) => {
            if (!err && metadata && metadata.streams) {
              const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
              if (videoStream) {
                totalFrames = Math.floor(parseFloat(metadata.format.duration) * eval(videoStream.r_frame_rate));
              }
            }
            
            // Improved completion detection logic
            const progress = extractionProgress.get(videoBase);
            let completed = false;
            
            if (progress && progress.status === 'completed') {
              completed = true;
            } else if (frameCount > 0) {
              // If file count is stable and no updates for a long time, consider it completed
              const lastUpdate = progress ? progress.lastUpdate : 0;
              const timeSinceUpdate = Date.now() - lastUpdate;
              completed = timeSinceUpdate > 10000; // 10 seconds without update considered completed
            }
            
            res.json({
              frameCount: frameCount,
              completed: completed,
              totalFrames: totalFrames
            });
          });
          return; // Asynchronous return to avoid duplicate responses
        } catch (e) {
          console.log('Error getting video info:', e.message);
        }
      }
    }
    
    // Check if completed (improved logic)
    const videoBase = pathParts[1];
    const progress = extractionProgress.get(videoBase);
    let completed = false;
    
    if (progress && progress.status === 'completed') {
      completed = true;
    } else if (frameCount > 0) {
      const lastUpdate = progress ? progress.lastUpdate : 0;
      const timeSinceUpdate = Date.now() - lastUpdate;
      completed = timeSinceUpdate > 10000;
    }
    
    res.json({
      frameCount: frameCount,
      completed: completed,
      totalFrames: null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// Manual frame generation
// ========================================

/**
 * Generate frames API
 * POST /api/generate-frames
 */
app.post('/api/generate-frames', async (req, res) => {
  try {
    const { filename } = req.body;
    
    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }
    
    const videoPath = path.join(__dirname, '..', '..', 'uploads', filename);
    const videoBase = path.parse(filename).name;
    const framesDir = path.join(__dirname, '..', '..', 'uploads', 'frames', videoBase);
    
    // Check if video file exists
    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({ error: 'Video file not found' });
    }
    
    // Check if already in extraction
    const existingProgress = extractionProgress.get(videoBase);
    if (existingProgress && existingProgress.status === 'starting') {
      return res.json({
        message: 'Frame extraction already in progress',
        filename: filename,
        status: 'already_running'
      });
    }
    
    // Create frames directory
    fs.ensureDirSync(framesDir);
    
    // Initialize progress information
    extractionProgress.set(videoBase, {
      progress: 0,
      framesSaved: 0,
      totalFrames: null,
      status: 'starting',
      lastUpdate: Date.now(),
      output: ''
    });
    
    // Start Python frame extraction process
    const python = require('child_process').spawn;
    const pyProcess = python('python3', [
      path.join(__dirname, '..', 'get_frame.py'),
      videoPath,
      framesDir
    ]);
    
    let pyOut = '';
    pyProcess.stdout.on('data', (data) => { 
      const output = data.toString();
      pyOut += output; 
      console.log('Frame extraction output:', output);
      
      // Parse output and update progress
      const progressInfo = parsePythonOutput(pyOut, videoBase);
      const currentProgress = extractionProgress.get(videoBase);
      if (currentProgress) {
        Object.assign(currentProgress, progressInfo);
        currentProgress.output = pyOut;
        console.log(`📈 Updated progress for ${videoBase}:`, progressInfo);
      }
    });
    pyProcess.stderr.on('data', (data) => { 
      console.error('Frame extraction error:', data.toString()); 
    });
    pyProcess.on('close', (code) => {
      console.log('Frame extraction finished with code:', code, 'Output:', pyOut.trim());
      
      // Update final status
      const currentProgress = extractionProgress.get(videoBase);
      if (currentProgress) {
        currentProgress.status = code === 0 ? 'completed' : 'error';
        currentProgress.progress = code === 0 ? 100 : currentProgress.progress;
        currentProgress.lastUpdate = Date.now();
      }
    });

    res.json({
      message: 'Frame extraction started successfully',
      filename: filename,
      status: 'started'
    });
    
  } catch (error) {
    console.error('Error starting frame extraction:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// Annotation file handling
// ========================================

/**
 * Load annotation JSON file
 * GET /api/annotations/:filename
 */
app.get('/api/annotations/:filename', (req, res) => {
  try {
    const annotationsPath = path.join(__dirname, '..', '..', 'uploads', req.params.filename);
    
    if (!fs.existsSync(annotationsPath)) {
      return res.status(404).json({ error: 'Annotations file not found' });
    }

    const annotations = fs.readJsonSync(annotationsPath);
    res.json(annotations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = app; 