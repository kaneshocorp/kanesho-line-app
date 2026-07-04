/**
 * リッチメニュー自動セットアップスクリプト。
 *
 * 実行方法:
 *   npx tsx scripts/setup-richmenu.ts
 *
 * .env.local から環境変数を読み込んだうえで実行してください。例:
 *   node --env-file=.env.local -r tsx/cjs scripts/setup-richmenu.ts
 * もしくは事前に環境変数をexportしてから実行してください。
 *
 * 6つのボタン（左上から右下へ 3列×2行、各 833x843）:
 *   1. 今週の買取価格   (uri)     -> {NEXT_PUBLIC_SITE_URL}/prices
 *   2. 営業カレンダー   (uri)     -> {NEXT_PUBLIC_SITE_URL}/prices
 *   3. 写真でかんたん査定 (message) -> "写真でかんたん査定"
 *   4. 店舗・アクセス   (uri)     -> https://maps.app.goo.gl/SmSwpLT9U1drWpYf7
 *   5. 品目一覧         (uri)     -> {NEXT_PUBLIC_SITE_URL}/prices
 *   6. 電話で相談       (uri)     -> tel:0827-22-7580
 */
import { messagingApi } from "@line/bot-sdk";
import sharp from "sharp";

const BRAND_BG = "#24455C";
const ACCENT = "#E89B0C";
const WHITE = "#FFFFFF";

const MENU_WIDTH = 2500;
const MENU_HEIGHT = 1686;
const COL_WIDTH = 833;
const ROW_HEIGHT = 843;

type ButtonDef = {
  label: string;
  icon: "yen" | "calendar" | "camera" | "pin" | "list" | "phone";
  accent?: boolean;
  action: messagingApi.Action;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(
      `環境変数 ${name} が設定されていません。.env.local に設定してから再実行してください。`
    );
    process.exit(1);
  }
  return value;
}

function buildButtons(siteUrl: string): ButtonDef[] {
  return [
    {
      label: "今週の買取価格",
      icon: "yen",
      accent: true,
      action: { type: "uri", label: "今週の買取価格", uri: `${siteUrl}/prices` },
    },
    {
      label: "営業カレンダー",
      icon: "calendar",
      action: { type: "uri", label: "営業カレンダー", uri: `${siteUrl}/prices` },
    },
    {
      label: "写真でかんたん査定",
      icon: "camera",
      action: { type: "message", label: "写真でかんたん査定", text: "写真でかんたん査定" },
    },
    {
      label: "店舗・アクセス",
      icon: "pin",
      action: {
        type: "uri",
        label: "店舗・アクセス",
        uri: "https://maps.app.goo.gl/SmSwpLT9U1drWpYf7",
      },
    },
    {
      label: "品目一覧",
      icon: "list",
      action: { type: "uri", label: "品目一覧", uri: `${siteUrl}/prices` },
    },
    {
      label: "電話で相談",
      icon: "phone",
      action: { type: "uri", label: "電話で相談", uri: "tel:0827-22-7580" },
    },
  ];
}

/** アイコン風の簡単な図形をSVGで描く（凝ったアイコンでなくラベルが読めれば十分）。 */
function iconSvg(icon: ButtonDef["icon"], cx: number, cy: number, color: string): string {
  const s = 44; // 図形の基準サイズ
  switch (icon) {
    case "yen":
      return `<text x="${cx}" y="${cy + s * 0.4}" font-size="${s * 1.8}" font-weight="700" text-anchor="middle" fill="${color}" font-family="sans-serif">¥</text>`;
    case "calendar":
      return `
        <rect x="${cx - s}" y="${cy - s * 0.8}" width="${s * 2}" height="${s * 1.8}" rx="8" fill="none" stroke="${color}" stroke-width="6"/>
        <line x1="${cx - s}" y1="${cy - s * 0.3}" x2="${cx + s}" y2="${cy - s * 0.3}" stroke="${color}" stroke-width="6"/>
        <line x1="${cx - s * 0.5}" y1="${cy - s * 1.1}" x2="${cx - s * 0.5}" y2="${cy - s * 0.6}" stroke="${color}" stroke-width="6" stroke-linecap="round"/>
        <line x1="${cx + s * 0.5}" y1="${cy - s * 1.1}" x2="${cx + s * 0.5}" y2="${cy - s * 0.6}" stroke="${color}" stroke-width="6" stroke-linecap="round"/>
      `;
    case "camera":
      return `
        <rect x="${cx - s}" y="${cy - s * 0.6}" width="${s * 2}" height="${s * 1.4}" rx="10" fill="none" stroke="${color}" stroke-width="6"/>
        <circle cx="${cx}" cy="${cy + s * 0.1}" r="${s * 0.5}" fill="none" stroke="${color}" stroke-width="6"/>
        <rect x="${cx - s * 0.35}" y="${cy - s * 0.95}" width="${s * 0.7}" height="${s * 0.35}" rx="4" fill="${color}"/>
      `;
    case "pin":
      return `
        <path d="M ${cx} ${cy - s * 1.1} C ${cx + s} ${cy - s * 1.1} ${cx + s} ${cy} ${cx} ${cy + s * 1.1} C ${cx - s} ${cy} ${cx - s} ${cy - s * 1.1} ${cx} ${cy - s * 1.1} Z" fill="none" stroke="${color}" stroke-width="6"/>
        <circle cx="${cx}" cy="${cy - s * 0.35}" r="${s * 0.32}" fill="${color}"/>
      `;
    case "list":
      return `
        <line x1="${cx - s}" y1="${cy - s * 0.7}" x2="${cx + s}" y2="${cy - s * 0.7}" stroke="${color}" stroke-width="7" stroke-linecap="round"/>
        <line x1="${cx - s}" y1="${cy}" x2="${cx + s}" y2="${cy}" stroke="${color}" stroke-width="7" stroke-linecap="round"/>
        <line x1="${cx - s}" y1="${cy + s * 0.7}" x2="${cx + s}" y2="${cy + s * 0.7}" stroke="${color}" stroke-width="7" stroke-linecap="round"/>
      `;
    case "phone":
      return `
        <path d="M ${cx - s * 0.9} ${cy - s} C ${cx - s * 1.1} ${cy - s * 0.5} ${cx + s * 0.5} ${cy + s * 1.1} ${cx + s} ${cy + s * 0.9}
          L ${cx + s * 0.6} ${cy + s * 0.3} L ${cx + s * 0.15} ${cy + s * 0.5} C ${cx - s * 0.15} ${cy + s * 0.2} ${cx - s * 0.2} ${cy - s * 0.15} ${cx - s * 0.5} ${cy - s * 0.45} L ${cx - s * 0.3} ${cy - s * 0.9} Z"
          fill="${color}"/>
      `;
    default:
      return "";
  }
}

