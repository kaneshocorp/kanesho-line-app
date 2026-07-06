import { Suspense } from "react";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type {
  ItemRow,
  FriendRow,
  PhotoSubmissionRow,
  CalendarOverrideRow,
  BusinessConfigRow,
  MessageRow,
} from "@/lib/types";
import AdminApp from "@/app/admin/AdminApp";

export const dynamic = "force-dynamic";

function monthRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const toKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { startKey: toKey(start), endKey: toKey(end) };
}

export default async function AdminPage() {
  const supabase = supabaseAdmin();
  const now = new Date();
  const { startKey, endKey } = monthRange(now);

  const [itemsRes, friendsRes, photosRes, messagesRes, overridesRes, configRes] = await Promise.all([
    supabase.from("items").select("*").order("sort_order", { ascending: true }),
    supabase.from("friends").select("*").order("joined_at", { ascending: true }),
    supabase
      .from("photo_submissions")
      .select("*, friend:friends(display_name, real_name)")
      .order("received_at", { ascending: false }),
    supabase
      .from("messages")
      .select("*, friend:friends(display_name, real_name)")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("calendar_overrides")
      .select("*")
      .gte("date", startKey)
      .lte("date", endKey),
    supabase.from("business_config").select("*").eq("id", 1).single(),
  ]);

  const items = (itemsRes.data ?? []) as ItemRow[];
  const friends = (friendsRes.data ?? []) as FriendRow[];
  const photoSubmissions = (photosRes.data ?? []) as unknown as PhotoSubmissionRow[];
  const messages = (messagesRes.data ?? []) as unknown as MessageRow[];
  const calendarOverrides = (overridesRes.data ?? []) as CalendarOverrideRow[];
  const businessConfig = (configRes.data ?? {
    id: 1,
    closed_weekdays: [0],
    open_time: "08:00",
    close_time: "17:00",
    break_start: "12:00",
    break_end: "13:00",
  }) as BusinessConfigRow;

  return (
    <Suspense>
      <AdminApp
        initialItems={items}
        initialFriends={friends}
        initialPhotoSubmissions={photoSubmissions}
        initialMessages={messages}
        initialCalendarOverrides={calendarOverrides}
        businessConfig={businessConfig}
      />
    </Suspense>
  );
}
