# Publishes the APK as a GitHub release.
#
# The APK is git-ignored on purpose - it is ~96 MB and rebuilding it from
# source is one command - so the binary reaches people as a release asset
# rather than as a tracked file.
#
#   powershell -ExecutionPolicy Bypass -File apps/mobile/scripts/publish-release.ps1
#
# Requires the GitHub CLI to be authenticated once, which is interactive:
#
#   gh auth login
#
# Re-running with the same tag replaces the uploaded asset rather than failing.

param(
    [string]$Tag = "v0.2.0",
    [string]$Title = "v0.2.0 - Web-parity Android companion with on-device OCR",
    [string]$Apk = "prangara-companion-release.apk",
    [string]$NotesFile = "RELEASE.md"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
Set-Location $repoRoot

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    throw "GitHub CLI not found. Install it with: winget install --id GitHub.cli"
}

$apkPath = Join-Path $repoRoot $Apk
if (-not (Test-Path $apkPath)) {
    throw "APK not found at $apkPath. Build it first with scripts/build-apk.ps1"
}

$size = [math]::Round((Get-Item $apkPath).Length / 1MB, 1)
$hash = (Get-FileHash $apkPath -Algorithm SHA256).Hash
Write-Output "APK:    $apkPath"
Write-Output "Size:   $size MB"
Write-Output "SHA256: $hash"

# The checksum belongs with the download, so anyone can verify what they
# installed against what was built.
$notes = Get-Content (Join-Path $repoRoot $NotesFile) -Raw
$notes = $notes + "`n`n---`n`n### Asset checksum`n`n``````text`n$Apk`nSHA-256  $hash`nSize     $size MB`n```````n"
$notesPath = Join-Path $env:TEMP "prangara-release-notes.md"
Set-Content -Path $notesPath -Value $notes -Encoding utf8

$existing = gh release view $Tag --json tagName 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Output "-- release $Tag exists; updating notes and replacing the asset"
    gh release edit $Tag --title $Title --notes-file $notesPath
    if ($LASTEXITCODE -ne 0) { throw "gh release edit failed" }
    gh release upload $Tag $apkPath --clobber
    if ($LASTEXITCODE -ne 0) { throw "gh release upload failed" }
} else {
    Write-Output "-- creating release $Tag"
    gh release create $Tag $apkPath --title $Title --notes-file $notesPath
    if ($LASTEXITCODE -ne 0) { throw "gh release create failed" }
}

gh release view $Tag --json url --jq .url
