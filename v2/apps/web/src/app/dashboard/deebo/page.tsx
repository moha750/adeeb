import { Alert } from "@adeeb/design-system";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getDeeboLog } from "./data";
import { clubDayKey } from "@/lib/dates";
import { DeeboLogView } from "./DeeboLogView";
import { PageHeader } from "../_components/PageHeader";

/**
 * **ديبو** — غرفةُ المساعد في اللوحة. اليومَ سجلُّ محادثاته، وغدًا رعايةُ معرفته وشخصيّته
 * (ولذلك قدرتُها `manage_deebo` مستقلّةٌ لا `manage_faq` مستعارة).
 *
 * كانت جداولُ السجلّ قد نزلت إلى الإنتاج ٢٠٢٦-٠٨-١٩ ومعها القدرةُ، **ولا بابَ في اللوحة
 * يقرؤها** — كسابقة رسائل التواصل حرفًا بحرف: قاعدةٌ جاهزةٌ وبابٌ مفقود، فتبقى الأسئلةُ
 * في القاعدة بلا قارئ. هذا هو الباب.
 */
export const metadata = { title: "ديبو، بوّابة أديب" };

export default async function DeeboDashboardPage() {
  const denied = await denyUnless("/dashboard/deebo");
  if (denied) return denied;

  const { rows, error } = await getDeeboLog();

  if (error) {
    return (
      <>
        <PageHeader title="سجلّ محادثات ديبو" />
        <Alert tone="warning" title="تعذّر جلب السجلّ">{error}</Alert>
      </>
    );
  }

  // مفتاحُ اليوم من الخادم لا من المتصفّح: القسمةُ الزمنيّة تُحسب مرّةً بساعة النادي،
  // فيرسم الاثنان سواءً ولا يسقط الترطيبُ عند منتصف الليل (سابقةُ درج `/deebo`).
  return <DeeboLogView rows={rows} todayKey={clubDayKey(new Date().toISOString())} />;
}
