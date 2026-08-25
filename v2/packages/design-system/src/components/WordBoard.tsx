import type { ReactNode } from "react";
import { cn } from "../lib/cn";

/**
 * **لوحُ الكلمة** — البدائيّةُ الوحيدة التي تعرض الكلمةَ الجاريةَ في «خمّن الكلمة».
 *
 * تخدم ثلاثةَ سياقاتٍ برسمٍ واحد: بروجكتر القاعة · مِقوَدُ المضيف · شاشةُ اللاعب.
 * وتقيس **حاويتَها** لا الشاشة (`container-type` في `.gwrd`)، فالمقاسُ يتبع الموضعَ
 * الذي وُضعت فيه لا الجهازَ الذي فُتحت عليه.
 *
 * **هيئةٌ واحدة** (قرارُ المالك ٢٠٢٦-٠٨-٢٥): سطحٌ مؤطَّرٌ قائمٌ بذاته. وأُعدمت
 * `board` وقواعدُها، فلا خاصّيّةَ `variant` تُمرَّر ولا خيارَ يُتذكَّر.
 *
 * **والحالُ تُقال بثلاثةٍ معًا لا بلونٍ وحده** (ق١٠: لا تُقرأ الهويّةُ باللون وحده):
 * نغمةُ السطح والحدّ · أيقونةٌ تسمّي الحال · ونصٌّ يقولها. فمن لا يميّز الأحمرَ من
 * الأصفر يقرأ الأيقونةَ والرقم.
 *
 * ولا تحسب شيئًا من عندها: الحالُ والزمنُ يُمرَّران محسوبَين، فالحسابُ في
 * `roundRemainingMs` (مصدرٌ واحدٌ مختبَر) لا في مكوّنِ عرض.
 *
 * **والأيقوناتُ تُمرَّر ولا تُرسَم هنا** (`icons`، إلزاميّةٌ كأيقونة `Field`): المكتبة
 * لا تعتمد حزمةَ أيقونات، وقانونُها أنّ المستدعيَ يُمِدّها بها فتبقى عائلةُ أيقونات
 * الموقع واحدةً (duotone). ورُسمت هنا يدويًّا في أوّل بناء، فخرجت خطوطًا رفيعةً وسط
 * موقعٍ كلُّه duotone — وهو خطأٌ صُحّح. ومصدرُها الواحد `dashboard/games/boardIcons`.
 */

export type WordBoardState = "idle" | "running" | "paused" | "ended";

/** أيقوناتُ اللوح الخمس. تُعلَن مرّةً عند المستدعي (`BOARD_ICONS`) لا في كلّ شاشة. */
export type WordBoardIcons = {
  /** بجانب رقم الجولة. */
  round: ReactNode;
  /** مع العدّ الجاري. */
  timer: ReactNode;
  /** تحلّ محلّ `timer` حين تُوقَف الجولة. */
  paused: ReactNode;
  /** حين لا جولةَ مفتوحة. */
  idle: ReactNode;
  /** في كبسولة الفائز. */
  winner: ReactNode;
};

export interface WordBoardProps {
  /** الكلمةُ الجارية، أو `null` حين لا جولةَ مفتوحة. */
  word: string | null;
  /** «الجولة ٣ من ١٠» — يُقال همسًا فوق الكلمة فيعرف الداخلُ متأخّرًا أين هو. */
  meta?: string;
  state: WordBoardState;
  /** ما بقي بالمِلّي، وكاملُ المهلة — يُرسَمان مضمارًا ورقمًا. */
  remainingMs?: number;
  totalMs?: number;
  /** يُعرَض بدل الكلمة حين `idle`: لوحٌ خالٍ يبدو معطوبًا. */
  idleText?: string;
  winnerName?: string | null;
  /** **إلزاميّة**: المكتبةُ لا تملك أيقوناتٍ، والمستدعي يُمِدّها من عائلة الموقع. */
  icons: WordBoardIcons;
  className?: string;
}

/** «١:٠٥». مكرَّرٌ عن `formatClock` في التطبيق عمدًا: المكتبةُ لا تستورد منه. */
function clock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** العتبةُ التي تحمرّ عندها اللوحةُ وتنبض الأيقونة: عشرُ ثوانٍ، آخرُ ما يُلتفَت إليه. */
const URGENT_MS = 10_000;

/**
 * **زينةُ الفوز — قصاصاتٌ تتطاير لحظةَ إعلانه.**
 *
 * ومواضعُها **ثابتةٌ مكتوبة** لا عشوائيّةٌ تُحسَب: `Math.random` في جسم الرسم يُخرج
 * للخادم قيمةً وللمتصفّح أخرى فيسقط الترطيب. والعينُ لا تفرّق بين عشوائيٍّ حقيقيٍّ
 * وبين ثمانيةَ عشرَ موضعًا مبعثرةً بيد.
 *
 * `--x` الموضعُ الأفقيّ · `--d` تأخّرُ الانطلاق · `--t` مدّةُ السقوط ·
 * `--r` دورةُ الالتفاف · `--c` رمزُ اللون (من السلّم لا من `#hex`).
 */
