# install_autostart.ps1
#
# Регистрирует voice dictation в автостарте текущего пользователя
# через HKCU\Software\Microsoft\Windows\CurrentVersion\Run.
#
# Запуск (без админки):
#   powershell -ExecutionPolicy Bypass -File .\tools\install_autostart.ps1
#
# Снять автостарт:
#   powershell -ExecutionPolicy Bypass -File .\tools\uninstall_autostart.ps1

[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$launcher = Join-Path $repoRoot 'launcher\voice_dictation_silent.vbs'

if (-not (Test-Path $launcher)) {
    throw "launcher not found: $launcher"
}

$runKey   = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
$valueName = 'WhisperVoice'
# wscript.exe в PATH; .vbs в кавычках — на случай пробелов в пути
$value    = "wscript.exe `"$launcher`""

if (-not (Test-Path $runKey)) {
    New-Item -Path $runKey -Force | Out-Null
}
New-ItemProperty -Path $runKey -Name $valueName -Value $value -PropertyType String -Force | Out-Null

Write-Host "autostart enabled:"
Write-Host "  $runKey\$valueName = $value"
Write-Host ""
Write-Host "Test: log out / log in, или запусти прямо сейчас:"
Write-Host "  wscript.exe `"$launcher`""
