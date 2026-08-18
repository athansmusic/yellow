' RED VS BLUE: DRAFT NIGHT
' Wipes the roster and both scores, then everyone is re-drafted the next
' time they chat. This is the monthly reshuffle - press it ON PURPOSE.
'
' A new calendar month does NOT do this by itself (rvb.draft_night.manual
' in config.json). Last month's teams keep playing until you press this,
' so the reshuffle is an event you host on stream.
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
http.open "POST", "http://127.0.0.1:8722/rvb/reset", False
http.setRequestHeader "Content-Type", "application/json"
http.send "{}"
