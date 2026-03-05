# Prepare clean upload folder by mirroring deploy-relevant source files.
Write-Host "Preparing files for VPS upload..." -ForegroundColor Cyan

$ErrorActionPreference = "Stop"
$uploadDir = ".\upload_to_vps"

function Invoke-RobocopyMirror {
    param(
        [Parameter(Mandatory = $true)][string]$Source,
        [Parameter(Mandatory = $true)][string]$Destination
    )

    if (-not (Test-Path $Source)) {
        return
    }

    New-Item -ItemType Directory -Path $Destination -Force | Out-Null
    & robocopy $Source $Destination /MIR /R:1 /W:1 /NFL /NDL /NJH /NJS /NP | Out-Null
    $exitCode = $LASTEXITCODE
    if ($exitCode -gt 7) {
        throw "Robocopy failed for $Source -> $Destination (exit code: $exitCode)"
    }
}

# Clean old upload folder
if (Test-Path $uploadDir) {
    Remove-Item $uploadDir -Recurse -Force
}
New-Item -ItemType Directory -Path $uploadDir -Force | Out-Null

Write-Host "Mirroring app/components/lib/public/scripts..." -ForegroundColor Yellow
Invoke-RobocopyMirror -Source ".\app" -Destination "$uploadDir\app"
Invoke-RobocopyMirror -Source ".\components" -Destination "$uploadDir\components"
Invoke-RobocopyMirror -Source ".\lib" -Destination "$uploadDir\lib"
Invoke-RobocopyMirror -Source ".\public" -Destination "$uploadDir\public"
Invoke-RobocopyMirror -Source ".\scripts" -Destination "$uploadDir\scripts"

Write-Host "Copying deploy data files..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path "$uploadDir\data" -Force | Out-Null
$dataFiles = @(
    "data\preseason-index.json",
    "data\prebonding-urls.txt"
)
foreach ($file in $dataFiles) {
    if (Test-Path $file) {
        Copy-Item $file "$uploadDir\data\" -Force
    }
}

Write-Host "Copying config files..." -ForegroundColor Yellow
$rootFiles = @(
    ".env.local",
    ".gitignore",
    "ecosystem.config.js",
    "next-env.d.ts",
    "next.config.js",
    "package.json",
    "package-lock.json",
    "postcss.config.js",
    "tailwind.config.js",
    "tsconfig.json"
)

foreach ($file in $rootFiles) {
    if (Test-Path $file) {
        Copy-Item $file "$uploadDir\" -Force
    }
}

Write-Host ""
Write-Host "Done. Files are ready in: upload_to_vps\" -ForegroundColor Green
Write-Host ""
Write-Host "Upload everything in 'upload_to_vps' to /var/www/fartwater/" -ForegroundColor Cyan
Write-Host ""
Write-Host "Then on VPS run:" -ForegroundColor Yellow
Write-Host "  cd /var/www/fartwater" -ForegroundColor White
Write-Host "  rm -rf node_modules .next" -ForegroundColor White
Write-Host "  npm install" -ForegroundColor White
Write-Host "  npm run build" -ForegroundColor White
Write-Host "  pm2 delete fartwater" -ForegroundColor White
Write-Host "  pm2 start ecosystem.config.js" -ForegroundColor White
