# Деплой Air (РФ, бесплатно)

**Важно:** Папка проекта не должна содержать символ `!` в пути (ограничение Webpack). Например, используйте `air` или `air-messenger` вместо `! air`.

## Переменные окружения

Скопируйте `.env.example` в `.env.local` и заполните:

- `NEXT_PUBLIC_SUPABASE_URL` — URL проекта Supabase (Settings → API).
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — публичный anon key (Settings → API).
- `SUPABASE_SERVICE_ROLE_KEY` — секретный service_role key (Settings → API). Нужен для страницы профиля (API загружает профиль в обход RLS). Не показывать в клиенте.
- `ADMIN_EMAILS` — список email через запятую для доступа к админ-панели `/admin` (например `admin@site.ru`).
- Для push-уведомлений (при свёрнутой вкладке): `NEXT_PUBLIC_VAPID_PUBLIC_KEY` и `VAPID_PRIVATE_KEY` — см. раздел «Push-уведомления (VAPID-ключи)» ниже.

## Supabase

1. Создайте проект на [supabase.com](https://supabase.com) (или разверните self-hosted).
2. В **SQL Editor** выполните миграции по порядку:
   - `supabase/migrations/20240316000001_schema.sql`
   - `supabase/migrations/20240316000002_storage_avatars.sql`
   - Если страница профиля возвращает ошибку 500 — выполните также `supabase/migrations/20240316000003_profiles_rls_fix.sql`.
   - Если при сохранении профиля появляется «infinite recursion» для participants — выполните `supabase/migrations/20240316000004_participants_rls_no_recursion.sql`.
   - Чтобы при регистрации сразу сохранялся выбранный username и работал поиск по username — выполните `supabase/migrations/20240316000005_register_username_from_metadata.sql`.
   - Для отправки файлов в чатах — выполните `supabase/migrations/20240316000006_chat_attachments.sql`.
   - Для создания групп — выполните `supabase/migrations/20240316000009_participants_insert_self.sql`.
   - Для удаления сообщений — выполните `supabase/migrations/20240316000010_messages_delete_policy.sql`.
   - Для push-уведомлений — выполните `supabase/migrations/20240316000011_push_subscriptions.sql`.
3. В **Database → Replication** включите Realtime для таблицы `messages`.
4. В **Authentication → URL Configuration**:
   - **Site URL** укажите ваш production-адрес (например `https://air-air.onreza.app`).
   - В **Redirect URLs** добавьте **точный** URL обработки подтверждения почты, например: `https://ваш-домен.onreza.app/auth/callback`. Без этого ссылка из письма после регистрации не сработает и пользователи не смогут войти (ошибка 400 / «подтвердите почту»).

## Вариант A: Frontend на ONREZA (РФ)

1. Зарегистрируйтесь на [onreza.ru](https://onreza.ru).
2. Подключите репозиторий (GitHub/GitLab).

3. В настройках проекта заполните поля так:

   | Поле в ONREZA | Что вставить |
   |---------------|--------------|
   | **Пресет фреймворка** | Оставьте **N Next.js** (рекомендуется). |
   | **Корневая директория** | Оставьте **`.`** (корень репозитория). Если проект в подпапке — укажите её, например `frontend`. |
   | **Команда сборки** | Оставьте **`npm run build`** (или `npm ci && npm run build`, если нужна строгая установка по lock-файлу). |
   | **Выходная директория** | Оставьте **`.next`**. |
   | **Команда установки** | Оставьте **`npm install`**. |

4. **Переменные окружения** — обязательно добавьте (без них вход и регистрация дадут ошибку 400 "No API key"):
   - **Ключ:** `NEXT_PUBLIC_SUPABASE_URL` → **Значение:** URL проекта (Supabase → Settings → API), например `https://xxxx.supabase.co`.
   - **Ключ:** `NEXT_PUBLIC_SUPABASE_ANON_KEY` → **Значение:** anon key (там же).
   - **Ключ:** `SUPABASE_SERVICE_ROLE_KEY` → **Значение:** service_role key (там же, секретный). Нужен для загрузки профиля.
   Переменные с префиксом `NEXT_PUBLIC_` подставляются при сборке — после добавления сохраните и заново запустите деплой.

5. Нажмите **«Задеплоить»**. После сборки получите домен вида `*.onreza.ru` или подключите свой.

## Push-уведомления (VAPID-ключи)

Чтобы при свёрнутой вкладке приходили уведомления о новых сообщениях, нужны два ключа. Их нужно **один раз сгенерировать** и использовать и локально, и на проде.

### 1. Сгенерировать ключи

В корне проекта в терминале выполните:

```bash
npx web-push generate-vapid-keys
```

Появится что-то вроде:

```
=======================================
Public Key:
BEl62iUYgUivxIkv69yViEuiBIa-Ib27-P9u3hJ...

Private Key:
UUxI4O8-FbRouA8...
=======================================
```

- **Public Key** — это `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- **Private Key** — это `VAPID_PRIVATE_KEY`

### 2. Локально (.env.local)

Откройте (или создайте) файл `.env.local` и добавьте строки (подставьте свои значения из вывода команды):

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69yViEuiBIa-Ib27-P9u3hJ...
VAPID_PRIVATE_KEY=UUxI4O8-FbRouA8...
```

Сохраните файл. Перезапустите `npm run dev`, если он уже запущен.

### 3. На проде (Onreza)

1. Зайдите в кабинет Onreza → ваш проект → **Переменные окружения** (или **Environment**).
2. Добавьте две переменные:

   | Ключ | Значение |
   |------|----------|
   | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | вставьте **Public Key** из шага 1 (целиком, без пробелов) |
   | `VAPID_PRIVATE_KEY` | вставьте **Private Key** из шага 1 (целиком, без пробелов) |

3. Сохраните и **заново задеплойте** проект (пересборка подхватит `NEXT_PUBLIC_`).

Важно: используйте **одни и те же** ключи и в `.env.local`, и в Onreza. Менять их не нужно, если только не решите перевыпустить ключи заново.

### Нагрузка и одновременные пользователи (Вариант A)

- **Один инстанс на ONREZA** выдерживает обычно **десятки одновременных пользователей** (зависит от тарифа: CPU/RAM и лимитов в кабинете ONREZA).
- **Supabase Free** ограничивает число одновременных подключений к БД и Realtime — см. [Supabase Pricing](https://supabase.com/pricing).
- Для мессенджера с Realtime реалистичная оценка: **20–50** одновременных пользователей. При росте нагрузки сначала смотри лимиты Supabase, затем — возможность платного тарифа или второго инстанса на ONREZA.

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
