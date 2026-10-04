"use client";

import { useState } from "react";
import { Container, LandingHeading, Segmented } from "@adeeb/design-system";
import { ALL_MEMBER_PERKS, JoinMemberPerks } from "@/app/join/JoinStory";

/**
 * **كم ميزةً تُعرَض؟ سؤالٌ يُنظَر ولا يُوصَف.**
 *
 * الجوابُ لا يُقال بعددٍ في جملة، لأنّ الفرقَ فرقُ صفٍّ يكتمل أو ينكسر: شبكةُ الكروت
 * `card-grid` انسيابيّةٌ (`flex: 1 1 252px`) فالكروتُ تتمدّد لتملأ صفَّها، والعددُ الذي
 * لا يقسم الصفَّ يُخرج كرتًا وحيدًا ممدودًا بعرض الصفحة. فالعددُ قرارُ عينٍ لا حساب.
 *
 * والمعروضُ هو `JoinMemberPerks` نفسُه الذي ستركّبه الصفحةُ الحيّة، لا نسخةٌ تُحاكيه،
 * ومعه عنوانُه كما سيُكتب. والإطارُ يُضيَّق إلى ٣٧٥ لأنّ المقياسَ الجوّالُ لا الشاشةُ
 * العريضة.
 */

const WIDTHS = [
  { value: "375", label: "جوّال ٣٧٥" },
  { value: "430", label: "جوّال كبير ٤٣٠" },
  { value: "820", label: "لوح ٨٢٠" },
  { value: "1180", label: "سطح مكتب" },
];

const COUNTS = [
  { value: "3", label: "ثلاث" },
  { value: "4", label: "أربع" },
  { value: "5", label: "خمس" },
  { value: "6", label: "ستّ" },
  { value: "8", label: "ثمان" },
];

/**
 * ما يُنتظَر من كلّ عدد — **مقيسًا لا مظنونًا**: الصفُّ على سطح المكتب يسع **أربعًا**
 * (قِيس في المتصفّح لا حُسب من `flex-basis`)، فالأعدادُ التي لا يقسمها الأربعُ تترك
 * بقيّةً ممدودةً بعرض نصف الصفحة. وعلى ٣٧٥ يسقط الكلُّ عمودًا واحدًا، فالسؤالُ هناك
 * سؤالُ طولٍ لا سؤالُ صفّ، ولذلك يُذكَر ارتفاعُ القسم مع كلّ عدد.
 */
const COUNT_NOTE: Record<string, string> = {
  "3": "صفٌّ واحدٌ ناقصٌ واحدًا على سطح المكتب (الصفُّ يسع أربعًا) فتتّسع الكروتُ الثلاث. وهو إيقاعُ الصفحة القائم: قسما «ماذا تنال» و«محطّاتُك إلينا» ثلاثةٌ ثلاثة. وعلى الجوّال أقصرُ متن: ١٠٠٥ بكسل.",
  "4": "صفٌّ واحدٌ مكتملٌ تمامًا على سطح المكتب، بلا بقيّةٍ ولا فراغ. وعلى الجوّال ١١٩٧ بكسل.",
  "5": "أربعٌ ثمّ واحدةٌ وحدَها ممدودةٌ بعرض الصفّ كلِّه. كسرةٌ ظاهرة.",
  "6": "أربعٌ ثمّ اثنتان ممدودتان بنصف العرض لكلٍّ منهما، فتُقرآن أعرضَ من إخوتهما. وعلى الجوّال ١٦٠٧ بكسل.",
  "8": "صفّان مكتملان (أربعٌ وأربع) بلا بقيّة. كلُّ ما وجدتُه مبنيًّا، ومتنٌ طويلٌ جدًّا على الجوّال.",
};

export default function MembershipPerksLab() {
  const [w, setW] = useState("375");
  const [n, setN] = useState("3");

  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">
          Design System, Membership Perks
        </p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">مميّزاتُ العضويّة</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          قسمٌ جديدٌ لصفحة الانضمام، لم يُركَّب في الحيّ بعد. الترتيبُ ههنا ترتيبُ أهمّيّةٍ
          مقترَح، فأوّلُ ثلاثٍ هي التي أختارها لو كان الاختيارُ لي. بدّل العددَ وانظر.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <span className="text-sm font-bold text-content-muted">عرض الإطار:</span>
          <Segmented items={WIDTHS} value={w} onValueChange={setW} aria-label="عرض إطار المعاينة" />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-sm font-bold text-content-muted">عددُ المميّزات:</span>
          <Segmented items={COUNTS} value={n} onValueChange={setN} aria-label="عدد المميّزات المعروضة" />
        </div>

        <p className="mt-4 max-w-2xl text-sm text-content-muted">{COUNT_NOTE[n]}</p>
      </Container>

      <div className="mx-auto w-full max-w-[1280px] px-6">
        <div className="phdlab mt-10" style={{ ["--phdlab-w" as string]: w + "px" }}>
          <div className="phdlab-col">
            <div className="phdlab-tag good">
              <span className="dot" aria-hidden />
              {COUNTS.find((c) => c.value === n)?.label} مميّزات
              <span className="h">{w}px</span>
            </div>
            <div className="phdlab-frame">
              <section className="py-16 md:py-24">
                <Container>
                  {/* **لا «ماذا تنال» ثانية:** القسمُ الذي فوقه في الصفحة الحيّة يحمل هذا
                      العنوانَ نفسَه للتطوّع، وعنوانان متطابقان في صفحةٍ واحدةٍ يُقرآن تكرارًا
                      لا تدرّجًا. فالتطوّعُ «ماذا تنال»، والعضويّةُ «ماذا يُفتح». */}
                  <LandingHeading
                    eyebrow="العضويّة"
                    title="ماذا يُفتح"
                    deck="العضويّةُ ليست لقبًا يُكتب، بل بابٌ يُفتح وأدواتٌ تُسلَّم."
                  />
                  <JoinMemberPerks perks={ALL_MEMBER_PERKS.slice(0, Number(n))} />
                </Container>
              </section>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
