import "server-only";
import { chunks, type NotificationsDb } from "./db";
import { renderNote } from "./render";
import type { Gender, InboxFilter, InboxItem } from "./types";

/**
 * **قراءةُ الصندوق** — لصاحبه وحده، بمفتاح الخدمة بعد أن عرف المستدعي هويّتَه من الجلسة.
 * يُرسَم النصُّ هنا بجنس القارئ، فلا يبلغ المتصفّحَ من الواقعة إلّا ما يُقرأ.
 * وما حلّ أجلُه لا يُعرَض ولا يُعَدّ (`expires_at`)، والباقي باقٍ أبدًا (قرار محمد).
 */

export const PAGE = 30;

const alive = () => `expires_at.is.null,expires_at.gt.${new Date().toISOString()}`;

export async function unreadCount(sb: NotificationsDb, userId: string): Promise<number> {
  const { count } = await sb
    .from("notification_inbox")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null)
    .or(alive());
  return count ?? 0;
}

type Row = {
  id: number;
  audience: string;
  created_at: string;
  read_at: string | null;
  notification_events: { kind: string; facts: unknown; fallback: string | null } | null;
};

export async function inboxPage(
  sb: NotificationsDb,
  userId: string,
  gender: Gender,
  filter: InboxFilter,
  before: number | null,
): Promise<{ items: InboxItem[]; more: boolean }> {
  let q = sb
    .from("notification_inbox")
    .select("id, audience, created_at, read_at, notification_events(kind, facts, fallback)")
    .eq("user_id", userId)
    .or(alive())
    .order("id", { ascending: false })
    .limit(PAGE + 1);
  if (filter === "unread") q = q.is("read_at", null);
  if (before) q = q.lt("id", before);
  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as Row[];
  const items = rows.slice(0, PAGE).map((r): InboxItem => {
    const ev = r.notification_events;
    const note = renderNote(ev?.kind ?? "", r.audience, ev?.facts ?? {}, gender, ev?.fallback);
    return { id: r.id, ...note, at: r.created_at, unread: r.read_at === null };
  });
  return { items, more: rows.length > PAGE };
}

/** «قُرئ» — لصفوف صاحبه وحده، وما قُرئ قبلُ لا يُعاد تأريخُه. */
export async function markRead(sb: NotificationsDb, userId: string, ids: number[] | "all"): Promise<boolean> {
  const now = new Date().toISOString();
  if (ids === "all") {
    const { error } = await sb.from("notification_inbox").update({ read_at: now }).eq("user_id", userId).is("read_at", null);
    return !error;
  }
  for (const part of chunks(ids, 100)) {
    const { error } = await sb
      .from("notification_inbox")
      .update({ read_at: now })
      .eq("user_id", userId)
      .in("id", part)
      .is("read_at", null);
    if (error) return false;
  }
  return true;
}
