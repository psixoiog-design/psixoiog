@echo off
setlocal
cd /d "%~dp0"
echo ================================================
echo   ATLANT / ASMAN Web 1.50.4 + Supabase Cloud + GigaChat AI + Resend Email 2FA
echo ================================================
set /p SUPABASE_SECRET_KEY=Вставь Supabase Secret Key (sb_secret_...): 
set SUPABASE_URL=https://fnkmhjcfeynfjsbzigin.supabase.co
set /p GIGACHAT_API_KEY=Вставь GigaChat Authorization Key и нажми Enter (можно Enter, если без ИИ): 
set /p OWNER_EMAIL=Введи почту владельца для кодов входа: 
set /p RESEND_API_KEY=Вставь Resend API Key (re_...; можно Enter, чтобы отключить почтовый код): 
set /p RESEND_SENDER_EMAIL=Почта отправителя (Enter = onboarding@resend.dev): 
if "%RESEND_SENDER_EMAIL%"=="" set RESEND_SENDER_EMAIL=onboarding@resend.dev
if "%GIGACHAT_API_KEY%"=="" (
  echo Ключ не введен. Сайт запустится без ИИ.
) else (
  echo Ключ принят только в памяти этого процесса. На диск он не записывается.
)
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo ОШИБКА: Node.js не найден.
  echo Установи Node.js LTS и снова запусти start.bat.
  pause
  exit /b 1
)
node server.js
pause
