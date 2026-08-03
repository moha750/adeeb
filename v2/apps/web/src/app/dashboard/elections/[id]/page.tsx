import { Alert } from "@adeeb/design-system";
import { notFound } from "next/navigation";
import { getElectionDetail } from "../data";
import { ElectionDetailView } from "../ElectionDetailView";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { Breadcrumb } from "../../_shell/Breadcrumb";

export default async function ElectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const denied = await denyUnless("/dashboard/elections");
  if (denied) return denied;

  const { id } = await params;

  const { election, error } = await getElectionDetail(id);

  if (error) {
    return (
      <>
        <div className="ash-phead">
          <div>
            <Breadcrumb />
            <h1>الانتخابات</h1>
          </div>
        </div>
        <Alert tone="warning" title="تعذّر جلب الانتخاب">{error}</Alert>
      </>
    );
  }
  if (!election) notFound();

  return <ElectionDetailView election={election} />;
}
