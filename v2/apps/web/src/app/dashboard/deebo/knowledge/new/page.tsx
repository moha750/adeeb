import { denyUnless } from "@/app/dashboard/_shell/guard";
import { KnowledgeForm } from "../KnowledgeForm";

export default async function NewFactPage() {
  const denied = await denyUnless("/dashboard/deebo/knowledge");
  if (denied) return denied;

  return <KnowledgeForm />;
}
