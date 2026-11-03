import { getFaqs } from "../data";
import { getWebsiteManager } from "@/lib/website/authz";
import { WebsiteDenied } from "../../_guard";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { FaqRoom } from "@/app/_ad/rooms/FaqRoom";
import { AdRoomError } from "@/app/_ad/states";
import { FAQ_ROOM } from "@/app/_ad/rooms/faq.meta";
import { roomView } from "@/app/_ad/view-server";
import { roomMetadata } from "@/app/_ad/metadata";

export const metadata = roomMetadata(FAQ_ROOM);

/**
 * غرفةُ الأسئلة الشائعة على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠١). المجموعةُ `(room)` تحصر حالتَي التحميل والخطأ في
 * الغرفة وحدها: التحريرُ والإنشاءُ (`[id]/edit`، `new`) أشقّاؤها، فلا يريان هيكلَ القائمة وهما يُفتحان.
 */
export default async function FaqPage() {
  const denied = await denyUnless("/dashboard/website/faq");
  if (denied) return denied;

  if (!(await getWebsiteManager("faq"))) return <WebsiteDenied section="الأسئلة الشائعة" />;

  const { faqs, error } = await getFaqs();
  if (error) return <AdRoomError {...FAQ_ROOM} message={error} />;

  return <FaqRoom faqs={faqs} view={await roomView(FAQ_ROOM.viewKey, FAQ_ROOM.defaultView)} />;
}
