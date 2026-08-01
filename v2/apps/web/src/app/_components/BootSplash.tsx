"use client";

import { useEffect, useState } from "react";
import { LogoLoader } from "@adeeb/design-system";

/** أقلُّ ما تبقى فيه الشاشة — دونه تومض ومضةً لا تُقرأ فتُزعج أكثر ممّا تطمئن. */
const MIN_MS = 520;
/** سقفُ الانتظار: لا نُبقي الموقعَ محجوبًا لأجل أصلٍ بطيء — الصفحةُ مرسومةٌ من الخادم أصلًا. */
const MAX_MS = 2400;
/** مدّةُ التلاشي — مطابقةٌ لانتقال `.ldr-fixed` في `components.css`. */
const FADE_MS = 380;

/**
 * شاشةُ بدء الموقع — تُرسَم **مع أوّل بايت** (خادميًّا داخل التخطيط) فتظهر قبل أن
 * يصل جافاسكربت أصلًا، ثمّ تنزاح حين يجهز الموقع. وهذا ما يفرّقها عن `loading.tsx`:
 * تلك للتنقّل **داخل** الموقع، وهذه للدخول إليه.
 *
 * **متى تنزاح:** عند اكتمال تحميل الصفحة (`load`) أو بلوغ السقف — أيّهما أسبق —
 * ولا قبل `MIN_MS` مهما كان الاتّصال سريعًا. و`performance.now()` يقيس **من بدء
 * التنقّل** لا من الترطيب، فالحدُّ الأدنى يُحسب من لحظة الطلب الحقيقيّة.
 *
 * **حارساها في CSS لا هنا** (`html:not(.js)` والمهلةُ الاحتياطيّة) — كي يعملا ولو
 * لم يصل هذا المكوّن إلى الترطيب.
 */
export function BootSplash() {
  const [dismissed, setDismissed] = useState(false);
  const [gone, setGone] = useState(false);

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

    if (document.readyState === "complete") finish();
    else window.addEventListener("load", finish, { once: true });
    timers.push(setTimeout(finish, Math.max(0, MAX_MS - performance.now())));

    return () => {
      window.removeEventListener("load", finish);
      timers.forEach(clearTimeout);
    };
  }, []);

  // بعد التلاشي تُنزع من الشجرة — لا طبقةَ ثابتة تبقى تستهلك التركيب بلا داعٍ.
  if (gone) return null;

  return <LogoLoader fixed dismissed={dismissed} size={150} className="ldr-boot" label="جارٍ فتح الموقع…" />;
}
