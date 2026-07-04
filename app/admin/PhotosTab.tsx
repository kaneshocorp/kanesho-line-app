"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PhotoSubmissionRow } from "@/lib/types";
import { togglePhotoDone } from "@/app/admin/actions";

function formatReceivedAt(iso: string) {
  const date = new Date(iso);
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${m}/${d} ${hh}:${mm}`;
}

export default function PhotosTab({
  initialPhotoSubmissions,
  showToast,
}: {
  initialPhotoSubmissions: PhotoSubmissionRow[];
  showToast: (message: string) => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function handleToggle(photo: PhotoSubmissionRow) {
    startTransition(async () => {
      try {
        await togglePhotoDone(photo.id, !photo.done);
        router.refresh();
      } catch (e) {
        showToast(e instanceof Error ? e.message : "対応状況の更新に失敗しました");
      }
    });
  }

  if (initialPhotoSubmissions.length === 0) {
    return (
      <div className="ad-card">
        <div className="ps-empty">まだ写真の依頼はありません</div>
      </div>
    );
  }

  return (
    <div className="ad-card">
      <div className="cap">
        <span>写真査定の依頼</span>
        <span className="hint">受信の新しい順</span>
      </div>
      {initialPhotoSubmissions.map((photo) => (
        <div className="ps-row" key={photo.id}>
          <div className="ps-thumb">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/line/image/${photo.message_id}`}
              alt="査定写真"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
          <div className="ps-nm">
            <span className="n">{photo.friend?.display_name ?? "不明な友だち"}</span>
            <span className="m">{photo.friend?.real_name ?? "本名未確認"}</span>
            <span className="t">{formatReceivedAt(photo.received_at)}</span>
          </div>
          <button type="button" className="ps-call" onClick={() => handleToggle(photo)}>
            {photo.done ? "対応済み ✓" : "対応済みにする"}
          </button>
        </div>
      ))}
    </div>
  );
}
