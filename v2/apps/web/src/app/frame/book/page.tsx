import type { Metadata } from "next";
import { BookFrame } from "./BookFrame";

/**
 * إطارُ «المنضدة» في محرّر الكتيّب (٢٠٢٦-١١-١٦): صفحةُ الكتيّب العامّةُ كما ستُرى — لوحُه وكتابُه وفهرسُه وغرفةُ قراءته — والمحرّرُ
 * يرسل إليه مسوّدتَه برسالةٍ من الأصل نفسه (`lib/stageFrame`). لا يقرأ من القاعدة شيئًا.
 */
export const metadata: Metadata = { title: "معاينة الكتيّب", robots: { index: false, follow: false } };

export default function BookFramePage() {
  return <BookFrame />;
}
