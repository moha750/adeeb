"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LogoLoader } from "@adeeb/design-system";
import { degradeStory, onStoryReady, storyOwnsReadiness } from "@/app/_story/ready";

/** أقلُّ ما تبقى فيه الشاشة — دونه تومض ومضةً لا تُقرأ فتُزعج أكثر ممّا تطمئن. */
const MIN_MS = 520;
/** سقفُ الانتظار: لا نُبقي الموقعَ محجوبًا لأجل خطٍّ بطيء — الصفحةُ مرسومةٌ من الخادم أصلًا. */
const MAX_MS = 2400;
/**
 * سقفُ الانتظار حيث تعمل القصّةُ الافتتاحيّة — يُقاس من بدء التنقّل، وبعده تسقط
 * القصّةُ إلى نسختها الساكنة المقروءة وتنزاح الشاشة.
 *
 * كان ١٠ث، وقيس (٢٠٢٦-١٠-٠٣) على جوّالٍ بـ4G فبلغه في كلّ محاولة ثمّ سقطت القصّةُ
 * إلى الساكنة على أيّ حال: عشرُ ثوانٍ أمام شعارٍ لا تنتهي إلى الحركة. فقرّر المالكُ
 * ٣ث: قصّةٌ ساكنةٌ مقروءةٌ في ثلاثٍ خيرٌ من شعارٍ في عشر. والثمنُ معلوم: على اتّصالٍ
 * بطيء تُرى الساكنةُ أكثر (الترطيبُ وحدَه قيس ٣٫٦ث على 4G)، وعلى السريع تُرى الحركة.
 */
const STORY_MAX_MS = 3_000;
/** مدّةُ التلاشي — مطابقةٌ لانتقال `.ldr-fixed` في `components.css`. */
const FADE_MS = 380;

/**
 * شاشةُ بدء الموقع — تُرسَم **مع أوّل بايت** (خادميًّا داخل التخطيط) فتظهر قبل أن
 * يصل جافاسكربت أصلًا، ثمّ تنزاح حين يجهز الموقع. وهذا ما يفرّقها عن `loading.tsx`:
 * تلك للتنقّل **داخل** الموقع، وهذه للدخول إليه.
 *
 * **متى تنزاح — والجاهزيّةُ ليست واحدةً في كلّ صفحة:**
 * - حيث لا قصّةَ افتتاحيّة: بعد الترطيب حين تجهز الخطوط، أو عند السقف، أيّهما أسبق.
 *   **لا عند `load`** (٢٠٢٦-١٠-٠٣): `load` ينتظر آخرَ صورةٍ من Supabase وإطارَ Turnstile،
 *   والمحتوى مرسومٌ من الخادم قبلهما بكثير — فكانت الشاشةُ تحجب صفحةً جاهزة (قيس:
 *   `/news` على جوّال 4G جاهزةٌ في 1.2ث ومحجوبةٌ حتّى 2.7ث). والخطوطُ وحدَها تُنتظَر
 *   لأنّ تبدّلَها بعد الكشف يُزيح السطورَ أمام العين.
 * - وحيث تعمل القصّة: عند إشارتها هي (`adeeb:story-ready` في `_story/ready.ts`).
 *   و`load` هناك ليس نهايةَ التحميل بل **بدايةَ** عمل القصّة، فالخروجُ عليه كان
 *   يكشف عشرةَ مشاهدَ سوداءَ لا نصَّ فيها ولا تثبيت — يمرّر فيها الزائرُ فيظنّ
 *   الموقعَ معطوبًا. وإن بلغ السقفُ ولم تُسمَع إشارةٌ، تُسقَط القصّةُ إلى نسختها
 *   الساكنة المقروءة **قبل** أن تنزاح الشاشة، فلا يُكشَف سوادٌ في أيّ حال.
 *
 * ولا تنزاح قبل `MIN_MS` مهما كان الاتّصال سريعًا. و`performance.now()` يقيس **من
 * بدء التنقّل** لا من الترطيب، فالحدُّ الأدنى يُحسب من لحظة الطلب الحقيقيّة.
 *
 * **حارساها في CSS لا هنا** (`html:not(.js)` والمهلةُ الاحتياطيّة) — كي يعملا ولو
 * لم يصل هذا المكوّن إلى الترطيب. والمهلةُ تُوقَف ما دامت القصّةُ في إقلاعها
 * (`html[data-story-booting]` في `components.css`)، وإلّا كشفت هي ما جاءت الشاشةُ
 * لتستره.
 */
export function BootSplash() {
  const [dismissed, setDismissed] = useState(false);
  const [gone, setGone] = useState(false);
  /* المسارُ يُقرأ هنا لا في التأثير: هو الذي يقول أيُّ جاهزيّةٍ تُنتظَر — انظر
     `storyOwnsReadiness`، ولمَ لا يصحّ سؤالُ DOM عن وجود القصّة. */
  const pathname = usePathname();

  useEffect(() => {
    let done = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const finish = () => {
      if (done) return;
      done = true;
      timers.push(
        setTimeout(() => {
          setDismissed(true);
          timers.push(setTimeout(() => setGone(true), FADE_MS));
        }, Math.max(0, MIN_MS - performance.now())),
      );
    };

    const story = storyOwnsReadiness(pathname);
    let offReady: (() => void) | undefined;

    if (story) offReady = onStoryReady(finish);
    else void document.fonts.ready.then(finish);

    timers.push(
      setTimeout(
        () => {
          /* السقفُ في صفحة القصّة لا يكشف وحدَه: يُنزل القصّةَ إلى الساكنة أوّلًا.
             وهذا يشمل ما لو لم يعمل مكوّنُ القصّة أصلًا فلم يكن له سقفٌ يسقط به. */
          if (story) degradeStory();
          finish();
        },
        Math.max(0, (story ? STORY_MAX_MS : MAX_MS) - performance.now()),
      ),
    );

    return () => {
      // يُغلَق البابُ على وعد الخطوط إن جاء بعد التنظيف — فلا يُطلق مؤقّتاتٍ لا يُنظّفها أحد.
      done = true;
      offReady?.();
      timers.forEach(clearTimeout);
    };
  }, [pathname]);

  // بعد التلاشي تُنزع من الشجرة — لا طبقةَ ثابتة تبقى تستهلك التركيب بلا داعٍ.
  if (gone) return null;
  // **ولا شاشةَ لأدِيب في «دربك خضر»**: هويّتُها منعزلةٌ كالمحطّة، وشاشةُ البدء شعارُ النادي
  // (واسمُه في اللعبة موضعان قرّرهما المالك لا ثالثَ لهما). والصفحةُ هناك خفيفةٌ مرسومةٌ من
  // الخادم فلا تستر شيئًا.
  if (pathname === "/games/darbak-khadar" || pathname?.startsWith("/games/darbak-khadar/")) return null;

  return <LogoLoader fixed dismissed={dismissed} size={150} className="ldr-boot" label="جارٍ فتح الموقع…" />;
}
