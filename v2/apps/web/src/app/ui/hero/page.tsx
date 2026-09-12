"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Segmented } from "@adeeb/design-system";
import {
  Hero,
  HERO_PARTS,
  heroLineText,
  type HeroLab,
  type HeroLineTweak,
  type HeroMotion,
  type HeroSlide,
  type Standing,
} from "@/app/_components/Hero";

/**
 * **صدرُ الهبوط: تخطيطُ المالك مُنفَّذًا بلغتنا.**
 *
 * ══ الأمرُ كما جاء ══
 * بعد ردّ ثلاث جولات، أرسل المالكُ مخطّطًا بالفوتوشوب وقال: «صمّمتُ مخطّط UX مو UI،
 * لا تطبّق كما في الصورة بل افهم التخطيط». فالمأخوذُ **البنية**، والمتروكُ تنفيذُها
 * البصريّ (الحروفُ الممدودةُ بالكشيدة، والوتدُ الغليظ، وحبرُ التعليق الخام).
 *
 * ══ ما أُخذ من مخطّطه حرفًا ══
 * ١) قسمةٌ **مائلة** لا عمودان: صورةٌ يسارًا وبياضٌ يمينًا وشريطٌ مائلٌ بينهما.
 * ٢) اليمينُ أبيضُ والجملةُ فيه **ثلاثةُ أسطرٍ مرصوصة**.
 * ٣) الريشةُ **فوق** الحروف تحجب بعضَها، لا خلفَها ولا بجانبها.
 * ٤) التعليقُ **داخلَ** الصورة أسفلَ اليسار، والصورةُ هي العارض.
 *
 * ══ وما وضعتُه أنا ══
 * السلّمُ الطباعيّ والتقارب، وتدرّجُ الهوية على الكلمة الأخيرة (جهازٌ أقرّه ٢٠٢٦-٠٧-١٨)،
 * ورهافةُ الشريط، وستارةُ التعليق، ونقاطُ العارض بدل الأسهم (الأسهمُ موضعُها وسطَ ما
 * تحت العارض بق١١، وذلك خارجَ الصدر).
 *
 * ══ والريشةُ موضعٌ محجوز ══
 * الرسمُ الواقعيُّ في طريقه من المالك. وحتّى يصل تجلس في موضعها **ريشةُ الشعار**
 * علامةً مؤقّتة، والاستبدالُ سطرٌ واحد (`QUILL`) بلا مساسٍ بالتخطيط.
 */

/* ══ شرائحُ العارض: صفوفٌ حقيقيّةٌ من `news` ═════════════════════════
   وهي في الإنتاج ما يختاره المسؤولُ من اللوحة (قولُه «نختارها»). */

const SLIDES: HeroSlide[] = [
  {
    tag: "خبر",
    title: "حينَ يتحوّلُ السُّؤالُ إلى أُفُق: «أثرٌ ومعرفةٌ في عوالمَ متعدّدة» ترسمُ ملامحَ الشغف",
    img: "https://nnlhkfeybyhvlinbqqfa.supabase.co/storage/v1/object/public/images/news/1778326806595-18hjpx.jpg",
    href: "/news",
  },
  {
    tag: "إنجاز",
    title: "نادي أدِيب يُشرع أبوابَ الوعي في معرض «وعيك كفاية»",
    img: "https://nnlhkfeybyhvlinbqqfa.supabase.co/storage/v1/object/public/images/news/1776248444963-4g4se4.jpg",
    href: "/news",
  },
  {
    tag: "خبر",
    title: "عدسةُ الإبداع تُبصرُ المعنى: ورشة «احتراف الفوتوغراف» تفتح آفاقًا جديدة",
    img: "https://nnlhkfeybyhvlinbqqfa.supabase.co/storage/v1/object/public/images/news/1777906023509-tbrqog.jpg",
    href: "/news",
  },
];

/* ══ منازلُ الزائر: من الصدر الحقيقيّ لا نسخةً هنا ═════════════════
   **وثلاثٌ لا أربع** (تصحيحُ ٢٠٢٦-٠٩-١٢): كان المعرضُ يعرض «متطوّعًا» رابعًا
   والموقعُ لا يعرفه — فكانت المعاينةُ تُري خطابًا لا ينزل على أحد. */
