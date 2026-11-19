// وجه العضو من الانتخابات (لا وجه المدير) — وقد انقسم بابًا بابًا: الترشُّح · التصويت · السجلّ.
// قراءاتُه بعميل *الجلسة* (auth.uid()=العضو) لأنّ دوالّ الانتخابات تُصرّح به؛ وتسميةُ الدور
// من roles.role_name_ar (بمفتاح الخدمة، فهي بيانٌ عامّ لا يخصّ عضوًا).
import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";
import { createClient } from "@/lib/supabase/server";
import { positionLine } from "@/lib/positionLabel";
import { fmtDateTime, type EndReason } from "./data";
import { fmtMonthYear } from "@/lib/dates";
import type { CandidateStatus, ElectionStatus } from "./vocab";
import { describeEvent, type LogKind, type LogTone } from "./log";
import { statusView, type MemberFreeze } from "./journey";
import type { RejectReason } from "./actions";

export type { MemberFreeze } from "./journey";

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

type ElectionRpcRow = { election_id: string; target_role_name: string; target_committee_id?: number | null; target_committee_ar: string | null; target_department_ar: string | null; candidacy_end?: string | null; voting_end?: string | null; has_submission?: boolean; has_voted?: boolean; view_only?: boolean };
type CandidacyRpcRow = { candidate_id: string; election_id: string; target_role_name: string; target_committee_id: number | null; target_committee_ar: string | null; target_department_ar: string | null; candidate_number: number; candidate_status: CandidateStatus; election_status: ElectionStatus; election_archived_at: string | null; statement_ar: string; file_url: string | null; file_name: string | null; review_note_ar: string | null; submitted_at: string | null; candidacy_end: string | null; can_withdraw: boolean; can_edit: boolean };

// الموعد مرّتين: نصًّا للعين (`…End`)، وخامًا للعدّاد الحيّ (`…EndRaw`).
export type RunItem = { electionId: string; position: string; candidacyEnd: string; candidacyEndRaw: string | null; hasSubmission: boolean; committeeId: number | null; roleName: string };
export type VoteItem = {
  electionId: string; position: string; votingEnd: string; votingEndRaw: string | null; hasVoted: boolean;
  /**
   * **مقعدٌ يُرى ولا يُفعَل فيه**: صاحبُه مرشّحُه الوحيد (`is_sole_candidate` في القاعدة).
   * يبقى في بابه ليقرأ بيانَه وموعدَه، ويسقط عنه الصندوقُ وحدَه — لا يُسأل أحدٌ عن نفسه.
   */
  viewOnly: boolean;
  /**
   * **صوتُك بطل فصوّت من جديد** (المادة 16): انتهى ترشّحُ من صوّتَّ له، فعادت بطاقتُك مفتوحةً
   * بوزنك الأوّل. و`hasVoted` لا يَعدّ الباطل.
   */
  revote: boolean;
};
export type RecordTone = LogTone;
/** محطّةٌ في رحلة الترشّح — قد تحمل ملاحظةً في متنها. */
export type JourneyStep = { kind: LogKind; label: string; date: string; note?: string };
/** ترشّحٌ واحدٌ رحلةً كاملة — يُبنى منه تبويب «سِجلّ ترشُّحي». */
export type CandidacyJourney = {
  candidateId: string; electionId: string; position: string; number: number;
  /** اسمُ الدورة («دورة أغسطس 2026») — مرساةُ الزمن، وبها يفترق ترشّحان لمنصبٍ واحد. */
  cycle: string;
  /** استقرّ مآلُه فلا ينتظر منك شيئًا: منسحبٌ أو مرفوضٌ أو انتهى انتخابُه. */
  archived: boolean;
  /** يومُ التقديم خامًا — كعبُ الترشّح في القالب الجديد (`dayParts`)، كما يومُ الإنشاء كعبُ الانتخاب في غرفة الإدارة. */
  submittedIso?: string | null;
  status: CandidateStatus; statusLabel: string; statusTone: RecordTone;
  next: string; future: string | null;
  statement: string; fileUrl: string | null; fileName: string | null;
  trail: JourneyStep[]; canEdit: boolean; canWithdraw: boolean;
  /** مهلةُ التعديل (`needs_edit`): يعدّل قبلها ولو أُغلق الباب (المادة 14). */
  editDueRaw: string | null;
  /** سببُ الاعتذار من الثلاثة (`rejected`)، والنصُّ بجنسه من `REJECT`. */
  rejectReason: RejectReason | null;
  /** سببُ الانتهاء ولحظتُه (`ended`)، والنصُّ بجنسه من `ENDED`. */
  endReason: EndReason | null;
  endedAtRaw: string | null;
  /** التجميدُ بعد موافقة القائد، وبه حقلُ الإجابة (`answerFreeze(freeze.id, …)`). */
  freeze: MemberFreeze | null;
  /** الانتخابُ الملغى: سببُه ويومُه. */
  cancel: { reason: string; atRaw: string } | null;
};

