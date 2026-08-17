' Show mode toggle
' One press: Audience + Mic/Aux mute, Show unmutes (episode playback).
' Press again: back to normal talking (Audience + Mic/Aux live, Show muted).
' Reads the real OBS state each press, so mashing it can never desync.
'
' Stream Deck -> System -> Open -> point at this file.
' Fires an HTTP request straight at the control server - no Python, no
' console window, returns instantly.
'
' Silent on failure by design: if the control server is not running, a
' popped error dialog mid-stream would be worse than nothing happening.
' Check http://127.0.0.1:8722/ if a press seems to do nothing.

On Error Resume Next

Dim http
Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
http.setTimeouts 2000, 2000, 4000, 6000
http.open "POST", "http://127.0.0.1:8722/audio/swap", False
http.setRequestHeader "Content-Type", "application/json"
http.send "{}"
