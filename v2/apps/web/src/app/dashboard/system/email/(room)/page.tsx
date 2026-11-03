import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getMailLog } from "../data";
import { EmailLogRoom } from "@/app/_ad/rooms/EmailLogRoom";
import { AdRoomError } from "@/app/_ad/states";
import { EMAIL_LOG_ROOM } from "@/app/_ad/rooms/email-log.meta";
import { requestNow } from "@/app/_ad/now";
import { roomView } from "@/app/_ad/view-server";
import { roomMetadata } from "@/app/_ad/metadata";

/**
 * **سجلُّ البريد** — غرفةُ الصادر في اللوحة (٢٠٢٦-١٠-١٨)، المرحلةُ الثامنة من `v2/EMAIL-SYSTEM.md`.
 *
 * قفلُها `manage_website`: أهلُه هم من يصلهم إنذارُ تعطّل البريد (`system.email_down`)، والإنذارُ يفتح
 * هذه الغرفة. فمن نُبّه رأى، ومن رأى أصلح.
 *
 * على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠٢). المجموعةُ `(room)` تحصر حالتَي التحميل والخطأ في الغرفة وحدها:
 * صفحةُ الرسالة (`[id]`) شقيقتُها، فلا ترى هيكلَ القائمة وهي تُفتح.
 */
export const metadata = roomMetadata(EMAIL_LOG_ROOM);
// السجلُّ حيٌّ: رسالةٌ خرجت قبل ثانيةٍ تُرى الآن، لا بعد إعادة بناء.
export const dynamic = "force-dynamic";

export default async function EmailLogPage() {
  const denied = await denyUnless("/dashboard/system/email");
  if (denied) return denied;

  const { rows, health, error } = await getMailLog();
  if (error) return <AdRoomError {...EMAIL_LOG_ROOM} message={error} />;

  return <EmailLogRoom rows={rows} health={health} serverNow={await requestNow()} view={await roomView(EMAIL_LOG_ROOM.viewKey, EMAIL_LOG_ROOM.defaultView)} />;
}
