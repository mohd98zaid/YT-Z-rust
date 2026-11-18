@echo off
title YT-Z (Rust) - Launching App...
cd /d "%~dp0"

echo [*] Starting YT-Z (Rust / Tauri Desktop App)...
call npm.cmd run tauri dev

if %errorlevel% neq 0 (
    echo.
    echo [!] Failed to launch YT-Z.
    pause
)
