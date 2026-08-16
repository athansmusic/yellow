' Govee H617A: blue
' Solid mode. Shows whatever solid colour the Govee app last set - currently blue. Change it in the app and this button changes with it.
'
' Stream Deck -> System -> Open -> point at this file.
' Runs hidden via pythonw, so no console window appears on stream.
' Takes 5-25s at the current signal level. If nothing happens, press again.

Dim fso, shell, here
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
here = fso.GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = here
shell.Run "pythonw.exe " & Chr(34) & here & "\govee.py" & Chr(34) & " solid --quiet", 0, False
