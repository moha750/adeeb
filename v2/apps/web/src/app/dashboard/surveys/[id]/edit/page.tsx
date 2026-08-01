import { notFound } from "next/navigation";
import { Alert } from "@adeeb/design-system";
import { getSurveyDetail } from "../../data";
import { BuilderView } from "../../BuilderView";
import { denyUnless } from "@/app/dashboard/_shell/guard";

export default async function EditSurveyPage({ params }: { params: Promise<{ id: string }> }) {
  const denied = await denyUnless("/dashboard/surveys");
  if (denied) return denied;

  const { id } = await params;
  const surveyId = Number(id);
  if (!Number.isInteger(surveyId) || surveyId <= 0) notFound();

  const { survey, error } = await getSurveyDetail(surveyId);
  if (error) {
    return (
      <>
        <div className="ash-phead">
          <div>
            <div className="ash-crumb">أديب › التفاعل › الاستبيانات › <b>تحرير</b></div>
            <h1>تحرير الاستبيان</h1>
          </div>
        </div>
        <Alert tone="warning" title="تعذّر جلب الاستبيان">{error}</Alert>
      </>
    );
  }
  if (!survey) notFound();

  return <BuilderView survey={survey} />;
}
