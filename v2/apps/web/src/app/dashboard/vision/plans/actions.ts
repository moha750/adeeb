"use server";

import { createAdeebServiceClient } from "@adeeb/core";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { refreshVisionPages } from "@/lib/vision/page";
import { isMarkShape } from "@/lib/vision/mark";
import { isRealDay, isTrackIcon } from "@/lib/vision/vocab";
import { emit } from "@/lib/notifications/emit";
import { arabicNameError } from "@/lib/personName";
import { readViewAsTarget } from "@/lib/view-as";
import type { PlanTrack } from "./data";
import type { StoryCard } from "@/lib/vision/types";
import type { VisionMarkShape } from "@/lib/vision/mark";

/**
 * **أفعالُ «الرؤى»** — دورةُ حياة الرؤية: إنشاءُ المسوّدة وحفظُها، وإرسالُها للرئيسين وسحبُها، وموافقتاهما أو إعادتُها بملاحظة،
 * والإطلاقُ والإغلاق. الجلسةُ تقول من الفاعل، والقاعدةُ تقول ماذا يجوز له (`vision_plan_*`): القيودُ هناك لا هنا، وهنا فحصُ الحقول
 * قبلها لتُقال الأخطاءُ بأسمائها. وكلُّ فعلٍ يُكتب في السجلّ هناك، ويُطلق إشعارَه هنا بعد نجاحه.
 */
export type PlanResult = { ok: boolean; message: string; id?: number; rev?: number };

export type PlanInput = {
  name: string; slug: string; startsOn: string; startsLabel: string; horizonOn: string; horizonLabel: string; slogan: string;
  mark: VisionMarkShape; markNoun: string; ideaDeck: string; stories: StoryCard[];
  tracks: PlanTrack[];
  /** فريقُ الرؤية مع المسوّدة (يُعتمد معها): `track` ترتيبُ المسار لقائده؛ حسابٌ أو اسمٌ مكتوبٌ بجنسه */
  team: PlanSeatInput[];
};
export type PlanSeatInput = { role: "supervisor" | "leader" | "track"; track: number | null; profileId: string | null; name: string | null; gender: "male" | "female" | null };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type PlanAct = "submit" | "recall" | "approve" | "unapprove" | "send_back" | "launch" | "close" | "discard";
const ACTS = new Set<PlanAct>(["submit", "recall", "approve", "unapprove", "send_back", "launch", "close", "discard"]);

const NO_KEY = "إعداد الخادم ناقص (مفتاح الخدمة).";
const SLUG = /^[a-z0-9-]{2,40}$/;
const PLANS = "/dashboard/vision/plans";

const clean = (v: string | null | undefined) => (v ?? "").replace(/[‎‏‪-‮]/g, "").trim();
const len = (v: string, min: number, max: number) => v.length >= min && v.length <= max;

async function guard() {
  if (await readViewAsTarget()) return { error: "أنت تعاين التبويب بعين غيرك، فلا يُحفظ منه شيء. اخرج من المعاينة لتفعل." } as const;
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return { error: "سجّل الدخول أولًا." } as const;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return { error: NO_KEY } as const;
  return { svc: createAdeebServiceClient(url, key), userId: user.id } as const;
}

function refresh(id?: number, slug?: string) {
  revalidatePath(PLANS);
  if (id) revalidatePath(`${PLANS}/${id}`);
  revalidatePath("/dashboard/vision");
  refreshVisionPages(slug);
}

/** فحصُ الأساس (الاسم والمعرّف والموعدان): يشترك فيه الإنشاءُ والحفظ */
function baseError(b: { name: string; slug: string; startsOn: string; horizonOn: string; horizonLabel: string }): string | null {
  if (!len(b.name, 2, 60)) return "اسم الرؤية بين حرفين و60 حرفًا.";
  if (!SLUG.test(b.slug)) return "المعرّف في الرابط بحروفٍ إنجليزيّة صغيرة وأرقامٍ وشرطات، من حرفين إلى 40 (مثل: hilal).";
  if (!isRealDay(b.startsOn) || !isRealDay(b.horizonOn)) return "اختر تاريخي البداية والنهاية.";
  if (b.horizonOn <= b.startsOn) return "موعد النهاية بعد البداية.";
  if (b.horizonLabel && !len(b.horizonLabel, 2, 40)) return "موعد النهاية بالكلام بين حرفين و40 حرفًا، أو اتركه فيُكتب التاريخ.";
  return null;
}

