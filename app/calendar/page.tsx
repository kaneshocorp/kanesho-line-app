import Link from "next/link";
import { supabasePublic } from "@/lib/supabase/public";
import { effectiveHours, effectiveStatus, overridesToFullMap, overridesToMap, toDateKey } from "@/lib/calendar";
import type { BusinessConfigRow, CalendarOverrideRow, EffectiveCalendarStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const WEEKDAY_JA = ["日", "月", "火", "水", "木", "金", "土"];
const MONTH_NAV_RANGE = 12; // 前後に移動できる月数

function formatOverrideDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const w = WEEKDAY_JA[d.getDay()];
  return `${m}月${day}日（${w}）`;
}

function formatTime(t: string | null): string | null {
  if (!t) return null;
  const [hh, mm] = t.split(":");
  return `${Number(hh)}:${mm}`;
}

/** "YYYY-MM" 形式をパースする。不正な場合は null。 */
function parseMonthParam(value: string | undefined): { year: number; month: number } | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  if (month < 0 || month > 11) return null;
  return { year, month };
}

function monthParam(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const monthParamRaw = Array.isArray(params.month) ? params.month[0] : params.month;

  const supabase = supabasePublic();

  const [overridesRes, configRes] = await Promise.all([
    supabase
      .from("calendar_overrides")
      .select("date, status, note, open_time, close_time")
      .order("date", { ascending: true }),
    supabase.from("business_config").select("*").eq("id", 1).maybeSingle(),
  ]);

  const overrides = (overridesRes.data ?? []) as CalendarOverrideRow[];
  const config = (configRes.data ?? null) as BusinessConfigRow | null;

  const todayKey = toDateKey(new Date());
  const upcomingClosure = overrides.find(
    (o) => o.status === "temp_closed" && o.date >= todayKey
  );
  const upcomingShortHours = overrides.find(
    (o) => o.status === "short_hours" && o.date >= todayKey
  );

  const overridesByDate = overridesToMap(overrides);
  const fullOverridesByDate = overridesToFullMap(overrides);

  const now = new Date();
  const parsed = parseMonthParam(monthParamRaw);
  const year = parsed?.year ?? now.getFullYear();
  const month = parsed?.month ?? now.getMonth();
  const monthLabel = `${year}年${month + 1}月`;
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = addMonths(year, month, -1);
  const nextMonth = addMonths(year, month, 1);
  const minMonth = addMonths(now.getFullYear(), now.getMonth(), -MONTH_NAV_RANGE);
  const maxMonth = addMonths(now.getFullYear(), now.getMonth(), MONTH_NAV_RANGE);
  const canGoPrev = prevMonth.year > minMonth.year ||
    (prevMonth.year === minMonth.year && prevMonth.month >= minMonth.month);
  const canGoNext = nextMonth.year < maxMonth.year ||
    (nextMonth.year === maxMonth.year && nextMonth.month <= maxMonth.month);

  const calendarCells: {
    date: Date | null;
    status: EffectiveCalendarStatus | null;
    isToday: boolean;
    isPast: boolean;
  }[] = [];
  for (let i = 0; i < startWeekday; i++) {
    calendarCells.push({ date: null, status: null, isToday: false, isPast: false });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const status = config ? effectiveStatus(d, overridesByDate, config) : null;
    calendarCells.push({
      date: d,
      status,
      isToday: toDateKey(d) === todayKey,
      isPast: toDateKey(d) < todayKey,
    });
  }

  const openTime = config ? formatTime(config.open_time) : null;
  const closeTime = config ? formatTime(config.close_time) : null;
  const breakStart = config ? formatTime(config.break_start) : null;
  const breakEnd = config ? formatTime(config.break_end) : null;

  return (
    <div className="page">
      <header className="us-hd">
        <div className="co">有限会社金山商店</div>
        <h1>営業カレンダー</h1>
        <div className="upd">{monthLabel}</div>
      </header>

      {upcomingClosure && (
        <div className="us-banner">
          ⚠ {formatOverrideDate(upcomingClosure.date)}は臨時休業いたします
        </div>
      )}

      {upcomingShortHours && (() => {
        const hours = effectiveHours(
          new Date(`${upcomingShortHours.date}T00:00:00`),
          fullOverridesByDate,
          config ?? { open_time: "09:00:00", close_time: "18:00:00" }
        );
        return (
          <div className="us-banner">
            ⚠ {formatOverrideDate(upcomingShortHours.date)}は{formatTime(hours.openTime)}〜
            {formatTime(hours.closeTime)}の時短営業です
          </div>
        );
      })()}

      <div className="us-notice">
        営業時間 {openTime ?? "--"}–{closeTime ?? "--"}
        {breakStart && breakEnd
          ? `（${breakStart}–${breakEnd}は昼休みのため不在です）`
          : ""}
      </div>

      <section className="us-card">
        <div className="cap">
          {canGoPrev ? (
            <Link className="cal-nav-link" href={`/calendar?month=${monthParam(prevMonth.year, prevMonth.month)}`}>
              ← 前月
            </Link>
          ) : (
            <span className="cal-nav-link off">← 前月</span>
          )}
          <span>{monthLabel}</span>
          {canGoNext ? (
            <Link className="cal-nav-link" href={`/calendar?month=${monthParam(nextMonth.year, nextMonth.month)}`}>
              翌月 →
            </Link>
          ) : (
            <span className="cal-nav-link off">翌月 →</span>
          )}
        </div>
        <div className="cal">
          {WEEKDAY_JA.map((w) => (
            <div className="h7" key={w}>
              {w}
            </div>
          ))}
          {calendarCells.map((cell, i) => {
            if (!cell.date) {
              return <div className="c blank" key={`blank-${i}`} />;
            }
            const classes = ["c", cell.status ?? "open"];
            if (cell.isPast) classes.push("past");
            if (cell.isToday) classes.push("today");
            const statusLabel =
              cell.status === "temp_closed"
                ? "臨時休"
                : cell.status === "short_hours"
                ? "時短"
                : cell.status === "holiday"
                ? "祝 休業"
                : cell.status === "closed"
                ? "休"
                : "";
            return (
              <div className={classes.join(" ")} key={cell.date.toISOString()}>
                {cell.date.getDate()}
                <span className="s">{statusLabel}</span>
              </div>
            );
          })}
        </div>
        <div className="legend">
          <span>
            <i style={{ background: "#f0f6ec" }} />
            営業
          </span>
          <span>
            <i style={{ background: "#fbedea" }} />
            定休・休業
          </span>
          <span>
            <i style={{ background: "#fbedea" }} />
            祝日
          </span>
          <span>
            <i style={{ background: "#fcf3df" }} />
            臨時休業
          </span>
          <span className="sw-short">
            <i />
            時短営業
          </span>
        </div>
      </section>

      <section className="us-card">
        <div className="cap">
          <span>お問い合わせ</span>
        </div>
        <div className="acc">
          〒740-0002 山口県岩国市新港町2丁目5-30
          <br />
          <span className="lm">JR岩国駅から車で約5分・道路向かいに釣具店と餃子の王将</span>
          <a className="call" href="tel:0827-22-7580">
            0827-22-7580 に電話する
          </a>
          <a
            className="maplink"
            href="https://maps.app.goo.gl/SmSwpLT9U1drWpYf7"
            target="_blank"
            rel="noopener noreferrer"
          >
            地図を開く
          </a>
        </div>
      </section>
    </div>
  );
}
