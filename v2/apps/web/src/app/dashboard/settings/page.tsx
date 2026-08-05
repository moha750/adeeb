import { Alert } from "@adeeb/design-system";
import { denyUnless } from "../_shell/guard";
import { Breadcrumb } from "../_shell/Breadcrumb";
import { getMySettings } from "./data";
import { SettingsView } from "./SettingsView";

/**
 * **الإعدادات** — حسابُك لا سجلُّك: بريدُ الدخول ومفتاحُه، والأجهزةُ التي تحمل جلساتك.
 *
 * وثلاثةُ تبويباتٍ للمرء عن نفسه، لكلٍّ طبقتُه: **عضويتي** علاقتُك بالنادي (منصبٌ ومسيرة)،
 * و**الملف الشخصي** سجلُّك (اسمٌ وجوّالٌ ودراسة)، و**الإعدادات** بابُك (دخولٌ وجلسات).
 *
 * ومفتاحُها `view_own_membership` كأختيها — بابُ المرء إلى نفسه واحد، ولا يقع خلفه إلّا
 * حسابُ حامله: الجلسات تُقرأ بـ`auth.uid()` في القاعدة، والأفعال كلُّها بجلسته لا بمفتاح خدمة.
 */
export const metadata = { title: "الإعدادات — بوّابة أديب" };

export default async function SettingsPage() {
  const denied = await denyUnless("/dashboard/settings");
  if (denied) return denied;

  const { settings, error } = await getMySettings();

  return (
    <>
      <div className="ash-phead">
        <div>
          <Breadcrumb />
          <h1>الإعدادات</h1>
        </div>
      </div>

      {error ? <Alert tone="danger" title="تعذّر جلب إعداداتك">{error}</Alert> : null}
      {settings ? <SettingsView settings={settings} /> : null}
    </>
  );
}
