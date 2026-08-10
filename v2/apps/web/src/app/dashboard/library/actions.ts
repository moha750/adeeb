"use server";

import { createAdeebServiceClient } from "@adeeb/core";
import { revalidatePath } from "next/cache";
import { getLibraryManager } from "@/lib/library/authz";
import { KIND_VALUES, slugify, type BookKind } from "./vocab";

export type BookResult = { ok: boolean; message: string; id?: string };

/** صفحة جديدة تعود للعميل بعد الرفع كي يُلحقها بحالته بلا إعادة جلب كامل. */
export type NewPage = { id: string; pageNumber: number; url: string; storagePath: string };
export type PageResult = { ok: boolean; message: string; page?: NewPage };

const BUCKET = "library";

/** يقلّم المسافات ومحارف الاتّجاه الخفيّة اللاصقة من اللصق العربيّ، ويحوّل الفارغ إلى null. */
const clean = (v: string | null | undefined): string | null => {
  const t = v?.replace(/[‎‏‪-‮]/g, "").trim();
  return t ? t : null;
};

/** سنة صحيحة معقولة أو null. */
const cleanYear = (v: number | null | undefined): number | null => {
  if (v == null || !Number.isFinite(v)) return null;
  const n = Math.trunc(v);
  return n > 0 && n < 3000 ? n : null;
};

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

const ENV_MISSING = "إعداد الخادم ناقص (مفتاح الخدمة).";
const DENIED = "لا تملك صلاحية إدارة المكتبة.";

export type BookInput = {
  title: string;
  slug: string;
  kind: BookKind;
  summary?: string | null;
  yearHijri?: number | null;
  yearGregorian?: number | null;
};

/** التحقّق المشترك — لا نثق بالعميل؛ نفس قيود القاعدة برسائل عربيّة. */
function validate(input: BookInput): { error: string } | { slug: string } {
  if (!clean(input.title)) return { error: "عنوان المنشور مطلوب." };
  if (!KIND_VALUES.includes(input.kind)) return { error: "نوع منشور غير معروف." };
  const slug = slugify(input.slug ?? "");
  if (!slug) return { error: "المعرّف (السلاگ) مطلوب: أحرف لاتينيّة وأرقام." };
  return { slug };
}

/** أعمدة الكتاب من المُدخَل — مكان واحد للإنشاء والتحديث. */
function bookColumns(input: BookInput, slug: string) {
  return {
    title: clean(input.title),
    slug,
    kind: input.kind,
    summary: clean(input.summary),
    year_hijri: cleanYear(input.yearHijri),
    year_gregorian: cleanYear(input.yearGregorian),
  };
}

/** رسالة ودّية لانتهاك تفرّد السلاگ. */
const isDup = (msg: string) => /duplicate key|unique|library_books_slug/i.test(msg);

export async function createBook(input: BookInput): Promise<BookResult> {
  const mgr = await getLibraryManager();
  if (!mgr) return { ok: false, message: DENIED };
  const sb = service();
  if (!sb) return { ok: false, message: ENV_MISSING };

  const v = validate(input);
  if ("error" in v) return { ok: false, message: v.error };

  // تُنشأ مسودّةً دائمًا — النشر فعلٌ مستقلّ.
  const { data, error } = await sb
    .from("library_books")
    .insert({ ...bookColumns(input, v.slug), status: "draft", created_by: mgr.userId })
    .select("id")
    .single();
  if (error || !data) {
    if (error && isDup(error.message)) return { ok: false, message: "هذا المعرّف مستخدَم. اختر غيره." };
    return { ok: false, message: `تعذّر إنشاء المنشور: ${error?.message ?? "بلا تفاصيل"}` };
  }

  revalidatePath("/dashboard/library", "layout");
  return { ok: true, message: "أُنشئ المنشور مسودّةً. افتحه لإضافة الصفحات.", id: data.id };
}

