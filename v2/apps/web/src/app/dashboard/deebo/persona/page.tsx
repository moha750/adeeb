import { Alert } from "@adeeb/design-system";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getPersona, getPersonaHistory } from "./data";
import { PersonaView } from "./PersonaView";
import { PageHeader } from "../../_components/PageHeader";

/**
 * **طبعُ ديبو** — تتمّةُ غرفة معرفته: تلك تقول ما يعرف، وهذه تقول من هو.
 *
 * كان طبعُه نصًّا في `lib/deebo/persona.ts` يُنقَل إليه من ورقة `ديبو-الهويّة.md` بيدي،
 * فسأل المالك ٢٠٢٦-٠٨-٢٢: «هل تغنيني الواجهةُ عن تدريبه بالمحادثة معك؟» — فصارت الورقةُ
 * هذه الشاشة، وصار الملفُّ سقالةً لا طبعًا (ترحيل `deebo_08`).
 */
export const metadata = { title: "طبع ديبو" };

export default async function DeeboPersonaPage() {
  const denied = await denyUnless("/dashboard/deebo/persona");
  if (denied) return denied;

  const [{ persona, error }, history] = await Promise.all([getPersona(), getPersonaHistory()]);

  if (error || !persona) {
    return (
      <>
        <PageHeader title="طبع ديبو" />
        <Alert tone="warning" title="تعذّر جلب طبع ديبو">{error}</Alert>
      </>
    );
  }

  return <PersonaView persona={persona} history={history.versions} historyReady={history.ready} />;
}
