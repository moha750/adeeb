"use client";

import { useEffect } from "react";
import { RadioPlayerProvider } from "@/app/radio/_player/PlayerProvider";
import { ShowBody } from "@/app/radio/_parts/ShowBody";
import { EpisodeBody } from "@/app/radio/_parts/EpisodeBody";
import type { RadioStageDraft } from "@/app/_ad/rooms/ShowEditorRoom";
import { useStageDraft } from "../useStageDraft";

/**
 * البرنامجُ كما سيُرى، أو الحلقةُ المفتوحةُ في المحرّر كما ستُرى — بهيكل المحطّة (`.stn .stc`) بلا أبوابها الجانبيّة: المعاينةُ لهذه الصفحة وحدها.
 * - **وضعُ المحطّة وضعُ البوّابة**: للإذاعة وسمُ وضعٍ خاصّ (`data-radio-theme`، هويّتُها منعزلة)، والمنضدةُ تنسخ إلى الإطار وسمَ البوّابة
 *   (`data-theme`) — فيُترجَم هنا، ولا يُقرأ اختيارُ المستمع المحفوظ ولا يُكتب.
 * - **لا يُغادَر من المعاينة**: روابطُ الحلقات والبرنامج تفتح الموقعَ داخل المنضدة، فالنقرةُ على رابطٍ لا تُمضى.
 */
export function RadioFrame() {
  const draft = useStageDraft<RadioStageDraft>("radio");
  useEffect(() => {
    const stop = (e: MouseEvent) => { if ((e.target as Element | null)?.closest("a[href]")) e.preventDefault(); };
    document.addEventListener("click", stop, true);
    // والنقرُ بالزرّ الأوسط يفتح الرابطَ في لسانٍ جديد: يُمنع كذلك
    document.addEventListener("auxclick", stop, true);
    const html = document.documentElement;
    const sync = () => html.setAttribute("data-radio-theme", html.dataset.theme === "dark" ? "dark" : "light");
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(html, { attributes: true, attributeFilter: ["data-theme"] });
    return () => { document.removeEventListener("click", stop, true); document.removeEventListener("auxclick", stop, true); mo.disconnect(); };
  }, []);
  if (!draft) return null;
  const ep = draft.episode;
  return (
    <RadioPlayerProvider stationName="إذاعة أدِيب" stationLogoUrl={null}>
      <div className="stn stc ad-sframe">
        <div className="stc-main">
          {ep ? (
            <EpisodeBody key={ep.id} preview show={draft.show} episode={ep} siblings={draft.listed.filter((e) => e.id !== ep.id)} />
          ) : (
            <ShowBody preview show={draft.show} episodes={draft.listed} platforms={draft.platforms} />
          )}
        </div>
      </div>
    </RadioPlayerProvider>
  );
}
