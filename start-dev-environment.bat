@echo off
title StockPlay Development Environment
color 0A

echo ========================================
echo    StockPlay Development Environment
echo ========================================
echo.

echo [1/3] Starting Backend Server...
echo.
start "Backend Server" cmd /c "cd /d \"e:\python projects\StockPlay\stock_api\" && python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload"

echo Waiting 5 seconds for backend to start...
timeout /t 5 /nobreak >nul

echo [2/3] Testing Backend Connection...
curl -s http://localhost:8001/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Backend server is running on port 8001
) else (
    echo ✗ Backend server failed to start
    echo Please check the Backend Server window for errors
)

echo.
echo [3/3] Starting Frontend Development Server...
echo.
start "Frontend Server" cmd /c "cd /d \"e:\python projects\StockPlay\Frontend\" && npm run dev"

echo.
echo ========================================
echo   Development Environment Started!
echo ========================================
echo.
echo Backend: http://localhost:8001
echo Frontend: http://localhost:5173
echo.
echo Press any key to stop all servers...
pause >nul

echo.
echo Stopping servers...
taskkill /fi "WindowTitle eq Backend Server*" /t /f >nul 2>&1
taskkill /fi "WindowTitle eq Frontend Server*" /t /f >nul 2>&1
echo Development environment stopped.
pause
