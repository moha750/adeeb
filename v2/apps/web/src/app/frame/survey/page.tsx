import type { Metadata } from "next";
import { SurveyFrame } from "./SurveyFrame";

/**
 * إطارُ «المنضدة» في منشئ الاستبيان (اعتُمدت ٢٠٢٦-١١-١٢): صفحةُ الاستبيان كما يراها المشارك — المحرّرُ يرسل إليها مسوّدتَه
 * برسالةٍ من الأصل نفسه، فتُرسم بمقاس الجوّال الحقيقيّ (صفحةُ الاستبيان تقيس خطوطَها بعرض الشاشة، فلا تصحّ في عمودٍ ضيّق من شاشة حاسوب).
 */
export const metadata: Metadata = { title: "معاينة الاستبيان", robots: { index: false, follow: false } };

export default function SurveyFramePage() {
  return <SurveyFrame />;
}
