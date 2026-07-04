"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  ItemRow,
  CalendarOverrideRow,
  BusinessConfigRow,
  EffectiveCalendarStatus,
} from "@/lib/types";
import { effectiveStatus, naturalStatus, overridesToMap, toDateKey } from "@/lib/calendar";
import {
  updateCurrentPrice,
  broadcastPrices,
  toggleCalendarDay,
  broadcastClosure,
  getCalendarOverridesForMonth,
} from "@/app/admin/actions";

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

// 未来にナビゲートできる月数（今月を含めて13ヶ月分＝約12ヶ月先まで見られる）
const MAX_MONTHS_AHEAD = 12;

function monthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function diffBadge(item: ItemRow) {
  if (!item.current_price || item.current_price <= 0) {
    return <span className="dif flat">未入力</span>;
  }
  if (item.published_price === null || item.published_price === undefined) {
    return <span className="dif flat">未配信</span>;
  }
  const d = item.current_price - item.published_price;
  if (d > 0) return <span className="dif up">▲+{d.toLocaleString("ja-JP")}</span>;
  if (d < 0) return <span className="dif down">▼{d.toLocaleString("ja-JP")}</span>;
  return <span className="dif flat">±0</span>;
}

function formatClosureDate(date: Date) {
  return `${date.getMonth() + 1}/${date.getDate()}（${WEEKDAY_LABELS[date.getDay()]}）`;
}

