-- Web Push通知の購読情報。端末・ブラウザごとに1件。ログインの概念がないため
-- 「誰の端末か」は持たず、通知を送る対象の一覧としてのみ扱う。
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
