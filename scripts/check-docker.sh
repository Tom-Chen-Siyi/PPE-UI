#!/bin/bash

# PPE Video Annotation Viewer - Docker Status Check Script

echo "========================================"
echo "  Docker Status Check"
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
    echo -e "${GREEN}[OK]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Check 1: Docker installation
echo "1. Checking Docker installation..."
if command -v docker &> /dev/null; then
    print_status "Docker is installed: $(docker --version)"
else
    print_error "Docker is not installed"
    echo "   Please install Docker Desktop from: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Check 2: Docker daemon
echo
echo "2. Checking Docker daemon..."
if docker info &> /dev/null; then
    print_status "Docker daemon is running"
    
    # Get Docker system info
    echo "   Docker system info:"
    docker system info | grep -E "(Containers|Images|Storage Driver|Kernel Version)" | sed 's/^/   /'
else
    print_error "Docker daemon is not running"
    echo "   Please start Docker Desktop"
    
    # Try to help on macOS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "   On macOS, you can:"
        echo "   - Open Docker Desktop from Applications"
        echo "   - Or run: open -a Docker"
    fi
    exit 1
fi

# Check 3: Docker Compose
echo
echo "3. Checking Docker Compose..."
if command -v docker-compose &> /dev/null; then
    print_status "Docker Compose is available: $(docker-compose --version)"
else
    print_warning "Docker Compose not found in PATH"
    echo "   This might be included with Docker Desktop"
fi

# Check 4: Project files
echo
echo "4. Checking project files..."
if [ -f "package.json" ]; then
    print_status "Found package.json"
else
    print_error "package.json not found"
    echo "   Please run this script from the project root directory"
    exit 1
fi

if [ -f "docker-compose.yml" ]; then
    print_status "Found docker-compose.yml"
else
    print_error "docker-compose.yml not found"
    exit 1
fi

if [ -f "Dockerfile" ]; then
    print_status "Found Dockerfile"
else
    print_error "Dockerfile not found"
    exit 1
fi

# Check 5: Directories
echo
echo "5. Checking directories..."
if [ -d "uploads" ]; then
    print_status "uploads directory exists"
else
    print_warning "uploads directory not found - will be created"
fi

if [ -d "temp" ]; then
    print_status "temp directory exists"
else
    print_warning "temp directory not found - will be created"
fi

# Check 6: Docker images
echo
echo "6. Checking Docker images..."
if docker images | grep -q "ppe-video-viewer"; then
    print_status "PPE video viewer image exists"
    docker images | grep "ppe-video-viewer" | sed 's/^/   /'
else
    print_warning "PPE video viewer image not found - will be built"
fi

# Check 7: Running containers
echo
echo "7. Checking running containers..."
if docker ps | grep -q "ppe-video-viewer"; then
    print_warning "PPE video viewer container is already running"
    docker ps | grep "ppe-video-viewer" | sed 's/^/   /'
else
    print_status "No PPE video viewer containers are running"
fi

# Check 8: Port availability
echo
echo "8. Checking port availability..."
if lsof -i :3000 &> /dev/null; then
    print_warning "Port 3000 is in use"
    lsof -i :3000 | sed 's/^/   /'
else
    print_status "Port 3000 is available"
fi

# Summary
echo
echo "========================================"
echo "  Summary"
echo "========================================"

if docker info &> /dev/null && [ -f "package.json" ] && [ -f "docker-compose.yml" ]; then
    print_status "All checks passed! You can run the application."
    echo
    echo "To start the application:"
    echo "  ./scripts/start-docker.sh"
    echo "  or"
    echo "  docker-compose up"
else
    print_error "Some checks failed. Please fix the issues above."
    exit 1
fi 