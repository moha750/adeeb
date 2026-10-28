import { Alert } from "@adeeb/design-system";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { PageHeader } from "../_components/PageHeader";
import { getStatementsRoom } from "./data";
import { StatementsView } from "./StatementsView";

export const dynamic = "force-dynamic";

/**
 * **البيانات** (٢٠٢٦-١٠-٢٣، قرار محمد) — البياناتُ الرسميّة (تكليف، تعيين، تعميم…) على قالب أدِيب بدل
 * الفوتوشوب: عنوانٌ ومتنٌ وتوقيعٌ والختم، ومعاينةٌ حيّة، وتنزيلٌ PNG أو PDF، وسجلٌّ مرقّم يُعاد التنزيلُ منه.
 * للرئيسين وحدهما (`issue_statements`).
 */
export default async function StatementsPage() {
  const denied = await denyUnless("/dashboard/statements");
  if (denied) return denied;
  const { signers, statements, error } = await getStatementsRoom();
  return (
    <>
      <PageHeader title="البيانات" />
      {error ? <Alert tone="warning" title="تعذّر جلب البيانات">{error}</Alert> : <StatementsView signers={signers} statements={statements} />}
    </>
  );
}
