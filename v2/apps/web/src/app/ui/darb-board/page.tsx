"use client";

import { useState } from "react";
import { Segmented } from "@adeeb/design-system";
import { Board, type BoardData } from "@/app/games/darbak-khadar/_components/Board";

/**
 * **معرضُ لوحة صدارة «دربك خضر»** — يرسم المكوّنَ الحقيقيّ نفسَه (`app/games/darbak-khadar/_components/Board`)
 * ببياناتٍ مصنوعة، في الضوءين وفي حالاته الثلاث.
 *
 * ══ ما حُسم ══
 * **الهويّةُ مستقلّةٌ مثل المحطّة**، فلا رأسَ للموقع ولا تذييل. واسمُ النادي سطرٌ واحدٌ هادئ
 * «من إنتاج وتشغيل نادي أدِيب» أسفلَ اللوحة (وفي اللعبة زرُّ الحفظ بالحساب)، ولا ثالثَ لهما.
 * **والاسمُ مستعارٌ يختاره اللاعب**، ولا يُجمع رقمُ جوّالٍ أصلًا (سقط بقرار المالك
 * ٢٠٢٦-٠٩-٢٤: انسحب الراعي فلا جوائز، والفائزُ يُعلَن باسمه في منشور). والمسافةُ
 * **أفضلُ جولة**، والمصّاصُ **مجموعُ الجولات كلّها**. والثلاثةُ الأوائل يتميّزون
 * **بلا ذكرٍ لجائزة**.
 *
 * ══ والجولةُ الأولى ══
 * عُرض اتّجاهان: «ليلُ الملعب» (منصّةٌ على أرضيّة اللعبة الداكنة) و«ملصقُ النهار»
 * (رملٌ وسماء وجدول). فاختار المالكُ الأوّل **وطلب منه نسختين، ليليّةً ونهاريّة**،
 * والضوءُ في الإنتاج من إعداد الجهاز (`app/games/darbak-khadar/layout.tsx`).
 *
 * ══ ومسابقةُ أكواب oos (٢٠٢٦-٠٩-٢٥) ══
 * جاء الراعي، فصار الكوبُ مكانَ المصّاص، ولوحةُ الأكواب الأولى وعلى منصّتها الجوائز.
 * والحالاتُ هنا: ممتلئةٌ والمسابقةُ جارية، وزائرٌ قبل الافتتاح، وفارغةٌ بعد الإقفال.
 *
 * ══ والتبويباتُ الخمسة (٢٠٢٦-٠٩-٢٥) ══
 * حسابي، والمسابقة، والصدارة، وكيف تُلعب؟، والدعم (قرارُ المالك وترتيبُه). والإطاران يُبدَّل فيهما التبويبُ
 * باللمس كما في الإنتاج، بلا أن يتبدّل رابطُ المعرض (`syncUrl={false}`). وحالٌ رابعةٌ هنا لـ«حسابي»:
 * لاعبٌ محفوظٌ بحساب أدِيب، بجانب الضيف الذي له اسمٌ في «ممتلئة» والزائرِ في «قبل الافتتاح».
 *
 * ══ وما هو توضيحيّ ══
 * الأسماءُ والأرقامُ كلُّها مصنوعة، ومعايَرةٌ على اللعبة: الجولةُ الوسطى ٩٦٠ مترًا،
 * و٦٨٤٠ مترًا قرابةُ دقيقتين ونصف، ومصّاصٌ ونصفٌ لكلّ ألف متر.
 */

const DIST = [
  "صقر الأحساء", "نجم الشرقية", "برق", "ظلّ النخيل", "سهم نجد", "ريم", "فارس العارض", "غيمة",
  "أبو سلطان", "قلب جدّة", "نسمة الشمال", "الرحّال",
].map((name, i) => ({ rank: i + 1, name, value: [6840, 6215, 5930, 5480, 5105, 4870, 4620, 4390, 4155, 3980, 3770, 3540][i] }));

const CANDY = [
  "برق", "ريم", "صقر الأحساء", "غيمة", "أبو سلطان", "نسمة الشمال", "نجم الشرقية", "الرحّال",
  "سهم نجد", "قلب جدّة", "ظلّ النخيل", "فارس العارض",
].map((name, i) => ({ rank: i + 1, name, value: [212, 187, 164, 151, 139, 122, 118, 104, 97, 91, 86, 80][i] }));

/**
 * نوافذُ مصنوعةٌ حول لحظة فتح المعرض، فيطابق عدّادُ تبويب المسابقة حالتَه أيًّا كان يومُ فتحه:
 * قبل الافتتاح بساعتين، وجاريةٌ منذ ساعة، ومنتهيةٌ منذ خمس. (العدّادُ لا يُرسَم في الخادم أصلًا،
 * فاختلافُ «الآن» بين الخادم والجهاز لا يمسّ الترطيب.)
 */
const T0 = Date.now();
const H = 3_600_000;
const TXT = { starts: "الجمعة 6:00 م", ends: "الأحد 6:00 م" };
const WIN = {
  before: { ...TXT, startsAt: T0 + 2 * H + 15 * 60_000, endsAt: T0 + 53 * H },
  open: { ...TXT, startsAt: T0 - H, endsAt: T0 + 50 * H },
  after: { ...TXT, startsAt: T0 - 56 * H, endsAt: T0 - 5 * H },
};

type State = "full" | "account" | "guest" | "empty";
const STATES: Record<State, BoardData> = {
  full: {
    dist: DIST,
    candy: CANDY,
    contest: { phase: "open", ...WIN.open },
    me: {
      name: "ابن الهفوف",
      dist: { rank: 23, value: 2410, above: 2720 },
      candy: { rank: 31, value: 38, above: 41 },
    },
  },
  account: {
    dist: DIST,
    candy: CANDY,
    contest: { phase: "open", ...WIN.open },
    loggedIn: true,
    me: {
      name: "برق",
      account: true,
      dist: { rank: 3, value: 5930, above: 6215 },
      candy: { rank: 1, value: 212, above: null },
    },
  },
  guest: {
    dist: DIST.slice(0, 2),
    candy: CANDY.slice(0, 2),
    me: null,
    contest: { phase: "before", ...WIN.before },
  },
  empty: { dist: [], candy: [], me: null, contest: { phase: "after", ...WIN.after } },
};

export default function DarbBoardPage() {
  const [only, setOnly] = useState<"both" | "night" | "day">("both");
  const [state, setState] = useState<State>("full");
  const data = STATES[state];

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <p className="font-latin text-xs tracking-widest text-muted">DARB / BOARD</p>
      <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">
        لوحةُ صدارة دربك خضر
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-8 text-muted">
        المكوّنُ الحقيقيُّ نفسُه ببياناتٍ مصنوعة. الضوءُ في الإنتاج من إعداد الجهاز: ليلٌ
        للداكن ونهارٌ للفاتح. والحالاتُ ثلاث: لوحةٌ ممتلئةٌ ولك فيها ترتيب، وزائرٌ لم يسجّل
        ولاعبان فقط فالمنصّةُ فيها مكانٌ شاغر، ولوحةٌ فارغةٌ قبل أوّل جولة.
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
          onValueChange={(v) => setState(v as State)}
          items={[
            { value: "full", label: "ممتلئة" },
            { value: "account", label: "بحساب" },
            { value: "guest", label: "قبل الافتتاح" },
            { value: "empty", label: "بعد الإقفال" },
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
