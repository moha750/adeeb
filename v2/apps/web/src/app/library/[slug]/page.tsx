import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Header, Footer, Container } from "@adeeb/design-system";
import type { BookReaderPage } from "@adeeb/design-system";
import { createAdeebServerClient } from "@adeeb/core";
import { KIND_META, yearLabel, type BookKind } from "../../dashboard/library/vocab";
import { Reader } from "./Reader";

export const revalidate = 60;

const BUCKET = "library";

function sb() {
  return createAdeebServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

async function loadBook(slug: string) {
  const client = sb();
  const { data: book } = await client
    .from("library_books")
    .select("id, title, slug, summary, kind, year_hijri, year_gregorian")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!book) return null;

  const { data: rows } = await client
    .from("library_pages")
    .select("storage_path, page_number, label, is_hard")
    .eq("book_id", book.id)
    .order("page_number", { ascending: true });

  // الصفحة الكاملة: بلا تحويل (الأصول WebP ~100ك.ب مُحسَّنة؛ التحويل يُكبّرها). الأداء من التحميل المُنافِذ.
  // المصغّرة: تحويلٌ بعرض 150 — هنا ينفع التحويل فعلًا (تصغيرٌ حقيقيّ لشريط الفهرس).
  const pages: BookReaderPage[] = (rows ?? []).map((p) => ({
    src: client.storage.from(BUCKET).getPublicUrl(p.storage_path).data.publicUrl,
    thumb: client.storage.from(BUCKET).getPublicUrl(p.storage_path, { transform: { width: 150, quality: 60 } }).data.publicUrl,
    alt: p.label ?? `صفحة ${p.page_number}`,
    hard: p.is_hard,
  }));
  return { book, pages };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const res = await loadBook(slug);
  if (!res) return { title: "المكتبة — أديب" };
  const { book, pages } = res;
  return {
    title: `${book.title} — مكتبة أديب`,
    description: book.summary ?? "منشورٌ من مكتبة «إرثٌ يُروى» في نادي أديب.",
    openGraph: { title: book.title, description: book.summary ?? undefined, images: pages[0] ? [pages[0].src] : undefined },
  };
}

export default async function BookReaderPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const res = await loadBook(slug);
  if (!res) notFound();
  const { book, pages } = res;

  const kindLabel = KIND_META[book.kind as BookKind].label;
  const yr = yearLabel(book.year_hijri ?? null, book.year_gregorian ?? null);

  return (
    <>
      <Header activeHref="/library" />
      <main>
        <section className="py-10 md:py-14">
          <Container>
            <div className="mb-6 text-center">
              <div className="font-body text-sm font-bold text-secondary">{kindLabel}{yr ? ` · ${yr}` : ""}</div>
              <h1 className="font-display text-2xl font-bold text-content md:text-3xl">{book.title}</h1>
              {book.summary ? <p className="mx-auto mt-2 max-w-2xl text-content-muted">{book.summary}</p> : null}
            </div>
            {pages.length === 0 ? (
              <p className="text-center text-content-muted">لا صفحات في هذا المنشور بعد.</p>
            ) : (
              <Reader bookId={book.id} pages={pages} />
            )}
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
