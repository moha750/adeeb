"use client";

import { useState } from "react";
import { ShareNetwork } from "@phosphor-icons/react";
import { Check } from "@/app/_components/glyphs";
import { copyText } from "@/lib/clipboard";

/**
 * مشاركةُ الحلقة — **فعلٌ على الحلقة لا على التشغيل.**
 *
 * كانت في شريط المشغّل، وذلك موضعُ راحةِ الباني لا نموذجِ المستخدم: من أراد
 * أن يشارك حلقةً لا يبحث عن زرِّه بين أزرار الصوت والسرعة. فنُقلت إلى صدر
 * صفحة الحلقة حيث عنوانُها وتاريخُها (قرار المالك ٢٠٢٦-٠٨-١٣).
 *
 * ولا إشعارَ في الموقع العامّ، فالزرُّ نفسُه يقول «نُسخ» بعلامة صحٍّ لحظتين.
 */
export function ShareEpisode({ title, showTitle }: { title: string; showTitle: string }) {
  const [shared, setShared] = useState(false);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title, text: showTitle, url });
      else await copyText(url);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch { /* أُلغيت المشاركة أو مُنعت الحافظة، فلا شيء يُقال */ }
  };

  return (
    <button type="button" className="rad-chip" onClick={() => void share()}>
      {shared ? <Check size={15} aria-hidden /> : <ShareNetwork size={15} aria-hidden />}
      {shared ? "نُسخ الرابط" : "مشاركة"}
    </button>
  );
}
