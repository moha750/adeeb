import { usePathname } from "expo-router";
import { useEffect } from "react";

import { endView, startView } from "./track";

/**
 * زيارةُ شاشةٍ تُفتح عند الدخول وتُختم عند الخروج، كما يفعل `VisitTracker` في الويب.
 * ويعيش النداءُ في جذر التطبيق: المسارُ يتغيّر والجذرُ باقٍ، فلا تتراكب زيارتان.
 */
export function useTrackScreens(): void {
  const path = usePathname();

  useEffect(() => {
    if (!path) return;
    const view = startView(path, titleFor(path));
    return () => endView(view);
  }, [path]);
}

/**
 * عنوانُ الشاشة كما يراه صاحبُها.
 *
 * وهو **اسمُ الغرفة لا اسمُ المادّة**: الحلقةُ والخبرُ يتبدّلان في المسار نفسِه،
 * وتسميةُ كلٍّ منهما تحتاج قراءةَ المادّة قبل التسجيل فتتأخّر الزيارةُ لأجل حرفٍ.
 * والمُعرّفُ في `page_path` يكفي لمن أراد أن يعرف أيَّ خبرٍ قُرئ.
 */
function titleFor(path: string): string {
  if (path === "/") return "الإذاعة";
  if (path.startsWith("/activities")) return "الأنشطة";
  if (path.startsWith("/activity/")) return "فعاليّة";
  if (path.startsWith("/news/")) return "خبر";
  if (path.startsWith("/news")) return "الأخبار";
  if (path.startsWith("/episode/")) return "حلقة";
  if (path.startsWith("/me")) return "حسابي";
  return path;
}
