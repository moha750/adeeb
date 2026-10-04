"use server";

import { createAdeebServiceClient } from "@adeeb/core";
import { revalidatePath } from "next/cache";
import { getWebsiteManager } from "@/lib/website/authz";

export type AnnouncementResult = { ok: boolean; message: string; id?: string };

/**
 * يقلّم المسافات ومحارف الاتّجاه الخفيّة اللاصقة من اللصق العربيّ، **ويطوي الأسطر**:
 * الشريطُ سطرٌ واحدٌ يجري، فسطرٌ ثانٍ في النصّ لا يُرسَم وإنّما يفتح فجوةً في الجريان.
 */
const clean = (v: string | null | undefined): string =>
  v?.replace(/[‎‏‪-‮]/g, "").replace(/\s+/g, " ").trim() ?? "";

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

const NO_KEY = "إعداد الخادم ناقص (مفتاح الخدمة).";
const NO_PERM = "لا تملك صلاحية إدارة اللوحة الإعلانية.";

/** تنعش الغرفة والصفحة الرئيسية: الشريطُ يُرسَم في صفحةٍ مخزَّنة (ISR) فتُبطَل لقطتُها. */
function revalidateAnnouncements() {
  revalidatePath("/dashboard/website/announcements/ticker");
  revalidatePath("/dashboard/website/announcements/news");
  revalidatePath("/");
}

export type AnnouncementInput = {
  text: string;
  isActive: boolean;
};

/** التحقّق المشترك — نفس قيود القاعدة برسائل عربيّة (لا نثق بالعميل). */
function validate(input: AnnouncementInput): string | null {
  const text = clean(input.text);
  if (text.length < 2) return "نصّ الإعلان مطلوب.";
  // الحدُّ نفسُه في القاعدة: الشريطُ يجري ولا يقف، فجملةٌ تطول تخرج قبل أن تُقرأ.
  if (text.length > 120) return "الإعلان أطول من مئةٍ وعشرين حرفًا. اختصِره أو اقسِمه إعلانَين.";
  return null;
}

function columns(input: AnnouncementInput) {
  return { text: clean(input.text), is_active: input.isActive };
}

export async function createAnnouncement(input: AnnouncementInput): Promise<AnnouncementResult> {
  const mgr = await getWebsiteManager("announcements");
  if (!mgr) return { ok: false, message: NO_PERM };
  const sb = service();
  if (!sb) return { ok: false, message: NO_KEY };

  const invalid = validate(input);
  if (invalid) return { ok: false, message: invalid };

  const { data: last } = await sb
    .from("announcements")
    .select("sort")
    .order("sort", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSort = (last?.sort ?? -1) + 1;

  const { data: created, error } = await sb
    .from("announcements")
    .insert({ ...columns(input), sort: nextSort, created_by: mgr.userId })
    .select("id")
    .single();
  if (error || !created) {
    return { ok: false, message: `تعذّرت إضافة الإعلان: ${error?.message ?? "بلا تفاصيل"}` };
  }

  revalidateAnnouncements();
  return { ok: true, message: "أُضيف الإعلان إلى الشريط.", id: created.id };
}

export async function updateAnnouncement(
  id: string,
  input: AnnouncementInput,
): Promise<AnnouncementResult> {
  const mgr = await getWebsiteManager("announcements");
  if (!mgr) return { ok: false, message: NO_PERM };
  const sb = service();
  if (!sb) return { ok: false, message: NO_KEY };

  const invalid = validate(input);
  if (invalid) return { ok: false, message: invalid };

  const { error } = await sb.from("announcements").update(columns(input)).eq("id", id);
  if (error) return { ok: false, message: error.message };

  revalidateAnnouncements();
  return { ok: true, message: "حُفظت التغييرات.", id };
}

/** الإطفاءُ والإشعال — المُطفَأُ يبقى في الغرفة ولا يمرّ في الشريط. */
export async function toggleAnnouncement(
  id: string,
  isActive: boolean,
): Promise<AnnouncementResult> {
  const mgr = await getWebsiteManager("announcements");
  if (!mgr) return { ok: false, message: NO_PERM };
  const sb = service();
  if (!sb) return { ok: false, message: NO_KEY };

  const { error } = await sb.from("announcements").update({ is_active: isActive }).eq("id", id);
  if (error) return { ok: false, message: error.message };

  revalidateAnnouncements();
  return { ok: true, message: isActive ? "عاد الإعلان إلى الشريط." : "أُطفئ الإعلان." };
}

export async function deleteAnnouncement(id: string): Promise<AnnouncementResult> {
  const mgr = await getWebsiteManager("announcements");
  if (!mgr) return { ok: false, message: NO_PERM };
  const sb = service();
  if (!sb) return { ok: false, message: NO_KEY };

  const { data: a, error } = await sb
    .from("announcements")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (error) return { ok: false, message: `تعذّرت قراءة الإعلان: ${error.message}` };
  if (!a) return { ok: false, message: "لا وجود لهذا الإعلان." };

  const { error: dErr } = await sb.from("announcements").delete().eq("id", id);
  if (dErr) return { ok: false, message: `تعذّر الحذف: ${dErr.message}` };

  revalidateAnnouncements();
  return { ok: true, message: "حُذف الإعلان." };
}

/** تحريك إعلانٍ خطوةً — يبادل قيمة `sort` مع جاره في الاتّجاه المطلوب. */
export async function moveAnnouncement(
  id: string,
  dir: "up" | "down",
): Promise<AnnouncementResult> {
  const mgr = await getWebsiteManager("announcements");
  if (!mgr) return { ok: false, message: NO_PERM };
  const sb = service();
  if (!sb) return { ok: false, message: NO_KEY };

  const { data: rows, error } = await sb
    .from("announcements")
    .select("id, sort")
    .order("sort", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) return { ok: false, message: error.message };
  const list = rows ?? [];
  const i = list.findIndex((r) => r.id === id);
  if (i === -1) return { ok: false, message: "لا وجود لهذا الإعلان." };

  const j = dir === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= list.length) return { ok: false, message: "الإعلان في الطرف بالفعل." };

  const a = list[i], b = list[j];
  /* متساويان في `sort`؟ فالمبادلةُ وحدها لا تحرّك شيئًا (الترتيبُ حينئذٍ بـ`created_at`)،
     فيُزاح المتحرّكُ خطوةً إلى جهة قصده: صاعدًا ينقص ليسبق، وهابطًا يزيد ليلحق. */
  const aSort = a.sort === b.sort ? (dir === "up" ? b.sort - 1 : b.sort + 1) : b.sort;
  const [r1, r2] = await Promise.all([
    sb.from("announcements").update({ sort: aSort }).eq("id", a.id),
    sb.from("announcements").update({ sort: a.sort }).eq("id", b.id),
  ]);
  if (r1.error || r2.error) return { ok: false, message: (r1.error ?? r2.error)!.message };

  revalidateAnnouncements();
  return { ok: true, message: dir === "up" ? "حُرّك لأعلى." : "حُرّك لأسفل." };
}

