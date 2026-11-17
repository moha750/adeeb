"use client";

/**
 * **أبوابُ الانتخاب الثلاثة للعضو** على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠٤) — السلوكُ سلوكُ `elections/{run,vote,my}/*View.tsx`
 * القديمة: كرتٌ لكلّ انتخابٍ بفعله الواحد، والدخولُ إلى صفحته (البيان، والبطاقة، والرحلة) لا نافذة.
 *
 * - **الترشُّح**: انتخاباتٌ مفتوحةٌ لترشّحه — «ترشّح» يفتح بوّابةَ الشروط (`TermsGate`) ثمّ صفحةَ البيان، ومن ترشّح شارتُه «ترشّحُك مُقدَّم»
 *   وزرُّه «افتح ترشّحي».
 * - **صوّت الآن**: «صوّت» يفتح بطاقتَه صفحةً، ومن صوّت أو كان مرشّحَ المقعد الوحيد يدخل مطّلعًا («افتح الانتخاب»).
 * والحالُ شارةٌ في كلّ كرت، والزرُّ للفعل وحده (محمد ٢٠٢٦-١١-٠٤).
 * - **سِجلّ ترشُّحي**: القائمُ والمؤرشف موضعان، والحالُ شارةٌ بنغمتها ورمز مآلها، و«افتح الترشّح» إلى رحلته.
 *
 * والكعبُ يومُ الموعد كغرفة الإدارة (يومُ الإنشاء هناك): نهايةُ باب الترشّح أو التصويت، ويومُ التقديم في السجلّ. والعدّادُ الحيّ
 * سطرٌ تحته («يتبقّى يومان و3 ساعات»)، يبدأ بعد الترطيب كما كان.
 */
import type { RoomView } from "../view";
import { MY_CANDIDACIES_ROOM, RUN_ROOM, VOTE_ROOM } from "./member-elections.meta";
import { useEffect, useState, type ReactNode } from "react";
import { matchesSearch } from "@adeeb/design-system";
import { CalendarBlank, CalendarX, Clock, FlagCheckered, Hourglass, PenNib, Scales, Trophy } from "@phosphor-icons/react";
import { CheckCircle, Checks, Eye, PencilSimple, Prohibit, XCircle } from "@/app/_components/glyphs";
import { TermsGate } from "@/app/dashboard/elections/_member/TermsGate";
import { remain } from "@/app/dashboard/elections/_member/Countdown";
import { useElectionApi } from "@/app/dashboard/elections/actions-context";
import type { CandidacyJourney, RecordTone, RunItem, VoteItem } from "@/app/dashboard/elections/member-data";
import type { ArForms } from "@/lib/arabicCount";
import { AdActs, AdBadge, AdButton, AdCard, AdRow, type AdMeta, type AdTone } from "../primitives";
import { CollectionRoom, type Position } from "../collection";
import { dayParts } from "../format";

const AR_ELECTION: ArForms = ["انتخابٌ واحد", "انتخابان", "انتخابات", "انتخابًا"];
const AR_CANDIDACY: ArForms = ["ترشّحٌ واحد", "ترشّحان", "ترشّحات", "ترشّحًا"];

/** ساعةُ العدّاد: لا زمنَ قبل الترطيب (زمنُ الخادم غيرُ زمن المتصفّح)، ثمّ تدقّ كلَّ ثانية — كـ`Countdown` القديم. */
function useTick(): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}
/** سطرُ ما تبقّى من الموعد — يغيب قبل الترطيب وحين لا موعد. */
const leftLine = (iso: string | null, now: number | null): AdMeta[] => {
  if (!iso || now === null) return [];
  const end = new Date(iso).getTime();
  if (Number.isNaN(end)) return [];
  const ms = end - now;
  return [{ icon: <Hourglass />, text: ms <= 0 ? "انتهى الوقت" : `يتبقّى ${remain(ms)}` }];
};
/** الكعب: يومُ الموعد وشهرُه، وبلا موعدٍ قماشُه وحده. */
const dayStub = (iso: string | null | undefined) => {
  if (!iso) return undefined;
  const d = dayParts(iso);
  return { big: d.day, small: d.month };
};
const dayTable = (label: string) => ({ head: "المنصب", stub: { key: "date", label, icon: <CalendarBlank /> }, columns: [] });

