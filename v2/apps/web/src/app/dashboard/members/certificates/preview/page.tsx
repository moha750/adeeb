import { denyUnless } from "@/app/dashboard/_shell/guard";
import { CertificatePreviewRoom } from "@/app/_ad/rooms/PaperPreviewRooms";

/**
 * معاينة شهادة الخبرة — عيّنةٌ متخيَّلة تُرسَم في المتصفّح، لا بيانات فيها من القاعدة.
 * صفحةٌ فرعيّة تحت الغرفة فتستعير قفلها (`manage_certificates`).
 */
export const metadata = { title: "نموذج شهادة الخبرة، بوّابة أدِيب" };

export default async function CertificatePreviewPage() {
  const denied = await denyUnless("/dashboard/members/certificates");
  if (denied) return denied;

  // على الهويّة الجديدة (٢٠٢٦-١١-١٤): المعرضُ — العيّناتُ في الجانب والمختارةُ ورقتُها كبيرة
  return <CertificatePreviewRoom />;
}
