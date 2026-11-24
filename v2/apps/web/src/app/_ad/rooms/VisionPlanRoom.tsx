"use client";

/**
 * **محرّرُ الرؤية على «المنضدة»** (دورةُ حياة الرؤية، محمد ٢٠٢٦-١١-٢٢: «نبني كل شيء من الآن») — قالبُ مساحة العمل كمحرّر الأنظمة
 * ومنشئ الاستبيان: حالُ المسوّدة وفعلُها التالي تنبيهًا فوق التحرير، ثمّ الأقسام: الرؤيةُ (اسمُها وموعداها)، وكلُّ مسارٍ قسمٌ بأهدافه
 * قطعًا تُطوى وتُسحب، والعلامةُ (رسمُ المصمّم بملفّ SVG: طبقةٌ لكلّ مسار وقطعةٌ لكلّ هدف؛ والهلالُ المبنيّ لرؤية الهلال وحدها)، و«فكرة الشعار» بطاقاتٍ.
 * **والمنضدةُ صفحةُ الرؤية العامّةُ نفسُها** (`/frame/vision`) بما يُكتب الآن، والمعاينةُ في المبدّل على كلّ شاشة: الصفحةُ طويلة.
 *
 * والدورة: تكتبها إدارةُ الضمان والجودة (`draft_vision`) وتحفظها، ثمّ ترسلها للرئيسين فتُقفل للكتابة؛ يوافقان معًا (مقعدًا لا قدرة)
 * أو يُعيدها أحدهما بملاحظةٍ تصل كاتبَها؛ وحين يوافقان تُطلَق إن لم تكن في أدِيب رؤيةٌ سارية. والقيودُ كلُّها في القاعدة.
 */
import { useId, useState, useTransition, type KeyboardEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Modal, Textarea } from "@adeeb/design-system";
import {
  CalendarBlank, ClockCounterClockwise, FileSvg, Flag, FloppyDisk, Hash, Link as LinkIcon, ListNumbers, NotePencil, PaperPlaneTilt,
  FlagCheckered, Megaphone, Quotes, RocketLaunch, Shapes, Stack, Stamp, Tag, Target, TextAlignRight, UserCircle, UsersThree,
} from "@phosphor-icons/react";
import { visionSpan } from "@/lib/vision/span";
import { ArrowCounterClockwise, ArrowDown, ArrowSquareOut, ArrowUUpLeft, ArrowUp, Check, Eye, PencilSimple, Plus, Trash } from "@/app/_components/glyphs";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { VisionMark } from "@/app/vision/_parts/VisionMark";
import { trackIcon } from "@/app/vision/_parts/trackIcon";
import type { VisionStageDraft } from "@/app/frame/vision/VisionFrame";
import type { PlanAccess, PlanDoc, PlanGoal, PresidentSeat } from "@/app/dashboard/vision/plans/data";
import { saveVisionTeam } from "@/app/dashboard/vision/actions";
import type { CreditPerson } from "@/lib/people";
import { VisionTeamList, VisionTeamWindow, missingSeats, seatTitle, type TeamSeat } from "./visionTeam";
import { planAct, savePlan, type PlanAct, type PlanInput, type PlanResult } from "@/app/dashboard/vision/plans/actions";
import { markConstruct, markMismatch, type VisionMarkShape } from "@/lib/vision/mark";
import { parseMarkSvg } from "@/lib/vision/svgMark";
import type { PublicVision, StoryCard } from "@/lib/vision/types";
import { TRACK_ICONS, TRACK_ICON_LABEL, VISION_PATH, isTrackIcon } from "@/lib/vision/vocab";
import { arCount, type ArForms } from "@/lib/arabicCount";
import { AdButton, AdConfirm, AdEmpty, AdInfo, AdNote } from "../primitives";
import { FormChoice, FormHint, FormSection } from "../form";
import { SortArea, SortItem } from "../reorder";
import { StageFrame, WorkBlock, WorkRoom, useLeaveGuard } from "../workspace";
import { AdUpload } from "../upload";
import { AdLog } from "../log";
import { AR_LOG, visionLogEvent, visionLogSame } from "./visionLog";
import { PLANS_PATH, PLAN_STATUS } from "./VisionPlansRoom";

const AR_GOAL: ArForms = ["هدفٌ واحد", "هدفان", "أهداف", "هدفًا"];
const AR_PIECE: ArForms = ["قطعةٌ واحدة", "قطعتان", "قطع", "قطعةً"];
const AR_LAYER: ArForms = ["طبقةٌ واحدة", "طبقتان", "طبقات", "طبقةً"];
const ORDINAL = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع", "الثامن"];
/** المقعدُ بلا صاحبٍ يُعرف جنسُه («بانتظار موافقة الرئاسة التنفيذية»)، وبصاحبه بجنسه */
const SEAT_PLACE: Record<PresidentSeat, string> = { club_president: "رئاسة أدِيب", executive_council_president: "الرئاسة التنفيذية" };
/** اسمُ المسار في الجمل: «مسار التمكين»، وقبل أن يُسمّى «المسار الأول» */
const trackLabel = (name: string, i: number) => (name.trim() ? `مسار ${name.trim()}` : `المسار ${ORDINAL[i] ?? i + 1}`);
const SEAT_NAME: Record<PresidentSeat, [string, string]> = {
  club_president: ["رئيس أدِيب", "رئيسة أدِيب"],
  executive_council_president: ["الرئيس التنفيذي", "الرئيسة التنفيذية"],
};
const SEATS = Object.keys(SEAT_NAME) as PresidentSeat[];
const ART_ITEMS: { value: StoryCard["art"]; label: string }[] = [
  { value: "all", label: "العلامة كلّها" },
  { value: "layers", label: "طبقة وطبقة" },
  { value: "one", label: "قطعة واحدة" },
];

type GoalD = PlanGoal & { key: string };
type TrackD = { key: string; name: string; summary: string; icon: string; goals: GoalD[] };
type StoryD = StoryCard & { key: string };
type Draft = Omit<PlanInput, "tracks" | "stories" | "team"> & { tracks: TrackD[]; stories: StoryD[]; team: TeamSeat[] };

const EMPTY_GOAL: PlanGoal = { cluster: "", title: "", detail: "", target: "", owner: "", baseline: "", dueOn: "" };

