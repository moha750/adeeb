import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getSessionAdmin } from "@/lib/auth";
import { getMyQrLinks } from "../data";
import { getMyQrCampaignBriefs } from "../campaigns/data";
import { SavedLinksView } from "../SavedLinksView";

/**
 * **باركودات مفردة** — البابُ الأوّل في غرفة الباركود، وجارُه «الحملات» (`../campaigns`).
 *
 * كان المحرّرُ هو ما يستقبلك في الغرفة وقائمتُك تحته، فقُلب الترتيب ٢٠٢٦-٠٨-٢١ بأمر المالك:
 * الغالبُ أنّك تدخل لترى رمزًا أو تبدّل وجهته، والإنشاءُ حدثٌ نادر. فصارت القائمةُ أوّلَ
 * ما تراه، و`new` للإنشاء، و`[id]` للرمز وإحصائه.
 *
 * **ولمَ مسارٌ فرعيٌّ لا جذرُ الغرفة** (أمرُ المالك ٢٠٢٦-١٠-٠٣، بعد أن رأى العطبَ نفسَه في
 * اللوحة الإعلانية): الفتاتُ تُسمّي الورقةَ حين يكون المسارُ تحت بند الخريطة، أمّا على
 * البند نفسِه فالورقةُ تحلّ محلَّ اسمه (`crumbFor`) فيسقط «مولّد الباركود». فكانت
 * «الحملات» تُسمّى في الفتات و«باركودات مفردة» لا. فنزلت القائمةُ إلى هنا وتماثل البابان،
 * والجذرُ يحوّل إليها فلا ينكسر رابطٌ محفوظ.
 *
 * والقراءةُ بعميل الجلسة (`data.ts`) لا بمفتاح الخدمة: المدى «كلٌّ يرى رموزَه هو»
 * تحكمه سياسةُ own-row في القاعدة، لا سطرُ `where` في التطبيق.
 */
export const metadata = { title: "باركوداتي، بوّابة أدِيب" };

export default async function QrLinksPage() {
  const denied = await denyUnless("/dashboard/tools/qr");
  if (denied) return denied;

  const [{ rows, error }, me, campaigns] = await Promise.all([
    getMyQrLinks(),
    getSessionAdmin(),
    getMyQrCampaignBriefs(),
  ]);

  return <SavedLinksView rows={rows} error={error} meId={me?.id ?? null} campaigns={campaigns} />;
}
