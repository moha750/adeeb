import { Alert } from "@adeeb/design-system";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { clubDayKey } from "@/lib/dates";
import { PageHeader } from "../../_components/PageHeader";
import { getMailLog } from "./data";
import { EmailLogView } from "./EmailLogView";

/**
 * **سجلُّ البريد** — غرفةُ الصادر في اللوحة (٢٠٢٦-١٠-١٨)، المرحلةُ الثامنة من `v2/EMAIL-SYSTEM.md`.
 *
 * قفلُها `manage_website`: أهلُه هم من يصلهم إنذارُ تعطّل البريد (`system.email_down`)، والإنذارُ يفتح
 * هذه الغرفة. فمن نُبّه رأى، ومن رأى أصلح.
 */
export const metadata = { title: "سجلّ البريد، بوّابة أدِيب" };
// السجلُّ حيٌّ: رسالةٌ خرجت قبل ثانيةٍ تُرى الآن، لا بعد إعادة بناء.
export const dynamic = "force-dynamic";

export default async function EmailLogPage() {
  const denied = await denyUnless("/dashboard/system/email");
  if (denied) return denied;

  const { rows, health, error } = await getMailLog();
  if (error) {
    return (
      <>
        <PageHeader title="سجلّ البريد" />
        <Alert tone="warning" title="تعذّر جلب السجلّ">{error}</Alert>
      </>
    );
  }
  // مفتاحُ اليوم من الخادم: قسمةُ الأيّام تُحسب مرّةً بساعة النادي، فلا يسقط الترطيبُ عند منتصف الليل.
  return <EmailLogView rows={rows} health={health} todayKey={clubDayKey(new Date().toISOString())} />;
}