export async function createPlan(input: { name: string; slug: string; startsOn: string; horizonOn: string; horizonLabel: string; from: number | null }): Promise<PlanResult> {
  const b = { name: clean(input.name), slug: clean(input.slug).toLowerCase(), startsOn: input.startsOn, horizonOn: input.horizonOn, horizonLabel: clean(input.horizonLabel) };
  const bad = baseError(b);
  if (bad) return { ok: false, message: bad };
  const g = await guard();
  if ("error" in g) return { ok: false, message: g.error ?? NO_KEY };
  const { data, error } = await g.svc.rpc("vision_plan_create", {
    p_actor: g.userId, p_name: b.name, p_slug: b.slug, p_starts: b.startsOn, p_horizon: b.horizonOn, p_label: b.horizonLabel,
    p_from: Number.isInteger(input.from) ? input.from : null,
  });
  if (error) return { ok: false, message: "تعذّر إنشاء المسوّدة. أعد المحاولة." };
  const r = (data ?? {}) as { ok?: boolean; message?: string; id?: number };
  if (!r.ok || !r.id) return { ok: false, message: r.message ?? "تعذّر إنشاء المسوّدة." };
  refresh();
  return { ok: true, message: "أُنشئت المسوّدة.", id: r.id };
}

/** فحصُ المسوّدة كاملةً قبل القاعدة، والخطأُ بموضعه («المسار 2، الهدف 3: …») */
function planError(p: PlanInput): string | null {
  const bad = baseError(p);
  if (bad) return bad;
  if (p.startsLabel && !len(p.startsLabel, 2, 40)) return "موعد البداية بالكلام بين حرفين و40 حرفًا، أو اتركه فيُكتب التاريخ.";
  if (p.slogan && !len(p.slogan, 2, 80)) return "عبارة الرؤية بين حرفين و80 حرفًا.";
  if (!len(p.markNoun, 2, 30)) return "اكتب اسم العلامة كما يُقال في الجمل (مثل: الهلال)، حتى 30 حرفًا.";
  if (p.ideaDeck && !len(p.ideaDeck, 2, 200)) return "سطر «فكرة الشعار» حتى 200 حرف.";
  if (!isMarkShape(p.mark)) return "العلامة غير صالحة، أعد رفعها.";
  if (p.stories.length > 6) return "بطاقات «فكرة الشعار» ستٌّ على الأكثر.";
  for (const [i, s] of p.stories.entries()) {
    if (!len(s.title, 2, 60)) return `بطاقة الفكرة ${i + 1}: العنوان بين حرفين و60 حرفًا.`;
    if (!len(s.text, 2, 600)) return `بطاقة الفكرة ${i + 1}: النصّ بين حرفين و600 حرف.`;
  }
  if (p.tracks.length > 8) return "المسارات ثمانية على الأكثر.";
  for (const [i, t] of p.tracks.entries()) {
    const at = `المسار ${i + 1}`;
    if (!len(t.name, 2, 40)) return `${at}: الاسم بين حرفين و40 حرفًا.`;
    if (t.summary.length > 400) return `${at}: التعريف حتى 400 حرف.`;
    if (!isTrackIcon(t.icon)) return `${at}: اختر رمزه.`;
    if (t.goals.length > 99) return `${at}: الأهداف 99 على الأكثر.`;
    for (const [j, x] of t.goals.entries()) {
      const g = `${at}، الهدف ${j + 1}`;
      if (!len(x.title, 2, 120)) return `${g}: العنوان بين حرفين و120 حرفًا.`;
      if (!len(x.target, 1, 120)) return `${g}: اكتب المستهدف، حتى 120 حرفًا.`;
      if (!len(x.owner, 2, 120)) return `${g}: اكتب المسؤول، حتى 120 حرفًا.`;
      if (x.cluster && !len(x.cluster, 2, 40)) return `${g}: العنوان الفرعي بين حرفين و40 حرفًا.`;
      if (x.detail && !len(x.detail, 2, 300)) return `${g}: التفصيل حتى 300 حرف.`;
      if (x.baseline && !len(x.baseline, 1, 200)) return `${g}: الواقع عند البدء حتى 200 حرف.`;
      if (x.dueOn && !isRealDay(x.dueOn)) return `${g}: الموعد غير صالح.`;
    }
  }
  // الفريق: كلُّ مقعدٍ مرّةً، بصاحبٍ واحد، ومقعدُ قائد المسار لمسارٍ في المسوّدة؛ والمشرفُ والقائدُ شخصان
  const seen = new Set<string>();
  for (const x of p.team) {
    if (!["supervisor", "leader", "track"].includes(x.role)) return "مقعدٌ غير معروف في الفريق.";
    if ((x.role === "track") !== (x.track !== null) || (x.track !== null && !(Number.isInteger(x.track) && x.track >= 1 && x.track <= p.tracks.length))) return "مقعدٌ في الفريق لمسارٍ غير موجود.";
    const k = `${x.role}:${x.track ?? 0}`;
    if (seen.has(k)) return "مقعدٌ مكرّر في الفريق.";
    seen.add(k);
    if (x.profileId) { if (!UUID.test(x.profileId)) return "حسابٌ غير صالح في الفريق."; continue; }
    if (!x.name || !len(x.name, 2, 80)) return "اسمُ من في الفريق بين حرفين و80 حرفًا.";
    const nameErr = arabicNameError(x.name);
    if (nameErr) return `«${x.name}»: ${nameErr}`;
    if (x.gender !== "male" && x.gender !== "female") return `اختر جنس «${x.name}».`;
  }
  const who = (r: PlanSeatInput["role"]) => { const x = p.team.find((y) => y.role === r); return x ? x.profileId ?? x.name : null; };
  if (who("supervisor") && who("supervisor") === who("leader")) return "المشرف العام وقائد الرؤية شخصان: من رفع «أُنجز» يؤكّده الآخر.";
  return null;
}

