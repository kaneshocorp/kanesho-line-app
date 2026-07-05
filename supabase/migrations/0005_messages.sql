-- 個別メッセージ: 自動応答の対象外になったLINEの個別メッセージを保存し、
-- 管理画面から直接返信できるようにする（公式LINEアプリを開かずに完結させるため）。

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  line_user_id text not null references friends(line_user_id) on delete cascade,
  direction text not null check (direction in ('in', 'out')),
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists messages_line_user_id_idx on messages (line_user_id, created_at);
