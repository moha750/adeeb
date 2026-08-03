import { denyUnless } from "@/app/dashboard/_shell/guard";
import { PreviewView } from "./PreviewView";

/**
 * معاينة شهادة الخبرة — عيّنةٌ متخيَّلة تُرسَم في المتصفّح، لا بيانات فيها من القاعدة.
 * صفحةٌ فرعيّة تحت الغرفة فتستعير قفلها (`manage_certificates`).
 */
export const metadata = { title: "معاينة شهادة الخبرة — بوّابة أديب" };

export default async function CertificatePreviewPage() {
  const denied = await denyUnless("/dashboard/members/certificates");
  if (denied) return denied;

  return <PreviewView />;
}
