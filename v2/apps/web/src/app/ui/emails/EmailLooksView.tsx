"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Segmented } from "@adeeb/design-system";

export type MailRow = { key: string; when: string; subject: string; band: string; letter: string };

const WIDTHS = [
  { value: "600", label: "حاسوب" },
  { value: "375", label: "جوّال" },
];

/**
 * الرسالةُ في إطارٍ معزول (`srcDoc`): لا تبلغها أوراقُ الموقع، كصندوق البريد. وطولُه يتبع محتواه، فيُقاس
 * عند التحميل وكلّما تبدّل عرضُه أو وصل الخطّ. وبلا نصوصٍ تجري فيه (`sandbox`).
 */
function Mail({ html, width, title }: { html: string; width: string; title: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(640);

  const fit = useCallback(() => {
    // طولُ المحتوى لا طولُ الإطار: `scrollHeight` لا ينقص عن ارتفاع النافذة، فيبقى الإطارُ طويلًا
    // بعد أن يتّسع العرضُ ويقصر النصّ.
    const body = ref.current?.contentDocument?.body;
    const first = body?.firstElementChild;
    if (first) setHeight(Math.ceil(first.getBoundingClientRect().height));
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(fit);
    return () => cancelAnimationFrame(id);
  }, [width, fit]);

  const onLoad = () => {
    fit();
    const doc = ref.current?.contentDocument;
    doc?.fonts?.ready.then(fit).catch(() => {});
  };

  return (
    <iframe
      ref={ref}
      title={title}
      srcDoc={html}
      onLoad={onLoad}
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      className="block w-full rounded border border-line"
      style={{ height, maxWidth: Number(width) }}
    />
  );
}

export default function EmailLooksView({ rows, names }: { rows: MailRow[]; names: { band: string; letter: string } }) {
  const [width, setWidth] = useState("375");

  return (
    <>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Segmented items={WIDTHS} value={width} onValueChange={setWidth} aria-label="عرض الشاشة" />
        <span className="text-sm text-content-muted">الشاشةُ التي تُقرأ فيها الرسالة</span>
      </div>

      {rows.map((r) => (
        <section key={r.key} className="mt-14">
          <h2 className="font-display text-2xl font-black text-content">{r.subject}</h2>
          <p className="mt-1 text-sm text-content-muted">
            {r.when}، <span className="font-latin" dir="ltr">{r.key}</span>
          </p>
          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            {(["band", "letter"] as const).map((look) => (
              <div key={look}>
                <p className="mb-2 font-display text-lg font-bold text-content">
                  {look === "band" ? "الوجه الأوّل" : "الوجه الثاني"}: {names[look]}
                </p>
                <Mail html={r[look]} width={width} title={`${r.subject}، ${names[look]}`} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
