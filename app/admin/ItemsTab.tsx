"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ItemRow } from "@/lib/types";
import {
  updateItemName,
  toggleItemActive,
  deleteItem,
  addItem,
  setItemOrder,
} from "@/app/admin/actions";

const TEMP_ID_PREFIX = "temp-";

export default function ItemsTab({
  initialItems,
  showToast,
}: {
  initialItems: ItemRow[];
  showToast: (message: string) => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [items, setItems] = useState<ItemRow[]>(() =>
    [...initialItems].sort((a, b) => a.sort_order - b.sort_order)
  );
  const [names, setNames] = useState<Record<string, string>>(
    Object.fromEntries(initialItems.map((i) => [i.id, i.name]))
  );
  const [busy, setBusy] = useState(false);

  // addItem完了後のrouter.refresh()でinitialItemsという新しい配列が親から渡された時だけ、
  // ローカルstateをそれに合わせて同期する（新規行のidが確定するのはこの時点のため）。
  // レンダー中にstateを調整するパターン（useEffectでのsetStateを避ける）。
  const [syncedInitialItems, setSyncedInitialItems] = useState(initialItems);
  if (initialItems !== syncedInitialItems) {
    setSyncedInitialItems(initialItems);
    setItems([...initialItems].sort((a, b) => a.sort_order - b.sort_order));
    setNames(Object.fromEntries(initialItems.map((i) => [i.id, i.name])));
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function handleNameBlur(itemId: string) {
    const value = names[itemId]?.trim();
    if (!value) return;
    const previous = items;
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, name: value } : i)));
    startTransition(async () => {
      try {
        await updateItemName(itemId, value);
      } catch (e) {
        setItems(previous);
        setNames(Object.fromEntries(previous.map((i) => [i.id, i.name])));
        showToast(e instanceof Error ? e.message : "品目名の更新に失敗しました");
      }
    });
  }

  function handleToggleActive(item: ItemRow) {
    const previous = items;
    const nextActive = !item.active;
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, active: nextActive } : i))
    );
    startTransition(async () => {
      try {
        await toggleItemActive(item.id, nextActive);
      } catch (e) {
        setItems(previous);
        showToast(e instanceof Error ? e.message : "表示設定の更新に失敗しました");
      }
    });
  }

  function handleDelete(item: ItemRow) {
    if (!window.confirm(`「${item.name}」を削除します。よろしいですか？`)) return;
    const previous = items;
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    startTransition(async () => {
      try {
        await deleteItem(item.id);
      } catch (e) {
        setItems(previous);
        showToast(e instanceof Error ? e.message : "削除に失敗しました");
      }
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const previous = items;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);

    startTransition(async () => {
      try {
        await setItemOrder(reordered.map((i) => i.id));
      } catch (e) {
        setItems(previous);
        showToast(e instanceof Error ? e.message : "並び替えに失敗しました");
      }
    });
  }

  async function handleAdd() {
    setBusy(true);
    const tempId = `${TEMP_ID_PREFIX}${Date.now()}`;
    const now = new Date().toISOString();
    const placeholder: ItemRow = {
      id: tempId,
      name: "作成中…",
      unit: "円/kg",
      current_price: 0,
      published_price: null,
      published_price_prev: null,
      active: true,
      sort_order: items.length > 0 ? Math.max(...items.map((i) => i.sort_order)) + 1 : 1,
      created_at: now,
      updated_at: now,
    };
    setItems((prev) => [...prev, placeholder]);
    setNames((prev) => ({ ...prev, [tempId]: placeholder.name }));

    try {
      // addItem は新規行のidを返さないため、プレースホルダーを実データへ
      // その場で入れ替えることができない。ボタンの反応は即座にし（プレースホルダー表示）、
      // Server Action完了後にこの1操作に限り router.refresh() で実データに置き換える。
      await addItem();
      router.refresh();
    } catch (e) {
      setItems((prev) => prev.filter((i) => i.id !== tempId));
      setNames((prev) => {
        const next = { ...prev };
        delete next[tempId];
        return next;
      });
      showToast(e instanceof Error ? e.message : "品目の追加に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ad-card">
      <div className="cap">
        <span>全品目（{items.length}）</span>
        <span className="hint">非表示の品目もここに表示されます</span>
      </div>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((item) => {
            const isPending = item.id.startsWith(TEMP_ID_PREFIX);
            return (
              <SortableItemRow
                key={item.id}
                item={item}
                name={names[item.id] ?? ""}
                disabled={isPending}
                onNameChange={(value) => setNames((prev) => ({ ...prev, [item.id]: value }))}
                onNameBlur={() => handleNameBlur(item.id)}
                onToggleActive={() => handleToggleActive(item)}
                onDelete={() => handleDelete(item)}
              />
            );
          })}
        </SortableContext>
      </DndContext>
      <button type="button" className="im-add" onClick={handleAdd} disabled={busy}>
        ＋ 品目を追加
      </button>
    </div>
  );
}

function SortableItemRow({
  item,
  name,
  disabled,
  onNameChange,
  onNameBlur,
  onToggleActive,
  onDelete,
}: {
  item: ItemRow;
  name: string;
  disabled?: boolean;
  onNameChange: (value: string) => void;
  onNameBlur: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : disabled ? 0.6 : 1,
  };

  return (
    <div className="im-row" ref={setNodeRef} style={style}>
      <div className="im-handle" {...attributes} {...listeners}>
        ⋮⋮
      </div>
      <input
        className="im-name"
        type="text"
        value={name}
        disabled={disabled}
        onChange={(e) => onNameChange(e.target.value)}
        onBlur={onNameBlur}
      />
      <button
        type="button"
        className={`im-vis${item.active ? "" : " off"}`}
        onClick={onToggleActive}
        disabled={disabled}
      >
        {item.active ? "表示中" : "非表示"}
      </button>
      <button type="button" className="im-del" onClick={onDelete} disabled={disabled}>
        削除
      </button>
    </div>
  );
}
