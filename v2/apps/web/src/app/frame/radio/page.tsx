import type { Metadata } from "next";
// حصّةُ الإذاعة من `components.css`، كما يحملها تخطيطُ القسم (`app/radio/layout.tsx`)
import "@adeeb/design-system/components.radio.css";
import { RadioFrame } from "./RadioFrame";

/**
 * إطارُ «المنضدة» في محرّر البرنامج (٢٠٢٦-١١-١٦): صفحةُ البرنامج العامّة كما ستُرى، أو صفحةُ الحلقة المفتوحة في المحرّر — والمحرّرُ يرسل
 * إليه مسوّدتَه برسالةٍ من الأصل نفسه (`lib/stageFrame`). لا يقرأ من القاعدة شيئًا، ولا يُشغِّل ولا يكتب.
 */
export const metadata: Metadata = { title: "معاينة البرنامج", robots: { index: false, follow: false } };

export default function RadioFramePage() {
  return <RadioFrame />;
}
