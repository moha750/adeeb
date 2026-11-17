import "server-only";
import { createAdeebServerClient } from "@adeeb/core";
import { KIND_META, yearLabel, type BookKind } from "../dashboard/library/vocab";

/**
 * رفُّ المكتبة العامّ — قراءةُ `library/page.tsx` نفسُها نُقلت إلى بيتها (٢٠٢٦-١١-١٥) لتقرأها الصفحةُ وقالبُ «الفهرس» من مصدرٍ
 * واحد: المنشورُ وحده (المميّزُ أوّلًا ثمّ الترتيبُ ثمّ الأحدث)، وغلافُ كلٍّ صفحتُه المختارة وإلّا أوّلُ صفحاته. بمفتاح anon (RLS).
 */
export type ShelfBook = {
  id: string;
  title: string;
  slug: string;
  kind: BookKind;
  kindLabel: string;
  yearLabel: string;
  coverUrl: string | null;
  isFeatured: boolean;
};

const BUCKET = "library";

export async function getShelf(): Promise<{ books: ShelfBook[]; error: string | null }> {
  const sb = createAdeebServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: books, error } = await sb
    .from("library_books")
    .select("id, title, slug, kind, summary, year_hijri, year_gregorian, is_featured, cover_page_id")
    .eq("status", "published")
    .order("is_featured", { ascending: false })
    .order("order", { ascending: true })
    .order("published_at", { ascending: false, nullsFirst: false });
  if (error) return { books: [], error: error.message };

  const ids = (books ?? []).map((b) => b.id);
  const { data: pages } = ids.length
    ? await sb.from("library_pages").select("id, book_id, storage_path, page_number").in("book_id", ids)
    : { data: [] as { id: string; book_id: string; storage_path: string; page_number: number }[] };

  // خريطةُ الغلاف: `cover_page_id` أو أوّلُ صفحة (أدنى `page_number`)
  const pathById = new Map<string, string>();
  const firstPath = new Map<string, { n: number; path: string }>();
  for (const p of pages ?? []) {
    pathById.set(p.id, p.storage_path);
    const cur = firstPath.get(p.book_id);
    if (!cur || p.page_number < cur.n) firstPath.set(p.book_id, { n: p.page_number, path: p.storage_path });
  }
  const publicUrl = (path: string | null | undefined) => (path ? sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl : null);

  return {
    error: null,
    books: (books ?? []).map((b) => {
      const coverPath = (b.cover_page_id ? pathById.get(b.cover_page_id) : undefined) ?? firstPath.get(b.id)?.path ?? null;
      return {
        id: b.id, title: b.title, slug: b.slug, kind: b.kind as BookKind, kindLabel: KIND_META[b.kind as BookKind].label,
        yearLabel: yearLabel(b.year_hijri ?? null, b.year_gregorian ?? null), coverUrl: publicUrl(coverPath), isFeatured: b.is_featured,
      };
    }),
  };
}
