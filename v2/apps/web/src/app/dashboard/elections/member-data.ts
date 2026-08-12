// وجه العضو من الانتخابات (لا وجه المدير) — وقد انقسم بابًا بابًا: الترشُّح · التصويت · السجلّ.
// قراءاتُه بعميل *الجلسة* (auth.uid()=العضو) لأنّ دوالّ الانتخابات تُصرّح به؛ وتسميةُ الدور
// من roles.role_name_ar (بمفتاح الخدمة، فهي بيانٌ عامّ لا يخصّ عضوًا).
import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";
import { createClient } from "@/lib/supabase/server";
import { positionLine } from "@/lib/positionLabel";
import { fmtDateTime } from "./data";
import { CANDIDATE_STATUS_META, type CandidateStatus, type ElectionStatus } from "./vocab";

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  return url && key ? createAdeebServiceClient(url, key) : null;
}

/** رتبةُ المقعد المنتخَب كما في `roles.role_name_ar` — مجرّدةً، ووحدتُها من الانتخاب نفسه. */
async function roleLabelMap(sb: ReturnType<typeof createAdeebServiceClient>): Promise<Map<string, string>> {
  const { data } = await sb.from("roles").select("role_name, role_name_ar").eq("is_elected", true);
  const m = new Map<string, string>();
  for (const r of (data ?? []) as { role_name: string; role_name_ar: string | null }[]) {
    m.set(r.role_name, r.role_name_ar ?? r.role_name);
  }
  return m;
}

const positionOf = (rank: string | undefined, roleName: string, committeeAr: string | null, departmentAr: string | null) => {
  const title = rank ?? roleName;
  return positionLine(title, committeeAr ?? departmentAr) ?? title;
};

type ElectionRpcRow = { election_id: string; target_role_name: string; target_committee_id?: number | null; target_committee_ar: string | null; target_department_ar: string | null; candidacy_end?: string | null; voting_end?: string | null; has_submission?: boolean; has_voted?: boolean };
type CandidacyRpcRow = { candidate_id: string; election_id: string; target_role_name: string; target_committee_id: number | null; target_committee_ar: string | null; target_department_ar: string | null; candidate_number: number; candidate_status: CandidateStatus; election_status: ElectionStatus; statement_ar: string; file_url: string | null; file_name: string | null; review_note_ar: string | null; can_withdraw: boolean; can_edit: boolean };

// الموعد مرّتين: نصًّا للعين (`…End`)، وخامًا للعدّاد الحيّ (`…EndRaw`).
export type RunItem = { electionId: string; position: string; candidacyEnd: string; candidacyEndRaw: string | null; hasSubmission: boolean; committeeId: number | null; roleName: string };
export type VoteItem = { electionId: string; position: string; votingEnd: string; votingEndRaw: string | null; hasVoted: boolean };
export type RecordTone = "warning" | "info" | "success" | "danger" | "neutral";
export type TrailKind = "submit" | "edit" | "approve" | "reject" | "withdraw" | "open" | "win" | "end";
/** محطّةٌ في رحلة الترشّح — قد تحمل ملاحظةً في متنها. */
export type JourneyStep = { kind: TrailKind; label: string; date: string; note?: string };
/** ترشّحٌ واحدٌ رحلةً كاملة — يُبنى منه تبويب «سِجلّ ترشُّحي». */
export type CandidacyJourney = {
  candidateId: string; electionId: string; position: string; number: number;
  status: CandidateStatus; statusLabel: string; statusTone: RecordTone;
  next: string; future: string | null;
  statement: string; fileUrl: string | null; fileName: string | null;
  trail: JourneyStep[]; canEdit: boolean; canWithdraw: boolean;
};
export type BallotCandidate = { id: string; number: number; statement: string };

/** حِملُ أيّ بابٍ من أبواب العضو: قائمتُه أو خطأُ جلبها. */
export type MemberFetch<T> = { items: T[]; error: string | null };

