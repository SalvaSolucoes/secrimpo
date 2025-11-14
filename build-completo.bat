@echo off
echo ========================================
echo   BUILD COMPLETO - SECRIMPO PMDF
echo ========================================
echo.

echo [0/5] Limpando arquivos de build anteriores...
if exist "dist" (
    echo Removendo pasta dist...
    rmdir /s /q dist
)
if exist "build" (
    echo Removendo pasta build...
    rmdir /s /q build
)
if exist "auth\dist" (
    echo Removendo pasta auth\dist...
    rmdir /s /q auth\dist
)
if exist "auth\build" (
    echo Removendo pasta auth\build...
    rmdir /s /q auth\build
)
if exist "auth\__pycache__" (
    echo Removendo cache Python...
    rmdir /s /q auth\__pycache__
)
echo [OK] Limpeza concluida!
echo.

REM Verificar se Python esta instalado
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Python nao encontrado!
    echo Instale Python em: https://www.python.org/downloads/
    pause
    exit /b 1
)

REM Verificar se Node.js esta instalado
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Node.js nao encontrado!
    echo Instale Node.js em: https://nodejs.org/
    pause
    exit /b 1
)

echo [1/5] Instalando dependencias Node.js...
call npm install
if errorlevel 1 (
    echo [ERRO] Falha ao instalar dependencias Node.js
    pause
    exit /b 1
)

echo.
echo [2/5] Instalando dependencias Python...
pip install -r auth/requirements.txt
if errorlevel 1 (
    echo [ERRO] Falha ao instalar dependencias Python
    pause
    exit /b 1
)

echo.
echo [3/5] Instalando PyInstaller...
pip install pyinstaller
if errorlevel 1 (
    echo [ERRO] Falha ao instalar PyInstaller
    pause
    exit /b 1
)

echo.
echo [4/5] Compilando autenticacao Python para EXE...
cd auth

REM Criar pastas se nao existirem
if not exist "dist" mkdir dist
if not exist "..\build" mkdir ..\build

REM Compilar com PyInstaller (modo noconsole para producao - sem janelas extras)
REM Garantir que keyauth.py seja incluido como modulo Python no executavel
pyinstaller --onefile --noconsole --name auth_keyauth --distpath dist --workpath ..\build --specpath ..\build --paths . --hidden-import=keyauth --hidden-import=_cffi_backend --hidden-import=win32security --hidden-import=requests --hidden-import=discord_interactions --hidden-import=qrcode --hidden-import=PIL --hidden-import=PIL.Image --hidden-import=dotenv --collect-all pywin32 --collect-all requests --collect-all discord_interactions --collect-all qrcode --collect-all PIL --copy-metadata discord-interactions auth_wrapper.py

cd ..
if errorlevel 1 (
    echo [ERRO] Falha ao compilar autenticacao
    pause
    exit /b 1
)

REM Verificar se o executavel foi criado
if not exist "auth\dist\auth_keyauth.exe" (
    echo [ERRO] auth_keyauth.exe nao foi gerado!
    pause
    exit /b 1
)

echo [OK] auth_keyauth.exe compilado com sucesso!
for %%A in ("auth\dist\auth_keyauth.exe") do echo     Tamanho: %%~zA bytes

echo.
echo [5/5] Compilando aplicacao Electron para EXE...
call npm run build:win

if errorlevel 1 (
    echo [ERRO] Falha ao compilar aplicacao Electron
    pause
    exit /b 1
)

echo.
echo ========================================
echo   BUILD CONCLUIDO COM SUCESSO!
echo ========================================
echo.
echo Arquivos gerados na pasta 'dist':
dir dist /b
echo.
echo ========================================
echo IMPORTANTE - EXECUTAVEL STANDALONE:
echo ========================================
echo.
echo O executavel portable/instalador inclui:
echo  - Aplicacao Electron completa
echo  - auth_keyauth.exe (autenticacao KeyAuth)
echo  - Todas as dependencias necessarias
echo.
echo NAO e necessario instalar:
echo  - Python
echo  - Node.js
echo  - Nenhuma dependencia adicional
echo.
echo O executavel funciona em qualquer Windows 10/11
echo sem necessidade de instalacao previa!
echo.
echo ========================================
echo PRONTO PARA DISTRIBUICAO!
echo ========================================
echo.
echo O executavel esta otimizado para producao:
echo  - Sem janelas de console
echo  - Autenticacao silenciosa
echo  - Erros categorizados (Codigo 1-99)
echo  - Totalmente standalone
echo.
pause
