"use client";

import { ChatCircleText, EnvelopeSimple, Handshake, Lifebuoy, Megaphone, Storefront, Trophy } from "@phosphor-icons/react";
import { ArrowLeft, CaretDown, WhatsappLogo } from "@/app/_components/glyphs";
import { WA_NUMBER, waLink } from "./bits";
import type { TabKey } from "./tabs";

/**
 * **تبويبُ الدعم** (قرارُ المالك ٢٠٢٦-٠٩-٢٥: «أنا أرى إضافة تبويب للدعم»). كان اقتراحي أن يكون
 * قسمًا في «حسابي»، فقال إنّ من تواجهه مشكلةٌ يبحث عن كلمة «الدعم» ولا يخطر له «حسابي». وهو محقّ.
 *
 * **أسئلةٌ قبل المراسلة:** أكثرُ ما سيُسأل له جوابٌ ثابت، فيجده اللاعبُ في ثوانٍ بدل أن ينتظر ردًّا.
 * والأجوبةُ من سلوك اللعبة والخادم كما هو (`DARB-SYSTEM.md`).
 *
 * **والقنواتُ قنواتُ النادي** (اختيارُ المالك): نموذجُ «تواصل معنا» في الصفحة الرئيسة (تصل رسائلُه
 * لوحةَ التحكّم)، وواتساب النادي، وبريدُه.
 *
 * **ونموذجُ التواصل بتنقّلٍ كامل لا انتقالِ React** (بلاغُ المالك ٢٠٢٦-٠٩-٢٥: «يفتح موقع أدِيب ولا يفتح
 * النموذج»). قيس: الانتقالُ داخل التطبيق إلى `/#contact` يقف أعلى الصفحة (y=0)، لأنّ الهبوطَ يقرّر
 * قصّتَه وموضعَ القفز في سكربتٍ قبل الرسم لا يجري إلّا في تحميلٍ كامل (`_story/StoryOpening.tsx`).
 * والتحميلُ الكامل ينزل عند النموذج نفسِه.
 *
 * **وفي آخره دعوةُ أصحاب الأعمال إلى رعاية أدِيب** (طلبُ المالك في اليوم نفسِه). وما يُعِد به من
 * واقع رعاية oos لهذه النسخة (شعارٌ في اللوحة وشاشة البدء، وعلامةٌ في اللعبة، وجوائز باسم الراعي)،
 * بلا أرقامٍ عن الجمهور لا نملك قياسَها.
 */

