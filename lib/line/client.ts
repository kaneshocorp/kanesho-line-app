import { messagingApi, validateSignature } from "@line/bot-sdk";
import type { ItemRow } from "@/lib/types";

function channelAccessToken() {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) throw new Error("LINE_CHANNEL_ACCESS_TOKEN が未設定です。");
  return token;
}

export function lineClient() {
  return new messagingApi.MessagingApiClient({
    channelAccessToken: channelAccessToken(),
  });
}

export function lineBlobClient() {
  return new messagingApi.MessagingApiBlobClient({
    channelAccessToken: channelAccessToken(),
  });
}

export function verifyLineSignature(rawBody: string, signature: string) {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret) throw new Error("LINE_CHANNEL_SECRET が未設定です。");
  return validateSignature(rawBody, secret, signature);
}

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.vercel.app";
}

function diffText(price: number, prev: number | null) {
  if (prev === null || prev === undefined) return "";
  const d = price - prev;
  if (d > 0) return ` (▲+${d.toLocaleString("ja-JP")})`;
  if (d < 0) return ` (▼${d.toLocaleString("ja-JP")})`;
  return " (±0)";
}

/**
 * 今週の買取価格 Flex メッセージを組み立てる。
 * 表示は上位6品目までに絞り、全品目は価格ページへ誘導する
 * （LINEの「1配信=3吹き出しまで」枠を圧迫しないため）。
 */
export function buildPriceFlexMessage(
  items: ItemRow[],
  updatedAtLabel: string
): messagingApi.FlexMessage {
  const visible = items
    .filter((i) => i.active && (i.published_price ?? 0) > 0)
    .sort((a, b) => a.sort_order - b.sort_order);
  const shown = visible.slice(0, 6);

  const rows: messagingApi.FlexBox[] = shown.map((it) => ({
    layout: "horizontal",
    type: "box",
    contents: [
      { type: "text", text: it.name, size: "sm", flex: 3, color: "#17222B", wrap: true },
      {
        type: "text",
        text: `${it.published_price?.toLocaleString("ja-JP")}円${diffText(
          it.published_price ?? 0,
          it.published_price_prev
        )}`,
        size: "sm",
        flex: 3,
        align: "end",
        weight: "bold",
        color: "#17222B",
      },
    ],
    paddingTop: "6px",
    paddingBottom: "6px",
    borderWidth: "1px",
    borderColor: "#EEF1F3",
  }));

  const bubble: messagingApi.FlexBubble = {
    type: "bubble",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#24455C",
      paddingAll: "16px",
      contents: [
        { type: "text", text: "今週の買取価格", color: "#FFFFFF", weight: "bold", size: "md" },
        { type: "text", text: updatedAtLabel, color: "#B9CDDC", size: "xs", margin: "sm" },
      ],
    },
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "12px",
      contents: rows.length > 0 ? rows : [{ type: "text", text: "価格情報がありません", size: "sm" }],
    },
    footer: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "button",
          style: "link",
          height: "sm",
          action: {
            type: "uri",
            label: `全${visible.length}品目・価格の推移を見る`,
            uri: `${siteUrl()}/prices`,
          },
        },
      ],
    },
  };

  return {
    type: "flex",
    altText: `今週の買取価格（${updatedAtLabel}）`,
    contents: bubble,
  };
}

export function buildTextMessage(text: string): messagingApi.TextMessage {
  return { type: "text", text };
}
