"use client";

import { useCallback, useState } from "react";
import { Button, Container, Segmented } from "@adeeb/design-system";
import { Megaphone, PaperPlaneTilt } from "@phosphor-icons/react";
import { Eye } from "@/app/_components/glyphs";

/**
 * معرضُ مقاس اللمس — **واقعةٌ مقيسة، لا رأيٌ في الذوق**.
 *
 * لم يكن في النظام `min-height` على شيءٍ يُنقر، و`line-height: 1` — فالارتفاعُ حشوٌ ومقاسُ
 * خطّ لا غير. والحدُّ ‎44pt (أبل) و‎48dp (قوقل)، ولم يبلغه إلّا `abtn-lg`. وأصغرُ ما قِيس
 * فارزُ العمود (18px) وإجراءاتُ الصفّ (19px) — وهما من أكثر ما يُنقر في اللوحة.
 *
 * **والقاعدةُ نزلت** (٢٠٢٦-٠٨-١٣) في «قانون اللمس» بـ`components.css`، فهذه الصفحةُ صارت
 * شاهدًا لا مقترحًا: مبدّلُها يحاكي حكمَ الإصبع على الحاسوب.
 *
 * ولِمَ الآن: ٢٣٠ عضوًا من ٢٩١ لم يدخلوا اللوحة من حاسوبٍ قطّ (`auth.sessions`) — فبابُهم
 * إبهامٌ لا فأرة. والشريطُ المتقطّع حول كلّ زرٍّ أدناه هو ‎44px مرسومًا: يُرى النقصُ ولا
 * يُقرأ رقمًا.
 */

const MODES = [
  { value: "now", label: "الآن" },
  { value: "fix", label: "بالحدّ ٤٤" },
];

/** يقيس ارتفاع الزرّ المرسوم فعلًا — لا رقمَ محفورٌ في نصٍّ يكذب متى تغيّر النمط */
function useH(): [number, (el: HTMLElement | null) => void] {
  const [h, setH] = useState(0);
  const ref = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    const btn = el.querySelector(".abtn") ?? el;
    const apply = () => setH(Math.round(btn.getBoundingClientRect().height));
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(btn);
  }, []);
  return [h, ref];
}

function Sample({ label, children }: { label: string; children: React.ReactNode }) {
  const [h, ref] = useH();
  const short = h > 0 && h < 44;
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="ttlab-ring" ref={ref}>{children}</span>
      <span className="ttlab-num" style={short ? { color: "var(--danger)" } : undefined}>
        {label} {h ? h + "px" : ""} {short ? "▼ " + (44 - h) : h ? "✓" : ""}
      </span>
    </div>
  );
}

