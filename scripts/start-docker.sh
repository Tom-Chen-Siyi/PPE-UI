#!/bin/bash

# PPE Video Annotation Viewer - Docker Start Script for macOS/Linux

set -e

echo "========================================"
echo "  PPE Video Annotation Viewer"
echo "  Docker Start Script"
echo "========================================"
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker Desktop first."
    echo "Download from: https://www.docker.com/products/docker-desktop"
    exit 1
fi

print_status "Docker is installed: $(docker --version)"

# Check if Docker is running
if ! docker info &> /dev/null; then
    print_error "Docker daemon is not running!"
    echo
    print_step "Starting Docker Desktop..."
    
    # Try to start Docker Desktop on macOS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        print_status "Detected macOS - attempting to start Docker Desktop..."
        
        # Check if Docker Desktop app exists
        if [ -d "/Applications/Docker.app" ]; then
            print_status "Found Docker Desktop in /Applications"
            open -a Docker
            print_warning "Docker Desktop is starting. Please wait..."
            
            # Wait for Docker to start
            echo "Waiting for Docker to start..."
            for i in {1..30}; do
                if docker info &> /dev/null; then
                    print_status "Docker is now running!"
                    break
                fi
                echo -n "."
                sleep 2
            done
            
            if ! docker info &> /dev/null; then
                print_error "Docker failed to start automatically."
                echo "Please manually start Docker Desktop and try again."
                exit 1
            fi
        else
            print_error "Docker Desktop not found in /Applications"
            echo "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop"
            exit 1
        fi
    else
        print_error "Please start Docker Desktop manually and try again."
        exit 1
    fi
fi

print_status "Docker is running!"

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not available"
    echo "Please install Docker Compose or use Docker Desktop"
    exit 1
fi

print_status "Docker Compose is available: $(docker-compose --version)"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root directory."
    exit 1
fi

print_status "Found package.json in current directory"

# Check if docker-compose.yml exists
if [ ! -f "docker-compose.yml" ]; then
    print_error "docker-compose.yml not found"
    echo "Please ensure you have the Docker configuration files"
    exit 1
fi

print_status "Found docker-compose.yml"

# Create necessary directories
print_step "Creating necessary directories..."
mkdir -p uploads temp uploads/frames
print_status "Directories created"

# Check if image exists, if not build it
print_step "Checking Docker image..."
if ! docker images | grep -q "ppe-video-viewer"; then
    print_status "Building Docker image..."
    docker build -t ppe-video-viewer:latest .
    if [ $? -eq 0 ]; then
        print_status "Docker image built successfully!"
    else
        print_error "Failed to build Docker image"
        exit 1
    fi
else
    print_status "Docker image already exists"
fi

# Stop existing containers
print_step "Stopping existing containers..."
docker-compose down 2>/dev/null || true

# Start the application
print_step "Starting PPE Video Annotation Viewer..."
echo
print_status "The application will be available at: http://localhost:3000"
print_status "Press Ctrl+C to stop the application"
echo

# Start with docker-compose
docker-compose up

echo
print_status "Application stopped"
echo
echo "Useful commands:"
echo "  docker-compose up -d          # Start in background"
echo "  docker-compose down           # Stop the application"
echo "  docker-compose logs -f        # View logs"
echo "  docker-compose restart        # Restart the application" 