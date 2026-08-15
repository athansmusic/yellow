' Live Listen control server, no console window.
' Uses pythonw.exe so nothing appears in the taskbar.
' Put a shortcut to THIS file in shell:startup to have it run at login.
'
' To confirm it is running, open http://127.0.0.1:8722/ - the panel shows
' "server offline - retrying" when it is not.
' To stop it: Task Manager -> Details -> end pythonw.exe

Dim fso, shell, here
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
here = fso.GetParentFolderName(WScript.ScriptFullName)

shell.CurrentDirectory = here
shell.Run "pythonw.exe """ & here & "\control\server.py""", 0, False
