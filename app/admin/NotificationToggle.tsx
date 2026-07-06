"use client";

import { useEffect, useState } from "react";
import { subscribeToPush, unsubscribeFromPush } from "@/app/admin/actions";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function NotificationToggle({
  showToast,
}: {
  showToast: (message: string) => void;
}) {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    navigator.serviceWorker.register("/sw.js").then(async (registration) => {
      const existing = await registration.pushManager.getSubscription();
      setSupported(true);
      setEnabled(!!existing);
    });
  }, []);

  async function handleEnable() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        showToast("通知が許可されませんでした。ブラウザの設定からやり直せます。");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      });

      await subscribeToPush(JSON.parse(JSON.stringify(subscription)));
      setEnabled(true);
      showToast("通知をオンにしました");
    } catch {
      showToast("通知の設定に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await unsubscribeFromPush(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setEnabled(false);
      showToast("通知をオフにしました");
    } catch {
      showToast("通知の解除に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  if (!supported) return null;

  return (
    <button
      type="button"
      className={`notif-toggle${enabled ? " on" : ""}`}
      onClick={enabled ? handleDisable : handleEnable}
      disabled={busy}
    >
      {enabled ? "🔔 通知オン" : "🔕 通知オフ"}
    </button>
  );
}
