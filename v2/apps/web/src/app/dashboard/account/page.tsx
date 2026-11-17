import { IdentificationCard } from "@phosphor-icons/react/dist/ssr";
import { ICON_WEIGHT } from "@/lib/iconWeight";
import { denyUnless } from "../_shell/guard";
import { getCurrentAdmin } from "@/lib/auth";
import { standingName } from "@/lib/standing";
import { fmtMonthYear } from "@/lib/dates";
import { getMyAccount } from "@/app/me/data";
import { MyData } from "@/app/me/MyData";
import { getMySettings } from "../settings/data";
import { getMyProfile } from "../profile/data";
import { getMyExit } from "@/lib/membershipExit";
import { MyAccountRoom } from "@/app/_ad/rooms/MyAccountRoom";
import { AccountRoom, AdSection } from "@/app/_ad/account";
import { AdNote } from "@/app/_ad/primitives";

/**
 * **حسابي** — بابُ صاحب الحساب وما يمرّ منه: بياناتُه، ودخولُه، وأجهزتُه، وإشعاراتُه، وحذفُه.
 * لكلّ صاحب حساب. **وللعضو فيه ما كان «الملف الشخصي» و«الإعدادات»** (قرار المالك ٢٠٢٦-١٠-١٣):
 * هويّتُه وبياناتُه وحساباتُه، وبابُ خروجه. وصدرُ بوّابته يبقى «عضويتي» لا «الرئيسية».
 * على قالب «الحساب» (اعتمده محمد ٢٠٢٦-١١-٠٥): أقسامٌ بفهرسٍ يلازم الشاشة، وكرتُك بجانبها، وفي الجوّال كرتُك رأسُ الغرفة — والجلبُ
 * كما كان حرفًا، والغرفةُ القديمة (`_portal/AccountRoom`) باقيةٌ بلا استعمال حتى يقرّر المالكُ حذفها. ولوحُ الغرفة في الإطارين.
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

  if (!account || !settings) {
    return (
      <AccountRoom navPath="/dashboard/account" title="حسابي">
        <AdNote tone="bad" title="تعذّر تحميل حسابك.">{error ?? "إعدادُ الخادم ناقص. أبلغ الإدارة."}</AdNote>
      </AccountRoom>
    );
  }
  // من دخل بالرمز ولم يُكمل بياناته قطُّ لا صفَّ له: يُنشئه أوّلًا بالنموذج القائم (حقولُه من قالب النموذج حين يُبنى)
  if (!account.hasProfile && !isMember) {
    return (
      <AccountRoom navPath="/dashboard/account" title="حسابي">
        <AdSection icon={<IdentificationCard weight={ICON_WEIGHT} />} title="أكمِل بياناتك" sub="بها نحجز مقعدك ونتواصل معك"
          media={<MyData me={account} />} />
      </AccountRoom>
    );
  }

  const volunteer = me.caps.includes("view_own_volunteering");
  const profile = profileRes?.profile ?? null;
  if (isMember && !profile) {
    return (
      <AccountRoom navPath="/dashboard/account" title="حسابي">
        <AdNote tone="bad" title="تعذّر جلب ملفّك.">{profileRes?.error ?? "إعدادُ الخادم ناقص. أبلغ الإدارة."}</AdNote>
      </AccountRoom>
    );
  }
  // العضوُ منذ انضمامه، وغيرُه منذ فتح حسابه
  const since = isMember
    ? (profile?.joined ? ` منذ ${profile.joined}` : "")
    : account.since ? ` منذ ${fmtMonthYear(account.since)}` : "";
  return (
    <MyAccountRoom account={account} avatar={me.avatarUrl ?? null} settings={settings}
      standing={`${standingName(isMember ? "member" : volunteer ? "volunteer" : "account", me.gender)}${since}`}
      member={isMember && profile && exit ? { profile, exit } : undefined} />
  );
}