/** أساسٌ مشترك لكلّ باب: عميلُ الجلسة + خريطةُ أسماء الأدوار المنتخَبة (أو خطأُ إعدادٍ مبكّر). */
async function base() {
  const svc = service();
  if (!svc) return { session: null as Awaited<ReturnType<typeof createClient>> | null, labels: new Map<string, string>(), error: "إعداد الخادم ناقص (مفتاح الخدمة)." as string | null };
  const [session, labels] = await Promise.all([createClient(), roleLabelMap(svc)]);
  return { session, labels, error: null as string | null };
}

/** باب «الترشُّح»: انتخاباتٌ العضوُ أهلٌ للترشّح لها الآن (`has_submission` يميّز ما قدّمه). */
export async function getRunElections(userId: string): Promise<MemberFetch<RunItem>> {
  const { session, labels, error } = await base();
  if (!session) return { items: [], error };
  const { data, error: e } = await session.rpc("get_eligible_elections_for_user", { p_user: userId });
  if (e) return { items: [], error: e.message };
  const lbl = (rn: string) => labels.get(rn);
  const items: RunItem[] = ((data ?? []) as ElectionRpcRow[]).map((r) => ({
    electionId: r.election_id, position: positionOf(lbl(r.target_role_name), r.target_role_name, r.target_committee_ar, r.target_department_ar),
    // التاريخ وحده في الكرت، والدقّةُ يحملها العدّاد تحته (الخامُ له)
    candidacyEnd: fmtDateTime(r.candidacy_end ?? null), candidacyEndRaw: r.candidacy_end ?? null,
    hasSubmission: !!r.has_submission,
    committeeId: r.target_committee_id ?? null, roleName: r.target_role_name,
  }));
  return { items, error: null };
}

/** باب «التصويت»: انتخاباتٌ التصويتُ فيها مفتوحٌ للعضو (`has_voted` يميّز ما صوّت فيه). */
export async function getVoteElections(userId: string): Promise<MemberFetch<VoteItem>> {
  const { session, labels, error } = await base();
  if (!session) return { items: [], error };
  const { data, error: e } = await session.rpc("get_votable_elections_for_user", { p_user: userId });
  if (e) return { items: [], error: e.message };
  const lbl = (rn: string) => labels.get(rn);
  const items: VoteItem[] = ((data ?? []) as ElectionRpcRow[]).map((r) => ({
    electionId: r.election_id, position: positionOf(lbl(r.target_role_name), r.target_role_name, r.target_committee_ar, r.target_department_ar),
    votingEnd: fmtDateTime(r.voting_end ?? null), votingEndRaw: r.voting_end ?? null, hasVoted: !!r.has_voted,
  }));
  return { items, error: null };
}

type AuditRow = { event_type: string; payload: Record<string, unknown> | null; created_at: string };

/** حدثُ السجلّ من القاعدة → محطّةُ رحلة (بأيقونتها ونصّها وملاحظتها). */
function toStep(r: AuditRow): JourneyStep {
  const p = r.payload ?? {};
  const note = (p["note_ar"] ?? p["review_note_ar"] ?? p["note"]) as string | undefined;
  const st = p["new_status"] as string | undefined;
  const date = fmtDateTime(r.created_at);
  switch (r.event_type) {
    case "candidacy_submitted": return { kind: "submit", label: "قُدّم الترشّح", date };
    case "candidate_updated": return { kind: "edit", label: "عُدّل الترشّح", date };
    case "candidate_resubmitted": return { kind: "edit", label: "أُعيد بعد التعديل", date };
    case "candidate_withdrawn": return { kind: "withdraw", label: "سُحب الترشّح", date };
    case "candidate_reviewed":
      if (st === "approved") return { kind: "approve", label: "اعتُمد الترشّح", date };
      if (st === "rejected") return { kind: "reject", label: "رُفض الترشّح", date, note };
      if (st === "needs_edit") return { kind: "edit", label: "طُلب تعديل", date, note };
      return { kind: "edit", label: "رُوجِع الترشّح", date, note };
    default: return { kind: "submit", label: r.event_type, date };
  }
}

