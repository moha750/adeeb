"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import type { BookReaderPage } from "@adeeb/design-system";
import { createClient } from "@/lib/supabase/client";

// المحرّك client-only — يُحمَّل ديناميكيًّا (ssr:false) فلا يمسّ SSR إطلاقًا، مع لبنة تحميل.
const BookReader = dynamic(() => import("@adeeb/design-system").then((m) => m.BookReader), {
  ssr: false,
  loading: () => (
    <div className="grid min-h-[360px] place-items-center text-content-muted" style={{ fontFamily: "var(--font-latin)" }}>
      …يُفتح الكتاب
    </div>
  ),
});

export function Reader({ bookId, pages }: { bookId: string; pages: BookReaderPage[] }) {
  // منارة مشاهدة واحدة (RPC ذرّيّ عبر anon) — أدقّ من الحقن أثناء التصيير المُخزَّن.
  const counted = useRef(false);
  useEffect(() => {
    if (counted.current) return;
    counted.current = true;
    createClient().rpc("library_increment_views", { p_book_id: bookId }).then(() => {}, () => {});
  }, [bookId]);

  return <BookReader pages={pages} rtl />;
}
