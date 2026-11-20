"use client";

// **سجلُّ الشاشات** — كلُّ صفحةٍ في نظام الانتخابات، مرسومةً بمكوّن الإنتاج نفسِه وبحارسه
// نفسِه. لا نسخةَ ثانية ولا «شبيهُ شاشة»: الغرفةُ هنا هي التي في اللوحة، والفرقُ
// كلُّه أنّ حِملَها من `project.ts` وأفعالَها من `store.tsx`.
// (٢٠٢٦-١١-٢٠) صارت الشاشاتُ كلُّها غرفَ الهويّة الجديدة بعد أن رُفعت، وحُذفت القديمةُ من اللوحة: `ElectionsView`،
// و`ElectionDetailView`، و`RunView`، و`VoteView`، و`MyCandidaciesView`، و`CandidacyDetailView`، والورقةُ القديمة، و`ApplyForm`.
// وأُضيفت صفحةُ الترشّح للمدير (`candidate`)، تُبلَغ من سطر المرشّح لا من الشريط.

import { ClockCounterClockwise } from "@phosphor-icons/react";
import { Alert } from "@adeeb/design-system";
import { ElectionsRoom } from "@/app/_ad/rooms/ElectionsRoom";
import { ElectionRecordRoom, ElectionVotes } from "@/app/_ad/rooms/ElectionRecordRoom";
import { useElectionWindows } from "@/app/_ad/rooms/ElectionWindows";
import { CandidacyRoom } from "@/app/_ad/rooms/CandidacyRoom";
import { MyCandidaciesRoom, RunRoom, VoteRoom } from "@/app/_ad/rooms/MemberElectionsRooms";
import { MyCandidacyRoom } from "@/app/_ad/rooms/MyCandidacyRoom";
import { ApplyRoomAd } from "@/app/_ad/rooms/ApplyRoomAd";
import { BallotRoomAd } from "@/app/_ad/rooms/BallotRoomAd";
import { SeatResultRoom } from "@/app/_ad/rooms/SeatResultRoom";
import { ElectionLog } from "@/app/dashboard/elections/ElectionLog";
import type { ElectionDetail } from "@/app/dashboard/elections/data";
import {
  toApplyContext, toBallot, toCandidacyBan, toCreateOptions, toElectionDetail, toElectionRows,
  toLogEvents, toMyCandidacies, toRunItems, toSeatOutcome, toSeatResult, toVoteDetail, toVoteItems,
} from "./project";
import type { ScreenKey } from "./scenarios";
import { memberOf } from "./org";
import { hasCap, type SimWorld } from "./world";
import { useSim } from "./store";

/* ══ تعريفُ الشاشات ═════════════════════════════════════════════════ */

export type ScreenDef = {
  key: ScreenKey;
  label: string;
  /** المسارُ الحقيقيّ — يُعرَض فوق الشاشة كي يُعرَف أيَّ صفحةٍ تنظر. */
  path: string;
  /** قفلُ الغرفة كما في `lib/capabilities` — من لا يملكه لا يدخل. */
  cap: string;
  /** أتحتاج مقعدًا بعينه؟ */
  needsId?: boolean;
  /** تُبلَغ من رابطٍ في شاشةٍ أخرى (سطرُ المرشّح) لا من شريط الشاشات */
  viaLink?: boolean;
  /**
   * إشارةُ التنقّل (`myScope.elections`) — البابُ لا يظهر في قائمة العضو إلّا بها، وإن كان
   * القفلُ في يده. تُحسب هنا كما تحسبها `get_member_election_signals`.
   */
  signal?: (w: SimWorld, userId: string) => boolean;
};

