import { cn } from "../lib/cn";

export interface CarouselNavProps {
  onPrev: () => void;
  onNext: () => void;
  /** للعارض غير الدائريّ: يُعطَّل السهم عند الحافّة. */
  prevDisabled?: boolean;
  nextDisabled?: boolean;
  /** للتباعد عن العارض فقط (`mt-*`) — لا محاذاة: الموضع وسطٌ دائمًا (ق١١). */
  className?: string;
}

/* السهمان بالاتّجاه العربيّ: «السابق» يشير يمينًا و«التالي» يسارًا —
   المكوّن يملك الاتّجاه فلا يقرّره كلّ مستعمِل (وقد اختلفت النسخ الثلاث فيه). */
const CaretRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M9 5l7 7-7 7" />
  </svg>
);
const CaretLeft = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);

/**
 * أسهم تنقّل الكاروسيل — زوجٌ لا زرّ مفرد: الاتّجاه والتسمية وترتيب الزوج
 * كلّها من المكوّن. سطحٌ محايد بحدّ الأسطح وزاوية الأساس، يلبس تدرّج العلامة
 * عند المرور. **موضعه وسط الشاشة دائمًا** (ق١١) — لا خيار محاذاة.
 * تُعرَّف الأنماط في components.css تحت البادئة `.anav`.
 */
export function CarouselNav({
  onPrev,
  onNext,
  prevDisabled,
  nextDisabled,
  className,
}: CarouselNavProps) {
  return (
    <div className={cn("anav", className)}>
      <button type="button" className="anav-btn" onClick={onPrev} disabled={prevDisabled} aria-label="السابق">
        <CaretRight />
      </button>
      <button type="button" className="anav-btn" onClick={onNext} disabled={nextDisabled} aria-label="التالي">
        <CaretLeft />
      </button>
    </div>
  );
}
