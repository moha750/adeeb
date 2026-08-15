"use client";

import { useState } from "react";
import { Container } from "@adeeb/design-system";
import { CaretDown, Check, X } from "@/app/_components/glyphs";
import { Buildings, IdentificationBadge, UsersThree } from "@phosphor-icons/react";
import { FilterSelect, type FilterDef } from "../../dashboard/_components/Toolbar";

/**
 * معرضُ توجّهات الشريحة القائمة — **اختيارٌ للمالك**، ثمّ يبقى واحدٌ ويُعدم الباقي.
 *
 * **المسألةُ ليست عرضًا:** قِيست الشرائحُ الثلاث فوُجدت ‎167px سواءً في كلّ الأعراض.
 * الذي يُقرأ «أكبر» هو الوزنُ البصريّ: **خمسُ إشاراتٍ تجتمع على عنصرٍ واحد** (حدٌّ داكن ·
 * سطحٌ مصبوغ · نصٌّ عريض · فاصل · ✕) في صفٍّ إخوتُه شاحبة، فالعينُ تقرأ الثقلَ حجمًا.
 *
 * فالتوجّهاتُ أدناه تختلف في **كم إشارةً تحمل الحالة**، لا في البكسل. وكلُّها بالعرض
 * نفسِه وبالتخطيط نفسِه (شبكةٌ بأعمدةٍ متساوية) ليُقارَن ما يختلف وحدَه.
 *
 * **واختار المالكُ «سطران»** (٢٠٢٦-٠٨-١٣) فنُقل إلى `ToolbarNext` حيًّا عاملًا؛ وتبقى هذه
 * الصفحةُ سجلًّا للقرار وما رُفض معه، لا مقترحًا ينتظر.
 */

const FILTERS = [
  { key: "dept", label: "القسم", value: "الإعلام" },
  { key: "role", label: "الدور", value: "" },
  { key: "committee", label: "اللجنة", value: "" },
];