/** حرمانٌ قائمٌ من الترشّح (المادة 11): يُرى مكانَ أبواب الترشّح حتى آخر يومٍ فيه. */
export type CandidacyBan = { id: number; reason: string; until: string };

/**
 * **نتيجةُ المقعد للعضو** (ع١١): الفائزُ وحده أو من عُيّن، بلا أرقام. وللملغى سببُه.
 * و`status` غيرُ المكتمل والملغى يعني أنّ النتيجة لم تُحسم بعد.
 */
export type SeatResult = {
  electionId: string;
  position: string;
  status: ElectionStatus;
  completedBy: "winner" | "appointment" | null;
  person: { name: string; gender: string | null; avatarUrl: string | null } | null;
  /** تزكيةٌ: فاز مرشّحٌ وحيدٌ بتأييد الناخبين. */
  sole: boolean;
  atRaw: string | null;
  cancel: { reason: string; atRaw: string } | null;
  /** ترشّحُ الفائز إن اكتمل بفائز: به تُعلَّم ورقةُ الناخب بعد الإعلان (`getSeatOutcome`). */
  winnerCandidateId: string | null;
};
/**
 * **ورقةُ المقعد بعد إعلانه** (محمد ٢٠٢٦-١١-١٩: «لا صفحةَ نتيجةٍ مستقلّة»): الناخبُ يفتح الورقةَ التي صوّت فيها بكروتها، وعلى الفائز
 * شارتُه وعلى صوته شارتُه، وللفائز نفسِه نافذةُ «ألف مبروك». **بلا أرقام** (المادتان ٥ و٢٨).
 */
export type SeatOutcome = { election: VoteItem; candidates: BallotCandidate[]; myVote: MyVote | null; winnerId: string; youWon: boolean; declaredRaw: string | null };
/**
 * مرشّحٌ في بطاقة الاقتراع — **معروفٌ باسمه** (قرار المالك والمجلس الإداري، ٢٠٢٦-١١-٠٧): كانت
 * البطاقةُ تُعمّيه فيُنتخَب مَن لو عُرف لما صُوِّت له، والبيانُ وحده كلامٌ يُكتب بلا عناء. فصار
 * اسمُه وجنسُه وصورتُه في البطاقة، و**الصوتُ وحده يبقى سرّيًّا**. والملفُّ الانتخابيّ منه:
 * القاعدةُ تُخرجه (`get_ballot_candidates`) والدلو يأذن للناخب بقراءته (`can_voter_read_election_file`).
 */
