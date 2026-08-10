import { denyUnless } from "@/app/dashboard/_shell/guard";
import { QrToolView } from "./QrToolView";

/**
 * **مولّد الباركود** — أداةٌ لا غرفةَ بيانات: تكتب نصًّا أو رابطًا فتأخذ صورةً بهويّة أديب.
 * لا تقرأ من القاعدة ولا تكتب فيها، فالصفحة كلُّها عميليّة خلف حارسها.
 */
export const metadata = { title: "مولّد الباركود، بوّابة أديب" };

export default async function QrToolPage() {
  const denied = await denyUnless("/dashboard/tools/qr");
  if (denied) return denied;

  return <QrToolView />;
}
