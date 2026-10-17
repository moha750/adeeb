"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { copyText } from "@/lib/clipboard";

/**
 * **المشاركةُ أزرارٌ صريحة لا زرٌّ يُخمَّن ما يفعل** (المالك ٢٠٢٦-١٠-١٤): كان زرٌّ واحدٌ يفتح
 * ورقةَ النظام، فإن ألغاها القارئُ **نسخ الرابطَ من تلقاء نفسه** — فعلٌ لم يُطلب. فصار لكلّ
 * وجهةٍ زرُّها (المنصّاتُ الأكثرُ استعمالًا في السعوديّة) وللنسخ زرُّه، و«المزيد» يفتح ورقةَ
 * النظام حيث وُجدت **ولا يفعل شيئًا إن أُلغيت**.
 */
const none = () => () => {};

export function useShare(url: string, title: string) {
  const [copied, setCopied] = useState(false);
  // المصدرُ وورقةُ النظام من المتصفّح وحده؛ والخادمُ يرسم بلا «المزيد» ثمّ يُكمله العميل بلا تعارض.
  const origin = useSyncExternalStore(none, () => window.location.origin, () => "");
  const native = useSyncExternalStore(none, () => typeof navigator.share === "function", () => false);
  const full = origin ? new URL(url, origin).toString() : url;

  const copy = useCallback(async () => {
    try {
      await copyText(full);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      /* تعذّر النسخ — لا نَعِد بما لم يقع */
    }
  }, [full]);

  const more = useCallback(async () => {
    try {
      await navigator.share({ title, url: full });
    } catch {
      /* ألغاها القارئ: لا شيء */
    }
  }, [full, title]);

  const u = encodeURIComponent(full);
  const t = encodeURIComponent(title);
  const links = {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${title}\n${full}`)}`,
    x: `https://x.com/intent/post?text=${t}&url=${u}`,
    telegram: `https://t.me/share/url?url=${u}&text=${t}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
  };

  return { links, copy, copied, native, more };
}
