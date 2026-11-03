import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getDeeboLog } from "../data";
import { DeeboLogRoom } from "@/app/_ad/rooms/DeeboLogRoom";
import { AdRoomError } from "@/app/_ad/states";
import { DEEBO_LOG_ROOM } from "@/app/_ad/rooms/deebo-log.meta";
import { requestNow } from "@/app/_ad/now";
import { roomView } from "@/app/_ad/view-server";
import { roomMetadata } from "@/app/_ad/metadata";

/**
 * **ديبو** — غرفةُ المساعد في اللوحة. اليومَ سجلُّ محادثاته، وغدًا رعايةُ معرفته وشخصيّته
 * (ولذلك قدرتُها `manage_deebo` مستقلّةٌ لا `manage_faq` مستعارة).
 *
 * كانت جداولُ السجلّ قد نزلت إلى الإنتاج ٢٠٢٦-٠٨-١٩ ومعها القدرةُ، **ولا بابَ في اللوحة
 * يقرؤها** — كسابقة رسائل التواصل حرفًا بحرف: قاعدةٌ جاهزةٌ وبابٌ مفقود، فتبقى الأسئلةُ
 * في القاعدة بلا قارئ. هذا هو الباب.
 *
 * على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠٢). المجموعةُ `(room)` تحصر حالتَي التحميل والخطأ في الغرفة وحدها:
 * صفحةُ المحادثة (`[id]`) والمعرفةُ والطبعُ أشقّاؤها، فلا ترى هيكلَ القائمة وهي تُفتح.
 */
export const metadata = roomMetadata(DEEBO_LOG_ROOM);

export default async function DeeboDashboardPage() {
  const denied = await denyUnless("/dashboard/deebo");
  if (denied) return denied;

  const { rows, error } = await getDeeboLog();
  if (error) return <AdRoomError {...DEEBO_LOG_ROOM} message={error} />;

  return <DeeboLogRoom rows={rows} serverNow={await requestNow()} view={await roomView(DEEBO_LOG_ROOM.viewKey, DEEBO_LOG_ROOM.defaultView)} />;
}
