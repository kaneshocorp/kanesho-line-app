-- 「チャットで相談」「写真でかんたん査定」ボタンから始まる相談セッションの状態を友だちごとに1つ持つ。
-- true の間に届いたメッセージ・写真は「案内済み（対応が必要）」として扱う。
alter table friends add column if not exists conversation_open boolean not null default false;

-- ボタンを押さず唐突に送られてきたメッセージかどうかを区別するフラグ。
-- 唐突なメッセージは read=true で保存され（対応不要・未対応バッジに含めない）、
-- prompted=false だけが「これは案内だけ返した唐突なメッセージだった」という記録として残る。
alter table messages add column if not exists prompted boolean not null default true;
