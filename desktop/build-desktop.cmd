@echo off
call "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat"
set AIR_APP_URL=https://air-air.onreza.app/chat
cd /d C:\Users\nikik\OneDrive\Desktop\air\desktop
npm run build
