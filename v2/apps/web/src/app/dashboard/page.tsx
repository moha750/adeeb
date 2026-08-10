import { Alert } from "@adeeb/design-system";
import { denyUnless } from "./_shell/guard";
import { getMyMembership } from "./_membership/data";
import { MembershipView } from "./_membership/MembershipView";
import { Breadcrumb } from "./_shell/Breadcrumb";

/**
 * **عضويتي** — صدر اللوحة وتبويبها الافتراضيّ: عضويّة صاحب الجلسة نفسه لا سجلّ غيره.
 * قفلُها `view_own_membership` (في `lib/capabilities`) — يحمله كلّ ذي منصبٍ قائم، فهي
 * الغرفة التي يدخلها العضو ولا إدارةَ له، وهي البابُ نفسه: لا مفتاحَ لها فلا لوحة.
 *
 * خادميّة تجلب وتمرّر لا غير — العرض كلّه في `MembershipView` العميليّ (أيقونات Phosphor
 * تُنشئ `createContext`، وهو ممنوعٌ في مكوّنٍ خادميّ).
 */
export const metadata = { title: "عضويتي، بوّابة أديب" };

export default async function MyMembershipPage() {
  const denied = await denyUnless("/dashboard");
  if (denied) return denied;

  const { membership, error } = await getMyMembership();

  return (
    <>
      <div className="ash-phead">
        <div>
          <Breadcrumb />
          <h1>عضويتي</h1>
        </div>
      </div>

      {error ? <Alert tone="danger" title="تعذّر جلب عضويّتك">{error}</Alert> : null}
      {membership ? <MembershipView membership={membership} /> : null}
    </>
  );
}
