import { notFound } from "next/navigation";
import { getSurveyAggregates } from "@/lib/surveys/aggregate";
import { getSurveyResponses } from "../../results-data";
import { getSurveys } from "../../data";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { authorizeSurvey } from "@/lib/surveys/authz";
import { canSurvey } from "../../vocab";
import { SurveyResultsRoom } from "@/app/_ad/rooms/SurveyResultsRoom";
import { SURVEYS_ROOM } from "@/app/_ad/rooms/meta";
import { AdRoomError } from "@/app/_ad/states";
import { requestNow } from "@/app/_ad/now";

export const metadata = { title: "نتائج الاستبيان، بوّابة أدِيب" };

/**
 * نتائجُ الاستبيان على قالب الإحصاء (`_ad/rooms/SurveyResultsRoom.tsx`، ٢٠٢٦-١١-٠٧). الحرّاسُ والجلبُ كما كانت حرفًا، ومعها صفُّ
 * الاستبيان في غرفته (`getSurveys`) لتكون التذكرةُ تذكرتَه نفسَها؛ فإن لم يُقرأ بُنيت من النتائج. والقديمُ `../../ResultsView.tsx` باقٍ
 * حتى يقرّر المالكُ حذفه. والخطأُ حالُ الغرفة («القطعة») لا تنبيهٌ تحت رأسٍ قديم.
 */
export default async function SurveyResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const denied = await denyUnless("/dashboard/surveys");
  if (denied) return denied;

  const { id } = await params;
  const surveyId = Number(id);
  if (!Number.isInteger(surveyId) || surveyId <= 0) notFound();

  // النتائج لصاحب الاستبيان ولمن شاركه إيّاها، ولحساب النادي على المنشور. ومن سواهم: «لا وجود».
  const grant = await authorizeSurvey(surveyId, "results");
  if (!grant.ok) notFound();

  // صفُّ الاستبيان من غرفة صاحب الجلسة (`grant.userId` — الحارسُ قرأه، فلا يُقرأ ثانيةً): منه شاراتُ تذكرته وسطورُها
  const [aggRes, respRes, rowsRes] = await Promise.all([
    getSurveyAggregates(surveyId),
    getSurveyResponses(surveyId),
    getSurveys(grant.userId),
  ]);

  const error = aggRes.error ?? respRes.error;
  if (error) return <AdRoomError {...SURVEYS_ROOM} title="نتائج الاستبيان" what="النتائج" message={error} />;
  if (!aggRes.agg) notFound();

  return (
    <SurveyResultsRoom
      agg={aggRes.agg}
      responses={respRes.rows}
      canEdit={canSurvey(grant.role, "edit")}
      survey={rowsRes.surveys.find((s) => s.id === surveyId) ?? null}
      serverNow={await requestNow()}
    />
  );
}