const tidy = (p: PlanInput): PlanInput => ({
  name: clean(p.name), slug: clean(p.slug).toLowerCase(), startsOn: p.startsOn, startsLabel: clean(p.startsLabel), horizonOn: p.horizonOn,
  horizonLabel: clean(p.horizonLabel), slogan: clean(p.slogan), mark: p.mark, markNoun: clean(p.markNoun), ideaDeck: clean(p.ideaDeck),
  stories: (p.stories ?? []).map((s) => ({ title: clean(s.title), text: clean(s.text), art: s.art })),
  tracks: (p.tracks ?? []).map((t) => ({
    name: clean(t.name), summary: clean(t.summary), icon: t.icon,
    goals: (t.goals ?? []).map((g) => ({ cluster: clean(g.cluster), title: clean(g.title), detail: clean(g.detail), target: clean(g.target), owner: clean(g.owner), baseline: clean(g.baseline), dueOn: g.dueOn })),
  })),
  team: (Array.isArray(p.team) ? p.team : []).map((x) => x.profileId
    ? { role: x.role, track: x.track ?? null, profileId: x.profileId, name: null, gender: null }
    : { role: x.role, track: x.track ?? null, profileId: null, name: clean(x.name ?? ""), gender: x.gender ?? null }),
});

export async function savePlan(id: number, rev: number, raw: PlanInput): Promise<PlanResult> {
  if (!Number.isInteger(id) || !Number.isInteger(rev) || !raw || typeof raw !== "object") return { ok: false, message: "طلبٌ غير صالح." };
  const p = tidy(raw);
  const bad = planError(p);
  if (bad) return { ok: false, message: bad };
  const g = await guard();
  if ("error" in g) return { ok: false, message: g.error ?? NO_KEY };
  const { data, error } = await g.svc.rpc("vision_plan_save", {
    p_vision: id, p_actor: g.userId, p_rev: rev,
    p_plan: {
      name: p.name, slug: p.slug, starts_on: p.startsOn, starts_label: p.startsLabel, horizon_on: p.horizonOn, horizon_label: p.horizonLabel, slogan: p.slogan,
      mark: p.mark, mark_noun: p.markNoun, idea_deck: p.ideaDeck, stories: p.stories,
      tracks: p.tracks.map((t) => ({
        name: t.name, summary: t.summary, icon: t.icon,
        goals: t.goals.map((x) => ({ cluster: x.cluster, title: x.title, detail: x.detail, target: x.target, owner: x.owner, baseline: x.baseline, due_on: x.dueOn })),
      })),
      team: p.team.map((x) => ({ role: x.role, track: x.track, profile_id: x.profileId, name: x.name, gender: x.gender })),
    },
  });
  if (error) return { ok: false, message: "تعذّر حفظ المسوّدة، ولم يتغيّر شيء. أعد المحاولة." };
  const r = (data ?? {}) as { ok?: boolean; message?: string; detail?: string; rev?: number };
  if (!r.ok) { if (r.detail) console.error("[vision] plan_save:", r.detail); return { ok: false, message: r.message ?? "تعذّر حفظ المسوّدة." }; }
  refresh(id);
  return { ok: true, message: "حُفظت المسوّدة.", rev: r.rev };
}

