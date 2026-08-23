import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getMyQrLinks } from "./data";
import { SavedLinksView } from "./SavedLinksView";

/**
 * **رموزي** — جذرُ غرفة الباركود.
 *
 * كان المحرّرُ هو ما يستقبلك هنا وقائمتُك تحته، فقُلب الترتيب ٢٠٢٦-٠٨-٢١ بأمر المالك:
 * الغالبُ أنّك تدخل لترى رمزًا أو تبدّل وجهته، والإنشاءُ حدثٌ نادر. فصارت الغرفةُ ثلاثةَ
 * أبواب على عُرف بقيّة اللوحة: قائمةٌ في الجذر، و`new` للإنشاء، و`[id]` للرمز وإحصائه.
 *
 * والقراءةُ بعميل الجلسة (`data.ts`) لا بمفتاح الخدمة: المدى «كلٌّ يرى رموزَه هو»
 * تحكمه سياسةُ own-row في القاعدة، لا سطرُ `where` في التطبيق.
 */
export const metadata = { title: "باركوداتي، بوّابة أديب" };

export default async function QrToolPage() {
  const denied = await denyUnless("/dashboard/tools/qr");
  if (denied) return denied;

  const { rows, error } = await getMyQrLinks();

  return <SavedLinksView rows={rows} error={error} />;
}
