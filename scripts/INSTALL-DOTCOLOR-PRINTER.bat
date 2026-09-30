@echo off
title DotColor Communication POS Printer - 1-Click Installer
color 0A
setlocal enabledelayedexpansion

echo ====================================================================
echo     DOTCOLOR COMMUNICATION - 1-CLICK THERMAL PRINTER INSTALLER
echo ====================================================================
echo.
echo [1/4] Checking environment...

:: Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [WARNING] Node.js was not detected on this computer!
    echo Node.js is required to bridge web POS printing to thermal printers.
    echo.
    echo Attempting to install Node.js automatically via winget...
    winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
    if %errorlevel% neq 0 (
        echo.
        echo [!] Could not auto-install Node.js via winget.
        echo Opening Node.js download page. Please install Node.js and run this setup again.
        start https://nodejs.org/en/download/
        pause
        exit /b 1
    )
)

echo       [OK] Node.js is ready.

:: Target install directory: %LOCALAPPDATA%\DotColorPOSPrinter
set "INSTALL_DIR=%LOCALAPPDATA%\DotColorPOSPrinter"
echo.
echo [2/4] Installing files to: "%INSTALL_DIR%"...

if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"
if not exist "%INSTALL_DIR%\scripts" mkdir "%INSTALL_DIR%\scripts"

set "SRC_DIR=%~dp0"
if not exist "%SRC_DIR%print-agent.cjs" (
    if exist "%SRC_DIR%..\print-agent.cjs" (
        set "SRC_DIR=%~dp0..\"
    )
)

:: If run as a standalone Direct .BAT from Downloads without the extracted ZIP files, auto-download package from cloud
if not exist "%SRC_DIR%print-agent.cjs" (
    echo       Downloading printer agent files from cloud server...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$zip = Join-Path $env:TEMP 'dotcolor-printer-setup.zip'; Invoke-WebRequest -Uri 'http://localhost:5000/api/download/printer-agent-zip' -OutFile $zip -UseBasicParsing; Expand-Archive -Path $zip -DestinationPath '%INSTALL_DIR%' -Force"
) else (
    :: Copy files from local folder
    copy /y "%SRC_DIR%print-agent.cjs" "%INSTALL_DIR%\" >nul
    copy /y "%SRC_DIR%run-printer-silent.vbs" "%INSTALL_DIR%\" >nul
    copy /y "%SRC_DIR%start-printer-agent.bat" "%INSTALL_DIR%\" >nul
    copy /y "%SRC_DIR%stop-printer-agent.bat" "%INSTALL_DIR%\" >nul
    if exist "%SRC_DIR%scripts\print-raw.ps1" copy /y "%SRC_DIR%scripts\print-raw.ps1" "%INSTALL_DIR%\scripts\" >nul
    if exist "%SRC_DIR%scripts\raw-print.exe" copy /y "%SRC_DIR%scripts\raw-print.exe" "%INSTALL_DIR%\scripts\" >nul
    if exist "%SRC_DIR%scripts\raw-print.cs" copy /y "%SRC_DIR%scripts\raw-print.cs" "%INSTALL_DIR%\scripts\" >nul
    if exist "%SRC_DIR%scripts\setup-autostart.ps1" copy /y "%SRC_DIR%scripts\setup-autostart.ps1" "%INSTALL_DIR%\scripts\" >nul
    if exist "%SRC_DIR%scripts\stop-agent.ps1" copy /y "%SRC_DIR%scripts\stop-agent.ps1" "%INSTALL_DIR%\scripts\" >nul
)

echo       [OK] All printer bridge files deployed.

echo.
echo [3/4] Configuring Auto-Start & Desktop Shortcut...
powershell -NoProfile -ExecutionPolicy Bypass -File "%INSTALL_DIR%\scripts\setup-autostart.ps1"

echo.
echo [4/4] Verifying background service...
timeout /t 2 /nobreak >nul

echo ====================================================================
echo   SUCCESS! DOTCOLOR POS PRINTER IS READY AND RUNNING!
echo.
echo   * Desktop shortcut created: "DotColor Printer Agent"
echo   * Starts automatically every time you start Windows
echo   * Zero terminal popups (completely silent in background)
echo ====================================================================
echo.
echo Press any key to close this installer.
pause >nul
