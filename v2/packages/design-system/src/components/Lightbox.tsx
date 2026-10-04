"use client";

import { useCallback, useEffect, useId, useState, type ReactNode } from "react";
import { Dialog } from "./Dialog";
import { CarouselNav } from "./CarouselNav";

export type LightboxShot = {
  src: string;
  alt: string;
  /** نسبةُ الصورة — مصوّرُها. تُعرَض في قدم العارض، وتُترَك فارغةً لمن لا مصوّرَ له. */
  by?: string | null;
};

type Props = {
  shots: LightboxShot[];
  /** الصورةُ المفتوحة، أو `null` فالعارضُ مغلق. */
  index: number | null;
  onClose: () => void;
  onIndex: (i: number) => void;
  /** يُقال حين لا مصوّرَ للصورة. الصمتُ ليس خيارًا: القدمُ تقفز فراغًا. */
  emptyBy?: string;
  /** أيقونةُ النسبة — تأتي من المستدعي فلا تلزم المكتبةَ حزمةُ أيقونات. */
  byIcon?: ReactNode;
  closeIcon: ReactNode;
};

/**
 * **عارضُ الصور — صورةٌ تُفتَح كبيرةً، وحدَها أو في سربٍ يُتصفَّح.**
 *
 * يجلس على بدائيّة {@link Dialog}، فيرث فخَّ التركيز وقفلَ التمرير وESC وإرجاعَ
 * التركيز وحركةَ الدخول والخروج — ولا يُعاد بناءُ شيءٍ من ذلك.
 *
 * **وأسهمُ التصفّح وسطَ الشاشة تحت العارض** بـ{@link CarouselNav} لا غير (ق١١):
 * هي أسهمُ الموقع كلِّه، ولا تقبل محاذاةً بديلة. وتغيب إذا كانت الصورةُ واحدة.
 *
 * **والسهمان يعملان بلوحة المفاتيح كذلك** — من فتح صورةً من أربعٍ يتوقّع أن ينتقل
 * بينها بالسهمين، و`Dialog` يمسك ESC وحده.
 */
export function Lightbox({ shots, index, onClose, onIndex, emptyBy = "بلا نسبة", byIcon, closeIcon }: Props) {
  // نُبقي آخر صورةٍ معروضةً كي تُكمل حركةُ الإغلاق صورتَها بعد أن يصير index=null.
  // حالةٌ تُضبَط في الرسم لا مرجعٌ يُكتَب فيه (سابقةُ WorkLightbox بحرفها).
  const [shown, setShown] = useState<number | null>(index);
  if (index !== null && index !== shown) setShown(index);
  const i = index ?? shown ?? 0;
  const shot = shots[i];
  const titleId = useId();
  const many = shots.length > 1;

  const step = useCallback(
    (d: number) => onIndex((i + d + shots.length) % shots.length),
    [i, shots.length, onIndex]
  );

  // اتّجاهُ السهم بالمعنى لا بالرسم: في العربيّة «التالي» يسارًا، فسهمُ اليسار يتقدّم.
  useEffect(() => {
    if (index === null || !many) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); step(1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); step(-1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, many, step]);

  return (
    <Dialog open={index !== null} onClose={onClose} contentClassName="lbx" closeOnScrimClick labelledBy={titleId}>
      {shot ? (
        <>
          <div className="lbx-stage">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={shot.src} alt={shot.alt} className="lbx-img" />
            <button type="button" className="lbx-x" onClick={onClose} aria-label="إغلاق">
              {closeIcon}
            </button>
          </div>

          <div className="lbx-foot">
            <span id={titleId} className={"lbx-by" + (shot.by ? "" : " lbx-none")}>
              {byIcon}
              <span>{shot.by ? `عدسة ${shot.by}` : emptyBy}</span>
            </span>
            {many ? (
              <span className="lbx-count" dir="ltr">
                {i + 1}/{shots.length}
              </span>
            ) : null}
          </div>

          {many ? <CarouselNav onPrev={() => step(-1)} onNext={() => step(1)} className="mb-4" /> : null}
        </>
      ) : null}
    </Dialog>
  );
}
