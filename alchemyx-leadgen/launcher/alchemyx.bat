@echo off
rem ==========================================================================
rem LEAD GEN (Alchemyx) - launcher Windows della dashboard lead-gen.
rem
rem Doppio click:           avvia il server locale e apre la dashboard.
rem alchemyx.bat --install: crea il collegamento "LEAD GEN" sul Desktop
rem                         (con l'icona assets\icon.ico).
rem
rem Zero dipendenze: usa solo cmd, PowerShell (incluso in Windows) e Python 3.
rem ==========================================================================
setlocal
title LEAD GEN

set "SCRIPT_DIR=%~dp0"
set "ROOT_DIR=%SCRIPT_DIR%.."

if /I "%~1"=="--install" goto :install

rem --- Verifica che la dashboard esista (il .bat vive in launcher\) ---------
if not exist "%ROOT_DIR%\dashboard\index.html" (
    echo ERRORE: dashboard non trovata: %ROOT_DIR%\dashboard\index.html
    echo Tieni questo file dentro alchemyx-leadgen\launcher\ e riprova.
    pause
    exit /b 1
)

rem --- Trova Python: prima il launcher "py", poi "python" -------------------
set "PYCMD="
where py >nul 2>nul && set "PYCMD=py"
if not defined PYCMD (
    where python >nul 2>nul && set "PYCMD=python"
)
if not defined PYCMD (
    echo ERRORE: Python 3 non trovato.
    echo Installalo da https://www.python.org o dal Microsoft Store, poi riprova.
    pause
    exit /b 1
)

rem --- Trova una porta libera partendo da 8347 ------------------------------
set PORT=8347

:findport
netstat -an | findstr /C:":%PORT% " | findstr /C:"LISTENING" >nul 2>nul
if errorlevel 1 goto :startserver
rem Porta occupata: e' il nostro server di un avvio precedente?
powershell -NoProfile -Command "try { $r=(Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 'http://localhost:%PORT%/dashboard/index.html').Content; if ($r -match 'alchemyx') { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>nul
if not errorlevel 1 goto :openbrowser
set /a PORT+=1
if %PORT% GEQ 8400 (
    echo ERRORE: nessuna porta libera trovata ^(8347-8399^).
    pause
    exit /b 1
)
goto :findport

:startserver
rem CWD = radice alchemyx-leadgen: cosi' sono serviti sia /dashboard/
rem che /output/leads.json (la dashboard li carica automaticamente).
start "LEAD GEN server" /MIN cmd /c "cd /d "%ROOT_DIR%" && %PYCMD% -m http.server %PORT%"
rem Breve attesa perche' il server sia pronto.
timeout /t 1 /nobreak >nul

:openbrowser
start "" "http://localhost:%PORT%/dashboard/"
exit /b 0

rem ==========================================================================
:install
rem Crea sul Desktop il collegamento "LEAD GEN.lnk" che punta a questo .bat
rem con l'icona assets\icon.ico (generata da make-icon.js).
if not exist "%SCRIPT_DIR%assets\icon.ico" (
    echo ATTENZIONE: icona non trovata. Genero le icone con Node...
    node "%SCRIPT_DIR%make-icon.js"
)
powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $lnk = $ws.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\LEAD GEN.lnk'); $lnk.TargetPath = '%SCRIPT_DIR%alchemyx.bat'; $lnk.WorkingDirectory = '%SCRIPT_DIR%'; $lnk.IconLocation = '%SCRIPT_DIR%assets\icon.ico'; $lnk.Description = 'LEAD GEN - dashboard lead-gen Alchemyx'; $lnk.Save()"
if errorlevel 1 (
    echo ERRORE: impossibile creare il collegamento sul Desktop.
    pause
    exit /b 1
)
echo Collegamento "LEAD GEN" creato sul Desktop.
pause
exit /b 0
