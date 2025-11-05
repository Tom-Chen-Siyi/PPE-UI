const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');

// 在Docker环境中使用系统安装的ffmpeg，在开发环境中使用静态包
if (process.env.NODE_ENV === 'production') {
  // Docker环境：使用系统安装的ffmpeg
  ffmpeg.setFfmpegPath('/usr/bin/ffmpeg');
  ffmpeg.setFfprobePath('/usr/bin/ffprobe');
} else {
  // 开发环境：使用静态包
  const ffmpegPath = require('ffmpeg-static');
  const ffprobePath = require('ffprobe-static');
  ffmpeg.setFfmpegPath(ffmpegPath);
  ffmpeg.setFfprobePath(ffprobePath.path);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Detect available python executable (python3 preferred, fallback to python)
const { spawnSync } = require('child_process');
function findPythonCmd() {
  const candidates = ['python3', 'python'];
  for (const cmd of candidates) {
    try {
      const res = spawnSync(cmd, ['--version'], { stdio: 'ignore' });
      if (res.status === 0) return cmd;
    } catch (e) {
      // ignore
    }
  }
  return null;
}
const pythonCmd = findPythonCmd();
if (!pythonCmd) {
  console.warn('⚠️  Python not found in PATH. Frame extraction will fail until Python is installed and available as "python" or "python3".');
}

// 存储Python进程的实时进度信息
const extractionProgress = new Map();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    fs.ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

module.exports = {
  app,
  PORT,
  upload,
  extractionProgress,
  path,
  fs,
  ffmpeg
  ,pythonCmd
}; 