export const SCREENS: ScreenDef[] = [
  { key: "list", label: "غرفة الانتخابات", path: "/dashboard/elections", cap: "view_election_candidates" },
  { key: "detail", label: "صفحة الانتخاب", path: "/dashboard/elections/[id]", cap: "view_election_candidates", needsId: true },
  { key: "candidate", label: "صفحة الترشّح", path: "/dashboard/elections/[id]/candidates/[cid]", cap: "view_election_candidates", viaLink: true },
  { key: "run", label: "بابُ الترشُّح", path: "/dashboard/elections/run", cap: "run_for_election", signal: (w, u) => toRunItems(w, u).some((r) => !r.hasSubmission) },
  { key: "apply", label: "صفحةُ بيان الترشّح", path: "/dashboard/elections/run/[id]", cap: "run_for_election", needsId: true },
  { key: "my", label: "سِجلّ ترشُّحي", path: "/dashboard/elections/my", cap: "run_for_election", signal: (w, u) => toMyCandidacies(w, u).length > 0 },
  { key: "candidacy", label: "صفحةُ ترشُّحك", path: "/dashboard/elections/my/[id]", cap: "run_for_election", needsId: true },
  { key: "edit", label: "تعديلُ ترشُّحك", path: "/dashboard/elections/my/[id]/edit", cap: "run_for_election", needsId: true },
  { key: "vote", label: "بابُ التصويت", path: "/dashboard/elections/vote", cap: "view_own_membership", signal: (w, u) => toVoteItems(w, u).length > 0 },
  { key: "ballot", label: "ورقةُ التصويت", path: "/dashboard/elections/vote/[id]", cap: "view_own_membership", needsId: true },
];

export const screenOf = (key: ScreenKey) => SCREENS.find((s) => s.key === key)!;

/* ══ الرسم ══════════════════════════════════════════════════════════ */

/** غرفةٌ مقفولة — تقول أيَّ مفتاحٍ ينقص، فتُقرأ نتيجةُ الحارس لا شكلُه. */
function Locked({ cap }: { cap: string }) {
  return (
    <Alert tone="warning" title="هذه الصفحة خارج صلاحيّات هذه الهويّة">
      حارسُ الصفحة يطلب القدرة <b className="font-latin">{cap}</b>، ولا يملكها صاحبُ الهويّة المختارة. بدّل الهويّة من الشريط أعلاه.
    </Alert>
  );
}

/** من ينظر في الاستبعاد: من مقعده لا من قدرته (توأمُ `exclusionViewer` في الخادم) */
function exclusionViewerOf(actorId: string) {
  const role = memberOf(actorId)?.roleName ?? "";
  return { canRequest: role === "hr_admin_member" || role === "hr_committee_leader", isHrLeader: role === "hr_committee_leader" };
}

/** صفحةُ الانتخاب بنوافذها، كما تجمعها `ElectionRecordView` في اللوحة */
function Detail({ e, manager, hrLeader }: { e: ElectionDetail; manager: boolean; hrLeader: boolean }) {
  const { world } = useSim();
  const { on, windows } = useElectionWindows(e, { readOnly: !manager, canAppoint: manager });
  const subject = (id: string) => e.candidates.find((c) => c.id === id)?.name ?? null;
  return (
    <>
      <ElectionRecordRoom election={e} readOnly={!manager} canAppoint={manager} liveTotals={manager} hrLeader={hrLeader} on={on}
        votesView={manager ? <ElectionVotes votes={toVoteDetail(world, e.id)} /> : null}
        logView={<ElectionLog title="سجلّ الانتخاب" icon={<ClockCounterClockwise />} events={toLogEvents(world, e.id)} now={world.now} subjectOf={subject} initial={6} />} />
      {windows}
    </>
  );
}