const STANDINGS: { value: Standing; label: string }[] = [
  { value: "guest", label: "زائر" },
  { value: "account", label: "صاحب حساب" },
  { value: "member", label: "عضو" },
];

/* ══ الصدر ═════════════════════════════════════════════════════════ */

/* ══ الضبطُ الحيّ: كلُّ سطرٍ على حدة ═══════════════════════════════════
   طلبُ المالك (٢٠٢٦-٠٩-٠٦ ثمّ ٢٠٢٦-٠٩-٠٧): «أحسّ العناصرَ أحرّكها وكأنّها
   فوتوشوب»، ثمّ «أريد تحكّمًا في كلّ سطرٍ منفردًا حتّى بالكشيدة، ولا أريد كلَّ
   السطور فوق الريشة بل أختار أيَّها فوقها».

   فالسطرُ وحدةٌ قائمةٌ بذاتها: **مدُّه** (لكلّ موضعِ وصلٍ فيه مزلاجُه)،
   و**إزاحتُه** (يُسحب بالفأرة)، و**طبقتُه** (فوق الريشة أو تحتها). والريشةُ
   كذلك تُسحَب ويُضبط حجمُها ودورانُها. ثمّ تُنسَخ القيمُ من الصندوق وتُثبَّت.

   **ولمَ لا `transform`/`z-index` على `.hro-title` كلِّه؟** لأنّ أيًّا منهما
   يُنشئ سياقَ تكديسٍ للكتلة، فيصير سقفُ أبنائها سقفَها هي — ولا يقدر سطرٌ أن
   يعلو الريشةَ وحدَه. فالكتلةُ بلا سياق، وكلُّ سطرٍ يحمل طبقتَه بنفسه. */

/** أجزاءُ كلّ سطرٍ ومواضعُ المدّ بينها (المدُّ يقع بين كلّ جزأين). */
/* **قانونُ التقطيع:** أجزاءُ السطر تُقطَّع **عند مواضع الوصل وحدَها**، فالمدُّ
   بين حرفين لا يتّصلان يخرج شرطةً طائرة، ولامُ ألفٍ رباطٌ واحدٌ لا يُشقّ بمدّ. */
const HEAD: { parts: string[][]; names: string[]; lines: LineTweak[] } = {
  /** أجزاءُ السطر **من الصدر الحقيقيّ**: الجملةُ لا تُكتب مرّتين. */
  parts: HERO_PARTS,
  names: ["حيث", "تولد", "الكلمة"],
  /** **ما ضبطه المالكُ بيده وأقرّه** (٢٠٢٦-٠٩-٠٧): مدُّ كلّ سطرٍ وإزاحتُه وطبقتُه.
      و«تولد» وحدَه فوق الريشة، فالريشةُ تعبر تحته وتحجب ما دونه. */
  lines: [
    { kash: [1, 9], x: -0.056, y: 0.008, over: false },
    { kash: [2, 22], x: -0.28, y: 0, over: true },
    { kash: [5, 2], x: -0.024, y: 0, over: false },
  ],
};

const SAMPLES: Sample[] = [
  { k: "المعتمَدة", cls: "", lines: HEAD.lines },
  {
    /* **الكافُ ممتدّة** (طلبُه): المدُّ يُنقَل إلى ما **بعد** الكاف فيمتدّ ذراعُها
       هي، بدل أن يمتدّ ما قبلها. */
    k: "كافٌ ممتدّة",
    cls: "",
    lines: [
      { kash: [1, 9], x: -0.056, y: 0.008, over: false },
      { kash: [2, 22], x: -0.28, y: 0, over: true },
      { kash: [1, 16], x: -0.024, y: 0, over: false },
    ],
  },
  {
    /* **السلّم**: الأسطرُ تتدرّج طولًا وإزاحةً فتُقرأ دَرَجًا ينزل. */
    k: "سلّم",
    cls: "",
    lines: [
      { kash: [0, 2], x: 0, y: 0, over: false },
      { kash: [2, 14], x: -0.18, y: 0, over: true },
      { kash: [6, 10], x: -0.36, y: 0, over: false },
    ],
  },
  { k: "مفرَّغة", cls: "hro-t-hollow", lines: HEAD.lines },
  { k: "الحبرُ يخفّ", cls: "hro-t-fade", lines: HEAD.lines },
];