export type BallotCandidate = {
  id: string; number: number; statement: string;
  /** اسمُه كما في ملفّه، و`null` لمن لا ملفَّ له (لا يُختلَق له اسم). */
  name: string | null;
  /** لجنس الفعل في البطاقة («المرشّحة») ولرسم الوجه حين لا صورة. */
  gender: string | null;
  avatarUrl: string | null;
  /** مسارٌ في دلو `election-files` لا رابطًا — يُفتح برابطٍ موقَّعٍ مؤقّت (`candidateFile.ts`). */
  fileUrl: string | null; fileName: string | null;
  fileSize: number | null; fileMime: string | null;
  /**
   * **ورقتُك أنت**: القاعدةُ تحسبها من `auth.uid()` فلا يعرفها إلّا صاحبُها، ولا تُفشي اسمًا.
   * وبها تُعلَّم ورقتُه في البطاقة وتُنزع عنها رقعةُ الاختيار، فتقول اللائحةُ كلمتَها قبل
   * أن يمدّ يدَه، لا سطرًا أحمرَ بعد ضغطه.
   */
  isSelf: boolean;
};

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
  const rows = (data ?? []) as ElectionRpcRow[];
  // أصواتُك أنت (سياسةُ `votes_select_self`): القائمُ منها يختم البطاقة، والباطلُ بانتهاء ترشّحٍ يفتحها من جديد.
  const mine = new Map<string, { live: boolean; voided: boolean }>();
  if (rows.length) {
    const ids = rows.map((r) => r.election_id);
    const fresh = await session.from("election_votes").select("election_id, voided_at, void_reason").eq("voter_id", userId).in("election_id", ids);
    if (fresh.error) return { items: [], error: fresh.error.message };
    for (const v of (fresh.data ?? []) as { election_id: string; voided_at: string | null; void_reason: string | null }[]) {
      const m = mine.get(v.election_id) ?? { live: false, voided: false };
      if (!v.voided_at) m.live = true;
      else if (v.void_reason === "candidacy_ended") m.voided = true;
      mine.set(v.election_id, m);
    }
  }
  const items: VoteItem[] = rows.map((r) => {
    const m = mine.get(r.election_id);
    return {
      electionId: r.election_id, position: positionOf(lbl(r.target_role_name), r.target_role_name, r.target_committee_ar, r.target_department_ar),
      votingEnd: fmtDateTime(r.voting_end ?? null), votingEndRaw: r.voting_end ?? null,
      hasVoted: m ? m.live : !!r.has_voted,
      viewOnly: !!r.view_only,
      revote: !!m && !m.live && m.voided,
    };
  });
  return { items, error: null };
}

/**
 * صوتُك أنت بعد ختمه — **يُرى لصاحبه وحدَه** (سياسة `votes_select_self`: `voter_id = auth.uid()`).
 * السرّيّةُ حجبُ صوتك عن غيرك لا عنك، ومن ختم بطاقتَه له أن يطمئنّ بمَن أدلى.
 *
 * ورأيان لا ثالثَ لهما بعد نزع الامتناع (٢٠٢٦-٠٨-١٥)، وكلُّ ورقةٍ تقع على مرشّح
 * (`candidate_id NOT NULL` في القاعدة).
 */
export type MyVote = { candidateId: string; choice: "approve" | "reject" };

/** حِملُ صفحة الاقتراع: المقعدُ ومرشّحوه وصوتُك إن ختمت، أو سببُ تعذّرها. */
export type BallotContext = { ok: boolean; error: string | null; election: VoteItem | null; candidates: BallotCandidate[]; myVote: MyVote | null };

/**
 * بطاقةُ اقتراعٍ كاملةً لصفحتها — **الأهليّةُ تُقرأ من قائمة المفتوح له لا من ظنّ**: من ليس
 * المقعدُ في قائمته لا يرى بطاقتَه، ومن صوّت يبقى في قائمته بعلامة `hasVoted` فيدخل مطّلِعًا
 * لا مصوّتًا. والقاعدةُ تحرس ما وراء ذلك (`get_ballot_candidates` ترفض غير المؤهَّل،
 * و`cast_vote` ترفض الصوتَ الثاني)، فهذه الصفحةُ عرضٌ لا حارسٌ ثانٍ.
 */