const CONFETTI = [
  { x: 6,  d: 0,    t: 2.4, r: 420,  c: "var(--success-500)" },
  { x: 13, d: .28,  t: 2.9, r: -300, c: "var(--warning-500)" },
  { x: 19, d: .12,  t: 2.2, r: 540,  c: "var(--steel-400)"   },
  { x: 26, d: .46,  t: 3.1, r: -480, c: "var(--success-600)" },
  { x: 32, d: .06,  t: 2.6, r: 360,  c: "var(--warning-400)" },
  { x: 39, d: .34,  t: 2.8, r: -420, c: "var(--navy-700)"    },
  { x: 45, d: .18,  t: 2.3, r: 600,  c: "var(--success-500)" },
  { x: 51, d: .52,  t: 3.0, r: -360, c: "var(--steel-500)"   },
  { x: 57, d: .02,  t: 2.7, r: 480,  c: "var(--warning-500)" },
  { x: 63, d: .40,  t: 2.5, r: -540, c: "var(--success-600)" },
  { x: 69, d: .22,  t: 3.2, r: 300,  c: "var(--steel-400)"   },
  { x: 75, d: .58,  t: 2.4, r: -400, c: "var(--warning-400)" },
  { x: 81, d: .10,  t: 2.9, r: 520,  c: "var(--success-500)" },
  { x: 86, d: .44,  t: 2.6, r: -320, c: "var(--navy-700)"    },
  { x: 91, d: .26,  t: 3.0, r: 440,  c: "var(--warning-500)" },
  { x: 95, d: .62,  t: 2.2, r: -560, c: "var(--success-600)" },
  { x: 3,  d: .50,  t: 2.8, r: 380,  c: "var(--steel-500)"   },
  { x: 98, d: .16,  t: 2.5, r: -460, c: "var(--success-500)" },
] as const;

/** ما تقوله كلُّ حالٍ بالكلمة — فلا يُقرأ اللونُ وحدَه. */
const STATE_WORD: Record<Exclude<WordBoardState, "idle">, string> = {
  running: "الجولة جارية",
  paused: "الجولة موقوفة",
  ended: "انتهت الجولة",
};

export function WordBoard({
  word,
  meta,
  state,
  remainingMs = 0,
  totalMs = 0,
  idleText = "في انتظار الجولة",
  winnerName,
  icons,
  className,
}: WordBoardProps) {
  const counting = state === "running" || state === "paused";
  const urgent = state === "running" && remainingMs <= URGENT_MS;
  const pct = totalMs > 0 ? Math.max(0, Math.min(100, (remainingMs / totalMs) * 100)) : 0;

  return (
    <div
      className={cn("gwrd", className)}
      data-state={state}
      data-urgent={urgent || undefined}
    >
      {meta ? (
        <p className="gwrd-meta">
          {icons.round}
          {meta}
        </p>
      ) : null}

      {word ? (
        /* المفتاحُ يُعيد تركيبَ العنصر مع كلّ كلمة، فتُعاد حركةُ الدخول — ولولاه
           لتبدّل النصُّ في مكانه بلا أن يُنتبَه إلى أنّ جولةً جديدةً بدأت.
           و`aria-live` مهذّب: القارئُ يقول الكلمةَ حين تظهر ولا يقاطع ما يُقرأ. */
        <p key={word} className="gwrd-word" aria-live="polite">
          {word}
        </p>
      ) : (
        <p className="gwrd-idle">
          {icons.idle}
          {idleText}
        </p>
      )}

      {counting ? (
        <>
          <p className="gwrd-clock">
            {state === "paused" ? icons.paused : icons.timer}
            {/* لاتينيٌّ معزولُ الاتّجاه: النقطتان تنتقلان إلى الطرف الآخر في سطرٍ عربيّ. */}
            <span className="lat" dir="ltr">
              {clock(remainingMs)}
            </span>
            {/* الحالُ منطوقةً لقارئ الشاشة: اللونُ والأيقونةُ لا يبلغانه. */}
            <span className="sr-only">{STATE_WORD[state]}</span>
          </p>
          <div
            className="gwrd-rail"
            role="progressbar"
            aria-label="ما بقي من الجولة"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(pct)}
          >
            <span style={{ width: `${pct}%` }} />
          </div>
        </>
      ) : null}

      {state === "ended" && winnerName ? (
        <>
          {/* المفتاحُ باسم الفائز: تُعاد الزينةُ مع كلّ إعلانٍ جديد لا مرّةً واحدة. */}
          <div key={winnerName} className="gwrd-confetti" aria-hidden>
            {CONFETTI.map((p, i) => (
              <span
                key={i}
                style={
                  {
                    "--x": `${p.x}%`,
                    "--d": `${p.d}s`,
                    "--t": `${p.t}s`,
                    "--r": `${p.r}deg`,
                    "--c": p.c,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
          <p className="gwrd-winner">
            {icons.winner}
            الفائز: {winnerName}
          </p>
        </>
      ) : null}
    </div>
  );
}
