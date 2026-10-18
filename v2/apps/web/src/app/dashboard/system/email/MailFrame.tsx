"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * **رسالةُ بريدٍ معروضةً كما تصل** — مصدرٌ واحدٌ لمعرض `/ui/emails` ولصفحة الرسالة في سجلّ البريد.
 *
 * في إطارٍ معزول (`srcDoc`): لا تبلغها أوراقُ الموقع، كصندوق البريد. وطولُه يتبع محتواه، فيُقاس عند التحميل
 * وكلّما تبدّل عرضُه أو وصل الخطّ. وبلا نصوصٍ تجري فيه (`sandbox`)، وروابطُه تفتح خارجه.
 */
export function MailFrame({ html, width = 600, title }: { html: string; width?: number; title: string }) {
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
      style={{ height, maxWidth: width }}
    />
  );
}
