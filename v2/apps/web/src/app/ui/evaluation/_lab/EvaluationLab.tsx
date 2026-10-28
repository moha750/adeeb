"use client";

import { useState } from "react";
import { Container, Segmented } from "@adeeb/design-system";
import type { Screen } from "./LabFrame";

/**
 * **معرضُ تقييم القيادات** (٢٠٢٦-١٠-٢٠). لكلّ شاشةٍ مقترحان جنبًا إلى جنب، داخل نافذةٍ حقيقيّة بعرض الجهاز
 * (لا يحكم المالكُ على تصميمٍ بمقاسٍ واحد: الحاسوبُ واللوحُ والجوّال). ومبدّلُ الحال يُري الشاشةَ في أحوالها:
 * عضوٌ يقيّم ورئيسٌ يقيّم، ودورةٌ مفتوحةٌ ومنتهية، وباقٍ ومستبعَد. ويُعدَم المرفوضُ بعد الاختيار.
 */
const SIZES = [
  { value: "390", label: "جوّال" },
  { value: "820", label: "لوح" },
  { value: "1280", label: "حاسوب" },
];

/**
 * `b` فارغٌ لشاشةٍ اعتُمد مقترحُها: تُعرض وحدَها بعد تعديلاتها، والمرفوضُ أُعدم. و`qa`/`qb` استعلامُ كلّ وجه
 * (أوجهُ جولة الملاحظات تتشارك الشاشةَ نفسَها ولا يفرّق بينها إلّا المسألة).
 */
type Sec = { key: Screen; id?: string; title: string; note?: string; states: { value: string; label: string; q?: string }[]; a: string; b: string | null; qa?: string; qb?: string };

/** جولةُ ملاحظات المحاكي (٢٠٢٦-١٠-٢٧): الغرفةُ نفسُها في الوجهين، ولا يختلف إلّا ما تُسأل عنه. */
const FIXES: Sec[] = [
  {
    key: "room", id: "out", title: "صفّ المستبعَد",
    note: "كان: تدرّجٌ أحمرُ إلى أبيض، وفوقه أشرطةٌ زرقاء، والإشارةُ مكرّرةٌ ثلاثًا.",
    states: [{ value: "done", label: "دورة منتهية" }],
    a: "المعتمَد: صبغة، لونٌ خفيفٌ مستوٍ وأشرطةٌ محايدة", b: null,
  },
  {
    key: "room", id: "quorum", title: "علامة النصاب",
    note: "كان: خطٌّ داكنٌ عند منتصف شريط الأعضاء لا يقول ما هو.",
    states: [{ value: "open", label: "دورة مفتوحة" }, { value: "done", label: "دورة منتهية" }],
    a: "المعتمَد: خطٌّ مسمًّى «النصف»، و«النصاب» خرجت من الواجهة كلِّها", b: null,
  },
  {
    key: "room", id: "excluded", title: "المستثنى",
    note: "كان: سطرٌ خافتٌ في ذيل الغرفة. انزل إلى «قسم التواصل» في أ، وإلى ذيل الصفحة في ب.",
    states: [{ value: "done", label: "دورة منتهية" }],
    a: "صفٌّ في مكانه من لجنته، وسببُه في موضع المشاركة", b: "كرتٌ مستقلّ «خارج هذه الدورة»",
    qa: "look=excluded=row", qb: "look=excluded=card",
  },
  {
    key: "room", id: "detail", title: "نافذة التفصيل واختيار اللجنة",
    note: "النافذةُ مفتوحةٌ في الإطارين. بدّل الحال لترى منسّقًا ينتظر لجنة، وقائدًا باقيًا، ودورةً مفتوحة.",
    states: [
      { value: "done", label: "منسّق ينتظر لجنة", q: "open=31" },
      { value: "done", label: "قائد باقٍ", q: "open=11" },
      { value: "done", label: "مستبعَد عاد إلى لجنته", q: "open=14" },
      { value: "open", label: "دورة مفتوحة", q: "open=11" },
    ],
    a: "ملفّ، بنمط نافذة الشخص في المنصّة", b: "تبويباتٌ بغلاف الملفّ، والقرارُ أوّلًا (المقترح)",
    qa: "look=detail=profile", qb: "look=detail=tabs",
  },
];

const SCREENS: Sec[] = [
  {
    key: "rate",
    title: "صفحة المقيِّم",
    states: [{ value: "member", label: "عضو لجنة" }, { value: "council", label: "عضو المجلس" }],
    a: "المعتمَد: مسار، بلا شارة الشقّ، ومقياسٌ أقصر، والورقةُ تُحفظ مسوّدة",
    b: null,
  },
  {
    key: "room",
    title: "غرفة الإدارة",
    states: [{ value: "done", label: "دورة منتهية" }, { value: "open", label: "دورة مفتوحة" }],
    a: "المعتمَد: أقسامٌ وصفوف",
    b: null,
  },
  {
    key: "mine",
    title: "نتيجتي",
    states: [{ value: "kept", label: "باقية" }, { value: "removed", label: "مستبعَد" }],
    a: "المعتمَد: ميزان",
    b: null,
  },
];

function Section({ s }: { s: Sec }) {
  const [size, setSize] = useState("1280");
  const [si, setSi] = useState("0");
  const st = s.states[Number(si)];
  const state = st.value;
  const w = Number(size);
  return (
    <section className="evlab-sec">
      <div className="evlab-head">
        <h2 className="font-display text-2xl font-black text-content">{s.title}</h2>
        <div className="evlab-ctl">
          <Segmented items={SIZES} value={size} onValueChange={setSize} />
          <Segmented items={s.states.map((x, i) => ({ value: String(i), label: x.label }))} value={si} onValueChange={setSi} />
        </div>
      </div>
      {s.note ? <p className="evlab-note">{s.note}</p> : null}
      <div className="evlab-pair" style={{ ["--evlab-w" as string]: `${w}px` }}>
        {(s.b ? (["a", "b"] as const) : (["a"] as const)).map((o) => (
          <div key={o} className="evlab-col">
            <div className={"phdlab-tag" + (s.b ? "" : " good")}><span className="dot" aria-hidden />{s.b ? `${o === "a" ? "أ" : "ب"}: ${o === "a" ? s.a : s.b}` : s.a}</div>
            <iframe
              key={`${o}-${si}`}
              className="evlab-frame"
              src={`/ui/evaluation/frame/${s.key}/${o}?state=${state}${st.q ? `&${st.q}` : ""}${(o === "a" ? s.qa : s.qb) ? `&${o === "a" ? s.qa : s.qb}` : ""}`}
              title={`${s.title} ${o}`}
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </section>
  );
}

export function EvaluationLab() {
  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System, Leader Evaluation</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">تقييم القيادات</h1>
      </Container>
      <div className="mx-auto w-full max-w-[2700px] px-6">
        <h2 className="evlab-round">جولةُ ملاحظات المحاكي</h2>
        {FIXES.map((s) => <Section key={s.id} s={s} />)}
        <h2 className="evlab-round">المعتمَد</h2>
        {SCREENS.map((s) => <Section key={s.key} s={s} />)}
      </div>
    </main>
  );
}
