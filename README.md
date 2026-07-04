# kanesho-line-app

有限会社金山商店（山口県岩国市）向け、買取価格LINE配信アプリ。

- **管理画面** `/admin` — 従業員・ご家族がスマホから価格入力・品目管理・友だち管理・写真査定を行う（ログイン不要、URLを知っている人が使う運用）。
- **価格ページ** `/prices` — お客様がLINEのリッチメニューから開く公開ページ。最新価格・推移グラフ・営業カレンダー・連絡先を表示。
- **LINE連携** — 価格配信・臨時休業連絡はMessaging APIのbroadcastで送信。友だち追加時の会社名ヒアリング、写真でかんたん査定の受付も自動化。

技術構成: Next.js 16 (App Router) + Supabase (Postgres/RLS) + LINE Messaging API。ホスティングはVercelの無料枠を想定。

---

## セットアップの流れ

**推奨: すべて金山商店名義のGoogleアカウントで作成してください。** LINE公式アカウントは会社の資産そのものなので、個人アカウント配下に作ってしまうと将来の引き継ぎが困難になります（GitHub/Supabase/Vercelも同様の理由で会社アカウント推奨）。

### 1. Supabaseプロジェクトを作成

1. [supabase.com](https://supabase.com) で新規プロジェクトを作成（無料枠でOK）。
2. プロジェクトのSQL Editorで `supabase/migrations/0001_init.sql` の内容を実行し、続けて `supabase/seed.sql` を実行する（初期データを入れたくない場合はseedはスキップしてよい。品目は管理画面の「品目管理」タブから追加できる）。
3. プロジェクト設定 > API から以下を控える:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL` と `SUPABASE_URL`（同じ値）
   - `anon` `public` キー → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` キー → `SUPABASE_SERVICE_ROLE_KEY`（**絶対にブラウザに出さない・公開しない**）

### 2. LINE公式アカウントを作成・連携

詳しい手順は [docs/LINE_SETUP.md](docs/LINE_SETUP.md) を参照してください。チャネルアクセストークン・チャネルシークレットの取得、Webhook URLの設定、リッチメニューの自動セットアップまでを解説しています。

### 3. 環境変数を設定

`.env.example` をコピーして `.env.local` を作成し、Supabase・LINEの値を埋める。

```bash
cp .env.example .env.local
```

### 4. デプロイ（Vercel）

1. このリポジトリをGitHubに push（金山商店名義のGitHubアカウント推奨）。
2. [vercel.com](https://vercel.com) で新規プロジェクトとしてimportし、`.env.local` と同じ環境変数を設定する。
3. デプロイ後のドメインを `NEXT_PUBLIC_SITE_URL` に設定し直す（最初は仮のURLしか分からないため、初回デプロイ後にVercelの環境変数を更新して再デプロイする）。
4. LINE Developersコンソールで Webhook URL を `https://<デプロイ先ドメイン>/api/line/webhook` に設定する（docs/LINE_SETUP.md 参照）。
5. `npm run setup:richmenu` を実行してリッチメニューを反映する。

---

## ローカル開発

```bash
npm install
npm run dev       # http://localhost:3000
npm run lint      # ESLint
npx tsc --noEmit  # 型チェック
```

ローカルで `/admin` `/prices` を動かすには `.env.local` にSupabaseの値が必要です（LINEの値が無くても価格の閲覧・入力はできますが、配信ボタンはLINEの環境変数が無いとエラーになります）。

---

## ディレクトリ構成

```
app/admin/       管理画面（Server Component + Client Component + Server Actions）
app/prices/      公開価格ページ
app/api/line/    LINE Webhook・画像プロキシ
lib/             Supabaseクライアント・LINEクライアント・型定義・カレンダー計算
supabase/        スキーマ（migrations）・シードデータ
scripts/         リッチメニュー自動セットアップ
docs/            LINE設定手順書
```

## 運用メモ

- 価格の下書き（`items.current_price`）と実際に配信済みの価格（`items.published_price`）は別管理。「価格をプレビューして配信」を押すまでお客様には見えない。
- 価格が未入力（0円）の品目、非表示にした品目はお客様向けページ・LINEに一切表示されない。
- 友だちの「配信を止める」はLINEの友だち関係自体は残したまま配信対象から外す機能（来店しなくなった顧客への配信でLINEの通数を無駄にしないため）。ブロックされた場合は自動的にactive=falseになる。
- 営業カレンダーは「例外の日」だけをDBに持つ設計（曜日の基本パターン + 例外）。管理画面でタップすると自動で例外の追加/削除が行われる。
- 管理画面には認証を設けていない（URLを知っている人なら誰でも操作できる）。これは意図的な設計判断だが、公開URLとして共有しないよう注意すること。より高いセキュリティが必要になった場合はVercelのDeployment Protectionや簡易パスコードの追加を検討する。
