"use client";

import { useEffect, useRef, useState } from "react";

import { REDUCE_MOTION, useMediaFlag } from "@/lib/useMediaFlag";

/**
 * **مؤشّرُ تمرير المحطّة: إبرةُ المِوالف** — اختاره المالك من ثلاثةٍ عُرضت
 * (٢٠٢٦-٠٩-٠٧): سكّةٌ عليها علاماتُ تردُّدٍ متساوية، وإبرةٌ تجري عليها.
 *
 * ══ ولِمَ مرسومٌ لا مُنمَّق ══
 * جُرّب تنميقُ شريط المتصفّح جولتين، وقِيس العرضُ الفعليُّ
 * بـ`offsetWidth − clientWidth` فإذا هو **صفر**: ماك يستعمل أشرطةً عائمة،
 * وهي تتجاهل `::-webkit-scrollbar` كلَّه. فلا يصل إلى الشاشة إلّا لونٌ وسُمك،
 * وبهما لا يُرسَم شكل. فيُخفى الأصليُّ ويُرسَم مؤشّرُنا مكانَه.
 *
 * ══ وما يُدفَع ثمنًا ══
 * من كان يسحب شريطَ المتصفّح بالفأرة يفقده هنا: مؤشّرُنا **خبرٌ يُقرأ لا أداةٌ
 * تُسحَب** (‏`aria-hidden`). والتمريرُ نفسُه لم يُمَسّ: العجلةُ واللمسُ ولوحةُ
 * المفاتيح كما هي.
 *
 * ══ ولا يظهر إلّا حيث يُفيد ══
 * صفحةٌ لا تُمرَّر لا تحتاج مؤشّرًا، فيُخفى حتّى يصير للصفحة طولٌ يُقاس.
 *
 * ══ ولِمَ حركتُه بحلقةِ إطاراتٍ لا بانتقال CSS (٢٠٢٦-٠٩-٢٤) ══
 * مأخذُ المالك: «الإبرةُ تتحرّك عندما أتحرّك وأتوقف، ليست سلسة». والعلّةُ
 * كانت في سطرين:
 *   ١ `transition: top .15s linear` **يُعاد توجيهُه في كلّ حدث تمرير**، فيصير
 *     الانتقالُ سلسلةَ قطعٍ متساويةِ السرعة تبدأ من جديدٍ ستّين مرّةً في
 *     الثانية، ويقف عند آخر قطعةٍ ساعةَ تقف اليد. وهذا هو الإحساسُ الآليّ.
 *   ٢ والمُحرَّكُ كان `top`، وهو خاصّةُ تخطيطٍ تُعيد الحساب في كلّ إطار، لا
 *     `transform` التي يحملها المُركِّب.
 * فصار المحرّكُ **تقريبًا أسّيًّا** (‏`lerp`) في حلقةِ `requestAnimationFrame`:
 * الإبرةُ تسعى إلى موضعها لا تقفز إليه، فتبقى سائرةً لحظةً بعد وقوف اليد ثمّ
 * تستقرّ. والحلقةُ **تموت حين تستقرّ** ولا تدور في الخلفيّة.
 * والكتابةُ على العنصر مباشرةً لا بحالةِ React: موضعٌ يتغيّر ستّين مرّةً في
 * الثانية ليس حالةَ واجهةٍ تُعاد بها الشجرة.
 *
 * ══ وتُسحَب بالفأرة (٢٠٢٦-٠٩-٢٤) ══
 * كانت خبرًا يُقرأ لا مقبضًا يُسحَب، وكان ذلك صوابًا يومَ كانت تطفو فوق المحتوى.
 * فلمّا صار لها مسارٌ فارغٌ عاد السحبُ بلا مزاحمة (الشرطُ `pointer: fine` في
 * الورقة: انظر تعليقَها هناك). وثلاثُ دقائقَ فيه:
 *   ١ **السحبُ يوقف السعيَ**: الإبرةُ تسعى إلى موضعها في العادة، ومقبضٌ يسعى
 *     خلف الإصبع يُحَسّ لزجًا. فتُكتَب `shown` و`target` معًا وتُرسَم حالًا.
 *   ٢ **ومسكةُ الإبهام تُحفظ**: من أمسك الإبرةَ من ذيلها لا تقفز تحت إصبعه إلى
 *     وسطها. ومن نقر السكّةَ الفارغةَ تقفز إليه متوسّطةً، وهو عرفُ الأشرطة.
 *   ٣ **والقراءةُ تُعطَّل ريثما يسحب**: حدثُ التمرير يردّ ما كتبناه نحن، فلو
 *     قُرئ لدار الرسمُ على نفسه.
 */

/** قوّةُ السعي في كلّ إطار: كلّما كبرت لزمت الإبرةُ الصفحةَ وقلّ التأخّر. */
const CHASE = 0.25;