export async function getBallot(userId: string, electionId: string): Promise<BallotContext> {
  const { items, error } = await getVoteElections(userId);
  if (error) return { ok: false, error, election: null, candidates: [], myVote: null };
  const election = items.find((e) => e.electionId === electionId) ?? null;
  if (!election) return { ok: false, error: "هذا الاقتراع غير مفتوحٍ لك الآن.", election: null, candidates: [], myVote: null };

  const session = await createClient();
  const { data, error: e } = await session.rpc("get_ballot_candidates", { p_election: electionId });
  if (e) return { ok: false, error: e.message, election, candidates: [], myVote: null };

  /**
   * **ورقتُك تُعرَف بمن تُعرض له لا بمن يحمل الجلسة**: القاعدةُ تحسب `is_self` من
   * `auth.uid()`، وفي **المعاينة كعضو** (`getCurrentAdmin`) تبقى الجلسةُ للمعايِن فتقول
   * القاعدةُ «ليست ورقتَك» بحقّ. فيُسأل عن صاحب الورقة بمفتاح الخدمة **في الخادم وحدَه**،
   * ولا يعبر إلى المتصفّح إلّا `isSelf` نعمًا أو لا.
   * (ولا تُمرَّر هويّةٌ إلى دالّةٍ فتصدّقها : `auth.uid()` يبقى وحدَه حَكَمَ الفعل.)
   */
  const svc = service();
  const mineRes = svc ? await svc.from("election_candidates").select("id").eq("election_id", electionId).eq("user_id", userId).eq("status", "approved").maybeSingle() : null;
  const mineId = (mineRes?.data?.id as string | undefined) ?? null;

  type Row = { candidate_id: string; candidate_number: number; full_name: string | null; gender: string | null; avatar_url: string | null; statement_ar: string; file_url: string | null; file_name: string | null; file_size_bytes: number | null; file_mime: string | null; is_self: boolean };
  const candidates: BallotCandidate[] = ((data ?? []) as Row[]).map((c) => ({
    id: c.candidate_id, number: c.candidate_number, statement: c.statement_ar,
    name: c.full_name ?? null, gender: c.gender ?? null, avatarUrl: c.avatar_url ?? null,
    fileUrl: c.file_url ?? null, fileName: c.file_name ?? null,
    fileSize: c.file_size_bytes ?? null, fileMime: c.file_mime ?? null,
    isSelf: !!c.is_self || c.candidate_id === mineId,
  }));

  // صوتُك المختوم يُقرأ بعميل الجلسة : السياسةُ تأذن لصاحبه وحدَه، فلا حاجةَ لمفتاح خدمةٍ
  // ولا لنخلٍ في الواجهة. ولا يُطلَب إلّا لمن ختم، فلا نداءَ زائدٌ في كلّ فتحة.
  let myVote: MyVote | null = null;
  if (election.hasVoted) {
    // الصوتُ القائمُ وحده (الباطلُ يبقى في الجدول بعد إعادة التصويت)
    const vRes = await session.from("election_votes").select("candidate_id, vote_choice")
      .eq("election_id", electionId).eq("voter_id", userId).is("voided_at", null).maybeSingle();
    const v = vRes.data;
    if (v?.candidate_id) myVote = { candidateId: v.candidate_id, choice: (v.vote_choice ?? "approve") as MyVote["choice"] };
  }

  return { ok: true, error: null, election, candidates, myVote };
}

type AuditRow = { event_type: string; payload: Record<string, unknown> | null; created_at: string };

/**
 * حدثُ السجلّ من القاعدة → محطّةُ رحلة. الجملةُ والرسمُ من المعجم الواحد (`log.ts`)، وهذا
 * يضيف تاريخَها ولا يضيف فاعلَها: رحلةُ العضو تقول ما جرى لا مَن أجراه (قرار المالك).
 */
