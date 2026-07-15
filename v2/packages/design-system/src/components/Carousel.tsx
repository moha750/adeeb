"use client";

import { Children, useCallback, useRef, type ReactNode } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { cn } from "../lib/cn";

/**
 * Carousel أفقي موحّد: تشغيل تلقائي + دوران لانهائي + أزرار أسفل + عدد شرائح متجاوب، بلا scrollbar.
 * تحكّم عدد الشرائح لكل شاشة عبر slideClassName (basis).
 */
export function Carousel({
  children,
  slideClassName = "basis-full sm:basis-1/2 lg:basis-1/3",
  autoplayDelay = 4000,
}: {
  children: ReactNode;
  slideClassName?: string;
  autoplayDelay?: number;
}) {
  const autoplay = useRef(
    Autoplay({ delay: autoplayDelay, stopOnInteraction: false, stopOnMouseEnter: true }),
  );
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, direction: "rtl", align: "start" },
    [autoplay.current],
  );
  const prev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const next = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const slides = Children.toArray(children);

  return (
    <div>
      {/* نافذة العرض — overflow مخفي + تنفّس رأسي كي لا يُقصّ الظلّ/الرفعة */}
      <div className="overflow-hidden py-4" ref={emblaRef}>
        <div className="-mx-2.5 flex">
          {slides.map((child, i) => (
            <div key={i} className={cn("min-w-0 shrink-0 grow-0 px-2.5", slideClassName)}>
              {child}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-7 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={prev}
          aria-label="السابق"
          className="grid h-11 w-11 place-items-center  border border-line bg-surface text-2xl leading-none text-content shadow-sm transition hover:border-navy-300 hover:bg-navy-50"
        >
          ›
        </button>
        <button
          type="button"
          onClick={next}
          aria-label="التالي"
          className="grid h-11 w-11 place-items-center  border border-line bg-surface text-2xl leading-none text-content shadow-sm transition hover:border-navy-300 hover:bg-navy-50"
        >
          ‹
        </button>
      </div>
    </div>
  );
}
