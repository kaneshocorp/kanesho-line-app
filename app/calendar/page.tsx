import { supabasePublic } from "@/lib/supabase/public";
import { effectiveStatus, overridesToMap, toDateKey } from "@/lib/calendar";
import type { BusinessConfigRow, CalendarOverrideRow, CalendarStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const WEEKDAY_JA = ["日", "月", "火", "水", "木", "金", "土"];

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

export default async function CalendarPage() {
  const supabase = supabasePublic();

  const [overridesRes, configRes] = await Promise.all([
    supabase
      .from("calendar_overrides")
      .select("date, status, note")
      .order("date", { ascending: true }),
    supabase.from("business_config").select("*").eq("id", 1).maybeSingle(),
  ]);

  const overrides = (overridesRes.data ?? []) as CalendarOverrideRow[];
  const config = (configRes.data ?? null) as BusinessConfigRow | null;

  const todayKey = toDateKey(new Date());
  const upcomingClosure = overrides.find(
    (o) => o.status === "temp_closed" && o.date >= todayKey
  );

  const overridesByDate = overridesToMap(overrides);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthLabel = `${year}年${month + 1}月`;
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarCells: { date: Date | null; status: CalendarStatus | null; isToday: boolean; isPast: boolean }[] = [];
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
        <div className="co">有限会社金山商店｜きちんと計量</div>
        <h1>営業カレンダー</h1>
        <div className="upd">{monthLabel}</div>
      </header>

      {upcomingClosure && (
        <div className="us-banner">
          ⚠ {formatOverrideDate(upcomingClosure.date)}は臨時休業いたします
        </div>
      )}

      <div className="us-notice">
        営業時間 {openTime ?? "--"}–{closeTime ?? "--"}
        {breakStart && breakEnd
          ? `（${breakStart}–${breakEnd}は昼休みのため不在です）`
          : ""}
      </div>

      <section className="us-card">
        <div className="cap">
          <span>{monthLabel}</span>
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
              cell.status === "temp_closed" ? "臨時休" : cell.status === "closed" ? "休" : "";
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
            <i style={{ background: "#fcf3df" }} />
            臨時休業
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
