"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { CalendarOverrideRow, BusinessConfigRow, EffectiveCalendarStatus } from "@/lib/types";
import {
  effectiveStatus,
  naturalStatus,
  overridesToMap,
  overridesToFullMap,
  toDateKey,
  holidayName,
} from "@/lib/calendar";

/** カレンダーのマス目用に「9-15」のように短く営業時間を表す。 */
function formatHourRange(openTime: string | null | undefined, closeTime: string | null | undefined): string {
  if (!openTime || !closeTime) return "時短";
  return `${Number(openTime.split(":")[0])}-${Number(closeTime.split(":")[0])}`;
}
import {
  toggleCalendarDay,
  broadcastClosureBulk,
  broadcastShortHoursBulk,
  getCalendarOverridesForMonth,
} from "@/app/admin/actions";

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

// 未来にナビゲートできる月数（今月を含めて13ヶ月分＝約12ヶ月先まで見られる）
const MAX_MONTHS_AHEAD = 12;

// 緊急トーンにするかどうかの閾値（今日からこの日数以内を含む場合は緊急）
const URGENT_WITHIN_DAYS = 7;

function monthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

/** 「7/17（金）」「7/20（月・祝）」のように日付を整形する。祝日なら祝日名の代わりに「祝」を付す。 */
function formatClosureDate(date: Date) {
  const w = WEEKDAY_LABELS[date.getDay()];
  const isHoliday = Boolean(holidayName(date));
  const wLabel = isHoliday ? `${w}・祝` : w;
  return `${date.getMonth() + 1}/${date.getDate()}（${wLabel}）`;
}

/** dateKey文字列（YYYY-MM-DD）をローカル日付として解釈する。 */
function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** 選択した日付のdateKey配列を、日付順に整形して「・」区切りの文字列にする。 */
function formatClosureDateList(dateKeys: string[]): string {
  return [...dateKeys]
    .sort()
    .map((key) => formatClosureDate(parseDateKey(key)))
    .join("・");
}

/** 選択日のうち最も近い日が今日からURGENT_WITHIN_DAYS以内かどうかで、緊急/通常の文面を生成する。 */
function buildClosureMessage(dateKeys: string[], today: Date): string {
  const label = formatClosureDateList(dateKeys);
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const minDiffDays = Math.min(
    ...dateKeys.map((key) => {
      const d = parseDateKey(key);
      const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      return Math.round((dStart.getTime() - todayStart.getTime()) / 86400000);
    })
  );
  const isUrgent = minDiffDays <= URGENT_WITHIN_DAYS;
  if (isUrgent) {
    return `【臨時休業のお知らせ】${label}は都合により休業いたします。ご迷惑をおかけしますが、よろしくお願いいたします。`;
  }
  return `【営業日変更のお知らせ】${label}は休業とさせていただきます。あらかじめご了承ください。`;
}

/** 時短営業の配信文面を自動生成する。 */
function buildShortHoursMessage(dateKeys: string[], openTime: string, closeTime: string): string {
  const label = formatClosureDateList(dateKeys);
  return `【時短営業のお知らせ】${label}は営業時間を${openTime.slice(0, 5)}〜${closeTime.slice(0, 5)}に短縮させていただきます。ご了承ください。`;
}

/** 6:00〜22:00を1時間刻みで並べた"HH:00"形式の選択肢。 */
const HOUR_OPTIONS: string[] = Array.from({ length: 17 }, (_, i) => `${String(i + 6).padStart(2, "0")}:00`);

/** "HH:MM:SS"や"HH:MM"を1時間単位の"HH:00"へ丸める。範囲外ならHOUR_OPTIONSの端に寄せる。 */
function roundToHourOption(time: string | null | undefined, fallback: string): string {
  const source = time ?? fallback;
  const hourStr = source.slice(0, 2);
  const hour = Number(hourStr);
  if (Number.isNaN(hour)) return fallback;
  const clamped = Math.min(22, Math.max(6, hour));
  return `${String(clamped).padStart(2, "0")}:00`;
}

