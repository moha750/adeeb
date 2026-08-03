"use client";

import { useRef, useState } from "react";
import { Button, Container, Cursor, Input, Segmented, Switch, type CursorVariant } from "@adeeb/design-system";

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-6">
      <h2 className="mb-6 font-display text-2xl font-black text-content">{title}</h2>
      {children}
    </section>
  );
}

function Lab({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 font-latin text-xs font-bold uppercase tracking-[0.16em] text-content-muted">{children}</p>
  );
}

/**
 * مسرحُ تجربة: كلّ توجّهٍ يعيش في مسرحه — المؤشّرُ محصورٌ فيه (`scopeRef`)، فتُقارَن
 * الثمانيةُ في صفحةٍ واحدة بلا أن يتنازعوا على المؤشّر. والمحتوى واحدٌ في الجميع
 * (روابط · أزرارٌ منغَّمة · حقلٌ يُكتب فيه · معطَّل · بلاطاتٌ عريضة) فالفرقُ في
 * المؤشّر لا في المسرح.
 */
function Stage({ variant, note, off }: { variant: CursorVariant; note: string; off?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div ref={ref} className="relative overflow-hidden rounded border border-line bg-surface p-8">
      {/* حين تعمّ التجربةُ الصفحةَ ينسحب مؤشّرُ المسرح — وإلّا رُسم مؤشّران فوق بعضهما */}
      {off ? null : <Cursor variant={variant} scopeRef={ref} />}
      <p className="mb-6 text-sm text-content-muted">{note}</p>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" size="sm">فعلٌ رئيس</Button>
        <Button variant="danger" size="sm">حذف</Button>
        <Button variant="success" size="sm">اعتماد</Button>
        <Button variant="ghost" size="sm" disabled>غير متاح</Button>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-6">
        <a href="#" className="font-bold text-primary underline-offset-4 hover:underline">رابطٌ في نصّ</a>
        <Input className="w-64" placeholder="اكتب هنا — تعود شعرةُ النظام" aria-label="حقل تجربة" />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div
          className="flex h-24 items-center justify-center rounded bg-surface-2 font-display font-bold text-content"
          role="button"
          tabIndex={0}
        >
          غلافُ كتاب
        </div>
        <div
          className="flex h-24 items-center justify-center rounded-full bg-surface-2 font-display font-bold text-content"
          role="button"
          tabIndex={0}
        >
          كبسولةٌ دائريّة
        </div>
        {/* `data-cursor` مِقبضٌ يُدخل عنصرًا غير تفاعليٍّ في حساب المؤشّر بلا أن يصير زرًّا */}
        <div
          className="flex h-24 items-center justify-center rounded bg-surface-2 font-display font-bold text-content"
          data-cursor=""
        >
          بلاطةٌ بلا دور
        </div>
      </div>
    </div>
  );
}

const VARIANTS: { value: CursorVariant; label: string }[] = [
  { value: "tone", label: "قارئ النغمة" },
  { value: "morph", label: "الالتصاق" },
  { value: "brackets", label: "أقواس الالتقاط" },
  { value: "liquid", label: "القطرة اللزجة" },
  { value: "nibdrop", label: "الريشة في القطرة" },
  { value: "quill", label: "الريشة" },
  { value: "tilt", label: "الميل باليد" },
  { value: "trail", label: "أثر الحبر" },
  { value: "blot", label: "النشّاف" },
  { value: "dots", label: "نقطة الإعجام" },
  { value: "kashida", label: "الكشيدة" },
  { value: "invert", label: "القرص القالب" },
  { value: "magnet", label: "الانجذاب" },
  { value: "ruler", label: "مسطرة القراءة" },
];

