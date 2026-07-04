export type ItemRow = {
  id: string;
  name: string;
  unit: string;
  current_price: number;
  published_price: number | null;
  published_price_prev: number | null;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type PriceHistoryPoint = {
  price: number;
  recorded_at: string;
};

export type FriendRow = {
  line_user_id: string;
  display_name: string;
  real_name: string | null;
  active: boolean;
  awaiting_name: boolean;
  joined_at: string;
  updated_at: string;
};

export type PhotoSubmissionRow = {
  id: string;
  line_user_id: string;
  message_id: string;
  received_at: string;
  done: boolean;
  friend?: Pick<FriendRow, "display_name" | "real_name"> | null;
};

/** DBに保存されるカレンダー例外の状態 */
export type CalendarStatus = "open" | "closed" | "temp_closed";

/** 表示用の実効ステータス。祝日は例外テーブルに保存せず実行時に判定するため別区分。 */
export type EffectiveCalendarStatus = CalendarStatus | "holiday";

export type CalendarOverrideRow = {
  date: string;
  status: CalendarStatus;
  note: string | null;
};

export type BusinessConfigRow = {
  id: number;
  closed_weekdays: number[];
  open_time: string;
  close_time: string;
  break_start: string | null;
  break_end: string | null;
};

export type BroadcastKind = "price" | "closure" | "announcement";

export type BroadcastRow = {
  id: string;
  kind: BroadcastKind;
  sent_at: string;
  recipient_count: number;
  snapshot: unknown;
};
