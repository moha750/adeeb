import { getPublicStation } from "./data";
import { RadioPlayerProvider } from "./_player/PlayerProvider";

/**
 * تخطيطُ القسم — مسكنُ المشغّل.
 *
 * وضعُه هنا لا في الصفحة هو ما يجعل القسمَ محطّةً: تخطيطُ المسار يبقى مركَّبًا
 * وأنت تتنقّل بين البرامج والحلقات، فيبقى الصوتُ متّصلًا والشريطُ أسفلَك.
 *
 * والمحطّةُ تُقرأ هنا لأنّ اسمَها وشعارَها يلزمان **جلسةَ الوسائط** (شاشةُ قفل
 * الجوّال): الشعارُ غلافٌ احتياطيٌّ لبرنامجٍ لم يُرفَع له شعار. وقراءتُها
 * مغلَّفةٌ بـ`cache` فلا تصير استعلامًا ثانيًا في صفحةٍ تقرؤها أيضًا.
 */
export default async function RadioLayout({ children }: { children: React.ReactNode }) {
  const station = await getPublicStation();
  return (
    <RadioPlayerProvider stationName={station.name} stationLogoUrl={station.logoUrl}>
      {children}
    </RadioPlayerProvider>
  );
}
