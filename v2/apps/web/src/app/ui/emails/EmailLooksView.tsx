"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Segmented } from "@adeeb/design-system";

type Font = "adeeb" | "desktop" | "phone";
export type MailRow = { key: string; when: string; subject: string; html: Record<Font, string> };

const FONTS = [
  { value: "phone", label: "تطبيق Gmail على الآيفون" },
  { value: "desktop", label: "Gmail على الحاسوب" },
  { value: "adeeb", label: "بريد أبل" },
];

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
    const first = ref.current?.contentDocument?.body?.firstElementChild;
    if (first) setHeight(Math.ceil(first.getBoundingClientRect().height));
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(fit);
    return () => cancelAnimationFrame(id);
  }, [width, fit]);

  const onLoad = () => {
    fit();
    ref.current?.contentDocument?.fonts?.ready.then(fit).catch(() => {});
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

export default function EmailLooksView({ groups }: { groups: Array<{ title: string; rows: MailRow[] }> }) {
  const [width, setWidth] = useState("375");
  const [font, setFont] = useState<Font>("phone");

  return (
    <>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Segmented items={WIDTHS} value={width} onValueChange={setWidth} aria-label="عرض الشاشة" />
        <span className="text-sm text-content-muted">الشاشةُ التي تُقرأ فيها الرسالة</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Segmented items={FONTS} value={font} onValueChange={(v) => setFont(v as Font)} aria-label="برنامج البريد" />
        <span className="text-sm text-content-muted">البرنامجُ الذي تُقرأ فيه، ومعه خطُّه</span>
      </div>

      {groups.map((g) => (
        <section key={g.title} className="mt-14">
          <h2 className="font-display text-2xl font-black text-content">{g.title}</h2>
          <div className="mt-4 grid gap-10 lg:grid-cols-2">
            {g.rows.map((r) => (
              <div key={r.key}>
                <p className="font-display text-lg font-bold text-content">{r.subject}</p>
                <p className="mb-2 text-sm text-content-muted">
                  {r.when}، <span className="font-latin" dir="ltr">{r.key}</span>
                </p>
                <Mail html={r.html[font]} width={width} title={r.subject} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