/* ── الترشُّح ──────────────────────────────────────────────────────────── */

export function RunRoom({ items, view }: { items: RunItem[]; serverNow: number; view?: RoomView }) {
  const now = useTick();
  const api = useElectionApi();
  const [gate, setGate] = useState<{ electionId: string; position: string } | null>(null);

  const info = (e: RunItem): AdMeta[] => [
    { icon: <CalendarX />, text: e.candidacyEnd ? `بابُ التقدّم على الترشّح ينتهي: ${e.candidacyEnd}` : "باب الترشّح مفتوح" },
    ...leftLine(e.candidacyEndRaw, now),
  ];
  /**
   * **الحالُ شارةٌ في كلّ كرت، والزرُّ للفعل وحده** (محمد ٢٠٢٦-١١-٠٤، بعد «صوّت الآن»): كان «ترشّحت» زرًّا أخضرَ معطَّلًا يحمل الحال —
   * فصارت شارةً («ترشّحُك مُقدَّم»: لا تذكيرَ فيها ولا تأنيث، و«ترشّحت» تُقرأ «هي ترشّحت»)، وزرُّه «افتح ترشّحي» إلى صفحته في سجلّ الترشّح. ومن لم يترشّح شارتُه «مفتوح لترشّحك» وزرُّه «ترشّح» (بوّابةُ الشروط).
   */
  const chips = (e: RunItem) => (e.hasSubmission
    ? <AdBadge tone="ok" icon={<CheckCircle />}>ترشّحُك مُقدَّم</AdBadge>
    : <AdBadge tone="info" icon={<PenNib />}>مفتوح لترشّحك</AdBadge>);
  const act = (e: RunItem, inRow?: boolean): ReactNode => e.hasSubmission
    ? <AdButton variant="soft" size="sm" icon={<Eye />} onClick={() => api.nav(`/dashboard/elections/my/${e.electionId}`)}>افتح ترشّحي</AdButton>
    : <AdButton variant={inRow ? "soft" : "fill"} size="sm" icon={<PencilSimple />} onClick={() => setGate({ electionId: e.electionId, position: e.position })}>ترشّح</AdButton>;

  return (
    <>
      <CollectionRoom<RunItem>
        navPath={RUN_ROOM.navPath}
        title={RUN_ROOM.title}
        noun={AR_ELECTION}
        items={items}
        positions={[]}
        searchPlaceholder="ابحث بالمنصب…"
        matchSearch={(e, q) => matchesSearch(q, e.position)}
        viewKey={RUN_ROOM.viewKey}
        initialView={view}
        idOf={(e) => e.electionId}
        table={dayTable("ينتهي")}
        emptyAll={{ title: "لا ترشّح مفتوح الآن", desc: "حين يُفتح بابُ ترشّحٍ لمنصبٍ في نطاقك، يظهر هنا لتقدّم بيانك." }}
        renderCard={(e) => <AdCard key={e.electionId} seed={e.electionId} stub={dayStub(e.candidacyEndRaw)} chips={chips(e)} title={e.position} meta={info(e)} foot={act(e)} />}
        renderRow={(e) => <AdRow key={e.electionId} title={e.position} stub={{ ...dayStub(e.candidacyEndRaw), seed: e.electionId }} badge={chips(e)} sub={info(e)} cells={[]} acts={act(e, true)} />}
      />
      <TermsGate target={gate} onClose={() => setGate(null)} />
    </>
  );
}

/* ── صوّت الآن ─────────────────────────────────────────────────────────── */

