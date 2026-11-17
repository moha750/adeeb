import "server-only";
import { cookies } from "next/headers";
import { catalogEntries } from "./catalog";
import { renderNote } from "./render";
import type { Gender, InboxFilter, InboxItem } from "./types";

/**
 * **معاينةُ الجرس في التطوير** (٢٠٢٦-١١-١٧) — أداةُ مراجعة على نهج `?f=pair`: يُرى بها كلُّ إشعارٍ في
 * الجرس الحقيقيّ قبل أن يقع حدثُه، فيحكم محمد بعينه لا بالوصف. **لا تعمل إلا في `next dev`**، ولا تكتب
 * في القاعدة شيئًا: القاعدةُ الحيّة لا بيانات تجريبيّة فيها.
 *
 * تُفتح بكعكةٍ في المتصفّح: `document.cookie = "adeeb_bell_preview=election"` (القسمُ بمفتاحه في الدليل)،
 * و`election:female` لصيغة المؤنّث. وتُغلق بمحوها. وصاحبُ الجلسة يبقى شرطًا: الجرسُ لا يظهر بلا جلسة.
 *
 * يرسم من الدليل عيّنةَ كلِّ مخاطَبٍ في القسم (`sample`)، بالترتيب الذي كُتبت به المداخل، موزّعةً على
 * الأيّام الأخيرة فيُرى تجميعُ اللوح (اليوم، وأمس، وهذا الأسبوع). والمعرّفاتُ سالبة: «قُرئ» لا يمسّها.
 */
const COOKIE = "adeeb_bell_preview";

export async function bellPreview(): Promise<{ prefix: string; gender: Gender | undefined } | null> {
  if (process.env.NODE_ENV !== "development") return null;
  const raw = (await cookies()).get(COOKIE)?.value?.trim();
  if (!raw || !/^[a-z_]+(:(male|female))?$/.test(raw)) return null;
  const [section, g] = raw.split(":");
  return { prefix: `${section}.`, gender: g === "female" ? "female" : g === "male" ? "male" : undefined };
}

export function previewItems(prefix: string, gender: Gender, filter: InboxFilter): InboxItem[] {
  const now = Date.now();
  const items: InboxItem[] = [];
  let n = 0;
  for (const [key, kind] of catalogEntries()) {
    if (!key.startsWith(prefix)) continue;
    for (const a of kind.audiences) {
      const note = renderNote(key, a.key, kind.sample, gender);
      n += 1;
      // الأحدثُ أوّلًا: كلُّ إشعارٍ قبل سابقه بثلاث ساعات، فيمتدّ اللوحُ على أيّامٍ قليلة.
      items.push({ id: -n, ...note, at: new Date(now - (n - 1) * 3 * 3600_000).toISOString(), unread: n <= 8 });
    }
  }
  return filter === "unread" ? items.filter((i) => i.unread) : items;
}
