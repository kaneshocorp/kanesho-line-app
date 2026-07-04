-- 全員への自由なお知らせ配信を追加する。

alter table broadcasts drop constraint if exists broadcasts_kind_check;
alter table broadcasts add constraint broadcasts_kind_check
  check (kind in ('price', 'closure', 'announcement'));
