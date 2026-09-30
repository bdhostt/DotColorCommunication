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

:agent_loop
node print-agent.cjs "%CLOUD_URL%"
echo.
echo [WARNING] Printer bridge disconnected or exited.
echo [RETRY] Reconnecting in 3 seconds...
timeout /t 3 /nobreak >nul
goto agent_loop
