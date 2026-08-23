import { Alert } from "@adeeb/design-system";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getFacts } from "./data";
import { KnowledgeView } from "./KnowledgeView";
import { PageHeader } from "../../_components/PageHeader";

/**
 * **معرفة ديبو** — الغرفةُ التي وعدت بها صفحةُ سجلّه («وغدًا رعايةُ معرفته وشخصيّته»).
 *
 * كانت هذه الوقائعُ الأربعُ محفورةً في `lib/deebo/knowledge.ts`، فتصحيحُ حرفٍ فيها
 * نشرٌ كامل. سأل المالك ٢٠٢٦-٠٨-٢٢ أن تصير العمليّةُ في الواجهة، فنزلت إلى جدول
 * `deebo_knowledge` وصار هذا بابَها. والشخصيّةُ بعدُ في `persona.ts` — بابُها ورقةُ
 * الهويّة، ولم تُنقَل بعد.
 */
export const metadata = { title: "معرفة ديبو" };

export default async function DeeboKnowledgePage() {
  const denied = await denyUnless("/dashboard/deebo/knowledge");
  if (denied) return denied;

  const { facts, error } = await getFacts();

  if (error) {
    return (
      <>
        <PageHeader title="معرفة ديبو" />
        <Alert tone="warning" title="تعذّر جلب الوقائع">{error}</Alert>
      </>
    );
  }

  return <KnowledgeView facts={facts} />;
}
