"use client";

import { useEffect } from "react";
import { Container } from "@adeeb/design-system";
import { ToastProvider } from "@/app/dashboard/_components/ToastProvider";
import { RegRead } from "@/app/regulations/_parts/RegRead";
import type { RegStageDraft } from "@/app/_ad/rooms/RegEditorRoom";
import { useStageDraft } from "../useStageDraft";

/** النظامُ كما سيُقرأ: المسوّدةُ من المحرّر (`useStageDraft`)، وتنزل الصفحةُ إلى المادّة المفتوحة فيه */
export function RegFrame() {
  const draft = useStageDraft<RegStageDraft>("regulation");
  const focus = draft?.focus ?? null;
  useEffect(() => {
    if (focus == null) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() => document.getElementById(`m${focus}`)?.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" }));
  }, [focus]);
  // **لا يُغادَر من المعاينة**: الإحالاتُ والوثيقةُ التالية تفتح الموقعَ داخل المنضدة — فالنقرةُ على رابطٍ لا تُمضى
  useEffect(() => {
    const stop = (e: MouseEvent) => { if ((e.target as Element | null)?.closest("a[href]")) e.preventDefault(); };
    document.addEventListener("click", stop, true);
    return () => document.removeEventListener("click", stop, true);
  }, []);
  if (!draft) return null;
  return (
    <main className="ad-sframe ad-nframe">
      <Container>
        <ToastProvider>
          <RegRead preview doc={draft.doc} base="/regulations" previews={draft.ctx.previews} cited={draft.ctx.cited} docNames={draft.ctx.docNames} counts={draft.ctx.counts} next={draft.ctx.next} />
        </ToastProvider>
      </Container>
    </main>
  );
}
