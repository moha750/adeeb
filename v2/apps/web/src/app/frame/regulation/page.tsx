import type { Metadata } from "next";
import { RegFrame } from "./RegFrame";

/**
 * إطارُ «المنضدة» في محرّر النظام (٢٠٢٦-١١-١٦): صفحةُ النظام العامّة كما ستُقرأ — أبوابُها وموادُّها وإحالاتُها وجانبُها — والمحرّرُ
 * يرسل إليه مسوّدتَه وما يُكتب الآن برسالةٍ من الأصل نفسه (`lib/stageFrame`). لا يقرأ من القاعدة شيئًا.
 */
export const metadata: Metadata = { title: "معاينة النظام", robots: { index: false, follow: false } };

export default function RegFramePage() {
  return <RegFrame />;
}
