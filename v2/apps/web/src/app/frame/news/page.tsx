import type { Metadata } from "next";
import { NewsFrame } from "./NewsFrame";

/**
 * إطارُ «المنضدة» في محرّر الخبر (٢٠٢٦-١١-١٣): الخبرُ كما سيُنشر — بصدره المعتمد («الشُّرفة المقلوبة») ومتنه ومعرضه — والمحرّرُ
 * يرسل إليه مسوّدتَه برسالةٍ من الأصل نفسه (`lib/stageFrame`). لا يقرأ من القاعدة شيئًا.
 */
export const metadata: Metadata = { title: "معاينة الخبر", robots: { index: false, follow: false } };

export default function NewsFramePage() {
  return <NewsFrame />;
}
