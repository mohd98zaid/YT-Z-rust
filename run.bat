@echo off
title YT-Z (Rust) - Music Player & 4K Downloader
cd /d "%~dp0"

:: Check Rust / Cargo
where cargo >nul 2>nul
if errorlevel 1 (
    echo [!] Rust/Cargo was not found in PATH.
    echo Please install Rust from https://rustup.rs/
    pause
    exit /b 1
)

:: Check Node.js / npm
where npm >nul 2>nul
if errorlevel 1 (
    echo [!] Node.js was not found in PATH.
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: If node_modules missing, install
if not exist "node_modules\" (
    echo [*] First run detected. Installing frontend dependencies...
    call npm.cmd install
)

:: Direct argument dispatch
if /i "%1"=="dev" goto launch_app
if /i "%1"=="build" goto build_release
if /i "%1"=="apk" goto build_apk
if /i "%1"=="server" goto launch_server_only

:launch_app
cls
echo ========================================================
echo        YT-Z (Rust / Tauri Engine)
echo   High-Performance Music Player & Studio Downloader
echo ========================================================
echo.
echo [*] Launching dedicated native desktop app...
echo.

:: Launch the dedicated app
start "YT-Z Tauri App" npm.cmd run tauri dev

:: Short pause for engine initialization
timeout /t 3 /nobreak >nul

:action_loop
cls
echo ========================================================
echo        YT-Z (Rust / Tauri Engine)
echo ========================================================
echo.
echo   [✓] Dedicated Native Desktop App is running!
echo   [✓] Local Stream URL:   http://127.0.0.1:47892
echo.
echo --------------------------------------------------------
echo   Actions:
echo.
echo   [O] Open in Web Browser (Chrome / Edge / Firefox)
echo   [R] Restart Dedicated App
echo   [B] Build Optimized Release Package (.msi / .exe)
echo   [Q] Quit ^& Stop YT-Z
echo --------------------------------------------------------
echo.
set "choice="
set /p choice="Enter an action [O / R / B / Q] (Default: Q): "

if /i "%choice%"=="o" (
    echo [*] Opening in default web browser...
    start http://127.0.0.1:47892
    goto action_loop
)

if /i "%choice%"=="r" (
    echo.
    echo [*] Restarting dedicated app...
    taskkill /f /fi "WINDOWTITLE eq YT-Z Tauri App*" >nul 2>nul
    timeout /t 1 /nobreak >nul
    goto launch_app
)

if /i "%choice%"=="b" goto build_release

if /i "%choice%"=="q" goto do_quit
if "%choice%"=="" goto do_quit

goto action_loop

:build_release
echo.
echo [*] Building optimized release package (.msi / .exe installer)...
call npm.cmd run tauri build
goto end

:build_apk
echo.
echo [*] Building Standalone Android APK via Tauri v2...
call npm.cmd run tauri android build --apk
goto end

:launch_server_only
echo.
echo [*] Running Rust Axum backend core on http://127.0.0.1:47892...
cd /d "%~dp0src-tauri"
cargo run
cd /d "%~dp0"
goto end

:do_quit
echo.
echo [*] Shutting down YT-Z...
taskkill /f /fi "WINDOWTITLE eq YT-Z Tauri App*" >nul 2>nul
taskkill /f /im yt-z-rust.exe >nul 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":47892" ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>nul
)
echo [✓] YT-Z stopped cleanly.
exit /b 0

:end
if %errorlevel% neq 0 (
    echo.
    echo [!] Process exited with code %errorlevel%.
    pause
)
