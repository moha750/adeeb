import { Alert } from "@adeeb/design-system";
import { denyUnless } from "./_shell/guard";
import { getMyMembership } from "./_membership/data";
import { MembershipView } from "./_membership/MembershipView";
import { PageHeader } from "./_components/PageHeader";
import { getCurrentAdmin } from "@/lib/auth";
import { standingName } from "@/lib/standing";
import { getMyAccount } from "@/app/me/data";
import { getMyVolunteering } from "@/app/me/volunteering";
import { buildHome } from "./_portal/home";
import { PortalHome } from "./_portal/PortalHome";

/**
 * **صدرُ البوّابة** — بابُ كلّ صاحب حساب (`use_portal`، بوّابة أدِيب ٢٠٢٦-١٠-١٣).
 *
 * - **عضويتي** لمن يحمل `view_own_membership` (كلُّ ذي منصبٍ قائم): عضويّةُ صاحب الجلسة نفسه
 *   كما كانت صدرَ اللوحة. ورئيسيّةُ العضو تُحسم حين نصل إليها (قرار المالك ٢٠٢٦-١٠-١٢).
 * - **الرئيسية** لمن سواه — صديقُ أدِيب والمتطوّع (وحسابُ النادي): ملخّصُ ما ينتظره، وكلُّ سطرٍ
 *   يأخذه إلى غرفته (`_portal/home.ts`).
 *
 * خادميّة تجلب وتمرّر لا غير — العرض كلّه في مكوّناتٍ عميليّة (أيقونات Phosphor تُنشئ
 * `createContext`، وهو ممنوعٌ في مكوّنٍ خادميّ).
 */
export const metadata = { title: "بوّابة أدِيب" };

export default async function PortalHomePage() {
  const denied = await denyUnless("/dashboard");
  if (denied) return denied;
  const me = (await getCurrentAdmin())!;

  if (me.caps.includes("view_own_membership")) {
    const { membership, error } = await getMyMembership();
    return (
      <>
        <PageHeader title="عضويتي" />
        {error ? <Alert tone="danger" title="تعذّر جلب عضويّتك">{error}</Alert> : null}
        {membership ? <MembershipView membership={membership} /> : null}
      </>
    );
  }

  const [account, vol] = await Promise.all([getMyAccount(me.id), getMyVolunteering(me.id)]);
  const name = me.fullName?.trim() || account?.fullName || "";
  const view = await buildHome({ name, account, vol });
  const standing = standingName(vol?.isVolunteer ? "volunteer" : "account", me.gender);

  return <PortalHome view={view} card={{ name, avatar: me.avatarUrl, gender: me.gender, standing }} />;
}
