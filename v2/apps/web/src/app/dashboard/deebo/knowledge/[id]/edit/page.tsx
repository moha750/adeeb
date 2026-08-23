import { notFound } from "next/navigation";
import { Alert } from "@adeeb/design-system";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getFactForEdit } from "../../data";
import { KnowledgeForm } from "../../KnowledgeForm";
import { PageHeader } from "../../../../_components/PageHeader";

export default async function EditFactPage({ params }: { params: Promise<{ id: string }> }) {
  const denied = await denyUnless("/dashboard/deebo/knowledge");
  if (denied) return denied;

  const { id } = await params;
  const { fact, error } = await getFactForEdit(id);

  if (error) {
    return (
      <>
        <PageHeader title="تحرير الواقعة" crumbLeaf="تحرير" />
        <Alert tone="warning" title="تعذّر جلب الواقعة">{error}</Alert>
      </>
    );
  }
  if (!fact) notFound();

  return <KnowledgeForm fact={fact} />;
}