export default function CalendarTab({
  initialCalendarOverrides,
  businessConfig,
  showToast,
}: {
  initialCalendarOverrides: CalendarOverrideRow[];
  businessConfig: BusinessConfigRow;
  showToast: (message: string) => void;
}) {
  const [, startTransition] = useTransition();
  const [closureSheetOpen, setClosureSheetOpen] = useState(false);
  const [closureText, setClosureText] = useState("");
  const [closureTextEdited, setClosureTextEdited] = useState(false);
  const [sending, setSending] = useState(false);

  // カレンダータップのモード。"close"=休業予定として選択、"short"=時短営業として選択。
  const [closureMode, setClosureMode] = useState<"close" | "short">("close");

  // 休業予定として選択中の日付（dateKeyの集合）。配信確定でtemp_closedへ反映される。
  const [pendingClosureDates, setPendingClosureDates] = useState<Set<string>>(new Set());

  // 時短営業予定として選択中の日付（dateKeyの集合）。配信確定でshort_hoursへ反映される。
  const [pendingShortHoursDates, setPendingShortHoursDates] = useState<Set<string>>(new Set());

  const [shortHoursSheetOpen, setShortHoursSheetOpen] = useState(false);
  const [shortHoursText, setShortHoursText] = useState("");
  const [shortHoursTextEdited, setShortHoursTextEdited] = useState(false);
  const [shortOpenTime, setShortOpenTime] = useState<string>(
    roundToHourOption(businessConfig.open_time, "09:00")
  );
  const [shortCloseTime, setShortCloseTime] = useState<string>(() => {
    const base = roundToHourOption(businessConfig.close_time, "19:00");
    const hour = Number(base.slice(0, 2));
    return `${String(Math.max(6, hour - 2)).padStart(2, "0")}:00`;
  });

  const today = new Date();
  const currentMonthStart = { year: today.getFullYear(), month: today.getMonth() };

  // 表示中の年月（未来にナビゲート可能。過去には戻れない）
  const [viewMonth, setViewMonth] = useState(currentMonthStart);

  // 月ごとのoverride一覧をキャッシュする。当月分は初期データで埋めておく。
  const [overridesByMonth, setOverridesByMonth] = useState<Record<string, CalendarOverrideRow[]>>(
    () => ({ [monthKey(currentMonthStart.year, currentMonthStart.month)]: initialCalendarOverrides })
  );

  const viewMonthKey = monthKey(viewMonth.year, viewMonth.month);
  const monthLabel = `${viewMonth.year}年${viewMonth.month + 1}月`;

  // 表示中の月のoverrideがまだキャッシュに無ければ読み込み中とみなす
  const loadingMonth = overridesByMonth[viewMonthKey] === undefined;

  const isAtEarliestMonth =
    viewMonth.year === currentMonthStart.year && viewMonth.month === currentMonthStart.month;
  const monthsAhead =
    (viewMonth.year - currentMonthStart.year) * 12 + (viewMonth.month - currentMonthStart.month);
  const isAtLatestMonth = monthsAhead >= MAX_MONTHS_AHEAD;

  // 表示中の月のoverrideがまだキャッシュに無ければ取得する
  useEffect(() => {
    if (overridesByMonth[viewMonthKey] !== undefined) return;
    let cancelled = false;
    getCalendarOverridesForMonth(viewMonth.year, viewMonth.month)
      .then((rows) => {
        if (cancelled) return;
        setOverridesByMonth((prev) => ({ ...prev, [viewMonthKey]: rows }));
      })
      .catch((e) => {
        if (cancelled) return;
        showToast(e instanceof Error ? e.message : "カレンダーの取得に失敗しました");
        // 失敗時も空配列でキャッシュを埋め、無限リトライにならないようにする
        setOverridesByMonth((prev) => ({ ...prev, [viewMonthKey]: [] }));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMonthKey]);

  function handlePrevMonth() {
    if (isAtEarliestMonth) return;
    setViewMonth((prev) => {
      const m = prev.month - 1;
      return m < 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: m };
    });
  }

  function handleNextMonth() {
    if (isAtLatestMonth) return;
    setViewMonth((prev) => {
      const m = prev.month + 1;
      return m > 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: m };
    });
  }

  const overridesByDate = useMemo(
    () => overridesToMap(overridesByMonth[viewMonthKey] ?? []),
    [overridesByMonth, viewMonthKey]
  );

  const fullOverridesByDate = useMemo(
    () => overridesToFullMap(overridesByMonth[viewMonthKey] ?? []),
    [overridesByMonth, viewMonthKey]
  );

  const calendarCells = useMemo(() => {
    const { year, month } = viewMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const cells: { date: Date | null }[] = [];
    for (let i = 0; i < firstDay.getDay(); i++) cells.push({ date: null });
    for (let d = 1; d <= lastDay.getDate(); d++) cells.push({ date: new Date(year, month, d) });
    return cells;
  }, [viewMonth]);

  /** 営業中の日をタップ: 休業予定としての選択/選択解除をトグルする。 */
  function handleTogglePendingClosure(dateKey: string) {
    setPendingClosureDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return next;
    });
  }

  /** 営業中の日をタップ（時短モード）: 時短営業予定としての選択/選択解除をトグルする。 */
  function handleTogglePendingShortHours(dateKey: string) {
    setPendingShortHoursDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return next;
    });
  }

  /** 休業中（closed/temp_closed/holiday）の日をタップ: 即座に営業へ戻す。 */
  function handleReopenDay(date: Date) {
    if (loadingMonth) return;
    const dateKey = toDateKey(date);
    const monthOfDate = monthKey(date.getFullYear(), date.getMonth());
    const currentOverrides = overridesByMonth[monthOfDate] ?? [];
    const natural = naturalStatus(date, businessConfig);

    // 楽観的にローカルstateを更新する
    const previousOverrides = currentOverrides;
    const nextOverrides =
      natural === "open"
        ? currentOverrides.filter((o) => o.date !== dateKey)
        : [
            ...currentOverrides.filter((o) => o.date !== dateKey),
            { date: dateKey, status: "open" as const, note: null, open_time: null, close_time: null },
          ];
    setOverridesByMonth((prev) => ({ ...prev, [monthOfDate]: nextOverrides }));

    startTransition(async () => {
      try {
        await toggleCalendarDay(dateKey, "open");
      } catch (e) {
        // ロールバック
        setOverridesByMonth((prev) => ({ ...prev, [monthOfDate]: previousOverrides }));
        showToast(e instanceof Error ? e.message : "カレンダーの更新に失敗しました");
      }
    });
  }

  function handleCalendarClick(date: Date) {
    if (loadingMonth) return;
    const dateKey = toDateKey(date);
    const status = effectiveStatus(date, overridesByDate, businessConfig);
    if (status === "open") {
      if (closureMode === "short") {
        handleTogglePendingShortHours(dateKey);
      } else {
        handleTogglePendingClosure(dateKey);
      }
    } else {
      handleReopenDay(date);
    }
  }

  const pendingClosureList = useMemo(
    () => [...pendingClosureDates].sort(),
    [pendingClosureDates]
  );

  const closureDateLabel = useMemo(
    () => (pendingClosureList.length > 0 ? formatClosureDateList(pendingClosureList) : ""),
    [pendingClosureList]
  );

  function handleOpenClosureSheet() {
    if (pendingClosureList.length === 0) return;
    if (!closureTextEdited) {
      setClosureText(buildClosureMessage(pendingClosureList, today));
    }
    setClosureSheetOpen(true);
  }

  function handleClosureTextChange(value: string) {
    setClosureText(value);
    setClosureTextEdited(true);
  }

  function handleCloseClosureSheet() {
    if (sending) return;
    setClosureSheetOpen(false);
  }

  async function handleConfirmClosureBroadcast() {
    if (pendingClosureList.length === 0 || !closureText.trim()) return;
    setSending(true);
    try {
      const { recipientCount } = await broadcastClosureBulk(pendingClosureList, closureText.trim());
      // 楽観的に該当日をローカルstateでtemp_closedへ更新する
      setOverridesByMonth((prev) => {
        const next = { ...prev };
        for (const dateKey of pendingClosureList) {
          const [y, m] = dateKey.split("-").map(Number);
          const mKey = monthKey(y, m - 1);
          const existing = next[mKey] ?? [];
          next[mKey] = [
            ...existing.filter((o) => o.date !== dateKey),
            {
              date: dateKey,
              status: "temp_closed" as const,
              note: closureText.trim(),
              open_time: null,
              close_time: null,
            },
          ];
        }
        return next;
      });
      setPendingClosureDates(new Set());
      setClosureSheetOpen(false);
      setClosureText("");
      setClosureTextEdited(false);
      showToast(`配信しました（${recipientCount}人）`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "配信に失敗しました");
    } finally {
      setSending(false);
    }
  }

  const pendingShortHoursList = useMemo(
    () => [...pendingShortHoursDates].sort(),
    [pendingShortHoursDates]
  );

  const shortHoursDateLabel = useMemo(
    () => (pendingShortHoursList.length > 0 ? formatClosureDateList(pendingShortHoursList) : ""),
    [pendingShortHoursList]
  );

  function handleOpenShortHoursSheet() {
    if (pendingShortHoursList.length === 0) return;
    if (!shortHoursTextEdited) {
      setShortHoursText(buildShortHoursMessage(pendingShortHoursList, shortOpenTime, shortCloseTime));
    }
    setShortHoursSheetOpen(true);
  }

  function handleShortHoursTextChange(value: string) {
    setShortHoursText(value);
    setShortHoursTextEdited(true);
  }

  function handleShortOpenTimeChange(value: string) {
    setShortOpenTime(value);
    if (!shortHoursTextEdited) {
      setShortHoursText(buildShortHoursMessage(pendingShortHoursList, value, shortCloseTime));
    }
  }

  function handleShortCloseTimeChange(value: string) {
    setShortCloseTime(value);
    if (!shortHoursTextEdited) {
      setShortHoursText(buildShortHoursMessage(pendingShortHoursList, shortOpenTime, value));
    }
  }

  function handleCloseShortHoursSheet() {
    if (sending) return;
    setShortHoursSheetOpen(false);
  }

  async function handleConfirmShortHoursBroadcast() {
    if (pendingShortHoursList.length === 0 || !shortHoursText.trim()) return;
    setSending(true);
    try {
      const { recipientCount } = await broadcastShortHoursBulk(
        pendingShortHoursList,
        shortOpenTime,
        shortCloseTime,
        shortHoursText.trim()
      );
      // 楽観的に該当日をローカルstateでshort_hoursへ更新する
      setOverridesByMonth((prev) => {
        const next = { ...prev };
        for (const dateKey of pendingShortHoursList) {
          const [y, m] = dateKey.split("-").map(Number);
          const mKey = monthKey(y, m - 1);
          const existing = next[mKey] ?? [];
          next[mKey] = [
            ...existing.filter((o) => o.date !== dateKey),
            {
              date: dateKey,
              status: "short_hours" as const,
              note: shortHoursText.trim(),
              open_time: `${shortOpenTime}:00`,
              close_time: `${shortCloseTime}:00`,
            },
          ];
        }
        return next;
      });
      setPendingShortHoursDates(new Set());
      setShortHoursSheetOpen(false);
      setShortHoursText("");
      setShortHoursTextEdited(false);
      showToast(`配信しました（${recipientCount}人）`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "配信に失敗しました");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="ad-card">
        <div className="cap">
          <span>営業カレンダー</span>
          <span className="hint">タップで休業/時短予定を選択・休業日や時短日は即営業に戻せます</span>
        </div>
        <div className="cal-nav">
          <button
            type="button"
            className="cal-nav-btn"
            onClick={handlePrevMonth}
            disabled={isAtEarliestMonth}
          >
            ◀
          </button>
          <span className="cal-nav-label">{monthLabel}</span>
          <button
            type="button"
            className="cal-nav-btn"
            onClick={handleNextMonth}
            disabled={isAtLatestMonth}
          >
            ▶
          </button>
        </div>
        <div className="mode-toggle">
          <button
            type="button"
            className={closureMode === "close" ? "on" : ""}
            onClick={() => setClosureMode("close")}
          >
            休業にする
          </button>
          <button
            type="button"
            className={closureMode === "short" ? "on" : ""}
            onClick={() => setClosureMode("short")}
          >
            時短にする
          </button>
        </div>
        <div className="cal">
          {WEEKDAY_LABELS.map((w) => (
            <div className="h7" key={w}>
              {w}
            </div>
          ))}
          {calendarCells.map((cell, idx) => {
            if (!cell.date) return <div className="c blank" key={idx} />;
            const date = cell.date;
            const dateKey = toDateKey(date);
            const status = effectiveStatus(date, overridesByDate, businessConfig);
            const isPending = pendingClosureDates.has(dateKey);
            const isPendingShort = pendingShortHoursDates.has(dateKey);
            const isPast =
              date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const isToday = dateKey === toDateKey(today);
            const statusLabel: Record<EffectiveCalendarStatus, string> = {
              open: "営業",
              closed: "休業",
              temp_closed: "臨時休",
              short_hours: formatHourRange(
                fullOverridesByDate.get(dateKey)?.open_time,
                fullOverridesByDate.get(dateKey)?.close_time
              ),
              holiday: "祝 休業",
            };
            const label = isPending || isPendingShort ? "選択中" : statusLabel[status];
            return (
              <button
                type="button"
                key={idx}
                className={`c ${status}${isPending ? " pending" : ""}${isPendingShort ? " pending-short" : ""}${isPast ? " past" : ""}${isToday ? " today" : ""}`}
                onClick={() => handleCalendarClick(date)}
                disabled={loadingMonth}
              >
                {date.getDate()}
                <span className="s">{label}</span>
              </button>
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
            休業
          </span>
          <span>
            <i style={{ background: "#fcf3df" }} />
            臨時休業
          </span>
          <span>
            <i style={{ background: "#fbedea" }} />
            祝日
          </span>
          <span>
            <i style={{ background: "#fff8e8", border: "1px dashed #c99a2e" }} />
            休業予定として選択中
          </span>
          <span className="sw-short">
            <i />
            時短営業
          </span>
        </div>
      </div>

      <div
        style={{
          height:
            96 +
            (pendingClosureList.length > 0 ? 72 : 0) +
            (pendingShortHoursList.length > 0 ? 72 : 0),
        }}
      />

      {pendingClosureList.length > 0 && (
        <div className="ad-send closure">
          <button type="button" onClick={handleOpenClosureSheet}>
            {pendingClosureList.length}件選択中 → 確定して配信
          </button>
          <div className="cnt">{closureDateLabel}</div>
        </div>
      )}

      {pendingShortHoursList.length > 0 && (
        <div className="ad-send short">
          <button type="button" onClick={handleOpenShortHoursSheet}>
            {pendingShortHoursList.length}件選択中（時短） → 時間を設定して配信
          </button>
          <div className="cnt">{shortHoursDateLabel}</div>
        </div>
      )}

      {closureSheetOpen && (
        <div className="sheet-bk on" onClick={handleCloseClosureSheet}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="st">休業を確定して配信</div>
            <div className="ss">{closureDateLabel}</div>
            <textarea
              rows={5}
              value={closureText}
              onChange={(e) => handleClosureTextChange(e.target.value)}
              placeholder="配信文面を入力してください"
            />
            <div className="impact">
              <span>① LINEへ一斉配信</span>
              <span>② 価格ページにバナー</span>
              <span>③ 営業カレンダーに反映</span>
            </div>
            <div className="acts">
              <button
                type="button"
                className="no"
                onClick={handleCloseClosureSheet}
                disabled={sending}
              >
                やめる
              </button>
              <button
                type="button"
                className="go warn"
                onClick={handleConfirmClosureBroadcast}
                disabled={sending || pendingClosureList.length === 0 || !closureText.trim()}
              >
                {sending ? "配信中…" : "配信する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {shortHoursSheetOpen && (
        <div className="sheet-bk on" onClick={handleCloseShortHoursSheet}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="st">時短営業を確定して配信</div>
            <div className="ss">{shortHoursDateLabel}</div>
            <div className="hour-select-row">
              <select
                value={shortOpenTime}
                onChange={(e) => handleShortOpenTimeChange(e.target.value)}
              >
                {HOUR_OPTIONS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
              <span>〜</span>
              <select
                value={shortCloseTime}
                onChange={(e) => handleShortCloseTimeChange(e.target.value)}
              >
                {HOUR_OPTIONS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              rows={5}
              value={shortHoursText}
              onChange={(e) => handleShortHoursTextChange(e.target.value)}
              placeholder="配信文面を入力してください"
            />
            <div className="impact">
              <span>① LINEへ一斉配信</span>
              <span>② 価格ページにバナー</span>
              <span>③ 営業カレンダーに反映</span>
            </div>
            <div className="acts">
              <button
                type="button"
                className="no"
                onClick={handleCloseShortHoursSheet}
                disabled={sending}
              >
                やめる
              </button>
              <button
                type="button"
                className="go"
                onClick={handleConfirmShortHoursBroadcast}
                disabled={
                  sending ||
                  pendingShortHoursList.length === 0 ||
                  !shortHoursText.trim() ||
                  shortOpenTime >= shortCloseTime
                }
              >
                {sending ? "配信中…" : "配信する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
