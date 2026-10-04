"use client";

import { useState } from "react";
import { Lightbox, type LightboxShot } from "@adeeb/design-system";
import { Camera } from "@phosphor-icons/react";
import { X } from "@/app/_components/glyphs";

/**
 * معرضُ صور الخبر — **تُنقَر فتكبر**.
 *
 * وكان قبلَه ثلاثةَ كروتٍ مرصوفةً لا تُفتَح: صورةُ الحدث تُعرَض بعرض ٣٤٥ بكسل ولا
 * سبيلَ إلى رؤيتها، وهي أغلى ما في تغطيةٍ مصوَّرة. وأوّلُ الصور تأخذ ضِعفَ إخوتها
 * على السعة لأنّ معرضًا من أربعٍ متساويةٍ شبكةٌ لا معرض.
 *
 * والنسبةُ إلى المصوّر تُقال **في العارض** لا تحت كلّ مصغّرة: الاسمُ تحت صورةٍ
 * بحجم الإبهام سطرٌ يُزاحم ولا يُقرأ، وفي العارض هو أوّلُ ما تقع عليه العين.
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

  return (
    <>
      <div className="art-gal">
        {shots.map((s, i) => (
          <figure key={s.src} className="art-shot">
            <button type="button" onClick={() => setOpen(i)} aria-label={`افتح ${s.alt}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.src} alt={s.alt} loading="lazy" />
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
