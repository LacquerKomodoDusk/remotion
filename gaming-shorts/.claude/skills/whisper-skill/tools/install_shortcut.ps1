# install_shortcut.ps1
#
# Создаёт ярлык "Whisper Voice.lnk" в Start Menu (и опционально на рабочем столе),
# указывающий на launcher\voice_dictation_silent.vbs с нашей иконкой.
#
# Запуск (PowerShell, без админки):
#   powershell -ExecutionPolicy Bypass -File .\tools\install_shortcut.ps1
#   powershell -ExecutionPolicy Bypass -File .\tools\install_shortcut.ps1 -Desktop
#   powershell -ExecutionPolicy Bypass -File .\tools\install_shortcut.ps1 -Remove

[CmdletBinding()]
param(
    [switch]$Desktop,
    [switch]$Remove
)

$ErrorActionPreference = 'Stop'

$repoRoot   = Split-Path -Parent $PSScriptRoot
$launcher   = Join-Path $repoRoot 'launcher\voice_dictation_silent.vbs'
$iconPath   = Join-Path $repoRoot 'assets\icon.ico'
$shortcutName = 'Whisper Voice.lnk'

$startMenu = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'
$desktop   = [Environment]::GetFolderPath('Desktop')

$targets = @(Join-Path $startMenu $shortcutName)
if ($Desktop) {
    $targets += (Join-Path $desktop $shortcutName)
}

if ($Remove) {
    foreach ($t in $targets) {
        if (Test-Path $t) {
            Remove-Item -LiteralPath $t -Force
            Write-Host "removed: $t"
        }
    }
    return
}

if (-not (Test-Path $launcher)) {
    throw "launcher not found: $launcher"
}
if (-not (Test-Path $iconPath)) {
    throw "icon not found: $iconPath (run: python -m scripts.build_icon)"
}

$wsh = New-Object -ComObject WScript.Shell
foreach ($t in $targets) {
    $sc = $wsh.CreateShortcut($t)
    $sc.TargetPath       = 'wscript.exe'
    $sc.Arguments        = "`"$launcher`""
    $sc.WorkingDirectory = $repoRoot
    $sc.IconLocation     = "$iconPath,0"
    $sc.Description      = 'Whisper Voice Dictation (push-to-talk)'
    $sc.WindowStyle      = 7   # minimized; .vbs uses Run with hidden window anyway
    $sc.Save()
    Write-Host "created: $t"
}
