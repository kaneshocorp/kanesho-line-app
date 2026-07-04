"use client";

import { useMemo, useState } from "react";

export type ChartItem = {
  id: string;
  name: string;
  unit: string;
  points: { price: number; recorded_at: string }[];
};

const WEEKDAY_JA = ["日", "月", "火", "水", "木", "金", "土"];

function formatShortDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatFullDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日（${WEEKDAY_JA[d.getDay()]}）`;
}

/**
 * 価格推移の折れ線グラフ（品目を選ぶチップ付き）。
 * price_history は直近12件・recorded_at昇順で渡される想定。
 */
export default function PriceChart({ items }: { items: ChartItem[] }) {
  const [selectedId, setSelectedId] = useState(items[0]?.id ?? "");
  const selected = items.find((it) => it.id === selectedId) ?? items[0];

  const chart = useMemo(() => {
    if (!selected || selected.points.length === 0) return null;

    const width = 320;
    const height = 140;
    const padX = 12;
    const padTop = 16;
    const padBottom = 22;

    const prices = selected.points.map((p) => p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;

    const innerW = width - padX * 2;
    const innerH = height - padTop - padBottom;
    const n = selected.points.length;

    const coords = selected.points.map((p, i) => {
      const x = n === 1 ? padX + innerW / 2 : padX + (innerW * i) / (n - 1);
      const y = padTop + innerH - ((p.price - min) / range) * innerH;
      return { x, y, price: p.price, recorded_at: p.recorded_at };
    });

    const linePath = coords
      .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
      .join(" ");

    const last = coords[coords.length - 1];
    const first = coords[0];

    return { width, height, coords, linePath, last, first };
  }, [selected]);

  if (!selected) return null;

  return (
    <>
      <div className="chips">
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            className={it.id === selected.id ? "on" : ""}
            onClick={() => setSelectedId(it.id)}
          >
            {it.name}
          </button>
        ))}
      </div>
      <div className="chart-box">
        {chart ? (
          <svg
            viewBox={`0 0 ${chart.width} ${chart.height}`}
            width="100%"
            height={chart.height}
            role="img"
            aria-label={`${selected.name}の過去12週の価格推移`}
          >
            <path
              d={chart.linePath}
              fill="none"
              stroke="var(--brand)"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {chart.coords.map((c, i) => (
              <circle
                key={i}
                cx={c.x}
                cy={c.y}
                r={i === chart.coords.length - 1 ? 3.5 : 2}
                fill={i === chart.coords.length - 1 ? "var(--amber)" : "var(--brand)"}
              />
            ))}
            <text
              x={chart.first.x}
              y={chart.height - 6}
              fontSize="9"
              fill="var(--ink3)"
              textAnchor="start"
            >
              {formatShortDate(chart.first.recorded_at)}
            </text>
            <text
              x={chart.last.x}
              y={chart.height - 6}
              fontSize="9"
              fill="var(--ink3)"
              textAnchor="end"
            >
              {formatShortDate(chart.last.recorded_at)}
            </text>
            <text
              x={chart.last.x}
              y={Math.max(chart.last.y - 8, 10)}
              fontSize="11"
              fontWeight="700"
              fill="var(--brand-deep)"
              textAnchor="end"
            >
              {chart.last.price.toLocaleString("ja-JP")}
            </text>
          </svg>
        ) : (
          <p className="us-note" style={{ padding: "8px 5px" }}>
            価格の推移データがまだありません。
          </p>
        )}
        {chart && (
          <p className="us-note" style={{ padding: "6px 5px 0" }}>
            最終更新: {formatFullDate(chart.last.recorded_at)} ／ {selected.unit}
          </p>
        )}
      </div>
    </>
  );
}
