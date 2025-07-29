// ========================================
// Main server file for PPE Video Annotation Viewer
// ========================================

// Import config
const { app, PORT } = require('./server_config');

// Import route modules
require('./routes/videoRoutes');
require('./routes/uploadRoutes');
require('./routes/frameRoutes');

// ========================================
// Base route
// ========================================

/**
 * Main page
 * GET /
 */
app.get('/', (req, res) => {
  res.sendFile(require('path').join(__dirname, '..', 'public', 'index_new.html'));
});

/**
 * Health check endpoint
 * GET /health
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: require('../package.json').version
  });
});

// ========================================
// Server startup
// ========================================

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Upload directory: ${require('path').join(__dirname, '..', 'uploads')}`);
  console.log(`📊 Frame extraction progress monitoring enabled`);
  console.log(`🎬 PPE Video Annotation Viewer ready!`);
}); 