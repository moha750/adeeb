import { denyUnless } from "@/app/dashboard/_shell/guard";
import { VisionRoom } from "@/app/_ad/rooms/VisionRoom";
import { AdRoomError } from "@/app/_ad/states";
import { VISION_ROOM } from "@/app/_ad/rooms/vision.meta";
import { roomView } from "@/app/_ad/view-server";
import { roomMetadata } from "@/app/_ad/metadata";
import { getVisionRoom } from "../data";

export const metadata = roomMetadata(VISION_ROOM);

/**
 * غرفةُ «متابعة الرؤية» (٢٠٢٦-١١-٠٣) — قفلُها `manage_vision` (قائدُ الضمان والجودة والرئيسان). المجموعةُ `(room)` تحصر
 * حالتَي التحميل والخطأ في الغرفة، على سَنن غرف القالب.
 */
export default async function VisionRoomPage() {
  const denied = await denyUnless("/dashboard/vision");
  if (denied) return denied;

  const { data, error } = await getVisionRoom();
  if (error) return <AdRoomError {...VISION_ROOM} message={error} />;
  if (!data) return <AdRoomError {...VISION_ROOM} message="لا رؤية منشورة بعد. تُكتب الرؤية وأهدافها حين يعتمدها المجلس الإداري." />;

  return <VisionRoom data={data} view={await roomView(VISION_ROOM.viewKey, VISION_ROOM.defaultView)} />;
}