/** الحالةُ المعروضة و«ما التالي» والمحطّة القادمة — تراعي حالة المرشّح وطور الانتخاب والفوز. */
function statusView(status: CandidateStatus, election: ElectionStatus, isWinner: boolean, position: string): { label: string; tone: RecordTone; next: string; future: string | null } {
  if (election === "completed" && status === "approved") {
    return isWinner
      ? { label: "فائز", tone: "success", next: `مُبارَك لك! فزتَ بالمنصب يا ${position}`, future: null }
      : { label: "لم يُوفَّق", tone: "info", next: "انتهى التصويت؛ لم يُوفَّق ترشّحك هذه المرّة، شكرًا لِمُشاركتك.", future: null };
  }
  const base = CANDIDATE_STATUS_META[status];
  switch (status) {
    case "pending": return { label: base.label, tone: base.tone, next: "طلبك تحت مراجعة إدارة الموارد البشرية. يمكنك تعديل أو تطوير ترشّحك خلال مراجعة ترشيحك.", future: election === "candidacy_open" ? "تصويت" : null };
    case "needs_edit": return { label: base.label, tone: base.tone, next: "راجِع ملاحظة إدارة الموارد البشرية وعدّل بيانك أو ملفّك، ثمّ أعِد الإرسال.", future: election === "candidacy_open" ? "تصويت" : null };
    case "approved": {
      const next = election === "voting_open" ? "التصويت جارٍ الآن على ترشّحك."
        : election === "voting_closed" ? "أُغلق التصويت، بانتظار إعلان النتيجة."
          : "مُبارك لك! تم قبول ترشحك لخوض مرحلة التصويت.";
      const future = (election === "candidacy_open" || election === "candidacy_closed") ? "تصويت"
        : (election === "voting_open" || election === "voting_closed") ? "النتيجة" : null;
      return { label: base.label, tone: base.tone, next, future };
    }
    case "rejected": return { label: base.label, tone: base.tone, next: "تعتذر إدارة الموارد البشرية عن قبول ترشّحك في هذا الانتخاب، يُمكنك رؤية سبب الرفض.", future: null };
    case "withdrawn": return { label: base.label, tone: base.tone, next: "سحبتَ ترشّحك من هذا الانتخاب.", future: null };
    default: return { label: base.label, tone: base.tone, next: "", future: null };
  }
}

/** باب «سِجلّ ترشُّحي»: كلُّ ترشّحٍ **رحلةً كاملة** — حالتُه وبيانُه وملفُّه وسجلُّ أحداثه، ومحطّتُه
 *  القادمة، وما يُتاح فيه من تعديلٍ وسحب. يجلب سجلّ الأحداث لكلّ ترشّحٍ ويشتقّ الفوز من الانتخاب. */
export async function getMyCandidacies(userId: string): Promise<MemberFetch<CandidacyJourney>> {
  const svc = service();
  if (!svc) return { items: [], error: "إعداد الخادم ناقص (مفتاح الخدمة)." };
  const session = await createClient();
  const labels = await roleLabelMap(svc);
  const lbl = (rn: string) => labels.get(rn);

  const { data, error: e } = await session.rpc("get_user_candidacies", { p_user: userId });
  if (e) return { items: [], error: e.message };
  const rows = (data ?? []) as CandidacyRpcRow[];
  if (!rows.length) return { items: [], error: null };

  const electionIds = [...new Set(rows.map((r) => r.election_id))];
  const [elecRes, trailRes] = await Promise.all([
    svc.from("elections").select("id, winner_candidate_id").in("id", electionIds),
    Promise.all(rows.map((r) => session.rpc("get_candidate_audit_trail", { p_candidate: r.candidate_id }))),
  ]);
  const winnerOf = new Map(((elecRes.data ?? []) as { id: string; winner_candidate_id: string | null }[]).map((x) => [x.id, x.winner_candidate_id]));

  const items: CandidacyJourney[] = rows.map((r, i) => {
    const isWinner = winnerOf.get(r.election_id) === r.candidate_id;
    const position = positionOf(lbl(r.target_role_name), r.target_role_name, r.target_committee_ar, r.target_department_ar);
    const view = statusView(r.candidate_status, r.election_status, isWinner, position);
    const audit = ((trailRes[i]?.data ?? []) as AuditRow[]).slice().sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0));
    const trail: JourneyStep[] = audit.length ? audit.map(toStep) : [{ kind: "submit", label: "قُدّم الترشّح", date: "" }];
    // مآلُ التصويت محطّةٌ ختاميّة (ليست في سجلّ المرشّح): فوزٌ أو انتهاء
    if (r.election_status === "completed" && r.candidate_status === "approved") {
      trail.push(isWinner ? { kind: "win", label: "فاز بالمنصب", date: "" } : { kind: "end", label: "لم يُوفَّق", date: "" });
    }
    return {
      candidateId: r.candidate_id, electionId: r.election_id, position,
      number: r.candidate_number, status: r.candidate_status,
      statusLabel: view.label, statusTone: view.tone, next: view.next, future: view.future,
      statement: r.statement_ar, fileUrl: r.file_url ?? null, fileName: r.file_name ?? null,
      trail, canEdit: !!r.can_edit, canWithdraw: !!r.can_withdraw,
    };
  });
  return { items, error: null };
}

