"use client";

import { useMemo, useState, useTransition } from "react";
import type { FriendRow } from "@/lib/types";
import { toggleFriendActive } from "@/app/admin/actions";

export default function FriendsTab({
  initialFriends,
  showToast,
}: {
  initialFriends: FriendRow[];
  showToast: (message: string) => void;
}) {
  const [, startTransition] = useTransition();
  const [friends, setFriends] = useState<FriendRow[]>(initialFriends);

  const activeCount = useMemo(() => friends.filter((f) => f.active).length, [friends]);

  function handleToggle(friend: FriendRow) {
    const nextActive = !friend.active;

    // 楽観的にローカルstateを更新する
    setFriends((prev) =>
      prev.map((f) => (f.line_user_id === friend.line_user_id ? { ...f, active: nextActive } : f))
    );

    startTransition(async () => {
      try {
        await toggleFriendActive(friend.line_user_id, nextActive);
      } catch (e) {
        // ロールバック
        setFriends((prev) =>
          prev.map((f) =>
            f.line_user_id === friend.line_user_id ? { ...f, active: friend.active } : f
          )
        );
        showToast(e instanceof Error ? e.message : "配信設定の更新に失敗しました");
      }
    });
  }

  return (
    <div className="ad-card">
      <div className="fr-top">
        <span>
          配信対象 <b>{activeCount}</b>人
        </span>
        <span>全 {friends.length} 人</span>
      </div>
      {friends.map((friend) => (
        <div className={`fr-row${friend.active ? "" : " off"}`} key={friend.line_user_id}>
          <div className="fr-av">{friend.display_name.charAt(0)}</div>
          <div className="fr-nm">
            <span className={`n${friend.active ? "" : " strike"}`}>{friend.display_name}</span>
            <span className="c">
              {friend.awaiting_name ? "（本名確認中）" : friend.real_name ?? "（本名確認中）"}
            </span>
          </div>
          <button
            type="button"
            className={`fr-tg${friend.active ? "" : " off"}`}
            onClick={() => handleToggle(friend)}
          >
            {friend.active ? "配信を止める" : "配信を再開"}
          </button>
        </div>
      ))}
    </div>
  );
}
