"use server";

import { createAdeebServiceClient } from "@adeeb/core";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { refreshVisionPages } from "@/lib/vision/page";
import { isGoalAct, isRealDay, type GoalAct } from "@/lib/vision/vocab";
import { arabicNameError } from "@/lib/personName";
import { emit } from "@/lib/notifications/emit";
import { readViewAsTarget } from "@/lib/view-as";

/**
 * **أفعالُ غرفة «متابعة الرؤية»** (مسارُ عمل الفريق، محمد ٢٠٢٦-١١-٢٢) — الجلسةُ تقول من الفاعل، والقاعدةُ تقول ماذا يجوز له
 * بمقعده (`vision_goal_act`، `vision_goal_edit`، `save_vision_team`): القيودُ هناك لا هنا، فلا يتجاوزها نداءٌ من مكانٍ آخر،
 * و«لا يؤكّد أحدٌ ما رفعه» قيدٌ في القاعدة لا زرٌّ يُخفى. وكلُّ فعلٍ يُكتب في السجلّ هناك، ويُطلق إشعارَه هنا بعد نجاحه.
 * وكلُّ حفظٍ يُنعش الصفحةَ العلنيّة، فتُضاء القطعةُ في علامتها لحظةَ «تحقّق».
 *
 * ولا إضافةَ هدفٍ ولا حذفَه هنا عمدًا: عددُ الأهداف عددُ قطع العلامة المنشورة، والأهدافُ تُكتب في المسوّدة قبل الإطلاق («الرؤى»).
 */
export type VisionResult = { ok: boolean; message: string };

const NO_KEY = "إعداد الخادم ناقص (مفتاح الخدمة).";
const NO_PERM = "لا تملك صلاحية متابعة الرؤية.";

const clean = (v: string | null | undefined): string | null => {
  const t = v?.replace(/[‎‏‪-‮]/g, "").trim();
  return t ? t : null;
};

async function guard() {
  // «عرضٌ بعين» غيرك للنظر لا للفعل: الأزرارُ أزرارُه والجلسةُ جلستُك، فلا يُكتب في السجلّ فعلٌ باسمٍ غير فاعله
  if (await readViewAsTarget()) return { error: "أنت تعاين التبويب بعين غيرك، فلا يُحفظ منه شيء. اخرج من المعاينة لتفعل." } as const;
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return { error: NO_PERM } as const;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return { error: NO_KEY } as const;
  return { svc: createAdeebServiceClient(url, key), userId: user.id } as const;
}

function refresh(slug: string | null) {
  revalidatePath("/dashboard/vision");
  refreshVisionPages(slug ?? undefined);
}

/** اسمُ الفاعل وجنسُه — لنصّ الإشعار */
async function whoIs(svc: ReturnType<typeof createAdeebServiceClient>, id: string) {
  const { data } = await svc.from("profiles").select("full_name, gender").eq("id", id).maybeSingle();
  return { name: (data?.full_name as string | null)?.trim() || "عضو", female: data?.gender === "female" };
}

type ActResult = {
  ok: boolean; message?: string; slug?: string; from?: string; to?: string;
  goal?: { id: number; title: string; track: number; track_name: string };
  reported_by?: string | null; track_leaders?: string[]; confirmers?: string[];
};

const DONE: Record<GoalAct, string> = {
  start: "بدأ العمل على الهدف.",
  unstart: "عاد الهدف «لم يبدأ».",
  report: "رُفع الهدف «أُنجز»، وأُشعر من يؤكّده.",
  withdraw: "سُحب «أُنجز»، وعاد الهدف «قيد العمل».",
  confirm: "تحقّق الهدف، وأُضيئت قطعتُه في صفحة الرؤية.",
  return: "أُرجع الهدف إلى «قيد العمل»، ووصل السبب من رفعه.",
  unconfirm: "أُلغي التحقّق، وأُطفئت قطعتُه في صفحة الرؤية.",
};

