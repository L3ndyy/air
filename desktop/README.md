# Air — десктопное приложение (Windows)

Сборка на [Tauri 2](https://v2.tauri.app/). Окно с веб-приложением Air и системными уведомлениями о новых сообщениях.

## Требования

- [Node.js](https://nodejs.org/) (LTS)
- [Rust](https://rustup.rs/)
- [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (Windows)

## Разработка

1. В корне проекта запустите веб-приложение: `npm run dev` (порт 3000).
2. В папке `desktop/` выполните:
   ```bash
   npm install
   npm run dev
   ```
   Откроется окно с локальной версией Air. Уведомления приходят при новом сообщении в другом чате.

## Сборка для Windows

```bash
cd desktop
npm install
```

Для сборки под свой домен задайте URL сайта:

```bash
set AIR_APP_URL=https://your-air-app.vercel.app
npm run build
```

Установщик и .exe появятся в `desktop/src-tauri/target/release/` (и в `bundle/` для установщика).

## Иконки

По умолчанию иконки не заданы. Чтобы добавить свои, положите в `desktop/src-tauri/icons/` файлы:

- `icon.ico` (Windows)
- `32x32.png`, `128x128.png` и при необходимости `icon.icns` (macOS)

Либо сгенерируйте набор из одного изображения: `npx tauri icon path/to/icon.png`.
