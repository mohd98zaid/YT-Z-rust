@echo off
title YT-Z (Rust) - Music Player & 4K Downloader
cd /d "%~dp0"

echo ========================================================
echo        YT-Z (Rust / Tauri Engine)
echo   High-Performance Music Player & Studio Downloader
echo ========================================================

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
if /i "%1"=="dev" goto launch_dev
if /i "%1"=="build" goto build_release
if /i "%1"=="apk" goto build_apk
if /i "%1"=="server" goto launch_server_only

:menu
echo.
echo   [1] Launch Native Desktop App (Tauri + React + Rust) [Default]
echo   [2] Build Release Native Installer (.msi / .exe)
echo   [3] Build Standalone Android APK
echo   [4] Run Rust Backend Server Only (Axum on Port 47892)
echo   [5] Exit
echo.
set "choice="
set /p choice="Select an option [1-5] (Default: 1): "

if "%choice%"=="" set choice=1
if "%choice%"=="1" goto launch_dev
if "%choice%"=="2" goto build_release
if "%choice%"=="3" goto build_apk
if "%choice%"=="4" goto launch_server_only
if "%choice%"=="5" exit /b 0

:launch_dev
echo.
echo [*] Launching YT-Z Desktop App (Rust Core + React 19 Frontend)...
call npm.cmd run tauri dev
goto end

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

:end
if %errorlevel% neq 0 (
    echo.
    echo [!] Process exited with code %errorlevel%.
    pause
)
