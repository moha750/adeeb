import { AdRoomLoading } from "@/app/_ad/states";
import { WARNINGS_ROOM } from "@/app/_ad/rooms/warnings.meta";

/** تحميلُ الغرفة: هيكلُها جدولٌ دائمًا — الغرفةُ المجمّعةُ قائمةٌ وحدها (قاعدةٌ أقرّها محمد ٢٠٢٦-١١-٠٢). */
export default function Loading() {
  return <AdRoomLoading {...WARNINGS_ROOM} view="table" />;
}
