/* ============================================================
   إشارةُ جاهزيّة القصّة — مصدرٌ واحدٌ تعرفه شاشةُ البدء والقصّةُ معًا.

   **العطلُ الذي وُلدت منه:** شاشةُ البدء كانت تنزاح على حدث `load`، و`load` في
   صفحة الهبوط ليس نهايةَ التحميل بل **بدايةَ** عمل القصّة (عنده كانت حزمةُ الحركة
   تبدأ بالنزول، ثمّ يُجلَب الشعارُ القديم، ثمّ تُنتظَر الخطوط). فتنزاح الشاشةُ
   وتترك الزائرَ أمام عشرة مشاهدَ سوداء نصوصُها `opacity: 0` (انظر `story.css`)
   وتمريرُها حرٌّ بلا تثبيت — فيظنّ الموقعَ معطوبًا فيغادر.

   **العلاج:** للجاهزيّة إشارةٌ واحدةٌ لا تخمين: القصّةُ تعلنها حين تصير مرئيّةً
   فعلًا — أو حين تُتخطّى (`skipStory`) — والشاشةُ تنتظرها.

   ووحدةٌ خالصةٌ بلا استيراد: كي تستوردها شاشةُ البدء في التخطيط بلا أن تجرّ
   معها gsap إلى حزمة الموقع كلِّه.
   ============================================================ */

const EVENT = "adeeb:story-ready";

/* عَلَمٌ مع الحدث لا الحدثُ وحده: ترتيبُ تأثيرات React لا يضمن أن تستيقظ الشاشةُ
   للاستماع قبل أن تجهز القصّة، وحدثٌ لا عَلَمَ له يضيع على من تأخّر. */
type ReadyWindow = Window & { __adeebStoryReady?: boolean; __adeebStorySkipped?: boolean };

/** المسارُ الذي تعيش فيه القصّةُ الافتتاحيّة — فيه وحدَه تُقاس جاهزيّةُ الموقع بها. */
export const STORY_ROUTE = "/";

/**
 * هل جاهزيّةُ هذه الصفحة بيد القصّة؟ — يُسأل **بالمسار** لا بوجود العنصر في DOM.
 *
 * وهذا تصحيحُ عطبٍ مُقاس: صفحةُ الهبوط تُبَثّ على دفعات (streaming)، وشاشةُ البدء
 * في التخطيط تُرطَّب قبل أن يصل جسمُ الصفحة — فسؤالُ `getElementById` وقتَها يجيب
 * «لا قصّةَ هنا» ثمّ تظهر بعد جزءٍ من الثانية، فتخرج الشاشةُ على السقف القصير
 * وتكشف ما جاءت لتستره. أمّا المسارُ فمعلومٌ من أوّل لحظة.
 */
export function storyOwnsReadiness(pathname: string | null): boolean {
  return pathname === STORY_ROUTE;
}

export function storyIsReady(): boolean {
  return !!(window as ReadyWindow).__adeebStoryReady;
}

/** تُعلَن مرّةً واحدة حين تصير القصّةُ مرئيّة. النداءُ الثاني لا يفعل شيئًا. */
export function markStoryReady(): void {
  const w = window as ReadyWindow;
  if (w.__adeebStoryReady) return;
  w.__adeebStoryReady = true;
  window.dispatchEvent(new Event(EVENT));
}

/** تنتظر الجاهزيّة وتردّ دالّةَ إلغاء؛ وتُنادي فورًا إن كانت قد أُعلنت. */
export function onStoryReady(cb: () => void): () => void {
  if (storyIsReady()) {
    cb();
    return () => {};
  }
  window.addEventListener(EVENT, cb, { once: true });
  return () => window.removeEventListener(EVENT, cb);
}

/** هل تُخطّيت القصّةُ في هذه الزيارة لأنّها لم تجهز في وقتها؟ (لا تُحسب «رُئيت») */
export function storyWasSkipped(): boolean {
  return !!(window as ReadyWindow).__adeebStorySkipped;
}

/**
 * التخطّي الآمن — حين لا تجهز القصّةُ في وقتها يُفتح الموقعُ نفسُه مباشرةً.
 *
 * كان هذا الموضعُ يُسقطها إلى نسخةٍ ساكنة (`st-static`)، وتبيّن (٢٠٢٦-١٠-٢٦، قياسٌ
 * على الإنتاج) أنّها **هي** ما يراه أكثرُ الزوّار في أوّل دخول: سقطت في كلّ محاولةٍ
 * على 4G وفي نصف المحاولات على اتّصالٍ سريع — نصوصٌ متراكمةٌ وبطاقاتٌ بلا صور، ثمّ
 * تُكتب «رُئيت» فلا يرى الزائرُ الحكايةَ الحيّةَ في تلك الجلسة أبدًا. فصار السقوطُ
 * تخطّيًا: يُفتح الموقع، **ولا تُكتب «رُئيت»**، فتُعرض الحكايةُ حيّةً في الدخول
 * التالي وحزمتُها في ذاكرة المتصفّح.
 *
 * والنسخةُ الساكنةُ باقيةٌ لمن يفضّل تقليلَ الحركة وحدَه (`initStory` في `story.ts`).
 */
export function skipStory(): void {
  if (storyIsReady()) return;
  const w = window as ReadyWindow;
  w.__adeebStorySkipped = true;
  const html = document.documentElement;
  html.setAttribute("data-adeeb-story", "skip");
  html.removeAttribute("data-story-booting");
  /* **وتُردّ العجلةُ إلى منعِّم الموقع**: لا طبقةَ تنعيمٍ للقصّة في هذه الزيارة،
     ولو بقيت ملكيّتُها معلنةً لبقي الهبوطُ خامًا وحدَه في موقعٍ منعَّم. */
  html.removeAttribute("data-scroll-owner");
  markStoryReady();
}
