"use client";

import { useCallback, useState } from "react";
import { Container, Segmented } from "@adeeb/design-system";
import { Toolbar, type FilterDef, type ViewMode } from "../../dashboard/_components/Toolbar";

/**
 * معرضُ شريط الأدوات على الجوّال — **مقارنةٌ بالارتفاع المقيس**.
 *
 * قِيس الشريطُ الكامل بإصبعٍ على 390px فوجد **182px في ثلاثة صفوف** (‏78px على 1200).
 * وموقعُه شاشاتُ العضو العاديّ: لجنتي · قسمي · الفعاليّات · الانتخابات — و‏٢٣٠ عضوًا من
 * ٢٩١ لم يفتحوا اللوحة من حاسوبٍ قطّ.
 *
 * والإطارُ عرضٌ حقيقيّ: الشريطُ حاويةُ استعلامٍ لنفسه فينطوي بعرض موضعه لا بعرض النافذة.
 */

const WIDTHS = [
  { value: "390", label: "جوّال ٣٩٠" },
  { value: "430", label: "جوّال كبير ٤٣٠" },
  { value: "768", label: "لوح ٧٦٨" },
  { value: "1100", label: "سطح مكتب" },
];

const FILTERS: FilterDef[] = [
  { key: "dept", label: "القسم", options: [
    { value: "media", label: "الإعلام" }, { value: "tech", label: "التقنية" }, { value: "content", label: "المحتوى" },
  ] },
  { key: "role", label: "الدور", options: [
    { value: "member", label: "عضو" }, { value: "lead", label: "قائد" }, { value: "head", label: "رئيس قسم" },
  ] },
  { key: "committee", label: "اللجنة", options: [
    { value: "hr", label: "الموارد البشريّة" }, { value: "qa", label: "الضمان والجودة" },
  ] },
];

function useH(): [number, (el: HTMLDivElement | null) => void] {
  const [h, setH] = useState(0);
  const ref = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const apply = () => setH(Math.round(el.getBoundingClientRect().height));
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
  }, []);
  return [h, ref];
}

/** إطارٌ بعرض الجهاز، وتحته صفُّ بياناتٍ وهميّ ليُرى ما بقي من الشاشة */
function Frame({ tag, tone, children }: { tag: string; tone: "bad" | "good"; children: React.ReactNode }) {
  const [h, ref] = useH();
  return (
    <div className="phdlab-col">
      <div className={"phdlab-tag " + tone}>
        <span className="dot" aria-hidden />
        {tag}
        <span className="h">{h ? h + "px" : ""}</span>
      </div>
      <div className="phdlab-frame">
        <div ref={ref}>{children}</div>
        <div className="phdlab-rule" />
        <div className="phdlab-body">أوّلُ صفٍّ من الجدول يبدأ هنا</div>
      </div>
    </div>
  );
}