export default function CursorPage() {
  const [pick, setPick] = useState<CursorVariant>("tone");
  const [live, setLive] = useState(false);

  return (
    <main className="py-16">
      {/* التجربةُ على الصفحة كلّها — بلا `scopeRef` فيعمّ الوثيقة */}
      {live ? <Cursor variant={pick} /> : null}

      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">
          Design System · Cursor
        </p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">مؤشّر أديب</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          <strong>أسرتان وطليقون:</strong> <strong>قارئ النغمة</strong> (النقطة والهالة) و<strong>الريشة</strong>
          (السنّ والحبر) — ولكلٍّ ثلاثةُ أبناء؛ ثمّ <strong>خمسةٌ من خارجهما</strong> لا تُشتقّ من نقطةٍ ولا من
          سنّ. والمحرّكُ واحدٌ تحتها كلِّها: إحداثيّتان للنقطة ومتأخّرتان للهالة، وتزيد بحسب التوجّه سرعةً متجهة
          أو مستطيلَ الهدف أو مسحًا لما حوله — <strong>ولا يُحسَب إلّا ما يطلبه المعروض</strong>. والنغمةُ تُقرأ
          من <code className="font-latin">--shadow-tone</code> الذي يعلنه العنصر أصلًا (ق٥) في الجميع، عدا
          «القرص القالب» وحده — وسببُه مكتوبٌ عنده.
        </p>
        <p className="mt-2 max-w-2xl text-sm text-content-muted">
          أُعدمت الثلاثةُ التي لم تُقرّ (السهم المعكوس · المؤشّر يتكلّم · كشّاف النقش) — لم يبقَ منها سطرٌ في
          المكتبة.
        </p>

        <div className="mt-12 space-y-14">
          <p className="font-display text-xl font-black text-primary">أسرةُ قارئ النغمة</p>

          <Sec title="١) قارئ النغمة — الأساس المُقَرّ">
            <Lab>tone · نقطةٌ تلتصق وهالةٌ تلحق — واللونُ لونُ الهدف</Lab>
            <Stage
              off={live}
              variant="tone"
              note="كما أقررتَه: الهالةُ تحمرّ فوق «حذف» وتخضرّ فوق «اعتماد» من نغمة الزرّ نفسِه. الثلاثةُ بعده تبني عليه ولا تُلغيه."
            />
          </Sec>

          <Sec title="٢) الالتصاق بالهدف">
            <Lab>morph · الهالةُ تترك دائريّتَها وتلبس مقاسَ الهدف وزاويتَه</Lab>
            <Stage
              off={live}
              variant="morph"
              note="مرّ على الأزرار ثمّ على البلاطات: الهالةُ تنتقل إلى العنصر وتأخذ مقاسَه وزاويتَه — والزاويةُ متراكزةٌ معه (ق٢) لا موازيةٌ بالصدفة. الكبسولةُ الدائريّة تكشفه أوضح ما يكون. لا يعود المؤشّرُ يشير إلى الهدف، بل يصير الهدفَ."
            />
          </Sec>

          <Sec title="٣) أقواس الالتقاط">
            <Lab>brackets · أربعةُ أركانٍ تنفرج على الهدف — التقاطٌ لا لبس</Lab>
            <Stage
              off={live}
              variant="brackets"
              note="الفكرةُ نفسُها بلغةٍ أخفّ: أركانٌ أربعةٌ تُطبق على الهدف بدل سطحٍ يغطّيه. أهدأ من الالتصاق (لا يضيف طبقةَ لونٍ فوق الزرّ) وأصرحُ من الهالة في قول «هذا بالضبط ما ستنقره»."
            />
          </Sec>

          <Sec title="٤) القطرة اللزجة">
            <Lab>liquid · تتمطّط باتّجاه الحركة وتنضغط عموديًّا عليه — كالحبر</Lab>
            <Stage
              off={live}
              variant="liquid"
              note="حرّك الفأرة بسرعةٍ ثمّ اسكن: النقطةُ والهالةُ تتمطّطان في اتّجاه الاندفاع وتعودان دائرتَين عند السكون — حجمُها ثابتٌ كالسائل، تكسب طولًا بقدر ما تفقد عرضًا. هذه هي التي تصل الأسرتَين: سلوكُ النغمة بمادّةِ الحبر."
            />
          </Sec>

          <Sec title="٤ب) الريشة في القطرة">
            <Lab>nibdrop · القطرةُ بعينها · ريشةٌ مكانَ نقطتها · تميل وتترك أثرًا</Lab>
            <Stage
              off={live}
              variant="nibdrop"
              note="القطرةُ اللزجة كما هي بلا مساس — الهالةُ تلحق بتأخّرها وتتمطّط باندفاعك وتتّسع عند الهدف بنسبتها ومقاسها — والريشةُ مكانَ نقطتها؛ ثمّ تميل الريشةُ عكسَ اندفاع يدك (ميلُ التوجّه السادس نفسُه) ويخرج من سنّها أثرُ حبرٍ يجفّ (أثرُ السابع نفسُه). ثلاثةُ أجزاءٍ مُلحَقةٌ بقواعد أصولها لا منسوخةٌ عنها، فلو عُدِّل أصلٌ يومًا تبعه هذا. (النقرُ لا يُسقط نقطةَ حبرٍ هنا — كلمةٌ واحدة إن أردتَها.)"
            />
          </Sec>

          <p className="font-display text-xl font-black text-primary">أسرةُ الريشة</p>

          <Sec title="٥) الريشة والحبر — الأساس المُقَرّ">
            <Lab>quill · طرفُ السنّ هو نقطةُ الإصابة — واضغط لتقع نقطةُ حبر</Lab>
            <Stage
              off={live}
              variant="quill"
              note="كما أقررتَه: سنُّ قلمٍ يميل فوق ما يُنقر، وضغطةٌ تُسقط نقطةَ حبرٍ بنغمة ما تحتها."
            />
          </Sec>

          <Sec title="٦) القلم يميل باليد">
            <Lab>tilt · الميلُ من اتّجاه حركتك وسرعتِها — لا من حالة العنصر</Lab>
            <Stage
              off={live}
              variant="tilt"
              note="حرّكه يمينًا ويسارًا: القلمُ يميل عكسَ اندفاع اليد ويزداد ضغطًا مع السرعة، والميلُ نابضٌ مُخمَّد فيرتدّ إلى وقفته متمايلًا كجسمٍ له ثِقَل لا كرقمٍ يتضاءل. ثمّ **قِف**: لا يتجمّد — تأخذه الريحُ بعد لحظةٍ فيتمايل هبّاتٍ تشتدّ وتخفت. الفرقُ عن الأساس أنّ الحركةَ مستمرّةٌ لا حالتان — القلمُ في يدك لا على الشاشة."
            />
          </Sec>

          <Sec title="٧) أثر الحبر يجفّ">
            <Lab>trail · خطٌّ يُكتب خلفك ثمّ ينشف — عرضُه يتناقص إلى الذيل</Lab>
            <Stage
              off={live}
              variant="trail"
              note="ارسم بالفأرة دائرةً أو اسمًا: يخرج من السنّ خطُّ حبرٍ عريضٌ عند الرأس، ينحف ويشفّ حتى يجفّ في ربع ثانية. أقوى ما في الأسرة معنًى — الموقعُ كلُّه يصير ورقةً تُكتب — وأثقلُها إن طال الأثر، ولذلك قُصّر عمدًا."
            />
          </Sec>

          <Sec title="٨) بقعة النشّاف">
            <Lab>blot · الضغطةُ بقعةٌ عضويّةٌ لا قرصٌ منتظم — تتشرّب ثمّ تجفّ</Lab>
            <Stage
              off={live}
              variant="blot"
              note="اضغط في أيّ موضع: بقعةٌ بزوايا غير متساوية تُولَد عشوائيّةً لكلّ ضغطة (فلا تتكرّر صورةٌ واحدة)، وحولها رشقاتٌ صغيرة بتأخّرٍ يسير. بديلُ نقطةِ الحبر النظيفة في الأساس — حبرٌ حقيقيٌّ لا دائرةٌ مرسومة."
            />
          </Sec>

          <p className="font-display text-xl font-black text-primary">من خارج الأسرتين</p>

          <Sec title="٩) نقطة الإعجام">
            <Lab>dots · واحدةٌ في السكون، ثلاثٌ على الهدف — باءٌ تصير ثاءً</Lab>
            <Stage
              off={live}
              variant="dots"
              note="الحرفُ العربيّ يفترق عن أخيه بالنقط لا بالرسم — فالمؤشّرُ نقطةُ إعجامٍ واحدة، تنقسم ثلاثًا حين تقع على هدف. لا شكلَ يتبدّل بل عدد؛ وهو أخفّ ما بُني هنا حبرًا، وأقربُه إلى الخطّ العربيّ لا إلى واجهات الغرب."
            />
          </Sec>

          <Sec title="١٠) الكشيدة">
            <Lab>kashida · شعرةٌ تنزلق، فإذا بلغت هدفًا امتدّت بعرضه تحته</Lab>
            <Stage
              off={live}
              variant="kashida"
              note="مدُّ الحرف في الخطّ العربيّ. تسطيرٌ لا إحاطة: لا تغطّي الزرَّ ولا تلوّنه ولا تُطبق عليه، وتقول موضعَه بأدنى حبرٍ ممكن — وتقرأ عرضَه من الهدف نفسِه. النقيضُ الهادئ لـ«الالتصاق»."
            />
          </Sec>

          <Sec title="١١) القرص القالب">
            <Lab>invert · بلا لونٍ له — يقلب ما تحته مزجًا لا طلاءً</Lab>
            <Stage
              off={live}
              variant="invert"
              note="مرّره على النصّ والأزرار: القرصُ لا يملك لونًا، بل يقلب ألوانَ ما تحته. أجرؤُ ما في الصفحة وأقلُّها زخرفة — وهو **الوحيد الذي لا يقرأ النغمة**، لأنّه بلا لونٍ يقرؤها به: يكتسب لونَه من الصفحة لا من الرمز. فإن أعجبك فاعلم أنّك تختار مؤشّرًا خارج نظام النغمات."
            />
          </Sec>

          <Sec title="١٢) الانجذاب">
            <Lab>magnet · يُشدّ نحو أقرب هدفٍ قبل أن تبلغه</Lab>
            <Stage
              off={live}
              variant="magnet"
              note="اقترب من زرٍّ ولا تبلغه: المؤشّرُ يُشدّ نحوه بقوّةٍ تشتدّ كلّما قرُبت، ثمّ يفلت حين تبتعد. الأهدافُ تصير مغناطيسات، فتُحسّ الواجهةَ تساعدك لا تنتظرك. والنقرةُ تقع حيث الفأرةُ حقًّا لا حيث رُسم المؤشّر — الجذبُ بصريٌّ محضٌ لا يخطف هدفًا لم تقصده. ولا سطرَ تنسيقٍ جديد فيه: نقطةُ الأساس وهالتُه بعينهما، والفرقُ كلُّه في أين يكتب المحرّكُ إحداثيّتَهما."
            />
          </Sec>

          <Sec title="١٣) مسطرة القراءة">
            <Lab>ruler · شريطٌ يعبر الصفحة على سطرك — أداةُ قارئ لا زينة</Lab>
            <Stage
              off={live}
              variant="ruler"
              note="الشريطُ يلزم سطرَك فيعزله عمّا فوقه وتحته — ما يفعله القارئُ بإصبعه أو بورقةٍ تحت السطر. الوحيدُ هنا الذي **يخدم القراءة** لا يزيّن التصفّح، ومكانُه المكتبةُ والأخبارُ لا الموقعُ كلُّه. يخفت فوق الأهداف فلا ينازع الزرَّ سطحَه."
            />
          </Sec>

          <Sec title="التجربة على الصفحة كلّها">
            <Lab>اختر توجّهًا ثمّ شغّله — يعمّ الوثيقة فتحكم عليه في سياقٍ حقيقيّ</Lab>
            <div className="rounded border border-line bg-surface p-6">
              <Segmented
                items={VARIANTS.map((v) => ({ value: v.value, label: v.label }))}
                value={pick}
                onValueChange={(v) => setPick(v as CursorVariant)}
                aria-label="توجّه المؤشّر"
              />
              <div className="mt-5">
                <Switch
                  row
                  label="طبّقه على الصفحة كلّها"
                  description="تنسحب مؤشّراتُ المسارح ما دام يعمل — أطفئه لتعود كلُّ عيّنةٍ إلى مسرحها"
                  checked={live}
                  onChange={(e) => setLive(e.currentTarget.checked)}
                />
              </div>
            </div>
          </Sec>

          <Sec title="ما يبقى بعد الاختيار">
            <Lab>الحدود المكتوبة في المكوّن — لا في المراجعة</Lab>
            <div className="rounded border border-line bg-surface p-6">
              <ul className="list-disc space-y-2 pe-5 text-content-muted">
                <li>
                  <strong className="text-content">اللوحة تُستثنى:</strong>{" "}
                  <code className="font-latin">/dashboard</code> أداةُ عملٍ يوميّة، والمؤشّرُ المزخرف فيها ضريبةٌ لا
                  هويّة. الواجهةُ العامّة وحدها.
                </li>
                <li>
                  <strong className="text-content">الفأرةُ وحدها:</strong>{" "}
                  <code className="font-latin">pointer: fine</code> — على اللمس لا طبقةَ تُرسَم ولا مستمعَ يُركَّب.
                </li>
                <li>
                  <strong className="text-content">تقليلُ الحركة:</strong> يُلغي التأخّرَ والسرعةَ والحبرَ والأثر —
                  لا تُحسَب أصلًا، فيبقى الشكلُ وتذهب الحركة.
                </li>
                <li>
                  <strong className="text-content">الأداء:</strong> <code className="font-latin">translate</code> داخل{" "}
                  <code className="font-latin">requestAnimationFrame</code>؛ و
                  <code className="font-latin">getComputedStyle</code> عند تبدّل الهدف لا عند كلّ حركة؛ و
                  <code className="font-latin">getBoundingClientRect</code> عند تبدّله وعند التمرير فقط (قياسُه كلَّ
                  إطارٍ يُجبر المتصفّح على إعادة تخطيطٍ ستّين مرّةً في الثانية).
                </li>
                <li>
                  <strong className="text-content">مصدرٌ واحد:</strong> المكوّن في المكتبة و
                  <code className="font-latin">.cur-*</code> في <code className="font-latin">components.css</code> —
                  والمرفوضُ يُعدَم بحذف كتلته وحدها، كما فُعل بالثلاثة.
                </li>
              </ul>
            </div>
          </Sec>
        </div>
      </Container>
    </main>
  );
}
