-- 時短営業（特定日だけ営業時間を短縮）を追加する。

alter table calendar_overrides add column if not exists open_time time;
alter table calendar_overrides add column if not exists close_time time;

alter table calendar_overrides drop constraint if exists calendar_overrides_status_check;
alter table calendar_overrides add constraint calendar_overrides_status_check
  check (status in ('open', 'closed', 'temp_closed', 'short_hours'));

alter table broadcasts drop constraint if exists broadcasts_kind_check;
alter table broadcasts add constraint broadcasts_kind_check
  check (kind in ('price', 'closure', 'announcement', 'short_hours'));