export function StationScroll() {
  const [on, setOn] = useState(false);
  /** يُسمَع ولا يُقرأ مرّةً: من أعلن تقليلَ الحركة وهو في الصفحة تقفز عنده الإبرة */
  const still = useMediaFlag(REDUCE_MOTION);
  /** لا إبرةَ حيث لا فأرة — الشرطُ نفسُه الذي يُخفيها في الورقة (انظر `.sbi` هناك) */
  const fine = useMediaFlag("(any-pointer: fine)");
  const box = useRef<HTMLSpanElement>(null);
  const rail = useRef<HTMLSpanElement>(null);
  const thumb = useRef<HTMLSpanElement>(null);
  /* المزامنةُ تُخزَّن كي يبلغها أثرُ الظهور: الإبرةُ لا تُركَّب إلّا بعد أن
     يصير للصفحة طول، فتُرسَم أوّلَ مرّةٍ في موضعها لا في رأس السكّة. */
  const sync = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!fine) return;
    let target = 0;
    let shown = 0;
    let frame = 0;
    let running = false;

    /* المدى بالبكسل: طولُ السكّة ناقصَ طولَ الإبرة. **يُقاس عند القياس لا عند
       كلّ إطار**: قراءةُ `clientHeight` في حلقةِ الرسم تُجبر المتصفّحَ على
       إعادة التخطيط ستّين مرّةً في الثانية، والرسمُ يجب أن يكون كتابةً محضة.
       ولا يتغيّر إلّا بتغيّر النافذة (شريطُ عنوانِ الجوّال يظهر ويغيب). */
    let travel = 0;
    const measure = () => {
      const r = rail.current;
      const t = thumb.current;
      travel = r && t ? Math.max(0, r.clientHeight - t.offsetHeight) : 0;
    };

    const paint = () => {
      const t = thumb.current;
      if (!t) return;
      t.style.transform = `translate3d(0, ${(shown * travel).toFixed(2)}px, 0)`;
    };

    const tick = () => {
      shown += (target - shown) * CHASE;
      /* عتبةُ الاستقرار كسرٌ من المدى لا بكسل: الفرقُ هنا نسبةٌ من صفر إلى واحد */
      if (Math.abs(target - shown) < 0.0004) {
        shown = target;
        running = false;
        paint();
        return;
      }
      paint();
      frame = requestAnimationFrame(tick);
    };

    const chase = () => {
      if (still) {
        shown = target;
        paint();
        return;
      }
      if (running) return;
      running = true;
      frame = requestAnimationFrame(tick);
    };

    /* القراءةُ في `scroll` و`resize` وحدَهما: لا مؤقّتَ ولا مراقبَ إطارات.
       والمقامُ يُحرَس من الصفر، فصفحةٌ لا تُمرَّر تُعطي `NaN`. */
    const read = () => {
      const span = document.documentElement.scrollHeight - window.innerHeight;
      setOn(span > 120);
      if (dragging) return; // ما نكتبه نحن لا يُقرَأ علينا
      target = span > 0 ? Math.min(1, Math.max(0, window.scrollY / span)) : 0;
      chase();
    };

    /* ══ السحب ══════════════════════════════════════════════════ */
    let dragging = false;
    /* مسافةُ الإمساك من رأس الإبرة، فلا تقفز تحت الإصبع */
    let hold = 0;

    const toScroll = (clientY: number) => {
      const r = rail.current;
      const t = thumb.current;
      if (!r || !t) return;
      const room = Math.max(0, r.clientHeight - t.offsetHeight);
      const p = room > 0 ? Math.min(1, Math.max(0, (clientY - r.getBoundingClientRect().top - hold) / room)) : 0;
      shown = p;
      target = p;
      paint();
      const span = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo({ top: p * span, behavior: "instant" as ScrollBehavior });
    };

    const onDown = (e: PointerEvent) => {
      const b = box.current;
      const t = thumb.current;
      if (!b || !t || e.button !== 0) return;
      const tr = t.getBoundingClientRect();
      hold = e.clientY >= tr.top && e.clientY <= tr.bottom ? e.clientY - tr.top : tr.height / 2;
      dragging = true;
      cancelAnimationFrame(frame);
      running = false;
      b.classList.add("sbi-drag");
      b.setPointerCapture(e.pointerId);
      toScroll(e.clientY);
      e.preventDefault();
    };

    const onMove = (e: PointerEvent) => {
      if (dragging) toScroll(e.clientY);
    };

    const onUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      box.current?.classList.remove("sbi-drag");
      box.current?.releasePointerCapture(e.pointerId);
    };

    const onResize = () => {
      measure();
      read();
    };

    sync.current = onResize;
    onResize();
    window.addEventListener("scroll", read, { passive: true });
    window.addEventListener("resize", onResize);
    const b = box.current;
    b?.addEventListener("pointerdown", onDown);
    b?.addEventListener("pointermove", onMove);
    b?.addEventListener("pointerup", onUp);
    b?.addEventListener("pointercancel", onUp);
    return () => {
      sync.current = null;
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", read);
      window.removeEventListener("resize", onResize);
      b?.removeEventListener("pointerdown", onDown);
      b?.removeEventListener("pointermove", onMove);
      b?.removeEventListener("pointerup", onUp);
      b?.removeEventListener("pointercancel", onUp);
    };
  }, [still, fine]);

  /* **والقياسُ يُعاد عند الظهور**: عنصرٌ مخفيٌّ ارتفاعُه صفر، فمداه صفر. */
  useEffect(() => {
    if (on) sync.current?.();
  }, [on]);

  /* **العنصرُ يبقى مركَّبًا ويُخفى، ولا يُردّ `null`.** كان يُردّ، فكان مرجعُه
     عدمًا ساعةَ يُركّب الأثرُ مستمعيه فلا يُمسك السحبَ أحد. والإخفاءُ بـ`hidden`
     لا بصنف: لا سطرَ `display` على `.sbi` يغلب قاعدةَ المتصفّح. */
  return (
    <span ref={box} className="sbi sbi-fixed" aria-hidden hidden={!on}>
      <span ref={rail} className="sbi-rail" />
      <span ref={thumb} className="sbi-thumb" />
    </span>
  );
}
