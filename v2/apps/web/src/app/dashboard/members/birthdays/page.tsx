import { Alert } from "@adeeb/design-system";
import { getBirthdays } from "./data";
import { BirthdaysView } from "./BirthdaysView";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getCurrentAdmin } from "@/lib/auth";
import { getSupervisedUserIds } from "@/lib/mySupervision";
import { Breadcrumb } from "../../_shell/Breadcrumb";

const Head = () => (
  <div className="ash-phead">
    <div>
      <Breadcrumb />
      <h1>أعياد الميلاد</h1>
    </div>
  </div>
);

/**
 * **القفل يفتح، والسجلّ يقسم.** `view_birthdays` تفتح الباب لأربعة، ووراءه نطاقان لا واحد:
 * من يملك `view_members` يرى السجلّ كلّه — فمواليدُه كلُّها؛ ومن لا يملكه (عضو إدارة الموارد)
 * يرى **من يشرف عليهم** وحدهم، كغرفته الأخرى «من أشرف عليهم».
 *
 * والقسمة بقدرةٍ لا باسم دور: التبويب لا يوسّع رؤية الأعيان وراء ما يعطيه سجلّ الأعضاء نفسه،
 * فأيّ دورٍ يُمنح `view_birthdays` غدًا يقع في نطاقه الصحيح بلا سطرٍ يُضاف هنا.
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
  if (error) {
    return (
      <>
        <Head />
        <Alert tone="warning" title="تعذّر جلب المواليد">{error}</Alert>
      </>
    );
  }
  // «اليوم» يُحسب في الخادم بتوقيت الرياض (جمهور النادي) — لا في العميل: فيتّفق رسمُ الخادم وأوّلُ
  // رسمِ العميل على تاريخٍ واحد (لا عدمُ تطابقٍ عند الإماهة)، ويكون العدّ التنازليّ صحيحًا للجمهور.
  // en-CA يعطي yyyy-mm-dd. الصفحة ديناميّة (اللوحة محروسة بالكوكيز) فيُحسب لكلّ طلب.
  const todayIso = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  return <BirthdaysView members={rows} todayIso={todayIso} scope={seesAll ? "all" : "supervised"} />;
}