export async function updateBook(id: string, input: BookInput): Promise<BookResult> {
  const mgr = await getLibraryManager();
  if (!mgr) return { ok: false, message: DENIED };
  const sb = service();
  if (!sb) return { ok: false, message: ENV_MISSING };

  const v = validate(input);
  if ("error" in v) return { ok: false, message: v.error };

  const { error } = await sb
    .from("library_books")
    .update({ ...bookColumns(input, v.slug), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    if (isDup(error.message)) return { ok: false, message: "هذا المعرّف مستخدَم. اختر غيره." };
    return { ok: false, message: error.message };
  }

  revalidatePath("/dashboard/library", "layout");
  return { ok: true, message: "حُفظت التغييرات.", id };
}

/** نشر/إلغاء نشر — يضبط published_at عند أوّل نشر ويُبقيه (تاريخ النشر الأصليّ). */
export async function setBookStatus(id: string, op: "publish" | "unpublish"): Promise<BookResult> {
  const mgr = await getLibraryManager();
  if (!mgr) return { ok: false, message: DENIED };
  const sb = service();
  if (!sb) return { ok: false, message: ENV_MISSING };

  if (op === "publish") {
    // لا يُنشَر كتابٌ بلا صفحات — نشرٌ فارغ لا معنى له.
    const { count, error: cErr } = await sb
      .from("library_pages")
      .select("id", { count: "exact", head: true })
      .eq("book_id", id);
    if (cErr) return { ok: false, message: `تعذّر فحص الصفحات: ${cErr.message}` };
    if (!count || count === 0) return { ok: false, message: "لا يُنشَر منشورٌ بلا صفحات. أضِف صفحاته أولًا." };

    const { data: cur } = await sb.from("library_books").select("published_at").eq("id", id).maybeSingle();
    const patch: Record<string, unknown> = { status: "published", updated_at: new Date().toISOString() };
    if (!cur?.published_at) patch.published_at = new Date().toISOString();
    const { error } = await sb.from("library_books").update(patch).eq("id", id);
    if (error) return { ok: false, message: `تعذّر النشر: ${error.message}` };
    revalidatePath("/dashboard/library", "layout");
    return { ok: true, message: "نُشِر المنشور." };
  }

  const { error } = await sb
    .from("library_books")
    .update({ status: "draft", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, message: `تعذّر إلغاء النشر: ${error.message}` };
  revalidatePath("/dashboard/library", "layout");
  return { ok: true, message: "أُلغي النشر، عاد مسودّةً." };
}

export async function toggleBookFeatured(id: string, value: boolean): Promise<BookResult> {
  const mgr = await getLibraryManager();
  if (!mgr) return { ok: false, message: DENIED };
  const sb = service();
  if (!sb) return { ok: false, message: ENV_MISSING };

  const { error } = await sb
    .from("library_books")
    .update({ is_featured: value, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/dashboard/library", "layout");
  return { ok: true, message: value ? "مُيّز على الرفّ." : "أُزيل التمييز." };
}

/**
 * حذف نهائيّ — الـcascade يحذف صفوف الصفحات لكن لا كائنات التخزين؛ فنمسحها صراحةً
 * تحت بادئة `{id}/pages` قبل حذف الصفّ كي لا تتراكم أيتام في الدلو.
 */
export async function deleteBook(id: string): Promise<BookResult> {
  const mgr = await getLibraryManager();
  if (!mgr) return { ok: false, message: DENIED };
  const sb = service();
  if (!sb) return { ok: false, message: ENV_MISSING };

  const { data: book } = await sb.from("library_books").select("title").eq("id", id).maybeSingle();

  const { data: files } = await sb.storage.from(BUCKET).list(`${id}/pages`, { limit: 1000 });
  if (files && files.length) {
    await sb.storage.from(BUCKET).remove(files.map((f) => `${id}/pages/${f.name}`));
  }

  const { error } = await sb.from("library_books").delete().eq("id", id);
  if (error) return { ok: false, message: `تعذّر الحذف: ${error.message}` };

  revalidatePath("/dashboard/library", "layout");
  return { ok: true, message: `حُذف «${book?.title ?? "المنشور"}».` };
}

/* ══ أفعال الصفحات (محرّر الكتاب) ═════════════════════════════════════ */

const EXT_BY_MIME: Record<string, string> = {
  "image/webp": "webp", "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png",
};

/**
 * يصكّ رابط رفع موقّع لصفحة — الرفع الفعليّ يجري **من المتصفّح مباشرةً** إلى التخزين
 * (uploadToSignedUrl)، فيتجاوز حدّ جسم Server Action (~1MB) ويخفّف الخادم.
 */
export async function createPageUploadUrl(
  bookId: string, mime: string,
): Promise<{ ok: boolean; path?: string; token?: string; message?: string }> {
  const mgr = await getLibraryManager();
  if (!mgr) return { ok: false, message: DENIED };
  const sb = service();
  if (!sb) return { ok: false, message: ENV_MISSING };

  const ext = EXT_BY_MIME[mime];
  if (!ext) return { ok: false, message: "صيغة غير مدعومة. استخدم WEBP أو JPG أو PNG." };

  const path = `${bookId}/pages/${crypto.randomUUID()}.${ext}`;
  const { data, error } = await sb.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, message: `تعذّر تجهيز الرفع: ${error?.message ?? "بلا تفاصيل"}` };
  return { ok: true, path: data.path, token: data.token };
}

/**
 * يُدرج صفّ صفحة بعد نجاح الرفع. يقبل `pageNumber` صريحًا كي لا يتسابق الرفع المتوازي
 * على `max+1` فيُنتج أرقامًا مكرّرة (العميل يوزّع أرقامًا متتالية قبل بدء الدفعة)؛
 * وإن غاب، يحسب التالي بعد الأكبر (استخدامٌ مفرد).
 */
export async function addPage(
  bookId: string, storagePath: string, opts?: { pageNumber?: number; width?: number; height?: number },
): Promise<PageResult> {
  const mgr = await getLibraryManager();
  if (!mgr) return { ok: false, message: DENIED };
  const sb = service();
  if (!sb) return { ok: false, message: ENV_MISSING };

  let nextNo = opts?.pageNumber;
  if (nextNo == null) {
    const { data: last } = await sb
      .from("library_pages").select("page_number")
      .eq("book_id", bookId).order("page_number", { ascending: false }).limit(1).maybeSingle();
    nextNo = (last?.page_number ?? 0) + 1;
  }

  const { data, error } = await sb
    .from("library_pages")
    .insert({ book_id: bookId, storage_path: storagePath, page_number: nextNo, width: opts?.width ?? null, height: opts?.height ?? null })
    .select("id, page_number")
    .single();
  if (error || !data) return { ok: false, message: `تعذّر إضافة الصفحة: ${error?.message ?? "بلا تفاصيل"}` };

  const url = sb.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
  revalidatePath("/dashboard/library", "layout");
  return { ok: true, message: "أُضيفت الصفحة.", page: { id: data.id, pageNumber: data.page_number, url, storagePath } };
}

export async function renamePage(pageId: string, label: string): Promise<PageResult> {
  const mgr = await getLibraryManager();
  if (!mgr) return { ok: false, message: DENIED };
  const sb = service();
  if (!sb) return { ok: false, message: ENV_MISSING };

  const { error } = await sb.from("library_pages").update({ label: clean(label) }).eq("id", pageId);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/dashboard/library", "layout");
  return { ok: true, message: "حُفظت التسمية." };
}

export async function setPageHard(pageId: string, value: boolean): Promise<PageResult> {
  const mgr = await getLibraryManager();
  if (!mgr) return { ok: false, message: DENIED };
  const sb = service();
  if (!sb) return { ok: false, message: ENV_MISSING };

  const { error } = await sb.from("library_pages").update({ is_hard: value }).eq("id", pageId);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/dashboard/library", "layout");
  return { ok: true, message: value ? "صارت دفّةً صلبة." : "عادت صفحةً عاديّة." };
}

/** الغلاف = مصغّرة بطاقة الرفّ فقط (لا يمسّ ترتيب القراءة). */
export async function setCoverPage(bookId: string, pageId: string): Promise<PageResult> {
  const mgr = await getLibraryManager();
  if (!mgr) return { ok: false, message: DENIED };
  const sb = service();
  if (!sb) return { ok: false, message: ENV_MISSING };

  const { error } = await sb.from("library_books").update({ cover_page_id: pageId, updated_at: new Date().toISOString() }).eq("id", bookId);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/dashboard/library", "layout");
  return { ok: true, message: "عُيّنت غلافًا للرفّ." };
}

export async function deletePage(pageId: string): Promise<PageResult> {
  const mgr = await getLibraryManager();
  if (!mgr) return { ok: false, message: DENIED };
  const sb = service();
  if (!sb) return { ok: false, message: ENV_MISSING };

  const { data: pg } = await sb.from("library_pages").select("storage_path").eq("id", pageId).maybeSingle();
  const { error } = await sb.from("library_pages").delete().eq("id", pageId);
  if (error) return { ok: false, message: `تعذّر الحذف: ${error.message}` };
  // إزالة كائن التخزين (الـcascade لا يمسّ الملفّات)؛ الغلاف يُصفَّر تلقائيًّا بـon delete set null.
  if (pg?.storage_path) await sb.storage.from(BUCKET).remove([pg.storage_path]);
  revalidatePath("/dashboard/library", "layout");
  return { ok: true, message: "حُذفت الصفحة." };
}

/** إعادة ترتيب كامل الصفحات ذرّيًّا حسب مصفوفة المعرّفات (RPC). */
export async function reorderPages(bookId: string, orderedIds: string[]): Promise<PageResult> {
  const mgr = await getLibraryManager();
  if (!mgr) return { ok: false, message: DENIED };
  const sb = service();
  if (!sb) return { ok: false, message: ENV_MISSING };

  const { error } = await sb.rpc("library_reorder_pages", { p_book_id: bookId, p_page_ids: orderedIds });
  if (error) return { ok: false, message: `تعذّر إعادة الترتيب: ${error.message}` };
  revalidatePath("/dashboard/library", "layout");
  return { ok: true, message: "حُفظ الترتيب." };
}