/** بريدُ النادي للدعم، أكّده المالك (٢٠٢٦-٠٩-٢٥). */
export const SUPPORT_EMAIL = "adeab.kfu@gmail.com";
const MAIL = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("دعم دربك خضر")}`;
const WA_HELP = waLink("السلام عليكم، عندي استفسار عن لعبة «دربك خضر».");
const WA_SPONSOR = waLink("السلام عليكم، أرغب في رعاية نادي أدِيب وأودّ معرفة التفاصيل.");

const PERKS = [
  { ic: <Storefront />, b: "علامتُك داخل التجربة", s: "كوبُ oos في هذه النسخة يجمعه كلُّ لاعب. ولعلامتك مكانٌ مثله يراه اللاعبُ ويلعب به." },
  { ic: <Trophy />, b: "اسمُك على الصدارة والجوائز", s: "شعارُك في لوحة المتصدّرين وشاشة البدء، وجوائزُ الفائزين باسمك." },
  { ic: <Megaphone />, b: "حضورٌ في منشورات أدِيب", s: "نذكرك في إعلان المسابقة ونتائجها، وفي ما ننشره عنها." },
];

export function Help({ go }: { go: (t: TabKey) => void }) {
  const toMe = (
    <button type="button" className="drba-link" onClick={() => go("me")}>
      افتح «حسابي»
      <ArrowLeft />
    </button>
  );

  const QA: { q: string; a: React.ReactNode }[] = [
    {
      q: "لعبتُ ولم تظهر نتيجتي في اللوحة؟",
      a: (
        <p>
          ما لُعب قبل افتتاح المسابقة تجربةٌ لا تُحسب. وإن كانت الشبكةُ مقطوعةً عند بدء الجولة صارت تدريبًا لا
          يُحسب، وإن انقطعت عند نهايتها حُفظت في جهازك وأُرسلت حين تفتح اللعبةَ ثانيةً خلال ثلاث ساعات.
        </p>
      ),
    },
    {
      q: "فتحتُ اللعبةَ من إنستقرام، ثمّ من المتصفّح فلم أجد اسمي؟",
      a: (
        <>
          <p>
            كلُّ متصفّحٍ عندنا لاعبٌ مستقلّ، ومتصفّحُ إنستقرام غيرُ سفاري وكروم. احفظ تقدّمك بحسابك في أدِيب من
            المتصفّح الذي لعبتَ فيه، ثمّ ادخل بحسابك في الآخر تجد اسمَك ونتائجَك.
          </p>
          {toMe}
        </>
      ),
    },
    {
      q: "كيف أستلم الجائزة إن فزت؟",
      a: (
        <>
          <p>
            نعلن الفائزين بأسمائهم المستعارة بعد مراجعة النتائج، ويُثبت الفائزُ أنّ الاسمَ له بحسابه في أدِيب،
            ومن خلاله نتواصل معه، ثمّ يصله رصيدُه في محفظة oos. فلا جائزةَ لاسمٍ غيرِ محفوظٍ بحساب.
          </p>
          {toMe}
        </>
      ),
    },
    {
      q: "هل أحتاج حسابًا في أدِيب لأشارك؟",
      a: (
        <p>
          للّعب لا: تلعب باسمٍ مستعارٍ بلا حساب. أمّا الجائزة فلا تُستلَم إلّا بحساب، فاحفظ اسمَك به. والحسابُ لا
          يعطيك أفضليّةً في اللعب.
        </p>
      ),
    },
    {
      q: "كيف أغيّر اسمي المستعار؟",
      a: <p>من شاشة البدء في اللعبة: «تغيير» بجانب اسمك. ونتائجُك تبقى معك.</p>,
    },
    {
      q: "هل ألعب من الكمبيوتر؟",
      a: <p>اللعبةُ صُمّمت للّمس، فالعبها من الجوّال أو اللوحيّ، والجوّالُ بوضعه العموديّ.</p>,
    },
    {
      q: "اللعبةُ بطيئةٌ أو علّقت؟",
      a: (
        <p>
          حدّث الصفحة، وأغلق التطبيقاتِ المفتوحةَ خلفها. وإن ظهر لك «نزلت نسخةٌ جديدة» فحدّث الصفحةَ ليصلك آخرُ
          إصدار.
        </p>
      ),
    },
  ];

  return (
    <>
      <section className="drba-hero">
        <h1>الدعم</h1>
        <p>أجوبةُ أكثر ما يُسأل، ثمّ نحن هنا إن احتجتنا.</p>
      </section>

      <div className="drba-body">
        <div className="drba-qas">
          {QA.map((x) => (
            <details key={x.q} className="drba-qa">
              <summary>
                {x.q}
                <CaretDown />
              </summary>
              <div className="drba-qa-a">{x.a}</div>
            </details>
          ))}
        </div>

        <div className="drba-card">
          <h2>
            <Lifebuoy />
            راسلنا
          </h2>
          <p>اذكر اسمَك المستعار في رسالتك، ونوعَ جوّالك إن كانت المشكلةُ في اللعبة.</p>
          <a className="drba-btn" data-kind="suit" data-wide="" href={WA_HELP} target="_blank" rel="noopener">
            <WhatsappLogo />
            واتساب <span dir="ltr">{WA_NUMBER}</span>
          </a>
          {/* تحميلٌ كامل عمدًا لا `Link`: انظر التعليقَ أعلى الملفّ */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a className="drba-btn" data-wide="" href="/#contact">
            <ChatCircleText />
            نموذجُ التواصل في موقع أدِيب
          </a>
          <a className="drba-btn" data-kind="ghost" data-wide="" href={MAIL}>
            <EnvelopeSimple />
            <span dir="ltr">{SUPPORT_EMAIL}</span>
          </a>
        </div>

        <div className="drba-card" data-tone="gold">
          <p className="drba-eyebrow">لأصحاب الأعمال</p>
          <h2 className="drba-big">
            <Handshake />
            اجعل علامتك في يد اللاعبين
          </h2>
          <p className="drba-lead">
            نادي أدِيب يصنع تجاربَ يعيشها جمهورُه بنفسه، و«دربك خضر» واحدةٌ منها. فالإعلانُ هنا لا يمرّ عليه
            الناسُ مرورًا: يجمعونه ويتسابقون عليه.
          </p>
          <ul className="drba-items">
            {PERKS.map((x) => (
              <li key={x.b} className="drba-item">
                <span className="drba-item-ic" aria-hidden="true">{x.ic}</span>
                <span>
                  <b>{x.b}</b>
                  <span>{x.s}</span>
                </span>
              </li>
            ))}
          </ul>
          <a className="drba-btn" data-kind="gold" data-wide="" href={WA_SPONSOR} target="_blank" rel="noopener">
            <WhatsappLogo />
            تواصل معنا لرعاية أدِيب
          </a>
          <p className="drba-note">
            أو راسلنا على <span dir="ltr">{WA_NUMBER}</span> أو <span dir="ltr">{SUPPORT_EMAIL}</span>.
          </p>
        </div>
      </div>
    </>
  );
}
