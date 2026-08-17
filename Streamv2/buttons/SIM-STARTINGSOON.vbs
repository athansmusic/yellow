' Starting Soon full test
' Fires the go-live sequence (clears credits, arms the chat counter,
' unhides the countdown video) then trickles 40 simulated chat messages
' so the CURRENT / RECORD bar visibly ticks up.
'
' The countdown then runs its ~5 minutes and the handoff fires by itself,
' exactly like a real go-live. To skip the wait, run:
'   python control\simulate.py videoend
'
' NOTE: this clears the credits list (it is the go-live sequence). That is
' what you want for a test run; just do not press it mid-real-stream.
'
' Stream Deck -> System -> Open -> point at this file. Runs hidden.

Dim fso, shell, here, root
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
here = fso.GetParentFolderName(WScript.ScriptFullName)
root = fso.GetParentFolderName(here)
shell.CurrentDirectory = root
shell.Run "cmd /c python control\simulate.py startup && python control\simulate.py chat 40", 0, False