const DONE: Record<PlanAct, string> = {
  submit: "أُرسلت المسوّدة للرئيسين.",
  recall: "سُحبت المسوّدة، وعادت للكتابة.",
  approve: "سُجّلت موافقتك.",
  unapprove: "سُحبت موافقتك.",
  send_back: "أُعيدت المسوّدة بملاحظتك.",
  launch: "أُطلقت الرؤية، وصارت السارية في أدِيب.",
  close: "أُغلقت الرؤية، وتجمّدت أهدافها كما هي.",
  discard: "حُذفت المسوّدة.",
};

export async function planAct(id: number, act: PlanAct, note?: string): Promise<PlanResult> {
  if (!Number.isInteger(id) || !ACTS.has(act)) return { ok: false, message: "طلبٌ غير صالح." };
  const n = clean(note);
  if (act === "send_back" && !len(n, 2, 500)) return { ok: false, message: "اكتب ما يُصلَح في المسوّدة، حتى 500 حرف." };
  const g = await guard();
  if ("error" in g) return { ok: false, message: g.error ?? NO_KEY };
  const { data, error } = await g.svc.rpc("vision_plan_act", { p_vision: id, p_actor: g.userId, p_action: act, p_note: n || null });
  if (error) return { ok: false, message: "تعذّر الحفظ، أعد المحاولة." };
  const r = (data ?? {}) as {
    ok?: boolean; message?: string; slug?: string; name?: string; notify?: string[]; both?: boolean;
    team?: { profile_id: string; role: PlanSeatInput["role"]; track_name: string | null }[];
    other?: string[]; seat?: "club_president" | "executive_council_president" | null;
  };
  if (!r.ok) return { ok: false, message: r.message ?? "تعذّر الحفظ." };
  refresh(act === "discard" ? undefined : id, r.slug);

  const to = (r.notify ?? []).filter((u) => typeof u === "string");
  if (to.length && r.name) {
    const { data: me } = await g.svc.from("profiles").select("full_name, gender").eq("id", g.userId).maybeSingle();
    const by = (me?.full_name as string | null)?.trim() || "عضو";
    const byFemale = me?.gender === "female";
    if (act === "submit") await emit("vision.plan_submitted", { planId: id, vision: r.name, by, byFemale, to }, g.userId);
    if (act === "send_back") await emit("vision.plan_sent_back", { planId: id, vision: r.name, by, byFemale, note: n, to }, g.userId);
    if (act === "approve" && r.both) await emit("vision.plan_approved", { planId: id, vision: r.name, to }, g.userId);
  }
  // الموافقةُ الأولى: الرئيسُ الآخر يعرف أنّها بانتظاره
  const other = (r.other ?? []).filter((u) => typeof u === "string");
  if (act === "approve" && !r.both && other.length && r.name && r.seat) {
    const { data: me } = await g.svc.from("profiles").select("full_name, gender").eq("id", g.userId).maybeSingle();
    await emit("vision.plan_half_approved", { planId: id, vision: r.name, seat: r.seat, by: (me?.full_name as string | null)?.trim() || "عضو", byFemale: me?.gender === "female", to: other }, g.userId);
  }
  // الإطلاقُ يُشعر كلَّ من في الفريق بمقعده: سُمّي في المسوّدة، ويبدأ عملُه الآن
  if (act === "launch" && r.name) {
    for (const m of r.team ?? []) await emit("vision.seat_assigned", { userId: m.profile_id, vision: r.name, seat: m.role, track: m.track_name }, g.userId);
  }
  return { ok: true, message: act === "approve" && r.both ? "سُجّلت موافقتك، ووافق الرئيسان معًا: تُطلَق متى شئتم." : DONE[act] };
}