/* ══ الأخبار المعروضة في الصدر (`hero_news`) ══════════════════════════
   قسمٌ ثانٍ في الغرفة نفسِها وبقفلها نفسِه. والإزالةُ لا تمسّ الخبر: تُخرجه من
   العارض وحده، فلا تأكيدَ لها ولا «منطقةَ خطر». */

/** إضافةُ خبرٍ إلى آخر العارض — منشورٌ له غلافٌ وحده (الصدرُ صورةٌ قبل أن يكون عنوانًا). */
export async function addHeroNews(newsId: string): Promise<AnnouncementResult> {
  const mgr = await getWebsiteManager("announcements");
  if (!mgr) return { ok: false, message: NO_PERM };
  const sb = service();
  if (!sb) return { ok: false, message: NO_KEY };

  const { data: n, error: nErr } = await sb
    .from("news")
    .select("id, workflow_status, image_url")
    .eq("id", newsId)
    .maybeSingle();
  if (nErr) return { ok: false, message: `تعذّرت قراءة الخبر: ${nErr.message}` };
  if (!n) return { ok: false, message: "لا وجود لهذا الخبر." };
  if (n.workflow_status !== "published") return { ok: false, message: "الخبر غير منشور." };
  if (!n.image_url) return { ok: false, message: "الخبر بلا صورة غلاف." };

  const { data: last } = await sb
    .from("hero_news")
    .select("sort")
    .order("sort", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSort = (last?.sort ?? -1) + 1;

  const { error } = await sb
    .from("hero_news")
    .insert({ news_id: newsId, sort: nextSort, created_by: mgr.userId });
  if (error) {
    // المفتاحُ هو الخبر: نقرتان متتاليتان أو نافذتان مفتوحتان لا تُكرّران شريحة.
    if (error.code === "23505") return { ok: false, message: "الخبر معروضٌ بالفعل." };
    return { ok: false, message: `تعذّرت الإضافة: ${error.message}` };
  }

  revalidateAnnouncements();
  return { ok: true, message: "أُضيف الخبر إلى الصدر.", id: newsId };
}

export async function removeHeroNews(newsId: string): Promise<AnnouncementResult> {
  const mgr = await getWebsiteManager("announcements");
  if (!mgr) return { ok: false, message: NO_PERM };
  const sb = service();
  if (!sb) return { ok: false, message: NO_KEY };

  const { error } = await sb.from("hero_news").delete().eq("news_id", newsId);
  if (error) return { ok: false, message: `تعذّرت الإزالة: ${error.message}` };

  revalidateAnnouncements();
  return { ok: true, message: "أُزيل الخبر من الصدر." };
}

/** تحريكُ خبرٍ خطوةً — عُرفُ `moveAnnouncement` نفسُه: مبادلةُ `sort` مع الجار. */
export async function moveHeroNews(
  newsId: string,
  dir: "up" | "down",
): Promise<AnnouncementResult> {
  const mgr = await getWebsiteManager("announcements");
  if (!mgr) return { ok: false, message: NO_PERM };
  const sb = service();
  if (!sb) return { ok: false, message: NO_KEY };

  const { data: rows, error } = await sb
    .from("hero_news")
    .select("news_id, sort")
    .order("sort", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) return { ok: false, message: error.message };
  const list = rows ?? [];
  const i = list.findIndex((r) => r.news_id === newsId);
  if (i === -1) return { ok: false, message: "الخبر ليس في الصدر." };

  const j = dir === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= list.length) return { ok: false, message: "الخبر في الطرف بالفعل." };

  const a = list[i], b = list[j];
  const aSort = a.sort === b.sort ? (dir === "up" ? b.sort - 1 : b.sort + 1) : b.sort;
  const [r1, r2] = await Promise.all([
    sb.from("hero_news").update({ sort: aSort }).eq("news_id", a.news_id),
    sb.from("hero_news").update({ sort: a.sort }).eq("news_id", b.news_id),
  ]);
  if (r1.error || r2.error) return { ok: false, message: (r1.error ?? r2.error)!.message };

  revalidateAnnouncements();
  return { ok: true, message: dir === "up" ? "حُرّك لأعلى." : "حُرّك لأسفل." };
}
