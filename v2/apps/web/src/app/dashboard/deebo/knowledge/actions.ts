"use server";

import { createAdeebServiceClient } from "@adeeb/core";
import { revalidatePath } from "next/cache";
import { getDeeboManager } from "@/lib/deebo/authz";

export type FactResult = { ok: boolean; message: string; id?: string };

/** يقلّم المسافات ومحارف الاتّجاه الخفيّة اللاصقة من اللصق العربيّ (يُبقي النصّ متعدّد الأسطر). */
const clean = (v: string | null | undefined): string => v?.replace(/[‎‏‪-‮]/g, "").trim() ?? "";

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

const NO_KEY = "إعداد الخادم ناقص (مفتاح الخدمة).";
const NO_PERM = "لا تملك صلاحية إدارة معرفة ديبو.";

/** تنعش الغرفة وحدها: جوابُ ديبو يُبنى في كلّ سؤالٍ من القاعدة، فلا صفحةَ مخزَّنةً تُبطَل. */
function revalidateFacts() {
  revalidatePath("/dashboard/deebo/knowledge");
}

export type FactInput = {
  title: string;
  body: string;
  isActive: boolean;
};

/** التحقّق المشترك — نفس قيود القاعدة برسائل عربيّة (لا نثق بالعميل). */
function validate(input: FactInput): string | null {
  const title = clean(input.title);
  const body = clean(input.body);
  if (title.length < 2) return "العنوان مطلوب.";
  if (title.length > 120) return "العنوان أطول من مئةٍ وعشرين محرفًا.";
  if (body.length < 2) return "النصّ مطلوب.";
  // الحدُّ نفسُه في القاعدة: المعرفةُ كلُّها تُحشى في كلّ سؤال، فمقطعٌ يتضخّم يُحاسَب في كلّ رسالة.
  if (body.length > 1200) return "النصّ أطول من ألفٍ ومئتَي محرف. اقسِمه واقعتَين.";
  return null;
}

function columns(input: FactInput) {
  return { title: clean(input.title), body: clean(input.body), is_active: input.isActive };
}

/**
 * معرّفُ الواقعة الداخليّ (`fact-<n>`).
 *
 * يُولَّد في الخادم ولا يُعرَض في الشاشة: هو اسمٌ يُطبع مع المقطع في نصّ التوجيه
 * ولا يعني كاتبَ الواقعة في شيء، فلا يُسأل عنه. والرقمُ يتجاوز أكبرَ قائمٍ لا عددَ
 * الصفوف — كي لا يُعاد معرّفُ واقعةٍ حُذفت فيلتبس بها في سجلّ قديم.
 */
async function nextSlug(sb: NonNullable<ReturnType<typeof service>>): Promise<string> {
  const { data } = await sb.from("deebo_knowledge").select("slug");
  const max = (data ?? []).reduce((m: number, r: { slug: string }) => {
    const n = /^fact-(\d+)$/.exec(r.slug);
    return n ? Math.max(m, Number(n[1])) : m;
  }, 0);
  return `fact-${max + 1}`;
}

