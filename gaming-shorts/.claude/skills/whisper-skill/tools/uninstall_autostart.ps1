# uninstall_autostart.ps1 — снимает автостарт диктовки.

[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$runKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
$valueName = 'WhisperVoice'

$existing = Get-ItemProperty -Path $runKey -Name $valueName -ErrorAction SilentlyContinue
if ($null -eq $existing) {
    Write-Host "autostart not registered: $runKey\$valueName"
    return
}

Remove-ItemProperty -Path $runKey -Name $valueName -Force
Write-Host "autostart removed: $runKey\$valueName"
