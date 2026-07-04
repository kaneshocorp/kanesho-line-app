import type { BusinessConfigRow, CalendarOverrideRow, CalendarStatus } from "@/lib/types";

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * override があればそれを優先し、なければ曜日パターン（closed_weekdays）から導出する。
 * これにより calendar_overrides テーブルには「例外の日」だけを持てばよい。
 */
export function effectiveStatus(
  date: Date,
  overridesByDate: Map<string, CalendarStatus>,
  config: Pick<BusinessConfigRow, "closed_weekdays">
): CalendarStatus {
  const override = overridesByDate.get(toDateKey(date));
  if (override) return override;
  return config.closed_weekdays.includes(date.getDay()) ? "closed" : "open";
}

export function overridesToMap(rows: CalendarOverrideRow[]): Map<string, CalendarStatus> {
  return new Map(rows.map((r) => [r.date, r.status]));
}
