import { Alert, Card, CardBody, CardHeader } from "@adeeb/design-system";
import { IdentificationCard } from "@phosphor-icons/react/dist/ssr";
import { ICON_WEIGHT } from "@/lib/iconWeight";
import { denyUnless } from "../_shell/guard";
import { getCurrentAdmin } from "@/lib/auth";
import { usesSidebar } from "@/lib/capabilities";
import { standingName } from "@/lib/standing";
import { fmtMonthYear } from "@/lib/dates";
import { getMyAccount } from "@/app/me/data";
import { MyData } from "@/app/me/MyData";
import { getMySettings } from "../settings/data";
import { getMyProfile } from "../profile/data";
import { getMyExit } from "@/lib/membershipExit";
import { PageHeader } from "../_components/PageHeader";
import { AccountRoom } from "../_portal/AccountRoom";

/**
 * **حسابي** — بابُ صاحب الحساب وما يمرّ منه: بياناتُه، ودخولُه، وأجهزتُه، وإشعاراتُه، وحذفُه.
 * لكلّ صاحب حساب. **وللعضو فيه ما كان «الملف الشخصي» و«الإعدادات»** (قرار المالك ٢٠٢٦-١٠-١٣):
 * هويّتُه وبياناتُه وحساباتُه، وبابُ خروجه. وصدرُ بوّابته يبقى «عضويتي» لا «الرئيسية».
 */
export const metadata = { title: "حسابي، بوّابة أدِيب" };

export default async function AccountPage() {
  const denied = await denyUnless("/dashboard/account");
  if (denied) return denied;
  const me = (await getCurrentAdmin())!;
  const isMember = me.caps.includes("view_own_membership");

  const [account, { settings, error }, profileRes, exit] = await Promise.all([
    getMyAccount(me.id),
    getMySettings(),
    isMember ? getMyProfile() : Promise.resolve(null),
    isMember ? getMyExit() : Promise.resolve(null),
  ]);
  const header = usesSidebar(me.caps) ? <PageHeader title="حسابي" /> : null;

  if (!account || !settings) {
    return <>{header}<Alert tone="danger" title="تعذّر تحميل حسابك">{error ?? "إعداد الخادم ناقص. أبلغ الإدارة."}</Alert></>;
  }
  // من دخل بالرمز ولم يُكمل بياناته قطُّ لا صفَّ له: يُنشئه أوّلًا بالنموذج القائم
  if (!account.hasProfile && !isMember) {
    return (
      <>
        {header}
        <Card>
          <CardHeader variant="soft" icon={<IdentificationCard weight={ICON_WEIGHT} aria-hidden />} title="أكمِل بياناتك" subtitle="بها نحجز مقعدك ونتواصل معك" />
          <CardBody><MyData me={account} /></CardBody>
        </Card>
      </>
    );
  }

  const volunteer = me.caps.includes("view_own_volunteering");
  const profile = profileRes?.profile ?? null;
  if (isMember && !profile) {
    return <>{header}<Alert tone="danger" title="تعذّر جلب ملفّك">{profileRes?.error ?? "إعداد الخادم ناقص. أبلغ الإدارة."}</Alert></>;
  }
  // العضوُ منذ انضمامه، وغيرُه منذ فتح حسابه
  const since = isMember
    ? (profile?.joined ? ` منذ ${profile.joined}` : "")
    : account.since ? ` منذ ${fmtMonthYear(account.since)}` : "";
  return (
    <>
      {header}
      <AccountRoom account={account} avatar={me.avatarUrl ?? null} settings={settings}
        standing={`${standingName(isMember ? "member" : volunteer ? "volunteer" : "account", me.gender)}${since}`}
        member={isMember && profile && exit ? { profile, exit } : undefined} />
    </>
  );
}
