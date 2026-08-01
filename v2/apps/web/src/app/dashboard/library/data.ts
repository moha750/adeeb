// يُستورَد فقط من مكوّنات خادميّة (page.tsx). المفتاح بلا بادئة NEXT_PUBLIC فلا يصل المتصفّح.
import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";
import { yearLabel, type BookKind, type BookStatus } from "./vocab";

const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

/** تاريخ عربيّ مختصر من ISO. */
const fmtDate = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  // تنقية المفتاح من محارف دخيلة قد تلتصق عند اللصق (JWT لا يحوي إلا هذه)
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

const BUCKET = "library";
const ENV_MISSING = "أضِف SUPABASE_SERVICE_ROLE_KEY إلى apps/web/.env.local ثمّ أعِد تشغيل الخادم.";

export type BookRow = {
  id: string;
  title: string;
  slug: string;
  kind: BookKind;
  summary: string | null;
  yearHijri: number | null;
  yearGregorian: number | null;
  yearLabel: string;
  status: BookStatus;
  isFeatured: boolean;
  pageCount: number;
  coverUrl: string | null;
  views: number;
  order: number;
  publishedAt: string | null;
  publishedLabel: string;
  createdRaw: string;
};

/**
 * قائمة الكتب مع عدّ صفحاتها ورابط غلافها — العدّ من صفوف library_pages (لا عمود مخزّن)،
 * والغلاف من cover_page_id أو أوّل صفحة (أدنى page_number) كاحتياط.
 */
export async function getBooks(): Promise<{ books: BookRow[]; error: string | null }> {
  const sb = service();
  if (!sb) return { books: [], error: ENV_MISSING };

  const [bRes, pRes] = await Promise.all([
    sb.from("library_books")
      .select("id, title, slug, kind, summary, year_hijri, year_gregorian, status, is_featured, cover_page_id, views, \"order\", published_at, created_at")
      .order("is_featured", { ascending: false })
      .order("order", { ascending: true })
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
    sb.from("library_pages").select("id, book_id, storage_path, page_number"),
  ]);
  if (bRes.error) return { books: [], error: bRes.error.message };
  if (pRes.error) return { books: [], error: pRes.error.message };

  // عدّ الصفحات + مسار أوّل صفحة لكلّ كتاب + مسار كلّ صفحة بمعرّفها (لحلّ الغلاف المعيّن)
  const count = new Map<string, number>();
  const firstPath = new Map<string, { n: number; path: string }>();
  const pathById = new Map<string, string>();
  for (const p of pRes.data ?? []) {
    count.set(p.book_id, (count.get(p.book_id) ?? 0) + 1);
    pathById.set(p.id, p.storage_path);
    const cur = firstPath.get(p.book_id);
    if (!cur || p.page_number < cur.n) firstPath.set(p.book_id, { n: p.page_number, path: p.storage_path });
  }
  const publicUrl = (path: string | null | undefined) =>
    path ? sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl : null;

  const books: BookRow[] = (bRes.data ?? []).map((b) => {
    const coverPath = (b.cover_page_id ? pathById.get(b.cover_page_id) : undefined) ?? firstPath.get(b.id)?.path ?? null;
    return {
      id: b.id,
      title: b.title,
      slug: b.slug,
      kind: b.kind as BookKind,
      summary: b.summary ?? null,
      yearHijri: b.year_hijri ?? null,
      yearGregorian: b.year_gregorian ?? null,
      yearLabel: yearLabel(b.year_hijri ?? null, b.year_gregorian ?? null),
      status: b.status as BookStatus,
      isFeatured: b.is_featured,
      pageCount: count.get(b.id) ?? 0,
      coverUrl: publicUrl(coverPath),
      views: b.views ?? 0,
      order: b.order ?? 0,
      publishedAt: b.published_at ?? null,
      publishedLabel: fmtDate(b.published_at ?? null),
      createdRaw: b.created_at ?? "",
    };
  });

  return { books, error: null };
}

/* ── كتاب واحد لنموذج تحرير البيانات (حقول خام) ── */

export type BookEditData = {
  id: string;
  title: string;
  slug: string;
  kind: BookKind;
  summary: string | null;
  yearHijri: number | null;
  yearGregorian: number | null;
};

/* ── رأس الكتاب + صفحاته (لمحرّر [id]) ── */

export type BookHeader = {
  id: string;
  title: string;
  slug: string;
  kind: BookKind;
  status: BookStatus;
  yearLabel: string;
  coverPageId: string | null;
};

export type PageEditRow = {
  id: string;
  url: string;
  pageNumber: number;
  label: string | null;
  isHard: boolean;
  isCover: boolean;
};

export async function getBookEditor(id: string): Promise<{ book: BookHeader | null; pages: PageEditRow[]; error: string | null }> {
  const sb = service();
  if (!sb) return { book: null, pages: [], error: ENV_MISSING };

  const [bRes, pRes] = await Promise.all([
    sb.from("library_books").select("id, title, slug, kind, status, year_hijri, year_gregorian, cover_page_id").eq("id", id).maybeSingle(),
    sb.from("library_pages").select("id, storage_path, page_number, label, is_hard").eq("book_id", id).order("page_number", { ascending: true }),
  ]);
  if (bRes.error) return { book: null, pages: [], error: bRes.error.message };
  if (pRes.error) return { book: null, pages: [], error: pRes.error.message };
  if (!bRes.data) return { book: null, pages: [], error: null };

  const b = bRes.data;
  const book: BookHeader = {
    id: b.id, title: b.title, slug: b.slug, kind: b.kind as BookKind, status: b.status as BookStatus,
    yearLabel: yearLabel(b.year_hijri ?? null, b.year_gregorian ?? null), coverPageId: b.cover_page_id ?? null,
  };
  const pages: PageEditRow[] = (pRes.data ?? []).map((p) => ({
    id: p.id,
    url: sb.storage.from(BUCKET).getPublicUrl(p.storage_path).data.publicUrl,
    pageNumber: p.page_number,
    label: p.label ?? null,
    isHard: p.is_hard,
    isCover: p.id === book.coverPageId,
  }));
  return { book, pages, error: null };
}

export async function getBookForEdit(id: string): Promise<{ book: BookEditData | null; error: string | null }> {
  const sb = service();
  if (!sb) return { book: null, error: ENV_MISSING };

  const { data, error } = await sb
    .from("library_books")
    .select("id, title, slug, kind, summary, year_hijri, year_gregorian")
    .eq("id", id)
    .maybeSingle();
  if (error) return { book: null, error: error.message };
  if (!data) return { book: null, error: null };

  return {
    book: {
      id: data.id,
      title: data.title,
      slug: data.slug,
      kind: data.kind as BookKind,
      summary: data.summary ?? null,
      yearHijri: data.year_hijri ?? null,
      yearGregorian: data.year_gregorian ?? null,
    },
    error: null,
  };
}