export function VoteRoom({ items, view }: { items: VoteItem[]; serverNow: number; view?: RoomView }) {
  const now = useTick();
  const api = useElectionApi();

  const info = (e: VoteItem): AdMeta[] => [
    { icon: <CalendarX />, text: e.votingEnd ? `باب التصويت ينتهي: ${e.votingEnd}` : "التصويت مفتوح" },
    ...leftLine(e.votingEndRaw, now),
  ];
  /**
   * **الحالُ شارةٌ في كلّ كرت، والزرُّ للفعل وحده** (محمد ٢٠٢٦-١١-٠٤: «اطّلع» لم تُفهم، ثمّ «لماذا شارةٌ لواحدٍ والبقيّةُ بلا شارة؟»):
   * «بانتظار صوتك»، أو «صوتُك مُسجَّل»، أو «أنت مرشّحُه الوحيد» (برمز الترشّح من الشريط). والزرُّ «صوّت» لمن ينتظر صوتَه، و«افتح الانتخاب»
   * لمن يدخل مطّلعًا — من صوّت، ومرشّحُ المقعد الوحيد الذي لا يُوعَد بصندوقٍ لا يجده.
   */
  const chips = (e: VoteItem) =>
    e.viewOnly ? <AdBadge tone="info" icon={<PenNib />}>أنت مرشّحُه الوحيد</AdBadge>
      : e.hasVoted ? <AdBadge tone="ok" icon={<CheckCircle />}>صوتُك مُسجَّل</AdBadge>
      : <AdBadge tone="warn" icon={<Clock />}>بانتظار صوتك</AdBadge>;
  const act = (e: VoteItem, inRow?: boolean): ReactNode => {
    const go = () => api.nav(`/dashboard/elections/vote/${e.electionId}`);
    if (e.viewOnly || e.hasVoted) return <AdButton variant="soft" size="sm" icon={<Eye />} onClick={go}>افتح الانتخاب</AdButton>;
    return <AdButton variant={inRow ? "soft" : "fill"} size="sm" icon={<Checks />} onClick={go}>صوّت</AdButton>;
  };

  return (
    <CollectionRoom<VoteItem>
      navPath={VOTE_ROOM.navPath}
      title={VOTE_ROOM.title}
      noun={AR_ELECTION}
      items={items}
      positions={[]}
      searchPlaceholder="ابحث بالمنصب…"
      matchSearch={(e, q) => matchesSearch(q, e.position)}
      viewKey={VOTE_ROOM.viewKey}
      initialView={view}
      idOf={(e) => e.electionId}
      table={dayTable("ينتهي")}
      emptyAll={{ title: "لا تصويت مفتوح الآن", desc: "حين يُفتح بابُ تصويتٍ في نطاقك، يظهر هنا لتدلي بصوتك." }}
      renderCard={(e) => <AdCard key={e.electionId} seed={e.electionId} stub={dayStub(e.votingEndRaw)} chips={chips(e)} title={e.position} meta={info(e)} foot={act(e)} />}
      renderRow={(e) => <AdRow key={e.electionId} title={e.position} stub={{ ...dayStub(e.votingEndRaw), seed: e.electionId }} badge={chips(e)} sub={info(e)} cells={[]} acts={act(e, true)} />}
    />
  );
}

/* ── سِجلّ ترشُّحي ─────────────────────────────────────────────────────── */

/** رمزُ المآل في شارة الحال — كما كان رمزَ الكرت القديم. */
const iconOf = (c: CandidacyJourney) =>
  c.statusLabel === "فائز" ? <Trophy /> :
  c.statusLabel === "مرفوض" ? <XCircle /> :
  c.statusLabel === "منسحب" ? <Prohibit /> :
  c.statusLabel === "لم يُوفَّق" ? <FlagCheckered /> :
  c.statusLabel === "يحتاج تعديلًا" ? <PencilSimple /> :
  c.statusLabel === "معتمَد" ? <Scales /> : <Clock />;
