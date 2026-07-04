"use client";

import { useState } from "react";
import { broadcastAnnouncement } from "@/app/admin/actions";

export default function AnnouncementTab({
  showToast,
}: {
  showToast: (message: string) => void;
}) {
  const [text, setText] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);

  async function handleConfirmSend() {
    if (!text.trim()) return;
    setSending(true);
    try {
      const { recipientCount } = await broadcastAnnouncement(text.trim());
      setConfirmOpen(false);
      setText("");
      showToast(`配信しました（${recipientCount}人）`);
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
          <span>お知らせを配信</span>
          <span className="hint">価格・休業連絡以外の自由な文面</span>
        </div>
        <div style={{ padding: "12px 14px" }}>
          <textarea
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="キャンペーンのお知らせなど、自由に文面を入力してください"
          />
        </div>
      </div>

      <div style={{ height: 96 }} />

      <div className="ad-send">
        <button type="button" onClick={() => setConfirmOpen(true)} disabled={!text.trim()}>
          この内容でLINEに配信する
        </button>
        <div className="cnt">LINE友だち全員（配信対象）に届きます</div>
      </div>

      {confirmOpen && (
        <div className="sheet-bk on" onClick={() => !sending && setConfirmOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="st">この内容で配信します</div>
            <div className="ss">配信すると取り消せません。内容をご確認ください</div>
            <div className="chg">
              <div className="chg-none" style={{ whiteSpace: "pre-wrap", textAlign: "left" }}>
                {text}
              </div>
            </div>
            <div className="acts">
              <button
                type="button"
                className="no"
                onClick={() => setConfirmOpen(false)}
                disabled={sending}
              >
                やめる
              </button>
              <button type="button" className="go" onClick={handleConfirmSend} disabled={sending}>
                {sending ? "配信中…" : "配信する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
