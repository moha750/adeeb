"use client";

import { useEffect, useSyncExternalStore } from "react";

import { COARSE_POINTER, REDUCE_MOTION, useMediaFlag } from "@/lib/useMediaFlag";

/**
 * **تنعيمُ تمرير الموقع** — أمرُ المالك ٢٠٢٦-٠٩-٢٤: «عمّمه على الموقع كلّه».
 * وكان قبلَها في المحطّة وحدَها (`StationSmooth`، أُعدم إلى هنا: مصدرٌ واحدٌ
 * لا اثنان).
 *
 * ══ ولم تكن العلّةُ تعثّرًا ══
 * قِيس زمنُ الإطارات في أثناء التمرير فكان الوسيطُ ‎16.7ms‎ بلا إطارٍ واحدٍ فوق
 * ‎25ms‎. وإنّما كان التمريرُ **خامًا**: يتبع العجلةَ بمقدارٍ لا بزمن، فيقف
 * ساعةَ تقف اليد. وطبقةُ Lenis كانت في المستودع منذ افتتاحيّة القصّة ولا تعمل
 * خارجها، فكان الزائرُ يحسّ انكسارَ الإحساس متى غادر الهبوط.
 *
 * ══ والمدّةُ مدّةُ القصّة نفسُها ══
 * ‎1.15‎ كما في `_story/story.ts`، كي يكون للموقع إحساسٌ واحدٌ لا إحساسان.
 *
 * ══ وصاحبُ العجلةِ واحد، بمصافحةٍ لا باستنتاج ══
 * القصّةُ تُنشئ طبقتَها الخاصّة وتربطها بـ`ScrollTrigger`، وطبقتان في صفحةٍ
 * واحدةٍ تتنازعان العجلة. وكان هذا يُستنتَج من حالَي الصفحة (جذرُ القصّة
 * موجودٌ ولم تُختَم بالتخطّي)، والاستنتاجُ فيه ثغرة: لو تعثّرت حزمةُ الحركة
 * وسقطت القصّةُ إلى نسختها الساكنة لبقي الهبوطُ خامًا وحدَه في موقعٍ منعَّم،
 * لأنّ الاستنتاجَ لا يعرف أنّ الطبقةَ لم تُولَد.
 *
 * فصارت **سمةً تُعلَن وتُنزَع**: `html[data-scroll-owner]` تكتبها القصّةُ حين
 * تقرّر العمل، وتنزعها عند الخروج وعند التخطّي الآمن (`skipStory`، وهو
 * البابُ الواحدُ لكلّ سقوط). ونحن **نسمعها** بمراقب، فلا يلزمنا أن نعرف متى
 * تُكتَب ولا متى تُمحى: من ملك العجلةَ أخذناها منه، ومن تركها أخذناها.
 * ولذلك سقط تعلّقُنا بالمسار (`pathname`) كلَّه: السمةُ تقول الحقيقةَ في كلّ
 * تنقّلٍ بلا أن نسأل عنه.
 *
 * ══ وثلاثةُ حدودٍ مقصودة ══
 * • **العجلةُ وحدَها**: اللمسُ يُترك لِما في النظام من قصورٍ ذاتيّ (‏`syncTouch`
 *   مطفأةٌ افتراضًا) وهو أحسنُ ممّا نصنع، فلا تُركَّب الطبقةُ على مؤشّرٍ خشنٍ
 *   أصلًا: حلقةُ الإطارات تعمل بلا فائدةٍ وتأكل بطّاريّة.
 * • **من أعلن أنّه يقلّل الحركة** لا يُنعَّم عنده شيء. والشرطان **يُسمَعان ولا
 *   يُقرآن مرّةً** (`useMediaFlag`): من وصل فأرةً بجهازٍ لمسيّ، أو بدّل تفضيلَه
 *   وهو في الصفحة، يصله القرارُ في حينه.
 * • **وكلُّ صندوقٍ يُمرَّر بنفسه يبقى لصاحبه** (‏`allowNestedScroll`): رفوفُ
 *   المحطّة الأفقيّة، ولوحُ اللوحة (‏`.ash-content` هو المِمرار لا النافذة)،
 *   وجسمُ النافذة الحواريّة. وهو جذرٌ يكشفه Lenis بنفسه لا قائمةُ أصنافٍ تُصان.
 *
 * ══ والنافذةُ المفتوحة تُوقفه ══ (محمد ٢٠٢٦-١١-٢٢)
 * قفلُ النافذة (`overflow` الجسم) لا يوقف طبقةً تحرّك الصفحةَ بيدها، فكانت العجلةُ فوق رأس النافذة أو عند
 * آخر جسمها تحرّك الصفحةَ خلفها. فالنافذةُ تُعلن قفلَها على الجذر (`html[data-scroll-locked]`، من `Dialog`)
 * ونحن نسمعه: نقف ما دام قائمًا، وموقوفًا يمنع Lenis العجلةَ عن الصفحة ويترك ما يُمرَّر بنفسه (جسمَ النافذة).
 */

