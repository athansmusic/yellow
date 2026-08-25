# Control-server supervisor. Started hidden by start-control-silent.vbs.
# Restarts the server whenever it exits and logs every line it prints -
# a crash always leaves its reason in server-console.log and never sticks.
$py  = 'C:\Users\19407\AppData\Local\Programs\Python\Python312\python.exe'
$srv = Join-Path $PSScriptRoot 'server.py'
$log = Join-Path $PSScriptRoot 'server-console.log'
Set-Location $PSScriptRoot
while ($true) {
  Add-Content $log ("==== START " + (Get-Date) + " ====")
  # -u: unbuffered, so the log is live rather than held in a pipe buffer
  & $py -u $srv *>> $log
  Add-Content $log ("==== EXIT " + (Get-Date) + " - restarting in 5s ====")
  Start-Sleep 5
}
