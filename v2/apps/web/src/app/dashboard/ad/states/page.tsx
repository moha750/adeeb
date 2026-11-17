import { notFound } from "next/navigation";
import { AdRoomDenied, AdRoomError, AdRoomMissing } from "@/app/_ad/states";

/**
 * مختبر (لا يُرفع، ٢٠٢٦-١١-١٧): **حالاتُ الغرفة الثلاث** بنصوصها الحقيقيّة — `?s=missing` (الافتراض) و`?s=denied` و`?s=error`.
 * «لا صلاحية» لا يراها صاحبُ الصلاحيات كلِّها في غرفةٍ حقيقيّة، فتُرى هنا. والبلاغُ في «الخطأ» معاينةٌ لا يُرسَل.
 */
export const metadata = { title: "حالات الغرفة: المختبر" };

export default async function StatesLab({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  // مختبرٌ لا يُرفع، ويُقفل في الإنتاج احتياطًا (لاحظته محادثةُ الانتخابات ٢٠٢٦-١١-١٧: بلا قفل)
  if (process.env.NODE_ENV === "production") notFound();
  const { s } = await searchParams;
  if (s === "denied") {
    return <AdRoomDenied title="إذاعة أدِيب" navPath="/dashboard/radio" what="إدارة الإذاعة"
      desc="هذه الصفحة لمن مُنحت له قدرة «إدارة الإذاعة». إن رأيت أنّها ينبغي أن تكون لك، فراجع مسؤول الصلاحيات." />;
  }
  if (s === "error") {
    return <AdRoomError preview title="تحرير المنشور" navPath="/dashboard/library" what="المنشور" message="canceling statement due to statement timeout" />;
  }
  return <AdRoomMissing title="إعدادات الباركود" navPath="/dashboard/tools/qr" what="الباركود" desc="إمّا أنّه حُذف، وإمّا أنّه ليس من رموزك."
    back={{ label: "إلى باركوداتك", href: "/dashboard/tools/qr" }} />;
}