/** فعلُ الحال (`vision_goal_act`): الملاحظةُ دليلُ «أُنجز» أو سببُ الإرجاع */
export async function goalAct(goalId: number, act: GoalAct, note?: string): Promise<VisionResult> {
  if (!Number.isInteger(goalId) || !isGoalAct(act)) return { ok: false, message: "طلبٌ غير صالح." };
  const g = await guard();
  if ("error" in g) return { ok: false, message: g.error ?? NO_PERM };
  const { data, error } = await g.svc.rpc("vision_goal_act", { p_goal: goalId, p_actor: g.userId, p_action: act, p_note: clean(note) });
  if (error) return { ok: false, message: "تعذّر حفظ الحال، أعد المحاولة." };
  const r = (data ?? {}) as ActResult;
  if (!r.ok) return { ok: false, message: r.message ?? "تعذّر حفظ الحال." };
  refresh(r.slug ?? null);

  // الإشعارُ بعد الحفظ، ولا يُسقطه فشلُه (`emit` لا يرمي)
  if (r.goal && (act === "report" || act === "confirm" || act === "return")) {
    const me = await whoIs(g.svc, g.userId);
    const base = { goalId: r.goal.id, title: r.goal.title, track: r.goal.track_name, by: me.name, byFemale: me.female };
    const leaders = [...new Set([...(r.track_leaders ?? []), ...(r.reported_by ? [r.reported_by] : [])])].filter((u) => u !== g.userId);
    if (act === "report" && r.confirmers?.length) await emit("vision.goal_reported", { ...base, to: r.confirmers }, g.userId);
    if (act === "confirm" && leaders.length) await emit("vision.goal_confirmed", { ...base, to: leaders }, g.userId);
    if (act === "return" && leaders.length) await emit("vision.goal_returned", { ...base, reason: clean(note) ?? "", to: leaders }, g.userId);
  }
  return { ok: true, message: DONE[act] };
}

export type GoalInput = { title: string; detail: string; target: string; owner: string; baseline: string; dueOn: string };


/** القيودُ نفسُها التي في القاعدة، برسائل عربيّة (لا نثق بالعميل) */
function validate(i: GoalInput): string | null {
  const len = (v: string | null) => (v ?? "").length;
  const title = clean(i.title), target = clean(i.target), owner = clean(i.owner), detail = clean(i.detail), baseline = clean(i.baseline);
  if (!title || len(title) < 2) return "عنوان الهدف مطلوب.";
  if (len(title) > 120) return "العنوان أطول من 120 حرفًا.";
  if (detail && (len(detail) < 2 || len(detail) > 300)) return "التفصيل بين حرفين و300 حرف.";
  if (!target) return "المستهدف مطلوب.";
  if (len(target) > 120) return "المستهدف أطول من 120 حرفًا.";
  if (!owner || len(owner) < 2) return "المسؤول مطلوب.";
  if (len(owner) > 120) return "المسؤول أطول من 120 حرفًا.";
  if (baseline && len(baseline) > 200) return "الواقع عند البدء أطول من 200 حرف.";
  if (i.dueOn && !isRealDay(i.dueOn)) return "الموعد غير صالح.";
  return null;
}

export async function updateGoal(goalId: number, input: GoalInput): Promise<VisionResult> {
  if (!Number.isInteger(goalId)) return { ok: false, message: "طلبٌ غير صالح." };
  const bad = validate(input);
  if (bad) return { ok: false, message: bad };
  const g = await guard();
  if ("error" in g) return { ok: false, message: g.error ?? NO_PERM };
  // التصحيحُ للمشرف العامّ وقائد الرؤية، وفي السجلّ ما تغيّر (`vision_goal_edit`)
  const { data, error } = await g.svc.rpc("vision_goal_edit", {
    p_goal: goalId,
    p_actor: g.userId,
    p_fields: {
      title: clean(input.title), detail: clean(input.detail), target: clean(input.target), owner: clean(input.owner),
      baseline: clean(input.baseline), due_on: input.dueOn || null,
    },
  });
  if (error) return { ok: false, message: "تعذّر حفظ الهدف، أعد المحاولة." };
  const r = (data ?? {}) as { ok?: boolean; message?: string; slug?: string; changed?: boolean };
  if (!r.ok) return { ok: false, message: r.message ?? "تعذّر حفظ الهدف." };
  if (!r.changed) return { ok: true, message: "لم يتغيّر شيء." };
  refresh(r.slug ?? null);
  return { ok: true, message: "حُفظ الهدف." };
}

/* ══ فريقُ الرؤية (محمد ٢٠٢٦-١١-٢٢: «نفّذ») ══
   المشرفُ العامّ والقائدُ وقائدُ كلّ مسار، يُحفظون معًا من نافذة «فريق الرؤية». كلُّ مقعدٍ حسابٌ من أهل أدِيب أو اسمٌ مكتوبٌ بجنسه
   لمن لا حساب له بعد، والمقعدُ الفارغ لا صفَّ له (ويظهر في الصفحة «لم يُسمَّ بعد»). */

