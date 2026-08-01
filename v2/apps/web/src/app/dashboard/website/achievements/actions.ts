"use server";

import { createAdeebServiceClient } from "@adeeb/core";
import { revalidatePath } from "next/cache";
import { getWebsiteManager } from "@/lib/website/authz";
import { asIconKey } from "@/app/_components/statIconKeys";

export type AchievementResult = { ok: boolean; message: string; id?: string };

/** يحوّل الفارغ إلى null ويقلّم المسافات ومحارف الاتّجاه الخفيّة اللاصقة من اللصق العربيّ. */
const clean = (v: string | null | undefined): string | null => {
  const t = v?.replace(/[‎‏‪-‮]/g, "").trim();
  return t ? t : null;
};

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

const NO_KEY = "إعداد الخادم ناقص (مفتاح الخدمة).";
const NO_PERM = "لا تملك صلاحية إدارة الإحصاءات.";

/** ينعش لوحة الإحصاءات والصفحة الرئيسية العلنيّة (ملخص المسيرة). */
function revalidateAchievements() {
  revalidatePath("/dashboard/website/achievements");
  revalidatePath("/");
}

/* ── الإنشاء والتحرير ── */

export type AchievementInput = {
  label: string;
  count: number;
  plus: boolean;
  icon: string | null;   // مفتاح أيقونة صالح أو null (⇒ تلقائيّ)
};

/** التحقّق المشترك — نفس قيود القاعدة برسائل عربيّة (لا نثق بالعميل). */
function validate(input: AchievementInput): string | null {
  if (!clean(input.label)) return "اسم الإحصائيّة مطلوب.";
  if (!Number.isInteger(input.count) || input.count < 0) return "الرقم يجب أن يكون عددًا صحيحًا غير سالب.";
  return null;
}

/** أعمدة achievements من مُدخَل النموذج (الترتيب لا يُدخَل هنا؛ يُدار بأزرار التحريك). */
function columns(input: AchievementInput) {
  return {
    label: clean(input.label),
    count_number: input.count,
    plus_flag: input.plus,
    // نخزّن مفتاحًا صالحًا فقط؛ أيّ قيمة أخرى (فارغ/إرث FontAwesome) ⇒ null = اشتقاق تلقائيّ في العرض
    icon_class: asIconKey(input.icon),
  };
}

export async function createAchievement(input: AchievementInput): Promise<AchievementResult> {
  const mgr = await getWebsiteManager("achievements");
  if (!mgr) return { ok: false, message: NO_PERM };
  const sb = service();
  if (!sb) return { ok: false, message: NO_KEY };

  const invalid = validate(input);
  if (invalid) return { ok: false, message: invalid };

  // يُلحَق في ذيل الملخّص: order = أكبر ترتيب حاليّ + 1
  const { data: last } = await sb.from("achievements").select("order").order("order", { ascending: false }).limit(1).maybeSingle();
  const nextOrder = (last?.order ?? -1) + 1;

  const { data: created, error } = await sb
    .from("achievements")
    .insert({ ...columns(input), order: nextOrder, created_by: mgr.userId })
    .select("id")
    .single();
  if (error || !created) return { ok: false, message: `تعذّر إنشاء الإحصائيّة: ${error?.message ?? "بلا تفاصيل"}` };

  revalidateAchievements();
  return { ok: true, message: "أُضيفت الإحصائيّة إلى الملخّص.", id: created.id };
}

export async function updateAchievement(id: string, input: AchievementInput): Promise<AchievementResult> {
  const mgr = await getWebsiteManager("achievements");
  if (!mgr) return { ok: false, message: NO_PERM };
  const sb = service();
  if (!sb) return { ok: false, message: NO_KEY };

  const invalid = validate(input);
  if (invalid) return { ok: false, message: invalid };

  const { error } = await sb.from("achievements").update(columns(input)).eq("id", id);
  if (error) return { ok: false, message: error.message };

  revalidateAchievements();
  return { ok: true, message: "حُفظت التغييرات.", id };
}

export async function deleteAchievement(id: string): Promise<AchievementResult> {
  const mgr = await getWebsiteManager("achievements");
  if (!mgr) return { ok: false, message: NO_PERM };
  const sb = service();
  if (!sb) return { ok: false, message: NO_KEY };

  const { data: a, error } = await sb.from("achievements").select("id, label").eq("id", id).maybeSingle();
  if (error) return { ok: false, message: `تعذّر قراءة الإحصائيّة: ${error.message}` };
  if (!a) return { ok: false, message: "لا وجود لهذه الإحصائيّة." };

  const { error: dErr } = await sb.from("achievements").delete().eq("id", id);
  if (dErr) return { ok: false, message: `تعذّر الحذف: ${dErr.message}` };

  revalidateAchievements();
  return { ok: true, message: `حُذفت «${a.label}».` };
}

/**
 * تحريك إحصائيّة خطوةً في الملخّص — يبادل قيمة `order` مع جارها في الاتّجاه المطلوب.
 * (يؤثّر في الترتيب المصدريّ؛ الـtreemap يعيد التوزيع بالمساحة حسب الرقم لا الترتيب، فالتحريك للاتّساق لا المكان.)
 */
export async function moveAchievement(id: string, dir: "up" | "down"): Promise<AchievementResult> {
  const mgr = await getWebsiteManager("achievements");
  if (!mgr) return { ok: false, message: NO_PERM };
  const sb = service();
  if (!sb) return { ok: false, message: NO_KEY };

  const { data: rows, error } = await sb.from("achievements").select("id, order").order("order", { ascending: true }).order("created_at", { ascending: false });
  if (error) return { ok: false, message: error.message };
  const list = rows ?? [];
  const i = list.findIndex((r) => r.id === id);
  if (i === -1) return { ok: false, message: "لا وجود لهذه الإحصائيّة." };

  const j = dir === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= list.length) return { ok: false, message: "الإحصائيّة في الطرف بالفعل." };

  const a = list[i], b = list[j];
  const aOrder = a.order === b.order ? (dir === "up" ? b.order + 1 : b.order - 1) : b.order;
  const [r1, r2] = await Promise.all([
    sb.from("achievements").update({ order: aOrder }).eq("id", a.id),
    sb.from("achievements").update({ order: a.order }).eq("id", b.id),
  ]);
  if (r1.error || r2.error) return { ok: false, message: (r1.error ?? r2.error)!.message };

  revalidateAchievements();
  return { ok: true, message: dir === "up" ? "حُرّكت لأعلى." : "حُرّكت لأسفل." };
}
