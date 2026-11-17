import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getExitRequests } from "./data";
import { ExitsRoom } from "@/app/_ad/rooms/ExitsRoom";
import { AdRoomError } from "@/app/_ad/states";
import { EXITS_ROOM } from "@/app/_ad/rooms/exits.meta";
import { roomView } from "@/app/_ad/view-server";
import { requestNow } from "@/app/_ad/now";
import { roomMetadata } from "@/app/_ad/metadata";

/**
 * **طلبات الخروج** — من يحمل منصبًا قياديًّا ويريد إنهاء عضويّته يطلب، ويُقضى في طلبه هنا. على قالب «قائمة السجلّات»
 * (٢٠٢٦-١١-٠٤)، والحارسُ والجلبُ كما كانا حرفًا.
 *
 * قفلُ الباب `decide_membership_exits` (٢٠٢٦-١١-٠٤؛ كان `view_members`)، **والمدى في القاعدة**: القاضون ثلاثةٌ
 * (رئيسُ أدِيب، والرئيسُ التنفيذيّ، وقائدُ إدارة الموارد) تسمّيهم
 * `can_decide_membership_exit`، وسياسةُ الجدول تحبس غيرَهم في طلباتهم هم. فمن دخل بمفتاح
 * الغرفة ولم يكن منهم رأى غرفةً فارغةً لا زرًّا معطَّلًا: هذا هو نمطُ المستودع، القفلُ
 * للغرفة والقاعدةُ تحسم من يفعل ماذا فيها. والشاشةُ القديمة (`ExitsView`) باقيةٌ بلا استعمال.
 */
export const metadata = roomMetadata(EXITS_ROOM);

export default async function ExitsPage() {
  const denied = await denyUnless("/dashboard/members/exits");
  if (denied) return denied;

  const data = await getExitRequests();
  if (data.error) return <AdRoomError {...EXITS_ROOM} message={data.error} />;

  return <ExitsRoom data={data} serverNow={await requestNow()} view={await roomView(EXITS_ROOM.viewKey, EXITS_ROOM.defaultView)} />;
}