/* ══ عيّناتُ الحرف ══════════════════════════════════════════════════
   أربعُ معالجاتٍ للجملة نفسِها تُعرَض على الكتلة الحيّة (طلبُ المالك ٢٠٢٦-٠٩-١٢).
   اثنتان بالمدّ وحدَه، واثنتان بقاعدةٍ في المكتبة (`.hro-t-hollow` · `.hro-t-fade`).
   ومَن اختار واحدةً أُعدمت قواعدُ البواقي. */
type Sample = { k: string; cls: string; lines: LineTweak[] };

/* **وأنواعُ الضبط من الصدر الحقيقيّ** (٢٠٢٦-٠٩-١٢): كانت معرَّفةً هنا ثانيةً،
   فلو زِيد حقلٌ في أحدهما لَقَبِله المعرضُ ورفضه الصدرُ (أو العكس). فهي أسماءٌ
   محلّيّةٌ لأنواعه لا نسخٌ منها. */
type LineTweak = HeroLineTweak;
type Tweak = HeroLab["tw"];

/** القيمُ المعتمَدةُ اليوم (وهي نفسُها افتراضاتُ الورقة). */
/** مواضعُ الريشة **بالـem** من مقاس الحبر (‏`qx` مسافةٌ من حافّة الحروف اليمنى):
    الكتلةُ واحدةٌ فتكبر معًا. و`k` معاملُ تكبير الكتلة كلِّها. */
const DEF: Tweak = { qx: 0.43, qy: -0.13, qw: 2.75, qrot: 0, k: 1.95, motion: "tilt", power: 1 };
/** **وضبطُ الأسطر مصدرُه الجملةُ نفسُها لا نسخةٌ ثانية:** كان مكتوبًا مرّتين، فلو
    صُحّح أحدُهما وحدَه لَعرض المعرضُ رقمًا ويُنسَخ في الورقة غيرُه. */
const DEF_LINES: LineTweak[] = HEAD.lines;

/** نصُّ السطر: الرسّامُ نفسُه الذي يرسم به الصدرُ الحقيقيّ. */
const lineText = heroLineText;

/* ══ المعرض ════════════════════════════════════════════════════════ */

/**
 * ضبطُ المعرض المحفوظُ في المتصفّح.
 *
 * **وله رقمُ صيغة، وهذا ليس احتياطًا نظريًّا:** كانت إزاحةُ السطر تُحفَظ بالبكسل
 * (‏‎-35) ثمّ صارت وحدتُها `em`، فقرأ المتصفّحُ الرقمَ القديم بالوحدة الجديدة
 * (‏‎-35em ≈ ‎-4375px) فانفجر التخطيطُ أمام المالك. فأيُّ تبدّلٍ في معنى الأرقام
 * يرفع `SAVE_V`، وما خالفه يُطرح ويُعاد إلى المُقَرّ.
 */
/* ورُفع مرّتين في ٢٠٢٦-٠٩-١٢ مع تبدّلِ شكل المحفوظ: القديمُ يُطرح، إذ قراءتُه
   بالشكل الجديد تضع المدَّ في غير موضعه. */
const SAVE_V = 4;
const SAVE_KEY = "adeeb-hero-tweak";

type Saved = { v?: number; tw?: Tweak; lines?: LineTweak[] };

function readSaved(): Saved | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Saved;
    return v.v === SAVE_V ? v : null;
  } catch {
    return null;
  }
}

const WIDTHS = [
  { value: "375", label: "٣٧٥" },
  { value: "900", label: "٩٠٠" },
  { value: "1280", label: "١٢٨٠" },
];

