// ========================================
// Python output parsing tool
// ========================================

/**
 * Parse Python script output to extract progress information
 * @param {string} output - Original output from Python script
 * @param {string} videoBase - Video filename (without extension)
 * @returns {object} Parsed progress information
 */
function parsePythonOutput(output, videoBase) {
  const lines = output.split('\n');
  let progress = 0;
  let framesSaved = 0;
  let totalFrames = null;
  let status = 'starting';
  
  for (const line of lines) {
    // Parse video info
    if (line.includes('Video info:')) {
      const match = line.match(/(\d+) frames/);
      if (match) {
        totalFrames = parseInt(match[1]);
      }
    }
    
    // Parse progress info
    if (line.includes('Progress:')) {
      const progressMatch = line.match(/Progress: ([\d.]+)%/);
      const framesMatch = line.match(/\((\d+) frames saved\)/);
      if (progressMatch) {
        progress = parseFloat(progressMatch[1]);
      }
      if (framesMatch) {
        framesSaved = parseInt(framesMatch[1]);
      }
      status = 'extracting';
    }
    
    // Parse processing status
    if (line.includes('Processing frame')) {
      status = 'processing';
    }
    
    // Parse completion status
    if (line.includes('Frame extraction completed:')) {
      status = 'completed';
      progress = 100;
      // Extract saved frames from completion info
      const framesMatch = line.match(/(\d+) frames saved/);
      if (framesMatch) {
        framesSaved = parseInt(framesMatch[1]);
      }
    }
    
    // Parse error status
    if (line.includes('Error:')) {
      status = 'error';
    }
  }
  
  return {
    progress: Math.min(progress, 100),
    framesSaved,
    totalFrames,
    status,
    lastUpdate: Date.now()
  };
}

module.exports = { parsePythonOutput }; 