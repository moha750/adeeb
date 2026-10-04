"use client";

import { Card, CardFooter, CardHeader, CardMedia, IconButton } from "@adeeb/design-system";
import { ArrowDown, ArrowUp, X } from "@/app/_components/glyphs";
import { fmtDate } from "@/lib/dates";
import type { HeroNewsRow } from "../data";

const HIDDEN_SAY: Record<NonNullable<HeroNewsRow["hidden"]>, string> = {
  unpublished: "لا يظهر: الخبر غير منشور",
  "no-cover": "لا يظهر: الخبر بلا غلاف",
};

type Props = {
  row: HeroNewsRow;
  /** موضعه (1-based) — وهو ترتيبُ مروره في العارض. */
  order: number;
  canUp: boolean;
  canDown: boolean;
  busy: boolean;
  onMove: (dir: "up" | "down") => void;
  onRemove: () => void;
};

/**
 * كرتُ خبرٍ في العارض — **كرتُ العمل الأفقيّ نفسُه** (`WorkCard` في الغرفة المجاورة):
 * صورةٌ جانبيّةٌ ثمّ رأسٌ وذيل. فالخبرُ في الصدر صورةٌ قبل أن يكون عنوانًا، والكرتُ
 * الذي يعرف صورتَه موجودٌ في المكتبة، فلا شكلَ يُخترَع له.
 *
 * **والنغمةُ تقول الحال كما في كرت الإعلان:** أخضرُ لما يمرّ، وأصفرُ لما بقي في
 * الاختيار ولا يمرّ (أُرشف أو نُزع غلافُه في غرفة التحرير)، والسببُ سطرُ الرأس.
 *
 * والأفعالُ في وجهه أزرارًا لا خلف نقاط (أمرُ المالك في كرت الإعلان ٢٠٢٦-٠٩-١٩).
 * والإزالةُ `X` لا سلّةٌ: تُخرج الخبرَ من العارض ولا تمسّه.
 */
export function HeroNewsCard({ row, order, canUp, canDown, busy, onMove, onRemove }: Props) {
  return (
    <Card horizontal tone={row.hidden ? "warning" : "success"}>
      <CardMedia image={row.imageUrl ?? undefined} alt={row.title} />
      <div className="flex min-w-0 flex-col">
        <CardHeader
          className="acard-header-clip"
          title={row.title}
          subtitle={row.hidden ? HIDDEN_SAY[row.hidden] : fmtDate(row.publishedAt)}
        />
        <CardFooter>
          <span className="flex items-center gap-1">
            <span className="text-sm text-content-muted">
              الترتيب <b className="font-latin text-content">{order}</b>
            </span>
            <IconButton
              size="lg"
              disabled={busy || !canUp}
              aria-label="تحريك لأعلى"
              title="تحريك لأعلى"
              onClick={() => onMove("up")}
            >
              <ArrowUp aria-hidden />
            </IconButton>
            <IconButton
              size="lg"
              disabled={busy || !canDown}
              aria-label="تحريك لأسفل"
              title="تحريك لأسفل"
              onClick={() => onMove("down")}
            >
              <ArrowDown aria-hidden />
            </IconButton>
          </span>
          <span className="flex items-center justify-end">
            <IconButton
              size="lg"
              disabled={busy}
              aria-label="إزالة من الصدر"
              title="إزالة"
              onClick={onRemove}
            >
              <X aria-hidden />
            </IconButton>
          </span>
        </CardFooter>
      </div>
    </Card>
  );
}
