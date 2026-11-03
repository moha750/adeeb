import { hilal } from "@/lib/vision/geometry";

/**
 * **هلالُ الرؤية** — علامتُها حيّةً من بياناتها: قطعةٌ لكلّ هدف تُضاء حين يتحقّق (`on`)، وطبقةٌ لكلّ مسار.
 * بلا حالٍ ولا خطّافات: ترسمه الصفحةُ العلنيّة على الخادم وغرفةُ المتابعة في البوّابة بالمكوّن نفسِه.
 *
 * - `counts`: عددُ أهداف كلّ مسارٍ بترتيبه (الأوّلُ الطبقةُ الخارجيّة).
 * - `on[track][goal]`: المتحقّقُ يُضاء، والباقي باهتٌ يُرى شكلُه ولا يُضاء.
 * - `focus`: مسارٌ واحدٌ تُرى طبقتُه وتخفت البقيّة (رأسُ المسار في الصفحة والغرفة).
 * - `paper`: على الورقة (حبرُ الهويّة الكحليّ) لا على اللوح (حبرُه الأبيض).
 * - `titles`: اسمُ كلّ قطعة — يظهر حين يمرّ المؤشّر عليها.
 * - `hrefs`: كلُّ قطعةٍ رابطٌ إلى بطاقة هدفها (محمد ٢٠٢٦-١١-٠٣: «الضغط على القطعة نعم») — فالجوّالُ الذي لا مؤشّرَ فيه
 *   يصل إلى الهدف باللمس، والحاسبُ بالنقر بعد التلميح.
 *
 * الألوانُ من أدوار الهويّة في `ad.css` (`.vz-tile`)، فالوضعُ الداكن يتبعها بلا سطرٍ هنا.
 */
export function VisionMark({
  counts, on, focus, paper, titles, hrefs, label, className,
}: {
  counts: number[];
  on?: boolean[][];
  focus?: number;
  paper?: boolean;
  titles?: string[][];
  hrefs?: string[][];
  label?: string;
  className?: string;
}) {
  const h = hilal(counts);
  return (
    <svg
      className={"vz-mark" + (className ? ` ${className}` : "")}
      viewBox={h.viewBox}
      data-paper={paper || undefined}
      data-focus={focus !== undefined || undefined}
      role={hrefs ? "group" : label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {h.tiles.map((t) => {
        const key = `${t.layer}-${t.index}`;
        const title = titles?.[t.layer]?.[t.index];
        const href = hrefs?.[t.layer]?.[t.index];
        const tile = (
          <path
            key={key}
            className="vz-tile"
            d={t.d}
            data-on={on?.[t.layer]?.[t.index] || undefined}
            data-off={(focus !== undefined && t.layer !== focus) || undefined}
          >
            {title ? <title>{title}</title> : null}
          </path>
        );
        return href ? <a key={key} href={href} aria-label={title}>{tile}</a> : tile;
      })}
    </svg>
  );
}
