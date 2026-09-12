"use client";

import { useRef, useState } from "react";
import { AnchoredPopover, Button, Divider, Field, Segmented } from "@adeeb/design-system";
import { CalendarBlank, CalendarDots } from "@phosphor-icons/react";
import { CaretDown } from "@/app/_components/glyphs";
import { PRESETS, presetName, rangeLabel, todayKey, type DayRange } from "@/lib/analyticsRange";

/**
 * ضابطُ المدّة — **زرٌّ واحدٌ يقول المختارَ الآن ويفتح كلَّ شيء** (اختيارُ المالك من ثلاثة
 * توجّهاتٍ عُرضت حيّةً في `/ui/analytics-range` يوم ٢٠٢٦-٠٨-٣١).
 *
 * **لِمَ زرٌّ لا شريط:** الشريطُ القديم أربعةُ أبواب (٧ · ٣٠ · ٩٠ · الكلّ) لا يُسأل فيها عن
 * شهرٍ بعينه ولا أسبوعِ فعاليّة. وزيادةُ الأبواب تكسر الصفَّ على 375px — وهو المقياس، إذ
 * ٢٣٠ من ٢٩١ عضوًا لم يفتحوا اللوحة من حاسوبٍ قطّ. فالمدّةُ كلُّها تنطوي في بئرٍ واحدٍ
 * يقول اسمَ الاختصار وتاريخَه معًا، ويبقى في الصفّ متّسعٌ لمبدّل باب الزيارة.
 *
 * **وجلدُه من `.tb-fs` القائم** (بئرُ منسدل المرشِّح): سطران، اسمٌ فوق قيمة، بزرّ سهمٍ
 * قانونيّ. لا سطحَ يُخترع لضابطٍ هو أخو المرشِّحات.
 *
 * **والاختيارُ يسكن العنوان** (`?preset=` أو `?from=&to=`، و`cmp=0` لإطفاء المقارنة): فالصفحةُ
 * خادميّةٌ تُعيد الجلبَ بالتنقّل، والرابطُ يُنسَخ ويُشارَك كما هو ويُحفظ في المفضّلة.
 */
export function RangePicker({
  preset, range, compare, href, wide, grow, showCompare = true,
}: {
  /** مفتاحُ الاختصار المختار، أو `custom` لمدًى كُتب بيده. */
  preset: string;
  /** حدودُ المدى المعروضة الآن (تأتي من القاعدة فلا تُحسَب هنا مرّةً ثانية). */
  range: DayRange;
  compare: boolean;
  /** بناءُ العنوان: تُمرَّره الشاشةُ كي يبقى بابُ الزيارة وسائرُ الاختيارات في الرابط. */
  href: (next: { preset?: string; from?: string; to?: string; compare?: boolean }) => string;
  /** ممتدٌّ على عرض صفّه (كـ`seg-wide`) — لتخطيطٍ يجعل المدّةَ سطرًا قائمًا بذاته. */
  wide?: boolean;
  /** يبتلع ما بقي من سطره وإلى جانبه غيرُه — لسطرٍ واحدٍ يجمعه بمبدّل الأبواب. */
  grow?: boolean;
  /**
   * **صفُّ المقارنة يُخفى حيث لا مقارنة** (٢٠٢٦-٠٩-٠٥): شاشةُ الزوّار تقارن بالفترة
   * السابقة، وصفحةُ الباركود لا تفعل — فبقاءُ المبدّل فيها زرٌّ لا أثرَ له، وهو أسوأُ من
   * غيابه. والافتراضُ `true` فلا تتغيّر الشاشةُ التي بُني لها.
   */
  showCompare?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);
  const btnRef = useRef<HTMLButtonElement>(null);
  const today = todayKey();

  // التنقّل بالعنوان لا بحالةٍ محلّيّة: `<a>` عاديّ يُعيد الجلبَ خادميًّا كسائر مبدّلات الشاشة
  const go = (url: string) => { setOpen(false); window.location.href = url; };

  return (
    <div className={"drng tb-fs" + (wide ? " drng-wide" : "") + (grow ? " drng-grow" : "") + (open ? " open" : "")}>
      <button ref={btnRef} type="button" className="tb-fs-btn on" onClick={() => setOpen((o) => !o)} aria-label="مدى المدّة">
        <span className="uv-ic" aria-hidden><CalendarDots /></span>
        <span className="tb-fs-stack">
          <span className="tb-fs-lbl">{presetName(preset)}</span>
          <span className="tb-fs-val">{rangeLabel(range)}</span>
        </span>
        <span className="asel-chev"><CaretDown /></span>
      </button>

      <AnchoredPopover open={open} anchorRef={btnRef} onDismiss={() => setOpen(false)} align="start" className="tb-fs-panel">
        <div className="drng-panel">
          <div className="drng-quick">
            {PRESETS.map((p) => (
              <a
                key={p.key}
                className={"drng-qb" + (preset === p.key ? " on" : "")}
                href={href({ preset: p.key })}
                onClick={() => setOpen(false)}
              >
                {p.label}
              </a>
            ))}
          </div>

          {/* الاختصاراتُ ومدّةُ «من/إلى» بديلان متساويان لا خطوتان متتابعتان */}
          <Divider label="أو" />

          <div className="drng-dates">
            <Field
              label="من" type="date" icon={<CalendarBlank />} innerIcon={<CalendarDots />} placeholder="سنة/شهر/يوم"
              value={from} max={to} onChange={(e) => setFrom(e.target.value)}
            />
            <Field
              label="إلى" type="date" icon={<CalendarBlank />} innerIcon={<CalendarDots />} placeholder="سنة/شهر/يوم"
              value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)}
            />
          </div>

          {showCompare ? (
          <div className="drng-cmp">
            <span>قارِن بالفترة السابقة</span>
            <Segmented
              aria-label="المقارنة بالفترة السابقة"
              value={compare ? "on" : "off"}
              onValueChange={(v) => go(href({ compare: v === "on" }))}
              items={[{ value: "on", label: "نعم" }, { value: "off", label: "لا" }]}
            />
          </div>
          ) : null}

          <div className="drng-foot">
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button size="sm" disabled={!from || !to || from > to} onClick={() => go(href({ from, to }))}>طبّق</Button>
          </div>
        </div>
      </AnchoredPopover>
    </div>
  );
}

/** حدُّ التغيّر بين رقمين: نسبةٌ مئويّة، و`null` حين لا أساسَ يُقاس عليه (الفترةُ السابقة صفر). */
export const deltaPct = (now: number, before: number): number | null =>
  before > 0 ? Math.round(((now - before) / before) * 100) : null;
