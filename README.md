# Air — мессенджер

Минималистичный веб-мессенджер на Next.js 14 и Supabase.

## Стек

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion, Lucide React
- **Backend:** Supabase (Auth, PostgreSQL, Realtime, Storage)

## Локальный запуск

```bash
npm install
cp .env.example .env.local
# Заполните NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY в .env.local
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000).

## Деплой на GitHub

Быстро отправить изменения в репозиторий:

```bash
git add -A
git status
git commit -m "update 0.1"
git push origin main
```

Одной строкой (если уже всё готово):

```bash
git add -A && git commit -m "update" && git push origin main
```

Через npm (коммит с сообщением «deploy»):

```bash
npm run deploy
```

Своё сообщение коммита: сначала `git add -A && git commit -m "ваше сообщение"`, затем `git push origin main`.

## Деплой и настройка Supabase

Подробная инструкция — в [DEPLOY.md](DEPLOY.md) (миграции, Realtime, хостинг в РФ: ONREZA, self-host Supabase на Oracle Cloud).

## Функции

- Регистрация и вход (email + пароль, уникальный username)
- Профиль: аватар, имя, статус
- Личные чаты и групповые чаты
- Сообщения в реальном времени
- Индикаторы «печатает» и онлайн
