"use client";

import { useState } from "react";

/**
 * نصٌّ يُطوى عند الطول ويُعرض كاملًا عند القِصَر.
 *
 * والعتبةُ **تُقاس ولا تُظنّ**: زرُّ «المزيد» لا يظهر إلّا إن كان النصّ أطولَ
 * ممّا يسع ستّةَ أسطر، وإلّا صار الزرُّ يَعِد بشيءٍ لا وجود له. ولا حساب
 * سطورٍ حقيقيًّا هنا (يلزمه قياسُ الرسم)، فالتقديرُ بعدد الحروف: تقريبٌ خشن
 * يخطئ في الاتّجاه الآمن — يعرض كاملًا ما كان قريبًا من الحدّ.
 */
const CHARS_PER_SIX_LINES = 420;

export function FoldedText({ text, className = "stn-desc" }: { text: string; className?: string }) {
  const foldable = text.length > CHARS_PER_SIX_LINES;
  const [open, setOpen] = useState(false);

  return (
    <div>
      <p className={`${className}${foldable && !open ? " is-clamped" : ""}`}>{text}</p>
      {foldable ? (
        <button type="button" className="stn-textbtn" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? "أقلّ" : "المزيد"}
        </button>
      ) : null}
    </div>
  );
}
