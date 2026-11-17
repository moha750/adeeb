"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import type { BookReaderPage } from "@adeeb/design-system";

// المحرّك client-only — يُحمَّل ديناميكيًّا (ssr:false) فلا يمسّ SSR إطلاقًا، مع لبنة تحميل.
const BookReader = dynamic(() => import("@adeeb/design-system").then((m) => m.BookReader), {
  ssr: false,
  loading: () => <p className="ad-pr-reader-wait" role="status">يُفتح الكتاب…</p>,
});

export function Reader({ bookId, pages, tools, sections, initialPage, onPage }: {
  bookId: string; pages: BookReaderPage[]; tools?: ReactNode;
  sections?: { title: string; page: number }[]; initialPage?: number; onPage?: (page: number) => void;
}) {
  // لا عدَّ هنا (٢٠٢٦-١١-١٧): المشاهدةُ تُعلنها صفحةُ الكتاب نفسُها (`library/[slug]/page.tsx`) عند تصييره،
  // فتُعدّ كما يُعدّ الخبرُ والاستبيان. والقارئُ يُفتح في نافذةٍ لا مع كلّ زيارة، فالعدُّ فيه يُسقط مَن لم يفتحه.
  return <BookReader pages={pages} rtl tools={tools} sections={sections} initialPage={initialPage} onPage={onPage} resumeKey={bookId} offerResume={false} fullscreen="page" labelled />;
}
