$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root
npm run dev -- --host 127.0.0.1 --port 4173
