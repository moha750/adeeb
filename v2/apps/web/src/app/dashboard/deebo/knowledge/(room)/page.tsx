import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getFacts } from "../data";
import { DeeboKnowledgeRoom } from "@/app/_ad/rooms/DeeboKnowledgeRoom";
import { AdRoomError } from "@/app/_ad/states";
import { DEEBO_KNOWLEDGE_ROOM } from "@/app/_ad/rooms/deebo-knowledge.meta";
import { roomView } from "@/app/_ad/view-server";
import { requestNow } from "@/app/_ad/now";
import { roomMetadata } from "@/app/_ad/metadata";

/**
 * **معرفة ديبو** — الغرفةُ التي وعدت بها صفحةُ سجلّه («وغدًا رعايةُ معرفته وشخصيّته»).
 *
 * كانت هذه الوقائعُ الأربعُ محفورةً في `lib/deebo/knowledge.ts`، فتصحيحُ حرفٍ فيها
 * نشرٌ كامل. سأل المالك ٢٠٢٦-٠٨-٢٢ أن تصير العمليّةُ في الواجهة، فنزلت إلى جدول
 * `deebo_knowledge` وصار هذا بابَها. والشخصيّةُ بعدُ في `persona.ts` — بابُها ورقةُ
 * الهويّة، ولم تُنقَل بعد.
 *
 * وعلى قالب «قائمة السجلّات» (٢٠٢٦-١١-٠٢): المجموعةُ `(room)` تحصر حالتَي التحميل والخطأ في الغرفة وحدها،
 * فالتحريرُ والإنشاءُ (`[id]/edit`، `new`) أشقّاؤها ولا يريان هيكلَ القائمة وهما يُفتحان.
 */
export const metadata = roomMetadata(DEEBO_KNOWLEDGE_ROOM);

export default async function DeeboKnowledgePage() {
  const denied = await denyUnless("/dashboard/deebo/knowledge");
  if (denied) return denied;

  const { facts, error } = await getFacts();
  if (error) return <AdRoomError {...DEEBO_KNOWLEDGE_ROOM} message={error} />;

  return <DeeboKnowledgeRoom facts={facts} serverNow={await requestNow()} view={await roomView(DEEBO_KNOWLEDGE_ROOM.viewKey, DEEBO_KNOWLEDGE_ROOM.defaultView)} />;
}
