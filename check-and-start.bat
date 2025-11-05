@echo off
setlocal enabledelayedexpansion

cls
echo === PPE Video Viewer - Dependency Check and Start ===
echo.

:: Check Node.js
echo Checking Node.js installation...
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    echo After installation, restart this script
    pause
    exit /b 1
)
echo Node.js Version: 
node --version
if errorlevel 1 (
    echo [ERROR] Failed to get Node.js version
    pause
    exit /b 1
)

:: Check npm
echo.
echo Checking npm installation...
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
echo npm version:
call npm -v || (
    echo [ERROR] npm version check failed
    pause
    exit /b 1
)

:: Check Python
echo.
echo Checking Python installation...
where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python is not installed or not in PATH
    echo Please install Python from https://www.python.org/downloads/
    echo Be sure to check "Add Python to PATH" during installation
    pause
    exit /b 1
)
echo Python Version: 
python --version
if errorlevel 1 (
    echo [ERROR] Failed to get Python version
    pause
    exit /b 1
)

:: Check Python packages
echo.
echo Checking Python packages...
python -c "import cv2; print('OpenCV:', cv2.__version__)" 2>nul
if errorlevel 1 (
    echo [ERROR] OpenCV package is not installed
    echo Run: pip install opencv-python
    pause
    exit /b 1
)

python -c "from PIL import Image; print('Pillow:', Image.__version__)" 2>nul
if errorlevel 1 (
    echo [ERROR] Pillow package is not installed
    echo Run: pip install Pillow
    pause
    exit /b 1
)

python -c "import numpy; print('NumPy:', numpy.__version__)" 2>nul
if errorlevel 1 (
    echo [ERROR] NumPy package is not installed
    echo Run: pip install numpy
    pause
    exit /b 1
)

:: Check if node_modules exists
echo.
echo Checking Node.js dependencies...
if not exist "node_modules\" (
    echo [ERROR] node_modules folder not found
    echo Please run: npm install
    pause
    exit /b 1
)

:: Check if uploads folders exist
echo.
echo Checking required directories...
if not exist "uploads\" (
    echo Creating uploads directory...
    mkdir "uploads"
)
if not exist "uploads\frames\" (
    echo Creating frames directory...
    mkdir "uploads\frames"
)

:: All checks passed, start the server
cls
echo === All Dependency Checks Passed ===
echo.
echo Node.js: OK
echo npm: OK
echo Python: OK
echo Required packages: OK
echo Required directories: OK
echo.
echo Starting the server...
echo The application will be available at http://localhost:3000
echo Press Ctrl+C to stop the server when needed
echo.
echo Starting in 3 seconds...
timeout /t 3 >nul

:: Start the server
node backend/server.js

:: If server fails to start
if errorlevel 1 (
    echo.
    echo [ERROR] Server failed to start
    echo Please check the error messages above
    pause
    exit /b 1
)