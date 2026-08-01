import { BuilderView } from "../BuilderView";
import { denyUnless } from "@/app/dashboard/_shell/guard";

export default async function NewSurveyPage() {
  const denied = await denyUnless("/dashboard/surveys");
  if (denied) return denied;

  return <BuilderView survey={null} />;
}
