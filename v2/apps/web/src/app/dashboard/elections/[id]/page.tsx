import { Alert } from "@adeeb/design-system";
import { notFound } from "next/navigation";
import { getElectionDetail } from "../data";
import { ElectionDetailView } from "../ElectionDetailView";
import { getCurrentAdmin } from "@/lib/auth";
import { AccessDenied } from "../../_shell/AccessDenied";
import { Breadcrumb } from "../../_shell/Breadcrumb";

export default async function ElectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // تفصيلُ الانتخاب غرفةُ الإدارة والاطّلاع: يفتحه حاملُ `view_election_candidates`
  // (المديرون والمطّلِع عضو الموارد)، ويُصرَّف بـ`manage_elections` — فالمطّلِعُ للقراءة.
  const me = await getCurrentAdmin();
  const canManage = !!me?.caps.includes("manage_elections");
  if (!me?.caps.includes("view_election_candidates")) return <AccessDenied name={me?.fullName ?? null} scope="room" />;

  const { id } = await params;
  const { election, error } = await getElectionDetail(id);

  if (error) {
    return (
      <>
        <div className="ash-phead"><div><Breadcrumb /><h1>الانتخابات</h1></div></div>
        <Alert tone="warning" title="تعذّر جلب الانتخاب">{error}</Alert>
      </>
    );
  }
  if (!election) notFound();

  return <ElectionDetailView election={election} readOnly={!canManage} />;
}
