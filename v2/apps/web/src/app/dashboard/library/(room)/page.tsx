import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getLibraryManager } from "@/lib/library/authz";
import { getBooks } from "../data";
import { LibraryDenied } from "../_guard";
import { LibraryRoom } from "@/app/_ad/rooms/LibraryRoom";
import { AdRoomError } from "@/app/_ad/states";
import { LIBRARY_ROOM } from "@/app/_ad/rooms/library.meta";
import { roomView } from "@/app/_ad/view-server";
import { requestNow } from "@/app/_ad/now";
import { roomMetadata } from "@/app/_ad/metadata";

export const metadata = roomMetadata(LIBRARY_ROOM);

/**
 * مكتبةُ «إرثٌ يُروى» على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠١). المجموعةُ `(room)` تحصر حالتَي التحميل والخطأ في
 * الغرفة وحدها: محرّرُ الصفحات (`[id]`) شقيقُها، فلا يرى هيكلَ القائمة وهو يُفتح.
 */
export default async function LibraryPage() {
  const denied = await denyUnless("/dashboard/library");
  if (denied) return denied;

  if (!(await getLibraryManager())) return <LibraryDenied />;

  const { books, error } = await getBooks();
  if (error) return <AdRoomError {...LIBRARY_ROOM} message={error} />;

  return <LibraryRoom books={books} serverNow={await requestNow()} view={await roomView(LIBRARY_ROOM.viewKey, LIBRARY_ROOM.defaultView)} />;
}
