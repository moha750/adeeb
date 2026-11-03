import { denyUnless } from "@/app/dashboard/_shell/guard";
import { clubDayKey } from "@/lib/dates";
import { listOpportunities } from "../data";
import { VolunteeringRoom } from "@/app/_ad/rooms/VolunteeringRoom";
import { VOLUNTEERING_ROOM } from "@/app/_ad/rooms/volunteering.meta";
import { roomView } from "@/app/_ad/view-server";
import { requestNow } from "@/app/_ad/now";
import { roomMetadata } from "@/app/_ad/metadata";

export const metadata = roomMetadata(VOLUNTEERING_ROOM);

/**
 * **غرفةُ التطوّع** — قفلُها `manage_volunteering` (الرئيسان وقائد الموارد).
 * والفرصةُ ليست فعاليّةً: تلك مفتوحةٌ للناس، وهذه عملٌ داخليٌّ لمن يطمح للعضويّة.
 *
 * على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠٢). المجموعةُ `(room)` تحصر حالتَي التحميل والخطأ في الغرفة وحدها: سجلُّ الفرصة
 * وتعديلُها وإنشاؤها والشهاداتُ والمتطوّعون (`[id]`، `new`، `certificates`، `volunteers`) أشقّاؤها، فلا ترى هيكلَ القائمة وهي تُفتح.
 * ولا خطأَ يعود من `listOpportunities` (يردّ قائمةً فارغة)، فلا `AdRoomError` هنا إلّا ما ينكسر أثناء الرسم (`error.tsx`).
 */
export default async function VolunteeringPage() {
  const denied = await denyUnless("/dashboard/volunteering");
  if (denied) return denied;

  const rows = await listOpportunities();
  // «اليوم» بساعة الرياض يُحسب هنا مرّةً ويُمرَّر: منه يُعرف أمضى موعدُ الفرصة أم لا، ولو حُسب في
  // المتصفّح لاختلف الخادمُ والمتصفّحُ ليلةَ منتصف الليل فتباين الترطيب
  const today = clubDayKey(new Date().toISOString());
  return <VolunteeringRoom rows={rows} today={today} serverNow={await requestNow()} view={await roomView(VOLUNTEERING_ROOM.viewKey, VOLUNTEERING_ROOM.defaultView)} />;
}
