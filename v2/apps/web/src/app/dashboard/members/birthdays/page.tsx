import { getBirthdays } from "./data";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getCurrentAdmin } from "@/lib/auth";
import { getSupervisedUserIds } from "@/lib/mySupervision";
import { BirthdaysRoom } from "@/app/_ad/rooms/BirthdaysRoom";
import { AdRoomError } from "@/app/_ad/states";
import { BIRTHDAYS_ROOM } from "@/app/_ad/rooms/birthdays.meta";
import { roomView } from "@/app/_ad/view-server";
import { requestNow } from "@/app/_ad/now";
import { roomMetadata } from "@/app/_ad/metadata";

export const metadata = roomMetadata(BIRTHDAYS_ROOM);

/**
 * **القفل يفتح، والسجلّ يقسم.** `view_birthdays` تفتح الباب لأربعة، ووراءه نطاقان لا واحد:
 * من يملك `view_members` يرى السجلّ كلّه — فمواليدُه كلُّها؛ ومن لا يملكه (عضو إدارة الموارد)
 * يرى **من يشرف عليهم** وحدهم، كغرفته الأخرى «من أشرف عليهم».
 *
 * والقسمة بقدرةٍ لا باسم دور: التبويب لا يوسّع رؤية الأعيان وراء ما يعطيه سجلّ الأعضاء نفسه،
 * فأيّ دورٍ يُمنح `view_birthdays` غدًا يقع في نطاقه الصحيح بلا سطرٍ يُضاف هنا.
 *
 * على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠٢). ولا مساراتٍ أبناءَ للمجلّد، فحالتا التحميل والخطأ بجانب الصفحة.
 */
export default async function BirthdaysPage() {
  const denied = await denyUnless("/dashboard/members/birthdays");
  if (denied) return denied;

  const me = await getCurrentAdmin();
  if (!me) return denied;

  // مَن يرى السجلّ كلّه لا يُقسَم عليه شيء؛ ومن لا يراه فنطاقه إشرافُه (وقد يكون فارغًا).
  const seesAll = me.caps.includes("view_members");
  const reach = seesAll ? null : await getSupervisedUserIds(me.id);

  const { rows, error } = reach?.error ? { rows: [], error: reach.error } : await getBirthdays(reach?.ids ?? null);
  if (error) return <AdRoomError {...BIRTHDAYS_ROOM} message={error} />;
  // «اليوم» يُحسب في الخادم بتوقيت الرياض (جمهور النادي) — لا في العميل: فيتّفق رسمُ الخادم وأوّلُ
  // رسمِ العميل على تاريخٍ واحد (لا عدمُ تطابقٍ عند الإماهة)، ويكون العدّ التنازليّ صحيحًا للجمهور.
  // en-CA يعطي yyyy-mm-dd. الصفحة ديناميّة (اللوحة محروسة بالكوكيز) فيُحسب لكلّ طلب.
  const todayIso = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  return (
    <BirthdaysRoom
      members={rows}
      todayIso={todayIso}
      scope={seesAll ? "all" : "supervised"}
      serverNow={await requestNow()}
      view={await roomView(BIRTHDAYS_ROOM.viewKey, BIRTHDAYS_ROOM.defaultView)}
    />
  );
}
