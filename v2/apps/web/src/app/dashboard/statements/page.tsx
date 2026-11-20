import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getStatementsRoom } from "./data";
import { StatementsRoom } from "@/app/_ad/rooms/StatementsRoom";
import { requestNow } from "@/app/_ad/now";

// عنوانُ التبويب اسمُ الغرفة (محمد ٢٠٢٦-١١-٠٣)، وكانت «بوّابة أدِيب» وحدها (٢٠٢٦-١١-٢٠)
export const metadata = { title: "البيانات الصادرة، بوّابة أدِيب" };

export const dynamic = "force-dynamic";

/**
 * **البيانات** (٢٠٢٦-١٠-٢٣، قرار محمد) — البياناتُ الرسميّة (تكليف، تعيين، تعميم…) على قالب أدِيب بدل
 * الفوتوشوب: عنوانٌ ومتنٌ وتوقيعٌ والختم، ومعاينةٌ حيّة، وتنزيلٌ PNG أو PDF، وسجلٌّ مرقّم يُعاد التنزيلُ منه.
 * للرئيسين وحدهما (`issue_statements`).
 */
export default async function StatementsPage() {
  const denied = await denyUnless("/dashboard/statements");
  if (denied) return denied;
  const [{ signers, statements, error }, now] = await Promise.all([getStatementsRoom(), requestNow()]);
  // على قالب «مساحة العمل» منذ ٢٠٢٦-١١-١٣ (`_ad/rooms/StatementsRoom`)؛ والقديمُ (`./StatementsView`) يقرؤه المختبرُ للمقارنة.
  // وخطأُ الجلب تنبيهٌ فوق المحرّر، والإصدارُ موقوفٌ معه (الموقّعان من الجلب نفسِه)
  return <StatementsRoom signers={signers} statements={statements} error={error ? `تعذّر جلب البيانات: ${error}` : null} now={now} />;
}
