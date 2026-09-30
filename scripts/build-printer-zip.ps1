# Build DotColorPrinter-Setup.zip
$ErrorActionPreference = "Stop"
$rootDir = (Get-Item $PSScriptRoot).Parent.FullName
$pkgDir = Join-Path $rootDir "pkg-build-tmp"
$downloadsDir = Join-Path $rootDir "public\downloads"

if (Test-Path $pkgDir) { Remove-Item $pkgDir -Recurse -Force }
New-Item -ItemType Directory -Path $pkgDir -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $pkgDir "scripts") -Force | Out-Null

Copy-Item (Join-Path $rootDir "print-agent.cjs") $pkgDir -Force
Copy-Item (Join-Path $rootDir "run-printer-silent.vbs") $pkgDir -Force
Copy-Item (Join-Path $rootDir "start-printer-agent.bat") $pkgDir -Force
Copy-Item (Join-Path $rootDir "stop-printer-agent.bat") $pkgDir -Force
Copy-Item (Join-Path $rootDir "scripts\INSTALL-DOTCOLOR-PRINTER.bat") (Join-Path $pkgDir "INSTALL-DOTCOLOR-PRINTER.bat") -Force
Copy-Item (Join-Path $rootDir "scripts\INSTALL-DOTCOLOR-PRINTER.bat") (Join-Path $pkgDir "INSTALL-POS-PRINTER.bat") -Force

Get-ChildItem (Join-Path $rootDir "scripts") -File | ForEach-Object {
    Copy-Item $_.FullName (Join-Path $pkgDir "scripts") -Force
}

if (-not (Test-Path $downloadsDir)) {
    New-Item -ItemType Directory -Path $downloadsDir -Force | Out-Null
}

$zipPath = Join-Path $downloadsDir "DotColorPrinter-Setup.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

Compress-Archive -Path "$pkgDir\*" -DestinationPath $zipPath -Force
Remove-Item $pkgDir -Recurse -Force

Write-Host "Created Zip at: $zipPath"
Get-Item $zipPath | Select-Object Name, Length
