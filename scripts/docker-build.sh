#!/bin/bash

# PPE Video Annotation Viewer - Docker Build Script

set -e

echo "========================================"
echo "  PPE Video Annotation Viewer"
echo "  Docker Build Script"
echo "========================================"
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

print_status "Docker is available and running"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root directory."
    exit 1
fi

print_status "Found package.json in current directory"

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p uploads temp uploads/frames

# Build the Docker image
print_status "Building Docker image..."
docker build -t ppe-video-viewer:latest .

if [ $? -eq 0 ]; then
    print_status "Docker image built successfully!"
else
    print_error "Failed to build Docker image"
    exit 1
fi

# Show built images
print_status "Available Docker images:"
docker images | grep ppe-video-viewer

echo
print_status "Build completed successfully!"
echo
echo "To run the application:"
echo "  docker-compose up"
echo
echo "Or run manually:"
echo "  docker run -p 3000:3000 -v \$(pwd)/uploads:/app/uploads -v \$(pwd)/temp:/app/temp ppe-video-viewer:latest"
echo
echo "The application will be available at: http://localhost:3000" 