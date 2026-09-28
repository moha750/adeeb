"use client";

import { useState } from "react";
import { Segmented } from "@adeeb/design-system";
import { Board, type BoardData } from "@/app/games/darbak-khadar/_components/Board";

/**
 * **معرضُ لوحة صدارة «دربك خضر»** — يرسم المكوّنَ الحقيقيّ نفسَه (`app/games/darbak-khadar/_components/Board`)
 * ببياناتٍ مصنوعة، في الضوءين وفي حالاته.
 *
 * ══ ما حُسم ══
 * **الهويّةُ مستقلّةٌ مثل المحطّة**، فلا رأسَ للموقع ولا تذييل. واسمُ النادي سطرٌ واحدٌ هادئ
 * «من إنتاج وتشغيل نادي أدِيب» أسفلَ اللوحة (وفي اللعبة زرُّ الحفظ بالحساب)، ولا ثالثَ لهما.
 * **والاسمُ مستعارٌ يختاره اللاعب**. والمسافةُ **أفضلُ جولة**، والتمرُ **مجموعُ الجولات كلّها**.
 *
 * ══ والجولةُ الأولى ══
 * عُرض اتّجاهان: «ليلُ الملعب» (منصّةٌ على أرضيّة اللعبة الداكنة) و«ملصقُ النهار»
 * (رملٌ وسماء وجدول). فاختار المالكُ الأوّل **وطلب منه نسختين، ليليّةً ونهاريّة**،
 * والضوءُ في الإنتاج من إعداد الجهاز (`app/games/darbak-khadar/layout.tsx`).
 *
 * ══ والتبويباتُ الخمسة (٢٠٢٦-٠٩-٢٥) ══
 * حسابي، والمسابقة، والصدارة، وكيف تُلعب؟، والدعم (قرارُ المالك وترتيبُه). والإطاران يُبدَّل فيهما التبويبُ
 * باللمس كما في الإنتاج، بلا أن يتبدّل رابطُ المعرض (`syncUrl={false}`).
 *
 * ══ وبعد المسابقة (٢٠٢٦-٠٩-٢٨) ══
 * التمرةُ مكانَ الكوب، ولوحتا المسافة والتمر دائمتان، والمسابقةُ ذكرى بفائزيها وأرقامها ودعوةِ الرعاة.
 * ورسالةُ الأكواب واحتفاءُ الفائز مرّةً واحدةً في المتصفّح، فالمعرضُ يمحو علامتَيهما عند كلّ اختيارٍ للحالة،
 * والإطارُ الأوّلُ منهما يأخذهما (كما يأخذهما في الإنتاج أوّلُ ما يُفتح). فاختر «الليل» وحدَه لتراهما.
 *
 * ══ وما هو توضيحيّ ══
 * الأسماءُ والأرقامُ كلُّها مصنوعة، ومعايَرةٌ على اللعبة: الجولةُ الوسطى ٩٦٠ مترًا،
 * و٦٨٤٠ مترًا قرابةُ دقيقتين ونصف، وتمرةٌ ونصفٌ لكلّ ألف متر.
 */

const DIST = [
  "صقر الأحساء", "نجم الشرقية", "برق", "ظلّ النخيل", "سهم نجد", "ريم", "فارس العارض", "غيمة",
  "أبو سلطان", "قلب جدّة", "نسمة الشمال", "الرحّال",
].map((name, i) => ({ rank: i + 1, name, value: [6840, 6215, 5930, 5480, 5105, 4870, 4620, 4390, 4155, 3980, 3770, 3540][i] }));

const TAMR = [
  "غيمة", "الرحّال", "ريم", "سهم نجد", "برق", "قلب جدّة", "صقر الأحساء", "أبو سلطان",
].map((name, i) => ({ rank: i + 1, name, value: [34, 29, 23, 18, 15, 11, 8, 5][i] }));

const CONTEST = { starts: "الجمعة 6:30 م", ends: "الأحد 6:00 م" };
/** الفائزون كما تعيدهم `darb_winners`، وأرقامُ المسابقة كما تعيدها `darb_contest_recap`. */
const WINNERS = [
  { rank: 1, name: "برق", cups: 212, dist: 5930, runs: 64, minutes: 214 },
  { rank: 2, name: "ريم", cups: 187, dist: 4870, runs: 51, minutes: 190 },
  { rank: 3, name: "صقر الأحساء", cups: 164, dist: 6840, runs: 47, minutes: 171 },
];
const RECAP = { players: 148, runs: 1612, cups: 15402, minutes: 3444 };
const MEMORY = { contest: CONTEST, winners: WINNERS, recap: RECAP };

