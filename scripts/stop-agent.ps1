# DotColor Communication - Stop Printer Agent
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "         STOPPING DOTCOLOR COMMUNICATION PRINTER AGENT" -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""

$stoppedCount = 0

# 1. Stop any wscript watchdogs running run-printer-silent.vbs
Get-CimInstance Win32_Process -Filter "Name = 'wscript.exe'" -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -match 'run-printer-silent\.vbs'
} | ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    Write-Host "Stopped Printer Agent Watchdog (PID: $($_.ProcessId))" -ForegroundColor Green
    $stoppedCount++
}

# 2. Stop any node print agents
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -match 'print-agent\.cjs'
} | ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    Write-Host "Stopped Node.js Print Agent (PID: $($_.ProcessId))" -ForegroundColor Green
    $stoppedCount++
}

# 3. Stop any cmd.exe loops running start-printer-agent.bat
Get-CimInstance Win32_Process -Filter "Name = 'cmd.exe'" -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -match 'start-printer-agent\.bat'
} | ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    Write-Host "Stopped Printer Agent Terminal (PID: $($_.ProcessId))" -ForegroundColor Green
    $stoppedCount++
}

# 4. Stop any process locking port 9123
Get-NetTCPConnection -LocalPort 9123 -ErrorAction SilentlyContinue | ForEach-Object {
    if ($_.OwningProcess -ne 0) {
        Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
        Write-Host "Stopped process holding Port 9123 (PID: $($_.OwningProcess))" -ForegroundColor Green
        $stoppedCount++
    }
}

if ($stoppedCount -eq 0) {
    Write-Host "No active Printer Agent process was found." -ForegroundColor Yellow
} else {
    Write-Host "`nPrinter Agent and all related processes successfully stopped." -ForegroundColor Green
}
Write-Host ""

