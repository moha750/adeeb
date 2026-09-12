"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LogoLoader } from "@adeeb/design-system";
import { degradeStory, onStoryReady, storyOwnsReadiness } from "@/app/_story/ready";

/** أقلُّ ما تبقى فيه الشاشة — دونه تومض ومضةً لا تُقرأ فتُزعج أكثر ممّا تطمئن. */
const MIN_MS = 520;
/** سقفُ الانتظار: لا نُبقي الموقعَ محجوبًا لأجل أصلٍ بطيء — الصفحةُ مرسومةٌ من الخادم أصلًا. */
const MAX_MS = 2400;
/**
 * سقفٌ أخير حيث تعمل القصّةُ الافتتاحيّة — **ليس هو الحدَّ المعتاد**.
 *
 * الحدُّ المعتادُ سقفُ القصّة نفسِها (`READY_CAP_MS`)، وهو يُقاس من لحظة إقلاعها
 * فيسقط إلى النسخة الساكنة ويُعلن الجاهزيّة. وهذا الرقمُ لمَخرجٍ واحد: ألّا يعمل
 * مكوّنُ القصّة أصلًا فلا يكون له سقفٌ مسلَّح. ولذلك هو بعيدٌ: سقفٌ قصيرٌ هنا كان
 * يُعدم القصّةَ قبل نزول حزمتها على اتّصالٍ عاديّ (قيس: الترطيبُ وحدَه ٣٫٦ث على 4G).
 */
const STORY_MAX_MS = 10_000;
/** مدّةُ التلاشي — مطابقةٌ لانتقال `.ldr-fixed` في `components.css`. */
const FADE_MS = 380;

/**
 * شاشةُ بدء الموقع — تُرسَم **مع أوّل بايت** (خادميًّا داخل التخطيط) فتظهر قبل أن
 * يصل جافاسكربت أصلًا، ثمّ تنزاح حين يجهز الموقع. وهذا ما يفرّقها عن `loading.tsx`:
 * تلك للتنقّل **داخل** الموقع، وهذه للدخول إليه.
 *
 * **متى تنزاح — والجاهزيّةُ ليست واحدةً في كلّ صفحة:**
 * - حيث لا قصّةَ افتتاحيّة: عند `load` أو بلوغ السقف، أيّهما أسبق.
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
    else if (document.readyState === "complete") finish();
    else window.addEventListener("load", finish, { once: true });

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
      offReady?.();
      window.removeEventListener("load", finish);
      timers.forEach(clearTimeout);
    };
  }, [pathname]);

  // بعد التلاشي تُنزع من الشجرة — لا طبقةَ ثابتة تبقى تستهلك التركيب بلا داعٍ.
  if (gone) return null;

  return <LogoLoader fixed dismissed={dismissed} size={150} className="ldr-boot" label="جارٍ فتح الموقع…" />;
}
