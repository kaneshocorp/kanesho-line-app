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
  company: string | null;
  active: boolean;
  awaiting_company: boolean;
  joined_at: string;
  updated_at: string;
};

export type PhotoSubmissionRow = {
  id: string;
  line_user_id: string;
  message_id: string;
  received_at: string;
  done: boolean;
  friend?: Pick<FriendRow, "display_name" | "company"> | null;
};

export type CalendarStatus = "open" | "closed" | "temp_closed";

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

export type BroadcastKind = "price" | "closure";

export type BroadcastRow = {
  id: string;
  kind: BroadcastKind;
  sent_at: string;
  recipient_count: number;
  snapshot: unknown;
};
