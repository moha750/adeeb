import { Alert } from "@adeeb/design-system";
import { getSurveys } from "./data";
import { SurveysView } from "./SurveysView";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { PageHeader } from "../_components/PageHeader";

export default async function SurveysPage() {
  const denied = await denyUnless("/dashboard/surveys");
  if (denied) return denied;

  const { surveys, error } = await getSurveys();

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