function fromDoc(d: PlanDoc): Draft {
  return {
    name: d.name, slug: d.slug, startsOn: d.startsOn, startsLabel: d.startsLabel, horizonOn: d.horizonOn, horizonLabel: d.horizonLabel, slogan: d.slogan,
    mark: d.mark, markNoun: d.markNoun, ideaDeck: d.ideaDeck,
    stories: d.stories.map((s, i) => ({ ...s, key: `s${i}` })),
    tracks: d.tracks.map((t, i) => ({ key: `t${i}`, name: t.name, summary: t.summary, icon: t.icon, goals: t.goals.map((g, j) => ({ ...g, key: `g${i}-${j}` })) })),
    // مقعدُ قائد المسار بمفتاح مساره في المحرّر، فيتبعه إن تقدّم المسارُ أو تأخّر
    team: d.team.map((x) => ({ ...x, track: x.track === null ? null : `t${x.track - 1}` })),
  };
}
/** بلا مفتاح الرسم: ما يُحفظ وما يُقارَن به «ما لم يُحفظ» */
function bare<T extends { key: string }>(x: T): Omit<T, "key"> {
  const { key, ...rest } = x;
  void key;
  return rest;
}
const toInput = (d: Draft): PlanInput => ({
  ...d,
  stories: d.stories.map(bare),
  tracks: d.tracks.map((t) => ({ ...bare(t), goals: t.goals.map(bare) })),
  // المقعدُ بترتيب مساره ساعةَ الحفظ، ومقعدُ مسارٍ حُذف يسقط معه
  team: d.team.flatMap((x) => {
    const pos = x.track === null ? null : d.tracks.findIndex((t) => t.key === x.track) + 1;
    if (pos === 0) return [];
    return [x.profileId
      ? { role: x.role, track: pos, profileId: x.profileId, name: null, gender: null }
      : { role: x.role, track: pos, profileId: null, name: x.name, gender: x.gender }];
  }),
});
const teamTracks = (d: Draft) => d.tracks.map((t, i) => ({ key: t.key, label: trackLabel(t.name, i), icon: t.icon }));

/** الرؤيةُ كما ستُنشر — للمنضدة: أهدافُها كلُّها «لم يبدأ»، وفريقُها كما سُمّي في المسوّدة */
function toPublic(d: Draft, ro: boolean): PublicVision {
  return {
    slug: d.slug || "draft", name: d.name || "رؤيةٌ جديدة", starts_on: d.startsOn, starts_label: d.startsLabel.trim() || null,
    horizon_label: d.horizonLabel.trim() || null, horizon_on: d.horizonOn, slogan: d.slogan.trim() || null, status: "active",
    // ما لم يُرفع ملفُّه لا يُعرض بهلالٍ ليس له (مسوّدةٌ قديمةٌ حُفظت بالهلال): مكانُ العلامة فارغٌ حتى يُرفع
    mark: hasMarkFile(d.mark) || ro ? d.mark : { kind: "svg", viewBox: "0 0 1 1", layers: [] }, mark_noun: d.markNoun || "العلامة", idea_deck: d.ideaDeck || null,
    stories: d.stories.filter((s) => s.title.trim() && s.text.trim()).map(bare),
    tracks: d.tracks.map((t, i) => ({
      position: i + 1, name: t.name || `المسار ${ORDINAL[i] ?? i + 1}`, summary: t.summary, icon: t.icon,
      goals: t.goals.map((g, j) => ({
        id: -(i * 100 + j + 1), cluster: g.cluster.trim() || null, title: g.title || "هدفٌ جديد", detail: g.detail.trim() || null,
        target: g.target || "المستهدف", owner: g.owner || "المسؤول", due_on: g.dueOn || null, status: "pending" as const, done_at: null,
      })),
    })),
    // الفريقُ كما سُمّي: الصورةُ لصاحب الحساب، ولا رابطَ لصفحةٍ في المعاينة
    team: d.team.flatMap((x, n) => {
      const pos = x.track === null ? null : d.tracks.findIndex((t) => t.key === x.track) + 1;
      return pos === 0 ? [] : [{ id: -(n + 1), role: x.role, track: pos, name: x.name, gender: x.gender, avatar: x.avatar, slug: null }];
    }),
    archive: [],
  };
}

/** ما يمنع الإرسال، جملةً جملة (والقاعدةُ تفحصه أيضًا) */
function blockers(d: Draft): string[] {
  const out: string[] = [];
  if (!d.tracks.length) out.push("لا مسار في الرؤية بعد");
  if (!hasMarkFile(d.mark)) out.push("لم يُرفع ملف العلامة");
  d.tracks.forEach((t, i) => { if (!t.goals.length) out.push(`${trackLabel(t.name, i)} بلا هدف`); });
  const m = hasMarkFile(d.mark) && markMismatch(d.mark, d.tracks.map((t, i) => ({ name: trackLabel(t.name, i), goals: t.goals.length })));
  if (m) out.push("العلامة لا تطابق الأهداف");
  if (d.tracks.length && missingSeats(teamTracks(d), d.team).length) out.push("لم يُسمَّ فريق الرؤية كاملًا");
  return out;
}

/** علامةٌ مرفوعة: الهلالُ المبنيّ لرؤية الهلال وحدها، وكلُّ رؤيةٍ بعدها بملفّ مصمّمها */
const hasMarkFile = (m: VisionMarkShape): m is Extract<VisionMarkShape, { kind: "svg" }> => m.kind === "svg" && m.layers.length > 0;

const goalWarn = (g: PlanGoal) => (!g.title.trim() ? "لم يُكتب عنوانه" : !g.target.trim() ? "ينقصه المستهدف" : !g.owner.trim() ? "ينقصه المسؤول" : undefined);
const move = <T,>(xs: T[], from: number, to: number) => { const a = [...xs]; const [x] = a.splice(from, 1); a.splice(to, 0, x); return a; };