function buildMenuSvg(buttons: ButtonDef[]): string {
  const cells = buttons
    .map((btn, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = col * COL_WIDTH;
      const y = row * ROW_HEIGHT;
      const cx = x + COL_WIDTH / 2;
      const cy = y + ROW_HEIGHT / 2 - 60;
      const labelColor = btn.accent ? BRAND_BG : WHITE;
      const cellFill = btn.accent ? ACCENT : "none";
      const iconColor = btn.accent ? BRAND_BG : WHITE;

      return `
        <g>
          ${cellFill !== "none" ? `<rect x="${x}" y="${y}" width="${COL_WIDTH}" height="${ROW_HEIGHT}" fill="${cellFill}"/>` : ""}
          <rect x="${x}" y="${y}" width="${COL_WIDTH}" height="${ROW_HEIGHT}" fill="none" stroke="#ffffff33" stroke-width="2"/>
          ${iconSvg(btn.icon, cx, cy, iconColor)}
          <text x="${cx}" y="${y + ROW_HEIGHT - 90}" font-size="52" font-weight="700" text-anchor="middle" fill="${labelColor}" font-family="sans-serif">${btn.label}</text>
        </g>
      `;
    })
    .join("\n");

  return `
    <svg width="${MENU_WIDTH}" height="${MENU_HEIGHT}" viewBox="0 0 ${MENU_WIDTH} ${MENU_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${MENU_WIDTH}" height="${MENU_HEIGHT}" fill="${BRAND_BG}"/>
      <line x1="${COL_WIDTH}" y1="0" x2="${COL_WIDTH}" y2="${MENU_HEIGHT}" stroke="#ffffff33" stroke-width="2"/>
      <line x1="${COL_WIDTH * 2}" y1="0" x2="${COL_WIDTH * 2}" y2="${MENU_HEIGHT}" stroke="#ffffff33" stroke-width="2"/>
      <line x1="0" y1="${ROW_HEIGHT}" x2="${MENU_WIDTH}" y2="${ROW_HEIGHT}" stroke="#ffffff33" stroke-width="2"/>
      ${cells}
    </svg>
  `;
}

async function main() {
  const accessToken = requireEnv("LINE_CHANNEL_ACCESS_TOKEN");
  requireEnv("LINE_CHANNEL_SECRET");
  const siteUrl = requireEnv("NEXT_PUBLIC_SITE_URL");

  const client = new messagingApi.MessagingApiClient({ channelAccessToken: accessToken });
  const blobClient = new messagingApi.MessagingApiBlobClient({ channelAccessToken: accessToken });

  const buttons = buildButtons(siteUrl);

  const areas: messagingApi.RichMenuArea[] = buttons.map((btn, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    return {
      bounds: {
        x: col * COL_WIDTH,
        y: row * ROW_HEIGHT,
        width: COL_WIDTH,
        height: ROW_HEIGHT,
      },
      action: btn.action,
    };
  });

  console.log("リッチメニューを作成しています...");
  const { richMenuId } = await client.createRichMenu({
    size: { width: MENU_WIDTH, height: MENU_HEIGHT },
    selected: true,
    name: "kanesho-default",
    chatBarText: "メニュー",
    areas,
  });
  console.log(`✓ リッチメニュー作成完了: richMenuId = ${richMenuId}`);

  console.log("メニュー画像を生成しています...");
  const svg = buildMenuSvg(buttons);
  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
  const imageBlob = new Blob([new Uint8Array(pngBuffer)], { type: "image/png" });

  console.log("メニュー画像をアップロードしています...");
  await blobClient.setRichMenuImage(richMenuId, imageBlob);
  console.log("✓ 画像アップロード完了");

  console.log("デフォルトのリッチメニューとして設定しています...");
  await client.setDefaultRichMenu(richMenuId);
  console.log("✓ デフォルトリッチメニュー設定完了");

  console.log("\n========================================");
  console.log("リッチメニューのセットアップが完了しました。");
  console.log(`richMenuId: ${richMenuId}`);
  console.log("========================================\n");
}

main().catch((err) => {
  console.error("リッチメニューのセットアップ中にエラーが発生しました:");
  console.error(err);
  process.exit(1);
});
