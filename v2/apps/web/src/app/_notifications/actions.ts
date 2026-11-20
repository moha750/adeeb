"use server";

import { getCurrentAdmin } from "@/lib/auth";
import { notificationsDb } from "@/lib/notifications/db";
import { inboxPage, markRead, unreadCount } from "@/lib/notifications/inbox";
import { bellPreview, previewItems } from "@/lib/notifications/preview";
import type { Gender, InboxFilter, InboxItem } from "@/lib/notifications/types";

/**
 * أفعالُ الجرس — **لصاحب الجلسة نفسِه**، والهويّةُ من الجلسة (`getSessionAdmin`) لا من المتصفّح.
 * فلا معرّفَ يُمرَّر من العميل، ولا يقرأ أحدٌ صندوقَ غيره.
 *
 * ولمَ `getSessionAdmin` لا المطالباتُ وحدها؟ لأنّ الرمزَ يُتحقَّق منه محلّيًّا، فجلسةٌ أُبطِلت (جوّالٌ
 * ضاع فأُخرج منه صاحبُه) يبقى رمزُها صحيحَ التوقيع حتّى ينتهي عمرُه. والإبطالُ يكشفه `loadIdentity`
 * (`session_alive`)، وفيه الجنسُ الذي يُرسَم به النصّ (من المراجعة المستقلّة، ٢٠٢٦-١٠-١٠).
 *
 * **وأثناء المعاينة جرسُ المُعايَن** (محمد ٢٠٢٦-١١-٢٠: «هل الإشعارات الموجودة هي إشعاراتها؟»، والمعاينةُ كاملةٌ بقراره). كان
 * بريدَ صاحب الجلسة («لا يُقرأ بريدُ أحدٍ لأنّ مديرًا يعاين شاشتَه»)، فرأى محمد معاينًا فاطمة إشعاراتِه هو. و`getCurrentAdmin`
 * يُبطل المعاينةَ إن أُبطلت جلسةُ صاحبها كما كان. **إلّا أنّ فتحَ الجرس لا يقرأ عنه**: «قُرئ» أثرٌ يقع بلا قصد، فلا يفقد
 * المُعايَنُ جديدَه لأنّ أحدًا عاين شاشتَه.
 */

async function who(): Promise<{ id: string; gender: Gender; previewing: boolean } | null> {
  const me = await getCurrentAdmin();
  return me ? { id: me.id, gender: me.gender, previewing: !!me.viewAs } : null;
}

export async function loadInboxSummary(): Promise<{ userId: string; unread: number } | null> {
  const me = await who();
  const sb = notificationsDb();
  if (!me || !sb) return null;
  // معاينةُ التطوير (`lib/notifications/preview.ts`): عيّناتُ الدليل بدل الصندوق، ولا كتابةَ في القاعدة.
  const pv = await bellPreview();
  if (pv) return { userId: me.id, unread: previewItems(pv.prefix, pv.gender ?? me.gender, "unread").length };
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
  const pv = await bellPreview();
  if (pv) return before ? { items: [], more: false } : { items: previewItems(pv.prefix, pv.gender ?? me.gender, f), more: false };
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
  if (me.previewing) return true;
  const clean = ids.filter((n) => Number.isSafeInteger(n) && n > 0).slice(0, 100);
  return clean.length ? markRead(sb, me.id, clean) : true;
}

export async function readAllNotes(): Promise<boolean> {
  const me = await who();
  const sb = notificationsDb();
  if (!me || !sb) return false;
  if (me.previewing) return true;
  return markRead(sb, me.id, "all");
}