/** سياقُ صفحة إكمال الترشّح `/apply/[electionId]`: المنصبُ ونطاقُه، والترشّحُ القائمُ (وضعُ التعديل)،
 *  والمقاعدُ الشقيقة (ترشّحاتٌ نشطةٌ أخرى للعضو في **القسم نفسه**) لأجل الأفضليّة. تُقرأ بالخدمة، والفاعلُ userId. */
export type ApplyContext = {
  ok: boolean;
  error: string | null;
  electionId: string;
  position: string;
  /** قسمُ هذا المقعد — وحدةُ الجمع والأفضليّة (`set_seat_preference`). */
  departmentId: number | null;
  roleName: string;
  status: ElectionStatus;
  /** ترشّحُ العضو القائمُ في هذا الانتخاب — حاضرٌ في وضع التعديل، وnull للترشّح الجديد. */
  existing: { candidateId: string; statement: string; fileName: string | null; fileUrl: string | null; canEdit: boolean } | null;
  /** المقاعد الشقيقة في القسم نفسه (مقدَّمٌ لها) — تظهر معها خانةُ الأفضليّة. */
  siblings: { electionId: string; position: string }[];
  /** مفضَّلُه القائم بين مقاعد القسم (هذا المقعد إن لم يسمِّ شيئًا بعد). */
  preferredElectionId: string;
  /** فرصُ ترشّحٍ أخرى مفتوحةٌ للعضو لم يقدّم لها (غيرُ هذا الانتخاب) — بها تُخيَّر نافذةُ النجاح. */
  otherOpen: number;
};

/** مقاعدُ العضو الحيّة تُقرأ كلُّها ثمّ تُنخل بالقسم، فمصدرُ الوحدات خريطتان تُقرآن مرّة. */
const LIVE_ELECTION = ["candidacy_open", "candidacy_closed", "voting_open", "voting_closed"];
const LIVE_CANDIDACY = ["pending", "approved", "needs_edit"];

