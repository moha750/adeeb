import { Alert } from "@adeeb/design-system";
import { getMyMembership } from "./_membership/data";
import { MembershipView } from "./_membership/MembershipView";

/**
 * **عضويتي** — صدر اللوحة وتبويبها الافتراضيّ: عضويّة صاحب الجلسة نفسه لا سجلّ غيره.
 * لا قفل عليها (`HOME` في `lib/capabilities`): من عبر الباب رأى عضويّته، وليس فيها ما لغيره.
 *
 * خادميّة تجلب وتمرّر لا غير — العرض كلّه في `MembershipView` العميليّ (أيقونات Phosphor
 * تُنشئ `createContext`، وهو ممنوعٌ في مكوّنٍ خادميّ).
 */
export const metadata = { title: "عضويتي — لوحة أديب" };

export default async function MyMembershipPage() {
  const { membership, error } = await getMyMembership();

  return (
    <>
      <div className="ash-phead">
        <div>
          <div className="ash-crumb">أديب › <b>عضويتي</b></div>
          <h1>عضويتي</h1>
        </div>
      </div>

      {error ? <Alert tone="danger" title="تعذّر جلب عضويّتك">{error}</Alert> : null}
      {membership ? <MembershipView membership={membership} /> : null}
    </>
  );
}
