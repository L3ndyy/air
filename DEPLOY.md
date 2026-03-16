# Деплой Air (РФ, бесплатно)

**Важно:** Папка проекта не должна содержать символ `!` в пути (ограничение Webpack). Например, используйте `air` или `air-messenger` вместо `! air`.

## Переменные окружения

Скопируйте `.env.example` в `.env.local` и заполните:

- `NEXT_PUBLIC_SUPABASE_URL` — URL проекта Supabase (Settings → API).
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — публичный anon key (Settings → API).

## Supabase

1. Создайте проект на [supabase.com](https://supabase.com) (или разверните self-hosted).
2. В **SQL Editor** выполните миграции по порядку:
   - `supabase/migrations/20240316000001_schema.sql`
   - `supabase/migrations/20240316000002_storage_avatars.sql`
3. В **Database → Replication** включите Realtime для таблицы `messages`.
4. В **Authentication → URL Configuration** добавьте в **Redirect URLs** ваш production URL (например `https://your-app.onreza.ru`).

## Вариант A: Frontend на ONREZA (РФ)

1. Зарегистрируйтесь на [onreza.ru](https://onreza.ru).
2. Подключите репозиторий (GitHub/GitLab).
3. Укажите:
   - Корень проекта: корень репо.
   - Сборка: `npm ci && npm run build`.
   - Старт: по умолчанию для Next.js (или `npm run start`).
4. В настройках проекта добавьте переменные:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Деплой. Домен вида `*.onreza.ru` или свой.

## Вариант B: Self-hosted Supabase (Oracle Cloud) + Frontend

1. **Supabase на Oracle Cloud (Always Free)**  
   - Зарегистрируйтесь в [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free).  
   - Создайте VM (Ubuntu 22.04), откройте порты 80, 443, 22.  
   - Установите Docker и Docker Compose, клонируйте [supabase/supabase](https://github.com/supabase/supabase) или используйте [supabase-oracle-cloud-docker](https://github.com/JimPresting/supabase-oracle-cloud-docker).  
   - Настройте `.env` (POSTGRES_PASSWORD, JWT_SECRET, ANON_KEY и т.д.), выполните миграции через Studio (порт 8090) или psql.  
   - Настройте Nginx + Let's Encrypt для HTTPS.

2. **Frontend**  
   - Деплой Next.js на ONREZA (как в варианте A) или на той же VM (`npm run build && npm run start` за Nginx).  
   - В переменных окружения укажите `NEXT_PUBLIC_SUPABASE_URL` и `NEXT_PUBLIC_SUPABASE_ANON_KEY` вашего self-hosted Supabase.

## Локальный запуск

```bash
cp .env.example .env.local
# Заполните .env.local
npm install
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000).
