import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";
import { HILAL, isMarkShape, type VisionMarkShape } from "@/lib/vision/mark";
import type { StoryCard } from "@/lib/vision/types";
import { readLog, type VisionLogRow } from "../data";

/**
 * **بياناتُ «الرؤى»** (دورةُ حياة الرؤية، محمد ٢٠٢٦-١١-٢٢: «نبني كل شيء من الآن») — بمفتاح الخدمة بعد باب القسم: قائمةُ الرؤى كلِّها
 * بحالها (مسوّدة، عند الرئيسين، سارية، منتهية)، ومسوّدةٌ واحدةٌ بكلّ ما فيها لمحرّرها. يدخلها من يُعدّ الرؤى (`draft_vision`) والرئيسان.
 */
export type PlanStatus = "draft" | "review" | "active" | "closed";
export type PresidentSeat = "club_president" | "executive_council_president";
export const PLAN_SEATS: PresidentSeat[] = ["club_president", "executive_council_president"];

/**
 * **كلُّ مسوّدةٍ لجهتها** (محمد ٢٠٢٦-١١-٢٤: «من ينشئ المسودة تظهر له هو لوحده»): `writer` من يُنشئ رؤيةً (إدارةُ الضمان والجودة والرئيسان)،
 * و`owns` من يكتب في هذه المسوّدة ويرسلها ويسحبها (`vision_can_write`): مسوّدةُ الإدارة لأعضائها كلِّهم، ومسوّدةُ الرئيس له وحده.
 * و`qaStaffed`: إن خلت الإدارةُ كتب الرئيسان مسوّداتِها، فلا تبقى يتيمة.
 */
export type PlanAccess = { userId: string; drafter: boolean; writer: boolean; owns: boolean; qaStaffed: boolean; president: boolean; seat: PresidentSeat | null };
/** جهةُ المسوّدة (`visions.author_side`) */
export type AuthorSide = "qa" | PresidentSeat;

/** يرى المسوّدةَ قبل إرسالها جهتُها وحدها (ومسوّدةَ الإدارة الرئيسان إن خلت) — كما في `vision_can_see`؛ وما أُرسل يراه الجميع */
export function seesPlan(p: { status: PlanStatus; authorSide: AuthorSide }, a: PlanAccess): boolean {
  if (p.status !== "draft") return a.drafter || a.president;
  if (!a.writer) return false;
  return p.authorSide === "qa" ? !a.seat || !a.qaStaffed : a.seat === p.authorSide;
}

export type PlanListItem = {
  id: number; slug: string; name: string; status: PlanStatus;
  startsOn: string; startsLabel: string; horizonOn: string; horizonLabel: string;
  tracks: number; goals: number; done: number;
  approvals: PresidentSeat[];
  markKind: VisionMarkShape["kind"];
  authorSide: AuthorSide;
};

export type PlanGoal = { cluster: string; title: string; detail: string; target: string; owner: string; baseline: string; dueOn: string };
export type PlanTrack = { name: string; summary: string; icon: string; goals: PlanGoal[] };

export type PlanSeat = {
  role: "supervisor" | "leader" | "track"; track: number | null;
  profileId: string | null; name: string; gender: "male" | "female" | null; avatar: string | null;
};

export type PlanDoc = {
  id: number; slug: string; name: string; status: PlanStatus;
  /** جهتُها: تُكتب لها وحدها، ولا يراها غيرُها قبل الإرسال */
  authorSide: AuthorSide;
  /** نسخةُ المسوّدة (`plan_rev`): يُحفظ عليها، ومن حفظ على قديمةٍ يُردّ */
  rev: number;
  /** موعدا البداية والنهاية بالكلام («بداية رمضان»)، والفارغُ يُقرأ تاريخًا؛ والشعارُ سطرٌ تحت الاسم */
  startsOn: string; startsLabel: string; horizonOn: string; horizonLabel: string; slogan: string;
  mark: VisionMarkShape; markNoun: string; ideaDeck: string; stories: StoryCard[];
  tracks: PlanTrack[];
  /** معرّفُ كلّ مسارٍ في القاعدة بترتيبه (لتسمية فريق الرؤية السارية) */
  trackIds: number[];
  /**
   * **فريقُ الرؤية** (محمد ٢٠٢٦-١١-٢٣: يُسمّى في المسوّدة فيُعتمد معها): `track` ترتيبُ المسار (١…) لقائد المسار، و`null` للمشرف والقائد.
   * الاسمُ كما يُعرض: من الملفّ للحساب، والمكتوبُ لغيره.
   */
  team: PlanSeat[];
  approvals: { seat: PresidentSeat; name: string; female: boolean }[];
  submittedBy: string | null; submittedAt: string | null;
  /** مقعدُ من أرسلها إن كان رئيسًا (كتبها لخلوّ إدارة الضمان والجودة): يُقال في رأسها */
  submittedBySeat: PresidentSeat | null; submittedByFemale: boolean;
  returnNote: string | null;
  /** أُرسل للرئيسين مرّةً: لا يُحذف بعدها، ويُروى كلُّ حفظٍ فيه */
  everSent: boolean;
  /** رؤيةٌ ساريةٌ الآن غيرُها (لا تُطلَق هذه حتى تُغلق تلك) */
  activeOther: string | null;
  log: VisionLogRow[];
};

