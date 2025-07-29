@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo ========================================
echo   PPE Video Annotation Viewer
echo   Quick Start with Docker Compose
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

:: Check if docker-compose is available
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: docker-compose is not available
    echo Please install Docker Compose or use Docker Desktop
    pause
    exit /b 1
)

echo [OK] Docker Compose is available

:: Check if we're in the right directory
if not exist "package.json" (
    echo ERROR: package.json not found
    echo Please run this script from the project root directory
    pause
    exit /b 1
)

echo [OK] Found package.json

:: Check if docker-compose.yml exists
if not exist "docker-compose.yml" (
    echo ERROR: docker-compose.yml not found
    echo Please ensure you have the Docker configuration files
    pause
    exit /b 1
)

echo [OK] Found docker-compose.yml

:: Create necessary directories
if not exist "uploads" mkdir uploads
if not exist "temp" mkdir temp
if not exist "uploads\frames" mkdir uploads\frames

echo [OK] Directories created

:: Start the application with docker-compose
echo.
echo Starting PPE Video Annotation Viewer with Docker Compose...
echo The application will be available at: http://localhost:3000
echo Press Ctrl+C to stop the application
echo.

docker-compose up

echo.
echo Application stopped
echo To start in background mode, use: docker-compose up -d
echo To stop background mode, use: docker-compose down
pause 