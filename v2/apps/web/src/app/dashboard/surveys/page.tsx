import { Alert } from "@adeeb/design-system";
import { getSurveys } from "./data";
import { SurveysView } from "./SurveysView";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getSurveyManager } from "@/lib/surveys/authz";
import { PageHeader } from "../_components/PageHeader";

export default async function SurveysPage() {
  const denied = await denyUnless("/dashboard/surveys");
  if (denied) return denied;

  // الهويّةُ من الجلسة الحقيقيّة: القائمةُ استبياناتُ صاحب الجلسة وما شُورك معه، لا غير
  const mgr = await getSurveyManager();
  const { surveys, error } = mgr
    ? await getSurveys(mgr.userId)
    : { surveys: [], error: "تعذّر التحقّق من صلاحيتك في الاستبيانات. حدّث الصفحة." };

  if (error) {
    return (
      <>
        <PageHeader title="الاستبيانات" />
        <Alert tone="warning" title="تعذّر جلب الاستبيانات">{error}</Alert>
      </>
    );
  }

  return <SurveysView surveys={surveys} />;
}
