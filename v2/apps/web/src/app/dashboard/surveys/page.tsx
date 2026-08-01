import { Alert } from "@adeeb/design-system";
import { getSurveys } from "./data";
import { SurveysView } from "./SurveysView";
import { denyUnless } from "@/app/dashboard/_shell/guard";

export default async function SurveysPage() {
  const denied = await denyUnless("/dashboard/surveys");
  if (denied) return denied;

  const { surveys, error } = await getSurveys();

  if (error) {
    return (
      <>
        <div className="ash-phead">
          <div>
            <div className="ash-crumb">أديب › التفاعل › <b>الاستبيانات</b></div>
            <h1>الاستبيانات</h1>
          </div>
        </div>
        <Alert tone="warning" title="تعذّر جلب الاستبيانات">{error}</Alert>
      </>
    );
  }

  return <SurveysView surveys={surveys} />;
}
