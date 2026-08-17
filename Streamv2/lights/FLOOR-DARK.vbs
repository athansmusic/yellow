' Stuck H6076 floor lamps: release
' Kills every running holder. With nothing streaming, the units' stuck
' black-writer takes over and they go dark on their own - the broken state
' doubles as the off switch.
'
' Stream Deck -> System -> Open -> point at this file.

Dim fso, shell, here
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
here = fso.GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = here
shell.Run "pythonw.exe " & Chr(34) & here & "\lan_hold.py" & Chr(34) & " stop", 0, False
