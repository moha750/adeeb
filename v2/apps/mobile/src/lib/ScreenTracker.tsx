import { usePathname } from "expo-router";
import { useEffect } from "react";

import { useAuth } from "@/auth/AuthProvider";

import { endView, startView } from "./track";

/**
 * زيارةُ شاشةٍ تُفتح عند الدخول وتُختم عند الخروج، كما يفعل `VisitTracker` في الويب.
 * ويعيش النداءُ في جذر التطبيق: المسارُ يتغيّر والجذرُ باقٍ، فلا تتراكب زيارتان.
 *
 * **ولا تُسجَّل زيارةٌ والجلسةُ تُقرأ بعدُ.** أوّلُ شاشةٍ بعد الإقلاع تقع في فجوةِ قراءةِ
 * الرمز من الـKeychain، فلو سُجّلت فيها لنُسبت إلى زائرٍ مجهولٍ وصاحبُها داخل. فتنتظر
 * الزيارةُ حتى تُحسَم الجلسةُ (كانت `undefined`)، وهو انتظارُ جزءٍ من ثانيةٍ مرّةً واحدة.
 */
function useTrackScreens(): void {
  const path = usePathname();
  const { session } = useAuth();
  const settled = session !== undefined;
  const userId = session?.user?.id ?? null;

  useEffect(() => {
    if (!path || !settled) return;
    const view = startView(path, titleFor(path), userId);
    return () => endView(view);
  }, [path, settled, userId]);
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
  if (path.startsWith("/lab")) return "المعرض"; // تطويرٌ وحدَه، ولا يُسجَّل في الإنتاج أصلًا
  return path;
}

/**
 * حاملُ التتبّع.
 *
 * ولا بدّ أن يكون **ابنًا** لا جذرًا: النداءُ كان في `RootLayout` نفسِه وهو الذي يركّب
 * `AuthProvider`، فسأل عن سياقٍ لم يُولد بعدُ وسقطت الشاشةُ الأولى بـ«useAuth خارج
 * AuthProvider» (٢٠٢٦-٠٨-٢٠). فصار مكوّنًا لا يرسم شيئًا، يُوضَع داخل المزوّد.
 */
export function ScreenTracker(): null {
  useTrackScreens();
  return null;
}
