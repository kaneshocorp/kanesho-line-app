"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  ItemRow,
  FriendRow,
  PhotoSubmissionRow,
  MessageRow,
  CalendarOverrideRow,
  BusinessConfigRow,
} from "@/lib/types";
import PriceTab from "@/app/admin/PriceTab";
import CalendarTab from "@/app/admin/CalendarTab";
import ItemsTab from "@/app/admin/ItemsTab";
import FriendsTab from "@/app/admin/FriendsTab";
import ConsultationTab from "@/app/admin/ConsultationTab";
import AnnouncementTab from "@/app/admin/AnnouncementTab";
import NotificationToggle from "@/app/admin/NotificationToggle";

type TabKey = "price" | "calendar" | "items" | "friends" | "consultation" | "announcement";

const TABS: { key: TabKey; label: string }[] = [
  { key: "price", label: "価格配信" },
  { key: "calendar", label: "営業カレンダー" },
  { key: "items", label: "品目管理" },
  { key: "friends", label: "友だち" },
  { key: "consultation", label: "個別相談" },
  { key: "announcement", label: "お知らせ" },
];

const TAB_KEYS = TABS.map((t) => t.key);

export default function AdminApp({
  initialItems,
  initialFriends,
  initialPhotoSubmissions,
  initialMessages,
  initialCalendarOverrides,
  businessConfig,
}: {
  initialItems: ItemRow[];
  initialFriends: FriendRow[];
  initialPhotoSubmissions: PhotoSubmissionRow[];
  initialMessages: MessageRow[];
  initialCalendarOverrides: CalendarOverrideRow[];
  businessConfig: BusinessConfigRow;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab = (TAB_KEYS as string[]).includes(tabParam ?? "") ? (tabParam as TabKey) : "price";
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3000);
  }

  // 個別相談タブのバッジ・内容が手動リロードなしでも新着に気づけるよう、定期的にサーバーデータを取り直す。
  // 各タブのローカルstateはpropsから初回だけ初期化されるため、入力中の内容が上書きされることはない。
  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 20000);
    return () => clearInterval(interval);
  }, [router]);

  const pendingConsultationCount = new Set([
    ...initialPhotoSubmissions.filter((p) => !p.done).map((p) => p.line_user_id),
    ...initialMessages.filter((m) => m.direction === "in" && !m.read).map((m) => m.line_user_id),
  ]).size;

  return (
    <div className="page">
      <div className="ad-bar">
        <span className="t">金山商店 管理</span>
        <a className="manual-link" href="/manual" target="_blank" rel="noopener noreferrer">
          📖 マニュアル
        </a>
        <NotificationToggle showToast={showToast} />
        <span className="who">従業員用</span>
      </div>

      <div className="seg">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={tab === t.key ? "on" : ""}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {t.key === "consultation" && pendingConsultationCount > 0 && <span className="dot" />}
          </button>
        ))}
      </div>

      {tab === "price" && <PriceTab initialItems={initialItems} showToast={showToast} />}
      {tab === "calendar" && (
        <CalendarTab
          initialCalendarOverrides={initialCalendarOverrides}
          businessConfig={businessConfig}
          showToast={showToast}
        />
      )}
      {tab === "items" && <ItemsTab initialItems={initialItems} showToast={showToast} />}
      {tab === "friends" && <FriendsTab initialFriends={initialFriends} showToast={showToast} />}
      {tab === "consultation" && (
        <ConsultationTab
          initialMessages={initialMessages}
          initialPhotoSubmissions={initialPhotoSubmissions}
          showToast={showToast}
        />
      )}
      {tab === "announcement" && <AnnouncementTab showToast={showToast} />}

      <div className={`toast${toast ? " on" : ""}`}>{toast}</div>
    </div>
  );
}
