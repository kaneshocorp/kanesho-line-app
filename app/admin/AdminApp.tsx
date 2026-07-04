"use client";

import { useState } from "react";
import type {
  ItemRow,
  FriendRow,
  PhotoSubmissionRow,
  CalendarOverrideRow,
  BusinessConfigRow,
} from "@/lib/types";
import PriceTab from "@/app/admin/PriceTab";
import ItemsTab from "@/app/admin/ItemsTab";
import FriendsTab from "@/app/admin/FriendsTab";
import PhotosTab from "@/app/admin/PhotosTab";
import AnnouncementTab from "@/app/admin/AnnouncementTab";

type TabKey = "price" | "items" | "friends" | "photos" | "announcement";

const TABS: { key: TabKey; label: string }[] = [
  { key: "price", label: "価格配信" },
  { key: "items", label: "品目管理" },
  { key: "friends", label: "友だち" },
  { key: "photos", label: "写真査定" },
  { key: "announcement", label: "お知らせ" },
];

export default function AdminApp({
  initialItems,
  initialFriends,
  initialPhotoSubmissions,
  initialCalendarOverrides,
  businessConfig,
}: {
  initialItems: ItemRow[];
  initialFriends: FriendRow[];
  initialPhotoSubmissions: PhotoSubmissionRow[];
  initialCalendarOverrides: CalendarOverrideRow[];
  businessConfig: BusinessConfigRow;
}) {
  const [tab, setTab] = useState<TabKey>("price");
  const [toast, setToast] = useState<string | null>(null);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3000);
  }

  const pendingPhotoCount = initialPhotoSubmissions.filter((p) => !p.done).length;

  return (
    <div className="page">
      <div className="ad-bar">
        <span className="t">金山商店 管理</span>
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
            {t.key === "photos" && pendingPhotoCount > 0 && <span className="dot" />}
          </button>
        ))}
      </div>

      {tab === "price" && (
        <PriceTab
          initialItems={initialItems}
          initialCalendarOverrides={initialCalendarOverrides}
          businessConfig={businessConfig}
          showToast={showToast}
        />
      )}
      {tab === "items" && <ItemsTab initialItems={initialItems} showToast={showToast} />}
      {tab === "friends" && <FriendsTab initialFriends={initialFriends} showToast={showToast} />}
      {tab === "photos" && (
        <PhotosTab initialPhotoSubmissions={initialPhotoSubmissions} showToast={showToast} />
      )}
      {tab === "announcement" && <AnnouncementTab showToast={showToast} />}

      <div className={`toast${toast ? " on" : ""}`}>{toast}</div>
    </div>
  );
}
