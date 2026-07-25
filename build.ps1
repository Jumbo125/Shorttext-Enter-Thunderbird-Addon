$ErrorActionPreference = "Stop"

$projectRoot = [System.IO.Path]::GetFullPath($PSScriptRoot)
$distDir = [System.IO.Path]::GetFullPath((Join-Path $projectRoot "dist"))
$stageDir = Join-Path $distDir "package"
$manifestPath = Join-Path $projectRoot "manifest.json"

if (-not $distDir.StartsWith($projectRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Das Ausgabeverzeichnis liegt außerhalb des Projekts."
}

# manifest.json ist UTF-8 ohne BOM (enthält Umlaute in der Beschreibung).
# Get-Content/Set-Content raten die Kodierung in Windows PowerShell 5.1 sonst
# falsch (Systemcodepage) und würden die Umlaute beim Zurückschreiben zerstören.
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$manifestText = [System.IO.File]::ReadAllText($manifestPath, [System.Text.Encoding]::UTF8)
$manifestData = $manifestText | ConvertFrom-Json
$currentVersion = $manifestData.version

$inputVersion = Read-Host "Version fuer dieses Build eingeben (aktuell: $currentVersion, Enter = unveraendert)"
$version = $currentVersion
if ($inputVersion.Trim().Length -gt 0) {
    if ($inputVersion -notmatch '^\d+\.\d+\.\d+$') {
        throw "Ungueltige Version '$inputVersion'. Erwartet wird das Format X.Y.Z (z. B. 1.1.0)."
    }
    $version = $inputVersion
}

if ($version -ne $currentVersion) {
    $replacement = '${1}' + $version + '${2}'
    $updatedManifestText = $manifestText -replace '("version"\s*:\s*")[^"]*(")', $replacement
    [System.IO.File]::WriteAllText($manifestPath, $updatedManifestText, $utf8NoBom)
    Write-Host "manifest.json auf Version $version aktualisiert."
}

$xpiPath = Join-Path $distDir "shorttext-enter-$version.xpi"

if (Test-Path -LiteralPath $distDir) {
    Remove-Item -LiteralPath $distDir -Recurse -Force
}
New-Item -ItemType Directory -Path $stageDir -Force | Out-Null

# Nur die für den Betrieb des Add-ons nötigen Dateien werden verpackt.
# README.md, CHANGELOG.md und LICENSE gehören zum Repository, nicht zur XPI.
Copy-Item -LiteralPath $manifestPath -Destination $stageDir
Copy-Item -LiteralPath (Join-Path $projectRoot "background.js") -Destination $stageDir
foreach ($directory in @("compose", "options", "icons")) {
    Copy-Item -LiteralPath (Join-Path $projectRoot $directory) -Destination $stageDir -Recurse
}

# Compress-Archive stores entries with backslash separators on Windows, which
# violates the ZIP spec and breaks Thunderbird's resource resolution
# (e.g. "options/options.html" cannot be found). Build the archive manually
# with System.IO.Compression so every entry name uses forward slashes.
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

if (Test-Path -LiteralPath $xpiPath) {
    Remove-Item -LiteralPath $xpiPath -Force
}

$zip = [System.IO.Compression.ZipFile]::Open($xpiPath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    Get-ChildItem -LiteralPath $stageDir -Recurse -File | ForEach-Object {
        $relativePath = $_.FullName.Substring($stageDir.Length + 1) -replace '\\', '/'
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
            $zip, $_.FullName, $relativePath,
            [System.IO.Compression.CompressionLevel]::Optimal
        ) | Out-Null
    }
}
finally {
    $zip.Dispose()
}

Remove-Item -LiteralPath $stageDir -Recurse -Force

Write-Host "Erstellt: $xpiPath"
