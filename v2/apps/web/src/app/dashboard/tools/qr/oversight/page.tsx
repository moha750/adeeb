import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getQrOversight } from "./data";
import { OversightView } from "./OversightView";

export const metadata = { title: "إشراف الباركود، بوّابة أديب" };

/**
 * غرفةُ الإشراف. قفلُها `oversee_qr` — قدرةٌ يحملها دورُ «أَدِيب» وحدَه اليوم، ولا تُغني
 * عنها قدرةُ الأداة (`use_qr_generator`): من يصنع ملصقَه ليس من يُشرف على ملصقات الناس.
 */
export default async function QrOversightPage() {
  const denied = await denyUnless("/dashboard/tools/qr/oversight");
  if (denied) return denied;

  const data = await getQrOversight();
  return <OversightView data={data} />;
}
