import { Readable } from "node:stream";
import { lineBlobClient } from "@/lib/line/client";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  context: { params: Promise<{ messageId: string }> }
) {
  const { messageId } = await context.params;

  try {
    const stream = await lineBlobClient().getMessageContent(messageId);
    const webStream = Readable.toWeb(stream) as ReadableStream<Uint8Array>;

    return new Response(webStream, {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new Response("not found", { status: 404 });
  }
}
