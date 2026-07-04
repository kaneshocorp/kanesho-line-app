"use client";

import { useMemo, useState, useTransition } from "react";
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
  const [, startTransition] = useTransition();
  const [photos, setPhotos] = useState<PhotoSubmissionRow[]>(initialPhotoSubmissions);
  const [showDone, setShowDone] = useState(false);

  function handleToggle(photo: PhotoSubmissionRow) {
    const nextDone = !photo.done;

    // 楽観的にローカルstateを更新する
    setPhotos((prev) => prev.map((p) => (p.id === photo.id ? { ...p, done: nextDone } : p)));

    startTransition(async () => {
      try {
        await togglePhotoDone(photo.id, nextDone);
      } catch (e) {
        // ロールバック
        setPhotos((prev) =>
          prev.map((p) => (p.id === photo.id ? { ...p, done: photo.done } : p))
        );
        showToast(e instanceof Error ? e.message : "対応状況の更新に失敗しました");
      }
    });
  }

  const pendingPhotos = useMemo(() => photos.filter((p) => !p.done), [photos]);
  const donePhotos = useMemo(() => photos.filter((p) => p.done), [photos]);
  const visiblePhotos = showDone ? [...pendingPhotos, ...donePhotos] : pendingPhotos;

  if (photos.length === 0) {
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
      {pendingPhotos.length === 0 && !showDone && (
        <div className="ps-empty">未対応の依頼はありません</div>
      )}
      {visiblePhotos.map((photo) => (
        <div className={`ps-row${photo.done ? " done" : ""}`} key={photo.id}>
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
      {donePhotos.length > 0 && (
        <button type="button" className="ps-toggle-done" onClick={() => setShowDone((v) => !v)}>
          {showDone
            ? "対応済みを隠す"
            : `対応済み（${donePhotos.length}件）を表示`}
        </button>
      )}
    </div>
  );
}
