/**
 * リッチメニュー自動セットアップスクリプト。
 *
 * 実行方法:
 *   npm run setup:richmenu
 *
 * .env.local から環境変数を読み込んだうえで実行してください。
 *
 * 7つのボタン（左上から右下へ 4列×2行、各625x843）＋右下1マスは装飾のみ（タップ不可）:
 *   1. 現在の買取価格     (uri)     -> {NEXT_PUBLIC_SITE_URL}/prices
 *   2. チャットで相談     (message) -> "チャットで相談"
 *   3. 写真でかんたん査定 (message) -> "写真でかんたん査定"
 *   4. 営業カレンダー     (uri)     -> {NEXT_PUBLIC_SITE_URL}/calendar
 *   5. 店舗・アクセス     (uri)     -> https://maps.app.goo.gl/SmSwpLT9U1drWpYf7
 *   6. 会社概要           (uri)     -> {NEXT_PUBLIC_SITE_URL}/about
 *   7. 電話で相談         (uri)     -> tel:0827-22-7580
 */
import { messagingApi } from "@line/bot-sdk";
import sharp from "sharp";

const BRAND_BG = "#24455C";
const ACCENT = "#E89B0C";
const WHITE = "#FFFFFF";

const MENU_WIDTH = 2500;
const MENU_HEIGHT = 1686;
const COLS = 4;
const COL_WIDTH = MENU_WIDTH / COLS; // 625
const ROW_HEIGHT = MENU_HEIGHT / 2; // 843

