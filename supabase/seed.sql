-- 開発・デモ用の初期データ。金額はすべて仮の値です。実際の相場に差し替えてください。

insert into items (name, unit, current_price, published_price, published_price_prev, active, sort_order) values
  ('鉄屑 H2',           '円/kg', 48,   48,   46,   true,  1),
  ('新断（H1）',         '円/kg', 53,   53,   53,   true,  2),
  ('ステンレス屑',       '円/kg', 195,  195,  190,  true,  3),
  ('アルミ屑',           '円/kg', 185,  185,  180,  true,  4),
  ('被覆電線（雑線）',   '円/kg', 730,  730,  745,  true,  5),
  ('銅（ピカ線）',       '円/kg', 1480, 1480, 1450, true,  6),
  ('銅（込銅）',         '円/kg', 1250, 1250, 1230, true,  7),
  ('真鍮・砲金',         '円/kg', 900,  900,  880,  true,  8),
  ('ダライ粉（鉄）',     '円/kg', 28,   28,   27,   true,  9),
  ('ダライ粉（アルミ）', '円/kg', 0,    null, null, true,  10),
  ('雑品（モーター等）', '円/kg', 85,   null, null, false, 11)
on conflict do nothing;

-- 過去12週分の価格推移（価格ページのグラフ用）。主要3品目のみ。
insert into price_history (item_id, price, recorded_at)
select items.id, series.price, now() - (11 - series.week) * interval '7 days'
from items
join lateral (
  select * from unnest(array[41,42,42,44,43,45,46,45,46,46,46,48]) with ordinality as t(price, week)
) as series on true
where items.name = '鉄屑 H2';

insert into price_history (item_id, price, recorded_at)
select items.id, series.price, now() - (11 - series.week) * interval '7 days'
from items
join lateral (
  select * from unnest(array[1390,1400,1420,1410,1430,1445,1440,1450,1460,1455,1450,1480]) with ordinality as t(price, week)
) as series on true
where items.name = '銅（ピカ線）';

insert into price_history (item_id, price, recorded_at)
select items.id, series.price, now() - (11 - series.week) * interval '7 days'
from items
join lateral (
  select * from unnest(array[166,168,170,172,170,174,176,175,178,181,180,185]) with ordinality as t(price, week)
) as series on true
where items.name = 'アルミ屑';

-- 海の日（祝日休業の例）
insert into calendar_overrides (date, status, note) values
  ('2026-07-20', 'closed', '海の日')
on conflict (date) do nothing;

-- サンプルの友だち・写真査定依頼（動作確認用）
insert into friends (line_user_id, display_name, company, active, awaiting_company) values
  ('U_demo_0000000000000000000000001', '山本 一郎', '山本興業', true, false),
  ('U_demo_0000000000000000000000002', '佐々木 稔', '個人のお客様', true, false)
on conflict do nothing;
