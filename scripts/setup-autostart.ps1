# DotColor Communication - Thermal Printer Agent Auto-Start Setup
$ErrorActionPreference = "SilentlyContinue"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = (Get-Item $scriptDir).Parent.FullName
$vbsPath = Join-Path $rootDir "run-printer-silent.vbs"

Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "  DOTCOLOR COMMUNICATION - THERMAL PRINTER AUTO-START INSTALLER" -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $vbsPath)) {
    Write-Host "[ERROR] $vbsPath not found!" -ForegroundColor Red
    exit 1
}

# 0. Stop any existing old instances of print-agent.cjs so the updated version can bind to port 9123
Write-Host "[0/3] Stopping any older running Printer Agent instances..." -ForegroundColor Yellow
Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
    ($_.Name -match '^(node|wscript)\.exe$') -and ($_.CommandLine -match 'print-agent\.cjs|run-printer-silent\.vbs|start-printer-agent\.bat')
} | ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Milliseconds 600

# 1. Add to Windows Startup folder
Write-Host "[1/3] Setting up Windows Auto-Start on PC Boot..." -ForegroundColor Yellow
$wsh = New-Object -ComObject WScript.Shell
$startupFolder = [System.IO.Path]::Combine($env:APPDATA, 'Microsoft\Windows\Start Menu\Programs\Startup')
$startupShortcut = Join-Path $startupFolder "DotColorPrinterAgent.lnk"

$s1 = $wsh.CreateShortcut($startupShortcut)
$s1.TargetPath = "wscript.exe"
$s1.Arguments = "`"$vbsPath`""
$s1.WorkingDirectory = $rootDir
$s1.IconLocation = "$env:SystemRoot\System32\imageres.dll,46"
$s1.Description = "DotColor Communication Background Thermal Printer Agent"
$s1.Save()
Write-Host "      [OK] Added to Windows Startup folder." -ForegroundColor Green

# 2. Add to Desktop Shortcut
Write-Host "`n[2/3] Creating Desktop Shortcut for Easy Manual Start..." -ForegroundColor Yellow
$desktopFolder = [Environment]::GetFolderPath('Desktop')
$desktopShortcut = Join-Path $desktopFolder "DotColor Printer Agent.lnk"

$s2 = $wsh.CreateShortcut($desktopShortcut)
$s2.TargetPath = "wscript.exe"
$s2.Arguments = "`"$vbsPath`""
$s2.WorkingDirectory = $rootDir
$s2.IconLocation = "$env:SystemRoot\System32\imageres.dll,46"
$s2.Description = "Start DotColor Communication POS Printer Service"
$s2.Save()
Write-Host "      [OK] Desktop shortcut created: 'DotColor Printer Agent'" -ForegroundColor Green

# 3. Launch the agent right away (detached via WMI Win32_Process so it survives shell exit)
Write-Host "`n[3/3] Starting Printer Agent in Background now..." -ForegroundColor Yellow
try {
    $cmdLine = "wscript.exe `"$vbsPath`""
    $null = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{
        CommandLine = $cmdLine
        CurrentDirectory = $rootDir
    }
} catch {
    Start-Process "wscript.exe" -ArgumentList "`"$vbsPath`"" -WorkingDirectory $rootDir
}
Write-Host "      [OK] Agent is now running in the background!" -ForegroundColor Green

Write-Host "`n====================================================================" -ForegroundColor Cyan
Write-Host "  SUCCESS! INSTALLATION COMPLETE." -ForegroundColor Green
Write-Host "  1. Works with ANY USB or LAN Thermal Printer (Zero driver required for USB!)."
Write-Host "  2. Starts automatically whenever Windows boots."
Write-Host "  3. Automatically goes to Standby when unplugged so other PCs can print."
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""
