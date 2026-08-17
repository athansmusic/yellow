' Threshold: black + #FFF200 for 30 seconds
' Reverts by itself. Pressing again mid-effect restarts the 30s.
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
http.open "POST", "http://127.0.0.1:8722/effect/threshold", False
http.setRequestHeader "Content-Type", "application/json"
http.send "{""seconds"":30}"
