"use client";

import { cn } from "../lib/cn";

export interface DirectionPadProps {
  /** الزاوية بالدرجات: صفرٌ يمينًا، وتدور مع عقارب الساعة. */
  value: number;
  onValueChange: (deg: number) => void;
  "aria-label"?: string;
  className?: string;
}

/** الجهاتُ الثماني بأسمائها ودرجاتها. الترتيبُ ترتيبُ خانات الشبكة (ثلاثٌ في ثلاث). */
const CELLS: ({ deg: number; label: string } | null)[] = [
  { deg: 225, label: "أعلى اليسار" }, { deg: 270, label: "أعلى" }, { deg: 315, label: "أعلى اليمين" },
  { deg: 180, label: "يسار" }, null, { deg: 0, label: "يمين" },
  { deg: 135, label: "أسفل اليسار" }, { deg: 90, label: "أسفل" }, { deg: 45, label: "أسفل اليمين" },
];

/**
 * **لوحُ الجهات** — ثمانيةُ اتّجاهاتٍ تُنقر، والسهمُ في كلّ خانةٍ يشير إلى وِجهته.
 *
 * أوضحُ من قرصٍ وأسرع (نقرةٌ واحدة بلا تصويب)، وأضيقُ منه حرّيّةً: ثماني زوايا لا ٣٦٠.
 * والسهمُ **مرسومٌ لا أيقونةُ مكتبة**: هو دوّارُ الخانة نفسِها يُدار بزاويتها، فلا يحتاج
 * ثمانيةَ رموز.
 */
export function DirectionPad({ value, onValueChange, "aria-label": label, className }: DirectionPadProps) {
  const at = ((Math.round(value) % 360) + 360) % 360;
  return (
    <div className={cn("dpad", className)} role="group" aria-label={label}>
      {CELLS.map((c, i) =>
        c ? (
          <button
            key={c.deg}
            type="button"
            className={cn("dpad-cell", at === c.deg && "on")}
            style={{ ["--dpad-a" as string]: `${c.deg}deg` }}
            aria-label={c.label}
            aria-pressed={at === c.deg}
            onClick={() => onValueChange(c.deg)}
          >
            <svg viewBox="0 0 24 24" aria-hidden focusable="false">
              <path d="M4 12h13M12 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : (
          <span key={i} className="dpad-mid font-latin" aria-hidden>{at}°</span>
        ),
      )}
    </div>
  );
}
