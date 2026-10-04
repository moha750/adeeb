"use client";

import { useState } from "react";
import { ChatCircle, Heart, ShareNetwork } from "@phosphor-icons/react";
import { Check } from "@/app/_components/glyphs";
import { copyText } from "@/lib/clipboard";
import { arCount, type ArForms } from "@/lib/arabicCount";

export const AR_LIKE: ArForms = ["إعجابٌ واحد", "إعجابان", "إعجابات", "إعجابًا"];
export const AR_COMMENT: ArForms = ["تعليقٌ واحد", "تعليقان", "تعليقات", "تعليقًا"];

/**
 * شريطُ القارئ — **الأفعالُ الثلاثة التي كانت غائبةً كلَّها**: إعجابٌ وتعليقٌ ومشاركة.
 *
 * والإعجابُ كان رقمًا ساكنًا لا زرًّا: في القاعدة خمسةٌ وخمسون إعجابًا حيًّا لا سبيلَ
 * إلى زيادتها من الموقع، لأنّ الواجهةَ تقرأ `likes_count` ولا تكتب شيئًا.
 *
 * **والتفاؤلُ في العرض مقصود:** القلبُ يمتلئ قبل أن يردّ الخادم ويرتدّ إن ردّ بخطأ.
 * نقرةٌ تنتظر دورةَ شبكةٍ لتُرى تبدو معطوبة.
 *
 * **والمشاركةُ طريقان لا واحد:** ورقةُ النظام (`navigator.share`) حيث وُجدت — وهي
 * الجوّالُ، واللوحةُ منتَجُ جوّالٍ بالقياس — ونسخُ الرابط حيث لا توجد. ولا تُبنى
 * صفوفُ أيقوناتٍ لتويتر وواتساب وفيسبوك: ورقةُ النظام تُعطي وجهاتِ الجهاز كلَّها
 * ومنها ما لا نعرفه.
 */
export function ReaderBar({
  likes,
  liked,
  comments,
  onLike,
  onComment,
  url,
  title,
  className = "art-bar",
}: {
  likes: number;
  liked: boolean;
  comments: number;
  onLike: () => void;
  onComment: () => void;
  url: string;
  title: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const full = typeof window === "undefined" ? url : new URL(url, window.location.origin).toString();
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url: full });
        return;
      } catch {
        /* ألغى المستخدمُ الورقةَ أو ردّها المتصفّح ⇒ النسخُ أدناه */
      }
    }
    try {
      await copyText(full);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      /* تعذّر النسخُ بطريقيه — لا نَعِد بما لم يقع */
    }
  }

  return (
    <div className={className}>
      <button type="button" className="art-act" aria-pressed={liked} onClick={onLike}>
        {/* القلبُ يبقى duotone كسائر الموقع: `weight="fill"` بيدِ الشاشة هو البابُ
            الثالثُ الذي تركه حارسُ الأوزان مفتوحًا عمدًا انتظارًا لكلمة المالك. والحالُ
            مقولةٌ بأربعة غيرِه: اللونُ والأرضُ والحدُّ ونصُّ الزرّ (ق١٠ — لا لونَ وحدَه). */}
        <Heart size={18} aria-hidden />
        {likes ? <b>{likes}</b> : null}
        <span>{liked ? "أعجبَني" : "إعجاب"}</span>
      </button>

      <button type="button" className="art-act" onClick={onComment}>
        <ChatCircle size={18} aria-hidden />
        {comments ? <b>{comments}</b> : null}
        <span>تعليق</span>
      </button>

      <span className="art-bar-sp" aria-hidden />

      <button type="button" className="art-act" onClick={share}>
        {copied ? <Check aria-hidden /> : <ShareNetwork size={18} aria-hidden />}
        <span>{copied ? "نُسخ الرابط" : "شارك"}</span>
      </button>
    </div>
  );
}

/** سطرُ الحصيلة تحت المقال: «٥ إعجابات، تعليقان» بفاصلةٍ عربيّةٍ لا نقطةٍ ولا شريط. */
export function tallyLine(likes: number, comments: number): string {
  const parts: string[] = [];
  if (likes) parts.push(arCount(likes, AR_LIKE));
  if (comments) parts.push(arCount(comments, AR_COMMENT));
  return parts.join("، ");
}