export default function ToolbarMobileLab() {
  const [w, setW] = useState("390");

  const [s2, setS2] = useState("");
  const [f2, setF2] = useState<Record<string, string>>({ dept: "media" });
  const [v2, setV2] = useState<ViewMode>("table");

  // مقارنةُ النطاق ٥٦١–٦٩٩: حالتان مستقلّتان بعرضٍ واحد
  const [s3, setS3] = useState(""); const [f3, setF3] = useState<Record<string, string>>({ dept: "media" }); const [v3, setV3] = useState<ViewMode>("table");
  const [s4, setS4] = useState(""); const [f4, setF4] = useState<Record<string, string>>({ dept: "media" }); const [v4, setV4] = useState<ViewMode>("table");

  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System, Toolbar on Mobile</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">شريطُ الأدوات على الجوّال</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          ثلاثةُ أحكام: المرشّحاتُ تنطوي في زرٍّ واحدٍ بعدّاد، والبحثُ سطرٌ كامل، والشريطُ
          يخلع سطحَه فلا يبقى إطارٌ فوق إطار. والحالتان مرسومتان معًا والقياسُ يختار، فلا
          يومض شيءٌ عند أوّل رسم. الرقمُ فوق كلّ إطارٍ مقيسٌ حيًّا.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <span className="text-sm font-bold text-content-muted">عرض الإطار:</span>
          <Segmented items={WIDTHS} value={w} onValueChange={setW} aria-label="عرض إطار المعاينة" />
        </div>
      </Container>

      <div className="mx-auto w-full max-w-[1200px] px-6">
        <div className="mt-12 space-y-16" style={{ ["--phdlab-w" as string]: w + "px" }}>
          <section>
            <h2 className="mb-2 font-display text-2xl font-black text-content">الشريط الكامل</h2>
            <p className="mb-6 max-w-2xl text-sm text-content-muted">
              بحثٌ وثلاثةُ مرشّحاتٍ ومبدّلُ عرض، وأحدُ المرشّحات مختار. اضغط «تصفية» على
              العرض الضيّق لترى النافذة.
            </p>
            <div className="phdlab">
              <Frame tag="الشريط" tone="good">
                <Toolbar
                  searchPlaceholder="ابحث بالاسم أو رقم الجوّال…"
                  search={s2} onSearch={setS2}
                  filters={FILTERS} filterValues={f2}
                  onFilter={(k, v) => setF2((p) => ({ ...p, [k]: v }))} onReset={() => setF2({})}
                  view={v2} onViewChange={setV2}
                />
              </Frame>
            </div>
          </section>

          <section>
            <h2 className="mb-2 font-display text-2xl font-black text-content">النطاق ٥٦١ إلى ٦٩٩: ثلاثةُ صفوفٍ أم صفّان؟</h2>
            <p className="mb-6 max-w-2xl text-sm text-content-muted">
              كلاهما عند العرض نفسِه (‎640px) ليكون الفرقُ في التخطيط وحدَه. <b>أ</b> تعرض
              المرشّحاتِ مبسوطةً فتلزمها ثلاثةُ صفوف. <b>ب</b> تطويها في زرّ «تصفية» بجانب
              البحث فتكفي صفّان، ويُطلَب الاختيارُ بنقرةٍ تفتح النافذة.
            </p>
            <div className="phdlab" style={{ ["--phdlab-w" as string]: "640px" }}>
              <Frame tag="أ) ثلاثةُ صفوفٍ — مبسوطة" tone="good">
                <Toolbar
                  searchPlaceholder="ابحث بالاسم أو رقم الجوّال…"
                  search={s3} onSearch={setS3}
                  filters={FILTERS} filterValues={f3}
                  onFilter={(k, v) => setF3((p) => ({ ...p, [k]: v }))} onReset={() => setF3({})}
                  view={v3} onViewChange={setV3}
                />
              </Frame>
              <Frame tag="ب) صفّان — مطويّة" tone="good">
                <div className="tbdemo-collapsed">
                  <Toolbar
                    searchPlaceholder="ابحث بالاسم أو رقم الجوّال…"
                    search={s4} onSearch={setS4}
                    filters={FILTERS} filterValues={f4}
                    onFilter={(k, v) => setF4((p) => ({ ...p, [k]: v }))} onReset={() => setF4({})}
                    view={v4} onViewChange={setV4}
                  />
                </div>
              </Frame>
            </div>
          </section>

          <section>
            <h2 className="mb-2 font-display text-2xl font-black text-content">بحثٌ ومبدّلُ عرضٍ فقط</h2>
            <p className="mb-6 max-w-2xl text-sm text-content-muted">
              الحالةُ الأشيع في اللوحة. حتّى هنا يوفّر خلعُ السطح ‎24px وحدًّا وظلًّا لا يخدمان
              فوق جدولٍ يحمل إطارَه.
            </p>
            <div className="phdlab">
              <Frame tag="الشريط" tone="good">
                <Toolbar searchPlaceholder="ابحث…" search={s2} onSearch={setS2} view={v2} onViewChange={setV2} />
              </Frame>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