function toStep(r: AuditRow): JourneyStep {
  const f = describeEvent(r, { audience: "member" });
  return { kind: f.kind, label: f.label, date: fmtDateTime(r.created_at), note: f.note ?? undefined };
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
  const candIds = rows.map((r) => r.candidate_id);
  // ما زاد في الدفعات: المهلةُ والأسبابُ على الترشّح، والتجميدُ القائم، وسببُ الإلغاء.
  type Extra = { id: string; edit_due_at: string | null; reject_reason: string | null; end_reason: string | null; ended_at: string | null };
  type FRow = { id: number; candidate_id: string; status: string; reason: string; answer_due: string | null; answer_text: string | null; answered_at: string | null; decide_due: string | null };
  const [extraRes, freezeRes, cancelRes, meRes] = await Promise.all([
    svc.from("election_candidates").select("id, edit_due_at, reject_reason, end_reason, ended_at").in("id", candIds),
    svc.from("election_freezes").select("id, candidate_id, status, reason, answer_due, answer_text, answered_at, decide_due").in("candidate_id", candIds).in("status", ["active", "answered"]),
    svc.from("election_audit_log").select("election_id, payload, created_at").in("election_id", electionIds).eq("event_type", "cancelled").order("created_at", { ascending: false }),
    svc.from("profiles").select("gender").eq("id", userId).maybeSingle(),
  ]);
  for (const r of [extraRes, freezeRes]) if (r.error) return { items: [], error: r.error.message };
  const extraOf = new Map(((extraRes.data ?? []) as Extra[]).map((x) => [x.id, x]));
  const freezeOf = new Map(((freezeRes.data ?? []) as FRow[]).map((f) => [f.candidate_id, f]));
  const cancelOf = new Map<string, { reason: string; atRaw: string }>();
  for (const c of (cancelRes.data ?? []) as { election_id: string; payload: { reason?: string } | null; created_at: string }[]) {
    if (!cancelOf.has(c.election_id)) cancelOf.set(c.election_id, { reason: c.payload?.reason ?? "", atRaw: c.created_at });
  }
  const gender = ((meRes.data?.gender as string | null) === "female" ? "female" : (meRes.data?.gender as string | null) === "male" ? "male" : null);

  const [elecRes, approvedRes, trailRes] = await Promise.all([
    svc.from("elections").select("id, winner_candidate_id").in("id", electionIds),
    // كم معتمَدًا في كلّ انتخاب — به يُعرَف أنّ الترشّح وحيدٌ فالتصويتُ عليه تزكية
    svc.from("election_candidates").select("election_id").in("election_id", electionIds).eq("status", "approved"),
    Promise.all(rows.map((r) => session.rpc("get_candidate_audit_trail", { p_candidate: r.candidate_id }))),
  ]);
  const winnerOf = new Map(((elecRes.data ?? []) as { id: string; winner_candidate_id: string | null }[]).map((x) => [x.id, x.winner_candidate_id]));
  const approvedCount = new Map<string, number>();
  for (const a of (approvedRes.data ?? []) as { election_id: string }[]) {
    approvedCount.set(a.election_id, (approvedCount.get(a.election_id) ?? 0) + 1);
  }

  const items: CandidacyJourney[] = rows.map((r, i) => {
    const isWinner = winnerOf.get(r.election_id) === r.candidate_id;
    const position = positionOf(lbl(r.target_role_name), r.target_role_name, r.target_committee_ar, r.target_department_ar);
    const sole = r.candidate_status === "approved" && approvedCount.get(r.election_id) === 1;
    const x = extraOf.get(r.candidate_id);
    const fz = freezeOf.get(r.candidate_id);
    const freeze: MemberFreeze | null = fz && r.candidate_status === "frozen" ? {
      id: fz.id, status: fz.status as MemberFreeze["status"], reason: fz.reason,
      answerDueRaw: fz.answer_due, answerText: fz.answer_text, answeredAtRaw: fz.answered_at, decideDueRaw: fz.decide_due,
    } : null;
    const cancel = r.election_status === "cancelled" ? cancelOf.get(r.election_id) ?? null : null;
    const facts = {
      editDueRaw: r.candidate_status === "needs_edit" ? x?.edit_due_at ?? null : null,
      rejectReason: (r.candidate_status === "rejected" ? x?.reject_reason ?? null : null) as RejectReason | null,
      endReason: (r.candidate_status === "ended" ? x?.end_reason ?? null : null) as EndReason | null,
      endedAtRaw: r.candidate_status === "ended" ? x?.ended_at ?? null : null,
      freeze, cancel,
    };
    const view = statusView({
      status: r.candidate_status, election: r.election_status, isWinner, position, sole, gender,
      editDueRaw: facts.editDueRaw, rejectReason: facts.rejectReason, endReason: facts.endReason, freeze, cancelReason: cancel?.reason ?? null,
    });
    const audit = ((trailRes[i]?.data ?? []) as AuditRow[]).slice().sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0));
    // ترشّحٌ بلا سجلٍّ (سبق نظامَ السجلّ): محطّةٌ واحدةٌ تُقال بلفظ المعجم نفسِه
    const trail: JourneyStep[] = audit.length ? audit.map(toStep) : [{ kind: "submit", label: "تقدّمت للمقعد", date: "" }];
    // مآلُ التصويت محطّةٌ ختاميّة (ليست في سجلّ المرشّح): فوزٌ أو انتهاء
    if (r.election_status === "completed" && r.candidate_status === "approved") {
      // خطابُ الرحلة لصاحبها، فمآلُها يُقال له لا عنه (أمرُ المالك ٢٠٢٦-٠٨-١٤)
      trail.push(isWinner ? { kind: "win", label: "فُزت بالمقعد", date: "" } : { kind: "end", label: "لم تُوفَّق للمقعد", date: "" });
    }
    // الدورةُ من موعد الانتخاب نفسِه (لا من تقديمِ العضو) فيتّحد اسمُها لكلّ مرشّحيه
    const cycle = fmtMonthYear(r.candidacy_end ?? r.submitted_at);
    // الأرشفةُ باستقرار المآل لا بحال الانتخاب وحدَه: المنسحبُ لا ينتظر شيئًا ولو بقي البابُ مفتوحًا
    const archived =
      r.candidate_status === "withdrawn" || r.candidate_status === "rejected" || r.candidate_status === "ended" ||
      r.election_status === "completed" || r.election_status === "cancelled" || !!r.election_archived_at;
    return {
      candidateId: r.candidate_id, electionId: r.election_id, position,
      cycle: cycle ? `دورة ${cycle}` : "", archived,
      submittedIso: r.submitted_at,
      number: r.candidate_number, status: r.candidate_status,
      statusLabel: view.label, statusTone: view.tone, next: view.next, future: view.future,
      statement: r.statement_ar, fileUrl: r.file_url ?? null, fileName: r.file_name ?? null,
      trail, canEdit: !!r.can_edit, canWithdraw: !!r.can_withdraw,
      ...facts,
    };
  });
  return { items, error: null };
}

