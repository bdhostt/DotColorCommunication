# DotColor Communication - Stop Printer Agent
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "         STOPPING DOTCOLOR COMMUNICATION PRINTER AGENT" -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""

$stoppedCount = 0
$nodeProcs = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue
foreach ($p in $nodeProcs) {
    if ($p.CommandLine -match 'print-agent\.cjs') {
        Stop-Process -Id $p.ProcessId -Force
        Write-Host "Stopped Node.js Print Agent (PID: $($p.ProcessId))" -ForegroundColor Green
        $stoppedCount++
    }
}

if ($stoppedCount -eq 0) {
    Write-Host "No active Printer Agent process was found." -ForegroundColor Yellow
} else {
    Write-Host "`nPrinter Agent successfully stopped." -ForegroundColor Green
}
Write-Host ""
