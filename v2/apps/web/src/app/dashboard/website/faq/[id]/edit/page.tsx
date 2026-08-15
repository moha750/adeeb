import { notFound } from "next/navigation";
import { Alert } from "@adeeb/design-system";
import { getFaqForEdit } from "../../data";
import { FaqForm } from "../../FaqForm";
import { getWebsiteManager } from "@/lib/website/authz";
import { WebsiteDenied } from "../../../_guard";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { PageHeader } from "../../../../_components/PageHeader";

export default async function EditFaqPage({ params }: { params: Promise<{ id: string }> }) {
  const denied = await denyUnless("/dashboard/website/faq");
  if (denied) return denied;

  if (!(await getWebsiteManager("faq"))) return <WebsiteDenied section="الأسئلة الشائعة" />;

  const { id } = await params;
  const { faq, error } = await getFaqForEdit(id);

  if (error) {
    return (
      <>
        <PageHeader title="تحرير السؤال" crumbLeaf="تحرير" />
        <Alert tone="warning" title="تعذّر جلب السؤال">{error}</Alert>
      </>
    );
  }
  if (!faq) notFound();

  return <FaqForm faq={faq} />;
}
