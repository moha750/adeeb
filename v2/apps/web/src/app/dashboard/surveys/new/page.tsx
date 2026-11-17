import { denyUnless } from "@/app/dashboard/_shell/guard";
import { SurveyBuilderRoom } from "@/app/_ad/rooms/SurveyBuilderRoom";

/** «استبيان جديد» على قالب مساحة العمل («المنضدة»، ٢٠٢٦-١١-١٢) — كان `BuilderView` (باقٍ حتى يقرّر محمد حذفه) */
export const metadata = { title: "استبيان جديد، بوّابة أدِيب" };

export default async function NewSurveyPage() {
  const denied = await denyUnless("/dashboard/surveys");
  if (denied) return denied;

  return <SurveyBuilderRoom survey={null} look="b" />;
}
