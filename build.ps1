# Build script — creates a clean release ZIP for distribution
param(
    [string]$Version = "1.0.0"
)

$ErrorActionPreference = "Stop"
$distDir = Join-Path $PSScriptRoot "dist"
$releaseDir = Join-Path $distDir "GarticLasso"
$zipPath = Join-Path $distDir "GarticLasso-v$Version.zip"

# Clean previous build
if (Test-Path $distDir) { Remove-Item $distDir -Recurse -Force }
New-Item -ItemType Directory -Path $releaseDir -Force | Out-Null

# Copy extension files
$files = @(
    "manifest.json",
    "content.js",
    "overlay.js",
    "lasso-tool.js",
    "tapered-brush.js",
    "toolbar.js",
    "color-picker.js",
    "styles.css"
)

foreach ($f in $files) {
    Copy-Item (Join-Path $PSScriptRoot $f) $releaseDir
}

# Copy icons folder
Copy-Item (Join-Path $PSScriptRoot "icons") $releaseDir -Recurse

# Create ZIP
Compress-Archive -Path $releaseDir -DestinationPath $zipPath -Force

Write-Host ""
Write-Host "Release built: $zipPath" -ForegroundColor Green
Write-Host "Upload this ZIP to GitHub Releases."
