# Деплой Air на Timeweb Hosting (MySQL 5)

Пошаговая инструкция для развёртывания мессенджера Air на хостинге Timeweb с базой **MySQL 5**.

---

## 1. База данных MySQL на Timeweb

1. Войдите в панель [Timeweb](https://timeweb.cloud) (или timeweb.ru).
2. Откройте раздел **«Базы данных»** / **«MySQL»** и создайте базу данных (если ещё нет).
3. Запомните:
   - **Хост** (обычно `localhost` или выданный хост, например `localhost`)
   - **Порт** (часто `3306`)
   - **Имя базы** (например `u12345_air`)
   - **Пользователь** и **Пароль**

---

## 2. Создание таблиц (один раз)

Выполните SQL-скрипт из проекта в вашей MySQL-базе (через **phpMyAdmin**, **Панель управления БД** или консоль):

Файл: **`server/sql/schema.sql`**

Скопируйте его содержимое и выполните в своей базе. Будут созданы таблицы `users` и `messages`.

---

## 3. Подготовка проекта к деплою

На своём компьютере (или в CI):

```bash
# Установка зависимостей
npm run install:all

# Сборка клиента (статический фронт)
cd client && npm run build

# Сборка сервера (Node.js)
cd ../server && npm run build
```

В результате:
- `client/dist/` — готовый фронтенд
- `server/dist/` — скомпилированный сервер

**Проверка перед деплоем:** убедитесь, что обе сборки проходят без ошибок. Из корня проекта можно выполнить одну команду: `npm run check` (она последовательно соберёт клиент и сервер). В проекте нет юнит-тестов — успешная сборка является основной проверкой. При желании один раз выполните `server/sql/schema.sql` в локальной MySQL и запустите сервер с `.env` для целевого окружения, чтобы проверить подключение к БД.

---

## 4. Переменные окружения на сервере

Создайте в папке **server** файл **`.env`** (или задайте переменные в панели хостинга). Шаблон переменных: см. **`.env.example`** в корне проекта (для MySQL — поля DB_HOST, DB_USER, DB_PASSWORD, DB_NAME).

```env
PORT=3001
NODE_ENV=production

DB_HOST=localhost
DB_PORT=3306
DB_USER=ваш_пользователь_mysql
DB_PASSWORD=ваш_пароль_mysql
DB_NAME=имя_вашей_базы

CLIENT_URL=https://ваш-домен.ru
JWT_SECRET=придумайте_длинную_случайную_строку
UPLOAD_DIR=./uploads
```

- **DB_*** — данные из шага 1.
- **CLIENT_URL** — полный адрес сайта (для CORS).
- **JWT_SECRET** — любая длинная случайная строка (для сессий).

---

## 5. Загрузка на хостинг

### Вариант A: Timeweb Cloud (VPS) — пошаговые команды в SSH

Подключитесь к серверу через **SSH** (панель Timeweb → SSH-консоль или `ssh ce856430@vh434.timeweb.ru`). Выполняйте команды по порядку.

**Шаг 1. Установить Node.js через nvm (без sudo)**

Node Version Manager ставится в домашнюю папку и не требует прав администратора. Выполняйте по порядку.

Проверить, есть ли уже Node:

```bash
node -v
```

Если команда не найдена или версия меньше 18, установите nvm и Node.js 20:

```bash
# Скачать и установить nvm в ~/.nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
```

Загрузить nvm в текущую сессию (или переподключиться по SSH):

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

Установить Node.js 20 и использовать его по умолчанию:

```bash
nvm install 20
nvm use 20
nvm alias default 20
node -v
npm -v
```

Чтобы nvm подхватывался при каждом входе по SSH, добавьте в конец файла `~/.bashrc`:

```bash
echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.bashrc
echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> ~/.bashrc
source ~/.bashrc
```

После этого `node` и `npm` доступны без перезагрузки. Дальше переходите к шагу 2.

**Копировать одной вставкой (если node ещё не установлен):**

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install 20 && nvm use 20 && nvm alias default 20
echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.bashrc && echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> ~/.bashrc
node -v && npm -v
```

**Шаг 2. Перейти в домашнюю папку и создать каталог проекта**

```bash
cd ~
mkdir -p air
cd air
```

**Шаг 3. Загрузить проект на сервер**

- **Вариант А — через Git (рекомендуется).** Ниже расписано, как один раз залить проект с компьютера в репозиторий и как клонировать его на сервер.
- **Вариант Б — без Git:** на своём компьютере соберите проект (`npm run check`), запакуйте папки `client`, `server`, корневой `package.json` и `package-lock.json` (если есть) в архив. Загрузите архив по SFTP в `~/air/`, затем в SSH распакуйте, например:  
  `unzip air.zip -d .` или `tar -xvf air.tar.gz`.

---

#### Как залить проект в репозиторий (GitHub / GitLab) и клонировать на сервер

Ты уже создал пустой репозиторий на сайте (GitHub, GitLab или другой). Дальше — два этапа: **с компьютера отправить код в репозиторий**, затем **на сервере склонировать репозиторий**.

**Этап 1. На своём компьютере (в папке проекта Air)**

1. Открой терминал (PowerShell или cmd) и перейди в папку проекта:
   ```bash
   cd "C:\Users\nikik\OneDrive\Desktop\! air"
   ```
2. Инициализировать Git (если ещё не делал):
   ```bash
   git init
   ```
3. Добавить все файлы (папки `node_modules`, `dist` и файл `.env` в репозиторий не попадут — для этого в корне проекта есть `.gitignore`):
   ```bash
   git add .
   ```
4. Сделать первый коммит:
   ```bash
   git commit -m "Первый коммит: Air messenger"
   ```
5. Подключить удалённый репозиторий. Вместо `ВАШ_ЛОГИН` и `air` подставь свой логин и имя репозитория с сайта. Если репозиторий называется по-другому — замени `air` на его имя:
   ```bash
   git remote add origin https://github.com/ВАШ_ЛОГИН/air.git
   ```
   Для GitLab будет что-то вроде:  
   `git remote add origin https://gitlab.com/ВАШ_ЛОГИН/air.git`
6. Переименовать ветку в `main` (если на GitHub по умолчанию ждут `main`) и отправить код:
   ```bash
   git branch -M main
   git push -u origin main
   ```
   При первом `git push` браузер или консоль могут попросить войти в аккаунт GitHub/GitLab (логин и пароль или токен). После успешного пуша код проекта будет в репозитории.

**Этап 2. На сервере (в SSH)**

Ты уже в папке `~/air` (шаг 2 выше). Клонируй репозиторий в текущую папку (точка в конце — «клонировать сюда»):

```bash
cd ~/air
git clone https://github.com/ВАШ_ЛОГИН/air.git .
```

Подставь свой URL репозитория (тот же, что в браузере). Если папка `air` не пуста (например, там уже что-то есть), лучше клонировать в новую папку и потом переименовать:

```bash
cd ~
git clone https://github.com/ВАШ_ЛОГИН/air.git air
cd air
```

Дальше переходи к **шагу 4** (установка зависимостей и сборка). На сервере папок `node_modules` и `dist` не будет — они не в репозитории; их создадут команды `npm run install:all` и `npm run check`.

**Шаг 4. Установить зависимости**

```bash
cd ~/air
npm run install:all
```

Если скрипт не сработает, по очереди:

```bash
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..
```

**Шаг 5. Собрать клиент и сервер**

```bash
cd ~/air
npm run check
```

Или по отдельности:

```bash
cd ~/air/client && npm run build && cd ..
cd ~/air/server && npm run build
cd ~/air
```

**Шаг 6. Создать файл .env для сервера**

```bash
nano ~/air/server/.env
```

Вставьте (подставьте свои данные из раздела «Базы данных» в панели Timeweb):

```env
PORT=3001
NODE_ENV=production

DB_HOST=localhost
DB_PORT=3306
DB_USER=ваш_пользователь_mysql
DB_PASSWORD=ваш_пароль_mysql
DB_NAME=имя_базы

CLIENT_URL=https://ваш-домен.ru
JWT_SECRET=длинная_случайная_строка_секрета
UPLOAD_DIR=./uploads
```

Сохранить: `Ctrl+O`, Enter, выйти: `Ctrl+X`.

**Шаг 7. Создать папку для загрузок файлов**

```bash
mkdir -p ~/air/server/uploads
```

**Шаг 8. Запустить приложение**

Из **корня проекта** (`~/air`):

```bash
cd ~/air
node server/dist/index.js
```

В консоли должно появиться `[Server] http://localhost:3001`. Чтобы сервер работал после закрытия SSH, используйте pm2 (если установлен):

```bash
npm install -g pm2
cd ~/air
pm2 start server/dist/index.js --name air
pm2 save
pm2 startup
```

**Шаг 9. Настроить Nginx (прокси на Node)**

Если домен указывает на этот сервер, нужно направить трафик на порт 3001. Обычно конфиг сайта лежит в `/etc/nginx/sites-available/` или в панели Timeweb есть «Настройка Nginx». Добавьте в конфиг сервера (внутри `server { ... }`):

```nginx
location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Перезагрузите Nginx: `sudo nginx -t && sudo systemctl reload nginx`.

---

**Кратко:** после подключения по SSH — перейти в `~/air`, установить зависимости, собрать проект, создать `server/.env`, папку `server/uploads`, запустить `node server/dist/index.js` из корня проекта и настроить Nginx на проксирование на порт 3001.

### Вариант B: Обычный хостинг (без SSH)

Если у вас только FTP и панель с Node.js:

1. Соберите проект локально (п. 3).
2. По **FTP** загрузите:
   - папку **server** (с `dist/`, `package.json`, `.env`, `node_modules` лучше установить на сервере по инструкции хостинга);
   - папку **client/dist** — в каталог, откуда отдаётся статика (если хостинг отдаёт статику отдельно).
3. В панели хостинга укажите:
   - точку входа: `server/dist/index.js` или команду запуска `node dist/index.js` из папки server;
   - переменные окружения из п. 4.

---

## 6. Структура после деплоя

На сервере важно наличие:

- `server/.env` — переменные (DB_*, CLIENT_URL, JWT_SECRET и т.д.)
- `server/dist/` — собранный код
- `server/node_modules/` — зависимости (установить на сервере: `cd server && npm install --production`)
- `server/uploads/` — каталог для загружаемых файлов (создать вручную)
- База MySQL с выполненным `schema.sql`

---

## 7. Домен и SSL

- В панели Timeweb привяжите домен к сайту/серверу.
- Включите **SSL** (Let's Encrypt).
- В **CLIENT_URL** укажите этот домен (например `https://your-site.ru`).

---

## 8. Проверка

- Откройте в браузере ваш домен: должна открыться страница входа/регистрации.
- Зарегистрируйтесь, войдите, проверьте отправку сообщений и прикрепление файлов.

---

## 9. Типичные ошибки и решение

- **Ошибка подключения к MySQL** (ECONNREFUSED, ER_ACCESS_DENIED): проверьте DB_HOST (на shared-хостинге часто указывают не localhost, а выданный хост из панели), DB_USER, DB_PASSWORD, DB_NAME. Убедитесь, что с сервера приложения разрешён доступ к БД (белый список IP в панели Timeweb, если есть).
- **Порт занят (EADDRINUSE):** смените PORT в `.env` или освободите занятый порт.
- **CORS / фронт не загружается:** проверьте, что CLIENT_URL в `.env` совпадает с фактическим доменом (с `https://`), без слэша в конце.
- **Статика или SPA не открываются:** в production сервер сам отдаёт `client/dist` и fallback на `index.html` (см. `server/src/index.ts`). Если используете Nginx отдельно — настройте проксирование на Node и при необходимости раздачу статики из `client/dist`.

---

## Краткий чеклист

- [ ] Создана БД MySQL на Timeweb, выполнен `server/sql/schema.sql`
- [ ] В `server/.env` заданы DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, CLIENT_URL, JWT_SECRET
- [ ] Проект собран (`client` + `server`), на сервере установлены зависимости server
- [ ] Создана папка `server/uploads`
- [ ] Запущен процесс `node server/dist/index.js` (или через pm2)
- [ ] Настроен веб-сервер (Nginx и т.п.) на порт приложения
- [ ] Включён SSL и в CLIENT_URL указан HTTPS-домен