export default function TouchTargetLab() {
  const [mode, setMode] = useState("now");

  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System, Touch Target</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">مقاسُ اللمس</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          <b>القاعدةُ مطبَّقةٌ منذ ٢٠٢٦-٠٨-١٣</b> على كلّ ما يُنقر، مشروطةً بأداة التأشير. فإن
          فتحتَ هذه الصفحة بإصبعك رأيتَ الكلَّ ‎44px في الوضعين. وهذا المبدّل لأجل الحاسوب:
          يحاكي ما يراه صاحبُ الجوّال. والشريطُ المتقطّع حول كلّ زرٍّ هو ‎44px، والرقمُ تحته
          مقيسٌ من الصفحة لا محفورٌ في نصّ.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Segmented items={MODES} value={mode} onValueChange={setMode} aria-label="وضع القياس" />
        </div>

        <div className={mode === "fix" ? "tt-fix" : undefined}>
          <section className="mt-12">
            <h2 className="mb-2 font-display text-2xl font-black text-content">أحجام الأزرار الثلاثة</h2>
            <p className="mb-2 max-w-2xl text-sm text-content-muted">
              الأحمرُ دون الحدّ، والرقمُ بعد ▼ هو ما ينقصه. و`lg` وحدَه يبلغه اليوم، وهو أندرُها
              استعمالًا في اللوحة.
            </p>
            <div className="ttlab-row">
              <Sample label="sm"><Button variant="ghost" size="sm">إلغاء</Button></Sample>
              <Sample label="md"><Button variant="primary" size="md"><Megaphone size={18} />نشر</Button></Sample>
              <Sample label="lg"><Button variant="primary" size="lg">ابدأ</Button></Sample>
            </div>
          </section>

          <section className="mt-14">
            <h2 className="mb-2 font-display text-2xl font-black text-content">في رأس الصفحة المقترح</h2>
            <p className="mb-2 max-w-2xl text-sm text-content-muted">
              رأسُ الصفحة يصغّر فعلَه إلى `sm` تحت ‎480px ليبقى الصفُّ واحدًا — فيهبط إلى ‎33px،
              أيْ أحدَ عشرَ بكسلًا دون الحدّ. فالرأسُ «المُصلَح» يخالف حدَّ اللمس في أضيق
              جهازٍ بالذات، حيث الإصبعُ وحدَه يعمل. وهذه علّةُ المقترح لا علّةُ القديم.
            </p>
            <div className="ttlab-row">
              <Sample label="مُطلِق ⋯"><button type="button" className="abtn abtn-ghost abtn-md phd-more">⋯</button></Sample>
              <Sample label="فعلٌ sm"><Button variant="primary" size="sm"><PaperPlaneTilt size={16} />رفع</Button></Sample>
              <Sample label="ثانويّ sm"><Button variant="ghost" size="sm"><Eye size={16} />معاينة</Button></Sample>
            </div>
          </section>

          <section className="mt-14">
            <h2 className="mb-2 font-display text-2xl font-black text-content">وضربةُ الإبهام</h2>
            <p className="mb-2 max-w-2xl text-sm text-content-muted">
              دائرةُ ‎44px موضوعةٌ فوق زرَّين متجاورين بفجوة ‎8px، وهي فجوةُ الشريط والرأس
              اليوم. الإبهامُ يغطّي الزرَّين معًا، فالخطأُ ليس احتمالًا بل هندسة.
            </p>
            <div className="ttlab-row" style={{ position: "relative" }}>
              <Button variant="ghost" size="sm">إلغاء</Button>
              <Button variant="primary" size="sm">حذف</Button>
              <span
                aria-hidden
                style={{
                  position: "absolute", insetInlineStart: 24, top: "50%", transform: "translateY(-50%)",
                  width: 44, height: 44, borderRadius: "50%",
                  background: "color-mix(in oklab, var(--danger) 22%, transparent)",
                  border: "1.5px solid color-mix(in oklab, var(--danger) 55%, transparent)",
                  pointerEvents: "none",
                }}
              />
            </div>
          </section>
        </div>

        <section className="mt-16">
          <h2 className="mb-2 font-display text-2xl font-black text-content">القاعدةُ المطبَّقة</h2>
          <p className="max-w-2xl text-sm text-content-muted">
            مشروطةٌ بأداة التأشير لا بعرض الشاشة: اللمسُ يأخذ
            حدَّه، والفأرةُ لا تُثقَل بما لا تحتاجه. ولوحٌ بقلمٍ يُقرأ دقيقًا فلا يكبر، وحاسوبٌ
            بشاشةِ لمسٍ يكبر — وهو الصواب في الحالين.
          </p>
          <pre className="mt-4 max-w-2xl overflow-x-auto rounded border border-line bg-surface-2 p-4 text-start font-latin text-sm" dir="ltr">
{`@media (pointer: coarse) {
  .abtn, .aibtn, .dm-trigger, .dt-dots, .dt-sort,
  .dt-group, .pag-num, .pag-arr, .seg-item, .tab,
  .asel-trigger, .tb-reset, .tb-fs-btn, .tb-view button {
    min-height: 44px;
    min-width: 44px;
  }
}`}
          </pre>
          <p className="mt-4 max-w-2xl text-sm text-content-muted">
            ولا تُوسَّع منطقةُ اللمس بعنصرٍ زائفٍ والشكلُ يبقى: على `.abtn` ‏`overflow: hidden`
            لأجل شعاع `::after`، فأيُّ هالةٍ تتجاوز حدَّه تُقصّ. فالخياران أن يكبر الزرّ أو
            يُنزَع الشعاع، والأوّلُ أرخص.
          </p>
        </section>
      </Container>
    </main>
  );
}
