"use client";

import { useState } from "react";
import { Lightbox, type LightboxShot } from "@adeeb/design-system";
import { Camera } from "@phosphor-icons/react";
import { X } from "@/app/_components/glyphs";

/** ما يُعرض في الشبكة: أربعٌ، والرابعةُ تحمل «+N» إن زاد المعرض — والعارضُ يحمل الكلّ. */
const SHOWN = 4;

/**
 * معرضُ صور الخبر — **شبكةٌ تُرتَّب بعدد صورها** (المالك ٢٠٢٦-١٠-١٤)، تُنقَر فتكبر.
 *
 * كانت شبكةً منسابةً بأساس ١٥rem: على الحاسوب ثلاثٌ صغيرةٌ في صفٍّ ثمّ الرابعةُ وحدَها
 * بعرض المقال كلِّه (٩٢٨×٦٩٦ — أكبرُ صورةٍ في الصفحة، أكبرُ من الغلاف، بالمصادفة)،
 * وعلى الجوّال أربعُ صورٍ مكدّسةٌ بطول ١٠٧٧px. والآن لكلّ عددٍ ترتيبٌ يملأ صفوفَه (ق٦):
 * الأولى صدرُ المعرض، وما بعدها حولها. والترتيبُ في الـCSS بـ`data-n`.
 *
 * **واسمُ المصوّر على كلّ صورة** (المالك ٢٠٢٦-١٠-١٤): حبّةٌ زجاجيّةٌ في منتصف قاعها كنسبة
 * الغلاف، فتُنسَب كلُّ صورةٍ إلى عدستها قبل أن تُفتح. **والاسمُ وحدَه بعد أيقونة الكاميرا**
 * بلا لفظ «عدسة»: في مربّعات الجوّال الصغيرة (١٠٥px) قُصّ «عدسة روان…» فضاع الاسمُ نفسُه،
 * والكاميرا تقول «عدسة» بلا حرف. والعارضُ يقولها كاملة.
 */
export function ArticleGallery({
  images,
  photographers,
  title,
}: {
  images: string[];
  photographers: string[];
  title: string;
}) {
  const [open, setOpen] = useState<number | null>(null);

  const shots: LightboxShot[] = images.map((src, i) => ({
    src,
    alt: `${title}، صورة ${i + 1}`,
    by: photographers[i] || null,
  }));

  if (!images.length) return null;
  const shown = shots.slice(0, SHOWN);
  const more = shots.length - SHOWN;

  return (
    <>
      <div className="art-gal" data-n={shown.length}>
        {shown.map((s, i) => (
          <figure key={s.src} className="art-shot">
            <button type="button" onClick={() => setOpen(i)} aria-label={`افتح ${s.alt}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.src} alt={s.alt} loading="lazy" />
              {s.by ? (
                <span className="art-shot-by" title={`عدسة ${s.by}`}><Camera size={12} aria-label="عدسة" /><span>{s.by}</span></span>
              ) : null}
              {i === SHOWN - 1 && more > 0 ? <span className="art-shot-more">+{more}</span> : null}
            </button>
          </figure>
        ))}
      </div>

      <Lightbox
        shots={shots}
        index={open}
        onClose={() => setOpen(null)}
        onIndex={setOpen}
        emptyBy="بلا نسبة"
        byIcon={<Camera size={14} aria-hidden />}
        closeIcon={<X aria-hidden />}
      />
    </>
  );
}
