import { denyUnless } from "../../_shell/guard";
import { getIrfanOversight } from "./data";
import { IrfanOversightRoom } from "@/app/_ad/rooms/IrfanOversightRoom";
import { AdRoomError } from "@/app/_ad/states";
import { IRFAN_OVERSIGHT_ROOM } from "@/app/_ad/rooms/irfan-oversight.meta";
import { roomView } from "@/app/_ad/view-server";
import { requestNow } from "@/app/_ad/now";
import { roomMetadata } from "@/app/_ad/metadata";

export const metadata = roomMetadata(IRFAN_OVERSIGHT_ROOM);

/**
 * **إشرافُ عِرفان** — لحساب أدِيب المؤسسيّ وحده (`oversee_irfan`، وجهُ «المرآة»). رسائلُ الموسم كلُّها بنصوصها (وأرقامُه إلى صفحة الإحصاء). والحارسُ هنا قبل
 * القراءة: `getIrfanOversight` يقرأ بمفتاح الخدمة، فلا يُنادى إلّا بعد أن يُفتح البابُ لصاحبه.
 * على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠٢)، ولا مساراتٍ أبناءَ للمجلّد، فحالتا التحميل والخطأ بجانب الصفحة.
 */
export default async function IrfanOversightPage() {
  const denied = await denyUnless("/dashboard/irfan/oversight");
  if (denied) return denied;
  const data = await getIrfanOversight();
  if (data.error) return <AdRoomError {...IRFAN_OVERSIGHT_ROOM} message={data.error} />;

  return <IrfanOversightRoom rows={data.rows} serverNow={await requestNow()} view={await roomView(IRFAN_OVERSIGHT_ROOM.viewKey, IRFAN_OVERSIGHT_ROOM.defaultView)} />;
}
