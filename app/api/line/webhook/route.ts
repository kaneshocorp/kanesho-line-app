import { webhook } from "@line/bot-sdk";
import { lineClient, verifyLineSignature, buildTextMessage } from "@/lib/line/client";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const PHOTO_ASSESSMENT_KEYWORD = "写真でかんたん査定";

async function handleFollow(event: webhook.FollowEvent) {
  if (event.source?.type !== "user" || !event.source.userId) return;
  const userId = event.source.userId;

  const profile = await lineClient().getProfile(userId);

  await supabaseAdmin().from("friends").upsert(
    {
      line_user_id: userId,
      display_name: profile.displayName,
      active: true,
      awaiting_company: true,
      joined_at: new Date().toISOString(),
    },
    { onConflict: "line_user_id" }
  );

  await lineClient().replyMessage({
    replyToken: event.replyToken,
    messages: [
      buildTextMessage(
        "友だち追加ありがとうございます。会社名（法人のお客様のみ）を教えてください。個人のお客様は「個人」とだけ送ってください。"
      ),
    ],
  });
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
    .select("line_user_id, awaiting_company")
    .eq("line_user_id", userId)
    .maybeSingle();

  if (friend?.awaiting_company) {
    const company = message.text === "個人" ? "個人のお客様" : message.text;
    await supabaseAdmin()
      .from("friends")
      .update({ company, awaiting_company: false })
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
        awaiting_company: false,
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
