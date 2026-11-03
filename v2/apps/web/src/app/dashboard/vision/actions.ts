"use server";

import { createAdeebServiceClient } from "@adeeb/core";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SECTION_CAP } from "@/lib/capabilities";
import { refreshVisionPages } from "@/lib/vision/page";
import { GOAL_STATUS, isGoalStatus, type GoalStatus } from "@/lib/vision/vocab";

/**
 * **أفعالُ غرفة «متابعة الرؤية»** — حالُ الهدف، ونصُّه وموعدُه. قفلُها `manage_vision` يُسأل هنا في كلّ فعل
 * (الغرفةُ وحدها لا تكفي: الفعلُ يُستدعى من أيّ مكان)، ثمّ يكتب مفتاحُ الخدمة ويُسجَّل من غيّر.
 * وكلُّ حفظٍ يُنعش الصفحةَ العلنيّة، فتُضاء القطعةُ في الهلال لحظتَه.
 *
 * ولا إضافةَ هدفٍ ولا حذفَه هنا عمدًا: عددُ الأهداف عددُ قطع الشعار المنشور، وتغييرُه قرارُ المجلس لا فعلُ متابعة.
 */
export type VisionResult = { ok: boolean; message: string };

const NO_KEY = "إعداد الخادم ناقص (مفتاح الخدمة).";
const NO_PERM = "لا تملك صلاحية متابعة الرؤية.";

const clean = (v: string | null | undefined): string | null => {
  const t = v?.replace(/[‎‏‪-‮]/g, "").trim();
  return t ? t : null;
};

async function guard() {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return { error: NO_PERM } as const;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return { error: NO_KEY } as const;
  const svc = createAdeebServiceClient(url, key);
  const { data, error } = await svc.rpc("check_user_permission", { p_user_id: user.id, p_permission_key: SECTION_CAP["/dashboard/vision"] });
  if (error || data !== true) return { error: NO_PERM } as const;
  return { svc, userId: user.id } as const;
}

/** رابطُ الرؤية التي يتبعها الهدف — لإنعاش صفحتها بعينها */
async function slugOf(svc: ReturnType<typeof createAdeebServiceClient>, goalId: number): Promise<string | null> {
  const { data } = await svc.from("vision_goals").select("vision_tracks(visions(slug))").eq("id", goalId).maybeSingle();
  const row = data as unknown as { vision_tracks: { visions: { slug: string } | null } | null } | null;
  return row?.vision_tracks?.visions?.slug ?? null;
}

function refresh(slug: string | null) {
  revalidatePath("/dashboard/vision");
  refreshVisionPages(slug ?? undefined);
}

export async function setGoalStatus(goalId: number, status: GoalStatus): Promise<VisionResult> {
  if (!Number.isInteger(goalId) || !isGoalStatus(status)) return { ok: false, message: "طلبٌ غير صالح." };
  const g = await guard();
  if ("error" in g) return { ok: false, message: g.error ?? NO_PERM };
  const { error } = await g.svc
    .from("vision_goals")
    .update({ status, done_at: status === "done" ? new Date().toISOString() : null, updated_by: g.userId, updated_at: new Date().toISOString() })
    .eq("id", goalId);
  if (error) return { ok: false, message: "تعذّر حفظ الحال، أعد المحاولة." };
  refresh(await slugOf(g.svc, goalId));
  return {
    ok: true,
    message: status === "done" ? "تحقّق الهدف، وأُضيئت قطعتُه في الهلال." : `صار الهدف «${GOAL_STATUS[status].label}».`,
  };
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
  if (i.dueOn && !/^\d{4}-\d{2}-\d{2}$/.test(i.dueOn)) return "الموعد غير صالح.";
  return null;
}

export async function updateGoal(goalId: number, input: GoalInput): Promise<VisionResult> {
  if (!Number.isInteger(goalId)) return { ok: false, message: "طلبٌ غير صالح." };
  const bad = validate(input);
  if (bad) return { ok: false, message: bad };
  const g = await guard();
  if ("error" in g) return { ok: false, message: g.error ?? NO_PERM };
  const { error } = await g.svc
    .from("vision_goals")
    .update({
      title: clean(input.title),
      detail: clean(input.detail),
      target: clean(input.target),
      owner: clean(input.owner),
      baseline: clean(input.baseline),
      due_on: input.dueOn || null,
      updated_by: g.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", goalId);
  if (error) return { ok: false, message: "تعذّر حفظ الهدف، أعد المحاولة." };
  refresh(await slugOf(g.svc, goalId));
  return { ok: true, message: "حُفظ الهدف." };
}
