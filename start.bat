@echo off
echo ============================
echo GC-Writer Assistant Starting
echo ============================
echo.
echo Node.js check:
where node
echo.
echo NPM check:
where npm
echo.
echo Current directory:
cd
echo.
echo Starting server...
call npm run dev
echo.
echo Server stopped.
pause
