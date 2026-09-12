@echo off
setlocal enabledelayedexpansion

title PRANGARA Launcher
cd /d "%~dp0"

echo =====================================================================
echo             PRANGARA - Industrial Decarbonization Platform
echo =====================================================================
echo.

:: 1. Check Python virtual environment
set "PYTHON_EXE=%~dp0backend\.venv\Scripts\python.exe"
if not exist "%PYTHON_EXE%" (
    echo [INFO] Virtual environment not found in backend\.venv. Checking system python...
    where python >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] Python was not found in PATH or backend\.venv!
        echo Please install Python 3.11+ or create the virtualenv in backend\.venv.
        pause
        exit /b 1
    )
    set "PYTHON_EXE=python"
)
echo [OK] Python runtime: %PYTHON_EXE%

:: 2. Check Node.js and npm
where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js / npm was not found in PATH!
    echo Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)
echo [OK] Node.js / npm runtime detected.

:: 3. Verify / Install Frontend dependencies if needed
if not exist "%~dp0apps\web\node_modules" (
    echo [INFO] Installing frontend dependencies in apps\web (npm install)...
    pushd "%~dp0apps\web"
    call npm install
    popd
    if errorlevel 1 (
        echo [ERROR] Failed to install npm dependencies.
        pause
        exit /b 1
    )
)

:: 4. Ensure Database and Demo Seed Data exist
echo [INFO] Verifying database tables and demo seed data...
pushd "%~dp0backend"
"%PYTHON_EXE%" -m scripts.seed_demo
popd

:: 5. Launch FastAPI Backend on Port 8000
echo [INFO] Launching FastAPI Backend on http://127.0.0.1:8000 ...
start "PRANGARA Backend API (Port 8000)" cmd /c "cd /d "%~dp0backend" && "%PYTHON_EXE%" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

:: 6. Launch Vite Web Dashboard on Port 5173
echo [INFO] Launching Vite Web Dashboard on http://127.0.0.1:5173 ...
start "PRANGARA Web Dashboard (Port 5173)" cmd /c "cd /d "%~dp0apps\web" && npm run dev"

:: 7. Wait briefly and open browser
echo [INFO] Waiting for servers to initialize...
timeout /t 3 /nobreak >nul

echo [INFO] Opening Web Dashboard in your default browser...
start http://127.0.0.1:5173/

echo.
echo =====================================================================
echo                    PRANGARA IS RUNNING!
echo =====================================================================
echo   Web Dashboard:   http://127.0.0.1:5173/
echo   Backend API:     http://127.0.0.1:8000/
echo   API Swagger UI:  http://127.0.0.1:8000/docs
echo.
echo   Demo Accounts (Password: prangara-demo-2026):
echo     - Plant Owner:     owner@demo.prangara.example
echo     - Compliance Off:  compliance@demo.prangara.example
echo     - Platform Admin:  admin@demo.prangara.example
echo.
echo   To stop all services, run stop.bat or close the launched windows.
echo =====================================================================
echo.
pause
