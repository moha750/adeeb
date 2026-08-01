import { Alert } from "@adeeb/design-system";
import { getBirthdays } from "./data";
import { BirthdaysView } from "./BirthdaysView";
import { denyUnless } from "@/app/dashboard/_shell/guard";

const Head = () => (
  <div className="ash-phead">
    <div>
      <div className="ash-crumb">أديب › أعضاء أديب › <b>أعياد الميلاد</b></div>
      <h1>أعياد الميلاد</h1>
    </div>
  </div>
);

export default async function BirthdaysPage() {
  const denied = await denyUnless("/dashboard/members/birthdays");
  if (denied) return denied;

  const { rows, error } = await getBirthdays();
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
  return <BirthdaysView members={rows} todayIso={todayIso} />;
}
