"use server";

import { createAdeebServiceClient } from "@adeeb/core";
import { revalidatePath } from "next/cache";
import { getWebsiteManager } from "@/lib/website/authz";

export type FaqResult = { ok: boolean; message: string; id?: string };

/** يقلّم المسافات ومحارف الاتّجاه الخفيّة اللاصقة من اللصق العربيّ (يُبقي النصّ متعدّد الأسطر). */
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
const NO_PERM = "لا تملك صلاحية إدارة الأسئلة الشائعة.";

/** ينعش لوحة الأسئلة والصفحة الرئيسية العلنيّة (قسم الأسئلة الشائعة). */
function revalidateFaqs() {
  revalidatePath("/dashboard/website/faq");
  revalidatePath("/");
}

/* ── الإنشاء والتحرير ── */

export type FaqInput = {
  question: string;
  answer: string;
};

/** التحقّق المشترك — نفس قيود القاعدة برسائل عربيّة (لا نثق بالعميل). */
function validate(input: FaqInput): string | null {
  if (!clean(input.question)) return "السؤال مطلوب.";
  if (!clean(input.answer)) return "الإجابة مطلوبة.";
  return null;
}

function columns(input: FaqInput) {
  return { question: clean(input.question), answer: clean(input.answer) };
}

export async function createFaq(input: FaqInput): Promise<FaqResult> {
  const mgr = await getWebsiteManager("faq");
  if (!mgr) return { ok: false, message: NO_PERM };
  const sb = service();
  if (!sb) return { ok: false, message: NO_KEY };

  const invalid = validate(input);
  if (invalid) return { ok: false, message: invalid };

  const { data: last } = await sb.from("faq").select("order").order("order", { ascending: false }).limit(1).maybeSingle();
  const nextOrder = (last?.order ?? -1) + 1;

  const { data: created, error } = await sb
    .from("faq")
    .insert({ ...columns(input), order: nextOrder, created_by: mgr.userId })
    .select("id")
    .single();
  if (error || !created) return { ok: false, message: `تعذّر إضافة السؤال: ${error?.message ?? "بلا تفاصيل"}` };

  revalidateFaqs();
  return { ok: true, message: "أُضيف السؤال.", id: created.id };
}

export async function updateFaq(id: string, input: FaqInput): Promise<FaqResult> {
  const mgr = await getWebsiteManager("faq");
  if (!mgr) return { ok: false, message: NO_PERM };
  const sb = service();
  if (!sb) return { ok: false, message: NO_KEY };

  const invalid = validate(input);
  if (invalid) return { ok: false, message: invalid };

  const { error } = await sb.from("faq").update(columns(input)).eq("id", id);
  if (error) return { ok: false, message: error.message };

  revalidateFaqs();
  return { ok: true, message: "حُفظت التغييرات.", id };
}

export async function deleteFaq(id: string): Promise<FaqResult> {
  const mgr = await getWebsiteManager("faq");
  if (!mgr) return { ok: false, message: NO_PERM };
  const sb = service();
  if (!sb) return { ok: false, message: NO_KEY };

  const { data: f, error } = await sb.from("faq").select("id, question").eq("id", id).maybeSingle();
  if (error) return { ok: false, message: `تعذّر قراءة السؤال: ${error.message}` };
  if (!f) return { ok: false, message: "لا وجود لهذا السؤال." };

  const { error: dErr } = await sb.from("faq").delete().eq("id", id);
  if (dErr) return { ok: false, message: `تعذّر الحذف: ${dErr.message}` };

  revalidateFaqs();
  return { ok: true, message: "حُذف السؤال." };
}

/** تحريك سؤال خطوةً — يبادل قيمة `order` مع جاره في الاتّجاه المطلوب. */
export async function moveFaq(id: string, dir: "up" | "down"): Promise<FaqResult> {
  const mgr = await getWebsiteManager("faq");
  if (!mgr) return { ok: false, message: NO_PERM };
  const sb = service();
  if (!sb) return { ok: false, message: NO_KEY };

  const { data: rows, error } = await sb.from("faq").select("id, order").order("order", { ascending: true }).order("created_at", { ascending: false });
  if (error) return { ok: false, message: error.message };
  const list = rows ?? [];
  const i = list.findIndex((r) => r.id === id);
  if (i === -1) return { ok: false, message: "لا وجود لهذا السؤال." };

  const j = dir === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= list.length) return { ok: false, message: "السؤال في الطرف بالفعل." };

  const a = list[i], b = list[j];
  const aOrder = a.order === b.order ? (dir === "up" ? b.order + 1 : b.order - 1) : b.order;
  const [r1, r2] = await Promise.all([
    sb.from("faq").update({ order: aOrder }).eq("id", a.id),
    sb.from("faq").update({ order: a.order }).eq("id", b.id),
  ]);
  if (r1.error || r2.error) return { ok: false, message: (r1.error ?? r2.error)!.message };

  revalidateFaqs();
  return { ok: true, message: dir === "up" ? "حُرّك لأعلى." : "حُرّك لأسفل." };
}
