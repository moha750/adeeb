import { Alert } from "@adeeb/design-system";
import { notFound } from "next/navigation";
import { getElectionDetail, getElectionLog, getVoteDetail } from "../data";
import { ElectionDetailView } from "../ElectionDetailView";
import { getCurrentAdmin } from "@/lib/auth";
import { canManageElection } from "@/lib/elections/authz";
import { AccessDenied } from "../../_shell/AccessDenied";
import { PageHeader } from "../../_components/PageHeader";
import { requestNow } from "@/app/_ad/now";

export default async function ElectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // تفصيلُ الانتخاب غرفةُ الإدارة والاطّلاع: يفتحه حاملُ `view_election_candidates`
  // (المديرون وأعضاء الموارد). ويُصرِّفه من يدير الانتخاب: المديرون الثلاثة (`manage_elections`)،
  // ومشرف اللجنة في انتخاب قيادتها ونيابتها (المادة ٤). وللمديرين وحدهم ثلاثة: التعيين والتكليف،
  // ومن صوّت لمن، والنتائج قبل إغلاق التصويت (المادتان ٥ و٢١).
  const me = await getCurrentAdmin();
  if (!me?.caps.includes("view_election_candidates")) return <AccessDenied name={me?.fullName ?? null} scope="room" />;
  const isManager = !!me.caps.includes("manage_elections");

  const { id } = await params;
  const canManage = isManager || (await canManageElection(id));
  // السجلُّ يُجلَب مع التفصيل لا بنداءٍ من المتصفّح: الصفحةُ تصل محمولةً بما يُقرأ فيها،
  // وسطحاه (ذيلُ الصفحة ونافذةُ المرشّح) يقرآن حِملًا واحدًا. وعطبُه لا يُسقط الصفحة.
  // وتفصيلُ الأصوات لإدارة الانتخابات وحدها (القاعدةُ ترفض غيرَها أصلًا)، فلا يُطلَب للمطّلِع
  const [{ election, error }, logRes, voteRes] = await Promise.all([
    getElectionDetail(id, { liveTotals: isManager }),
    getElectionLog(id),
    isManager ? getVoteDetail(id) : Promise.resolve({ rows: [], error: null }),
  ]);

  if (error) {
    return (
      <>
        <PageHeader title="الانتخابات" />
        <Alert tone="warning" title="تعذّر جلب الانتخاب">{error}</Alert>
      </>
    );
  }
  if (!election) notFound();

  return (
    <ElectionDetailView
      election={election}
      log={logRes.events}
      logError={logRes.error}
      votes={voteRes.rows}
      votesError={voteRes.error}
      readOnly={!canManage}
      canAppoint={isManager}
      liveTotals={isManager}
      serverNow={await requestNow()}
    />
  );
}
