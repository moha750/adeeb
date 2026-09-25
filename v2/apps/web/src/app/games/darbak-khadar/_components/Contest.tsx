"use client";

import { Gift, Key, Scales, ShieldCheck, SealCheck } from "@phosphor-icons/react";
import { ArrowLeft } from "@/app/_components/glyphs";
import { OosMark, PRIZE, useNow } from "./bits";
import type { BoardContest } from "./Board";
import type { TabKey } from "./tabs";

/**
 * **تبويبُ المسابقة** (قرارُ المالك ٢٠٢٦-٠٩-٢٥): كلُّ ما كان سطرين فوق اللوحة وسطرًا تحتها صار
 * صفحةً تُقرأ قبل اللعب. الراعي، والعدّاد، والجوائز، وكيف يُحسب الفائز، واللعبُ النظيف، والاستلام.
 *
 * **والاستلامُ جملةٌ هنا وفعلٌ في «حسابي»:** الفائزُ يُثبت اسمَه بحسابه في أدِيب ومن خلاله نتواصل معه
 * (أُزيل رمزُ الاسترجاع ٢٠٢٦-٠٩-٢٥). وقراءةُ ذلك لا تحمي أحدًا، فالزرُّ يأخذه إلى حيث يحفظه.
 *
 * **والموعدُ من القاعدة** (`darb_contest_window`، محسوبًا في `page.tsx`) لا من هنا. فإن غاب
 * الجدولُ قال العدّادُ إنّ الموعدَ يُعلَن، ولا يخترع تاريخًا.
 */

const RANKS = [
  { r: 1, label: "المركز الأوّل" },
  { r: 2, label: "المركز الثاني" },
  { r: 3, label: "المركز الثالث" },
];

/** الطورُ الآن: من ساعة الجهاز إن دقّت وعُرفت النافذة، وإلّا فممّا حسبه الخادم. */
function phaseAt(c: NonNullable<BoardContest>, now: number | null) {
  if (now === null || c.startsAt === undefined || c.endsAt === undefined) return c.phase;
  return now < c.startsAt ? "before" : now < c.endsAt ? "open" : "after";
}

/** الباقي أيّامًا وساعاتٍ ودقائقَ وثواني. واليومُ لا يُعرض إن كان صفرًا. */
function split(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}
const two = (x: number) => String(x).padStart(2, "0");

function Clock({ contest }: { contest: BoardContest }) {
  const now = useNow();
  if (!contest) {
    return (
      <div className="drba-card drba-clock">
        <p className="drba-clock-lbl">موعدُ المسابقة يُعلَن هنا قريبًا</p>
      </div>
    );
  }
  const phase = phaseAt(contest, now);
  const target = phase === "before" ? contest.startsAt : phase === "open" ? contest.endsAt : undefined;
  const left = now !== null && target !== undefined ? split(target - now) : null;
  const units = left
    ? [
        ...(left.d > 0 ? [{ v: String(left.d), u: "يوم" }] : []),
        { v: two(left.h), u: "ساعة" },
        { v: two(left.m), u: "دقيقة" },
        { v: two(left.s), u: "ثانية" },
      ]
    : [
        { v: "--", u: "ساعة" },
        { v: "--", u: "دقيقة" },
        { v: "--", u: "ثانية" },
      ];

  return (
    <div className="drba-card drba-clock" data-phase={phase}>
      <p className="drba-clock-lbl">
        {phase === "before" ? "تبدأ المسابقة بعد" : phase === "open" ? "المسابقةُ جارية، وتنتهي بعد" : "انتهت المسابقة"}
      </p>
      {phase !== "after" ? (
        <div className="drba-clock-row" role="timer" aria-live="off">
          {units.map((x) => (
            <span key={x.u} className="drba-clock-u">
              <b>{x.v}</b>
              <span>{x.u}</span>
            </span>
          ))}
        </div>
      ) : (
        <p>يُعلَن الفائزون بعد مراجعة النتائج.</p>
      )}
      <p className="drba-clock-when">
        من {contest.starts} إلى {contest.ends}، بتوقيت السعوديّة
      </p>
    </div>
  );
}

export function Contest({ contest, go }: { contest: BoardContest; go: (t: TabKey) => void }) {
  return (
    <>
      <section className="drba-hero">
        <h1>المسابقة</h1>
        <p className="drba-spons">
          برعاية <OosMark />
        </p>
        <p>اجمع أكوابَ oos في جولاتك، والثلاثةُ الأكثرُ جمعًا يفوزون.</p>
      </section>

      <div className="drba-body">
        <Clock contest={contest} />

        <div className="drba-card">
          <h2>
            <Gift />
            الجوائز
          </h2>
          <ol className="drba-prizes">
            {RANKS.map(({ r, label }) => (
              <li key={r} className="drba-prz" data-rank={r}>
                <span className="drba-prz-rk">{r}</span>
                <b>{label}</b>
                <span className="drba-prz-amt">{PRIZE[r]}</span>
              </li>
            ))}
          </ol>
          <p>رصيدٌ في محفظة مقهى oos، يشتري به الفائزُ ما شاء من منتجاتهم.</p>
        </div>

        <div className="drba-card">
          <h2>
            <Scales />
            كيف يُحسب الفائز
          </h2>
          <ul className="drba-dots">
            <li>مجموعُ الأكواب في جولاتك كلّها، من افتتاح المسابقة حتّى إقفالها.</li>
            <li>ما لُعب قبل الافتتاح تجربةٌ لا تُحسب.</li>
            <li>إن تعادل لاعبان تقدّم من بلغ المجموعَ أوّلًا.</li>
            <li>لوحةُ أبعد مسافة لوحةُ شرفٍ بلا جائزة.</li>
          </ul>
          <button type="button" className="drba-link" onClick={() => go("how")}>
            كيف تجمع أكوابًا أكثر؟
            <ArrowLeft />
          </button>
        </div>

        <div className="drba-card">
          <h2>
            <ShieldCheck />
            اللعبُ النظيف
          </h2>
          <p>
            كلُّ جولةٍ يعيد الخادمُ لعبَها من ضغطاتك ويحسب نتيجتها بنفسه، فلا يُقبل رقمٌ معدَّل. ونتائجُ
            الأوائل تُراجَع قبل الإعلان.
          </p>
        </div>

        <div className="drba-card">
          <h2>
            <SealCheck />
            استلامُ الجائزة
          </h2>
          <p>
            نعلن الفائزين بأسمائهم المستعارة بعد مراجعة النتائج، ويُثبت الفائزُ أنّ الاسمَ له بحسابه في
            أدِيب، ومن خلاله نتواصل معه. فاحفظ اسمَك بحسابك قبل أن تفوز.
          </p>
          <button type="button" className="drba-btn" data-wide="" onClick={() => go("me")}>
            <Key />
            احفظ اسمك من «حسابي»
          </button>
        </div>
      </div>
    </>
  );
}