export type SeatInput = {
  role: "supervisor" | "leader" | "track";
  trackId: number | null;
  profileId: string | null;
  name: string | null;
  gender: "male" | "female" | null;
};

const SEAT_ROLES = new Set(["supervisor", "leader", "track"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function saveVisionTeam(visionId: number, seats: SeatInput[]): Promise<VisionResult> {
  if (!Number.isInteger(visionId) || !Array.isArray(seats) || seats.length > 20) return { ok: false, message: "طلبٌ غير صالح." };
  const g = await guard();
  if ("error" in g) return { ok: false, message: g.error ?? NO_PERM };

  const [{ data: vision }, { data: tracks }] = await Promise.all([
    g.svc.from("visions").select("id, slug, name").eq("id", visionId).maybeSingle(),
    g.svc.from("vision_tracks").select("id").eq("vision_id", visionId),
  ]);
  if (!vision) return { ok: false, message: "الرؤية غير موجودة." };
  const trackIds = new Set((tracks ?? []).map((t) => t.id as number));

  // كلُّ مقعدٍ مرّةً واحدة، وبصاحبٍ واحد: حسابٌ أو اسم
  const keyOf = (s: { role: string; trackId: number | null }) => `${s.role}:${s.trackId ?? 0}`;
  const seen = new Set<string>();
  const filled: SeatInput[] = [];
  for (const s of seats) {
    if (!SEAT_ROLES.has(s.role)) return { ok: false, message: "مقعدٌ غير معروف." };
    if ((s.role === "track") !== (s.trackId !== null) || (s.trackId !== null && !trackIds.has(s.trackId))) return { ok: false, message: "المسار غير موجود في الرؤية." };
    const k = keyOf(s);
    if (seen.has(k)) return { ok: false, message: "مقعدٌ مكرّر." };
    seen.add(k);
    const name = clean(s.name);
    if (s.profileId) {
      if (!UUID.test(s.profileId)) return { ok: false, message: "الحساب غير صالح." };
      filled.push({ ...s, name: null, gender: null });
    } else if (name) {
      if (name.length < 2 || name.length > 80) return { ok: false, message: "الاسم بين حرفين و80 حرفًا." };
      const nameErr = arabicNameError(name);
      if (nameErr) return { ok: false, message: `«${name}»: ${nameErr}` };
      if (s.gender !== "male" && s.gender !== "female") return { ok: false, message: `اختر جنس «${name}».` };
      filled.push({ ...s, profileId: null, name });
    }
  }

  // المشرفُ العامّ وقائدُ الرؤية شخصان: من رفع «أُنجز» يؤكّده الآخر، فلو كانا واحدًا لما وُجد مؤكِّدٌ لما يرفعه
  const who = (r: SeatInput["role"]) => { const s = filled.find((x) => x.role === r); return s ? s.profileId ?? s.name : null; };
  if (who("supervisor") && who("supervisor") === who("leader")) return { ok: false, message: "المشرف العام وقائد الرؤية شخصان: من رفع «أُنجز» يؤكّده الآخر." };

  // دفعةً واحدة في القاعدة (`save_vision_team`، وفيها أنّ التسمية للرئيسين): إمّا أن تُحفظ المقاعدُ كلُّها أو لا يتغيّر شيء
  const { data, error } = await g.svc.rpc("save_vision_team", {
    p_vision_id: visionId,
    p_actor: g.userId,
    p_seats: filled.map((s) => ({ role: s.role, track_id: s.trackId, profile_id: s.profileId, name: s.name, gender: s.gender })),
  });
  if (error) return { ok: false, message: "تعذّر حفظ الفريق، ولم يتغيّر شيء. أعد المحاولة." };
  const r = (data ?? {}) as { ok?: boolean; message?: string; assigned?: { profile_id: string; role: SeatInput["role"]; track_name: string | null }[] };
  if (!r.ok) return { ok: false, message: r.message ?? "تعذّر حفظ الفريق." };

  refresh(vision.slug as string);
  // إشعارُ التكليف لكلّ من صار في مقعدٍ لم يكن فيه
  for (const a of r.assigned ?? []) {
    await emit("vision.seat_assigned", { userId: a.profile_id, vision: vision.name as string, seat: a.role, track: a.track_name }, g.userId);
  }
  return { ok: true, message: "حُفظ فريق الرؤية." };
}
