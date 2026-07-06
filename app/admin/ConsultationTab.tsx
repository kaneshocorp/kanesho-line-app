"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MessageRow, PhotoSubmissionRow } from "@/lib/types";
import { sendReplyMessage, markConversationHandled } from "@/app/admin/actions";

const PHOTO_CONTEXT_WINDOW_MS = 30 * 60 * 1000;

type ThreadItem =
  | { kind: "text"; id: string; direction: "in" | "out"; body: string; read: boolean; prompted: boolean; at: string }
  | { kind: "photo"; id: string; messageId: string; done: boolean; hasContext: boolean; at: string };

type Conversation = {
  lineUserId: string;
  displayName: string;
  realName: string | null;
  items: ThreadItem[];
  unreadCount: number;
  lastAt: string;
  lastPreview: string;
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${m}/${day} ${hh}:${mm}`;
}

export default function ConsultationTab({
  initialMessages,
  initialPhotoSubmissions,
  showToast,
}: {
  initialMessages: MessageRow[];
  initialPhotoSubmissions: PhotoSubmissionRow[];
  showToast: (message: string) => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [messages, setMessages] = useState<MessageRow[]>(initialMessages);
  const [photos, setPhotos] = useState<PhotoSubmissionRow[]>(initialPhotoSubmissions);
  const [openId, setOpenId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [viewingMessageId, setViewingMessageId] = useState<string | null>(null);

  const conversations = useMemo(() => {
    const byUser = new Map<string, ThreadItem[]>();
    const namesByUser = new Map<string, { displayName: string; realName: string | null }>();

    for (const m of messages) {
      const list = byUser.get(m.line_user_id) ?? [];
      list.push({
        kind: "text",
        id: m.id,
        direction: m.direction,
        body: m.body,
        read: m.read,
        prompted: m.prompted,
        at: m.created_at,
      });
      byUser.set(m.line_user_id, list);
      if (m.friend)
        namesByUser.set(m.line_user_id, {
          displayName: m.friend.display_name,
          realName: m.friend.real_name,
        });
    }

    for (const p of photos) {
      const list = byUser.get(p.line_user_id) ?? [];
      const hasContext = messages.some(
        (m) =>
          m.line_user_id === p.line_user_id &&
          m.direction === "in" &&
          Math.abs(new Date(m.created_at).getTime() - new Date(p.received_at).getTime()) <=
            PHOTO_CONTEXT_WINDOW_MS
      );
      list.push({
        kind: "photo",
        id: p.id,
        messageId: p.message_id,
        done: p.done,
        hasContext,
        at: p.received_at,
      });
      byUser.set(p.line_user_id, list);
      if (p.friend)
        namesByUser.set(p.line_user_id, {
          displayName: p.friend.display_name,
          realName: p.friend.real_name,
        });
    }

    const result: Conversation[] = [];
    for (const [lineUserId, items] of byUser) {
      const sorted = [...items].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
      const last = sorted[sorted.length - 1];
      const names = namesByUser.get(lineUserId);
      const unreadCount = sorted.filter(
        (it) => (it.kind === "text" && it.direction === "in" && !it.read) || (it.kind === "photo" && !it.done)
      ).length;

      result.push({
        lineUserId,
        displayName: names?.displayName ?? "不明な友だち",
        realName: names?.realName ?? null,
        items: sorted,
        unreadCount,
        lastAt: last.at,
        lastPreview: last.kind === "photo" ? "📷 写真" : last.body,
      });
    }
    return result.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
  }, [messages, photos]);

  const pendingCount = conversations.filter((c) => c.unreadCount > 0).length;
  const openConversation = conversations.find((c) => c.lineUserId === openId) ?? null;

  const threadRef = useRef<HTMLDivElement | null>(null);

  // 会話を開いた時・新しいメッセージが増えた時は、常に最新（一番下）が見えるようにする。
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [openId, openConversation?.items.length]);

  function handleSend(lineUserId: string) {
    const draft = (drafts[lineUserId] ?? "").trim();
    if (!draft) return;

    const optimisticId = `temp-${lineUserId}-${messages.length}`;
    setMessages((prev) => [
      ...prev,
      {
        id: optimisticId,
        line_user_id: lineUserId,
        direction: "out",
        body: draft,
        read: true,
        prompted: true,
        created_at: new Date().toISOString(),
      },
    ]);
    setDrafts((prev) => ({ ...prev, [lineUserId]: "" }));
    setBusyId(lineUserId);

    startTransition(async () => {
      try {
        await sendReplyMessage(lineUserId, draft);
        setMessages((prev) =>
          prev.map((m) => (m.line_user_id === lineUserId && m.direction === "in" ? { ...m, read: true } : m))
        );
        setPhotos((prev) =>
          prev.map((p) => (p.line_user_id === lineUserId ? { ...p, done: true } : p))
        );
        router.refresh();
      } catch (e) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        setDrafts((prev) => ({ ...prev, [lineUserId]: draft }));
        showToast(e instanceof Error ? e.message : "返信の送信に失敗しました");
      } finally {
        setBusyId(null);
      }
    });
  }

  function handleMarkHandled(lineUserId: string) {
    const previousMessages = messages;
    const previousPhotos = photos;
    setMessages((prev) =>
      prev.map((m) => (m.line_user_id === lineUserId && m.direction === "in" ? { ...m, read: true } : m))
    );
    setPhotos((prev) => prev.map((p) => (p.line_user_id === lineUserId ? { ...p, done: true } : p)));
    setBusyId(lineUserId);

    startTransition(async () => {
      try {
        await markConversationHandled(lineUserId);
        router.refresh();
      } catch (e) {
        setMessages(previousMessages);
        setPhotos(previousPhotos);
        showToast(e instanceof Error ? e.message : "対応済みの処理に失敗しました");
      } finally {
        setBusyId(null);
      }
    });
  }

  if (conversations.length === 0) {
    return (
      <div className="ad-card">
        <div className="ps-empty">まだ個別相談はありません</div>
      </div>
    );
  }

  return (
    <>
      <div className="ad-card">
        <div className="cap">
          <span>個別相談</span>
          <span className="hint">
            {pendingCount > 0 ? `未対応 ${pendingCount}件` : "未対応の相談はありません"}
          </span>
        </div>
        {conversations.map((c) => (
          <button
            type="button"
            className={`msg-row${c.unreadCount > 0 ? " pending" : ""}`}
            key={c.lineUserId}
            onClick={() => setOpenId(c.lineUserId)}
          >
            <div className="msg-av">{c.displayName.charAt(0)}</div>
            <div className="msg-info">
              <span className="n">
                {c.displayName}
                <small>{c.realName ?? "本名未確認"}</small>
              </span>
              <span className="p">{c.lastPreview}</span>
            </div>
            <div className="msg-meta">
              <span className="t">{formatTime(c.lastAt)}</span>
              {c.unreadCount > 0 && <span className="badge">{c.unreadCount}</span>}
            </div>
          </button>
        ))}
      </div>

      {openConversation && (
        <div className="sheet-bk on" onClick={() => setOpenId(null)}>
          <div className="sheet msg-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="msg-sheet-hd">
              <div className="who">
                <span className="n">{openConversation.displayName}</span>
                <span className="c">{openConversation.realName ?? "本名未確認"}</span>
              </div>
              <button type="button" className="msg-close" onClick={() => setOpenId(null)} aria-label="閉じる">
                ✕
              </button>
            </div>

            <div className="msg-thread" ref={threadRef}>
              {openConversation.items.map((it) =>
                it.kind === "photo" ? (
                  <div className="msg-bubble in msg-photo" key={`p-${it.id}`}>
                    <button
                      type="button"
                      className="msg-photo-thumb"
                      onClick={() => setViewingMessageId(it.messageId)}
                      aria-label="写真を拡大表示"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/api/line/image/${it.messageId}`} alt="査定写真" />
                    </button>
                    {!it.hasContext && <span className="msg-photo-tag">⚠ メッセージなし</span>}
                    <div className="t">{formatTime(it.at)}</div>
                  </div>
                ) : (
                  <div className={`msg-bubble ${it.direction}${!it.prompted ? " unprompted" : ""}`} key={`t-${it.id}`}>
                    <div className="b">{it.body}</div>
                    <div className="t">
                      {!it.prompted && it.direction === "in" ? "案内のみ返信・ " : ""}
                      {formatTime(it.at)}
                    </div>
                  </div>
                )
              )}
            </div>

            <div className="msg-compose">
              <textarea
                placeholder="返信メッセージを入力"
                value={drafts[openConversation.lineUserId] ?? ""}
                onChange={(e) =>
                  setDrafts((prev) => ({ ...prev, [openConversation.lineUserId]: e.target.value }))
                }
              />
              <div className="msg-compose-acts">
                <button
                  type="button"
                  className="msg-markread"
                  onClick={() => handleMarkHandled(openConversation.lineUserId)}
                  disabled={busyId === openConversation.lineUserId || openConversation.unreadCount === 0}
                >
                  返信不要・対応済みにする
                </button>
                <button
                  type="button"
                  className="msg-send"
                  onClick={() => handleSend(openConversation.lineUserId)}
                  disabled={
                    busyId === openConversation.lineUserId ||
                    !(drafts[openConversation.lineUserId] ?? "").trim()
                  }
                >
                  {busyId === openConversation.lineUserId ? "送信中…" : "送信する"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewingMessageId && (
        <div className="photo-viewer-bk" onClick={() => setViewingMessageId(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/line/image/${viewingMessageId}`}
            alt="査定写真（拡大）"
            className="photo-viewer-img"
          />
          <button
            type="button"
            className="photo-viewer-close"
            onClick={() => setViewingMessageId(null)}
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
