@echo off
setlocal enabledelayedexpansion

title Stop PRANGARA Services
cd /d "%~dp0"

echo =====================================================================
echo                Stopping PRANGARA Services
echo =====================================================================
echo.

echo [INFO] Stopping FastAPI Backend processes (Port 8000)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do (
    echo Terminating PID %%a on port 8000...
    taskkill /F /PID %%a >nul 2>&1
)

echo [INFO] Stopping Vite Frontend processes (Port 5173)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
    echo Terminating PID %%a on port 5173...
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo [OK] All PRANGARA backend and frontend processes have been stopped.
echo.
pause
