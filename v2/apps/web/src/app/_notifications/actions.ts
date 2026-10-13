"use server";

import { getSessionAdmin } from "@/lib/auth";
import { notificationsDb } from "@/lib/notifications/db";
import { inboxPage, markRead, unreadCount } from "@/lib/notifications/inbox";
import type { Gender, InboxFilter, InboxItem } from "@/lib/notifications/types";

/**
 * أفعالُ الجرس — **لصاحب الجلسة نفسِه**، والهويّةُ من الجلسة (`getSessionAdmin`) لا من المتصفّح.
 * فلا معرّفَ يُمرَّر من العميل، ولا يقرأ أحدٌ صندوقَ غيره.
 *
 * ولمَ `getSessionAdmin` لا المطالباتُ وحدها؟ لأنّ الرمزَ يُتحقَّق منه محلّيًّا، فجلسةٌ أُبطِلت (جوّالٌ
 * ضاع فأُخرج منه صاحبُه) يبقى رمزُها صحيحَ التوقيع حتّى ينتهي عمرُه. والإبطالُ يكشفه `loadIdentity`
 * (`session_alive`)، وفيه الجنسُ الذي يُرسَم به النصّ (من المراجعة المستقلّة، ٢٠٢٦-١٠-١٠).
 *
 * ولمَ صاحبُ الجلسة لا «المُعايَن»؟ لأنّ المعاينة (`view-as`) استعارةُ هويّةٍ للنظر في اللوحة،
 * والجرسُ بريدُ صاحبه: لا يُقرأ بريدُ أحدٍ لأنّ مديرًا يعاين شاشتَه.
 */

async function who(): Promise<{ id: string; gender: Gender } | null> {
  const me = await getSessionAdmin();
  return me ? { id: me.id, gender: me.gender } : null;
}

export async function loadInboxSummary(): Promise<{ userId: string; unread: number } | null> {
  const me = await who();
  const sb = notificationsDb();
  if (!me || !sb) return null;
  return { userId: me.id, unread: await unreadCount(sb, me.id) };
}

export async function loadInboxPage(
  filter: InboxFilter,
  before: number | null = null,
): Promise<{ items: InboxItem[]; more: boolean } | null> {
  const me = await who();
  const sb = notificationsDb();
  if (!me || !sb) return null;
  const f: InboxFilter = filter === "unread" ? "unread" : "all";
  const cursor = Number.isSafeInteger(before) && (before as number) > 0 ? (before as number) : null;
  try {
    return await inboxPage(sb, me.id, me.gender, f, cursor);
  } catch (e) {
    console.error("[notifications] inbox read failed", { error: e instanceof Error ? e.message : String(e) });
    return null;
  }
}

export async function readNotes(ids: number[]): Promise<boolean> {
  const me = await who();
  const sb = notificationsDb();
  if (!me || !sb || !Array.isArray(ids)) return false;
  const clean = ids.filter((n) => Number.isSafeInteger(n) && n > 0).slice(0, 100);
  return clean.length ? markRead(sb, me.id, clean) : true;
}

export async function readAllNotes(): Promise<boolean> {
  const me = await who();
  const sb = notificationsDb();
  if (!me || !sb) return false;
  return markRead(sb, me.id, "all");
}
