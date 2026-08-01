import { notFound } from "next/navigation";
import { Alert } from "@adeeb/design-system";
import { getSurveyAggregates } from "@/lib/surveys/aggregate";
import { getSurveyResponses } from "../../results-data";
import { ResultsView } from "../../ResultsView";
import { denyUnless } from "@/app/dashboard/_shell/guard";

export default async function SurveyResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const denied = await denyUnless("/dashboard/surveys");
  if (denied) return denied;

  const { id } = await params;
  const surveyId = Number(id);
  if (!Number.isInteger(surveyId) || surveyId <= 0) notFound();

  const [aggRes, respRes] = await Promise.all([
    getSurveyAggregates(surveyId, { includeText: true }), // اللوحة (المدير) ترى النصوص الحرّة؛ العلنيّ لا
    getSurveyResponses(surveyId),
  ]);

  const error = aggRes.error ?? respRes.error;
  if (error) {
    return (
      <>
        <div className="ash-phead">
          <div>
            <div className="ash-crumb">أديب › التفاعل › الاستبيانات › <b>النتائج</b></div>
            <h1>نتائج الاستبيان</h1>
          </div>
        </div>
        <Alert tone="warning" title="تعذّر جلب النتائج">{error}</Alert>
      </>
    );
  }
  if (!aggRes.agg) notFound();

  return <ResultsView agg={aggRes.agg} responses={respRes.rows} />;
}
