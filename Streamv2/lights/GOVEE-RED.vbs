' Govee H617A: red
' Scene 134 (0x86), which renders red. Scene contents are stored on the device, so editing that scene in the app changes this button.
'
' Stream Deck -> System -> Open -> point at this file.
' Runs hidden via pythonw, so no console window appears on stream.
' Takes 5-25s at the current signal level. If nothing happens, press again.

Dim fso, shell, here
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
here = fso.GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = here
shell.Run "pythonw.exe " & Chr(34) & here & "\govee.py" & Chr(34) & " scene 134 --quiet", 0, False
