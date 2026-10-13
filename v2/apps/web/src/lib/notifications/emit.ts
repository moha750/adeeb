import "server-only";
import { after } from "next/server";
import type { FactsOf, KindKey } from "./catalog";
import { notificationsDb } from "./db";
import { dispatchPending } from "./dispatch";

/**
 * **إطلاقُ واقعةٍ من الخادم** — السطرُ الواحدُ عند المصدر (§٦): `await emit("قسم.حدث", حقائق, الفاعل)`.
 * والحقائقُ مضبوطةُ النوع بمدخل الدليل، فلا يُطلَق نوعٌ ليس فيه ولا حقيقةٌ ناقصة.
 *
 * **ولا يرمي أبدًا**: فشلُ الإشعار لا يُسقط الحدث. يرجع معرّفَ الواقعة أو `null`.
 *
 * ومن أطلق واقعتَه **داخل دالّة قاعدة** (`notify_event`) نادى `kickDispatch()` بعد ردّها، فتوزَّع
 * في الطلب نفسِه بدل انتظار منفذ الاستنزاف.
 */
export async function emit<K extends KindKey>(kind: K, facts: FactsOf<K>, actor: string | null = null): Promise<number | null> {
  const sb = notificationsDb();
  if (!sb) return null;
  const { data, error } = await sb.rpc("notify_event", { p_kind: kind, p_facts: facts, p_actor: actor });
  if (error) {
    console.error("[notifications] emit failed", { kind, error: error.message });
    return null;
  }
  kickDispatch();
  return typeof data === "number" ? data : Number(data) || null;
}

/** يوزّع ما في الطابور **بعد الردّ** (`after`)، فلا ينتظر المستخدمُ شاشاتِ القفل. */
export function kickDispatch(): void {
  after(async () => {
    await dispatchPending().catch((e: unknown) =>
      console.error("[notifications] dispatch crashed", { error: e instanceof Error ? e.message : String(e) }),
    );
  });
}
