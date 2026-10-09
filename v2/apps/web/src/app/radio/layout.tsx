import { getPublicStation } from "./data";
import { RadioPlayerProvider } from "./_player/PlayerProvider";
import { StationDoors, StationSide } from "./_shell/StationChrome";
import { StationFoot } from "./_shell/StationFoot";
import { StationScroll } from "./_shell/StationScroll";
import { THEME_BOOT } from "./_shell/theme";
import { ThemeSync } from "./_shell/ThemePicker";

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
 * هنا شيئًا ثانيًا: اسمَ المحطّة اسمًا للرابط في رأس الشريط الجانبيّ (وشعارُه
 * صار ملفًّا متّجهًا في المستودع لا صورةَ R2 — ٢٠٢٦-٠٩-١٩).
 *
 * **وهيكلُ المحطّة هنا لا في الصفحات** (٢٠٢٦-٠٩-٠٦): أبوابٌ لا تُعاد بناءً في
 * كلّ تنقّل، ولا تنسى صفحةٌ جديدةٌ أن تلبسها. وهو خلَفُ `SiteHeader` و`Footer`
 * اللذين نُزعا من صفحات القسم الخمس بقرار المالك: هويّةُ المحطّة منعزلةٌ
 * كليًّا، فرأسُ الموقع يُستبدَل ولا يُلوَّن.
 *
 * و`data-cursor-ink` هنا لأجل المؤشّر: داخلَ هذا الجذر تلبس هالتُه عنّابيَّ
 * المحطّة (`--cur-ink` في كتلة `.stn`)، ويسقط سنُّ الريشة كلَّه — انظر
 * `SiteCursor`.
 *
 * و**سكربتُ الوضع أوّلُ أبناء الجذر** (٢٠٢٦-١٠-٠٩): يكتب وسمَ الفاتح أو الداكن
 * على `html` قبل أن يُرسَم من المحطّة شيء، فلا يومض الكريميُّ في وجه من اختار
 * الداكن. ولا يجري في التنقّل الداخليّ، فيكمله `ThemeSync` — انظر `_shell/theme.ts`.
 */
export default async function RadioLayout({ children }: { children: React.ReactNode }) {
  const station = await getPublicStation();
  return (
    <RadioPlayerProvider stationName={station.name} stationLogoUrl={station.logoUrl}>
      <div className="stn stc" data-cursor-ink>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        <ThemeSync />
        <div className="stc-app">
          <StationSide stationName={station.name} />
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
