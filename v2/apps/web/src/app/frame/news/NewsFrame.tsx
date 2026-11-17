"use client";

import { useEffect } from "react";
import { NewsRead } from "@/app/_ad/rooms/NewsReadRoom";
import { outline } from "@/lib/news/body";
import { sectionsToBlocks } from "@/lib/news/blocks";
import type { PublicNews } from "@/app/news/data";
import { useStageDraft } from "../useStageDraft";

/** `focus` موضعُ الفصل المفتوح في المحرّر: تنزل المعاينةُ إلى عنوانه (الفصلُ بلا عنوانٍ لا مرساةَ له، فتبقى حيث هي) */
type Draft = { n: PublicNews; focus: number | null };

/** معاينةُ الخبر كما سيُنشر: المسوّدةُ من المحرّر (`useStageDraft`) */
export function NewsFrame() {
  const draft = useStageDraft<Draft>("news");
  const focus = draft?.focus ?? null;
  // عنوانُ الفصل يُعرف بموضعه بين العناوين لا بنصّه: الصفحةُ تقلب علاماتِ التنصيص وتسبقه برقم («01»)، فالنصُّ لا يطابق ما كُتب
  const sections = draft?.n.sections ?? null;
  const target = focus == null || !sections?.[focus]?.heading?.trim() ? null : outline(sectionsToBlocks(sections.slice(0, focus))).length;
  useEffect(() => {
    if (target == null) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() => document.querySelectorAll<HTMLElement>(".art-body > h2")[target]?.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" }));
  }, [target]);
  // **لا يُغادَر من المعاينة**: «العودة إلى الأخبار» وروابطُ المشاركة تفتح الموقعَ داخل المنضدة — فالنقرةُ على رابطٍ لا تُمضى
  useEffect(() => {
    const stop = (e: MouseEvent) => { if ((e.target as Element | null)?.closest("a[href]")) e.preventDefault(); };
    document.addEventListener("click", stop, true);
    return () => document.removeEventListener("click", stop, true);
  }, []);
  if (!draft) return null;
  return (
    // الصفحةُ نفسُها كما ستُنشر (قالبُ «القراءة»، ٢٠٢٦-١١-١٧) بلا عودةٍ ولا تفاعل
    <main className="ad-pub ad-sframe ad-nframe">
      <div className="ad-pub-wrap">
        <NewsRead preview n={draft.n} comments={[]} more={[]} />
      </div>
    </main>
  );
}
