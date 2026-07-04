-- 友だち登録は「会社名」ではなく「本名」の確認のみに変更する。

alter table friends rename column company to real_name;
alter table friends rename column awaiting_company to awaiting_name;
