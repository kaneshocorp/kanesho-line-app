-- kanesho-line-app: initial schema
-- 買取価格・友だち・写真査定・営業カレンダーを管理するテーブル群

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- items: 買取品目（管理画面で追加・非表示・並び替え可能）
-- current_price   = 従業員が入力中の下書き価格
-- published_price = 直近の配信で実際に公開された価格（顧客に見えるのはこちら）
-- ---------------------------------------------------------------------
create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unit text not null default '円/kg',
  current_price numeric not null default 0,
  published_price numeric,
  published_price_prev numeric,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists price_history (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items(id) on delete cascade,
  price numeric not null,
  recorded_at timestamptz not null default now()
);
create index if not exists price_history_item_idx on price_history (item_id, recorded_at desc);

-- ---------------------------------------------------------------------
-- friends: LINE友だち。company/awaiting_company は follow 後のヒアリングで埋まる
-- ---------------------------------------------------------------------
create table if not exists friends (
  line_user_id text primary key,
  display_name text not null,
  company text,
  active boolean not null default true,
  awaiting_company boolean not null default true,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- photo_submissions: 「写真でかんたん査定」経由で届いた写真の受信箱
-- ---------------------------------------------------------------------
create table if not exists photo_submissions (
  id uuid primary key default gen_random_uuid(),
  line_user_id text not null references friends(line_user_id) on delete cascade,
  message_id text not null,
  received_at timestamptz not null default now(),
  done boolean not null default false
);
create index if not exists photo_submissions_received_idx on photo_submissions (received_at desc);

-- ---------------------------------------------------------------------
-- business_config: 曜日定休・営業時間・昼休み（シングルトン行）
-- calendar_overrides: 特定日の例外（祝日休業・臨時休業）
-- ---------------------------------------------------------------------
create table if not exists business_config (
  id int primary key default 1,
  closed_weekdays int[] not null default array[0], -- 0=日 .. 6=土
  open_time time not null default '08:00',
  close_time time not null default '17:00',
  break_start time default '12:00',
  break_end time default '13:00',
  constraint business_config_singleton check (id = 1)
);
insert into business_config (id) values (1) on conflict (id) do nothing;

create table if not exists calendar_overrides (
  date date primary key,
  status text not null check (status in ('open', 'closed', 'temp_closed')),
  note text
);

-- ---------------------------------------------------------------------
-- broadcasts: 配信履歴（監査・確認用）
-- ---------------------------------------------------------------------
create table if not exists broadcasts (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('price', 'closure')),
  sent_at timestamptz not null default now(),
  recipient_count int not null,
  snapshot jsonb
);

-- ---------------------------------------------------------------------
-- updated_at 自動更新
-- ---------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists items_set_updated_at on items;
create trigger items_set_updated_at
  before update on items
  for each row execute function set_updated_at();

drop trigger if exists friends_set_updated_at on friends;
create trigger friends_set_updated_at
  before update on friends
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- 公開ページ用の安全なビュー（下書き価格などの内部情報は含めない）
-- ---------------------------------------------------------------------
create or replace view public_prices as
  select id, name, unit, published_price, published_price_prev, sort_order
  from items
  where active and published_price is not null and published_price > 0
  order by sort_order;

-- ---------------------------------------------------------------------
-- RLS: 匿名キーからは public_prices ビューと営業情報のみ読み取り可能。
-- items/friends/photo_submissions/broadcasts への読み書きは
-- サーバー側の service role クライアント（管理画面のServer Action）経由のみ。
-- ---------------------------------------------------------------------
alter table items enable row level security;
alter table price_history enable row level security;
alter table friends enable row level security;
alter table photo_submissions enable row level security;
alter table calendar_overrides enable row level security;
alter table business_config enable row level security;
alter table broadcasts enable row level security;

drop policy if exists "public can read calendar" on calendar_overrides;
create policy "public can read calendar" on calendar_overrides
  for select to anon using (true);

drop policy if exists "public can read business config" on business_config;
create policy "public can read business config" on business_config
  for select to anon using (true);

-- 価格ページの推移グラフ用。公開・有効な品目の履歴のみ閲覧可（下書き価格や非表示品目は含めない）。
drop policy if exists "public can read published price history" on price_history;
create policy "public can read published price history" on price_history
  for select to anon
  using (
    exists (
      select 1 from items
      where items.id = price_history.item_id
        and items.active
        and items.published_price is not null
    )
  );

grant select on public_prices to anon;
grant select on calendar_overrides to anon;
grant select on business_config to anon;
grant select on price_history to anon;
