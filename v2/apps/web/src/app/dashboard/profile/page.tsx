import { Alert } from "@adeeb/design-system";
import { denyUnless } from "../_shell/guard";
import { getMyProfile } from "./data";
import { ProfileView } from "./ProfileView";
import { PageHeader } from "../_components/PageHeader";

/**
 * **الملفّ الشخصيّ** — بياناتُك أنت: تُعرَض كاملةً، ويُحرَّر منها ما هو منك.
 *
 * وهي أختُ «عضويتي» لا نسختُها: تلك تروي موقعَك من أديب (مسيرةٌ وإنذاراتٌ وشهادات)، وهذه
 * تحمل سجلَّك (صورةٌ وجوّالٌ ودراسةٌ وحسابات). ولذلك يشتركان في المفتاح `view_own_membership`
 * — بابُ المرء إلى نفسه واحد، ولا معنى لعضوٍ يرى عضويّته ويُحجَب عن بياناته.
 *
 * خادميّة تجلب وتمرّر لا غير — العرض في `ProfileView` العميليّ (أيقونات Phosphor تُنشئ
 * `createContext`، وهو ممنوعٌ في مكوّنٍ خادميّ).
 */
export const metadata = { title: "الملف الشخصي، بوّابة أديب" };

export default async function MyProfilePage() {
  const denied = await denyUnless("/dashboard/profile");
  if (denied) return denied;

  const { profile, error } = await getMyProfile();

  return (
    <>
      <PageHeader title="الملف الشخصي" />

      {error ? <Alert tone="danger" title="تعذّر جلب ملفّك">{error}</Alert> : null}
      {profile ? <ProfileView profile={profile} /> : null}
    </>
  );
}
