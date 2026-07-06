import webpush from "web-push";
import { supabaseAdmin } from "@/lib/supabase/admin";

function configure() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) throw new Error("VAPIDキーが未設定です。");
  webpush.setVapidDetails("mailto:info@example.com", publicKey, privateKey);
}

/**
 * 個別相談タブに新着があったことを、通知を許可している全端末にプッシュ通知で知らせる。
 * 失効した購読（410 Gone）は自動的にDBから削除する。
 */
export async function notifyStaff(title: string, body: string, url: string) {
  const supabase = supabaseAdmin();
  const { data: subscriptions, error } = await supabase.from("push_subscriptions").select("*");
  if (error || !subscriptions || subscriptions.length === 0) return;

  configure();

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify({ title, body, url })
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    })
  );
}
