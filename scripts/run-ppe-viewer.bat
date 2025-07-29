@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo ========================================
echo   PPE Video Annotation Viewer
echo   Docker Runner for Windows
echo ========================================
echo.

:: Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not installed or not in PATH
    echo Please install Docker Desktop for Windows first
    echo Download from: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

echo [OK] Docker is installed

:: Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not running
    echo Please start Docker Desktop first
    pause
    exit /b 1
)

echo [OK] Docker is running

:: Check if we're in the right directory
if not exist "package.json" (
    echo ERROR: package.json not found
    echo Please run this script from the project root directory
    pause
    exit /b 1
)

echo [OK] Found package.json

:: Create necessary directories
if not exist "uploads" mkdir uploads
if not exist "temp" mkdir temp
if not exist "uploads\frames" mkdir uploads\frames

echo [OK] Directories created

:: Check if Docker image exists
docker images ppe-video-viewer:latest >nul 2>&1
if %errorlevel% neq 0 (
    echo Building Docker image...
    docker build -t ppe-video-viewer:latest .
    if %errorlevel% neq 0 (
        echo ERROR: Failed to build Docker image
        pause
        exit /b 1
    )
    echo [OK] Docker image built successfully
) else (
    echo [OK] Docker image already exists
)

:: Stop existing container if running
docker stop ppe-video-viewer >nul 2>&1
docker rm ppe-video-viewer >nul 2>&1

:: Run the container
echo.
echo Starting PPE Video Annotation Viewer...
echo The application will be available at: http://localhost:3000
echo Press Ctrl+C to stop the container
echo.

docker run --name ppe-video-viewer ^
    -p 3000:3000 ^
    -v "%CD%\uploads:/app/uploads" ^
    -v "%CD%\temp:/app/temp" ^
    --restart unless-stopped ^
    ppe-video-viewer:latest

echo.
echo Container stopped
pause 