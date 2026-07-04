"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ItemRow } from "@/lib/types";
import {
  updateItemName,
  updateItemPrice,
  toggleItemActive,
  deleteItem,
  addItem,
  swapItemOrder,
} from "@/app/admin/actions";

export default function ItemsTab({
  initialItems,
  showToast,
}: {
  initialItems: ItemRow[];
  showToast: (message: string) => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [names, setNames] = useState<Record<string, string>>(
    Object.fromEntries(initialItems.map((i) => [i.id, i.name]))
  );
  const [priceInputs, setPriceInputs] = useState<Record<string, number>>(
    Object.fromEntries(initialItems.map((i) => [i.id, i.current_price]))
  );
  const [busy, setBusy] = useState(false);

  const sorted = [...initialItems].sort((a, b) => a.sort_order - b.sort_order);

  function handleNameBlur(itemId: string) {
    const value = names[itemId]?.trim();
    if (!value) return;
    startTransition(async () => {
      try {
        await updateItemName(itemId, value);
        router.refresh();
      } catch (e) {
        showToast(e instanceof Error ? e.message : "品目名の更新に失敗しました");
      }
    });
  }

  function handlePriceBlur(itemId: string) {
    const value = priceInputs[itemId] ?? 0;
    startTransition(async () => {
      try {
        await updateItemPrice(itemId, value);
        router.refresh();
      } catch (e) {
        showToast(e instanceof Error ? e.message : "価格の更新に失敗しました");
      }
    });
  }

  function handleToggleActive(item: ItemRow) {
    startTransition(async () => {
      try {
        await toggleItemActive(item.id, !item.active);
        router.refresh();
      } catch (e) {
        showToast(e instanceof Error ? e.message : "表示設定の更新に失敗しました");
      }
    });
  }

  function handleDelete(item: ItemRow) {
    if (!window.confirm(`「${item.name}」を削除します。よろしいですか？`)) return;
    startTransition(async () => {
      try {
        await deleteItem(item.id);
        router.refresh();
      } catch (e) {
        showToast(e instanceof Error ? e.message : "削除に失敗しました");
      }
    });
  }

  function handleSwap(itemId: string, direction: "up" | "down") {
    startTransition(async () => {
      try {
        await swapItemOrder(itemId, direction);
        router.refresh();
      } catch (e) {
        showToast(e instanceof Error ? e.message : "並び替えに失敗しました");
      }
    });
  }

  async function handleAdd() {
    setBusy(true);
    try {
      await addItem();
      router.refresh();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "品目の追加に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ad-card">
      <div className="cap">
        <span>全品目（{sorted.length}）</span>
        <span className="hint">非表示の品目もここに表示されます</span>
      </div>
      {sorted.map((item, idx) => (
        <div className="im-row" key={item.id}>
          <div className="im-ord">
            <button
              type="button"
              disabled={idx === 0}
              onClick={() => handleSwap(item.id, "up")}
            >
              ▲
            </button>
            <button
              type="button"
              disabled={idx === sorted.length - 1}
              onClick={() => handleSwap(item.id, "down")}
            >
              ▼
            </button>
          </div>
          <input
            className="im-name"
            type="text"
            value={names[item.id] ?? ""}
            onChange={(e) => setNames((prev) => ({ ...prev, [item.id]: e.target.value }))}
            onBlur={() => handleNameBlur(item.id)}
          />
          <input
            className="im-price"
            type="number"
            inputMode="numeric"
            value={priceInputs[item.id] ?? 0}
            onChange={(e) =>
              setPriceInputs((prev) => ({
                ...prev,
                [item.id]: Math.max(0, Math.round(Number(e.target.value) || 0)),
              }))
            }
            onBlur={() => handlePriceBlur(item.id)}
          />
          <button
            type="button"
            className={`im-vis${item.active ? "" : " off"}`}
            onClick={() => handleToggleActive(item)}
          >
            {item.active ? "表示中" : "非表示"}
          </button>
          <button type="button" className="im-del" onClick={() => handleDelete(item)}>
            削除
          </button>
        </div>
      ))}
      <button type="button" className="im-add" onClick={handleAdd} disabled={busy}>
        ＋ 品目を追加
      </button>
    </div>
  );
}
