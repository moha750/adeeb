import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardShell } from "./_shell/DashboardShell";
import { AccessDenied } from "./_shell/AccessDenied";
import { ViewAsBar } from "./_shell/ViewAsBar";
import { ToastProvider } from "./_components/ToastProvider";
import { getCurrentAdmin, getSessionAdmin } from "@/lib/auth";
import { hasMemberRecord, isAdeebMember } from "@/lib/memberRecord";
import { getMyScope } from "@/lib/myScope";

export const metadata: Metadata = {
  title: "بوّابة أديب",
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login"); // احتياط — الـmiddleware يحرس أصلًا

  // بوّابة السجلّ — **قبل بابِ القدرات**: من لا سجلَّ تفاصيلَ له يُساق إلى إكماله أوّلًا، وأكثرُ
  // من ينقصه سجلٌّ عضوٌ عاديّ لا يبلغ ما بعد `isAdmin` أصلًا، فلو تأخّرت البوّابةُ سطرًا واحدًا
  // لَما رآها من هي له. وشرطُها صاحبُ **الجلسة** لا الهويّة المُعارة: من عاين ناقصًا لم يُحبَس بنقصه.
  // ومن ليس عضوًا أصلًا لا شأنَ له بالبابين: بيتُه `/me`. صار هذا لازمًا بعد توحيد الهويّة
  // (م١) إذ سكن `profiles` أصحابُ حساباتٍ لم ينضمّوا — فلولا هذا السطر لَسِيقوا إلى شاشة
  // إكمال سجلٍّ ليس لهم. والترتيبُ مقصود: «أعضوٌ هو؟» قبل «أسجلُّه تامّ؟».
  const session = await getSessionAdmin();
  if (session && !(await isAdeebMember(session.id))) redirect("/me");
  if (session && !(await hasMemberRecord(session.id))) redirect("/complete");

  // شريط المعاينة — يسبق حتّى بابَ الردّ: لو عاينتَ عضوًا لا لوحةَ له، رأيتَ ردَّه **ومعه مخرجُك**.
  const bar = admin.viewAs ? <ViewAsBar targetName={admin.fullName} realName={admin.viewAs.realName} /> : null;
  if (!admin.isAdmin) return <>{bar}<AccessDenied name={admin.fullName} /></>;

  // حارس الهوية: كاشف العناصر الخام يعمل في اللوحة وقت التطوير فقط (مُطفأ في الإنتاج)
  const guardrail = process.env.NODE_ENV === "development";

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
    </ToastProvider>
  );
}