export async function createFact(input: FactInput): Promise<FactResult> {
  const mgr = await getDeeboManager();
  if (!mgr) return { ok: false, message: NO_PERM };
  const sb = service();
  if (!sb) return { ok: false, message: NO_KEY };

  const invalid = validate(input);
  if (invalid) return { ok: false, message: invalid };

  const { data: last } = await sb
    .from("deebo_knowledge")
    .select("sort")
    .order("sort", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSort = (last?.sort ?? -1) + 1;

  const { data: created, error } = await sb
    .from("deebo_knowledge")
    .insert({ ...columns(input), slug: await nextSlug(sb), sort: nextSort, created_by: mgr.userId })
    .select("id")
    .single();
  if (error || !created) {
    return { ok: false, message: `تعذّرت إضافة الواقعة: ${error?.message ?? "بلا تفاصيل"}` };
  }

  revalidateFacts();
  return { ok: true, message: "أُضيفت الواقعة، ويقولها ديبو من الآن.", id: created.id };
}

export async function updateFact(id: string, input: FactInput): Promise<FactResult> {
  const mgr = await getDeeboManager();
  if (!mgr) return { ok: false, message: NO_PERM };
  const sb = service();
  if (!sb) return { ok: false, message: NO_KEY };

  const invalid = validate(input);
  if (invalid) return { ok: false, message: invalid };

  const { error } = await sb.from("deebo_knowledge").update(columns(input)).eq("id", id);
  if (error) return { ok: false, message: error.message };

  revalidateFacts();
  return { ok: true, message: "حُفظت التغييرات.", id };
}

/** الإيقافُ والتشغيل — الموقوفةُ تبقى في الغرفة ولا تدخل نصَّ التوجيه. */
export async function toggleFact(id: string, isActive: boolean): Promise<FactResult> {
  const mgr = await getDeeboManager();
  if (!mgr) return { ok: false, message: NO_PERM };
  const sb = service();
  if (!sb) return { ok: false, message: NO_KEY };

  const { error } = await sb.from("deebo_knowledge").update({ is_active: isActive }).eq("id", id);
  if (error) return { ok: false, message: error.message };

  revalidateFacts();
  return { ok: true, message: isActive ? "عادت الواقعة إلى معرفته." : "أُوقفت الواقعة." };
}

export async function deleteFact(id: string): Promise<FactResult> {
  const mgr = await getDeeboManager();
  if (!mgr) return { ok: false, message: NO_PERM };
  const sb = service();
  if (!sb) return { ok: false, message: NO_KEY };

  const { data: f, error } = await sb
    .from("deebo_knowledge")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (error) return { ok: false, message: `تعذّرت قراءة الواقعة: ${error.message}` };
  if (!f) return { ok: false, message: "لا وجود لهذه الواقعة." };

  const { error: dErr } = await sb.from("deebo_knowledge").delete().eq("id", id);
  if (dErr) return { ok: false, message: `تعذّر الحذف: ${dErr.message}` };

  revalidateFacts();
  return { ok: true, message: "حُذفت الواقعة." };
}

/** تحريك واقعةٍ خطوةً — يبادل قيمة `sort` مع جارتها في الاتّجاه المطلوب. */
export async function moveFact(id: string, dir: "up" | "down"): Promise<FactResult> {
  const mgr = await getDeeboManager();
  if (!mgr) return { ok: false, message: NO_PERM };
  const sb = service();
  if (!sb) return { ok: false, message: NO_KEY };

  const { data: rows, error } = await sb
    .from("deebo_knowledge")
    .select("id, sort")
    .order("sort", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) return { ok: false, message: error.message };
  const list = rows ?? [];
  const i = list.findIndex((r) => r.id === id);
  if (i === -1) return { ok: false, message: "لا وجود لهذه الواقعة." };

  const j = dir === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= list.length) return { ok: false, message: "الواقعة في الطرف بالفعل." };

  const a = list[i], b = list[j];
  /* متساويتان في `sort`؟ فالمبادلةُ وحدها لا تحرّك شيئًا (الترتيبُ حينئذٍ بـ`created_at`)،
     فتُزاح المتحرّكةُ خطوةً إلى جهة قصدها: صاعدةً تنقص لتسبق، وهابطةً تزيد لتلحق. */
  const aSort = a.sort === b.sort ? (dir === "up" ? b.sort - 1 : b.sort + 1) : b.sort;
  const [r1, r2] = await Promise.all([
    sb.from("deebo_knowledge").update({ sort: aSort }).eq("id", a.id),
    sb.from("deebo_knowledge").update({ sort: a.sort }).eq("id", b.id),
  ]);
  if (r1.error || r2.error) return { ok: false, message: (r1.error ?? r2.error)!.message };

  revalidateFacts();
  return { ok: true, message: dir === "up" ? "حُرّكت لأعلى." : "حُرّكت لأسفل." };
}
