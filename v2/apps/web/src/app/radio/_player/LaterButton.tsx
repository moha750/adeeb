"use client";

import { BookmarkSimple } from "@phosphor-icons/react";
import { toggleLater, useIsLater } from "@/lib/radio/later";

/**
 * **«اسمع لاحقًا»** — تأجيلٌ بضغطة، محفوظٌ في الجهاز (قرارُ المالك ٢٠٢٦-٠٨-٢٨).
 *
 * ولمَ زرٌّ مستقلٌّ لا قائمةُ خيارات؟ لأنّه **فعلٌ واحد**، وقائمةٌ ذاتُ بندٍ
 * واحدٍ ضغطتان بدل ضغطة. وحين تكثر الأفعال يومًا تُجمَع، لا اليوم.
 *
 * والحالُ تُقال بالشكل لا باللون وحدَه: العلامةُ تمتلئ حين يُؤجَّل، فمن لا
 * يميّز الألوانَ يقرؤها.
 */
export function LaterButton({ episodeId, title }: { episodeId: string; title: string }) {
  const on = useIsLater(episodeId);
  return (
    <button
      type="button"
      className="stn-opt"
      aria-pressed={on}
      onClick={() => toggleLater(episodeId)}
      aria-label={on ? `أزِل ${title} من «اسمع لاحقًا»` : `أجّل ${title} لتسمعه لاحقًا`}
    >
      <BookmarkSimple size={14} weight={on ? "fill" : undefined} aria-hidden />
      {on ? "مؤجَّلة" : "اسمع لاحقًا"}
    </button>
  );
}