function svc() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  return url && key ? createAdeebServiceClient(url, key) : null;
}
const asSeat = (s: unknown): PresidentSeat | null => (s === "club_president" || s === "executive_council_president" ? s : null);
const asStatus = (s: unknown): PlanStatus => (s === "review" || s === "active" || s === "closed" ? s : "draft");

export async function planAccess(userId: string, vision = 0): Promise<PlanAccess | null> {
  const sb = svc();
  if (!sb) return null;
  const { data } = await sb.rpc("vision_access", { p_user: userId, p_vision: vision });
  const a = (data ?? {}) as { president?: boolean; drafter?: boolean; writer?: boolean; owns?: boolean; qa_staffed?: boolean; seat?: string | null };
  return { userId, drafter: !!a.drafter, writer: !!a.writer, owns: !!a.owns, qaStaffed: a.qa_staffed !== false, president: !!a.president, seat: asSeat(a.seat) };
}

export async function getPlans(viewer: PlanAccess): Promise<{ data: PlanListItem[] | null; error: string | null }> {
  const sb = svc();
  if (!sb) return { data: null, error: "إعداد الخادم ناقص (مفتاح الخدمة)." };
  const { data, error } = await sb
    .from("visions")
    .select("id, slug, name, status, author_side, starts_on, starts_label, horizon_on, horizon_label, mark, vision_tracks(id, vision_goals(status)), vision_approvals(seat)")
    .order("starts_on", { ascending: false });
  if (error) return { data: null, error: error.message };
  type Raw = {
    id: number; slug: string; name: string; status: string; author_side: string | null; starts_on: string; starts_label: string | null; horizon_on: string; horizon_label: string | null; mark: unknown;
    vision_tracks: { id: number; vision_goals: { status: string }[] }[]; vision_approvals: { seat: string }[];
  };
  return {
    data: ((data ?? []) as unknown as Raw[]).map((v) => {
      const goals = v.vision_tracks.flatMap((t) => t.vision_goals);
      return {
        id: v.id, slug: v.slug, name: v.name, status: asStatus(v.status),
        startsOn: v.starts_on, startsLabel: v.starts_label ?? "", horizonOn: v.horizon_on, horizonLabel: v.horizon_label ?? "",
        tracks: v.vision_tracks.length, goals: goals.length, done: goals.filter((g) => g.status === "done").length,
        approvals: v.vision_approvals.map((a) => asSeat(a.seat)).filter((s): s is PresidentSeat => !!s),
        markKind: isMarkShape(v.mark) ? v.mark.kind : "hilal",
        authorSide: (asSeat(v.author_side) ?? "qa") as AuthorSide,
      };
    }).filter((p) => seesPlan(p, viewer)),
    error: null,
  };
}

