' voice_dictation_silent.vbs
'
' Silent launcher для voice dictation: стартует pythonw.exe из venv
' без окна консоли. Используется для autostart и для ярлыков
' (см. tools/install_shortcut.ps1, tools/install_autostart.ps1).
'
' Допущения:
'   - venv лежит по %USERPROFILE%\.venvs\whisper
'   - сам репозиторий лежит по %USERPROFILE%\.claude\skills\whisper-skill
'   - в venv установлены зависимости диктовки (sounddevice, pynput, ...)
'
' Если эти пути отличаются — поправь переменные ниже.

Option Explicit

Dim WshShell, fso, scriptDir, repoRoot, pythonw, cmd
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Репо вычисляем относительно расположения этого .vbs:
'   <repo>/launcher/voice_dictation_silent.vbs  →  <repo> = ../
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
repoRoot = fso.GetParentFolderName(scriptDir)

pythonw = WshShell.ExpandEnvironmentStrings("%USERPROFILE%") & "\.venvs\whisper\Scripts\pythonw.exe"

If Not fso.FileExists(pythonw) Then
    MsgBox "pythonw.exe not found at:" & vbCrLf & pythonw & vbCrLf & vbCrLf & _
           "Создай venv по пути ~/.venvs/whisper или поправь путь в этом .vbs.", _
           vbCritical, "Whisper Voice — launcher"
    WScript.Quit 1
End If

WshShell.CurrentDirectory = repoRoot
cmd = """" & pythonw & """ -m examples.voice_dictation"
' 0 = окно скрыто, False = не ждать завершения.
WshShell.Run cmd, 0, False
