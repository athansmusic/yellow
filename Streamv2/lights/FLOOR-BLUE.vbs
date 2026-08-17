' Stuck H6076 floor lamps (.84 + .85): hold blue
' Streams the colour continuously (Music-mode style) because the units'
' normal handlers are dead - see lan_hold.py for the full story.
' Firing another FLOOR-* button replaces this one; FLOOR-DARK releases it.
'
' Stream Deck -> System -> Open -> point at this file.
' Runs hidden via pythonw, so no console window appears on stream.

Dim fso, shell, here
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
here = fso.GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = here
shell.Run "pythonw.exe " & Chr(34) & here & "\lan_hold.py" & Chr(34) & " 192.168.4.84,192.168.4.85 0 0 255", 0, False
