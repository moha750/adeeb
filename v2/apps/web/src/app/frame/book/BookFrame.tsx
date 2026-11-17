"use client";

import { useEffect } from "react";
import { BookRead } from "@/app/_ad/rooms/BookReadRoom";
import type { BookStageDraft } from "@/app/_ad/rooms/BookEditorRoom";
import { useStageDraft } from "../useStageDraft";

/** الكتيّبُ كما سيُرى: المسوّدةُ من المحرّر (`useStageDraft`)، بلا رفٍّ لغيره (المعاينةُ لهذا الكتيّب وحده) */
export function BookFrame() {
  const draft = useStageDraft<BookStageDraft>("book");
  // **لا يُغادَر من المعاينة**: روابطُ المشاركة والرجوعُ إلى المكتبة تفتح الموقعَ داخل المنضدة — فالنقرةُ على رابطٍ لا تُمضى
  useEffect(() => {
    const stop = (e: MouseEvent) => { if ((e.target as Element | null)?.closest("a[href]")) e.preventDefault(); };
    document.addEventListener("click", stop, true);
    return () => document.removeEventListener("click", stop, true);
  }, []);
  if (!draft) return null;
  return (
    <main className="ad-pub ad-sframe ad-nframe">
      <div className="ad-pub-wrap">
        {/* الصفحةُ المفتوحةُ في المحرّر تُفتح عليها غرفةُ القراءة: تُبنى الصفحةُ من جديد كلّما تبدّلت أو ظهرت المنضدة (موضعُ البدء ومقاسُ القارئ حالٌ أوّل) */}
        <BookRead key={`${draft.focus ?? "page"}:${draft.shown}`} preview book={draft.book} others={[]} initialPage={draft.focus ?? undefined} />
      </div>
    </main>
  );
}
