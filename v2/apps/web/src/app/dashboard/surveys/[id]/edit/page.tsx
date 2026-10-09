import { notFound, redirect } from "next/navigation";
import { Alert } from "@adeeb/design-system";
import { getSurveyDetail } from "../../data";
import { BuilderView } from "../../BuilderView";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { authorizeSurvey } from "@/lib/surveys/authz";
import { canEditSurvey } from "../../vocab";
import { PageHeader } from "../../../_components/PageHeader";

export default async function EditSurveyPage({ params }: { params: Promise<{ id: string }> }) {
  const denied = await denyUnless("/dashboard/surveys");
  if (denied) return denied;

  const { id } = await params;
  const surveyId = Number(id);
  if (!Number.isInteger(surveyId) || surveyId <= 0) notFound();

  // من لا دور له: «لا وجود» (لا يُكشف أنّ لغيره استبيانًا بهذا الرقم).
  // والشريكُ القارئ: إلى نتائجه، فهي ما أُذن له فيه.
  const grant = await authorizeSurvey(surveyId, "edit");
  if (!grant.ok) {
    if (grant.found) redirect(`/dashboard/surveys/${surveyId}/results`);
    notFound();
  }

  const { survey, error } = await getSurveyDetail(surveyId);
  if (error) {
    return (
      <>
        <PageHeader title="تحرير الاستبيان" crumbLeaf="تحرير" />
        <Alert tone="warning" title="تعذّر جلب الاستبيان">{error}</Alert>
      </>
    );
  }
  if (!survey) notFound();
  // والشريكُ المحرِّر أمام استبيانٍ ركنه صاحبُه: إلى نتائجه، فالتحريرُ هنا لمن يملك الإعادة
  if (!canEditSurvey(grant.role, survey)) redirect(`/dashboard/surveys/${surveyId}/results`);

  // (المشاركةُ ليست هنا: نافذةٌ فوق القائمة، فمن يشارك لا يمرّ ببنّاء الأسئلة.)
  return <BuilderView survey={survey} />;
}