const TONE: Record<RecordTone, AdTone> = { success: "ok", danger: "bad", warning: "warn", info: "info", neutral: "neutral" };
/**
 * **الشارةُ تتكلّم عن ترشّحه** (محمد ٢٠٢٦-١١-٠٤: «معتمَد، مرفوض… ليست واضحة»): كلمةُ الحال وحدها لا تقول ما الذي اعتُمد، و«معتمَد»
 * كلمةٌ إداريّة — فالفاعلُ ترشّحُه، كـ«ترشّحُك مُقدَّم» في غرفة الترشّح، فلا تذكيرَ فيها ولا تأنيث («فائز» و«منسحب» كانتا مذكّرتين).
 * وهي لهذه الغرفة وحدها: غرفةُ الإدارة تبقى بكلمات الحال القصيرة (`vocab.ts`).
 */
const MINE: Record<string, string> = {
  "قيد المراجعة": "ترشّحُك قيد المراجعة",
  "يحتاج تعديلًا": "ترشّحُك يحتاج تعديلًا",
  "معتمَد": "ترشّحُك مقبول",
  "مرفوض": "ترشّحُك مرفوض",
  "منسحب": "ترشّحُك مسحوب",
  "فائز": "ترشّحُك فائز",
  "لم يُوفَّق": "لم يُوفَّق ترشّحُك",
};

/**
 * **القائمُ والمؤرشف موضعان** (كانا قسمين بعنوانيهما): ما ينتظر فعلَك أو نتيجتَه، وما استقرّ مآلُه — فلا يزاحم المنقضي ما يطلبك.
 */
const POSITIONS: Position<CandidacyJourney>[] = [
  { key: "live", label: "القائم الآن", match: (c) => !c.archived, empty: "لا ترشّحَ قائمٌ الآن." },
  { key: "archived", label: "المؤرشف", match: (c) => c.archived, empty: "لا ترشّحَ في الأرشيف." },
];

export function MyCandidaciesRoom({ items, view }: { items: CandidacyJourney[]; serverNow: number; view?: RoomView }) {
  const api = useElectionApi();
  const open = (c: CandidacyJourney) => api.nav(`/dashboard/elections/my/${c.electionId}`);
  const chips = (c: CandidacyJourney) => <AdBadge tone={TONE[c.statusTone]} icon={iconOf(c)}>{MINE[c.statusLabel] ?? c.statusLabel}</AdBadge>;
  // لا سطرَ «دورة نوفمبر 2026» (محمد ٢٠٢٦-١١-٠٤): الكعبُ يومُ التقديم وشهرُه، فكان السطرُ يكرّره — والبحثُ بالدورة باقٍ
  const acts = (c: CandidacyJourney, inRow?: boolean) => (
    <AdActs inRow={inRow} primary={{ label: "افتح الترشّح", icon: <Eye />, onClick: () => open(c) }} ops={[]} />
  );

  return (
    <CollectionRoom<CandidacyJourney>
      navPath={MY_CANDIDACIES_ROOM.navPath}
      title={MY_CANDIDACIES_ROOM.title}
      noun={AR_CANDIDACY}
      items={items}
      positions={POSITIONS}
      defaultPosition="live"
      searchPlaceholder="ابحث بالمنصب أو الدورة…"
      matchSearch={(c, q) => matchesSearch(q, `${c.position} ${c.cycle}`)}
      viewKey={MY_CANDIDACIES_ROOM.viewKey}
      initialView={view}
      idOf={(c) => c.candidateId}
      table={dayTable("قُدّم في")}
      emptyAll={{ title: "لا ترشّحات بعد", desc: "حين تترشّح لانتخابٍ، يظهر هنا كرتُه: حالُه، وبابُه إلى رحلته وبيانك." }}
      renderCard={(c) => <AdCard key={c.candidateId} seed={c.candidateId} stub={dayStub(c.submittedIso)} chips={chips(c)} title={c.position} onOpen={() => open(c)} foot={acts(c)} />}
      renderRow={(c) => <AdRow key={c.candidateId} title={c.position} onOpen={() => open(c)} stub={{ ...dayStub(c.submittedIso), seed: c.candidateId }} badge={chips(c)} cells={[]} acts={acts(c, true)} />}
    />
  );
}
