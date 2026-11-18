@echo off
chcp 65001 > nul
title Управленческие кадры Кузбасса — Локальный сервер
echo ========================================================
echo   Платформа опережающей подготовки управленческих кадров
echo   ГБОУ ДПО «ИРО Кузбасса» · ФИП РАО 2027-2029
echo ========================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ВНИМАНИЕ] Node.js не найден в системе!
    echo Вы можете просто открыть файл index.html в любом браузере (Chrome, Edge, Яндекс),
    echo либо установить Node.js с официального сайта: https://nodejs.org
    echo.
    echo Открываем автономную версию в браузере...
    start "" "public\index.html"
    pause
    exit /b
)

if not exist "node_modules\" (
    echo [ИНФО] Установка зависимостей (Express, Multer)...
    call npm install
)

echo [ИНФО] Запуск сервера на http://localhost:3000 ...
start "" "http://localhost:3000"
call npm start
pause