export function Screen() {
  const { world, actorId, route } = useSim();
  const def = screenOf(route.screen);

  if (!hasCap(world, actorId, def.cap)) return <Locked cap={def.cap} />;

  const canManage = hasCap(world, actorId, "manage_elections");
  const viewer = exclusionViewerOf(actorId);
  const me = memberOf(actorId);

  switch (route.screen) {
    case "list":
      return <ElectionsRoom elections={toElectionRows(world)} createOptions={canManage ? toCreateOptions(world) : null} readOnly={!canManage} serverNow={world.now} />;

    case "detail": {
      const detail = route.id ? toElectionDetail(world, route.id, actorId) : null;
      if (!detail) return <Alert tone="warning" title="تعذّر فتح الانتخاب">لا مقعدَ بهذا المعرّف في هذا السيناريو.</Alert>;
      return <Detail key={`${detail.id}:${actorId}`} e={detail} manager={canManage} hrLeader={viewer.isHrLeader} />;
    }

    case "candidate": {
      const detail = route.id ? toElectionDetail(world, route.id, actorId) : null;
      const c = detail?.candidates.find((x) => x.id === route.cid) ?? null;
      if (!detail || !c) return <Alert tone="warning" title="تعذّر فتح الترشّح">لا ترشّحَ بهذا المعرّف في هذا السيناريو.</Alert>;
      return <CandidacyRoom key={`${c.id}:${actorId}`} election={detail} candidate={c} readOnly={!canManage} viewer={viewer}
        backHref={`/dashboard/elections/${detail.id}`} candidateHref={`/dashboard/elections/${detail.id}/candidates/`} />;
    }

    case "run":
      return <RunRoom items={toRunItems(world, actorId)} ban={toCandidacyBan(world, actorId)} serverNow={world.now} />;

    case "apply":
    case "edit": {
      if (!route.id) return <Alert tone="warning" title="لا مقعد">اختر مقعدًا أوّلًا.</Alert>;
      const ctx = toApplyContext(world, actorId, route.id);
      if (!ctx.ok) return <Alert tone="warning" title="تعذّر فتح صفحة الترشّح">{ctx.error ?? "هذا الانتخاب غير متاحٍ للترشّح الآن."}</Alert>;
      // `key` يُعيد تركيبَ النموذج عند تبديل المقعد أو الهويّة، فلا يرث مسوّدةَ من قبله
      return <ApplyRoomAd key={`${route.id}:${actorId}:${ctx.existing?.candidateId ?? "new"}`} ctx={ctx} userId={actorId}
        me={{ name: me?.name ?? "عضو", avatarUrl: null, gender: me?.gender ?? null }} />;
    }

    case "my":
      return <MyCandidaciesRoom items={toMyCandidacies(world, actorId)} serverNow={world.now} />;

    case "candidacy": {
      const c = toMyCandidacies(world, actorId).find((x) => x.electionId === route.id);
      if (!c) return <Alert tone="warning" title="تعذّر فتح الترشّح">لا ترشّحَ لك في هذا الانتخاب.</Alert>;
      return <MyCandidacyRoom key={c.candidateId} c={c} />;
    }

    case "vote":
      return <VoteRoom items={toVoteItems(world, actorId)} serverNow={world.now} />;

    case "ballot": {
      if (!route.id) return <Alert tone="warning" title="لا مقعد">اختر مقعدًا أوّلًا.</Alert>;
      const b = toBallot(world, actorId, route.id);
      if (b.ok && b.election) return <BallotRoomAd key={`${route.id}:${actorId}`} election={b.election} candidates={b.candidates} myVote={b.myVote} voterId={actorId} />;
      // وبعد الإغلاق نتيجتُه، كما في الصفحة: الورقةُ نفسُها لمن صوّت أو ترشّح، والنتيجةُ القصيرة لمن سواه
      const r = toSeatResult(world, route.id);
      const out = r ? toSeatOutcome(world, actorId, r) : null;
      if (out) return <BallotRoomAd key={`${route.id}:${actorId}:out`} election={out.election} candidates={out.candidates} myVote={out.myVote} voterId={actorId}
        outcome={{ winnerId: out.winnerId, youWon: out.youWon, declaredRaw: out.declaredRaw }} />;
      if (r && (r.status === "completed" || r.status === "cancelled" || r.status === "voting_closed")) return <SeatResultRoom r={r} />;
      return <Alert tone="warning" title="تعذّر فتح الورقة">{b.error ?? "هذا الاقتراع غير مفتوحٍ لك الآن."}</Alert>;
    }

    default:
      return <Alert tone="info" title="شاشةٌ غير معروفة">لا رسمَ لهذه الشاشة.</Alert>;
  }
}
