@echo off
setlocal
cd /d "%~dp0"

echo ============================
echo GC-Writer Assistant Quick Start
echo ============================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found.
  echo Please install Node.js 20 first: https://nodejs.org/
  echo After installation, run this script again.
  echo.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm was not found.
  echo Please reinstall Node.js 20 and make sure npm is included.
  echo.
  pause
  exit /b 1
)

if not exist "package.json" (
  echo [ERROR] package.json was not found in this folder.
  echo Please place this script in the project root folder.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing dependencies for the first time...
  call npm install
  if errorlevel 1 (
    echo.
    echo [ERROR] npm install failed.
    echo Please check your network connection and try again.
    echo.
    pause
    exit /b 1
  )
  echo.
)

echo Starting development server...
start "" http://localhost:3000
call npm run dev

echo.
echo Server stopped.
pause
endlocal
