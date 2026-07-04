import { webhook } from "@line/bot-sdk";
import { lineClient, verifyLineSignature, buildTextMessage } from "@/lib/line/client";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const PHOTO_ASSESSMENT_KEYWORD = "写真でかんたん査定";

async function handleFollow(event: webhook.FollowEvent) {
  if (event.source?.type !== "user" || !event.source.userId) return;
  const userId = event.source.userId;
  const supabase = supabaseAdmin();

  const { data: existing } = await supabase
    .from("friends")
    .select("real_name")
    .eq("line_user_id", userId)
    .maybeSingle();

  if (existing?.real_name) {
    // 以前ブロック等で離脱していたが、本名は既に確認済みの友だち → 再度名前は聞かず再アクティブ化するだけ
    await supabase.from("friends").update({ active: true }).eq("line_user_id", userId);
    if (event.replyToken) {
      await lineClient().replyMessage({
        replyToken: event.replyToken,
        messages: [buildTextMessage(`お帰りなさい、${existing.real_name}様。今後ともよろしくお願いいたします。`)],
      });
    }
    return;
  }

  // 新規の友だち → 本名の確認を依頼（会社名は聞かない）
  const profile = await lineClient().getProfile(userId);
  await supabase.from("friends").upsert(
    {
      line_user_id: userId,
      display_name: profile.displayName,
      active: true,
      awaiting_name: true,
      joined_at: new Date().toISOString(),
    },
    { onConflict: "line_user_id" }
  );
  if (event.replyToken) {
    await lineClient().replyMessage({
      replyToken: event.replyToken,
      messages: [buildTextMessage("友だち追加ありがとうございます。お名前（本名）を教えてください。")],
    });
  }
}

async function handleUnfollow(event: webhook.UnfollowEvent) {
  if (event.source?.type !== "user" || !event.source.userId) return;
  const userId = event.source.userId;

  await supabaseAdmin()
    .from("friends")
    .update({ active: false })
    .eq("line_user_id", userId);
}

async function handleTextMessage(
  event: webhook.MessageEvent,
  message: webhook.TextMessageContent
) {
  if (event.source?.type !== "user" || !event.source.userId) return;
  if (!event.replyToken) return;
  const userId = event.source.userId;
  const replyToken = event.replyToken;

  const { data: friend } = await supabaseAdmin()
    .from("friends")
    .select("line_user_id, awaiting_name")
    .eq("line_user_id", userId)
    .maybeSingle();

  if (friend?.awaiting_name) {
    await supabaseAdmin()
      .from("friends")
      .update({ real_name: message.text, awaiting_name: false })
      .eq("line_user_id", userId);

    await lineClient().replyMessage({
      replyToken,
      messages: [buildTextMessage("登録ありがとうございます。今後よろしくお願いいたします。")],
    });
    return;
  }

  if (message.text === PHOTO_ASSESSMENT_KEYWORD) {
    await lineClient().replyMessage({
      replyToken,
      messages: [
        buildTextMessage(
          "査定をご希望の金属の写真を送ってください。折り返しおおよその金額をご案内します。"
        ),
      ],
    });
    return;
  }

  // それ以外は意図的に何もしない（FAQボットは作らない）。
}

async function handleImageMessage(
  event: webhook.MessageEvent,
  message: webhook.ImageMessageContent
) {
  if (event.source?.type !== "user" || !event.source.userId) return;
  const userId = event.source.userId;

  await supabaseAdmin()
    .from("friends")
    .upsert(
      {
        line_user_id: userId,
        display_name: "LINEユーザー",
        active: true,
        real_name: null,
        awaiting_name: false,
      },
      { onConflict: "line_user_id", ignoreDuplicates: true }
    );

  await supabaseAdmin().from("photo_submissions").insert({
    line_user_id: userId,
    message_id: message.id,
    received_at: new Date().toISOString(),
    done: false,
  });

  if (event.replyToken) {
    await lineClient().replyMessage({
      replyToken: event.replyToken,
      messages: [buildTextMessage("写真を受け取りました。追ってご連絡いたします。")],
    });
  }
}

async function handleEvent(event: webhook.Event) {
  switch (event.type) {
    case "follow":
      await handleFollow(event);
      return;
    case "unfollow":
      await handleUnfollow(event);
      return;
    case "message":
      if (event.message.type === "text") {
        await handleTextMessage(event, event.message);
      } else if (event.message.type === "image") {
        await handleImageMessage(event, event.message);
      }
      return;
    default:
      return;
  }
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature");

  if (!signature || !verifyLineSignature(rawBody, signature)) {
    return new Response("invalid signature", { status: 401 });
  }

  const body = JSON.parse(rawBody) as webhook.CallbackRequest;
  const events = body.events ?? [];

  await Promise.all(events.map((event) => handleEvent(event)));

  return Response.json({ status: "ok" });
}
