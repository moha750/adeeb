import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getWarnings } from "../data";
import { WarningsRoom } from "@/app/_ad/rooms/WarningsRoom";
import { AdRoomError } from "@/app/_ad/states";
import { WARNINGS_ROOM } from "@/app/_ad/rooms/warnings.meta";
import { roomView } from "@/app/_ad/view-server";
import { requestNow } from "@/app/_ad/now";
import { roomMetadata } from "@/app/_ad/metadata";

/**
 * **الإنذارات** — سجلّ إدارة الموارد البشريّة، يطّلع عليه رئيس أدِيب والرئيس التنفيذي.
 *
 * قفلُ الباب `view_warnings` (في `lib/capabilities.ts`)، والفعلُ داخله قدرةٌ أخرى
 * (`manage_warnings`) — بابٌ واحد، والفرقُ بين مُصدِرٍ ومطّلعٍ **داخل** الغرفة لا عندها.
 * وترشيحُ الصفوف في القاعدة (`warnings_for_reader`) لا هنا: مفتاح الخدمة يتجاوز RLS.
 *
 * على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠٢). المجموعةُ `(room)` تحصر حالتَي التحميل والخطأ في الغرفة وحدها:
 * معاينةُ الخطاب (`preview`) شقيقُها، فلا ترى هيكلَ القائمة وهي تُفتح.
 */
export const metadata = roomMetadata(WARNINGS_ROOM);

export default async function WarningsPage() {
  const denied = await denyUnless("/dashboard/members/warnings");
  if (denied) return denied;

  const data = await getWarnings();
  if (data.error) return <AdRoomError {...WARNINGS_ROOM} message={data.error} />;

  return (
    <WarningsRoom
      rows={data.rows}
      targets={data.targets}
      limit={data.limit}
      mayIssue={data.mayIssue}
      serverNow={await requestNow()}
      view={await roomView(WARNINGS_ROOM.viewKey, WARNINGS_ROOM.defaultView)}
    />
  );
}
