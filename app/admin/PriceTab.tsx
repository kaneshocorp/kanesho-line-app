"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ItemRow } from "@/lib/types";
import { updateCurrentPrice, broadcastPrices } from "@/app/admin/actions";

/** 小数の丸め誤差（0.1+0.2のような問題）を避けるため、小数第2位までに丸める。 */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function diffBadge(item: ItemRow) {
  if (!item.current_price || item.current_price <= 0) {
    return <span className="dif flat">未入力</span>;
  }
  if (item.published_price === null || item.published_price === undefined) {
    return <span className="dif flat">未配信</span>;
  }
  const d = round2(item.current_price - item.published_price);
  if (d > 0) return <span className="dif up">▲+{d.toLocaleString("ja-JP")}</span>;
  if (d < 0) return <span className="dif down">▼{d.toLocaleString("ja-JP")}</span>;
  return <span className="dif flat">±0</span>;
}

/** 半角数字と小数点（小数第2位まで）のみを許可する（空文字も許容）。 */
function isValidPriceInput(value: string): boolean {
  return /^[0-9]*\.?[0-9]{0,2}$/.test(value);
}

export default function PriceTab({
  initialItems,
  showToast,
}: {
  initialItems: ItemRow[];
  showToast: (message: string) => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [prices, setPrices] = useState<Record<string, string>>(
    Object.fromEntries(
      initialItems.map((i) => [i.id, i.current_price > 0 ? String(i.current_price) : ""])
    )
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const visibleItems = useMemo(
    () =>
      initialItems
        .filter((i) => i.active)
        .sort((a, b) => a.sort_order - b.sort_order),
    [initialItems]
  );

  function handlePriceInput(itemId: string, value: string) {
    if (!isValidPriceInput(value)) return;
    setPrices((prev) => ({ ...prev, [itemId]: value }));
  }

  function handlePriceBlur(itemId: string) {
    const raw = prices[itemId] ?? "";
    const current = Math.max(0, round2(Number(raw) || 0));
    setPrices((prev) => ({ ...prev, [itemId]: current > 0 ? String(current) : "" }));
    startTransition(async () => {
      try {
        await updateCurrentPrice(itemId, current);
        router.refresh();
      } catch (e) {
        showToast(e instanceof Error ? e.message : "価格の保存に失敗しました");
      }
    });
  }

  const changes = visibleItems
    .filter((i) => Number(prices[i.id] || 0) > 0)
    .map((i) => {
      const newPrice = Number(prices[i.id] || 0);
      return {
        name: i.name,
        unit: i.unit,
        prevPrice: i.published_price,
        newPrice,
        changed: i.published_price !== newPrice,
      };
    });
  const changedItems = changes.filter((c) => c.changed);
  const unfilledItems = visibleItems.filter((i) => !(Number(prices[i.id] || 0) > 0));

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
              type="text"
              inputMode="decimal"
              value={prices[item.id] ?? ""}
              onChange={(e) => handlePriceInput(item.id, e.target.value)}
              onBlur={() => handlePriceBlur(item.id)}
            />
            {diffBadge({ ...item, current_price: Number(prices[item.id] || 0) })}
          </div>
        ))}
      </div>

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
    </>
  );
}