/** الحرمانُ القائمُ من الترشّح، أو `null`. يُقرأ بمفتاح الخدمة لصاحبه (سياسةُ الجدول تأذن له وللمديرين). */
export async function getCandidacyBan(userId: string): Promise<{ ban: CandidacyBan | null; error: string | null }> {
  const svc = service();
  if (!svc) return { ban: null, error: "إعداد الخادم ناقص (مفتاح الخدمة)." };
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Riyadh" });
  const r = await svc.from("candidacy_bans").select("id, reason, until_date").eq("user_id", userId).is("lifted_at", null)
    .gte("until_date", today).order("until_date", { ascending: false }).limit(1).maybeSingle();
  if (r.error) return { ban: null, error: r.error.message };
  return { ban: r.data ? { id: r.data.id as number, reason: r.data.reason as string, until: r.data.until_date as string } : null, error: null };
}

/**
 * نتيجةُ المقعد للعضو (ع١١، ورابطُ إشعار الإعلان `/dashboard/elections/vote/[id]`): الفائزُ أو من عُيّن، بلا
 * مجاميع ولا أرقام. واسمُ الفائز معلَنٌ للنادي كلّه (وهو في الهيكل بعد الإسناد)، فلا يُحرس بأكثر من الجلسة.
 */
export async function getSeatResult(electionId: string): Promise<{ result: SeatResult | null; error: string | null }> {
  const svc = service();
  if (!svc) return { result: null, error: "إعداد الخادم ناقص (مفتاح الخدمة)." };
  const eRes = await svc.from("elections")
    .select("id, target_role_name, target_committee_id, target_department_id, status, winner_candidate_id, winner_declared_at, archived_at, completed_by, appointed_user_id")
    .eq("id", electionId).maybeSingle();
  if (eRes.error) return { result: null, error: eRes.error.message };
  if (!eRes.data) return { result: null, error: "الانتخاب غير موجود." };
  const e = eRes.data as typeof eRes.data & { completed_by?: string | null; appointed_user_id?: string | null };

  const [labels, unitRes] = await Promise.all([
    roleLabelMap(svc),
    e.target_committee_id != null
      ? svc.from("committees").select("committee_name_ar").eq("id", e.target_committee_id).maybeSingle()
      : svc.from("departments").select("name_ar").eq("id", e.target_department_id ?? -1).maybeSingle(),
  ]);
  const unit = (unitRes.data as { committee_name_ar?: string; name_ar?: string } | null);
  const position = positionOf(labels.get(e.target_role_name), e.target_role_name, unit?.committee_name_ar ?? null, unit?.name_ar ?? null);

  const completedBy = (e.completed_by ?? (e.winner_candidate_id ? "winner" : null)) as SeatResult["completedBy"];
  let personId: string | null = null;
  let sole = false;
  if (e.status === "completed" && completedBy === "winner" && e.winner_candidate_id) {
    const w = await svc.from("election_candidates").select("user_id").eq("id", e.winner_candidate_id).maybeSingle();
    personId = (w.data?.user_id as string | undefined) ?? null;
    const n = await svc.from("election_candidates").select("id", { count: "exact", head: true }).eq("election_id", electionId).eq("status", "approved");
    sole = (n.count ?? 0) === 1;
  } else if (e.status === "completed" && completedBy === "appointment") {
    personId = e.appointed_user_id ?? null;
  }
  const p = personId ? (await svc.from("profiles").select("full_name, gender, avatar_url").eq("id", personId).maybeSingle()).data : null;

  let cancel: SeatResult["cancel"] = null;
  if (e.status === "cancelled") {
    const l = await svc.from("election_audit_log").select("payload, created_at").eq("election_id", electionId).eq("event_type", "cancelled")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (l.data) cancel = { reason: ((l.data.payload ?? {}) as { reason?: string }).reason ?? "", atRaw: l.data.created_at as string };
  }
  return {
    result: {
      electionId, position, status: e.status as ElectionStatus, completedBy,
      person: p ? { name: p.full_name as string, gender: (p.gender as string | null) ?? null, avatarUrl: (p.avatar_url as string | null) ?? null } : null,
      sole, atRaw: e.status === "completed" ? (e.winner_declared_at ?? e.archived_at ?? null) : null, cancel,
      winnerCandidateId: e.status === "completed" && completedBy === "winner" ? (e.winner_candidate_id as string | null) ?? null : null,
    },
    error: null,
  };
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
// الترشّح القائم (المادة ٢)، ومنه المجمَّد — يطابق `_is_live_candidacy` في القاعدة.
const LIVE_CANDIDACY = ["pending", "approved", "needs_edit", "frozen"];

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
  // والمطلوبُ تعديلُه يعدّل في مهلته ولو أُغلق الباب (المادة 14، الدفعة الثانية)
  const meRes = await svc.from("election_candidates").select("id, statement_ar, file_name, file_url, status, edit_due_at").eq("election_id", electionId).eq("user_id", userId).maybeSingle();
  const me = meRes.data as (typeof meRes.data & { edit_due_at?: string | null }) | null;
  const editWindow = me?.status === "needs_edit"
    && (e.status === "candidacy_open" || e.status === "candidacy_closed")
    && (!me.edit_due_at || new Date(me.edit_due_at).getTime() > Date.now());
  const existing = me ? {
    candidateId: me.id as string,
    statement: (me.statement_ar as string | null) ?? "",
    fileName: (me.file_name as string | null) ?? null,
    fileUrl: (me.file_url as string | null) ?? null,
    canEdit: (e.status === "candidacy_open" && me.status === "pending") || editWindow,
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

/**
 * **ورقةُ المقعد بعد إعلانه لمن كان فيها** (`SeatOutcome`): يراها **من صوّت فيه أو ترشّح له** وحدَه — هؤلاء رأوا المرشّحين بأسمائهم
 * وبياناتهم (المادة ٥: «ناخبو المقعد على المرشّحين المعتمَدين»، و«كلٌّ منهم على صوته»). ومن سواهم يرى الفائزَ وحده (`SeatResultRoom`)،
 * فيُرجَع `null`. ويُقرأ بمفتاح الخدمة **في الخادم** لأنّ `get_ballot_candidates` للورقة المفتوحة وحدها، ولا يعبر إلى المتصفّح إلّا ما رآه.
 * والمرشّحون: المعتمَدون يومَ الإعلان والفائز، لا من انتهى ترشّحه أو انسحب.
 */
export async function getSeatOutcome(userId: string, r: SeatResult): Promise<SeatOutcome | null> {
  if (r.status !== "completed" || !r.winnerCandidateId) return null;
  const svc = service();
  if (!svc) return null;
  const [cRes, vRes] = await Promise.all([
    svc.from("election_candidates")
      .select("id, user_id, candidate_number, status, statement_ar, file_url, file_name, file_size_bytes, file_mime")
      .eq("election_id", r.electionId),
    svc.from("election_votes").select("candidate_id, vote_choice")
      .eq("election_id", r.electionId).eq("voter_id", userId).is("voided_at", null).maybeSingle(),
  ]);
  if (cRes.error) return null;
  type Row = { id: string; user_id: string; candidate_number: number; status: string; statement_ar: string; file_url: string | null; file_name: string | null; file_size_bytes: number | null; file_mime: string | null };
  const all = (cRes.data ?? []) as Row[];
  const ranHere = all.some((c) => c.user_id === userId);
  const v = vRes.data as { candidate_id: string | null; vote_choice: string | null } | null;
  if (!ranHere && !v) return null;

  const rows = all.filter((c) => c.status === "approved" || c.id === r.winnerCandidateId);
  const pRes = rows.length ? await svc.from("profiles").select("id, full_name, gender, avatar_url").in("id", rows.map((c) => c.user_id)) : null;
  const prof = new Map(((pRes?.data ?? []) as { id: string; full_name: string | null; gender: string | null; avatar_url: string | null }[]).map((p) => [p.id, p]));
  const candidates: BallotCandidate[] = rows.sort((a, b) => a.candidate_number - b.candidate_number).map((c) => {
    const p = prof.get(c.user_id);
    return {
      id: c.id, number: c.candidate_number, statement: c.statement_ar,
      name: p?.full_name ?? null, gender: p?.gender ?? null, avatarUrl: p?.avatar_url ?? null,
      fileUrl: c.file_url, fileName: c.file_name, fileSize: c.file_size_bytes, fileMime: c.file_mime,
      isSelf: c.user_id === userId,
    };
  });
  const myVote: MyVote | null = v?.candidate_id ? { candidateId: v.candidate_id, choice: (v.vote_choice ?? "approve") as MyVote["choice"] } : null;
  const winner = all.find((c) => c.id === r.winnerCandidateId);
  return {
    election: { electionId: r.electionId, position: r.position, votingEnd: "", votingEndRaw: null, hasVoted: !!myVote, viewOnly: false, revote: false },
    candidates, myVote, winnerId: r.winnerCandidateId, youWon: winner?.user_id === userId, declaredRaw: r.atRaw,
  };
}
