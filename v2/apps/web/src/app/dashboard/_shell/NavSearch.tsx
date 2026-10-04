"use client";

import { useRef } from "react";
import { GlyphZone, MagnifyingGlass, X } from "@/app/_components/glyphs";

/**
 * **خانةُ البحث في الشريط** — لأنّ التبويبات كثرت (أمر المالك ٢٠٢٦-٠٩-١٩).
 *
 * الشريطُ صار سبعةَ أبوابٍ وأربعين بندًا، وأكثرُها لا يُفتح إلّا مرّةً في الشهر —
 * فصاحبُ المفاتيح الكثيرة يمسح القائمةَ بعينه من رأسها إلى قاعها ليجد بندًا يعرف
 * اسمَه سلفًا. والخانةُ تختصر المسحَ بالعين إلى حرفين.
 *
 * **ترشيحٌ في مكانه لا لوحةُ أوامرَ تطفو:** البنودُ تبقى حيث تعلّمتها اليدُ، تحت
 * رؤوسها نفسِها وبأيقوناتها نفسِها، ويسقط ما لا يُطابِق. فالبحثُ يُضيّق ما تعرفه
 * لا يعرض عليك شاشةً ثانيةً لا تعرفها.
 *
 * ولا سطحَ يُخترع لها: الحجابُ والحبرُ من سلّم اللوح المذهّب (`--ash-veil`
 * و`--ash-ink-*`) كبقيّة بنوده، فتُقرأ جزءًا من الشريط لا حقلَ نموذجٍ زُرع فيه.
 */
export function NavSearch({
  value,
  onChange,
  onSubmit,
  onFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  /** الإقرارُ (Enter): يفتح أوّلَ ما بقي من البنود — فاليدُ لا تغادر لوحةَ المفاتيح. */
  onSubmit: () => void;
  /** يُنادى عند التركيز: المطويُّ يبسط نفسَه ههنا (حقلٌ بلا عرضٍ لا يُكتب فيه). */
  onFocus?: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div className="ash-srch">
      {/* العدسةُ **لا تخرج من منطقة duotone**: هي معنًى كأيقونات البنود تحتها،
          بخلاف `×` التي يُفسدها الوزنُ المزدوج فتُثقَب لها ثقبُها أدناه. */}
      <MagnifyingGlass className="ash-srch-ic" aria-hidden />
      <input
        ref={ref}
        // `search` لا `text`: يفتح للجوّال لوحةَ مفاتيح البحث، وزرُّ المسح الأصليّ
        // يُطفأ في المكتبة لأنّ لنا زرَّنا بمقاس اللمس.
        type="search"
        className="ash-srch-in"
        value={value}
        placeholder="ابحث في التبويبات…"
        aria-label="البحث في تبويبات اللوحة"
        autoComplete="off"
        onFocus={onFocus}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onSubmit();
          } else if (e.key === "Escape") {
            // المكتوبُ يُمسَح أوّلًا، فإن كان فارغًا تُترَك الخانة — خطوتان لا واحدة
            if (value) {
              e.preventDefault();
              onChange("");
            } else {
              ref.current?.blur();
            }
          }
        }}
      />
      {value ? (
        <button
          type="button"
          className="ash-srch-x"
          aria-label="مسح البحث"
          onClick={() => {
            onChange("");
            ref.current?.focus();
          }}
        >
          <GlyphZone><X /></GlyphZone>
        </button>
      ) : null}
    </div>
  );
}
