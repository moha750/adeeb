import { notFound } from "next/navigation";
import type { Metadata } from "next";
import "@adeeb/design-system/ad.css";
import { Footer } from "@adeeb/design-system";
import type { BookReaderPage } from "@adeeb/design-system";
import { createAdeebServerClient } from "@adeeb/core";
import { KIND_META, yearLabel, type BookKind } from "../../dashboard/library/vocab";
import { BookRead } from "../../_ad/rooms/BookReadRoom";
import { getShelf } from "../shelf";
import { SiteHeader } from "../../_components/SiteHeader";
import { shareOg } from "@/lib/share";
import { ViewSubject } from "@/app/_components/ViewSubject";

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
    .select("id, title, slug, summary, kind, year_hijri, year_gregorian, views")
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
    // **`resize: "contain"` شرطٌ لا زينة** (٢٠٢٦-١١-١٦): بالعرض وحده كان Supabase يُبقي ارتفاعَ الأصل فتخرج المصغّرةُ 150×1755، صفحةً
    // معصورةً في شريطٍ رفيع — وكان القصُّ (`object-fit: cover`) يخفي ذلك فتبدو المصغّراتُ مقصوصة. و240 لتكون حادّةً على شاشات الضعف
    thumb: client.storage.from(BUCKET).getPublicUrl(p.storage_path, { transform: { width: 240, resize: "contain", quality: 60 } }).data.publicUrl,
    alt: p.label ?? `صفحة ${p.page_number}`,
    hard: p.is_hard,
  }));
  // **فهرسُ الكتيّب**: الصفحاتُ المسمّاةُ في البوّابة («تسمية») أقسامُه، بمؤشّرها في القارئ
  const sections = (rows ?? []).flatMap((p, i) => (p.label ? [{ title: p.label, page: i }] : []));
  return { book, pages, sections };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const res = await loadBook(slug);
  if (!res) return { title: "المكتبة، أدِيب" };
  const { book } = res;
  return {
    title: `${book.title}، مكتبة أدِيب`,
    description: book.summary ?? "منشورٌ من مكتبة «إرثٌ يُروى» في نادي أدِيب.",
    openGraph: shareOg({ title: book.title, description: book.summary ?? undefined }),
  };
}

export default async function BookReaderPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ p?: string }> }) {
  const { slug } = await params;
  // **رابطٌ إلى صفحةٍ بعينها** (`?p=34`، يبدأ بواحد كعدّاد القارئ)
  const sp = await searchParams;
  const pNum = Number(sp.p);
  const [res, shelf] = await Promise.all([loadBook(slug), getShelf()]);
  if (!res) notFound();
  const { book, pages, sections } = res;
  const initialPage = Number.isInteger(pNum) && pNum > 1 && pNum <= pages.length ? pNum - 1 : undefined;

  return (
    <>
      {/* المشاهدةُ تُعدّ من هنا: الكتابُ صُيِّر فعلًا، فالصفحةُ تُعلنه (٢٠٢٦-١١-١٧). */}
      <ViewSubject kind="book" id={book.id} />
      <SiteHeader activeHref="/library" />
      <main className="ad-pub">
        <div className="ad-pub-wrap">
          <BookRead
            book={{
              id: book.id, slug: book.slug, title: book.title, summary: book.summary ?? null, kindLabel: KIND_META[book.kind as BookKind].label,
              yearLabel: yearLabel(book.year_hijri ?? null, book.year_gregorian ?? null), views: book.views ?? 0, pages, sections,
              cover: shelf.books.find((b) => b.id === book.id)?.coverUrl ?? pages[0]?.src ?? null,
            }}
            initialPage={initialPage}
            others={shelf.books.filter((b) => b.id !== book.id)}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
