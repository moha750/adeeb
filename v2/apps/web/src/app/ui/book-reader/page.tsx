"use client";

import { Container, BookReader, type BookReaderPage } from "@adeeb/design-system";

/** صفحة تجريبيّة SVG ذاتيّة (data-URI) — لا أصول خارجيّة في المعرض. */
const demoPage = (n: string, label: string, bg: string): string =>
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='550' height='733'>` +
      `<rect width='100%' height='100%' fill='${bg}'/>` +
      `<rect x='24' y='24' width='502' height='685' fill='none' stroke='#ffffff' stroke-opacity='0.35' stroke-width='2'/>` +
      `<text x='275' y='330' font-size='150' fill='#ffffff' text-anchor='middle' font-family='serif'>${n}</text>` +
      `<text x='275' y='430' font-size='34' fill='#ffffff' fill-opacity='0.9' text-anchor='middle' font-family='sans-serif'>${label}</text>` +
    `</svg>`,
  );

const PAGES: BookReaderPage[] = [
  { src: demoPage("", "الغلاف", "#0f2747"), alt: "الغلاف", hard: true },
  { src: demoPage("١", "البسملة", "#16386a"), alt: "صفحة ١" },
  { src: demoPage("٢", "المقدّمة", "#1b4d7a"), alt: "صفحة ٢" },
  { src: demoPage("٣", "الفهرس", "#16386a"), alt: "صفحة ٣" },
  { src: demoPage("٤", "الفصل الأوّل", "#1b4d7a"), alt: "صفحة ٤" },
  { src: demoPage("٥", "الفصل الثاني", "#16386a"), alt: "صفحة ٥" },
  { src: demoPage("٦", "الخاتمة", "#1b4d7a"), alt: "صفحة ٦" },
  { src: demoPage("", "الغلاف الخلفيّ", "#0f2747"), alt: "الغلاف الخلفيّ", hard: true },
];

export default function BookReaderGallery() {
  return (
    <main className="py-16">
      <Container className="max-w-4xl">
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Component</p>
        <h1 className="mt-1 font-display text-4xl font-black text-content">قارئ الكتاب</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          تقليبٌ واقعيٌّ بانحناء الصفحة يلفّ محرّك <code className="font-latin text-xs">page-flip</code> بإطار الهوية.
          يُحمَّل المحرّك ديناميكيًّا (client-only) فلا يمسّ SSR. RTL بمرآةٍ وعكسٍ مضادّ. التصفّح بالسحب أو الأزرار أو
          الأسهم (يسار = تقدّم)، ومِلءُ الشاشة من الشريط.
        </p>

        <div className="mt-12">
          <BookReader pages={PAGES} rtl />
        </div>
      </Container>
    </main>
  );
}
