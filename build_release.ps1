$ErrorActionPreference = 'Stop'

$projectRoot = $PSScriptRoot
$frontendPath = Join-Path $projectRoot 'frontend'
$specPath = Join-Path $projectRoot 'LASCA.spec'
$pythonPath = Join-Path $projectRoot 'Lasca.venv\Scripts\python.exe'
$distPath = Join-Path $projectRoot 'dist\LASCA'
$installerScript = Join-Path $projectRoot 'installer\LASCA_Setup.iss'
$installerOutput = Join-Path $projectRoot 'installer-output\LASCA_Setup.exe'

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw 'npm was not found on PATH.'
}

if (-not (Test-Path $pythonPath)) {
    throw "Python virtual environment was not found at $pythonPath."
}

if (-not (Test-Path $specPath)) {
    throw "PyInstaller spec was not found at $specPath."
}

if (-not (Test-Path $installerScript)) {
    throw "Inno Setup script was not found at $installerScript."
}

Write-Host 'Step 1/3: Building React frontend...' -ForegroundColor Cyan
Push-Location $frontendPath
try {
    & npm run build
    if ($LASTEXITCODE -ne 0) { throw 'The frontend build failed.' }
}
finally {
    Pop-Location
}

Write-Host 'Step 2/3: Building PyInstaller application...' -ForegroundColor Cyan
& $pythonPath -m PyInstaller --clean --noconfirm $specPath
if ($LASTEXITCODE -ne 0) { throw 'The PyInstaller build failed.' }
if (-not (Test-Path (Join-Path $distPath 'LASCA.exe'))) {
    throw "PyInstaller did not produce $distPath\LASCA.exe."
}
$isccCandidates = @(
    (Join-Path $env:LOCALAPPDATA 'Programs\Inno Setup 6\ISCC.exe'),
    (Join-Path ${env:ProgramFiles(x86)} 'Inno Setup 6\ISCC.exe'),
    (Join-Path $env:ProgramFiles 'Inno Setup 6\ISCC.exe'),
    (Get-Command ISCC.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -ErrorAction SilentlyContinue)
) | Where-Object { $_ -and (Test-Path $_) }

$isccPath = $isccCandidates | Select-Object -First 1

if (-not $isccPath) {
    throw 'ISCC.exe was not found. Install Inno Setup 6 and rerun this script.'
}

Write-Host 'Step 3/3: Compiling Windows installer...' -ForegroundColor Cyan
& $isccPath $installerScript
if ($LASTEXITCODE -ne 0) { throw 'The Inno Setup compilation failed.' }
if (-not (Test-Path $installerOutput)) {
    throw "Inno Setup did not produce $installerOutput."
}

Write-Host "Release installer created: $installerOutput" -ForegroundColor Green