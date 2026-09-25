"use client";

import {
  ArrowFatDown,
  ArrowFatLeft,
  ArrowFatRight,
  ArrowFatUp,
  Barricade,
  Bird,
  Car,
  DeviceMobile,
  HandSwipeRight,
  Hourglass,
  Lightbulb,
  Lightning,
  Magnet,
  Moon,
  Play,
  Shield,
  Signpost,
  TextAa,
  TrafficCone,
} from "@phosphor-icons/react";
import { Cup, PLAY } from "./bits";

/**
 * **تبويبُ «كيف تُلعب؟»** (قرارُ المالك ٢٠٢٦-٠٩-٢٥: «برضو طريقة اللعب مُهم»). شاشةُ البدء في اللعبة
 * تقول الحركةَ في سطر، وهنا ما لا يتّسع له سطر: العوائقُ وما يعبرها، والكلماتُ الأربع وخصائصها،
 * والأكواب.
 *
 * **والكلماتُ بقرار المالك (٢٠٢٦-٠٩-٢٥):** وطن، رؤية، كرم (كانت تلاحم)، هون (كانت ثبات، من «على
 * هونك»). وهي في نواة اللعبة (`WORDS`)، فتبديلُها يبدّل البصمة.
 *
 * **والأرقامُ من اللعبة نفسِها لا من الذاكرة** (`game.html`، قسمُ «الخصائصُ والمصّاص»): كلُّ خاصيّةٍ
 * ١٥ ثانية، والتحليقُ يُسرع ٢٥٪، والتمهّلُ يُبطئ ٢٨٪، والمغناطيسُ يجذب من المسارات الثلاثة، والكلماتُ
 * تتوالى بترتيبها ثمّ تعود. فإن تغيّر شيءٌ منها في اللعبة وجب تغييرُه هنا.
 */

const MOVES = [
  { ic: [<ArrowFatRight key="r" />, <ArrowFatLeft key="l" />], b: "يمينًا ويسارًا", s: "تبدّل المسار" },
  { ic: [<ArrowFatUp key="u" />], b: "للأعلى", s: "تقفز" },
  { ic: [<ArrowFatDown key="d" />], b: "للأسفل", s: "تنزلق" },
];

const HURDLES = [
  { ic: <Barricade />, b: "الحاجزُ الخرسانيّ", s: "اقفز فوقه." },
  { ic: <Signpost />, b: "اللافتة", s: "انزلق تحتها." },
  { ic: <Car />, b: "السيّارةُ القادمة", s: "غيّر مسارك قبل أن تصلك." },
];

const WORDS = [
  { w: "وطن", ic: <Shield />, p: "درع", s: "يصدّ عنك صدمةً واحدة." },
  { w: "رؤية", ic: <Bird />, p: "تحليق", s: "تطير فوق كلّ شيء وتسرع 25٪." },
  { w: "كرم", ic: <Magnet />, p: "مغناطيس", s: "يجود عليك بالحروف والأكواب من المسارات الثلاثة." },
  { w: "هون", ic: <Hourglass />, p: "تمهّل", s: "يبطئ جريك 28٪ فتمشي على هونك." },
];

const TIPS = [
  { ic: <Lightning />, s: "السرعةُ تزيد كلّما طال جريك، فانظر إلى الطريق أمامك." },
  { ic: <Moon />, s: "في الليل ترى أضواءَ السيّارة القادمة من بعيد، فاستعدّ لها." },
  { ic: <DeviceMobile />, s: "أمسك الجوّالَ عموديًّا، فاللعبةُ صُمّمت للّمس." },
];

export function HowTo() {
  return (
    <>
      <section className="drba-hero">
        <h1>كيف تُلعب؟</h1>
        <p>خُضَيران يركض والشرطيُّ خلفه. اسحب بإصبعك لتنجو، واجمع ما في الطريق.</p>
      </section>

      <div className="drba-body">
        <div className="drba-card">
          <h2>
            <HandSwipeRight />
            الحركة: اسحب على الشاشة
          </h2>
          <ul className="drba-moves">
            {MOVES.map((m) => (
              <li key={m.b} className="drba-move">
                <span className="drba-move-ic" aria-hidden="true">{m.ic}</span>
                <b>{m.b}</b>
                <span>{m.s}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="drba-card">
          <h2>
            <TrafficCone />
            العوائق
          </h2>
          <ul className="drba-items">
            {HURDLES.map((h) => (
              <li key={h.b} className="drba-item">
                <span className="drba-item-ic" aria-hidden="true">{h.ic}</span>
                <span>
                  <b>{h.b}</b>
                  <span>{h.s}</span>
                </span>
              </li>
            ))}
          </ul>
          <p>وكلُّ صدمةٍ تنهي الجولة، إلّا والدرعُ عليك.</p>
        </div>

        <div className="drba-card">
          <h2>
            <TextAa />
            الكلمات وخصائصها
          </h2>
          <p>
            في الطريق حروف، وكلُّ حرفٍ منها هو ما تحتاجه كلمتُك. أكمل الكلمةَ تنلْ خاصيّتَها 15 ثانية،
            والكلماتُ تتوالى بهذا الترتيب ثمّ تعود:
          </p>
          <ol className="drba-words">
            {WORDS.map((x) => (
              <li key={x.w} className="drba-word">
                <span className="drba-word-w">{x.w}</span>
                <span className="drba-word-p">
                  <b>
                    {x.ic}
                    {x.p}
                  </b>
                  <span>{x.s}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="drba-card">
          <h2>
            <Cup />
            أكوابُ oos
          </h2>
          <p>
            نادرةٌ في الطريق، وكلُّ كوبٍ تجمعه يُضاف إلى مجموعك في لوحة المسابقة. والمغناطيسُ يجذب إليك
            ما في المسارين الآخرين، فهو أنفعُ الخصائص لمن يطلب الجائزة.
          </p>
        </div>

        <div className="drba-card">
          <h2>
            <Lightbulb />
            نصائح
          </h2>
          <ul className="drba-items">
            {TIPS.map((t) => (
              <li key={t.s} className="drba-item">
                <span className="drba-item-ic" aria-hidden="true">{t.ic}</span>
                <span>{t.s}</span>
              </li>
            ))}
          </ul>
        </div>

        <a className="drba-btn" data-kind="suit" data-wide="" href={PLAY}>
          <Play />
          العب الآن
        </a>
      </div>
    </>
  );
}
