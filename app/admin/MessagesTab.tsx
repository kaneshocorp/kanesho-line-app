"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MessageRow } from "@/lib/types";
import { sendReplyMessage, markConversationRead } from "@/app/admin/actions";

type Conversation = {
  lineUserId: string;
  displayName: string;
  realName: string | null;
  messages: MessageRow[];
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

export default function MessagesTab({
  initialMessages,
  showToast,
}: {
  initialMessages: MessageRow[];
  showToast: (message: string) => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [messages, setMessages] = useState<MessageRow[]>(initialMessages);
  const [openId, setOpenId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [sendingId, setSendingId] = useState<string | null>(null);

  const conversations = useMemo(() => {
    const byUser = new Map<string, MessageRow[]>();
    for (const m of messages) {
      const list = byUser.get(m.line_user_id) ?? [];
      list.push(m);
      byUser.set(m.line_user_id, list);
    }
    const result: Conversation[] = [];
    for (const [lineUserId, list] of byUser) {
      const sorted = [...list].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      const last = sorted[sorted.length - 1];
      const friend = sorted.find((m) => m.friend)?.friend;
      result.push({
        lineUserId,
        displayName: friend?.display_name ?? "不明な友だち",
        realName: friend?.real_name ?? null,
        messages: sorted,
        unreadCount: sorted.filter((m) => m.direction === "in" && !m.read).length,
        lastAt: last.created_at,
        lastPreview: last.body,
      });
    }
    return result.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
  }, [messages]);

  const pendingCount = conversations.filter((c) => c.unreadCount > 0).length;
  const openConversation = conversations.find((c) => c.lineUserId === openId) ?? null;

  function handleSend(lineUserId: string) {
    const draft = (drafts[lineUserId] ?? "").trim();
    if (!draft) return;

    const optimisticId = `temp-${lineUserId}-${messages.length}`;
    const optimistic: MessageRow = {
      id: optimisticId,
      line_user_id: lineUserId,
      direction: "out",
      body: draft,
      read: true,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimistic]);
    setDrafts((prev) => ({ ...prev, [lineUserId]: "" }));
    setSendingId(lineUserId);

    startTransition(async () => {
      try {
        await sendReplyMessage(lineUserId, draft);
        setMessages((prev) =>
          prev.map((m) =>
            m.line_user_id === lineUserId && m.direction === "in" ? { ...m, read: true } : m
          )
        );
        router.refresh();
      } catch (e) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        setDrafts((prev) => ({ ...prev, [lineUserId]: draft }));
        showToast(e instanceof Error ? e.message : "返信の送信に失敗しました");
      } finally {
        setSendingId(null);
      }
    });
  }

  function handleMarkRead(lineUserId: string) {
    const previous = messages;
    setMessages((prev) =>
      prev.map((m) =>
        m.line_user_id === lineUserId && m.direction === "in" ? { ...m, read: true } : m
      )
    );
    startTransition(async () => {
      try {
        await markConversationRead(lineUserId);
      } catch (e) {
        setMessages(previous);
        showToast(e instanceof Error ? e.message : "対応済みの処理に失敗しました");
      }
    });
  }

  if (conversations.length === 0) {
    return (
      <div className="ad-card">
        <div className="ps-empty">まだ個別メッセージはありません</div>
      </div>
    );
  }

  return (
    <>
      <div className="ad-card">
        <div className="cap">
          <span>個別メッセージ</span>
          <span className="hint">
            {pendingCount > 0 ? `未対応 ${pendingCount}件` : "未対応のメッセージはありません"}
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

            <div className="msg-thread">
              {openConversation.messages.map((m) => (
                <div className={`msg-bubble ${m.direction}`} key={m.id}>
                  <div className="b">{m.body}</div>
                  <div className="t">{formatTime(m.created_at)}</div>
                </div>
              ))}
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
                  onClick={() => handleMarkRead(openConversation.lineUserId)}
                  disabled={openConversation.unreadCount === 0}
                >
                  返信不要・対応済みにする
                </button>
                <button
                  type="button"
                  className="msg-send"
                  onClick={() => handleSend(openConversation.lineUserId)}
                  disabled={
                    sendingId === openConversation.lineUserId ||
                    !(drafts[openConversation.lineUserId] ?? "").trim()
                  }
                >
                  {sendingId === openConversation.lineUserId ? "送信中…" : "送信する"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
