// ========================================
// Video related routes
// ========================================

const { app, path, fs, ffmpeg } = require('../server_config');

// ========================================
// Video info retrieval
// ========================================

/**
 * Get video info
 * GET /api/video/:filename/info
 */
app.get('/api/video/:filename/info', async (req, res) => {
  try {
    const videoPath = path.join(__dirname, '..', '..', 'uploads', req.params.filename);
    
    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({ error: 'Video file not found' });
    }

    // Use ffmpeg to get video info
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to get video info' });
      }

      const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
      if (!videoStream) {
        return res.status(500).json({ error: 'No video stream found' });
      }

      const info = {
        duration: parseFloat(metadata.format.duration),
        fps: eval(videoStream.r_frame_rate),
        totalFrames: Math.floor(parseFloat(metadata.format.duration) * eval(videoStream.r_frame_rate)),
        width: videoStream.width,
        height: videoStream.height,
        filename: req.params.filename
      };

      res.json(info);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// Frame extraction
// ========================================

/**
 * Extract video frame
 * GET /api/video/:filename/frame/:frameNumber
 */
app.get('/api/video/:filename/frame/:frameNumber', async (req, res) => {
  try {
    const videoPath = path.join(__dirname, '..', '..', 'uploads', req.params.filename);
    const frameNumber = parseInt(req.params.frameNumber);
    
    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({ error: 'Video file not found' });
    }

    const outputPath = path.join(__dirname, '..', '..', 'temp', `frame_${frameNumber}.jpg`);
    fs.ensureDirSync(path.dirname(outputPath));

    // First get video info to determine FPS
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to get video info for frame extraction' });
      }

      const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
      if (!videoStream) {
        return res.status(500).json({ error: 'No video stream found' });
      }

      const fps = eval(videoStream.r_frame_rate);
      const seekTime = (frameNumber - 1) / fps; // Convert frame number to time

      // Use ffmpeg to extract frame
      ffmpeg(videoPath)
        .seekInput(seekTime)
        .frames(1)
        .output(outputPath)
        .on('end', () => {
          res.sendFile(outputPath, (err) => {
            // Clean up temporary file after sending
            fs.removeSync(outputPath);
          });
        })
        .on('error', (err) => {
          res.status(500).json({ error: 'Failed to extract frame' });
        })
        .run();
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// Frame image related routes
// ========================================

/**
 * List all frame images
 * GET /api/video/:filename/frames
 */
app.get('/api/video/:filename/frames', (req, res) => {
  const videoBase = path.parse(req.params.filename).name;
  const framesDir = path.join(__dirname, '..', '..', 'uploads', 'frames', videoBase);
  if (!fs.existsSync(framesDir)) {
    return res.status(404).json({ error: 'Frames not found' });
  }
  const files = fs.readdirSync(framesDir)
    .filter(f => f.endsWith('.png'))
    .sort();
  res.json({ frames: files });
});

/**
 * Get a single frame PNG image
 * GET /api/video/:filename/frame-png/:frameNumber
 */
app.get('/api/video/:filename/frame-png/:frameNumber', (req, res) => {
  const videoBase = path.parse(req.params.filename).name;
  const framesDir = path.join(__dirname, '..', '..', 'uploads', 'frames', videoBase);
  const fname = req.params.frameNumber.padStart(5, '0') + '.png';
  const filePath = path.join(framesDir, fname);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Frame not found' });
  }
  res.sendFile(filePath);
});

module.exports = app; 