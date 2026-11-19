import { notFound } from "next/navigation";
import { getElectionDetail } from "../../../data";
import { getCurrentAdmin } from "@/lib/auth";
import { canManageElection } from "@/lib/elections/authz";
import { exclusionViewer } from "@/lib/elections/exclusion";
import { CandidacyRoom } from "@/app/_ad/rooms/CandidacyRoom";
import { AdRoomDenied, AdRoomError } from "@/app/_ad/states";

/**
 * **صفحةُ الترشّح** (٢٠٢٦-١١-١٧): البيانُ والملفُّ والقرار، بعنوانٍ لكلّ ترشّح يفتحه سطرُ المرشّح في غرفة الانتخاب وإشعارُ تقدّمه.
 * بابُها بابُ صفحة الانتخاب نفسُه: يفتحها حاملُ `view_election_candidates`، ويقرّر فيها من يدير الانتخاب (المديرون الثلاثة، ومشرفُ اللجنة
 * في انتخاب قيادتها ونيابتها). والقاعدةُ تحرس القرارَ نفسَه، فالبابُ هنا لما يُرى.
 */
export default async function CandidacyPage({ params }: { params: Promise<{ id: string; cid: string }> }) {
  const me = await getCurrentAdmin();
  if (!me?.caps.includes("view_election_candidates")) return <AdRoomDenied title="الانتخابات" navPath="/dashboard/elections" what="الانتخابات" desc="هذه الصفحة لمن مُنحت له قدرة «الاطّلاع على المرشّحين» أو إدارة الانتخابات." />;
  const { id, cid } = await params;
  const canManage = !!me.caps.includes("manage_elections") || (await canManageElection(id));
  const [{ election, error }, viewer] = await Promise.all([getElectionDetail(id, { liveTotals: false }), exclusionViewer(me.id)]);
  if (error) return <AdRoomError title="الترشّح" navPath="/dashboard/elections" what="الترشّح" message={error} />;
  const candidate = election?.candidates.find((c) => c.id === cid);
  if (!election || !candidate) notFound();
  return <CandidacyRoom election={election} candidate={candidate} readOnly={!canManage} backHref={`/dashboard/elections/${id}`} candidateHref={`/dashboard/elections/${id}/candidates/`} viewer={viewer} />;
}
