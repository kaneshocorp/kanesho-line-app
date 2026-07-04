"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { lineClient, buildPriceFlexMessage, buildTextMessage } from "@/lib/line/client";
import { toDateKey, naturalStatus } from "@/lib/calendar";
import type { ItemRow, BusinessConfigRow, CalendarOverrideRow } from "@/lib/types";

// -----------------------------------------------------------------------
// タブ1: 価格配信
// -----------------------------------------------------------------------

/** 品目の下書き価格（current_price）を保存する。 */
export async function updateCurrentPrice(itemId: string, price: number) {
  const safePrice = Math.max(0, Math.round(Number(price) || 0));
  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from("items")
    .update({ current_price: safePrice })
    .eq("id", itemId);
  if (error) throw new Error(`価格の保存に失敗しました: ${error.message}`);
}

function updatedAtLabel(date: Date): string {
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const w = weekdays[date.getDay()];
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${m}月${d}日(${w}) ${hh}:${mm} 更新`;
}

/**
 * 価格を配信する: active && current_price>0 の品目を published_price に反映し、
 * price_history に追記、LINEへFlexメッセージを配信し、broadcastsに記録する。
 */
export async function broadcastPrices(): Promise<{ recipientCount: number }> {
  const supabase = supabaseAdmin();

  const { data: items, error: itemsError } = await supabase
    .from("items")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (itemsError) throw new Error(`品目の取得に失敗しました: ${itemsError.message}`);

  const targets = (items ?? []).filter((i) => Number(i.current_price) > 0);

  for (const item of targets) {
    const { error } = await supabase
      .from("items")
      .update({
        published_price_prev: item.published_price,
        published_price: item.current_price,
      })
      .eq("id", item.id);
    if (error) throw new Error(`価格の更新に失敗しました: ${error.message}`);

    const { error: histError } = await supabase
      .from("price_history")
      .insert({ item_id: item.id, price: item.current_price });
    if (histError) throw new Error(`価格履歴の保存に失敗しました: ${histError.message}`);
  }

  const { data: freshItems, error: freshError } = await supabase
    .from("items")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (freshError) throw new Error(`品目の再取得に失敗しました: ${freshError.message}`);

  const { count: recipientCount, error: countError } = await supabase
    .from("friends")
    .select("*", { count: "exact", head: true })
    .eq("active", true);
  if (countError) throw new Error(`配信対象人数の取得に失敗しました: ${countError.message}`);

  const now = new Date();
  const label = updatedAtLabel(now);
  const message = buildPriceFlexMessage((freshItems ?? []) as ItemRow[], label);

  await lineClient().broadcast({ messages: [message] });

  const { error: broadcastError } = await supabase.from("broadcasts").insert({
    kind: "price",
    recipient_count: recipientCount ?? 0,
    snapshot: freshItems,
  });
  if (broadcastError) throw new Error(`配信履歴の保存に失敗しました: ${broadcastError.message}`);

  return { recipientCount: recipientCount ?? 0 };
}

/**
 * カレンダーの1日をタップした際のトグル。
 * 呼び出し側（クライアント）が既に実効ステータスから次の状態を算出済みなので、
 * ここではその next を受け取ってそのまま反映する。
 * next が自然な状態（祝日・第2/4土曜・曜日パターンを考慮した naturalStatus）と一致するなら
 * override 自体を削除してテーブルをきれいに保つ。
 */
export async function toggleCalendarDay(dateKey: string, next: "open" | "closed") {
  const supabase = supabaseAdmin();

  const { data: config, error: configError } = await supabase
    .from("business_config")
    .select("*")
    .eq("id", 1)
    .single();
  if (configError || !config) throw new Error(`営業設定の取得に失敗しました: ${configError?.message ?? ""}`);

  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const natural = naturalStatus(date, config as BusinessConfigRow);

  if (next === natural) {
    const { error } = await supabase.from("calendar_overrides").delete().eq("date", dateKey);
    if (error) throw new Error(`カレンダーの更新に失敗しました: ${error.message}`);
  } else {
    const { error } = await supabase
      .from("calendar_overrides")
      .upsert(
        { date: dateKey, status: next, note: null, open_time: null, close_time: null },
        { onConflict: "date" }
      );
    if (error) throw new Error(`カレンダーの更新に失敗しました: ${error.message}`);
  }
}

/** 指定した年月の calendar_overrides を取得する（月ナビゲーション用の追加ロード）。 */
export async function getCalendarOverridesForMonth(
  year: number,
  month: number // 0-indexed（Date.getMonth()と同じ）
): Promise<CalendarOverrideRow[]> {
  const supabase = supabaseAdmin();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  const startKey = toDateKey(start);
  const endKey = toDateKey(end);

  const { data, error } = await supabase
    .from("calendar_overrides")
    .select("date, status, note, open_time, close_time")
    .gte("date", startKey)
    .lte("date", endKey);
  if (error) throw new Error(`カレンダーの取得に失敗しました: ${error.message}`);
  return (data ?? []) as CalendarOverrideRow[];
}

/**
 * 複数日をまとめて休業にし、1通の配信で通知する（単一日でも配列に1件入れて呼ぶ）。
 * カレンダー上は常に temp_closed（臨時休業バッジ）として扱う。文面の緊急度（直近1週間以内かどうか）は
 * 呼び出し側（クライアント）が判断してmessageに反映する。
 */
export async function broadcastClosureBulk(
  dates: string[],
  message: string
): Promise<{ recipientCount: number }> {
  if (dates.length === 0) throw new Error("休業にする日付が選択されていません");
  const supabase = supabaseAdmin();

  const upserts = dates.map((dateKey) =>
    supabase
      .from("calendar_overrides")
      .upsert(
        { date: dateKey, status: "temp_closed", note: message, open_time: null, close_time: null },
        { onConflict: "date" }
      )
  );
  const results = await Promise.all(upserts);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(`カレンダーの更新に失敗しました: ${failed.error.message}`);

  const { count: recipientCount, error: countError } = await supabase
    .from("friends")
    .select("*", { count: "exact", head: true })
    .eq("active", true);
  if (countError) throw new Error(`配信対象人数の取得に失敗しました: ${countError.message}`);

  await lineClient().broadcast({ messages: [buildTextMessage(message)] });

  const { error: broadcastError } = await supabase.from("broadcasts").insert({
    kind: "closure",
    recipient_count: recipientCount ?? 0,
    snapshot: { dates, message },
  });
  if (broadcastError) throw new Error(`配信履歴の保存に失敗しました: ${broadcastError.message}`);

  return { recipientCount: recipientCount ?? 0 };
}

/**
 * 複数日をまとめて「時短営業」にし、1通の配信で通知する。
 * openTime/closeTimeは "HH:00" 形式（1時間単位での指定を想定）。
 */
export async function broadcastShortHoursBulk(
  dates: string[],
  openTime: string,
  closeTime: string,
  message: string
): Promise<{ recipientCount: number }> {
  if (dates.length === 0) throw new Error("時短営業にする日付が選択されていません");
  const supabase = supabaseAdmin();

  const upserts = dates.map((dateKey) =>
    supabase.from("calendar_overrides").upsert(
      {
        date: dateKey,
        status: "short_hours",
        note: message,
        open_time: openTime,
        close_time: closeTime,
      },
      { onConflict: "date" }
    )
  );
  const results = await Promise.all(upserts);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(`カレンダーの更新に失敗しました: ${failed.error.message}`);

  const { count: recipientCount, error: countError } = await supabase
    .from("friends")
    .select("*", { count: "exact", head: true })
    .eq("active", true);
  if (countError) throw new Error(`配信対象人数の取得に失敗しました: ${countError.message}`);

  await lineClient().broadcast({ messages: [buildTextMessage(message)] });

  const { error: broadcastError } = await supabase.from("broadcasts").insert({
    kind: "short_hours",
    recipient_count: recipientCount ?? 0,
    snapshot: { dates, openTime, closeTime, message },
  });
  if (broadcastError) throw new Error(`配信履歴の保存に失敗しました: ${broadcastError.message}`);

  return { recipientCount: recipientCount ?? 0 };
}

// -----------------------------------------------------------------------
// タブ2: 品目管理
// -----------------------------------------------------------------------

export async function updateItemName(itemId: string, name: string) {
  const supabase = supabaseAdmin();
  const { error } = await supabase.from("items").update({ name }).eq("id", itemId);
  if (error) throw new Error(`品目名の更新に失敗しました: ${error.message}`);
}

export async function updateItemPrice(itemId: string, price: number) {
  const safePrice = Math.max(0, Math.round(Number(price) || 0));
  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from("items")
    .update({ current_price: safePrice })
    .eq("id", itemId);
  if (error) throw new Error(`価格の更新に失敗しました: ${error.message}`);
}

export async function toggleItemActive(itemId: string, active: boolean) {
  const supabase = supabaseAdmin();
  const { error } = await supabase.from("items").update({ active }).eq("id", itemId);
  if (error) throw new Error(`表示設定の更新に失敗しました: ${error.message}`);
}

export async function deleteItem(itemId: string) {
  const supabase = supabaseAdmin();
  const { error } = await supabase.from("items").delete().eq("id", itemId);
  if (error) throw new Error(`品目の削除に失敗しました: ${error.message}`);
}

export async function addItem() {
  const supabase = supabaseAdmin();
  const { data: maxRow, error: maxError } = await supabase
    .from("items")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (maxError) throw new Error(`品目の追加に失敗しました: ${maxError.message}`);

  const nextSortOrder = (maxRow?.sort_order ?? 0) + 1;
  const { error } = await supabase.from("items").insert({
    name: "新しい品目",
    unit: "円/kg",
    current_price: 0,
    active: true,
    sort_order: nextSortOrder,
  });
  if (error) throw new Error(`品目の追加に失敗しました: ${error.message}`);
}

/**
 * ドラッグ&ドロップ後の並び順をまとめて保存する。
 * orderedIds は新しい表示順どおりに並んだ品目idの配列。
 */
export async function setItemOrder(orderedIds: string[]) {
  const supabase = supabaseAdmin();
  const updates = orderedIds.map((id, index) =>
    supabase.from("items").update({ sort_order: index + 1 }).eq("id", id)
  );
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(`並び替えに失敗しました: ${failed.error.message}`);
}

// -----------------------------------------------------------------------
// タブ3: 友だち
// -----------------------------------------------------------------------

export async function toggleFriendActive(lineUserId: string, active: boolean) {
  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from("friends")
    .update({ active })
    .eq("line_user_id", lineUserId);
  if (error) throw new Error(`配信設定の更新に失敗しました: ${error.message}`);
}

// -----------------------------------------------------------------------
// タブ4: 写真査定
// -----------------------------------------------------------------------

export async function togglePhotoDone(photoId: string, done: boolean) {
  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from("photo_submissions")
    .update({ done })
    .eq("id", photoId);
  if (error) throw new Error(`対応状況の更新に失敗しました: ${error.message}`);
}

// -----------------------------------------------------------------------
// タブ5: お知らせ（自由配信）
// -----------------------------------------------------------------------

/** 価格配信・休業連絡以外の、自由な文面を全友だちへ配信する。 */
export async function broadcastAnnouncement(message: string): Promise<{ recipientCount: number }> {
  const trimmed = message.trim();
  if (!trimmed) throw new Error("メッセージを入力してください");

  const supabase = supabaseAdmin();

  const { count: recipientCount, error: countError } = await supabase
    .from("friends")
    .select("*", { count: "exact", head: true })
    .eq("active", true);
  if (countError) throw new Error(`配信対象人数の取得に失敗しました: ${countError.message}`);

  await lineClient().broadcast({ messages: [buildTextMessage(trimmed)] });

  const { error: broadcastError } = await supabase.from("broadcasts").insert({
    kind: "announcement",
    recipient_count: recipientCount ?? 0,
    snapshot: { message: trimmed },
  });
  if (broadcastError) throw new Error(`配信履歴の保存に失敗しました: ${broadcastError.message}`);

  return { recipientCount: recipientCount ?? 0 };
}

export { toDateKey };
