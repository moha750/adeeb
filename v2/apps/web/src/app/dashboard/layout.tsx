import type { Metadata } from "next";
// حصّةُ اللوحة من `components.css` (فارغةٌ في التطوير، انظر `loaders/css-sections.cjs`).
import "@adeeb/design-system/components.dash.css";
import { redirect } from "next/navigation";
import { DashboardShell } from "./_shell/DashboardShell";
import { AccessDenied } from "./_shell/AccessDenied";
import { ViewAsBar } from "./_shell/ViewAsBar";
import { ToastProvider } from "./_components/ToastProvider";
import { PwaIntro } from "@/app/_pwa/PwaIntro";
import { awayIfNoSession, getCurrentAdmin, getSessionAdmin } from "@/lib/auth";
import { hasMemberRecord, isAdeebMember } from "@/lib/memberRecord";
import { getMyScope } from "@/lib/myScope";
import { usesSidebar } from "@/lib/capabilities";
import { standingName } from "@/lib/standing";
import { PortalShell } from "./_portal/PortalShell";

export const metadata: Metadata = {
  title: "بوّابة أدِيب",
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // احتياطٌ خلفَ الحارس — ويفرّق بين الغائب والمُبطَل: من أُبطِلت جلستُه يُردّ إلى
  // `/logout` كي يُمحى كوكيُّه، وإلّا دار بين الحارس وهذا السطر. انظر `SessionState`.
  const admin = await getCurrentAdmin();
  if (!admin) redirect((await awayIfNoSession()) ?? "/login");

  // بوّابة السجلّ — **قبل بابِ القدرات**: من لا سجلَّ تفاصيلَ له يُساق إلى إكماله أوّلًا، وأكثرُ
  // من ينقصه سجلٌّ عضوٌ عاديّ لا يبلغ ما بعد `isAdmin` أصلًا، فلو تأخّرت البوّابةُ سطرًا واحدًا
  // لَما رآها من هي له. وشرطُها صاحبُ **الجلسة** لا الهويّة المُعارة: من عاين ناقصًا لم يُحبَس بنقصه.
  // ومن ليس عضوًا أصلًا لا شأنَ له بالبابين: بيتُه `/me`. صار هذا لازمًا بعد توحيد الهويّة
  // (م١) إذ سكن `profiles` أصحابُ حساباتٍ لم ينضمّوا — فلولا هذا السطر لَسِيقوا إلى شاشة
  // إكمال سجلٍّ ليس لهم. والترتيبُ مقصود: «أعضوٌ هو؟» قبل «أسجلُّه تامّ؟».
  const session = await getSessionAdmin();
  /**
   * **وحاملُ المفاتيح ليس بابُه `/me` ولو لم يكن عضوًا** (٢٠٢٦-٠٩-٠٥): البوّابتان كانتا
   * تسألان عن العضويّة وحدَها، فحسابُ النادي «أَدِيب» — يملك مفاتيحَ النظام كلَّها ولا
   * عضويّةَ له ولا سجلَّ تفاصيل — يُساق إلى بيت الحساب ويُحرَم غرفَه.
   *
   * والتصحيحُ إعمالٌ للقانون لا استثناء: **التفويضُ قدرةٌ والعضويّةُ واقعة**، وخلطُهما هو
   * العطب. فمن لا مفتاحَ له يُساق إلى `/me` كما كان، ومن له مفتاحٌ يدخل غرفتَه ولو لم ينضمّ.
   * ولا يُمنَح بذلك مفتاحٌ جديد: `denyUnless` في كلّ غرفةٍ هو الحَكَم كما كان.
   */
  //
  // **ثمّ صارت البوّابةُ بابَ كلّ صاحب حساب** (٢٠٢٦-١٠-١٣): `use_portal` مفتاحٌ مشتقٌّ من المكانة
  // يحمله الجميع، فسقط التحويلُ إلى `/me` — صار `/me` نفسُه تحويلًا إلى هنا. ومن حُظر عليه
  // المفتاحُ صراحةً بقي يلقى شاشةَ الردّ أدناه كما كان.
  const sessionIsMember = session ? await isAdeebMember(session.id) : false;
  /**
   * **وبوّابةُ السجلّ على كلّ عضوٍ، مفتاحٌ أو لا** (٢٠٢٦-١٠-١١، نظام العضوية م٩): كان شرطُها
   * «لا مفتاحَ له»، و`view_own_membership` مفتاحٌ يحمله كلُّ صاحب مقعد — فلم تقع على عضوٍ له
   * مقعدٌ قطّ، ودخل أعضاءٌ بلا سجلٍّ لوحتَهم شهورًا. والسجلُّ واجبٌ لأنّ العمادة تطلب رقمَ الهويّة
   * وتاريخَ الميلاد (قرار المالك). فالمفتاحُ يُعفي من `/me` وحدَها، لا من السجلّ: حسابُ النادي
   * يمرّ لأنّه ليس عضوًا، لا لأنّه يحمل مفاتيح.
   */
  if (session && sessionIsMember && !(await hasMemberRecord(session.id))) redirect("/complete");

  // **ومن طلب أن يذهب لا يُترَك يعمل** (٢٠٢٦-٠٨-١٩): الحسابُ في مهلته مجمَّدٌ لا مقفَل —
  // فيُساق إلى `/me` حيث خبرُ الطلب وبابُ العدول، لا إلى غرفِ العمل. وشرطُه صاحبُ الجلسة
  // لا الهويّةَ المُعارة: من عاين طالبًا للحذف لم يُحبَس بطلبه. (وبقي `/me` لهذا وحدَه بعد
  // البوّابة: خارجَ اللوحة فلا يدور التحويلُ على نفسه، ولغيره تحويلٌ إلى `/dashboard`.)
  if (session?.deletionRequestedAt) redirect("/me");

  // شريط المعاينة — يسبق حتّى بابَ الردّ: لو عاينتَ عضوًا لا لوحةَ له، رأيتَ ردَّه **ومعه مخرجُك**.
  const bar = admin.viewAs ? <ViewAsBar targetName={admin.fullName} realName={admin.viewAs.realName} /> : null;
  if (!admin.isAdmin) return <>{bar}<AccessDenied name={admin.fullName} /></>;

  // حارس الهوية: كاشف العناصر الخام يعمل في اللوحة وقت التطوير فقط (مُطفأ في الإنتاج)
  const guardrail = process.env.NODE_ENV === "development";


  // **الإطارُ يتبع المفاتيح** (قرار المالك ٢٠٢٦-١٠-١١): من حمل مفتاحَ غرفة عمل رأى الشريطَ الجانبيّ،
  // ومن لم يحمل إلّا مفاتيحَ المكانة (صديقُ أدِيب والمتطوّع) رأى الإطارَ الخفيف — تبويباتٍ وشريطًا
  // سفليًّا. والغرفةُ تُكتب مرّةً واحدة: الصفحةُ هي هي في الإطارين، وهذا السطرُ وحده يختار.
  if (!usesSidebar(admin.caps)) {
    const standing = standingName(admin.caps.includes("view_own_volunteering") ? "volunteer" : "account", admin.gender);
    return (
      <ToastProvider>
        <PortalShell user={{ fullName: admin.fullName, avatar: admin.avatarUrl, gender: admin.gender }} caps={admin.caps} standing={standing}>
          {bar}
          {guardrail ? <div data-guardrail style={{ display: "contents" }}>{children}</div> : children}
        </PortalShell>
        <PwaIntro />
      </ToastProvider>
    );
  }

  // موقعُه من الهيكل — تبويبات الهويّة الثلاثة لا تُعرَض بالقفل وحده (`lib/myScope.ts`).
  // ويتبع الهويّةَ المعروضة لا صاحبَ الجلسة: من عاين منصبًا رأى تبويباته كما يراها صاحبُه.
  const scope = await getMyScope(admin.id);

  return (
    // اتّجاه RTL موروث من <html dir="rtl"> — لا حاجة لمزوّد اتجاه بعد إزالة Radix
    <ToastProvider>
      <DashboardShell
        user={{ fullName: admin.fullName, avatar: admin.avatarUrl, gender: admin.gender }}
        caps={admin.caps}
        scope={scope}
      >
        {bar}
        {guardrail ? <div data-guardrail style={{ display: "contents" }}>{children}</div> : children}
      </DashboardShell>
      {/* نافذةُ «أَدِيب على جوّالك»: تستقبل مرّةً من يدخل من جوّال، ثمّ لا تعود. */}
      <PwaIntro />
    </ToastProvider>
  );
}