export default function PriceTab({
  initialItems,
  initialCalendarOverrides,
  businessConfig,
  showToast,
}: {
  initialItems: ItemRow[];
  initialCalendarOverrides: CalendarOverrideRow[];
  businessConfig: BusinessConfigRow;
  showToast: (message: string) => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [prices, setPrices] = useState<Record<string, number>>(
    Object.fromEntries(initialItems.map((i) => [i.id, i.current_price]))
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const [closureOpen, setClosureOpen] = useState(false);
  const [closureDate, setClosureDate] = useState<string | null>(null);
  const [closureText, setClosureText] = useState("");
  const [sending, setSending] = useState(false);

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

  const visibleItems = useMemo(
    () =>
      initialItems
        .filter((i) => i.active)
        .sort((a, b) => a.sort_order - b.sort_order),
    [initialItems]
  );

  const overridesByDate = useMemo(
    () => overridesToMap(overridesByMonth[viewMonthKey] ?? []),
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

  function handlePriceInput(itemId: string, value: string) {
    const num = Math.max(0, Math.round(Number(value) || 0));
    setPrices((prev) => ({ ...prev, [itemId]: num }));
  }

  function handlePriceBlur(itemId: string) {
    const value = prices[itemId] ?? 0;
    startTransition(async () => {
      try {
        await updateCurrentPrice(itemId, value);
        router.refresh();
      } catch (e) {
        showToast(e instanceof Error ? e.message : "価格の保存に失敗しました");
      }
    });
  }

  function handleCalendarClick(date: Date) {
    if (loadingMonth) return;
    const dateKey = toDateKey(date);
    const monthOfDate = monthKey(date.getFullYear(), date.getMonth());
    const currentOverrides = overridesByMonth[monthOfDate] ?? [];
    const currentOverridesByDate = overridesToMap(currentOverrides);
    const current = effectiveStatus(date, currentOverridesByDate, businessConfig);
    // 祝日・臨時休業からの再オープンも含め、開いていなければ営業に、開いていれば休業にする
    const next: "open" | "closed" = current === "open" ? "closed" : "open";
    const natural = naturalStatus(date, businessConfig);

    // 楽観的にローカルstateを更新する
    const previousOverrides = currentOverrides;
    const nextOverrides =
      next === natural
        ? currentOverrides.filter((o) => o.date !== dateKey)
        : [
            ...currentOverrides.filter((o) => o.date !== dateKey),
            { date: dateKey, status: next, note: null },
          ];
    setOverridesByMonth((prev) => ({ ...prev, [monthOfDate]: nextOverrides }));

    startTransition(async () => {
      try {
        await toggleCalendarDay(dateKey, next);
      } catch (e) {
        // ロールバック
        setOverridesByMonth((prev) => ({ ...prev, [monthOfDate]: previousOverrides }));
        showToast(e instanceof Error ? e.message : "カレンダーの更新に失敗しました");
      }
    });
  }

  const changes = visibleItems
    .filter((i) => i.current_price > 0)
    .map((i) => ({
      name: i.name,
      unit: i.unit,
      prevPrice: i.published_price,
      newPrice: prices[i.id] ?? i.current_price,
      changed: i.published_price !== (prices[i.id] ?? i.current_price),
    }));
  const changedItems = changes.filter((c) => c.changed);
  const unfilledItems = visibleItems.filter((i) => !(prices[i.id] > 0));

  async function handleConfirmBroadcast() {
    setSending(true);
    try {
      const { recipientCount } = await broadcastPrices();
      setPreviewOpen(false);
      showToast(`配信しました（${recipientCount}人）`);
      router.refresh();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "配信に失敗しました");
    } finally {
      setSending(false);
    }
  }

  // 臨時休業チップ: 当月の直近7日分を候補に出す
  const closureCandidates = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
      days.push(d);
    }
    return days;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSelectClosureDate(date: Date) {
    const key = toDateKey(date);
    setClosureDate(key);
    const label = formatClosureDate(date);
    setClosureText(
      `【臨時休業のお知らせ】${label}は都合により休業いたします。翌営業日より通常営業です。ご迷惑をおかけしますが、よろしくお願いいたします。`
    );
  }

  async function handleConfirmClosure() {
    if (!closureDate || !closureText.trim()) return;
    setSending(true);
    try {
      const { recipientCount } = await broadcastClosure(closureDate, closureText.trim());
      setClosureOpen(false);
      setClosureDate(null);
      setClosureText("");
      showToast(`配信しました（${recipientCount}人）`);
      router.refresh();
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
          <span>品目一覧</span>
          <span className="hint">価格を入力すると自動保存されます</span>
        </div>
        {visibleItems.map((item) => (
          <div className="ad-row" key={item.id}>
            <div className="nm">
              <span className="n">{item.name}</span>
              <span className="u">{item.unit}</span>
            </div>
            <input
              className="pnum"
              type="number"
              inputMode="numeric"
              value={prices[item.id] ?? 0}
              onChange={(e) => handlePriceInput(item.id, e.target.value)}
              onBlur={() => handlePriceBlur(item.id)}
            />
            {diffBadge({ ...item, current_price: prices[item.id] ?? item.current_price })}
          </div>
        ))}
      </div>

      <div className="ad-card">
        <div className="cap">
          <span>営業カレンダー</span>
          <span className="hint">タップで営業⇄休業</span>
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
        <div className="cal">
          {WEEKDAY_LABELS.map((w) => (
            <div className="h7" key={w}>
              {w}
            </div>
          ))}
          {calendarCells.map((cell, idx) => {
            if (!cell.date) return <div className="c blank" key={idx} />;
            const date = cell.date;
            const status = effectiveStatus(date, overridesByDate, businessConfig);
            const isPast =
              date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const isToday = toDateKey(date) === toDateKey(today);
            const statusLabel: Record<EffectiveCalendarStatus, string> = {
              open: "営業",
              closed: "休業",
              temp_closed: "臨時休",
              holiday: "祝",
            };
            return (
              <button
                type="button"
                key={idx}
                className={`c ${status}${isPast ? " past" : ""}${isToday ? " today" : ""}`}
                onClick={() => handleCalendarClick(date)}
                disabled={loadingMonth}
              >
                {date.getDate()}
                <span className="s">{statusLabel[status]}</span>
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
        </div>
        <button type="button" className="ad-close" onClick={() => setClosureOpen(true)}>
          急な休業の連絡（臨時休業を配信）
        </button>
      </div>

      <div style={{ height: 96 }} />

      <div className="ad-send">
        <button type="button" onClick={() => setPreviewOpen(true)}>
          価格をプレビューして配信
        </button>
        <div className="cnt">現在 {visibleItems.length} 品目を表示中</div>
      </div>

      {previewOpen && (
        <div className="sheet-bk on" onClick={() => !sending && setPreviewOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="st">価格をプレビュー</div>
            <div className="ss">配信するとLINE友だち全員に届きます</div>
            <div className="chg">
              {changedItems.length === 0 ? (
                <div className="chg-none">前回配信からの変更はありません</div>
              ) : (
                changedItems.map((c) => (
                  <div className="chg-r" key={c.name}>
                    <span>{c.name}</span>
                    <span className="a">
                      {c.prevPrice ? c.prevPrice.toLocaleString("ja-JP") : "未配信"} →{" "}
                      <b>{c.newPrice.toLocaleString("ja-JP")}</b>
                      {c.unit}
                    </span>
                  </div>
                ))
              )}
            </div>
            {unfilledItems.length > 0 && (
              <div className="ss">
                未入力のため配信されない品目: {unfilledItems.map((i) => i.name).join("、")}
              </div>
            )}
            <div className="acts">
              <button type="button" className="no" onClick={() => setPreviewOpen(false)} disabled={sending}>
                やめる
              </button>
              <button type="button" className="go" onClick={handleConfirmBroadcast} disabled={sending}>
                {sending ? "配信中…" : "配信する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {closureOpen && (
        <div className="sheet-bk on" onClick={() => !sending && setClosureOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="st">急な休業の連絡</div>
            <div className="ss">休業にする日を選んでください</div>
            <div className="dsel">
              {closureCandidates.map((d) => {
                const key = toDateKey(d);
                return (
                  <button
                    type="button"
                    key={key}
                    className={closureDate === key ? "on" : ""}
                    onClick={() => handleSelectClosureDate(d)}
                  >
                    {formatClosureDate(d)}
                  </button>
                );
              })}
            </div>
            <textarea
              rows={5}
              value={closureText}
              onChange={(e) => setClosureText(e.target.value)}
              placeholder="日付を選ぶと文面が自動生成されます（編集できます）"
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
                onClick={() => setClosureOpen(false)}
                disabled={sending}
              >
                やめる
              </button>
              <button
                type="button"
                className="go warn"
                onClick={handleConfirmClosure}
                disabled={sending || !closureDate || !closureText.trim()}
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
