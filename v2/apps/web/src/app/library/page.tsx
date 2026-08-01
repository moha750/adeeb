import { Header, Footer, Container, LandingHeading } from "@adeeb/design-system";
import { createAdeebServerClient } from "@adeeb/core";
import { KIND_META, yearLabel, type BookKind } from "../dashboard/library/vocab";
import { LibraryShelf, type ShelfBook } from "./LibraryShelf";

export const revalidate = 60;

export const metadata = {
  title: "مكتبة إرثٌ يُروى — أديب",
  description: "أرشيفٌ حيٌّ من منشورات نادي أديب: تقاريره ومجلّاته وكتيّباته، كلُّ صفحةٍ بأثرها.",
};

const BUCKET = "library";

export default async function LibraryPage() {
  const sb = createAdeebServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data: books, error } = await sb
    .from("library_books")
    .select("id, title, slug, kind, summary, year_hijri, year_gregorian, is_featured, cover_page_id")
    .eq("status", "published")
    .order("is_featured", { ascending: false })
    .order("order", { ascending: true })
    .order("published_at", { ascending: false, nullsFirst: false });

  const ids = (books ?? []).map((b) => b.id);
  const { data: pages } = ids.length
    ? await sb.from("library_pages").select("id, book_id, storage_path, page_number").in("book_id", ids)
    : { data: [] as { id: string; book_id: string; storage_path: string; page_number: number }[] };

  // خريطة الغلاف: cover_page_id أو أوّل صفحة (أدنى page_number)
  const pathById = new Map<string, string>();
  const firstPath = new Map<string, { n: number; path: string }>();
  for (const p of pages ?? []) {
    pathById.set(p.id, p.storage_path);
    const cur = firstPath.get(p.book_id);
    if (!cur || p.page_number < cur.n) firstPath.set(p.book_id, { n: p.page_number, path: p.storage_path });
  }
  const publicUrl = (path: string | null | undefined) =>
    path ? sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl : null;

  const shelf: ShelfBook[] = (books ?? []).map((b) => {
    const coverPath = (b.cover_page_id ? pathById.get(b.cover_page_id) : undefined) ?? firstPath.get(b.id)?.path ?? null;
    return {
      id: b.id,
      title: b.title,
      slug: b.slug,
      kind: b.kind as BookKind,
      kindLabel: KIND_META[b.kind as BookKind].label,
      yearLabel: yearLabel(b.year_hijri ?? null, b.year_gregorian ?? null),
      coverUrl: publicUrl(coverPath),
      isFeatured: b.is_featured,
    };
  });

  return (
    <>
      <Header nav={[{ label: "المكتبة", href: "/library" }, { label: "الرئيسية", href: "/" }]} />
      <main>
        <section className="py-16 md:py-24">
          <Container>
            <LandingHeading eyebrow="أرشيف" title="إرثٌ يُروى" deck="منشورات نادي أديب عبر المواسم — كلُّ صفحةٍ بأثرها." align="center" />
            {error ? (
              <p className="mt-8 text-center text-danger">تعذّر جلب المكتبة: {error.message}</p>
            ) : shelf.length === 0 ? (
              <p className="mt-8 text-center text-content-muted">لا منشورات في المكتبة بعد.</p>
            ) : (
              <LibraryShelf books={shelf} />
            )}
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
