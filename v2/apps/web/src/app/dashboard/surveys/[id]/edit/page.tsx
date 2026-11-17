import { notFound, redirect } from "next/navigation";
import { getSurveyDetail } from "../../data";
import { SurveyBuilderRoom } from "@/app/_ad/rooms/SurveyBuilderRoom";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { authorizeSurvey } from "@/lib/surveys/authz";
import { canEditSurvey } from "../../vocab";
import { AdRoomError } from "@/app/_ad/states";

export const metadata = { title: "تحرير الاستبيان، بوّابة أدِيب" };

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
  // **بالقطعة لا بالتنبيه القديم** (٢٠٢٦-١١-١٧): لوحُ الغرفة، ورمزُ السحابة المنقطعة، و«إعادة المحاولة» و«أبلغ الدعم الفني»
  if (error) return <AdRoomError title="تحرير الاستبيان" navPath="/dashboard/surveys" what="الاستبيان" message={error} />;
  if (!survey) notFound();
  // والشريكُ المحرِّر أمام استبيانٍ ركنه صاحبُه: إلى نتائجه، فالتحريرُ هنا لمن يملك الإعادة
  if (!canEditSurvey(grant.role, survey)) redirect(`/dashboard/surveys/${surveyId}/results`);

  // (المشاركةُ ليست هنا: نافذةٌ فوق القائمة، فمن يشارك لا يمرّ ببنّاء الأسئلة.)
  // على قالب مساحة العمل («المنضدة»، ٢٠٢٦-١١-١٢) — كان `BuilderView` (باقٍ حتى يقرّر محمد حذفه)
  return <SurveyBuilderRoom survey={survey} look="b" />;
}
