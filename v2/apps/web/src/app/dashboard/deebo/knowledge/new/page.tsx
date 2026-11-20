import { denyUnless } from "@/app/dashboard/_shell/guard";
import { KnowledgeForm } from "../KnowledgeForm";

// عنوانُ التبويب اسمُ الغرفة (محمد ٢٠٢٦-١١-٠٣)، وكانت «بوّابة أدِيب» وحدها (٢٠٢٦-١١-٢٠)
export const metadata = { title: "واقعة جديدة، بوّابة أدِيب" };

export default async function NewFactPage() {
  const denied = await denyUnless("/dashboard/deebo/knowledge");
  if (denied) return denied;

  return <KnowledgeForm />;
}