/** تعريفاتٌ حقيقيّةٌ تُمرَّر لـ`FilterSelect` — فما يُجرَّب هو المكوّن لا نسخةُ وسمٍ ساكنة */
const DEFS: FilterDef[] = [
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

function Row({ name, note, children }: { name: string; note: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="fclab-name"><b>{name}</b><span>{note}</span></div>
      <div className="fclab-row">{children}</div>
    </div>
  );
}

/** الشكلُ القائمُ اليوم — مرجعُ المقارنة */
function Base({ variant, dot, valueOnly }: { variant?: string; dot?: boolean; valueOnly?: boolean }) {
  return (
    <div className={variant}>
      <div className="tb-wide">
        {FILTERS.map((f) => (
          <div key={f.key} className={"tb-fs" + (f.value ? " set" : "")}>
            <button type="button" className={"tb-fs-btn" + (f.value ? " on" : "")}>
              <span>
                {dot && f.value ? <span className="tb-fs-dot" style={{ display: "inline-block", marginInlineEnd: 7 }} aria-hidden /> : null}
                {f.value && valueOnly ? <span className="val">{f.value}</span> : <>{f.label}{f.value ? <>: <span className="val">{f.value}</span></> : null}</>}
              </span>
              {f.value && !dot ? null : <span className="asel-chev"><CaretDown /></span>}
            </button>
            {f.value && !dot ? (
              <button type="button" className="tb-fs-x" aria-label={`ارفع مرشّح ${f.label}`}><X aria-hidden /></button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

/** سطران: الاسمُ فوقُ والقيمةُ تحته — الحالتان بالبنية نفسِها */
function TwoLine() {
  return (
    <div className="tb2">
      <div className="tb-wide">
        {FILTERS.map((f) => (
          <div key={f.key} className={"tb-fs" + (f.value ? " set" : "")}>
            <button type="button" className={"tb-fs-btn" + (f.value ? " on" : "")}>
              <span className="tb-fs-stack">
                <span className="tb-fs-lbl">{f.label}</span>
                <span className="tb-fs-val">{f.value || "الكل"}</span>
              </span>
              {f.value ? null : <span className="asel-chev"><CaretDown /></span>}
            </button>
            {f.value ? (
              <button type="button" className="tb-fs-x" aria-label={`ارفع مرشّح ${f.label}`}><X aria-hidden /></button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

/** المطبَّقُ في سطرٍ تحت الضوابط — فصلٌ تامٌّ بين الضابط والحال */
function Below() {
  return (
    <div className="fcv5">
      <div className="tb-wide">
        {FILTERS.map((f) => (
          <div key={f.key} className="tb-fs">
            <button type="button" className="tb-fs-btn">
              <span>{f.label}</span>
              <span className="asel-chev"><CaretDown /></span>
            </button>
          </div>
        ))}
      </div>
      <div className="fcv5-applied">
        <span className="fcv5-chip">
          القسم: الإعلام
          <button type="button" aria-label="ارفع مرشّح القسم"><X aria-hidden /></button>
        </span>
      </div>
    </div>
  );
}


/* ══════════ توجّهاتُ علامة الرفع (✕) ══════════ */

/**
 * صفٌّ حيٌّ لكلّ معالجةٍ لعلامة الرفع، ونسخةٌ ثانيةٌ بجواره تحاكي المرورَ (`is-hover`)
 * لتُرى الحالتان معًا في لقطةٍ واحدة — والحيّةُ تُجرَّب بالفأرة.
 */
function XRow({ variant }: { variant: string }) {
  const [v, setV] = useState<Record<string, string>>({ dept: "media" });
  const [v2, setV2] = useState<Record<string, string>>({ dept: "media" });
  const row = (state: Record<string, string>, set: (f: (p: Record<string, string>) => Record<string, string>) => void, hover: boolean) => (
    <div className={"tb2 " + variant + (hover ? " xv-hover" : "")}>
      <div className="tb-wide">
        {DEFS.map((d) => (
          <FilterSelect key={d.key} def={d} value={state[d.key] ?? ""} onChange={(nv) => set((p) => ({ ...p, [d.key]: nv }))} />
        ))}
      </div>
    </div>
  );
  return (
    <div className="xvlab">
      <div><div className="xvlab-cap">حيٌّ — جرّبه</div><div className="fclab-row">{row(v, setV, false)}</div></div>
      <div><div className="xvlab-cap">محاكاةُ المرور</div><div className="fclab-row">{row(v2, setV2, true)}</div></div>
    </div>
  );
}

/** لا ✕ في الشريحة — الرفعُ سطرٌ في المنسدل، منغَّمٌ خطرًا لأنّه فعلٌ لا خيار */
function PanelClear() {
  return (
    <div className="fclab-row">
      <div className="xv6-panel">
        <button type="button" className="tb-fs-opt sel"><span className="tb-fs-txt">الإعلام</span><Check className="tb-fs-ck" aria-hidden /></button>
        <button type="button" className="tb-fs-opt"><span className="tb-fs-txt">التقنية</span><Check className="tb-fs-ck" aria-hidden /></button>
        <button type="button" className="tb-fs-opt"><span className="tb-fs-txt">المحتوى</span><Check className="tb-fs-ck" aria-hidden /></button>
        <button type="button" className="xv6-clear"><X aria-hidden />ارفع هذا المرشِّح</button>
      </div>
    </div>
  );
}


/* ══════════ هيئاتُ الشريحة — المبدأُ واحدٌ والهيئةُ تتبدّل ══════════ */

const DIM_ICON: Record<string, React.ReactNode> = {
  dept: <Buildings />, role: <IdentificationBadge />, committee: <UsersThree />,
};

/**
 * صفٌّ حيٌّ: يفتح ويختار ويرفع بمكوّن `FilterSelect` نفسِه — لا نسخةَ وسمٍ ساكنة.
 * والهيئةُ من `variant` وحدَها، فالمقارنةُ بين الهيئات لا بين تطبيقين.
 */
function UiRow({ variant, icons }: { variant: string; icons?: boolean }) {
  const [v, setV] = useState<Record<string, string>>({ dept: "media" });
  return (
    <div className={"tb2 " + variant}>
      <div className="tb-wide">
        {DEFS.map((d) => (
          <FilterSelect
            key={d.key}
            def={d}
            value={v[d.key] ?? ""}
            onChange={(nv) => setV((p) => ({ ...p, [d.key]: nv }))}
            icon={icons ? DIM_ICON[d.key] : undefined}
          />
        ))}
      </div>
    </div>
  );
}

export default function FilterChipLab() {
  const [w, setW] = useState(760);
  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System, Filter Chip</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">توجّهاتُ المرشِّح القائم</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          الشرائحُ الثلاثُ متساويةٌ هندسيًّا في كلّ ما دونُ (قِيست: ‎167px لكلٍّ). الذي يُقرأ
          «أكبر» هو الوزن: خمسُ إشاراتٍ تجتمع على عنصرٍ واحدٍ في صفٍّ إخوتُه شاحبة. فما دون
          يختلف في <b>كم إشارةً تحمل الحالة</b>، والعرضُ والتخطيطُ واحدٌ في الجميع.
        </p>

        <label className="mt-8 flex flex-wrap items-center gap-3 text-sm font-bold text-content-muted">
          عرض الصفّ:
          <input type="range" min={420} max={1100} value={w} onChange={(e) => setW(Number(e.target.value))} style={{ width: 260 }} />
          <span className="font-latin">{w}px</span>
        </label>

        <p className="mt-8 max-w-2xl rounded border border-line bg-surface-2 p-3 text-sm text-content-muted">
          القسمُ الأوّلُ <b>سجلٌّ ساكن</b> لقرارٍ مضى (اختير «سطران» ورُفض ما معه). وما بعده
          <b> حيٌّ يُجرَّب</b>: افتح واختر وارفع.
        </p>

        <div className="fclab mt-6" style={{ maxWidth: w }}>
          <Row name="الحال اليوم" note="حدٌّ داكن، سطحٌ مصبوغ، نصٌّ عريض، فاصل، ✕ — خمسُ إشارات">
            <Base />
          </Row>
          <Row name="١) الهادئة" note="سطحُ الإخوة نفسُه، والقيمةُ وحدَها ملوّنة — إشارةٌ واحدة">
            <Base variant="fcv1" />
          </Row>
          <Row name="٢) النقطة" note="الضابطُ لا يتغيّر، ونقطةٌ تقول «قائم». الرفعُ من داخل المنسدل">
            <Base variant="fcv2" dot />
          </Row>
          <Row name="٣) سطران — المعتمَد" note="اختاره المالك ٢٠٢٦-٠٨-١٣، وهو حيٌّ عاملٌ في /ui/toolbar-mobile">
            <TwoLine />
          </Row>
          <Row name="٤) القيمةُ وحدَها" note="يسقط اسمُ المرشِّح متى اختيرت قيمتُه، فتقصر لا تطول">
            <Base variant="fcv4" valueOnly />
          </Row>
          <Row name="٥) تحت الصفّ" note="المنسدلاتُ لا تتغيّر أبدًا، والمطبَّقُ شريطٌ تحتها. ثمنُه سطرٌ زائد">
            <Below />
          </Row>
        </div>

        <h2 className="mt-20 font-display text-2xl font-black text-content">هيئاتُ الشريحة</h2>
        <p className="mt-2 max-w-2xl text-content-muted">
          المبدأُ واحدٌ في الخمسة (سطران: اسمٌ فوقُ وقيمةٌ تحته، ومَخرجُ رفع)، والمتبدّلُ
          <b> الشكلُ والسطحُ والتسلسلُ وموضعُ الرفع</b>.
        </p>

        <div className="fclab mt-10" style={{ maxWidth: 720 }}>
          <Row name="أ) مملوءةٌ صلبة" note="سطحٌ متدرّجٌ صلبٌ ونصٌّ أبيض، والرفعُ في دائرةٍ شفّافةٍ داخله — أعلى تباين، تُقرأ «قيمةً مثبَّتة»">
            <UiRow variant="uv-a" />
          </Row>
          <Row name="ب) خطٌّ سفليٌّ لا صندوق" note="لا حدَّ ولا سطح: القيمةُ تحتها خطٌّ بلون الهويّة — أخفُّ ما يمكن، تُقرأ نصًّا">
            <UiRow variant="uv-b" />
          </Row>
          <Row name="ج) بطاقةٌ بأيقونة" note="رمزُ البُعد في الصدر فيُعرف المرشِّحُ بلا قراءة، وسطحٌ أبيضُ بظلٍّ — تُقرأ «عنصرًا»">
            <UiRow variant="uv-c" icons />
          </Row>
          <Row name="د) شارةٌ معلَّقةٌ في الزاوية" note="جسمُ الشريحة خبرٌ محضٌ لا يزاحمه فعل، والرفعُ دائرةٌ تطفو على زاويتها">
            <UiRow variant="uv-d" />
          </Row>
          <Row name="هـ) مقسومةٌ بنغمة" note="نصفُ الاسمِ مصبوغٌ ونصفُ القيمةِ صافٍ — تُقرأ زوجًا «مفتاحٌ ← قيمة» كوسمِ قاعدةِ بيانات">
            <UiRow variant="uv-e" />
          </Row>
        </div>

        <h2 className="mt-20 font-display text-2xl font-black text-content">توجّهاتُ علامة الرفع</h2>
        <p className="mt-2 max-w-2xl text-content-muted">
          الأحمرُ في نظامٍ ناضجٍ يقول <b>«لا رجعة»</b>: يُحجَز للحذف وإنهاء العضويّة وما لا
          يُستردّ. ورفعُ مرشِّحٍ يُستردّ بنقرة، فصبغُه أحمرَ <b>ساكنًا</b> يبالغ في الإنذار
          ويستهلك اللونَ فيبهت حيث يلزم حقًّا. أمّا الأحمرُ <b>لحظةَ القصد</b> فتأكيدٌ في
          محلّه. وكلُّ توجّهٍ معروضٌ بحالتيه.
        </p>

        <div className="fclab mt-10" style={{ maxWidth: 720 }}>
          <Row name="أ) فولاذيّ" note="لا لونَ حالةٍ البتّة — الحال اليوم">
            <XRow variant="xv1" />
          </Row>
          <Row name="ب) يحمرّ عند القصد — التوصية" note="محايدٌ ساكنًا، وأحمرُ حين تهمّ. والحدُّ يتبعه فيُقرأ القصدُ من الشريحة كلِّها">
            <XRow variant="xv2" />
          </Row>
          <Row name="ج) أحمرُ دائمًا" note="صريحٌ، لكنّه يزعم خطرًا في فعلٍ يُستردّ بنقرة">
            <XRow variant="xv3" />
          </Row>
          <Row name="د) دائرةٌ مملوءة" note="الرفعُ زرٌّ مستقلٌّ لا أيقونةٌ في حافّة — أوضحُ هدفًا، وأثقلُ وزنًا">
            <XRow variant="xv4" />
          </Row>
          <Row name="هـ) بلا فاصل" note="✕ يسبح في الشريحة بلا خطٍّ يقسمها — أخفُّ ما يكون">
            <XRow variant="xv5" />
          </Row>
          <Row name="و) لا ✕ أصلًا" note="الرفعُ سطرٌ في المنسدل، منغَّمٌ خطرًا لأنّه فعلٌ لا خيار. الشريحةُ تبقى نظيفةً تمامًا">
            <PanelClear />
          </Row>
        </div>
      </Container>
    </main>
  );
}
