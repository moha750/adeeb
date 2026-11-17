import { notFound } from "next/navigation";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getFactForEdit } from "../../data";
import { KnowledgeForm } from "../../KnowledgeForm";
import { AdRoomError } from "@/app/_ad/states";

export default async function EditFactPage({ params }: { params: Promise<{ id: string }> }) {
  const denied = await denyUnless("/dashboard/deebo/knowledge");
  if (denied) return denied;

  const { id } = await params;
  const { fact, error } = await getFactForEdit(id);

  // **بالقطعة لا بالتنبيه القديم** (٢٠٢٦-١١-١٧): لوحُ الغرفة، ورمزُ السحابة المنقطعة، و«إعادة المحاولة» و«أبلغ الدعم الفني»
  if (error) return <AdRoomError title="تحرير الواقعة" navPath="/dashboard/deebo/knowledge" what="الواقعة" message={error} />;
  if (!fact) notFound();

  return <KnowledgeForm fact={fact} />;
}
