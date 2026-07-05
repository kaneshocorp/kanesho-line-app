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

type DiffBadge = {
  label: string;
  color: string;
  backgroundColor: string;
};

/** 小数の丸め誤差を避けるため、小数第2位までに丸める。 */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function diffBadge(price: number, prev: number | null): DiffBadge | null {
  if (prev === null || prev === undefined) return null;
  const d = round2(price - prev);
  if (d > 0) {
    return { label: `▲+${d.toLocaleString("ja-JP")}`, color: "#B3261E", backgroundColor: "#FBE7E6" };
  }
  if (d < 0) {
    return { label: `▼${d.toLocaleString("ja-JP")}`, color: "#1B5E20", backgroundColor: "#E4F3E6" };
  }
  return { label: "±0", color: "#5F6C76", backgroundColor: "#EEF1F3" };
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

  const rows: messagingApi.FlexBox[] = shown.map((it, index) => {
    const badge = diffBadge(it.published_price ?? 0, it.published_price_prev);

    const priceContents: messagingApi.FlexComponent[] = [
      {
        type: "text",
        text: `${(it.published_price ?? 0).toLocaleString("ja-JP")}`,
        size: "xl",
        weight: "bold",
        color: "#24455C",
      },
      { type: "text", text: "円", size: "sm", color: "#24455C", margin: "xs" },
    ];

    if (badge) {
      priceContents.push({
        type: "box",
        layout: "vertical",
        margin: "sm",
        paddingAll: "4px",
        paddingStart: "8px",
        paddingEnd: "8px",
        cornerRadius: "12px",
        backgroundColor: badge.backgroundColor,
        justifyContent: "center",
        contents: [
          { type: "text", text: badge.label, size: "xxs", weight: "bold", color: badge.color, align: "center" },
        ],
      });
    }

    return {
      type: "box",
      layout: "horizontal",
      contents: [
        {
          type: "text",
          text: it.name,
          size: "sm",
          flex: 4,
          color: "#17222B",
          wrap: true,
          gravity: "center",
        },
        {
          type: "box",
          layout: "horizontal",
          flex: 5,
          alignItems: "center",
          justifyContent: "flex-end",
          contents: priceContents,
        },
      ],
      paddingTop: "10px",
      paddingBottom: "10px",
      paddingStart: "10px",
      paddingEnd: "10px",
      backgroundColor: index % 2 === 0 ? "#FFFFFF" : "#F7F9FA",
      cornerRadius: "8px",
    };
  });

  const bubble: messagingApi.FlexBubble = {
    type: "bubble",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#24455C",
      paddingAll: "16px",
      contents: [
        { type: "text", text: "現在の買取価格", color: "#FFFFFF", weight: "bold", size: "md" },
        { type: "text", text: updatedAtLabel, color: "#B9CDDC", size: "xs", margin: "sm" },
      ],
    },
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "12px",
      spacing: "sm",
      contents: rows.length > 0 ? rows : [{ type: "text", text: "価格情報がありません", size: "sm" }],
    },
    footer: {
      type: "box",
      layout: "vertical",
      paddingAll: "12px",
      contents: [
        {
          type: "button",
          style: "primary",
          height: "sm",
          color: "#24455C",
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
    altText: `現在の買取価格（${updatedAtLabel}）`,
    contents: bubble,
  };
}

export function buildTextMessage(text: string): messagingApi.TextMessage {
  return { type: "text", text };
}
