"use client";

// **سجلُّ الشاشات** — كلُّ صفحةٍ في نظام الانتخابات، مرسومةً بمكوّن الإنتاج نفسِه وبحارسه
// نفسِه. لا نسخةَ ثانية ولا «شبيهُ شاشة»: `ElectionsView` هنا هي التي في اللوحة، والفرقُ
// كلُّه أنّ حِملَها من `project.ts` وأفعالَها من `store.tsx`.

import { Alert } from "@adeeb/design-system";
import { ElectionsView } from "@/app/dashboard/elections/ElectionsView";
import { ElectionDetailView } from "@/app/dashboard/elections/ElectionDetailView";
import { RunView } from "@/app/dashboard/elections/run/RunView";
import { VoteView } from "@/app/dashboard/elections/vote/VoteView";
import { MyCandidaciesView } from "@/app/dashboard/elections/my/MyCandidaciesView";
import { CandidacyDetailView } from "@/app/dashboard/elections/my/[electionId]/CandidacyDetailView";
import { BallotRoom } from "@/app/dashboard/elections/vote/[electionId]/BallotRoom";
import { ApplyForm } from "@/app/dashboard/elections/_member/ApplyForm";
import {
  toApplyContext, toBallot, toCreateOptions, toElectionDetail, toElectionRows,
  toLogEvents, toMyCandidacies, toRunItems, toVoteDetail, toVoteItems,
} from "./project";
import type { ScreenKey } from "./scenarios";
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
  /**
   * إشارةُ التنقّل (`myScope.elections`) — البابُ لا يظهر في قائمة العضو إلّا بها، وإن كان
   * القفلُ في يده. تُحسب هنا كما تحسبها `get_member_election_signals`.
   */
  signal?: (w: SimWorld, userId: string) => boolean;
};

export const SCREENS: ScreenDef[] = [
  { key: "list", label: "غرفة الانتخابات", path: "/dashboard/elections", cap: "view_election_candidates" },
  { key: "detail", label: "صفحة الانتخاب", path: "/dashboard/elections/[id]", cap: "view_election_candidates", needsId: true },
  { key: "run", label: "بابُ الترشُّح", path: "/dashboard/elections/run", cap: "run_for_election", signal: (w, u) => toRunItems(w, u).some((r) => !r.hasSubmission) },
  { key: "apply", label: "صفحةُ بيان الترشّح", path: "/dashboard/elections/run/[id]", cap: "run_for_election", needsId: true },
  { key: "my", label: "سِجلّ ترشُّحي", path: "/dashboard/elections/my", cap: "run_for_election", signal: (w, u) => toMyCandidacies(w, u).length > 0 },
  { key: "candidacy", label: "صفحةُ ترشُّحك", path: "/dashboard/elections/my/[id]", cap: "run_for_election", needsId: true },
  { key: "edit", label: "تعديلُ ترشُّحك", path: "/dashboard/elections/my/[id]/edit", cap: "run_for_election", needsId: true },
  { key: "vote", label: "بابُ التصويت", path: "/dashboard/elections/vote", cap: "view_own_membership", signal: (w, u) => toVoteItems(w, u).length > 0 },
  { key: "ballot", label: "بطاقةُ الاقتراع", path: "/dashboard/elections/vote/[id]", cap: "view_own_membership", needsId: true },
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

export function Screen() {
  const { world, actorId, route } = useSim();
  const def = screenOf(route.screen);

  if (!hasCap(world, actorId, def.cap)) return <Locked cap={def.cap} />;

  const canManage = hasCap(world, actorId, "manage_elections");

  switch (route.screen) {
    case "list":
      return (
        <ElectionsView
          elections={toElectionRows(world)}
          createOptions={canManage ? toCreateOptions(world) : null}
          readOnly={!canManage}
        />
      );

    case "detail": {
      const detail = route.id ? toElectionDetail(world, route.id) : null;
      if (!detail) return <Alert tone="warning" title="تعذّر فتح الانتخاب">لا مقعدَ بهذا المعرّف في هذا السيناريو.</Alert>;
      return (
        <ElectionDetailView
          election={detail}
          log={toLogEvents(world, detail.id)}
          votes={canManage ? toVoteDetail(world, detail.id) : []}
          readOnly={!canManage}
        />
      );
    }

    case "run":
      return <RunView items={toRunItems(world, actorId)} error={null} />;

    case "apply":
    case "edit": {
      if (!route.id) return <Alert tone="warning" title="لا مقعد">اختر مقعدًا أوّلًا.</Alert>;
      const ctx = toApplyContext(world, actorId, route.id);
      if (!ctx.ok) return <Alert tone="warning" title="تعذّر فتح صفحة الترشّح">{ctx.error ?? "هذا الانتخاب غير متاحٍ للترشّح الآن."}</Alert>;
      // `key` يُعيد تركيبَ النموذج عند تبديل المقعد أو الهويّة، فلا يرث مسوّدةَ من قبله
      return <ApplyForm key={`${route.id}:${actorId}:${ctx.existing?.candidateId ?? "new"}`} ctx={ctx} userId={actorId} />;
    }

    case "my":
      return <MyCandidaciesView items={toMyCandidacies(world, actorId)} error={null} />;

    case "candidacy": {
      const c = toMyCandidacies(world, actorId).find((x) => x.electionId === route.id);
      if (!c) return <Alert tone="warning" title="تعذّر فتح الترشّح">لا ترشّحَ لك في هذا الانتخاب.</Alert>;
      return <CandidacyDetailView c={c} />;
    }

    case "vote":
      return <VoteView items={toVoteItems(world, actorId)} error={null} />;

    case "ballot": {
      if (!route.id) return <Alert tone="warning" title="لا مقعد">اختر مقعدًا أوّلًا.</Alert>;
      const b = toBallot(world, actorId, route.id);
      if (!b.ok || !b.election) return <Alert tone="warning" title="تعذّر فتح البطاقة">{b.error ?? "هذا الاقتراع غير مفتوحٍ لك الآن."}</Alert>;
      return <BallotRoom key={`${route.id}:${actorId}`} election={b.election} candidates={b.candidates} myVote={b.myVote} />;
    }

    default:
      return <Alert tone="info" title="شاشةٌ غير معروفة">لا رسمَ لهذه الشاشة.</Alert>;
  }
}
