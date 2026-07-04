import * as JapaneseHolidays from "japanese-holidays";
import type { BusinessConfigRow, CalendarOverrideRow, CalendarStatus, EffectiveCalendarStatus } from "@/lib/types";

const SATURDAY = 6;
const RECURRING_CLOSED_NTH_SATURDAYS = [2, 4]; // 第2・第4土曜日は定休

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function holidayName(date: Date): string | undefined {
  return JapaneseHolidays.isHoliday(date);
}

/** date がその月の第何回目の weekday にあたるかを判定する（1〜5）。 */
function nthWeekdayOfMonth(date: Date): number {
  return Math.floor((date.getDate() - 1) / 7) + 1;
}

function isRecurringClosedSaturday(date: Date): boolean {
  return date.getDay() === SATURDAY && RECURRING_CLOSED_NTH_SATURDAYS.includes(nthWeekdayOfMonth(date));
}

/**
 * override を除いた「本来の」営業状態。祝日・第2/4土曜・曜日パターンの順で判定する。
 * 管理画面でのタップ操作は、この自然な状態と一致するならoverrideを削除し、
 * 異なるならoverrideを作る、という形でテーブルをきれいに保つ。
 */
export function naturalStatus(
  date: Date,
  config: Pick<BusinessConfigRow, "closed_weekdays">
): "open" | "closed" {
  if (holidayName(date)) return "closed";
  if (isRecurringClosedSaturday(date)) return "closed";
  return config.closed_weekdays.includes(date.getDay()) ? "closed" : "open";
}

/**
 * override があればそれを最優先し（祝日でも営業に上書き可能）、
 * なければ祝日 → 第2/4土曜 → 曜日パターンの順で導出する。
 */
export function effectiveStatus(
  date: Date,
  overridesByDate: Map<string, CalendarStatus>,
  config: Pick<BusinessConfigRow, "closed_weekdays">
): EffectiveCalendarStatus {
  const override = overridesByDate.get(toDateKey(date));
  if (override) return override;
  if (holidayName(date)) return "holiday";
  if (isRecurringClosedSaturday(date)) return "closed";
  return config.closed_weekdays.includes(date.getDay()) ? "closed" : "open";
}

export function overridesToMap(rows: CalendarOverrideRow[]): Map<string, CalendarStatus> {
  return new Map(rows.map((r) => [r.date, r.status]));
}
