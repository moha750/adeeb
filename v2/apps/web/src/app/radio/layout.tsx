import { getPublicStation } from "./data";
import { RadioPlayerProvider } from "./_player/PlayerProvider";
import { StationDoors, StationSide } from "./_shell/StationChrome";
import { StationFoot } from "./_shell/StationFoot";
import { StationScroll } from "./_shell/StationScroll";

/**
 * تخطيطُ القسم — مسكنُ المشغّل وهيكلُ المحطّة.
 *
 * وضعُ المشغّل هنا لا في الصفحة هو ما يجعل القسمَ محطّةً: تخطيطُ المسار يبقى
 * مركَّبًا وأنت تتنقّل بين البرامج والحلقات، فيبقى الصوتُ متّصلًا والشريطُ
 * أسفلَك.
 *
 * والمحطّةُ تُقرأ هنا لأنّ اسمَها وشعارَها يلزمان **جلسةَ الوسائط** (شاشةُ قفل
 * الجوّال): الشعارُ غلافٌ احتياطيٌّ لبرنامجٍ لم يُرفَع له شعار. وقراءتُها
 * مغلَّفةٌ بـ`cache` فلا تصير استعلامًا ثانيًا في صفحةٍ تقرؤها أيضًا. ويخدم
 * هنا شيئًا ثانيًا: اسمَ المحطّة وشعارَها في رأس الشريط الجانبيّ.
 *
 * **وهيكلُ المحطّة هنا لا في الصفحات** (٢٠٢٦-٠٩-٠٦): أبوابٌ لا تُعاد بناءً في
 * كلّ تنقّل، ولا تنسى صفحةٌ جديدةٌ أن تلبسها. وهو خلَفُ `SiteHeader` و`Footer`
 * اللذين نُزعا من صفحات القسم الخمس بقرار المالك: هويّةُ المحطّة منعزلةٌ
 * كليًّا، فرأسُ الموقع يُستبدَل ولا يُلوَّن.
 */
export default async function RadioLayout({ children }: { children: React.ReactNode }) {
  const station = await getPublicStation();
  return (
    <RadioPlayerProvider stationName={station.name} stationLogoUrl={station.logoUrl}>
      <div className="stn stc">
        <div className="stc-app">
          <StationSide stationName={station.name} stationLogoUrl={station.logoUrl} />
          <div className="stc-main">
            {children}
            <StationFoot tagline={station.tagline} />
          </div>
        </div>
        {/* داخلَ الجذر لا خارجَه: استعلامُ الحاوية يطوي الأبوابَ على الحاسوب،
            ولا يبلغ عنصرًا خارجَ الحاوية. */}
        <StationDoors />
        <StationScroll />
      </div>
    </RadioPlayerProvider>
  );
}
