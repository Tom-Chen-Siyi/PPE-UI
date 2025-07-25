#!/bin/bash

# PPE Video Annotation Viewer - Backend Starter
# ========================================

echo "🚀 PPE Video Annotation Viewer - Backend Starter"
echo "================================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    echo "Please install Node.js first: https://nodejs.org/"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if backend folder exists
if [ ! -d "backend" ]; then
    echo "❌ Error: backend folder not found"
    echo "Please make sure the backend files are organized in the backend folder"
    exit 1
fi

# Check for required backend files
if [ ! -f "backend/server.js" ]; then
    echo "❌ Error: backend/server.js not found"
    exit 1
fi

if [ ! -f "backend/server_config.js" ]; then
    echo "❌ Error: backend/server_config.js not found"
    exit 1
fi

echo "✅ Backend files found"
echo "📁 Backend structure:"
echo "   ├── server.js"
echo "   ├── server_config.js"
echo "   ├── routes/"
echo "   │   ├── videoRoutes.js"
echo "   │   ├── uploadRoutes.js"
echo "   │   └── frameRoutes.js"
echo "   ├── utils/"
echo "   │   └── parsePythonOutput.js"
echo "   ├── get_frame.py"
echo "   └── id_tracking_new.py"

echo ""
echo "🌐 Starting backend server..."
echo "📍 Server will run on: http://localhost:3000"
echo "📁 Upload directory: $(pwd)/uploads"
echo ""

# Start backend server
cd backend
node server.js
 