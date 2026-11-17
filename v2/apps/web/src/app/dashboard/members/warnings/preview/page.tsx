import { denyUnless } from "@/app/dashboard/_shell/guard";
import { WarningPreviewRoom } from "@/app/_ad/rooms/PaperPreviewRooms";

/**
 * معاينة خطاب الإنذار بالتصنيفات السبعة — صفحةٌ فرعيّة تحت غرفة الإنذارات، فتستعير قفلها
 * (`view_warnings`). ولا بيانات فيها من القاعدة: عيّنةٌ متخيَّلة تُرسَم في المتصفّح.
 */
export const metadata = { title: "نموذج الخطاب، بوّابة أدِيب" };

export default async function WarningLetterPreviewPage() {
  const denied = await denyUnless("/dashboard/members/warnings");
  if (denied) return denied;

  // على الهويّة الجديدة (٢٠٢٦-١١-١٤): المعرضُ — العيّناتُ في الجانب والمختارةُ ورقتُها كبيرة
  return <WarningPreviewRoom />;
}
