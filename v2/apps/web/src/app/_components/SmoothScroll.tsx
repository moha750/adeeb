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
 * تقرّر العمل، وتنزعها عند الخروج وعند السقوط الآمن (`degradeStory`، وهو
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
 */

const OWNER = "data-scroll-owner";

/** صاحبُ العجلةِ المُعلَن الآن، مسموعًا لا مقروءًا مرّةً. */
const subscribeOwner = (cb: () => void) => {
  const ob = new MutationObserver(cb);
  ob.observe(document.documentElement, { attributes: true, attributeFilter: [OWNER] });
  return () => ob.disconnect();
};

export function SmoothScroll() {
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
    let lenis: { destroy: () => void } | null = null;

    /* استيرادٌ مؤجَّل: الطبقةُ ليست من زمن الرسم الأوّل، فلا تُحمَّل معه. */
    void import("lenis").then(({ default: Lenis }) => {
      if (dead) return;
      lenis = new Lenis({
        duration: 1.15,
        smoothWheel: true,
        allowNestedScroll: true,
        autoRaf: true,
      });
    });

    return () => {
      dead = true;
      lenis?.destroy();
    };
  }, [coarse, still, taken]);

  return null;
}
