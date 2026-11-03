import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getContactMessages } from "./data";
import { ContactRoom } from "@/app/_ad/rooms/ContactRoom";
import { AdRoomError } from "@/app/_ad/states";
import { CONTACT_ROOM } from "@/app/_ad/rooms/contact.meta";
import { roomView } from "@/app/_ad/view-server";
import { requestNow } from "@/app/_ad/now";
import { roomMetadata } from "@/app/_ad/metadata";

/**
 * **رسائل التواصل** — الطرفُ الآخر من قسم «تواصل معنا» في الصفحة الرئيسيّة، على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠١).
 * قفلُ الباب `manage_contact` (في `lib/capabilities.ts`)، والصفوف كلُّها تُقرأ بمفتاح
 * الخدمة — فالتفويض عند الباب لا في الاستعلام. ولا مساراتٍ أبناءَ للمجلّد، فحالتا التحميل والخطأ بجانب الصفحة.
 */
export const metadata = roomMetadata(CONTACT_ROOM);

export default async function ContactPage() {
  const denied = await denyUnless("/dashboard/contact");
  if (denied) return denied;

  const { rows, error } = await getContactMessages();
  if (error) return <AdRoomError {...CONTACT_ROOM} message={error} />;

  return <ContactRoom rows={rows} serverNow={await requestNow()} view={await roomView(CONTACT_ROOM.viewKey, CONTACT_ROOM.defaultView)} />;
}