export async function getApplyContext(userId: string, electionId: string): Promise<ApplyContext> {
  const base: ApplyContext = { ok: false, error: null, electionId, position: "", departmentId: null, roleName: "", status: "candidacy_open", existing: null, siblings: [], preferredElectionId: electionId, otherOpen: 0 };
  const svc = service();
  if (!svc) return { ...base, error: "إعداد الخادم ناقص (مفتاح الخدمة)." };
  const [labels, comRes, depRes] = await Promise.all([
    roleLabelMap(svc),
    svc.from("committees").select("id, committee_name_ar, department_id"),
    svc.from("departments").select("id, name_ar"),
  ]);
  const lbl = (rn: string) => labels.get(rn);
  const comById = new Map(((comRes.data ?? []) as { id: number; committee_name_ar: string; department_id: number | null }[]).map((c) => [c.id, c]));
  const depById = new Map(((depRes.data ?? []) as { id: number; name_ar: string }[]).map((d) => [d.id, d.name_ar]));

  /** قسمُ المقعد: قسمُه صراحةً (التنسيق) أو قسمُ لجنته — مرآةُ `election_department` في القاعدة. */
  type Scoped = { target_role_name: string; target_committee_id: number | null; target_department_id: number | null };
  const deptOf = (r: Scoped) => r.target_department_id ?? (r.target_committee_id != null ? comById.get(r.target_committee_id)?.department_id ?? null : null);
  const scopeArOf = (r: Scoped) => (r.target_committee_id != null ? comById.get(r.target_committee_id)?.committee_name_ar ?? null : r.target_department_id != null ? depById.get(r.target_department_id) ?? null : null);
  const positionOfRow = (r: Scoped) => positionOf(lbl(r.target_role_name), r.target_role_name, scopeArOf(r), null);

  const eRes = await svc.from("elections").select("id, target_role_name, target_committee_id, target_department_id, status, archived_at").eq("id", electionId).maybeSingle();
  if (eRes.error) return { ...base, error: eRes.error.message };
  if (!eRes.data || eRes.data.archived_at) return { ...base, error: "هذا الانتخاب غير موجودٍ أو مُؤرشَف." };
  const e = eRes.data;

  const departmentId = deptOf(e);
  const position = positionOfRow(e);

  // الترشّح القائم في هذا الانتخاب (وضع التعديل). المعتمَد لا يُعدَّل (ترحيل 39)، والحقّ يسقط بإغلاق الترشّح.
  const meRes = await svc.from("election_candidates").select("id, statement_ar, file_name, file_url, status").eq("election_id", electionId).eq("user_id", userId).maybeSingle();
  const existing = meRes.data ? {
    candidateId: meRes.data.id as string,
    statement: (meRes.data.statement_ar as string | null) ?? "",
    fileName: (meRes.data.file_name as string | null) ?? null,
    fileUrl: (meRes.data.file_url as string | null) ?? null,
    canEdit: e.status === "candidacy_open" && (meRes.data.status === "pending" || meRes.data.status === "needs_edit"),
  } : null;

  // المقاعد الشقيقة: ترشّحاتُه النشطةُ الأخرى في مقاعدَ حيّةٍ من القسم نفسه (تنسيقًا كانت أو لجنة).
  // ومعها مفضَّلُه القائم — يُعلَّم في الخانة فيبدّله إن شاء، ولا يُنسى ما اختار سابقًا.
  const siblings: ApplyContext["siblings"] = [];
  let preferredElectionId = electionId;
  if (departmentId != null) {
    const mineRes = await svc.from("election_candidates").select("election_id, preference_rank").eq("user_id", userId).in("status", LIVE_CANDIDACY);
    const mine = (mineRes.data ?? []) as { election_id: string; preference_rank: number | null }[];
    const otherIds = mine.map((r) => r.election_id).filter((id) => id !== electionId);
    if (otherIds.length) {
      const sibRes = await svc.from("elections").select("id, target_role_name, target_committee_id, target_department_id").in("id", otherIds).is("archived_at", null).in("status", LIVE_ELECTION);
      for (const s of (sibRes.data ?? []) as ({ id: string } & Scoped)[]) {
        if (deptOf(s) !== departmentId) continue;
        siblings.push({ electionId: s.id, position: positionOfRow(s) });
        if (mine.find((m) => m.election_id === s.id)?.preference_rank === 1) preferredElectionId = s.id;
      }
    }
  }

  // فرصةٌ أخرى تنتظره؟ المصدرُ عينُ ما يبني باب «الترشُّح» (RPC الأهليّة بعميل الجلسة)، فلا يفترق الجوابان.
  const session = await createClient();
  const eligRes = await session.rpc("get_eligible_elections_for_user", { p_user: userId });
  const otherOpen = ((eligRes.data ?? []) as ElectionRpcRow[]).filter((r) => r.election_id !== electionId && !r.has_submission).length;

  return { ok: true, error: null, electionId, position, departmentId, roleName: e.target_role_name, status: e.status as ElectionStatus, existing, siblings, preferredElectionId, otherOpen };
}
