"use client";

import { useState } from "react";
import { Crown, Play, PersonSimpleRun } from "@phosphor-icons/react";
import { CaretDown } from "@/app/_components/glyphs";

/**
 * **لوحةُ صدارة «ركضة وطن»** — التصميمُ الذي اختاره المالك (٢٠٢٦-٠٩-٢٤: «أريد تصميم أ
 * ولكن يكون منه ليلي ونهاري»)، ومعرضُه `/ui/watan-board` يرسم هذا المكوّنَ نفسَه.
 *
 * يأخذ الصفوفَ جاهزةً (القراءةُ في الخادم، `app/watan/page.tsx`)، ولا يعرف إلّا العرض:
 * اللوحتان والتبديلُ بينهما، والثلاثةُ على منصّة، والبقيّةُ في قائمةٍ تتّسع إلى خمسين،
 * وشريطُ «أنت» ملازمٌ في الأسفل. والضوءُ ليلٌ أو نهارٌ من جذر البرنامج (`data-sky`)
 * لا من هنا.
 *
 * **والأرقامُ غربيّة** كما هي في اللعبة نفسِها (عدّادُها وشاشةُ نهايتها): من خرج من
 * الجولة بـ«6,840 م» يجدها في اللوحة كما رآها، لا «٦٬٨٤٠».
 */

export type BoardKind = "dist" | "candy";
export type BoardRow = { rank: number; name: string; value: number };
export type Standing = { value: number; rank: number | null; above: number | null };
export type BoardMe = { name: string; dist: Standing; candy: Standing } | null;
export type BoardData = { dist: BoardRow[]; candy: BoardRow[]; me: BoardMe; failed?: boolean };

/** رابطُ اللعبة: ملفٌّ ثابتٌ بإعادة كتابة (`next.config.ts`)، فيُفتَح تنقّلًا كاملًا لا انتقالَ React. */
const PLAY = "/watan/play";
/** القائمةُ تُعرض عشرةً أوّلًا (الثلاثةُ على المنصّة وسبعةٌ تحتها)، ثمّ تتّسع إلى ما جاء. */
const FIRST = 10;

const fmt = new Intl.NumberFormat("en-US");
const n = (x: number) => fmt.format(x);

/** الحرفُ الأوّلُ من الاسم بعد «ال»: «الرحّال» تُقرأ راءً لا ألفًا. */
const initial = (name: string) => name.replace(/^ال/, "").charAt(0);

/** المصّاصُ رسمُ اللعبة نفسُه، يُنسخ من عدّاد شاشتها. */
export function Lolli() {
  return (
    <svg className="wtn-lolli" viewBox="0 0 24 24" aria-hidden="true">
      <path className="st" d="M12 15.5V23" />
      <circle className="cd" cx="12" cy="9" r="6.8" />
      <path className="sw" d="M12 9a1.6 1.6 0 1 1 1.6-1.6a3.2 3.2 0 1 1-3.2 3.2a4.8 4.8 0 0 1 4.8-4.8" />
    </svg>
  );
}

/** القيمةُ بوحدتها: المترُ حرفٌ بعد الرقم، والمصّاصُ رسمٌ قبله. */
function Val({ b, v }: { b: BoardKind; v: number }) {
  return b === "dist" ? (
    <span className="wtn-num">
      {n(v)}
      <span className="wtn-unit">م</span>
    </span>
  ) : (
    <span className="wtn-num">
      <Lolli /> {n(v)}
    </span>
  );
}

/** عددُ المصّاص بتمييزه العربيّ: واحدٌ ومثنًّى، وجمعٌ للعشرة وما دونها، ومفردٌ لما فوقها. */
function candies(k: number) {
  if (k === 1) return "مصّاصًا واحدًا";
  if (k === 2) return "مصّاصَين";
  const t = k % 100;
  return t >= 3 && t <= 10 ? `${n(k)} مصّاصات` : `${n(k)} مصّاصًا`;
}

/** سطرُ «أنت» الثاني: كم بينك وبين من فوقك، أو أنّك في الصدارة. */
function gapLine(b: BoardKind, s: Standing) {
  if (s.rank === null) return "لم تُحسَب لك جولةٌ هنا بعد";
  if (s.rank === 1 || s.above === null) return "أنت في الصدارة";
  const d = s.above - s.value;
  const up = n(s.rank - 1);
  if (d <= 0) return `تعادلتَ مع المركز ${up}، وسبقك إليه بالوقت`;
  return b === "dist" ? `تبعد ${n(d)} م عن المركز ${up}` : `تحتاج ${candies(d)} للمركز ${up}`;
}

const NOTE: Record<BoardKind, string> = {
  dist: "أفضلُ جولةٍ لكلّ لاعب",
  candy: "مجموعُ مصّاصِ جولاتك كلّها",
};

