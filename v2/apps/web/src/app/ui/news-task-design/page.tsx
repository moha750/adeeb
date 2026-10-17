import { getPublicNews } from "@/app/news/data";
import { TaskDesignLab, type Seed } from "./TaskDesignLab";

/**
 * **تصميمُ شاشة مهمّة الكاتب: ثلاثة توجّهات** (٢٠٢٦-١٠-١٦).
 * بعد أن اكتملت هيكلةُ الرحلة (`/ui/news-journey`) بدأ التصميم بأبسط الشاشات وأجدِّها: ما يراه
 * المكلَّف (عضوًا أو متطوّعًا) حين يفتح مهمّته. المحتوى حقيقيّ: خبر «رحلة في عالم التصميم».
 */
export const dynamic = "force-dynamic";

export default async function NewsTaskDesignPage() {
  const all = await getPublicNews();
  const n = all.find((x) => x.slug?.startsWith("رحلة-في-عالم-التصميم")) ?? all[0];
  const secs = n?.sections ?? [];
  const seed: Seed = {
    title: n?.title ?? "خبر",
    lead: secs.find((s) => !s.heading)?.body ?? "",
    chapters: secs.filter((s) => s.heading).map((s) => ({ heading: s.heading ?? "", body: s.body })),
  };
  return <TaskDesignLab seed={seed} />;
}