export async function getPlan(id: number): Promise<{ data: PlanDoc | null; error: string | null }> {
  const sb = svc();
  if (!sb) return { data: null, error: "إعداد الخادم ناقص (مفتاح الخدمة)." };
  const { data: v, error } = await sb
    .from("visions")
    .select("id, slug, name, status, author_side, plan_rev, starts_on, starts_label, horizon_on, horizon_label, slogan, mark, mark_noun, idea_deck, stories, submitted_at, submitted_by, return_note, submitter:profiles!visions_submitted_by_fkey(full_name, gender)")
    .eq("id", id)
    .maybeSingle();
  if (error) return { data: null, error: error.message };
  if (!v) return { data: null, error: null };

  const [{ data: tracks }, { data: approvals }, { data: active }, { count }, { data: seats }] = await Promise.all([
    sb.from("vision_tracks").select("id, position, name, summary, icon, vision_goals(id, position, cluster, title, detail, target, owner, baseline, due_on)").eq("vision_id", id).order("position"),
    sb.from("vision_approvals").select("seat, person:profiles!vision_approvals_user_id_fkey(full_name, gender)").eq("vision_id", id),
    sb.from("visions").select("name").eq("status", "active").neq("id", id).maybeSingle(),
    sb.from("vision_log").select("id", { count: "exact", head: true }).eq("vision_id", id),
    sb.from("vision_team").select("role, track_id, profile_id, name, gender, person:profiles!vision_team_profile_id_fkey(full_name, gender, avatar_url)").eq("vision_id", id),
  ]);
  type RawG = { id: number; position: number; cluster: string | null; title: string; detail: string | null; target: string; owner: string; baseline: string | null; due_on: string | null };
  type RawT = { id: number; position: number; name: string; summary: string | null; icon: string; vision_goals: RawG[] };
  const ts = ((tracks ?? []) as unknown as RawT[]).map((t) => ({ ...t, vision_goals: [...t.vision_goals].sort((a, b) => a.position - b.position) }));
  const log = await readLog(sb, id, ts, null);
  const raw = v as unknown as {
    id: number; slug: string; name: string; status: string; author_side: string | null; plan_rev: number; starts_on: string; starts_label: string | null; horizon_on: string; horizon_label: string | null; slogan: string | null;
    mark: unknown; mark_noun: string; idea_deck: string | null; stories: unknown; submitted_at: string | null; submitted_by: string | null; return_note: string | null;
    submitter: { full_name: string | null; gender: string | null } | null;
  };
  const stories = Array.isArray(raw.stories)
    ? (raw.stories as StoryCard[]).filter((s) => s && typeof s.title === "string" && typeof s.text === "string").map((s) => ({ title: s.title, text: s.text, art: s.art === "layers" || s.art === "one" ? s.art : "all" as const }))
    : [];
  return {
    data: {
      id: raw.id, slug: raw.slug, name: raw.name, status: asStatus(raw.status), rev: Number(raw.plan_rev ?? 0),
      authorSide: (asSeat(raw.author_side) ?? "qa") as AuthorSide,
      startsOn: raw.starts_on, startsLabel: raw.starts_label ?? "", horizonOn: raw.horizon_on, horizonLabel: raw.horizon_label ?? "", slogan: raw.slogan ?? "",
      mark: isMarkShape(raw.mark) ? raw.mark : HILAL, markNoun: raw.mark_noun, ideaDeck: raw.idea_deck ?? "", stories,
      tracks: ts.map((t) => ({
        name: t.name, summary: t.summary ?? "", icon: t.icon,
        goals: t.vision_goals.map((g) => ({
          cluster: g.cluster ?? "", title: g.title, detail: g.detail ?? "", target: g.target, owner: g.owner, baseline: g.baseline ?? "", dueOn: g.due_on ?? "",
        })),
      })),
      trackIds: ts.map((t) => t.id),
      team: ((seats ?? []) as unknown as {
        role: PlanSeat["role"]; track_id: number | null; profile_id: string | null; name: string | null; gender: string | null;
        person: { full_name: string | null; gender: string | null; avatar_url: string | null } | null;
      }[]).map((r): PlanSeat => {
        const g = r.person ? r.person.gender : r.gender;
        const pos = r.track_id === null ? null : ts.findIndex((t) => t.id === r.track_id) + 1;
        return {
          role: r.role, track: pos, profileId: r.profile_id, name: (r.person?.full_name ?? r.name ?? "").trim(),
          gender: g === "male" || g === "female" ? g : null, avatar: r.person?.avatar_url ?? null,
        };
      }).filter((x) => x.role !== "track" || (x.track ?? 0) > 0),
      approvals: ((approvals ?? []) as unknown as { seat: string; person: { full_name: string | null; gender: string | null } | null }[])
        .map((a) => ({ seat: asSeat(a.seat), name: a.person?.full_name?.trim() || "عضو", female: a.person?.gender === "female" }))
        .filter((a): a is { seat: PresidentSeat; name: string; female: boolean } => !!a.seat),
      submittedBy: raw.submitter?.full_name?.trim() || null,
      submittedByFemale: raw.submitter?.gender === "female",
      submittedBySeat: raw.submitted_by ? asSeat((await sb.rpc("vision_president_seat", { p_user: raw.submitted_by })).data) : null,
      submittedAt: raw.submitted_at,
      returnNote: raw.return_note,
      everSent: (count ?? 0) > 0,
      activeOther: (active as { name: string } | null)?.name ?? null,
      log,
    },
    error: null,
  };
}
