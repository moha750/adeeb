// معرِضُ مكوّنات اللوحة — **بابٌ له قفلُه كسائر الغرف**.
//
// كان هذا الملفُّ نفسُه `"use client"` بلا `denyUnless`، فبقي القفلُ المعلَن في
// `SECTION_CAP` (`manage_permissions`) حبرًا لا يُفرَض: كلُّ من عبر بوّابةَ اللوحة
// (وتكفيه قدرةٌ واحدةٌ أيًّا كانت، حتّى `view_own_membership`) كان يفتحه. كشفه اختبارُ
// الأقفال في ٢٠٢٦-٠٨-١٦ حين قابل ما في `SECTION_CAP` بما تفرضه الصفحاتُ فعلًا.
//
// والعلاجُ بنيةُ الغرف نفسُها: صفحةٌ خادميّةٌ تحرس، وجسدٌ عميليٌّ يُعرَض بعدها.
// وإخفاءُ بندٍ من القائمة ليس حراسةً — `denyUnless` هي.
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { ComponentsGallery } from "./ComponentsGallery";

export default async function ComponentsPage() {
  const denied = await denyUnless("/dashboard/components");
  if (denied) return denied;

  return <ComponentsGallery />;
}
