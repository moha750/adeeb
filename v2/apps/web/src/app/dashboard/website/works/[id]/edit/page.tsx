import { notFound } from "next/navigation";
import { Alert } from "@adeeb/design-system";
import { getWorkForEdit } from "../../data";
import { WorkForm } from "../../WorkForm";
import { getWebsiteManager } from "@/lib/website/authz";
import { WebsiteDenied } from "../../../_guard";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { PageHeader } from "../../../../_components/PageHeader";

export default async function EditWorkPage({ params }: { params: Promise<{ id: string }> }) {
  const denied = await denyUnless("/dashboard/website/works");
  if (denied) return denied;

  if (!(await getWebsiteManager("works"))) return <WebsiteDenied section="الأعمال" />;

  const { id } = await params;
  const { work, error } = await getWorkForEdit(id);

  if (error) {
    return (
      <>
        <PageHeader title="تحرير العمل" crumbLeaf="تحرير" />
        <Alert tone="warning" title="تعذّر جلب العمل">{error}</Alert>
      </>
    );
  }
  if (!work) notFound();

  return <WorkForm work={work} />;
}