type ButtonDef = {
  label: string[]; // 1〜2行に分けたラベル
  icon: "yen" | "calendar" | "camera" | "pin" | "building" | "phone" | "chat";
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

export function buildButtons(siteUrl: string): ButtonDef[] {
  return [
    {
      label: ["現在の", "買取価格"],
      icon: "yen",
      accent: true,
      action: { type: "uri", label: "現在の買取価格", uri: `${siteUrl}/prices` },
    },
    {
      label: ["チャットで", "相談"],
      icon: "chat",
      action: { type: "message", label: "チャットで相談", text: "チャットで相談" },
    },
    {
      label: ["写真で", "かんたん査定"],
      icon: "camera",
      action: { type: "message", label: "写真でかんたん査定", text: "写真でかんたん査定" },
    },
    {
      label: ["営業", "カレンダー"],
      icon: "calendar",
      action: { type: "uri", label: "営業カレンダー", uri: `${siteUrl}/calendar` },
    },
    {
      label: ["店舗・", "アクセス"],
      icon: "pin",
      action: {
        type: "uri",
        label: "店舗・アクセス",
        uri: "https://maps.app.goo.gl/SmSwpLT9U1drWpYf7",
      },
    },
    {
      label: ["会社概要"],
      icon: "building",
      action: { type: "uri", label: "会社概要", uri: `${siteUrl}/about` },
    },
    {
      label: ["電話で相談"],
      icon: "phone",
      action: { type: "uri", label: "電話で相談", uri: "tel:0827-22-7580" },
    },
  ];
}

/** アイコン風の簡単な図形をSVGで描く（凝ったアイコンでなくラベルが読めれば十分）。 */
function iconSvg(icon: ButtonDef["icon"], cx: number, cy: number, color: string): string {
  const s = 60; // 図形の基準サイズ（4列レイアウト用に縮小）
  switch (icon) {
    case "yen":
      return `<text x="${cx}" y="${cy + s * 0.4}" font-size="${s * 1.9}" font-weight="700" text-anchor="middle" fill="${color}" font-family="sans-serif">¥</text>`;
    case "calendar":
      return `
        <rect x="${cx - s}" y="${cy - s * 0.8}" width="${s * 2}" height="${s * 1.8}" rx="10" fill="none" stroke="${color}" stroke-width="8"/>
        <line x1="${cx - s}" y1="${cy - s * 0.3}" x2="${cx + s}" y2="${cy - s * 0.3}" stroke="${color}" stroke-width="8"/>
        <line x1="${cx - s * 0.5}" y1="${cy - s * 1.1}" x2="${cx - s * 0.5}" y2="${cy - s * 0.6}" stroke="${color}" stroke-width="8" stroke-linecap="round"/>
        <line x1="${cx + s * 0.5}" y1="${cy - s * 1.1}" x2="${cx + s * 0.5}" y2="${cy - s * 0.6}" stroke="${color}" stroke-width="8" stroke-linecap="round"/>
      `;
    case "camera":
      return `
        <rect x="${cx - s}" y="${cy - s * 0.6}" width="${s * 2}" height="${s * 1.4}" rx="12" fill="none" stroke="${color}" stroke-width="8"/>
        <circle cx="${cx}" cy="${cy + s * 0.1}" r="${s * 0.5}" fill="none" stroke="${color}" stroke-width="8"/>
        <rect x="${cx - s * 0.35}" y="${cy - s * 0.95}" width="${s * 0.7}" height="${s * 0.35}" rx="5" fill="${color}"/>
      `;
    case "pin":
      return `
        <path d="M ${cx} ${cy - s * 1.1} C ${cx + s} ${cy - s * 1.1} ${cx + s} ${cy} ${cx} ${cy + s * 1.1} C ${cx - s} ${cy} ${cx - s} ${cy - s * 1.1} ${cx} ${cy - s * 1.1} Z" fill="none" stroke="${color}" stroke-width="8"/>
        <circle cx="${cx}" cy="${cy - s * 0.35}" r="${s * 0.32}" fill="${color}"/>
      `;
    case "building":
      return `
        <rect x="${cx - s * 0.75}" y="${cy - s * 1.1}" width="${s * 1.5}" height="${s * 2.1}" rx="5" fill="none" stroke="${color}" stroke-width="8"/>
        <line x1="${cx - s * 0.4}" y1="${cy - s * 0.65}" x2="${cx - s * 0.15}" y2="${cy - s * 0.65}" stroke="${color}" stroke-width="7"/>
        <line x1="${cx + s * 0.15}" y1="${cy - s * 0.65}" x2="${cx + s * 0.4}" y2="${cy - s * 0.65}" stroke="${color}" stroke-width="7"/>
        <line x1="${cx - s * 0.4}" y1="${cy - s * 0.15}" x2="${cx - s * 0.15}" y2="${cy - s * 0.15}" stroke="${color}" stroke-width="7"/>
        <line x1="${cx + s * 0.15}" y1="${cy - s * 0.15}" x2="${cx + s * 0.4}" y2="${cy - s * 0.15}" stroke="${color}" stroke-width="7"/>
        <rect x="${cx - s * 0.22}" y="${cy + s * 0.35}" width="${s * 0.44}" height="${s * 0.65}" fill="${color}"/>
      `;
    case "phone":
      return `
        <path d="M ${cx - s * 0.9} ${cy - s} C ${cx - s * 1.1} ${cy - s * 0.5} ${cx + s * 0.5} ${cy + s * 1.1} ${cx + s} ${cy + s * 0.9}
          L ${cx + s * 0.6} ${cy + s * 0.3} L ${cx + s * 0.15} ${cy + s * 0.5} C ${cx - s * 0.15} ${cy + s * 0.2} ${cx - s * 0.2} ${cy - s * 0.15} ${cx - s * 0.5} ${cy - s * 0.45} L ${cx - s * 0.3} ${cy - s * 0.9} Z"
          fill="${color}"/>
      `;
    case "chat":
      return `
        <rect x="${cx - s}" y="${cy - s * 0.85}" width="${s * 2}" height="${s * 1.5}" rx="18" fill="none" stroke="${color}" stroke-width="8"/>
        <path d="M ${cx - s * 0.4} ${cy + s * 0.65} L ${cx - s * 0.55} ${cy + s * 1.15} L ${cx + s * 0.05} ${cy + s * 0.65} Z" fill="${color}"/>
        <line x1="${cx - s * 0.55}" y1="${cy - s * 0.15}" x2="${cx + s * 0.55}" y2="${cy - s * 0.15}" stroke="${color}" stroke-width="7" stroke-linecap="round"/>
        <line x1="${cx - s * 0.55}" y1="${cy + s * 0.25}" x2="${cx + s * 0.25}" y2="${cy + s * 0.25}" stroke="${color}" stroke-width="7" stroke-linecap="round"/>
      `;
    default:
      return "";
  }
}

function labelSvg(lines: string[], cx: number, baseY: number, color: string): string {
  const fontSize = 62;
  const lineHeight = 72;
  // 2行なら中央揃えのため少し上にずらす
  const startY = lines.length === 2 ? baseY - lineHeight / 2 : baseY;
  return lines
    .map(
      (line, i) =>
        `<text x="${cx}" y="${startY + i * lineHeight}" font-size="${fontSize}" font-weight="700" text-anchor="middle" fill="${color}" font-family="sans-serif">${line}</text>`
    )
    .join("\n");
}

export function buildMenuSvg(buttons: ButtonDef[]): string {
  const cells = buttons
    .map((btn, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = col * COL_WIDTH;
      const y = row * ROW_HEIGHT;
      const cx = x + COL_WIDTH / 2;
      const iconCy = y + ROW_HEIGHT * 0.36;
      const labelBaseY = y + ROW_HEIGHT * 0.78;
      const labelColor = btn.accent ? BRAND_BG : WHITE;
      const cellFill = btn.accent ? ACCENT : "none";
      const iconColor = btn.accent ? BRAND_BG : WHITE;

      return `
        <g>
          ${cellFill !== "none" ? `<rect x="${x}" y="${y}" width="${COL_WIDTH}" height="${ROW_HEIGHT}" fill="${cellFill}"/>` : ""}
          <rect x="${x}" y="${y}" width="${COL_WIDTH}" height="${ROW_HEIGHT}" fill="none" stroke="#ffffff33" stroke-width="2"/>
          ${iconSvg(btn.icon, cx, iconCy, iconColor)}
          ${labelSvg(btn.label, cx, labelBaseY, labelColor)}
        </g>
      `;
    })
    .join("\n");

  // 8マス目（右下）はボタンなしの装飾セル。タップ領域には含めない。
  const lastCol = buttons.length % COLS;
  const lastRow = Math.floor(buttons.length / COLS);
  const decoX = lastCol * COL_WIDTH;
  const decoY = lastRow * ROW_HEIGHT;
  const decoCx = decoX + COL_WIDTH / 2;
  const decoCy = decoY + ROW_HEIGHT / 2;
  const decoCell = `
    <g>
      <rect x="${decoX}" y="${decoY}" width="${COL_WIDTH}" height="${ROW_HEIGHT}" fill="none" stroke="#ffffff33" stroke-width="2"/>
      <text x="${decoCx}" y="${decoCy + 22}" font-size="70" font-weight="700" text-anchor="middle" fill="#ffffff55" font-family="sans-serif">金</text>
    </g>
  `;

  const dividers = Array.from({ length: COLS - 1 }, (_, i) => {
    const x = (i + 1) * COL_WIDTH;
    return `<line x1="${x}" y1="0" x2="${x}" y2="${MENU_HEIGHT}" stroke="#ffffff33" stroke-width="2"/>`;
  }).join("\n");

  return `
    <svg width="${MENU_WIDTH}" height="${MENU_HEIGHT}" viewBox="0 0 ${MENU_WIDTH} ${MENU_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${MENU_WIDTH}" height="${MENU_HEIGHT}" fill="${BRAND_BG}"/>
      ${dividers}
      <line x1="0" y1="${ROW_HEIGHT}" x2="${MENU_WIDTH}" y2="${ROW_HEIGHT}" stroke="#ffffff33" stroke-width="2"/>
      ${cells}
      ${decoCell}
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
    const col = i % COLS;
    const row = Math.floor(i / COLS);
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

// プレビュー生成スクリプトなど、他ファイルから buildButtons/buildMenuSvg だけを
// import した際に本番APIへ誤って接続しないよう、直接実行された時だけ main() を走らせる。
if (process.argv[1]?.endsWith("setup-richmenu.ts") || process.argv[1]?.endsWith("setup-richmenu.js")) {
  main().catch((err) => {
    console.error("リッチメニューのセットアップ中にエラーが発生しました:");
    console.error(err);
    process.exit(1);
  });
}
