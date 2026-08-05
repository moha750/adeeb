import Link from "next/link";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { EmptyState } from "./_components/EmptyState";
// مدخلُ ssr خادميٌّ لا يقرأ سياقَ الأيقونات ولا يمرّ بقائمة المستثنَين (وهي عميليّة)،
// فيُمرَّر وزنُ العدسة — وهي أداةُ فعل — من مصدره الواحد صراحةً.
import { ICON_WEIGHT_EXCEPTION } from "@/lib/iconWeight";

/**
 * حدُّ «غير موجود» **داخل اللوحة** (معتمَدٌ من المالك ٢٠٢٦-٠٨-٠١ بعد معاينة الوجهين): يلتقط روابط اللوحة الخاطئة و`notFound()` المرميّة
 * من صفحاتها، فتُعرض داخل شِلّ اللوحة (القائمة الجانبيّة والرأس باقيان) بدل صفحة
 * الموقع العامّة بهيدرها وخلفيّتها. الشكل من حالة الفراغ المعتمَدة في اللوحة نفسها.
 */
export default function DashboardNotFound() {
  return (
    <div className="card-empty">
      <EmptyState
        variant="soft"
        icon={<MagnifyingGlass weight={ICON_WEIGHT_EXCEPTION} />}
        title="الصفحة غير موجودة"
        description="الرابط الذي جئت منه لعلّه تغيّر أو حُذِف أو أنّ الصفحة غير موجودة."
        action={<Link href="/dashboard" className="abtn abtn-ghost abtn-md">العودة إلى اللوحة</Link>}
      />
    </div>
  );
}
