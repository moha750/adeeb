"use client";

import { DotsThree, Heart, LinkSimple, LinkedinLogo, TelegramLogo, WhatsappLogo, XLogo } from "@phosphor-icons/react";
import { Check } from "@/app/_components/glyphs";
import { arCount, type ArForms } from "@/lib/arabicCount";
import { useShare } from "./useShare";

export const AR_LIKE: ArForms = ["إعجابٌ واحد", "إعجابان", "إعجابات", "إعجابًا"];
export const AR_COMMENT: ArForms = ["تعليقٌ واحد", "تعليقان", "تعليقات", "تعليقًا"];

/**
 * **خاتمةُ الخبر: «سطرُ الترويسة»** (المالك ٢٠٢٦-١٠-١٤، من أربعة نماذج).
 * ختامٌ صحفيٌّ بلا صندوق يعطي الصفحةَ نَفَسًا بين المعرض وشريط التعليقات:
 *   · «هل أعجبك الخبر؟» ودائرةُ إعجابٍ كحليّةٌ تحتها لفظُ «أعجبني» (فلا يُخمَّن ما تفعل)،
 *     والعددُ شارةٌ على طرفها، **والدائرةُ كلُّها تحمرّ** بالإعجاب لا القلبُ وحدَه.
 *   · «شارك الخبر على» بين خطّين كسطر التاريخ في ترويسة الأخبار، ثمّ زرٌّ **باسم كلّ منصّة**.
 * رُدّ قبله: بطاقةٌ مؤطَّرة، وسطرٌ رماديّ، وكبسولةُ أيقونات، وقسمان بأزرارٍ ملوّنة، ولوحٌ كحليّ، وختم، وغلافٌ زجاجيّ.
 */
export function ReaderEnd({
  likes, liked, onLike, url, title,
}: {
  likes: number; liked: boolean; onLike: () => void; url: string; title: string;
}) {
  const { links, copy, copied, native, more } = useShare(url, title);
  const dests = [
    { href: links.whatsapp, label: "واتساب", Icon: WhatsappLogo },
    { href: links.x, label: "إكس", Icon: XLogo },
    { href: links.telegram, label: "تيليجرام", Icon: TelegramLogo },
    { href: links.linkedin, label: "لينكدإن", Icon: LinkedinLogo },
  ];

  return (
    <div className="art-close">
      <p className="art-close-q">هل أعجبك الخبر؟</p>
      <button
        type="button" className="art-like" aria-pressed={liked} onClick={onLike}
        aria-label={likes ? `أعجبني، ${arCount(likes, AR_LIKE)}` : "أعجبني"}
      >
        <span className="art-like-c">
          <Heart size={30} weight={liked ? "fill" : undefined} aria-hidden />
          {likes ? <b>{likes}</b> : null}
        </span>
        {/* **اللفظُ يؤكّد الضغطة** (المالك ٢٠٢٦-١٠-١٤): اللونُ وحدَه لا يكفي من لم يعتد المنصّات،
            و«نعم، أعجبني» جوابُ القارئ بصوته على «هل أعجبك الخبر؟». والضغطةُ الثانية تُرجعه. */}
        <span className="art-like-t" aria-hidden>{liked ? "نعم، أعجبني" : "أعجبني"}</span>
      </button>

      <p className="art-close-rule"><span>شارك الخبر على</span></p>
      <div className="art-share" data-n={dests.length + 1 + (native ? 1 : 0)} role="group" aria-label="شارك الخبر">
        {dests.map(({ href, label, Icon }) => (
          <a key={label} className="art-share-b" href={href} target="_blank" rel="noopener noreferrer">
            <Icon size={19} aria-hidden /><span>{label}</span>
          </a>
        ))}
        {native ? (
          <button type="button" className="art-share-b" onClick={more}>
            <DotsThree size={19} aria-hidden /><span>المزيد</span>
          </button>
        ) : null}
        <button type="button" className="art-share-b art-share-copy" onClick={copy} data-done={copied || undefined}>
          {copied ? <Check aria-hidden /> : <LinkSimple size={19} aria-hidden />}
          <span>{copied ? "نُسخ الرابط" : "نسخ الرابط"}</span>
        </button>
      </div>
      <span className="sr-only" aria-live="polite">{copied ? "نُسخ الرابط" : ""}</span>
    </div>
  );
}
