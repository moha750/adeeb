"use client";

import { useEffect, useState } from "react";
import { VisionView } from "@/app/vision/_parts/VisionView";
import type { PublicVision } from "@/lib/vision/types";
import { useStageDraft } from "../useStageDraft";

/** ما يصل المنضدةَ من محرّر الرؤية: الرؤيةُ كما ستُنشر، والمسارُ المفتوحُ لتنزل إليه */
export type VisionStageDraft = { v: PublicVision; focus: number | null };

/** الرؤيةُ كما ستُرى: المسوّدةُ من المحرّر (`useStageDraft`)، وتنزل الصفحةُ إلى المسار المفتوح فيه. بلا فريق: يُسمّى بعد الإطلاق */
export function VisionFrame() {
  const draft = useStageDraft<VisionStageDraft>("vision");
  // الوقتُ وقتُ المعاينة نفسِها (العدُّ التنازليّ والوقتُ مقابل الإنجاز)، يُقرأ مرّةً واحدة. ولا يُرسم شيءٌ قبل وصول المسوّدة، فلا يختلف رسمُ الخادم
  const [now] = useState(() => Date.now());
  const focus = draft?.focus ?? null;
  useEffect(() => {
    if (focus == null) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() => document.getElementById(`vz-track-${focus}`)?.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" }));
  }, [focus]);
  // **لا يُغادَر من المعاينة**: روابطُ القطع والأعضاء والأرشيف لا تُمضى داخل المنضدة
  useEffect(() => {
    const stop = (e: MouseEvent) => { if ((e.target as Element | null)?.closest("a[href]")) e.preventDefault(); };
    document.addEventListener("click", stop, true);
    return () => document.removeEventListener("click", stop, true);
  }, []);
  if (!draft) return null;
  return (
    <main className="ad-sframe amb-host">
      <VisionView v={draft.v} team={null} now={now} />
    </main>
  );
}
