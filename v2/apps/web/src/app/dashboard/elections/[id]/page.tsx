import { notFound } from "next/navigation";
import { getElectionDetail, getElectionLog, getVoteDetail } from "../data";
import { ElectionRecordView } from "./ElectionRecordView";
import { getCurrentAdmin } from "@/lib/auth";
import { canManageElection } from "@/lib/elections/authz";
import { exclusionViewer } from "@/lib/elections/exclusion";
import { AdRoomDenied, AdRoomError } from "@/app/_ad/states";
import { requestNow } from "@/app/_ad/now";

export default async function ElectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // تفصيلُ الانتخاب غرفةُ الإدارة والاطّلاع: يفتحه حاملُ `view_election_candidates`
  // (المديرون وأعضاء الموارد). ويُصرِّفه من يدير الانتخاب: المديرون الثلاثة (`manage_elections`)،
  // ومشرف اللجنة في انتخاب قيادتها ونيابتها (المادة ٤). وللمديرين وحدهم ثلاثة: التعيين والتكليف،
  // ومن صوّت لمن، والنتائج قبل إغلاق التصويت (المادتان ٥ و٢١).
  const me = await getCurrentAdmin();
  if (!me?.caps.includes("view_election_candidates")) return <AdRoomDenied title="الانتخابات" navPath="/dashboard/elections" what="الانتخابات" desc="هذه الصفحة لمن مُنحت له قدرة «الاطّلاع على المرشّحين» أو إدارة الانتخابات." />;
  const isManager = !!me.caps.includes("manage_elections");

  const { id } = await params;
  const canManage = isManager || (await canManageElection(id));
  // السجلُّ يُجلَب مع التفصيل لا بنداءٍ من المتصفّح: الصفحةُ تصل محمولةً بما يُقرأ فيها،
  // وسطحاه (ذيلُ الصفحة ونافذةُ المرشّح) يقرآن حِملًا واحدًا. وعطبُه لا يُسقط الصفحة.
  // وتفصيلُ الأصوات لإدارة الانتخابات وحدها (القاعدةُ ترفض غيرَها أصلًا)، فلا يُطلَب للمطّلِع
  const [{ election, error }, logRes, voteRes, viewer] = await Promise.all([
    getElectionDetail(id, { liveTotals: isManager }),
    getElectionLog(id),
    isManager ? getVoteDetail(id) : Promise.resolve({ rows: [], error: null }),
    // قائدُ الموارد يرى في رأس الصفحة طلبَ الاستبعاد الذي ينتظره (محمد ٢٠٢٦-١١-١٩: «كيف ستعرف القائدة أن تدخل على هذا المرشّح؟»)
    exclusionViewer(me.id),
  ]);

  if (error) return <AdRoomError title="الانتخاب" navPath="/dashboard/elections" what="الانتخاب" message={error} />;
  if (!election) notFound();

  return (
    <ElectionRecordView
      election={election}
      log={logRes.events}
      logError={logRes.error}
      votes={voteRes.rows}
      votesError={voteRes.error}
      readOnly={!canManage}
      canAppoint={isManager}
      liveTotals={isManager}
      hrLeader={viewer.isHrLeader}
      serverNow={await requestNow()}
    />
  );
}
