@echo off
echo Starting Lo-Fi Nostalgia Radio dev server...
cd /d "%~dp0"

:: Add Node.js to PATH for this session
set PATH=C:\Program Files\nodejs;%PATH%

:: Start the Next.js dev server in a new cmd window
start "Lo-Fi Radio Server" cmd /k "set PATH=C:\Program Files\nodejs;%PATH% && npm run dev"

:: Wait 4 seconds for the server to spin up
timeout /t 4 /nobreak > nul

:: Open http://localhost:3000 in your default browser
echo Opening browser...
start http://localhost:3000

exit