const FINE =
  "يظهر هنا اسمُك المستعار وحده. والنتائجُ تُراجَع قبل اعتمادها، ويتحدّث الترتيبُ كلّ دقيقة.";

export function Board({ data }: { data: BoardData }) {
  const [b, setB] = useState<BoardKind>("dist");
  const [open, setOpen] = useState(false);
  const rows = data[b];
  const me = data.me;
  const mine = me ? me[b] : null;

  const at = (r: number) => rows.find((x) => x.rank === r);
  const pod = [2, 1, 3].map((r) => ({ r, e: at(r) }));
  const rest = rows.filter((x) => x.rank > 3);
  const shown = open ? rest : rest.slice(0, FIRST - 3);

  return (
    <div className="wtna-page">
      <header className="wtna-head">
        <span className="wtn-mark">
          ركضة <b>وطن</b>
        </span>
        <a className="wtna-play" href={PLAY}>
          <Play />
          العب
        </a>
      </header>

      <section className="wtna-hero">
        <h1>المتصدّرون</h1>
        <p>{NOTE[b]}</p>
        <div className="wtna-tabs" role="group" aria-label="اللوحة">
          <button className="wtna-tab" type="button" aria-pressed={b === "dist"} onClick={() => setB("dist")}>
            <PersonSimpleRun />
            أبعد مسافة
          </button>
          <button className="wtna-tab" type="button" aria-pressed={b === "candy"} onClick={() => setB("candy")}>
            <Lolli />
            أكثر مصّاص
          </button>
        </div>
      </section>

      {rows.length === 0 ? (
        <div className="wtna-empty">
          <Lolli />
          <b>{data.failed ? "تعذّرت قراءةُ اللوحة الآن" : "اللوحةُ تنتظر أوّلَ عدّاء"}</b>
          <p>{data.failed ? "أعد فتح الصفحة بعد قليل." : "العب جولةً واحدةً تجد اسمَك في رأسها."}</p>
          <a className="wtna-play" href={PLAY}>
            <Play />
            العب الآن
          </a>
        </div>
      ) : (
        <>
          <ol className="wtna-pod" aria-label="الثلاثة الأوائل">
            {pod.map(({ r, e }) => (
              <li key={r} className="wtna-step" data-rank={r} data-empty={e ? undefined : ""} data-me={e && me?.name === e.name ? "" : undefined}>
                {r === 1 ? <Crown className="wtna-crown" /> : null}
                <span className="wtna-av" aria-hidden="true">{e ? initial(e.name) : "؟"}</span>
                <span className="wtna-who">{e ? e.name : "مكانٌ شاغر"}</span>
                <span className="wtna-val">{e ? <Val b={b} v={e.value} /> : null}</span>
                <span className="wtna-block">{r}</span>
              </li>
            ))}
          </ol>

          <div className="wtna-sheet">
            {shown.length > 0 ? (
              <ol className="wtna-list">
                {shown.map((e) => (
                  <li key={e.rank} className="wtna-row" data-me={me?.name === e.name ? "" : undefined}>
                    <span className="wtna-rk wtn-num">{e.rank}</span>
                    <span className="wtna-mini" aria-hidden="true">{initial(e.name)}</span>
                    <span className="wtna-name">{e.name}</span>
                    <span className="wtna-num"><Val b={b} v={e.value} /></span>
                  </li>
                ))}
              </ol>
            ) : null}
            {!open && rest.length > shown.length ? (
              <button className="wtna-more" type="button" onClick={() => setOpen(true)}>
                {rows.length >= 50 ? "بقيّة الخمسين" : "بقيّة الترتيب"}
                <CaretDown />
              </button>
            ) : null}
            <p className="wtna-fine">{FINE}</p>
          </div>
        </>
      )}

      {/* أدِيب في موضعين لا ثالثَ لهما (قرارُ المالك ٢٠٢٦-٠٩-٢٤): هذا السطر، وزرُّ الحفظ بالحساب في اللعبة */}
      <p className="wtna-credit">من تصميم نادي أدِيب</p>

      <div className="wtna-me">
        {me && mine ? (
          <div className="wtna-me-in">
            <span className="wtna-me-rk wtn-num">{mine.rank ?? ""}</span>
            <span className="wtna-me-who">
              <b>أنت، {me.name}</b>
              <span>{gapLine(b, mine)}</span>
            </span>
            <span className="wtna-me-val">{mine.rank !== null ? <Val b={b} v={mine.value} /> : null}</span>
          </div>
        ) : (
          <a className="wtna-me-in" href={PLAY} data-out="">
            <span className="wtna-me-rk" aria-hidden="true"><Play /></span>
            <span className="wtna-me-who">
              <b>لم تدخل اللوحةَ بعد</b>
              <span>العب باسمٍ مستعارٍ تجده هنا</span>
            </span>
          </a>
        )}
      </div>
    </div>
  );
}
