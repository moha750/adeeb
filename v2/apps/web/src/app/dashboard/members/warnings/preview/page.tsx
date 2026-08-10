import { denyUnless } from "@/app/dashboard/_shell/guard";
import { PreviewView } from "./PreviewView";

/**
 * معاينة خطاب الإنذار بالتصنيفات السبعة — صفحةٌ فرعيّة تحت غرفة الإنذارات، فتستعير قفلها
 * (`view_warnings`). ولا بيانات فيها من القاعدة: عيّنةٌ متخيَّلة تُرسَم في المتصفّح.
 */
export const metadata = { title: "معاينة الخطاب، بوّابة أديب" };

export default async function WarningLetterPreviewPage() {
  const denied = await denyUnless("/dashboard/members/warnings");
  if (denied) return denied;

  return <PreviewView />;
}
