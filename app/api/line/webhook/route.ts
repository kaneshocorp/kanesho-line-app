import { webhook } from "@line/bot-sdk";
import {
  lineClient,
  verifyLineSignature,
  buildTextMessage,
  buildQuickReplyMessage,
} from "@/lib/line/client";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const PHOTO_ASSESSMENT_KEYWORD = "写真でかんたん査定";
const PHONE_NUMBER = "0827-22-7580";

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
      messages: [buildTextMessage("友だち追加ありがとうございます。お名前を教えてください。")],
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
  const supabase = supabaseAdmin();

  const { data: friend } = await supabase
    .from("friends")
    .select("line_user_id, awaiting_name, conversation_open")
    .eq("line_user_id", userId)
    .maybeSingle();

  if (friend?.awaiting_name) {
    await supabase
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
    await supabase
      .from("friends")
      .update({ conversation_open: true })
      .eq("line_user_id", userId);

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

  if (friend?.conversation_open) {
    // 相談セッション中の続きのメッセージ → 担当者への対応待ちとして保存する。
    await supabase.from("messages").insert({
      line_user_id: userId,
      direction: "in",
      body: message.text,
      prompted: true,
      read: false,
    });

    await lineClient().replyMessage({
      replyToken,
      messages: [buildTextMessage("メッセージを受け取りました。担当者より追ってご連絡いたします。")],
    });
    return;
  }

  // ボタンを押さず唐突に送られてきたメッセージ → 記録は残すが対応不要（read:true）として保存し、
  // 案内だけ返信する（FAQボットは作らない）。
  await supabase.from("messages").insert({
    line_user_id: userId,
    direction: "in",
    body: message.text,
    prompted: false,
    read: true,
  });

  await lineClient().replyMessage({
    replyToken,
    messages: [
      buildQuickReplyMessage(
        `お問い合わせはお電話（${PHONE_NUMBER}）にて承っております。査定をご希望の場合は「${PHOTO_ASSESSMENT_KEYWORD}」ボタンからどうぞ。`,
        [PHOTO_ASSESSMENT_KEYWORD]
      ),
    ],
  });
}

async function handleImageMessage(
  event: webhook.MessageEvent,
  message: webhook.ImageMessageContent
) {
  if (event.source?.type !== "user" || !event.source.userId) return;
  const userId = event.source.userId;
  const supabase = supabaseAdmin();

  await supabase
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

  // このセッションで既にメッセージを送っているか（＝写真だけでないか）を、写真の保存前に確認しておく。
  const { count: existingMessageCount } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("line_user_id", userId)
    .eq("direction", "in")
    .eq("read", false);

  await supabase.from("photo_submissions").insert({
    line_user_id: userId,
    message_id: message.id,
    received_at: new Date().toISOString(),
    done: false,
  });

  await supabase.from("friends").update({ conversation_open: true }).eq("line_user_id", userId);

  if (!event.replyToken) return;

  if (!existingMessageCount) {
    // このセッション最初の1枚（まだメッセージが伴っていない）→ 何を知りたいか一言添えてもらうよう案内する。
    await lineClient().replyMessage({
      replyToken: event.replyToken,
      messages: [
        buildQuickReplyMessage(
          "写真を受け取りました。品目や知りたいことがあれば、続けてメッセージでお知らせください。",
          ["これは何の金属ですか？", "だいたいの金額が知りたいです", "他にも写真があります"]
        ),
      ],
    });
  } else {
    await lineClient().replyMessage({
      replyToken: event.replyToken,
      messages: [buildTextMessage("写真を受け取りました。")],
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
