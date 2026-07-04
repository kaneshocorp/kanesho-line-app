"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { lineClient, buildPriceFlexMessage, buildTextMessage } from "@/lib/line/client";
import { toDateKey, effectiveStatus, overridesToMap } from "@/lib/calendar";
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
 * 現在の実効ステータスが open ならその日を closed に、それ以外は open にする。
 * トグル後の値が曜日パターンと一致するなら override 自体を削除してテーブルをきれいに保つ。
 */
export async function toggleCalendarDay(dateKey: string) {
  const supabase = supabaseAdmin();

  const { data: config, error: configError } = await supabase
    .from("business_config")
    .select("*")
    .eq("id", 1)
    .single();
  if (configError || !config) throw new Error(`営業設定の取得に失敗しました: ${configError?.message ?? ""}`);

  const { data: overrideRows, error: overrideError } = await supabase
    .from("calendar_overrides")
    .select("date, status, note")
    .eq("date", dateKey);
  if (overrideError) throw new Error(`カレンダーの取得に失敗しました: ${overrideError.message}`);

  const overridesByDate = overridesToMap((overrideRows ?? []) as CalendarOverrideRow[]);
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const current = effectiveStatus(date, overridesByDate, config as BusinessConfigRow);
  const next = current === "open" ? "closed" : "open";

  const weekdayDefault = (config as BusinessConfigRow).closed_weekdays.includes(date.getDay())
    ? "closed"
    : "open";

  if (next === weekdayDefault) {
    const { error } = await supabase.from("calendar_overrides").delete().eq("date", dateKey);
    if (error) throw new Error(`カレンダーの更新に失敗しました: ${error.message}`);
  } else {
    const { error } = await supabase
      .from("calendar_overrides")
      .upsert({ date: dateKey, status: next, note: null }, { onConflict: "date" });
    if (error) throw new Error(`カレンダーの更新に失敗しました: ${error.message}`);
  }
}

/**
 * 急な休業の連絡: カレンダーに temp_closed を記録し、全友だちへテキストを配信する。
 */
export async function broadcastClosure(
  dateKey: string,
  message: string
): Promise<{ recipientCount: number }> {
  const supabase = supabaseAdmin();

  const { error: overrideError } = await supabase
    .from("calendar_overrides")
    .upsert({ date: dateKey, status: "temp_closed", note: message }, { onConflict: "date" });
  if (overrideError) throw new Error(`カレンダーの更新に失敗しました: ${overrideError.message}`);

  const { count: recipientCount, error: countError } = await supabase
    .from("friends")
    .select("*", { count: "exact", head: true })
    .eq("active", true);
  if (countError) throw new Error(`配信対象人数の取得に失敗しました: ${countError.message}`);

  await lineClient().broadcast({ messages: [buildTextMessage(message)] });

  const { error: broadcastError } = await supabase.from("broadcasts").insert({
    kind: "closure",
    recipient_count: recipientCount ?? 0,
    snapshot: { date: dateKey, message },
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

/** 隣り合う2品目の sort_order を入れ替える。 */
export async function swapItemOrder(itemId: string, direction: "up" | "down") {
  const supabase = supabaseAdmin();
  const { data: items, error } = await supabase
    .from("items")
    .select("id, sort_order")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(`並び替えに失敗しました: ${error.message}`);

  const list = items ?? [];
  const index = list.findIndex((i) => i.id === itemId);
  if (index === -1) return;

  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= list.length) return;

  const current = list[index];
  const target = list[targetIndex];

  const { error: error1 } = await supabase
    .from("items")
    .update({ sort_order: target.sort_order })
    .eq("id", current.id);
  if (error1) throw new Error(`並び替えに失敗しました: ${error1.message}`);

  const { error: error2 } = await supabase
    .from("items")
    .update({ sort_order: current.sort_order })
    .eq("id", target.id);
  if (error2) throw new Error(`並び替えに失敗しました: ${error2.message}`);
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

export { toDateKey };
