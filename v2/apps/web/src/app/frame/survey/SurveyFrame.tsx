"use client";

import { useEffect } from "react";
import { SurveyRespond, type PublicQuestion, type PublicSurvey } from "@/app/s/[code]/SurveyRespond";
import { useStageDraft } from "../useStageDraft";

type Draft = { survey: PublicSurvey; questions: PublicQuestion[]; focus: number | null };

/** معاينةُ الاستبيان كما يراه المشارك: المسوّدةُ من المحرّر (`useStageDraft`) */
export function SurveyFrame() {
  const draft = useStageDraft<Draft>("survey");
  // ينزل إلى السؤال المفتوح في المحرّر حين يتبدّل، لا مع كلّ حرف
  const focus = draft?.focus ?? null;
  useEffect(() => {
    if (focus == null) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() => document.getElementById(`pq-${focus}`)?.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" }));
  }, [focus]);
  if (!draft) return null;
  return <div className="ad-sframe"><SurveyRespond preview survey={draft.survey} questions={draft.questions} /></div>;
}
