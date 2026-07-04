import { supabasePublic } from "@/lib/supabase/public";
import { toDateKey } from "@/lib/calendar";
import type { BusinessConfigRow, CalendarOverrideRow } from "@/lib/types";
import PriceChart, { type ChartItem } from "./PriceChart";

export const dynamic = "force-dynamic";

type PublicPriceRow = {
  id: string;
  name: string;
  unit: string;
  published_price: number;
  published_price_prev: number | null;
  sort_order: number;
};

const WEEKDAY_JA = ["日", "月", "火", "水", "木", "金", "土"];

function formatUpdatedAt(iso: string | null): string {
  if (!iso) return "--";
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const w = WEEKDAY_JA[d.getDay()];
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}年${m}月${day}日（${w}）${hh}:${mm} 更新`;
}

function formatOverrideDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const w = WEEKDAY_JA[d.getDay()];
  return `${m}月${day}日（${w}）`;
}

function diffClass(diff: number): string {
  if (diff > 0) return "dif up";
  if (diff < 0) return "dif down";
  return "dif flat";
}

function diffLabel(diff: number): string {
  if (diff > 0) return `▲+${diff.toLocaleString("ja-JP")}`;
  if (diff < 0) return `▼${Math.abs(diff).toLocaleString("ja-JP")}`;
  return "±0";
}

function formatTime(t: string | null): string | null {
  if (!t) return null;
  // "08:00:00" -> "8:00"
  const [hh, mm] = t.split(":");
  return `${Number(hh)}:${mm}`;
}

export default async function PricesPage() {
  const supabase = supabasePublic();

  const [pricesRes, overridesRes, configRes] = await Promise.all([
    supabase
      .from("public_prices")
      .select("id, name, unit, published_price, published_price_prev, sort_order")
      .order("sort_order", { ascending: true }),
    supabase
      .from("calendar_overrides")
      .select("date, status, note")
      .order("date", { ascending: true }),
    supabase.from("business_config").select("*").eq("id", 1).maybeSingle(),
  ]);

  const prices = (pricesRes.data ?? []) as PublicPriceRow[];
  const overrides = (overridesRes.data ?? []) as CalendarOverrideRow[];
  const config = (configRes.data ?? null) as BusinessConfigRow | null;

  // 品目ごとに直近12件を取得し、実際にデータがある品目を優先して先頭3件をチャートに使う。
  const historyResults = await Promise.all(
    prices.map((item) =>
      supabase
        .from("price_history")
        .select("price, recorded_at")
        .eq("item_id", item.id)
        .order("recorded_at", { ascending: false })
        .limit(12)
    )
  );
  const chartItems: ChartItem[] = prices
    .map((item, i) => {
      const rows = historyResults[i].data ?? [];
      const points = [...rows].reverse() as { price: number; recorded_at: string }[];
      return { id: item.id, name: item.name, unit: item.unit, points };
    })
    .filter((c) => c.points.length > 0)
    .slice(0, 3);

  const todayKey = toDateKey(new Date());
  const upcomingClosure = overrides.find(
    (o) => o.status === "temp_closed" && o.date >= todayKey
  );

  // 最終更新時刻: price_history の最新recorded_atがあればそれを使う。
  const latestHistory = await supabase
    .from("price_history")
    .select("recorded_at")
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  let updatedAtIso: string | null =
    (latestHistory.data as { recorded_at: string } | null)?.recorded_at ?? null;
  if (!updatedAtIso && chartItems.length > 0) {
    const points = chartItems[0].points;
    updatedAtIso = points[points.length - 1]?.recorded_at ?? null;
  }

  const totalCount = prices.length;
  const openTime = config ? formatTime(config.open_time) : null;
  const closeTime = config ? formatTime(config.close_time) : null;
  const breakStart = config ? formatTime(config.break_start) : null;
  const breakEnd = config ? formatTime(config.break_end) : null;

  return (
    <div className="page">
      <header className="us-hd">
        <div className="co">有限会社金山商店｜きちんと計量</div>
        <h1>現在の買取価格</h1>
        <div className="upd">{formatUpdatedAt(updatedAtIso)}</div>
      </header>

      {upcomingClosure && (
        <div className="us-banner">
          ⚠ {formatOverrideDate(upcomingClosure.date)}は臨時休業いたします
        </div>
      )}

      <div className="us-notice">
        ご来店の際は<b>「LINEの単価を確認してきました」</b>とスタッフにお伝えください。表示価格は店頭でのご案内と異なる場合があります。
        <div className="hr" />
        営業時間 {openTime ?? "--"}–{closeTime ?? "--"}
        {breakStart && breakEnd
          ? `（${breakStart}–${breakEnd}は昼休みのため不在です）`
          : ""}
      </div>

      <section className="us-card">
        <div className="cap">
          <span>全{totalCount}品目</span>
          <span className="hint">前週比</span>
        </div>
        {prices.map((item) => {
          const prev = item.published_price_prev ?? item.published_price;
          const diff = item.published_price - prev;
          return (
            <div className="us-tr" key={item.id}>
              <div className="n">
                {item.name}
                <small>{item.unit}</small>
              </div>
              <div className="p">{item.published_price.toLocaleString("ja-JP")}円</div>
              <div className={diffClass(diff)}>{diffLabel(diff)}</div>
            </div>
          );
        })}
      </section>

      {chartItems.length > 0 && (
        <section className="us-card">
          <div className="cap">
            <span>価格の推移</span>
            <span className="hint">過去12週</span>
          </div>
          <PriceChart items={chartItems} />
        </section>
      )}

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

      <p className="us-note">
        価格は市況により変動する持込・現金精算時の参考価格です。金属以外（木・紙・プラスチック・ゴム・家電・ごみ等）はお引き受けできません。大口・引き取りのご相談はお電話ください。
      </p>
    </div>
  );
}