type State = "full" | "account" | "day1" | "guest" | "empty" | "winner";
const STATES: Record<State, BoardData> = {
  /* ضيفٌ له نتائجُ وأكوابٌ من المسابقة: رسالةُ الأكواب، وتذكيرُ الحفظ بالحساب */
  full: {
    ...MEMORY,
    dist: DIST,
    tamr: TAMR,
    me: {
      name: "ابن الهفوف",
      dist: { rank: 23, value: 2410, above: 2720 },
      tamr: { rank: 9, value: 4, above: 5 },
      cups: { total: 41, contest: 38, rank: 31, of: 129 },
    },
  },
  account: {
    ...MEMORY,
    dist: DIST,
    tamr: TAMR,
    loggedIn: true,
    me: {
      name: "غيمة",
      account: true,
      dist: { rank: 8, value: 4390, above: 4620 },
      tamr: { rank: 1, value: 34, above: null },
      cups: { total: 0, contest: 0, rank: null, of: 129 },
    },
  },
  /* يومُ النشر: المسافةُ ممتلئة، والتمرُ لم يجمعه أحدٌ بعد */
  day1: {
    ...MEMORY,
    dist: DIST,
    tamr: [],
    loggedIn: true,
    me: {
      name: "نجم الشرقية",
      account: true,
      dist: { rank: 2, value: 6215, above: 6840 },
      tamr: { rank: null, value: 0, above: null },
      cups: { total: 96, contest: 90, rank: 12, of: 129 },
    },
  },
  guest: { ...MEMORY, dist: DIST.slice(0, 2), tamr: TAMR.slice(0, 2), me: null },
  empty: { ...MEMORY, dist: [], tamr: [], me: null },
  /* الفائزُ نفسُه داخلٌ: القصاصاتُ والتبريك، ثمّ رسالةُ الأكواب */
  winner: {
    ...MEMORY,
    dist: DIST,
    tamr: TAMR,
    loggedIn: true,
    me: {
      name: "برق",
      account: true,
      dist: { rank: 3, value: 5930, above: 6215 },
      tamr: { rank: 5, value: 15, above: 18 },
      cups: { total: 212, contest: 212, rank: 1, of: 129 },
    },
  },
};

/** يمحو علامتَي «مرّةً واحدة» (`useOnce` في `bits.tsx`) فتُرى الرسالةُ والاحتفاءُ عند كلّ اختيار. */
function fresh() {
  try {
    localStorage.removeItem("darb_cupsNote");
    localStorage.removeItem("darb_celebrated");
  } catch {
    /* تخزينٌ مغلق: لا شيء يُمحى */
  }
}

export default function DarbBoardPage() {
  const [only, setOnly] = useState<"both" | "night" | "day">("both");
  const [state, setState] = useState<State>(() => {
    if (typeof window !== "undefined") fresh();
    return "full";
  });
  const data = STATES[state];

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <p className="font-latin text-xs tracking-widest text-muted">DARB / BOARD</p>
      <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">
        لوحةُ صدارة دربك خضر
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-8 text-muted">
        المكوّنُ الحقيقيُّ نفسُه ببياناتٍ مصنوعة. الضوءُ في الإنتاج من إعداد الجهاز: ليلٌ
        للداكن ونهارٌ للفاتح. ورسالةُ الأكواب واحتفاءُ الفائز مرّةً واحدة، فتظهران في الإطار الأوّل وحدَه.
      </p>

      <div className="mt-7 flex flex-wrap gap-3">
        <Segmented
          aria-label="الضوء"
          value={only}
          onValueChange={(v) => setOnly(v as "both" | "night" | "day")}
          items={[
            { value: "both", label: "الاثنان" },
            { value: "night", label: "الليل" },
            { value: "day", label: "النهار" },
          ]}
        />
        <Segmented
          aria-label="الحالة"
          value={state}
          onValueChange={(v) => {
            fresh();
            setState(v as State);
          }}
          items={[
            { value: "full", label: "ضيفٌ بأكواب" },
            { value: "account", label: "بحساب" },
            { value: "day1", label: "يومُ التمر" },
            { value: "guest", label: "زائر" },
            { value: "empty", label: "فارغة" },
            { value: "winner", label: "فائزٌ داخل" },
          ]}
        />
      </div>

      <div className="mt-8 shplab">
        {only !== "day" ? (
          <div className="shplab-col">
            <div className="stnp-cap">
              <b>الليل</b>
              <p>امتدادُ شاشةِ نهاية الجولة، ووهجٌ أخضرُ في الأعلى كأنّه كشّافُ ملعب.</p>
            </div>
            <div className="drbp-frame drb drba" data-sky="night" style={{ height: 760 }}>
              <div className="drbp-scroll"><Board key={state} data={data} syncUrl={false} /></div>
            </div>
          </div>
        ) : null}

        {only !== "night" ? (
          <div className="shplab-col">
            <div className="stnp-cap">
              <b>النهار</b>
              <p>رملُ الطريق أرضيّةٌ وورقٌ أفتحُ منه للقائمة، والسماءُ مكانَ الوهج.</p>
            </div>
            <div className="drbp-frame drb drba" data-sky="day" style={{ height: 760 }}>
              <div className="drbp-scroll"><Board key={state} data={data} syncUrl={false} /></div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
