# Настройка системы новостей

## 1. Supabase — создать таблицу

Зайди в Supabase → SQL Editor → New Query, вставь и выполни:

```sql
create table public.news (
  id          uuid        default gen_random_uuid() primary key,
  title       text        not null,
  content     text        not null,
  created_at  timestamptz default now(),
  views       integer     default 0,
  likes       integer     default 0
);

-- Разрешить всем читать новости
alter table public.news enable row level security;
create policy "Public read" on public.news for select using (true);
```

## 2. Получить ключи Supabase

Supabase → Settings → API:
- **Project URL** → это `SUPABASE_URL`
- **service_role** (Secret) → это `SUPABASE_SERVICE_KEY`

## 3. Переменные окружения в Vercel

Vercel → твой проект → Settings → Environment Variables:

| Имя                  | Значение                        |
|----------------------|---------------------------------|
| `ADMIN_PASSWORD`     | твой пароль (только ты знаешь)  |
| `SUPABASE_URL`       | https://xxx.supabase.co         |
| `SUPABASE_SERVICE_KEY` | eyJ...                        |

## 4. Структура файлов

```
/
├── index.html
├── img/
│   ├── 1.avif
│   ├── 2.avif
│   ├── 3.avif
│   ├── 4.avif
│   ├── 5.avif
│   └── Background.avif
└── api/
    ├── auth.js      ← проверка пароля
    ├── news.js      ← список / создание новостей
    └── post.js      ← просмотр / редактирование / удаление / лайки
```

## 5. Деплой на Vercel

```bash
# Если ещё не связан с Vercel:
npx vercel

# Или просто запушь в GitHub — Vercel задеплоит автоматически
```

## 6. Как использовать

- Зайди на сайт → прокрути вниз до футера → нажми **Admin** (маленькая кнопка снизу справа)
- Введи пароль (`ADMIN_PASSWORD` из Vercel)
- Создавай, редактируй и удаляй новости прямо через сайт
- Каждый посетитель видит количество просмотров и может поставить лайк

## Безопасность

- Пароль **никогда** не попадает в исходный код сайта
- Токен подписан HMAC-SHA256 и действует 24 часа
- Все записи в БД идут через server-side API с service key
