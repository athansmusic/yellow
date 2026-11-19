' Live Listen control server - SUPERVISED, no console window.
' Put a shortcut to THIS file in shell:startup to have it run at login.
'
' Runs control\supervisor.ps1 hidden: it restarts the server whenever it
' exits and appends everything to control\server-console.log, so a crash
' always leaves a reason behind and never sticks.
'
' To stop it for real: Task Manager -> Details -> end powershell.exe AND
' python.exe (the loop restarts python if you only kill python).

Dim fso, shell, here
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
here = fso.GetParentFolderName(WScript.ScriptFullName)

shell.Run "powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & here & "\control\supervisor.ps1""", 0, False