export function VisionPlanRoom({ doc, access, people = [], now }: { doc: PlanDoc; access: PlanAccess; people?: CreditPerson[]; now: number }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [d, setD] = useState<Draft>(() => fromDoc(doc));
  const [saved, setSaved] = useState(() => JSON.stringify(toInput(fromDoc(doc))));
  const [rev, setRev] = useState(doc.rev);
  const [open, setOpen] = useState<string | null>(null);
  const [focusTrack, setFocusTrack] = useState<number | null>(null);
  const [seq, setSeq] = useState(0);
  const [markErr, setMarkErr] = useState<string | null>(null);
  const [markNotes, setMarkNotes] = useState<string[]>([]);
  const [ask, setAsk] = useState<null | "submit" | "launch" | "discard" | "send_back" | "close">(null);
  const [teamOpen, setTeamOpen] = useState(false);
  const [note, setNote] = useState("");
  const [left, setLeft] = useState(false);

  // الكتابةُ لإدارة الضمان والجودة وحدها، والرئيسان يقرآن المسوّدة ويراجعانها (محمد ٢٠٢٦-١١-٢٤)
  const editable = doc.status === "draft" && access.owns;
  const ro = !editable;
  const json = JSON.stringify(toInput(d));
  const dirty = editable && json !== saved;
  const leave = useLeaveGuard(dirty && !pending && !left);
  const key = () => { const n = seq + 1; setSeq(n); return `n${n}`; };
  const patch = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));
  const patchTrack = (k: string, p: Partial<TrackD>) => setD((x) => ({ ...x, tracks: x.tracks.map((t) => (t.key === k ? { ...t, ...p } : t)) }));
  const patchGoal = (tk: string, gk: string, p: Partial<PlanGoal>) =>
    setD((x) => ({ ...x, tracks: x.tracks.map((t) => (t.key === tk ? { ...t, goals: t.goals.map((g) => (g.key === gk ? { ...g, ...p } : g)) } : t)) }));
  const patchStory = (k: string, p: Partial<StoryCard>) => setD((x) => ({ ...x, stories: x.stories.map((s) => (s.key === k ? { ...s, ...p } : s)) }));
  const field = <K extends keyof Draft>(k: K) => (e: { target: { value: string } }) => patch({ [k]: e.target.value } as Partial<Draft>);

  const run = (job: () => Promise<PlanResult>, after?: () => void) => start(async () => {
    const r = await job();
    if (!r.ok) { toast.error(r.message); return; }
    toast.success(r.message);
    after?.();
    router.refresh();
  });
  const save = () => start(async () => {
    const r = await savePlan(doc.id, rev, toInput(d));
    if (!r.ok) { toast.error(r.message); return; }
    toast.success(r.message);
    setSaved(json);
    if (typeof r.rev === "number") setRev(r.rev);
    router.refresh();
  });
  const act = (a: PlanAct, n?: string) => run(() => planAct(doc.id, a, n), () => {
    setAsk(null);
    if (a === "discard") { setLeft(true); router.push(PLANS_PATH); }
    if (a === "launch") { setLeft(true); router.push("/dashboard/vision"); }
  });

  /* ── المسارات والأهداف ── */
  const addTrack = () => {
    const k = key();
    setD((x) => ({ ...x, tracks: [...x.tracks, { key: k, name: "", summary: "", icon: "target", goals: [] }] }));
    requestAnimationFrame(() => document.getElementById(`trk-${k}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const addGoal = (tk: string) => {
    const k = key();
    setD((x) => ({ ...x, tracks: x.tracks.map((t) => (t.key === tk ? { ...t, goals: [...t.goals, { ...EMPTY_GOAL, key: k }] } : t)) }));
    setOpen(k);
  };
  const removeGoal = (tk: string, gk: string) => setD((x) => ({ ...x, tracks: x.tracks.map((t) => (t.key === tk ? { ...t, goals: t.goals.filter((g) => g.key !== gk) } : t)) }));
  const moveGoal = (tk: string, from: string, to: string) => setD((x) => ({
    ...x,
    tracks: x.tracks.map((t) => {
      if (t.key !== tk) return t;
      const a = t.goals.findIndex((g) => g.key === from), b = t.goals.findIndex((g) => g.key === to);
      return a < 0 || b < 0 ? t : { ...t, goals: move(t.goals, a, b) };
    }),
  }));
  const stepGoal = (tk: string, i: number, dir: -1 | 1) => setD((x) => ({ ...x, tracks: x.tracks.map((t) => (t.key === tk ? { ...t, goals: move(t.goals, i, i + dir) } : t)) }));
  // القراءة وحدها: لا مقبض ولا أسهم، فالبلوك يُرسم خارج SortItem
  const goalBlock = (tk: string, g: GoalD, j: number) => (
    <WorkBlock n={j + 1} title={g.title.trim() || "هدفٌ جديد"} untitled={!g.title.trim()}
      sub={[g.target.trim() && `المستهدف: ${g.target.trim()}`, g.owner.trim()].filter(Boolean).join("، ") || undefined}
      warn={open === g.key ? undefined : goalWarn(g)} open={open === g.key} onToggle={() => setOpen(open === g.key ? null : g.key)}
      verb={ro ? { label: "عرض", icon: <Eye /> } : undefined}
      acts={ro ? undefined : <AdButton variant="danger" size="sm" icon={<Trash />} onClick={() => removeGoal(tk, g.key)}>حذف</AdButton>}>
      <GoalFields g={g} ro={ro} patch={(p) => patchGoal(tk, g.key, p)} />
    </WorkBlock>
  );
  const stepTrack = (i: number, dir: -1 | 1) => setD((x) => ({ ...x, tracks: move(x.tracks, i, i + dir) }));
  const [dropTrack, setDropTrack] = useState<TrackD | null>(null);

  /* ── فريقُ الرؤية: يُسمّى في المسوّدة فيُحفظ معها، وفي السارية يُحفظ ساعتَه (لمن يُعدّ الرؤى) ── */
  const liveTeam = doc.status === "active" && access.drafter;
  const canName = editable || liveTeam;
  const saveTeam = (seats: TeamSeat[]) => {
    if (editable) { patch({ team: seats }); setTeamOpen(false); return; }
    const idOf = (k: string | null) => (k === null ? null : doc.trackIds[d.tracks.findIndex((t) => t.key === k)] ?? null);
    run(() => saveVisionTeam(doc.id, seats.map((x) => ({
      role: x.role, trackId: idOf(x.track), profileId: x.profileId, name: x.profileId ? null : x.name, gender: x.profileId ? null : x.gender,
    }))), () => { patch({ team: seats }); setTeamOpen(false); });
  };
  /** ربطُ مقعدٍ مكتوبٍ بحسابٍ باسمٍ قريب: في المسوّدة يُحفظ معها، وفي السارية بتأكيدٍ لأنّ صاحبه يُشعَر ويُبلَّغ بالبريد */
  const [linking, setLinking] = useState<{ seat: TeamSeat; person: CreditPerson & { id: string } } | null>(null);
  const linked = (l: NonNullable<typeof linking>): TeamSeat[] => d.team.map((x) => (x === l.seat
    ? { ...x, profileId: l.person.id, name: l.person.name, gender: l.person.gender === "male" || l.person.gender === "female" ? l.person.gender : null, avatar: l.person.avatarUrl }
    : x));
  const onLink = (seat: TeamSeat, person: CreditPerson & { id: string }) => {
    if (editable) { patch({ team: linked({ seat, person }) }); toast.success(`رُبط المقعد بحساب ${person.name}، واحفظ المسوّدة.`); return; }
    setLinking({ seat, person });
  };
  const linkTitle = linking ? seatTitle(linking.seat.role, linking.seat.track === null ? null : trackLabel(d.tracks.find((t) => t.key === linking.seat.track)?.name ?? "", d.tracks.findIndex((t) => t.key === linking.seat.track)))[linking.person.gender === "female" ? 1 : 0] : "";

  /* ── العلامة ── */
  const pickMark = async (file: File) => {
    setMarkErr(null);
    if (!/\.svg$/i.test(file.name) && file.type !== "image/svg+xml") { setMarkErr("الملف ليس SVG: صدّره من Illustrator بصيغة SVG."); return; }
    const r = parseMarkSvg(await file.text(), file.name);
    if (!r.ok) { setMarkErr(r.error); return; }
    setMarkNotes(r.notes);
    patch({ mark: r.mark });
  };
  const flipLayers = () => d.mark.kind === "svg" && patch({ mark: { ...d.mark, layers: [...d.mark.layers].reverse() } });
  const flipPieces = () => d.mark.kind === "svg" && patch({ mark: { ...d.mark, layers: d.mark.layers.map((l) => [...l].reverse()) } });
  const counts = d.tracks.map((t) => t.goals.length);
  /** الملفُّ المرفوع إن كان، والهلالُ المبنيُّ يُعرض لرؤيته وحدها (مقروءةً) */
  const svgMark = hasMarkFile(d.mark) ? d.mark : null;
  const builtIn = d.mark.kind === "hilal" && ro;
  const mismatch = markMismatch(d.mark, d.tracks.map((t, i) => ({ name: trackLabel(t.name, i), goals: t.goals.length })));
  /** علامةُ المحرّر: الطبقاتُ متناوبةً، فيُرى أيُّ طبقةٍ لأيّ مسار */
  const layered = (d.mark.kind === "svg" ? d.mark.layers.map((l) => l.length) : counts).map((n, k) => Array(n).fill(k % 2 === 0));
  const tileTitles = (d.mark.kind === "svg" ? d.mark.layers.map((l) => l.length) : counts)
    .map((n, k) => Array.from({ length: n }, (_, i) => `الطبقة ${k + 1}${d.tracks[k] ? ` (${trackLabel(d.tracks[k].name, k)})` : ""}، القطعة ${i + 1}${d.tracks[k]?.goals[i] ? `: ${d.tracks[k].goals[i].title || "هدفٌ جديد"}` : ""}`));

  /* ── فكرة الشعار ── */
  const addStory = () => { const k = key(); setD((x) => ({ ...x, stories: [...x.stories, { key: k, title: "", text: "", art: "all" }] })); setOpen(k); };

  /* ── الحال وفعلُها التالي ── */
  const both = doc.approvals.length >= 2;
  const mine = !!access.seat && doc.approvals.some((a) => a.seat === access.seat);
  const block = blockers(d);
  const approvalsLine = SEATS.map((s) => {
    const a = doc.approvals.find((x) => x.seat === s);
    return a ? `${a.female ? "وافقت" : "وافق"} ${SEAT_NAME[s][a.female ? 1 : 0]} (${a.name})` : `بانتظار موافقة ${SEAT_PLACE[s]}`;
  }).join("، ") + ".";
  let lead: ReactNode;
  if (doc.status === "draft") {
    lead = (
      <AdNote tone={doc.returnNote ? "warn" : "info"} title={doc.returnNote ? "أُعيدت المسوّدة بملاحظة" : doc.authorSide !== "qa" ? "مسوّدتك، لا يراها غيرك" : access.seat ? "مسوّدة إدارة الضمان والجودة، يراها الرئيسان لخلوّها" : "مسوّدة، لا يراها غير إدارة الضمان والجودة"}
        action={editable ? <>
          <AdButton variant="fill" size="sm" icon={<PaperPlaneTilt />} busy={pending}
            onClick={() => (dirty ? toast.error("احفظ المسوّدة أولًا، ثمّ أرسلها.") : block.length ? toast.error(`لا تُرسَل بعد: ${block.join("، ")}.`) : setAsk("submit"))}>
            أرسلها للرئيسين
          </AdButton>
          {doc.everSent ? null : <AdButton variant="danger" size="sm" icon={<Trash />} onClick={() => setAsk("discard")}>احذف المسوّدة</AdButton>}
        </> : undefined}>
        {/* الملاحظةُ جملةٌ بنقطتها ثمّ ما ينقص، فلا تلتصق بما بعدها («…رضا الحضور اكتملت للإرسال») */}
        {doc.returnNote ? `الملاحظة: ${/[.!؟?]$/.test(doc.returnNote.trim()) ? doc.returnNote.trim() : `${doc.returnNote.trim()}.`} ` : ""}
        {/* **كلُّ مسوّدةٍ لجهتها** (محمد ٢٠٢٦-١١-٢٤): ومسوّدةُ الإدارة يكتبها الرئيسُ لخلوّها، ويُقال ذلك صريحًا */}
        {editable && access.seat && doc.authorSide === "qa" ? "هذه مسوّدة إدارة الضمان والجودة، تكتبها أنت لخلوّها، ويُذكر ذلك حين تُرسلها. " : ""}
        {!editable ? "تكتبها جهتها، وتصلك للموافقة حين تُرسلها."
          : block.length ? `ينقصها قبل الإرسال: ${block.join("، ")}.` : "اكتملت للإرسال: ترسلها فتُقفل للكتابة حتى يوافق الرئيسان أو يُعيداها."}
      </AdNote>
    );
  } else if (doc.status === "review") {
    lead = (
      <AdNote tone={both ? "ok" : "warn"} title={both ? "وافق الرئيسان" : "عند الرئيسين"}
        action={<>
          {both && (access.seat || access.drafter) ? (
            <AdButton variant="fill" size="sm" icon={<RocketLaunch />} busy={pending}
              onClick={() => (doc.activeOther ? toast.error(`«${doc.activeOther}» سارية: تُطلَق هذه حين تُغلق تلك.`) : setAsk("launch"))}>أطلق الرؤية</AdButton>
          ) : null}
          {access.seat && !mine ? <AdButton variant="fill" size="sm" icon={<Check />} busy={pending} onClick={() => act("approve")}>أوافق على المسوّدة</AdButton> : null}
          {mine ? <AdButton variant="line" size="sm" icon={<ArrowCounterClockwise />} busy={pending} onClick={() => act("unapprove")}>اسحب موافقتي</AdButton> : null}
          {access.seat && !access.owns ? <AdButton variant="line" size="sm" icon={<ArrowUUpLeft />} onClick={() => { setNote(""); setAsk("send_back"); }}>أعدها بملاحظة</AdButton> : null}
          {access.owns ? <AdButton variant="line" size="sm" icon={<ArrowCounterClockwise />} busy={pending} onClick={() => act("recall")}>اسحبها للتعديل</AdButton> : null}
        </>}>
        {doc.submittedBy ? (doc.submittedBySeat
          ? `${doc.submittedByFemale ? "كتبتها وأرسلتها" : "كتبها وأرسلها"} ${SEAT_NAME[doc.submittedBySeat][doc.submittedByFemale ? 1 : 0]} (${doc.submittedBy})${doc.authorSide === "qa" ? " لخلوّ إدارة الضمان والجودة" : ""}. `
          : `أرسلها ${doc.submittedBy}. `) : ""}{approvalsLine}
        {both ? (doc.activeOther ? ` وتُطلَق حين تُغلق «${doc.activeOther}».` : " وتُطلَق متى شئتم، فتصير رؤية أدِيب السارية.") : " ولا تُطلَق حتى يوافق الرئيسان معًا."}
      </AdNote>
    );
  } else {
    lead = (
      <AdNote tone="ok" title={doc.status === "active" ? "سارية" : "منتهية"}
        action={<>
          <AdButton variant="line" size="sm" icon={<ArrowSquareOut />} href={`${VISION_PATH}/${doc.slug}`} external>صفحتها</AdButton>
          {doc.status === "active" ? <AdButton variant="fill" size="sm" icon={<Target />} href="/dashboard/vision">متابعة الرؤية</AdButton> : null}
          {/* **الإغلاقُ قرارٌ كالإطلاق** (محمد ٢٠٢٦-١١-٢٣): لإدارة الضمان والجودة والرئيسين، من هنا لا من «متابعة الرؤية» */}
          {doc.status === "active" && (access.drafter || access.seat) ? <AdButton variant="line" size="sm" icon={<FlagCheckered />} onClick={() => setAsk("close")}>إغلاق الرؤية</AdButton> : null}
        </>}>
        {doc.status === "active" ? "يعمل فريقها على أهدافها في «متابعة الرؤية». ومن هنا يُعدَّل فريقها وتُغلق حين ينتهي موعدها." : "انتهت الرؤية وتجمّدت أهدافها، وتبقى في الأرشيف."}
      </AdNote>
    );
  }

  const stage = d.tracks.length
    ? <StageFrame src="/frame/vision" kind="vision" payload={{ v: toPublic(d, ro), focus: focusTrack } satisfies VisionStageDraft} title="صفحة الرؤية كما ستُرى" />
    : <AdEmpty icon={<Eye />} title="هنا ترى صفحة الرؤية كما ستُرى" desc="أضف مسارًا واحدًا، فتظهر الصفحة هنا وتتبدّل مع كلّ حرف." />;

  const commit = editable
    ? { primary: { label: "حفظ المسوّدة", icon: <FloppyDisk />, onClick: save, busy: pending, held: !dirty }, cancelHref: PLANS_PATH, dirty }
    : undefined;

  return (
    <>
      <WorkRoom look="b" switched path={`${PLANS_PATH}/${doc.id}`} title={d.name || doc.name} commit={commit} lead={lead} stage={stage} stageTitle="صفحة الرؤية كما ستُرى">
        <FormSection id="vision" icon={<Target />} title="الرؤية" sub={`${PLAN_STATUS[doc.status].label}، اسمها وموعداها`}>
          <div className="form-grid">
            <Field innerIcon={<PencilSimple />} className="form-full" label="اسم الرؤية" icon={<Target />} placeholder="رؤية الربيع" value={d.name} onChange={field("name")} maxLength={60} disabled={ro} required />
            <Field className="form-full" label="المعرّف في الرابط" icon={<LinkIcon />} innerIcon={<Hash />} dir="ltr" placeholder="spring" value={d.slug} onChange={field("slug")} maxLength={40} disabled={ro}
              helper={`بحروفٍ إنجليزيّة صغيرة وأرقامٍ وشرطات، ويُقرأ في رابطها: /vision/${d.slug.trim() || "spring"}`} required />
            <Field innerIcon={<PencilSimple />} className="form-full" label="عبارة الرؤية" icon={<Megaphone />} placeholder="معًا نُتمّها" value={d.slogan} onChange={field("slogan")} maxLength={80} disabled={ro}
              helper="سطرٌ قصير تحت اسم الرؤية في رأس صفحتها." optional />
            <Field placeholder="اختر اليوم" innerIcon={<CalendarBlank />} label="تبدأ في" type="date" icon={<CalendarBlank />} value={d.startsOn} onChange={field("startsOn")} disabled={ro} required />
            <Field placeholder="اختر اليوم" innerIcon={<CalendarBlank />} label="تنتهي في" type="date" icon={<CalendarBlank />} value={d.horizonOn} onChange={field("horizonOn")} disabled={ro} required />
            <Field innerIcon={<PencilSimple />} label="موعد البداية بالكلام" icon={<Flag />} placeholder="بداية الفصل الثاني" value={d.startsLabel} onChange={field("startsLabel")} maxLength={40} disabled={ro}
              helper="إن تركته كُتب التاريخ." optional />
            <Field innerIcon={<PencilSimple />} label="موعد النهاية بالكلام" icon={<FlagCheckered />} placeholder="بداية رمضان" value={d.horizonLabel} onChange={field("horizonLabel")} maxLength={40} disabled={ro}
              helper="إن تركته كُتب التاريخ." optional />
            {d.startsOn && d.horizonOn ? <FormHint>يُقرأ في الصفحة: «{visionSpan(d.startsOn, d.startsLabel, d.horizonOn, d.horizonLabel)}».</FormHint> : null}
          </div>
        </FormSection>

        {d.tracks.map((t, i) => (
          <div key={t.key} id={`trk-${t.key}`} onFocusCapture={() => setFocusTrack(i + 1)}>
            <FormSection icon={trackIcon(t.icon)} title={`المسار ${ORDINAL[i] ?? i + 1}${t.name.trim() ? `: ${t.name.trim()}` : ""}`} sub={arCount(t.goals.length, AR_GOAL)}
              act={ro ? undefined : <div className="vz-trk-acts" role="group" aria-label={`أفعال ${trackLabel(t.name, i)}`}>
                {d.tracks.length > 1 ? <>
                  <AdButton variant="line" size="sm" icon={<ArrowUp />} disabled={i === 0} onClick={() => stepTrack(i, -1)}>قدّمه</AdButton>
                  <AdButton variant="line" size="sm" icon={<ArrowDown />} disabled={i === d.tracks.length - 1} onClick={() => stepTrack(i, 1)}>أخّره</AdButton>
                </> : null}
                <AdButton variant="danger" size="sm" icon={<Trash />}
                  onClick={() => (t.goals.length ? setDropTrack(t) : setD((x) => ({ ...x, tracks: x.tracks.filter((y) => y.key !== t.key) })))}>حذف</AdButton>
              </div>}>
              <div className="form-grid">
                <Field innerIcon={<PencilSimple />} className="form-full" label="اسم المسار" icon={<Tag />} placeholder="التمكين" value={t.name} onChange={(e) => patchTrack(t.key, { name: e.target.value })} maxLength={40} disabled={ro} required />
                <IconPick value={t.icon} disabled={ro} onChange={(v) => patchTrack(t.key, { icon: v })} />
                <Textarea innerIcon={<PencilSimple />} className="form-full" label="تعريفه" icon={<TextAlignRight />} placeholder="سطر يعرّف المسار في صفحة الرؤية" rows={2} value={t.summary} onChange={(e) => patchTrack(t.key, { summary: e.target.value })} maxLength={400} disabled={ro} optional />
              </div>
              <div className="ad-wblks">
                {ro ? t.goals.map((g, j) => <div key={g.key} className="ad-wblk-slot">{goalBlock(t.key, g, j)}</div>) : (
                  <SortArea list ids={t.goals.map((g) => g.key)} total={t.goals.length} nameOf={(k) => t.goals.find((g) => g.key === k)?.title.trim() || "هدفٌ جديد"}
                  placeOf={(k) => t.goals.findIndex((g) => g.key === k) + 1} onMove={(a, b) => moveGoal(t.key, a, b)}>
                  {t.goals.map((g, j) => (
                    <div key={g.key} className="ad-wblk-slot">
                      <SortItem id={g.key} label={g.title.trim() || "هدفٌ جديد"} n={j + 1} on={!ro} prev={j > 0} next={j < t.goals.length - 1} onStep={(dir) => stepGoal(t.key, j, dir)}>
                        {goalBlock(t.key, g, j)}
                      </SortItem>
                    </div>
                  ))}
                </SortArea>
                )}
              </div>
              {ro ? null : <span className="ad-wblks-add"><AdButton variant="fill" icon={<Plus />} onClick={() => addGoal(t.key)}>إضافة هدف</AdButton></span>}
            </FormSection>
          </div>
        ))}
        {ro || d.tracks.length >= 8 ? null : <span className="ad-wblks-add"><AdButton variant="line" icon={<Plus />} onClick={addTrack}>إضافة مسار</AdButton></span>}

        {/* **فريقُ الرؤية جزءٌ ممّا يُعتمد** (محمد ٢٠٢٦-١١-٢٣): يُسمّى هنا مع المسوّدة فيوافق عليه الرئيسان معها، ويُعدَّل بعد الإطلاق من هنا */}
        <FormSection id="team" icon={<UsersThree />} title="فريق الرؤية" sub={d.tracks.length ? "المشرف العام وقائد الرؤية وقائد لكل مسار" : "يُسمّى بعد أن تُضاف المسارات"}
          act={canName && d.tracks.length ? <AdButton variant="line" size="sm" icon={<PencilSimple />} onClick={() => setTeamOpen(true)}>{d.team.length ? "تعديل الفريق" : "تسمية الفريق"}</AdButton> : undefined}>
          {d.tracks.length
            ? <VisionTeamList tracks={teamTracks(d)} seats={d.team} pool={people} onLink={canName ? onLink : undefined} />
            : <FormHint>أضف المسارات أولًا: لكل مسار قائده.</FormHint>}
        </FormSection>

        <FormSection id="mark" icon={<Shapes />} title="العلامة" sub="قطعةٌ لكلّ هدف، تُضاء حين يتحقّق">
          <div className="vz-plan-markbody">
          {/* الهلالُ المبنيّ لرؤية الهلال وحدها (محمد ٢٠٢٦-١١-٢٣: «لكلّ رؤيةٍ شعارُها»): لا يُختار، وكلُّ رؤيةٍ بعدها بملفّ مصمّمها */}
          {builtIn ? null : (
            <>
              <AdUpload label="ملف العلامة" icon={<FileSvg />} value={null} noun="file" accept=".svg,image/svg+xml" alt="علامة الرؤية" error={markErr ?? undefined} required
                help="من Illustrator: طبقةٌ لكلّ مسار بترتيبه، وفيها قطعةٌ لكلّ هدف، كلُّ قطعةٍ شكلٌ مغلق. الألوان من الموقع لا من الملف."
                file={svgMark ? { name: svgMark.file || "علامة.svg", meta: `${arCount(svgMark.layers.length, AR_LAYER)}، ${arCount(svgMark.layers.flat().length, AR_PIECE)}`, icon: <FileSvg /> } : null}
                onFile={ro ? undefined : (f) => { void pickMark(f); }} onClear={ro ? undefined : () => { setMarkNotes([]); patch({ mark: { kind: "svg", viewBox: "0 0 1 1", layers: [] } }); }} />
              {markNotes.length ? <FormHint>{markNotes.join(" ")}</FormHint> : null}
            </>
          )}
          {builtIn || svgMark ? (
            <div className="vz-plan-mark">
              <div className="ad-plate vz-idea-art" aria-hidden={false}>
                <VisionMark mark={d.mark} counts={counts} on={layered} titles={tileTitles} label="العلامة بطبقاتها: كلُّ طبقةٍ مسار" />
              </div>
              <ul className="vz-plan-layers" aria-label="الطبقات والمسارات">
                {(d.mark.kind === "svg" ? d.mark.layers.map((l) => l.length) : counts).map((n, k) => {
                  const t = d.tracks[k];
                  const ok = !!t && t.goals.length === n;
                  return (
                    <li key={k}>
                      <AdInfo m={{ icon: <Stack />, text: `الطبقة ${k + 1}: ${t ? trackLabel(t.name, k) : "بلا مسار"}، ${arCount(n, AR_PIECE)}${t ? ` و${arCount(t.goals.length, AR_GOAL)}` : ""}`, tone: d.mark.kind === "hilal" || ok ? undefined : "bad" }} />
                    </li>
                  );
                })}
                {d.mark.kind === "svg" && d.tracks.length > d.mark.layers.length
                  ? d.tracks.slice(d.mark.layers.length).map((t, k) => <li key={`x${k}`}><AdInfo m={{ icon: <Stack />, text: `${trackLabel(t.name, d.mark.kind === "svg" ? d.mark.layers.length + k : k)} بلا طبقة`, tone: "bad" }} /></li>)
                  : null}
              </ul>
              {d.mark.kind === "svg" && !ro ? (
                <div className="vz-plan-flip">
                  <AdButton variant="line" size="sm" icon={<ListNumbers />} onClick={flipLayers}>اعكس ترتيب الطبقات</AdButton>
                  <AdButton variant="line" size="sm" icon={<ArrowDown />} onClick={flipPieces}>اعكس ترتيب القطع</AdButton>
                </div>
              ) : null}
              {mismatch ? <FormHint tone="bad">{mismatch}</FormHint> : null}
            </div>
          ) : null}
          <div className="form-grid">
            <Field innerIcon={<PencilSimple />} label="اسم العلامة في الجمل" icon={<Shapes />} placeholder="الهلال" value={d.markNoun} onChange={field("markNoun")} maxLength={30} disabled={ro}
              helper={`«لكل هدف قطعة في ${d.markNoun.trim() || "الهلال"}»، «${markConstruct(d.markNoun || "الهلال")} ${d.name || "الرؤية"}»`} required />
            <Field innerIcon={<PencilSimple />} label="سطر «فكرة الشعار»" icon={<Quotes />} placeholder="هلال من فسيفساء، يكتمل بما يتحقق من أهداف الرؤية." value={d.ideaDeck} onChange={field("ideaDeck")} maxLength={200} disabled={ro} optional />
          </div>
          </div>
        </FormSection>

        <FormSection id="idea" icon={<Quotes />} title={`فكرة الشعار (${d.stories.length})`} sub="بطاقاتٌ تشرح العلامة في صفحة الرؤية، وبلا بطاقاتٍ لا يظهر القسم">
          <div className="ad-wblks">
            {d.stories.map((s, i) => (
              <div key={s.key} className="ad-wblk-slot">
                <WorkBlock n={i + 1} title={s.title.trim() || "بطاقةٌ جديدة"} untitled={!s.title.trim()} sub={ART_ITEMS.find((a) => a.value === s.art)?.label}
                  warn={open === s.key ? undefined : !s.title.trim() || !s.text.trim() ? "ينقصها عنوانٌ أو نصّ" : undefined}
                  open={open === s.key} onToggle={() => setOpen(open === s.key ? null : s.key)} verb={ro ? { label: "عرض", icon: <Eye /> } : undefined}
                  acts={ro ? undefined : <>
                    <AdButton variant="line" size="sm" icon={<ArrowUp />} disabled={i === 0} onClick={() => setD((x) => ({ ...x, stories: move(x.stories, i, i - 1) }))}>قدّمها</AdButton>
                    <AdButton variant="danger" size="sm" icon={<Trash />} onClick={() => setD((x) => ({ ...x, stories: x.stories.filter((y) => y.key !== s.key) }))}>حذف</AdButton>
                  </>}>
                  <div className="form-grid">
                    <Field innerIcon={<PencilSimple />} className="form-full" label="العنوان" icon={<Tag />} placeholder="لماذا الهلال؟" value={s.title} onChange={(e) => patchStory(s.key, { title: e.target.value })} maxLength={60} disabled={ro} required />
                    <Textarea placeholder="اكتب نصّ البطاقة" innerIcon={<PencilSimple />} className="form-full" label="النصّ" icon={<TextAlignRight />} rows={4} value={s.text} onChange={(e) => patchStory(s.key, { text: e.target.value })} maxLength={600} disabled={ro}
                      helper="«{total}» يصير عدد الأهداف، و«{tracks}» عدد المسارات." required />
                  </div>
                  <FormChoice label="ما يُضاء في علامة البطاقة" disabled={ro} value={s.art} items={ART_ITEMS} onChange={(v) => patchStory(s.key, { art: v as StoryCard["art"] })} />
                </WorkBlock>
              </div>
            ))}
          </div>
          {ro || d.stories.length >= 6 ? null : <span className="ad-wblks-add"><AdButton variant="fill" icon={<Plus />} onClick={addStory}>إضافة بطاقة</AdButton></span>}
        </FormSection>

        {doc.log.length ? (
          <AdLog title="سجلّ الرؤية" icon={<ClockCounterClockwise />} items={doc.log} at={(l) => l.at} idOf={(l) => String(l.id)}
            event={(l) => visionLogEvent(l, [])} same={visionLogSame} noun={AR_LOG} now={now}
            empty={{ title: "لا شيء في السجلّ بعد", text: "منذ تُرسَل المسوّدة للرئيسين يُقيَّد هنا كلُّ فعلٍ فيها بفاعله ووقته." }} />
        ) : null}
      </WorkRoom>

      <AdConfirm open={ask === "submit"} onClose={() => setAsk(null)} tone="success" icon={<PaperPlaneTilt />} title="إرسال المسوّدة للرئيسين؟"
        text="تُقفل للكتابة حتى يوافق الرئيسان معًا أو يُعيدها أحدهما بملاحظة، ويصلهما إشعار. وتستطيع سحبها للتعديل ما لم تُطلَق."
        confirmLabel="أرسلها" loading={pending} onConfirm={() => act("submit")} />
      <AdConfirm open={ask === "launch"} onClose={() => setAsk(null)} tone="success" icon={<RocketLaunch />} title={`إطلاق ${doc.name}؟`}
        text={`تصير رؤية أدِيب السارية، وتظهر في صفحة الرؤية للجميع وفيها ${arCount(d.tracks.reduce((n, t) => n + t.goals.length, 0), AR_GOAL)}، ويُشعَر فريقها بمقاعدهم ليبدأ العمل في «متابعة الرؤية».`}
        confirmLabel="أطلقها" loading={pending} onConfirm={() => act("launch")} />
      {/* **إغلاقُ الرؤية** يدويٌّ عند موعدها: تتجمّد أهدافُها وتنتقل إلى الأرشيف. وما رُفع «أُنجز» يُفصل فيه قبله (والقاعدةُ تمنعه) */}
      <AdConfirm open={ask === "close"} onClose={() => setAsk(null)} tone="warning" icon={<FlagCheckered />} title={`إغلاق ${doc.name}؟`}
        text="تتجمّد أهدافها كما هي، وتنتقل إلى الأرشيف، ولا يُعدَّل فيها شيء بعد الإغلاق. وما رُفع «أُنجز» يُؤكَّد أو يُرجَع قبله."
        confirmLabel="إغلاق الرؤية" loading={pending} onConfirm={() => act("close")} />
      <AdConfirm open={!!linking} onClose={() => setLinking(null)} tone="success" icon={<UsersThree />}
        title={linking ? `ربط «${linking.seat.name}» بحساب ${linking.person.name}؟` : ""}
        text={linking ? `يصير ${linking.person.name} ${linkTitle} في ${doc.name}، ويصله إشعارٌ وبريدٌ بتكليفه، ويدخل «متابعة الرؤية». تأكّد أنّه هو قبل الربط.` : undefined}
        confirmLabel="اربطه" loading={pending}
        onConfirm={() => { if (linking) saveTeam(linked(linking)); setLinking(null); }} />
      <VisionTeamWindow open={teamOpen} onClose={() => setTeamOpen(false)} busy={pending} tracks={teamTracks(d)} seats={d.team} pool={people} onSave={saveTeam} />
      <AdConfirm open={ask === "discard"} onClose={() => setAsk(null)} tone="danger" icon={<Trash />} title="حذف المسوّدة؟"
        text="لم تُرسَل للرئيسين بعد، فتُحذف بمساراتها وأهدافها نهائيًّا." confirmLabel="احذفها" loading={pending} onConfirm={() => act("discard")} />
      <AdConfirm open={!!dropTrack} onClose={() => setDropTrack(null)} tone="danger" icon={<Trash />} title="حذف المسار؟"
        text={dropTrack ? `يُحذف مسار «${dropTrack.name || "بلا اسم"}» بـ${arCount(dropTrack.goals.length, AR_GOAL)} من المسوّدة حين تحفظها.` : undefined}
        confirmLabel="احذفه" onConfirm={() => { if (dropTrack) setD((x) => ({ ...x, tracks: x.tracks.filter((y) => y.key !== dropTrack.key) })); setDropTrack(null); }} />

      <Modal open={ask === "send_back"} onClose={() => setAsk(null)} busy={pending} size="md" title="إعادة المسوّدة"
        description="تعود للكتابة، وتصل ملاحظتك من أرسلها، وتسقط الموافقات."
        footer={<>
          <Button variant="primary" size="md" loading={pending} onClick={() => act("send_back", note)}>أعدها</Button>
          <Button variant="ghost" size="md" onClick={() => setAsk(null)} disabled={pending}>إلغاء</Button>
        </>}>
        <Textarea innerIcon={<PencilSimple />} className="form-full" label="ما يُصلَح فيها" icon={<ArrowUUpLeft />} placeholder="ينقص مسار الأثر هدف الحضور" rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} required />
      </Modal>
      {leave}
    </>
  );
}

/**
 * **رمزُ المسار شبكةً تُختار بالنظر** (محمد ٢٠٢٦-١١-٢٣، بدل قائمة الأسماء): ستّةَ عشرَ رمزًا من أيقونات الموقع نفسها، فلا يُكتب
 * رمزٌ حرٌّ يكسر الهويّة. وهو رمزُ المسار في رأس قسمه هنا وبجانب اسمه في صفحة الرؤية. واسمُ الرمز تلميحُ المتصفّح (`title`)
 * لا تلميحٌ مرسوم: رأسُ القسم يقصّ ما يخرج منه.
 */
function IconPick({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const cur = isTrackIcon(value) ? value : "target";
  const capId = useId();
  // مجموعةُ اختيارٍ واحد: محطّةُ «Tab» واحدةٌ (المختار)، والأسهمُ تتنقّل بين الرموز وتختار — لا ستَّ عشرةَ محطّةً في كلّ مسار
  const step = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const d = { ArrowLeft: 1, ArrowDown: 1, ArrowRight: -1, ArrowUp: -1 }[e.key] ?? 0;
    if (!d) return;
    e.preventDefault();
    const n = (i + d + TRACK_ICONS.length) % TRACK_ICONS.length;
    onChange(TRACK_ICONS[n]);
    (e.currentTarget.parentElement?.children[n] as HTMLElement | undefined)?.focus();
  };
  return (
    <div className="vz-icon-field form-full">
      <p className="vz-icon-cap" id={capId}>رمزه: <b>{TRACK_ICON_LABEL[cur]}</b></p>
      <div className="ad-switch vz-icon-pick" role="radiogroup" aria-labelledby={capId} aria-disabled={disabled || undefined}>
        {TRACK_ICONS.map((k, i) => (
          <button key={k} type="button" role="radio" className={`ad-switch-seg${k === cur ? " is-on" : ""}`} aria-checked={k === cur}
            aria-label={TRACK_ICON_LABEL[k]} title={TRACK_ICON_LABEL[k]} tabIndex={k === cur ? 0 : -1} disabled={disabled && k !== cur}
            onClick={() => !disabled && onChange(k)} onKeyDown={(e) => !disabled && step(e, i)}>
            {trackIcon(k)}
          </button>
        ))}
      </div>
    </div>
  );
}

/** حقولُ الهدف مفتوحًا: عنوانُه وتفصيلُه، ثمّ المستهدفُ والمسؤول، ثمّ العنوانُ الفرعيّ (`cluster`) والموعدُ والواقعُ عند البدء */
function GoalFields({ g, ro, patch }: { g: PlanGoal; ro: boolean; patch: (p: Partial<PlanGoal>) => void }) {
  return (
    <div className="form-grid">
      <Field innerIcon={<PencilSimple />} className="form-full" label="الهدف" icon={<Target />} placeholder="فعالية متوسطة في منتصف كل شهر" value={g.title} onChange={(e) => patch({ title: e.target.value })} maxLength={120} disabled={ro} required />
      <Textarea innerIcon={<PencilSimple />} className="form-full" label="تفصيله" icon={<TextAlignRight />} placeholder="ما يوضح الهدف إن احتاج" rows={2} value={g.detail} onChange={(e) => patch({ detail: e.target.value })} maxLength={300} disabled={ro} optional />
      <Field innerIcon={<PencilSimple />} label="المستهدف" icon={<Flag />} placeholder="3 فعاليات خلال الرؤية" helper="ما يُقاس به تحقّق الهدف." value={g.target} onChange={(e) => patch({ target: e.target.value })} maxLength={120} disabled={ro} required />
      <Field innerIcon={<PencilSimple />} label="المسؤول" icon={<UserCircle />} placeholder="لجنة الفعاليات" value={g.owner} onChange={(e) => patch({ owner: e.target.value })} maxLength={120} disabled={ro} required />
      <Field innerIcon={<PencilSimple />} label="عنوان فرعي في المسار" icon={<Stamp />} placeholder="الفعاليات" helper="الأهداف المتتالية بعنوانٍ واحد تُجمع تحته في صفحة الرؤية." value={g.cluster} onChange={(e) => patch({ cluster: e.target.value })} maxLength={40} disabled={ro} optional />
      <Field placeholder="اختر اليوم" innerIcon={<CalendarBlank />} label="الموعد" type="date" icon={<CalendarBlank />} value={g.dueOn} onChange={(e) => patch({ dueOn: e.target.value })} disabled={ro} optional />
      <Field innerIcon={<PencilSimple />} className="form-full" label="الواقع عند البدء" icon={<NotePencil />} placeholder="للمجلس الإداري، لا يُنشر" helper="لا يظهر في الصفحة العامة." value={g.baseline} onChange={(e) => patch({ baseline: e.target.value })} maxLength={200} disabled={ro} optional />
    </div>
  );
}
