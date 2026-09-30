@echo off
title DotColor Communication - Thermal Printer Bridge Agent (80 Printer)
color 0A
cd /d "%~dp0"
cls
echo ================================================================
echo    DOTCOLOR COMMUNICATION - THERMAL PRINTER BRIDGE AGENT
echo ================================================================
echo.
echo  Primary Printer : 80 Printer / Thermal Receipt Printer
echo  Connection Mode : Direct Hardware (USB / LAN 192.168.1.87)
echo.
set CLOUD_URL=http://localhost:5000
if not "%~1"=="" set CLOUD_URL=%~1
echo  Cloud Target    : %CLOUD_URL%
echo.
echo ================================================================
echo  DO NOT CLOSE THIS WINDOW while operating DotColor Communication!
echo  All 80mm thermal receipts will print instantly through this agent.
echo ================================================================
echo.

:: Pre-check: Free port 9123 and stop any conflicting background printer bridges
echo [*] Initializing port 9123 and checking background services...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$conns = Get-NetTCPConnection -LocalPort 9123 -ErrorAction SilentlyContinue; foreach ($c in $conns) { Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue }; Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object { ($_.Name -match '^(node|wscript)\.exe$') -and ($_.CommandLine -match 'print-agent\.cjs|run-printer-silent\.vbs') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>&1
timeout /t 1 /nobreak >nul

:agent_loop
node print-agent.cjs "%CLOUD_URL%"
set EXIT_CODE=%errorlevel%

if %EXIT_CODE% equ 42 (
    echo.
    echo ================================================================
    echo  [WARNING] Port 9123 is currently occupied by another program.
    echo  To release it:
    echo    1. Double-click "stop-printer-agent.bat"
    echo    2. Re-open "start-printer-agent.bat"
    echo ================================================================
    echo.
    pause
    exit /b 42
)

echo.
echo [WARNING] Printer bridge disconnected or exited (Code %EXIT_CODE%).
echo [RETRY] Reconnecting in 3 seconds...
timeout /t 3 /nobreak >nul
goto agent_loop

