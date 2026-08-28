"use client";

import { useState } from "react";

/**
 * مصغّرةُ يوتيوب بأعلى دقّةٍ **متاحة**.
 *
 * `maxresdefault` تعطي ١٢٨٠×٧٢٠ لكنّها **غير موجودةٍ لكلّ فيديو** (تلزمها دقّةُ
 * مصدرٍ عالية)، فطلبُها وحدَه يترك مربّعًا فارغًا. و`hqdefault` مضمونةٌ لكلّ
 * فيديو لكنّها ٤٨٠ فترتخي على شاشةٍ مضاعفة.
 *
 * فتُطلَب العاليةُ أوّلًا ويُرتدّ إلى المضمونة عند الفشل — ولا يُعرَف أيُّهما
 * موجودةٌ إلّا بالمحاولة، فلذلك عميليّ.
 *
 * ونسبتُها ١٦:٩ في العالية و٤:٣ في المضمونة (بشريطين أسودين)، و`object-fit:
 * cover` يقصّ الشريطين فيستوي الشكلان في الإطار نفسِه.
 */
export function YoutubeThumb({ id, alt }: { id: string; alt: string }) {
  const [src, setSrc] = useState(`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="stn-yt-img"
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setSrc(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`)}
    />
  );
}
