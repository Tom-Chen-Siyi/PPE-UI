// ========================================
// File upload related routes
// ========================================

const { app, upload, path, fs, extractionProgress } = require('../server_config');
const { parsePythonOutput } = require('../utils/parsePythonOutput');

// ========================================
// Video file upload
// ========================================

/*
 * Upload video file and extract frames automatically
 * POST /api/upload/video
 */
app.post('/api/upload/video', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    // Extract frames automatically
    const videoPath = path.join(__dirname, '..', '..', 'uploads', req.file.filename);
    const videoBase = path.parse(req.file.filename).name;
    const framesDir = path.join(__dirname, '..', '..', 'uploads', 'frames', videoBase);
    
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
      message: 'Video uploaded successfully, extracting frames in background',
      filename: req.file.filename,
      originalName: req.file.originalname
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// Annotation file upload
// ========================================

/**
 * Upload annotation JSON file
 * POST /api/upload/annotations
 */
app.post('/api/upload/annotations', upload.single('annotations'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No annotations file uploaded' });
    }

    // Validate JSON
    const annotations = fs.readJsonSync(req.file.path);

    res.json({
      message: 'Annotations uploaded successfully',
      filename: req.file.filename,
      originalName: req.file.originalname,
      frameCount: Object.keys(annotations).length,
      totalBoxes: Object.values(annotations).reduce((sum, boxes) => sum + boxes.length, 0)
    });
  } catch (error) {
    res.status(500).json({ error: 'Invalid JSON file' });
  }
});

// ========================================
// File management
// ========================================

/**
 * List uploaded files
 * GET /api/files
 */
app.get('/api/files', (req, res) => {
  try {
    const uploadDir = path.join(__dirname, '..', '..', 'uploads');
    fs.ensureDirSync(uploadDir);
    
    const files = fs.readdirSync(uploadDir);
    const fileList = files
      .filter(filename => {
        // Filter system files and hidden files
        return !filename.startsWith('.') && 
               !filename.startsWith('~') && 
               filename !== 'Thumbs.db' &&
               filename !== '.DS_Store';
      })
      .map(filename => {
        const filePath = path.join(uploadDir, filename);
        const stats = fs.statSync(filePath);
        return {
          filename,
          size: stats.size,
          modified: stats.mtime,
          type: path.extname(filename).toLowerCase()
        };
      });

    res.json(fileList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Serve uploaded files
 * GET /uploads/:filename
 */
app.get('/uploads/:filename', (req, res) => {
  const filePath = path.join(__dirname, '..', '..', 'uploads', req.params.filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.sendFile(filePath);
});

/**
 * Delete file
 * DELETE /api/delete/file/:filename
 */
app.delete('/api/delete/file/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '..', '..', 'uploads', filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Get file extension
    const fileExt = path.extname(filename).toLowerCase();
    
    // If it's a video file, also delete the corresponding frame folder
    if (fileExt === '.mp4' || fileExt === '.avi' || fileExt === '.mov' || fileExt === '.mkv') {
      const videoBase = path.parse(filename).name;
      const framesDir = path.join(__dirname, '..', '..', 'uploads', 'frames', videoBase);
      
      // Delete frame folder (if it exists)
      if (fs.existsSync(framesDir)) {
        try {
          await fs.remove(framesDir);
          console.log(`Deleted frames directory: ${framesDir}`);
        } catch (error) {
          console.error(`Error deleting frames directory: ${error.message}`);
        }
      }
      
      // Remove from progress tracking
      extractionProgress.delete(videoBase);
    }
    
    // Delete main file
    await fs.remove(filePath);
    console.log(`Deleted file: ${filePath}`);
    
    res.json({
      success: true,
      message: 'File deleted successfully',
      filename: filename,
      deletedFrames: fileExt === '.mp4' || fileExt === '.avi' || fileExt === '.mov' || fileExt === '.mkv'
    });
    
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = app; 