/**
 * ══ والقفزُ إلى موضعٍ في الصفحة ينزلق لا يقفز ══ (محمد ٢٠٢٦-١١-٢٤: «تصفّح اللجان» كانت تنقل الصفحةَ «بشكلٍ صلب»، فعُمّم)
 * كلُّ رابطٍ إلى علامةٍ في الصفحة نفسِها (`#committees`) يُسمَع على الوثيقة **بعد** أصحابه: من تولّاه بنفسه (منع الافتراض) تُرك له.
 * والانزلاقُ بالطبقة إن كانت قائمة، وإلّا فبالمتصفّح (`smooth`)، ولا انزلاقَ لمن طلب تقليل الحركة. والموضعُ يُحسب بهامش الهدف
 * (`scroll-margin`) فلا يختبئ تحت الرأس الثابت، والعنوانُ يتبعه وتُعلَن العلامةُ (`hashchange`) لمن يسمعها (وميضُ المادّة في الأنظمة).
 */
let active: { scrollTo: (el: HTMLElement, o?: { offset?: number }) => void } | null = null;

function onAnchor(e: MouseEvent) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
  if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search || !url.hash) return;
  const el = document.getElementById(decodeURIComponent(url.hash.slice(1)));
  if (!el) return;
  e.preventDefault();
  const before = location.href;
  if (url.hash !== location.hash) {
    history.pushState(history.state, "", url.hash);
    window.dispatchEvent(new HashChangeEvent("hashchange", { oldURL: before, newURL: location.href }));
  }
  const still = matchMedia(REDUCE_MOTION).matches;
  if (active && !still) active.scrollTo(el, { offset: -(parseFloat(getComputedStyle(el).scrollMarginTop) || 0) });
  else el.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
}

const OWNER = "data-scroll-owner";
/** قفلُ النافذة المفتوحة (يكتبه `Dialog`) */
const LOCK = "data-scroll-locked";

/** صاحبُ العجلةِ المُعلَن الآن، مسموعًا لا مقروءًا مرّةً. */
const subscribeOwner = (cb: () => void) => {
  const ob = new MutationObserver(cb);
  ob.observe(document.documentElement, { attributes: true, attributeFilter: [OWNER] });
  return () => ob.disconnect();
};

export function SmoothScroll() {
  useEffect(() => {
    document.addEventListener("click", onAnchor);
    return () => document.removeEventListener("click", onAnchor);
  }, []);
  const coarse = useMediaFlag(COARSE_POINTER);
  const still = useMediaFlag(REDUCE_MOTION);
  const taken = useSyncExternalStore(
    subscribeOwner,
    () => document.documentElement.hasAttribute(OWNER),
    () => false,
  );

  useEffect(() => {
    if (coarse || still || taken) return;

    let dead = false;
    let lenis: { destroy: () => void; stop: () => void; start: () => void } | null = null;
    const root = document.documentElement;
    const sync = () => (root.hasAttribute(LOCK) ? lenis?.stop() : lenis?.start());
    const ob = new MutationObserver(sync);
    ob.observe(root, { attributes: true, attributeFilter: [LOCK] });

    /* استيرادٌ مؤجَّل: الطبقةُ ليست من زمن الرسم الأوّل، فلا تُحمَّل معه. */
    void import("lenis").then(({ default: Lenis }) => {
      if (dead) return;
      lenis = new Lenis({
        duration: 1.15,
        smoothWheel: true,
        allowNestedScroll: true,
        autoRaf: true,
      });
      active = lenis as unknown as typeof active;
      sync();
    });

    return () => {
      dead = true;
      ob.disconnect();
      lenis?.destroy();
      active = null;
    };
  }, [coarse, still, taken]);

  return null;
}
