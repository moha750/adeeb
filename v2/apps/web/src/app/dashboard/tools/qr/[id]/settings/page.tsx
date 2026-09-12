import { redirect } from "next/navigation";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getSessionAdmin } from "@/lib/auth";
import { getQrAccess, getQrLink, getQrSchedules, getQrShares } from "../../data";
import { getQrShareCandidates } from "../../shares";
import { QrSettingsView } from "../../QrSettingsView";

export const metadata = { title: "إعدادات الباركود، بوّابة أديب" };

/**
 * **بابُ إدارة باركودٍ واحد**: وجهتُه وتصميمُه وحالُه وجدولُه وحذفُه.
 *
 * القفلُ قفلُ الغرفة، والمِلكيّةُ تحكمها سياسةُ own-row: من طلب باركودَ غيرِه لم يُردَّ بمنعٍ
 * يكشف وجودَه، بل بصفحةٍ تقول «لم يُعثر عليه». ولا يُقرأ هنا سجلُّ المسحات: الإدارةُ لا
 * تحتاج أرقامًا، وجلبُها لرسم كرتٍ عملٌ يُدفَع ثمنُه بلا مقابل.
 */
export default async function QrSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ share?: string }>;
}) {
  const denied = await denyUnless("/dashboard/tools/qr");
  if (denied) return denied;

  const { id } = await params;
  const { share } = await searchParams;
  const [link, schedules, shares, candidates, me, access] = await Promise.all([
    getQrLink(id),
    getQrSchedules(id),
    getQrShares(id),
    getQrShareCandidates(),
    getSessionAdmin(),
    getQrAccess(id),
  ]);

  // **الشريكُ القارئُ لا بابَ إعداداتٍ له** (المالك ٢٠٢٦-٠٩-٠٦): أُعطي القراءةَ فوجد
  // الإعداداتِ مفتوحةً — والقاعدةُ تردّ كتابتَه، لكنّ بابًا يُعرَض ثمّ يُغلق وعدٌ لا يُوفى.
  // فيُردّ إلى ما أُعطيه: صفحةُ الإحصاء.
  if (link.link && access === "read") redirect(`/dashboard/tools/qr/${id}`);

  return (
    <QrSettingsView
      link={link.link}
      schedules={schedules.rows}
      shares={shares.rows}
      candidates={candidates}
      // **المشاركةُ للمالك وحدَه**: الشريكُ يقرأ القائمةَ ولا يوسّعها، والقاعدةُ تردّه
      // لو نبت له زرٌّ (سياسةُ الكتابة تشترط المِلكيّة).
      canManage={!!me && !!link.link && link.link.ownerId === me.id}
      openShare={share === "1"}
    />
  );
}
