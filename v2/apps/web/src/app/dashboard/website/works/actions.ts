"use server";

import { createAdeebServiceClient } from "@adeeb/core";
import { revalidatePath } from "next/cache";
import { getWebsiteManager } from "@/lib/website/authz";

export type WorkResult = { ok: boolean; message: string; id?: string };

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
const NO_PERM = "لا تملك صلاحية إدارة الأعمال.";

/** ينعش لوحة الأعمال والصفحة الرئيسية العلنيّة (المعرض) وصفحة كلّ الأعمال. */
function revalidateWorks() {
  revalidatePath("/dashboard/website/works");
  revalidatePath("/");
  revalidatePath("/works");
}

/* ── الإنشاء والتحرير ── */

export type WorkInput = {
  title: string;
  category?: string | null;
  imageUrl: string;      // مطلوب (العمود NOT NULL في القاعدة)
  linkUrl?: string | null;
};

/** التحقّق المشترك — نفس قيود القاعدة برسائل عربيّة (لا نثق بالعميل). */
function validateWork(input: WorkInput): string | null {
  if (!clean(input.title)) return "عنوان العمل مطلوب.";
  if (!clean(input.imageUrl)) return "صورة العمل مطلوبة. ارفع صورةً أوّلًا.";
  return null;
}

/** أعمدة works من مُدخَل النموذج — مكان واحد للإنشاء والتحديث (الترتيب لا يُدخَل هنا؛ يُدار بأزرار التحريك). */
function workColumns(input: WorkInput) {
  return {
    title: clean(input.title),
    category: clean(input.category),
    image_url: clean(input.imageUrl),
    link_url: clean(input.linkUrl),
  };
}

export async function createWork(input: WorkInput): Promise<WorkResult> {
  const mgr = await getWebsiteManager("works");
  if (!mgr) return { ok: false, message: NO_PERM };
  const sb = service();
  if (!sb) return { ok: false, message: NO_KEY };

  const invalid = validateWork(input);
  if (invalid) return { ok: false, message: invalid };

  // يُلحَق في ذيل المعرض: order = أكبر ترتيب حاليّ + 1
  const { data: last } = await sb.from("works").select("order").order("order", { ascending: false }).limit(1).maybeSingle();
  const nextOrder = (last?.order ?? -1) + 1;

  const { data: created, error } = await sb
    .from("works")
    .insert({ ...workColumns(input), order: nextOrder, created_by: mgr.userId })
    .select("id")
    .single();
  if (error || !created) return { ok: false, message: `تعذّر إنشاء العمل: ${error?.message ?? "بلا تفاصيل"}` };

  revalidateWorks();
  return { ok: true, message: "أُضيف العمل إلى المعرض.", id: created.id };
}

export async function updateWork(id: string, input: WorkInput): Promise<WorkResult> {
  const mgr = await getWebsiteManager("works");
  if (!mgr) return { ok: false, message: NO_PERM };
  const sb = service();
  if (!sb) return { ok: false, message: NO_KEY };

  const invalid = validateWork(input);
  if (invalid) return { ok: false, message: invalid };

  const { error } = await sb.from("works").update(workColumns(input)).eq("id", id);
  if (error) return { ok: false, message: error.message };

  revalidateWorks();
  return { ok: true, message: "حُفظت التغييرات.", id };
}

export async function deleteWork(id: string): Promise<WorkResult> {
  const mgr = await getWebsiteManager("works");
  if (!mgr) return { ok: false, message: NO_PERM };
  const sb = service();
  if (!sb) return { ok: false, message: NO_KEY };

  const { data: w, error } = await sb.from("works").select("id, title").eq("id", id).maybeSingle();
  if (error) return { ok: false, message: `تعذّر قراءة العمل: ${error.message}` };
  if (!w) return { ok: false, message: "لا وجود لهذا العمل." };

  const { error: dErr } = await sb.from("works").delete().eq("id", id);
  if (dErr) return { ok: false, message: `تعذّر الحذف: ${dErr.message}` };

  revalidateWorks();
  return { ok: true, message: `حُذف «${w.title}».` };
}

/**
 * تحريك عمل خطوةً في المعرض — يبادل قيمة `order` مع جاره في الاتّجاه المطلوب.
 * مصدر الترتيب الوحيد هو العمود؛ التحريك عمليّة تبادلٍ ذرّيّة على صفّين لا إعادةَ ترقيمٍ شاملة.
 */
export async function moveWork(id: string, dir: "up" | "down"): Promise<WorkResult> {
  const mgr = await getWebsiteManager("works");
  if (!mgr) return { ok: false, message: NO_PERM };
  const sb = service();
  if (!sb) return { ok: false, message: NO_KEY };

  const { data: rows, error } = await sb.from("works").select("id, order").order("order", { ascending: true }).order("created_at", { ascending: false });
  if (error) return { ok: false, message: error.message };
  const list = rows ?? [];
  const i = list.findIndex((r) => r.id === id);
  if (i === -1) return { ok: false, message: "لا وجود لهذا العمل." };

  const j = dir === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= list.length) return { ok: false, message: "العمل في طرف المعرض بالفعل." };

  const a = list[i], b = list[j];
  // تبادل القيمتين؛ إن تساوتا (ترتيب مبدئيّ صفريّ) نفرّقهما بخطوة كي يثبت الفرز
  const aOrder = a.order === b.order ? (dir === "up" ? b.order + 1 : b.order - 1) : b.order;
  const [r1, r2] = await Promise.all([
    sb.from("works").update({ order: aOrder }).eq("id", a.id),
    sb.from("works").update({ order: a.order }).eq("id", b.id),
  ]);
  if (r1.error || r2.error) return { ok: false, message: (r1.error ?? r2.error)!.message };

  revalidateWorks();
  return { ok: true, message: dir === "up" ? "حُرّك لأعلى." : "حُرّك لأسفل." };
}

/* ── رفع صورة العمل إلى دلو images تحت بادئة works/ ── */

export type UploadResult = { ok: boolean; message?: string; url?: string };

const BUCKET = "images";
const PREFIX = "works";
const MAX_BYTES = 5 * 1024 * 1024; // حدّ الدلو نفسه
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
};

export async function uploadWorkImage(formData: FormData): Promise<UploadResult> {
  const mgr = await getWebsiteManager("works");
  if (!mgr) return { ok: false, message: NO_PERM };
  const sb = service();
  if (!sb) return { ok: false, message: NO_KEY };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "لم تُرفَق صورة." };
  if (file.size > MAX_BYTES) return { ok: false, message: "حجم الصورة يتجاوز ٥ ميغابايت." };
  const ext = EXT_BY_MIME[file.type];
  if (!ext) return { ok: false, message: "صيغة غير مدعومة. استخدم JPG أو PNG أو WEBP أو GIF." };

  const path = `${PREFIX}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const { error } = await sb.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { ok: false, message: `تعذّر رفع الصورة: ${error.message}` };

  const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}
