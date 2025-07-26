@echo off
echo Starting StockPlay Frontend Development Server...
cd /d "e:\python projects\StockPlay\Frontend"
echo Current directory: %CD%
echo.
echo Installing npm dependencies...
npm install
echo.
echo Starting Vite development server...
npm run dev
pause