export default function HeroLab() {
  const [w, setW] = useState("1280");
  const [s, setS] = useState<Standing>("guest");
  /* **الضبطُ يبقى بعد إعادة التحميل** (٢٠٢٦-٠٩-٠٧): ضاع ضبطُ المالك مرّةً حين
     أُعيد تحميلُ الصفحة. والقراءةُ **في مُهيّئ الحالة لا في أثر**: ضبطُ الحالة
     داخل أثرٍ يجرّ رسمةً تابعة (وقاعدةُ ESLint تردّه)، والفرقُ بين الخادم
     والمتصفّح يُتَّقى بألّا يُرسَم المعرضُ قبل الترطيب (`hydrated` أدناه). */
  /* **والمحفوظُ يُدمَج فوق الافتراض لا يحلّ محلّه:** ضبطٌ محفوظٌ من نسخةٍ أقدم
     تنقصه المفاتيحُ الجديدة، فيصير `undefined` رقمًا في حسابٍ ويخرج `NaN`
     (وقع فعلًا يومَ أُضيف التفاعل). */
  const [tw, setTw] = useState<Tweak>(() => ({ ...DEF, ...(readSaved()?.tw ?? {}) }));
  /* **ما يُعرَض هو ما يُكتَب فيه** (درسُ ٢٠٢٦-٠٩-١٢): يومَ عُرضت جملتان كانت
     الثانيةُ تُرسَم من ثابتها والمزالجُ تكتب في حالة الأولى، فمن حرّك مزلاجًا
     والثانيةُ معروضةٌ رأى **الأولى تتبدّل**. فمصدرُ العرض ومصدرُ الكتابة واحدٌ
     أبدًا، وهو `lines` هنا. */
  const [lines, setLines] = useState<LineTweak[]>(() =>
    HEAD.lines.map((l, n) => ({ ...l, ...(readSaved()?.lines?.[n] ?? {}) })),
  );

  /** تعديلُ سطرٍ واحد. */
  const patch = (n: number, f: (l: LineTweak) => LineTweak) =>
    setLines((p) => p.map((l, j) => (j === n ? f(l) : l)));
  /** أرُطِّبت الصفحةُ بعد؟ لقطةُ الخادم `false` فيُرسَم الإطارُ فارغًا ثمّ يُملأ. */
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [copied, setCopied] = useState(false);
  const [sample, setSample] = useState(0);
  const frame = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ v: SAVE_V, tw, lines }));
    } catch {}
  }, [tw, lines]);

  /* السحبُ يُحوَّل نسبةً من كتلة الكلام للريشة، وبكسلًا صريحًا للسطر. */
  const onDrag = (k: "quill" | number, dx: number, dy: number) => {
    if (k === "quill") {
      /* السحبُ يُحوَّل **بمقاس الحبر** لا بعرض العمود: الوحدةُ em كي تبقى الكتلة
         واحدةً مهما كبُرت أو صغُرت. */
      const word = frame.current?.querySelector(".hro-word") as HTMLElement | null;
      const em = word ? parseFloat(getComputedStyle(word).fontSize) : 16;
      setTw((p) => ({
        ...p,
        /* السحبُ يمينًا يقرّبها من الحافّة اليمنى فينقص `right` — ولذلك الإشارةُ مقلوبة. */
        qx: +(p.qx - dx / em).toFixed(2),
        qy: +(p.qy + dy / em).toFixed(2),
      }));
      return;
    }
    const word = frame.current?.querySelector(".hro-word") as HTMLElement | null;
    const em = word ? parseFloat(getComputedStyle(word).fontSize) : 16;
    patch(k, (l) => ({ ...l, x: +(l.x + dx / em).toFixed(3), y: +(l.y + dy / em).toFixed(3) }));
  };

  const setKash = (n: number, slot: number, v: number) =>
    patch(n, (l) => ({ ...l, kash: l.kash.map((k, j) => (j === slot ? v : k)) }));

  const css = [
    `.hro { --hro-k: ${tw.k}; }  /* تفاعل: ${tw.motion} ×${tw.power} */`,
    `.hro-quill { right: ${tw.qx}em; top: ${tw.qy}em; width: ${tw.qw}em; transform: rotate(${tw.qrot}deg); }`,
    ...lines.map(
      (l, n) =>
        `.hro-title span:nth-child(${n + 1}) { transform: translate(${l.x}em, ${l.y}em); z-index: ${l.over ? 6 : 2}; }  /* ${lineText(HEAD.parts[n], l.kash)} */`,
    ),
  ].join("\n");

  return (
    <main className="py-16">
      <div className="mx-auto max-w-6xl px-6">
        <p className="font-latin text-xs font-bold tracking-[0.22em] text-secondary">Landing, Hero</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">
          صدرُ الهبوط، تحريكٌ حيّ
        </h1>
        <p className="mt-3 max-w-3xl leading-relaxed text-content-muted">
          اسحب <b>الريشة</b> أو <b>أيَّ سطرٍ</b> بالفأرة، ومُدَّ كلَّ سطرٍ من مزالجه، واختر أيَّ
          السطور يعلو الريشة. والقيمُ تُطبَع أسفلَ الصفحة جاهزةً لأثبّتها في الورقة.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-content-muted">العرض</span>
            <Segmented items={WIDTHS} value={w} onValueChange={setW} aria-label="عرض الإطار" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-content-muted">منزلة الزائر</span>
            <Segmented
              items={STANDINGS}
              value={s}
              onValueChange={(v) => setS(v as Standing)}
              aria-label="منزلة الزائر"
            />
          </div>
        </div>

        {/* لوحُ الريشة */}
        <div className="mt-4 flex flex-wrap items-center gap-5 rounded border border-line bg-surface/70 p-4">
          <b className="text-sm text-content">الكتلة</b>
          <label className="flex items-center gap-2 text-sm text-content-muted">
            التكبير
            <input
              type="range"
              min={0.8}
              max={2.4}
              step={0.05}
              value={tw.k}
              onChange={(e) => setTw({ ...tw, k: +e.target.value })}
            />
            <span className="font-latin" dir="ltr">
              ×{tw.k}
            </span>
          </label>
          <b className="text-sm text-content">العيّنة</b>
          <Segmented
            items={SAMPLES.map((sm, n) => ({ value: String(n), label: sm.k }))}
            value={String(sample)}
            onValueChange={(v) => {
              const n = +v;
              setSample(n);
              /* اختيارُ عيّنةٍ يُنزل ضبطَها، ثمّ تبقى المزالجُ تصقله */
              setLines(SAMPLES[n].lines);
            }}
            aria-label="عيّنة الحروف"
          />
          <b className="text-sm text-content">الريشة</b>
          <Segmented
            items={[
              { value: "off", label: "ساكنة" },
              { value: "tilt", label: "تميل" },
              { value: "aim", label: "تتوجّه" },
            ]}
            value={tw.motion}
            onValueChange={(v) => setTw({ ...tw, motion: v as HeroMotion })}
            aria-label="تفاعل الريشة"
          />
          <label className="flex items-center gap-2 text-sm text-content-muted">
            شدّة
            <input
              type="range"
              min={0.2}
              max={3}
              step={0.1}
              value={tw.power}
              onChange={(e) => setTw({ ...tw, power: +e.target.value })}
            />
            <span className="font-latin" dir="ltr">
              ×{tw.power}
            </span>
          </label>
          <label className="flex items-center gap-2 text-sm text-content-muted">
            الحجم
            <input
              type="range"
              min={0.6}
              max={5}
              step={0.05}
              value={tw.qw}
              onChange={(e) => setTw({ ...tw, qw: +e.target.value })}
            />
            <span className="font-latin" dir="ltr">
              {tw.qw}em
            </span>
          </label>
          <label className="flex items-center gap-2 text-sm text-content-muted">
            الدوران
            <input
              type="range"
              min={-60}
              max={60}
              step={1}
              value={tw.qrot}
              onChange={(e) => setTw({ ...tw, qrot: +e.target.value })}
            />
            <span className="font-latin" dir="ltr">
              {tw.qrot}°
            </span>
          </label>
          <button
            type="button"
            className="abtn abtn-ghost abtn-sm"
            onClick={() => {
              setTw(DEF);
              setLines(DEF_LINES);
            }}
          >
            إعادة الضبط
          </button>
        </div>

        {/* لوحُ كلّ سطر */}
        <div className="mt-3 grid gap-3">
          {lines.map((l, n) => (
            <div
              key={n}
              className="flex flex-wrap items-center gap-5 rounded border border-line bg-surface/70 p-4"
            >
              <b className="text-sm text-content">{HEAD.names[n]}</b>
              {l.kash.map((k, slot) => (
                <label key={slot} className="flex items-center gap-2 text-sm text-content-muted">
                  {`مدّ ${slot + 1}`}
                  <input
                    type="range"
                    min={0}
                    max={40}
                    step={1}
                    value={k}
                    onChange={(e) => setKash(n, slot, +e.target.value)}
                  />
                  <span className="font-latin" dir="ltr">
                    {k}
                  </span>
                </label>
              ))}
              {/* إزاحةُ السطر بمزلاجٍ لا بالسحب وحدَه: المطلوبُ إزاحةٌ مضبوطةٌ
                  بالرقم («محمد» ثمّ «المطر» مزاحةً)، والسحبُ يبقى للتقريب. */}
              <label className="flex items-center gap-2 text-sm text-content-muted">
                أفقيّ
                <input
                  type="range"
                  min={-1.5}
                  max={1.5}
                  step={0.005}
                  value={l.x}
                  onChange={(e) => patch(n, (x) => ({ ...x, x: +e.target.value }))}
                />
                <span className="font-latin" dir="ltr">
                  {l.x}
                </span>
              </label>
              <label className="flex items-center gap-2 text-sm text-content-muted">
                رأسيّ
                <input
                  type="range"
                  min={-1}
                  max={1}
                  step={0.005}
                  value={l.y}
                  onChange={(e) => patch(n, (y) => ({ ...y, y: +e.target.value }))}
                />
                <span className="font-latin" dir="ltr">
                  {l.y}
                </span>
              </label>
              <button
                type="button"
                className="abtn abtn-ghost abtn-sm"
                onClick={() => patch(n, (x) => ({ ...x, over: !x.over }))}
              >
                {l.over ? "فوق الريشة" : "تحت الريشة"}
              </button>
            </div>
          ))}
        </div>

        <div ref={frame} className="aauth-demo mt-6" style={{ width: "100%", maxWidth: Number(w) }}>
          {hydrated ? (
            <Hero slides={SLIDES} standing={s} lab={{ tw, lines, cls: SAMPLES[sample].cls, onDrag }} />
          ) : null}
        </div>

        {/* **المعتمَدُ إلى جانبِ المكبَّر** (٢٠٢٦-٠٩-٠٧): قال المالك «قارِن الصورةَ
            الأولى بهذه»، فالمقارنةُ تُعرَض ولا تُوصَف. هذا الإطارُ مثبَّتٌ على
            ×1 (‏الحبرُ ‎64px والريشةُ ‎166px، وهو ما أقرّه)، وذاك يتبع المزلاج. */}
        <p className="mt-8 text-sm text-content-muted">
          وهذا هو المعتمَدُ الذي أقررتَه (‏×1) للمقارنة:
        </p>
        <div className="aauth-demo mt-2" style={{ width: "100%", maxWidth: Number(w) }}>
          {hydrated ? <Hero slides={SLIDES} standing={s} lab={{ tw: { ...tw, k: 1 }, lines, cls: SAMPLES[sample].cls }} /> : null}
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            className="abtn abtn-primary abtn-sm"
            onClick={() => {
              navigator.clipboard?.writeText(css).then(
                () => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                },
                () => {},
              );
            }}
          >
            {copied ? "نُسخت" : "انسخ القيم"}
          </button>
          <span className="text-sm text-content-muted">ثمّ ألصقها لي لأثبّتها في الورقة</span>
        </div>

        <pre
          dir="ltr"
          className="mt-2 overflow-x-auto rounded border border-line bg-surface-2 p-4 font-latin text-xs leading-relaxed text-content"
        >
          {css}
        </pre>
      </div>

      {/* ══ العمودُ الضيّق ═════════════════════════════════════════════
          اختار المالكُ «الحدَّ المائل» من ثلاثةٍ عُرضت (٢٠٢٦-٠٩-١٢)، فثُبّت في
          المكتبة وأُعدم الآخران. ويبقى هنا **هاتفٌ بمقاسه الحقيقيّ**: مبدّلُ
          العرض أعلاه يعيش في صفحةٍ عريضة فيستعير `100dvh` طولَ نافذة الحاسوب،
          وهذا الإطارُ يحبسه في 760 فيصدق على العين. */}
      <section className="mt-16 border-t border-line pt-10">
        <div className="mx-auto max-w-6xl px-6">
          <p className="font-latin text-xs font-bold tracking-[0.22em] text-secondary">Hero, Mobile</p>
          <h2 className="mt-1 font-display text-2xl font-black text-content">
            الجوّال: الحدُّ يُدار ولا يسقط
          </h2>
          <p className="mt-2 max-w-3xl leading-relaxed text-content-muted">
            هاتفٌ بمقاسه الحقيقيّ (‏375 × 760): القطعُ المائل صار حافّةَ الصورة العليا،
            وعليه الشعرةُ البيضاءُ نفسُها.
          </p>
          <div className="hro-demo mt-6" style={{ width: 375, height: 760 }}>
            {hydrated ? <Hero slides={SLIDES} standing={s} lab={{ tw, lines, cls: SAMPLES[sample].cls }} /> : null}
          </div>
        </div>
      </section>
    </main>
  );
}
