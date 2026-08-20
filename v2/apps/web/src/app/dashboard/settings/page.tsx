import { Alert } from "@adeeb/design-system";
import { getSessionAdmin } from "@/lib/auth";
import { deletionDueLabel } from "@/lib/accountDeletion";
import { getMyExit } from "@/lib/membershipExit";
import { denyUnless } from "../_shell/guard";
import { getMySettings } from "./data";
import { SettingsView } from "./SettingsView";
import { PageHeader } from "../_components/PageHeader";

/**
 * **الإعدادات** — حسابُك لا سجلُّك: بريدُ الدخول ومفتاحُه وطرقُه، والأجهزةُ التي تحمل جلساتك،
 * وما يبلغك من رسائل، وما يخرج عنك إلى الناس في صفحتك العلنيّة.
 *
 * وثلاثةُ تبويباتٍ للمرء عن نفسه، لكلٍّ طبقتُه: **عضويتي** علاقتُك بالنادي (منصبٌ ومسيرة)،
 * و**الملف الشخصي** سجلُّك (اسمٌ وجوّالٌ ودراسة)، و**الإعدادات** بابُك وما يمرّ منه.
 *
 * ومفتاحُها `view_own_membership` كأختيها — بابُ المرء إلى نفسه واحد، ولا يقع خلفه إلّا
 * حسابُ حامله: كلُّ قراءةٍ وكلُّ فعلٍ ههنا بجلسة صاحبها لا بمفتاح خدمة، والقاعدةُ هي التي
 * تحصر المدى (`my_sessions` و`revoke_my_session` بـ`auth.uid()`، وسياساتُ `profiles`
 * و`user_roles` بصفّ صاحبها).
 */
export const metadata = { title: "الإعدادات، بوّابة أديب" };

export default async function SettingsPage() {
  const denied = await denyUnless("/dashboard/settings");
  if (denied) return denied;

  const { settings, error } = await getMySettings();

  // حالُ طلب الحذف تُقرأ بمفتاح الخدمة (`getSessionAdmin`) لا بجلسة صاحبها: أعمدةُ الحذف
  // في `profiles` لم يُمنَح `authenticated` قراءتَها عمدًا — ثلاثةُ حقولٍ لا تستأهل توسيعَ
  // سطحٍ عامّ، والخادمُ يقرؤها لصاحبها وحدَه.
  const me = await getSessionAdmin();
  const exit = await getMyExit();

  return (
    <>
      <PageHeader title="الإعدادات" />

      {error ? <Alert tone="danger" title="تعذّر جلب إعداداتك">{error}</Alert> : null}
      {settings ? (
        <SettingsView
          settings={settings}
          exit={exit}
          fullName={me?.fullName ?? ""}
          deletion={{
            pending: me?.deletionRequestedAt != null,
            dueLabel: deletionDueLabel(me?.deletionRequestedAt ?? null),
          }}
        />
      ) : null}
    </>
  );
}
