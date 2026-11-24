import type { Metadata } from "next";
import { VisionFrame } from "./VisionFrame";

/**
 * إطارُ «المنضدة» في محرّر الرؤية (٢٠٢٦-١١-٢٢): صفحةُ الرؤية العامّة كما ستُرى — علامتُها وفكرتُها ومساراتُها وأهدافُها — والمحرّرُ
 * يرسل إليه مسوّدتَه وما يُكتب الآن برسالةٍ من الأصل نفسه (`lib/stageFrame`). لا يقرأ من القاعدة شيئًا.
 */
export const metadata: Metadata = { title: "معاينة الرؤية", robots: { index: false, follow: false } };

export default function VisionFramePage() {
  return <VisionFrame />;
}
