"use client";

/**
 * **معرضُ الصور** (`AdGallery`، اعتمده محمد ٢٠٢٦-١١-١٣): صورٌ كثيرةٌ تُرفع وتُحذف، ولكلٍّ مصوّرُها. حقلُ الصورة
 * المعتمد (`AdImageField`) يحمل صورةً واحدة. ويُبنى من قطعٍ معتمدة: **منطقةُ الإفلات نفسُها** من حقل الرفع (`AdUpload add`،
 * وتقبل صورًا كثيرةً معًا)، و**سطرُ «حسابي»**، و**زرُّ الحذف بالأيقونة** (ختمُ الخطر، للقوائم المتكرّرة).
 * **سطورٌ** (اختارها محمد ٢٠٢٦-١١-١٣ من اتّجاهين — والآخرُ شبكةُ بلاطات، رُدّت: زرُّ حذفٍ أحمرُ تحت كلّ صورة، والأحمرُ مرّةً واحدة): الصورةُ
 * مصغّرةً في موضع رمز السطر، ثمّ رقمُها ونسبتُها، وزرُّ الحذف في طرفه؛ ومنطقةُ الإفلات تحتها. والسطورُ من حافّة القسم إلى حافّته كسطور «حسابي».
 * الرفعُ والحذفُ يُحفظان لحظتَهما كما كانا (لا ينتظران «حفظ التغييرات»)، والحذفُ بتأكيدٍ من الغرفة.
 */
import { Camera } from "@phosphor-icons/react";
import { Trash, UploadSimple } from "@/app/_components/glyphs";
import { AdButton, AdIconButton } from "./primitives";
import { AdUpload } from "./upload";


export function AdGallery({ images, photographers, editable, credits, max, busy, accept, onFiles, onRemove, onCredit, title }: {
  images: string[];
  photographers: string[];
  editable: boolean;
  /** الحدّ: بلغه المعرضُ فتغيب منطقةُ الإفلات (والزائدُ القديمُ يُعرض ليُحذف) */
  max: number;
  /** يملك نسبةَ الصور (حقلُ «مصوّرو المعرض» في التكليف): السطرُ زرٌّ يفتح مصوّرَ صورته */
  credits?: boolean;
  onCredit?: (index: number) => void;
  /** عددُ ما يُرفع الآن */
  busy: number;
  accept: string;
  onFiles: (files: File[]) => void;
  onRemove: (index: number) => void;
  /** عنوانُ الخبر: نصُّ الصورة البديل */
  title: string;
}) {
  const by = (i: number) => (photographers[i] ? `عدسة ${photographers[i]}` : "بلا مصوّر");

  // الإضافةُ منطقةُ الإفلات المعتمدة نفسُها (`AdUpload add`)، تقبل صورًا كثيرةً معًا، وتغيب حين يبلغ المعرضُ حدَّه
  const dropZone = !(editable && images.length < max) ? null : (
    <AdUpload add multiple bare={!images.length} label="إضافة صور" icon={<UploadSimple />} value={null} busy={busy} accept={accept} alt=""
      onFiles={onFiles} />
  );

  return (
    <div className="ad-gal form-full">
      {images.length ? (
        <ul className="ad-lines ad-gal-lines" aria-label="صور المعرض">
          {images.map((src, i) => (
            <li key={src} className="ad-line">
              {(() => {
                const body = (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="ad-gal-thumb" src={src} alt={`${title}، الصورة ${i + 1}`} referrerPolicy="no-referrer" loading="lazy" />
                    <span className="ad-line-kv">
                      <span className="ad-line-k">{`الصورة ${i + 1}`}</span>
                      <span className="ad-line-v" data-tone={photographers[i] ? undefined : "muted"}>{by(i)}</span>
                    </span>
                    {credits ? <span className="ad-btn ad-btn-soft ad-btn-sm ad-line-act" aria-hidden><Camera /><span className="ad-gal-act-t">المصوّر</span></span> : null}
                  </>
                );
                // السطرُ زرُّ نسبته (فعلُه «المصوّر» في طرفه كسطور «حسابي»)، والحذفُ بجانبه خارجَه: زرٌّ لا يحمل زرًّا
                return credits && onCredit
                  ? <button type="button" className="ad-line-hit" onClick={() => onCredit(i)} aria-label={`مصوّر الصورة ${i + 1}: ${by(i)}`}>{body}</button>
                  : <div className="ad-line-hit">{body}</div>;
              })()}
              {/* الحذفُ ختمٌ بأيقونته في العريض (قطعةُ القوائم المتكرّرة) */}
              {editable ? <span className="ad-gal-x"><AdIconButton danger label={`حذف الصورة ${i + 1}`} icon={<Trash />} onClick={() => onRemove(i)} /></span> : null}
              {/* **وفي الضيّق سطرُ أفعالٍ تحت الاسم**: «المصوّر» و«حذف» زرّان متجاوران بشكلٍ واحد، يبدآن من أوّل الاسم (محمد ٢٠٢٦-١١-١٣:
                  «كذا سيكون أجمل في اتساق بصري»، ثمّ: الحذفُ في أقصى الطرف و«المصوّر» في شبه المنتصف «شلون هذا كذا؟») */}
              {(credits && onCredit) || editable ? (
                <span className="ad-gal-row">
                  {credits && onCredit ? <AdButton variant="soft" size="sm" icon={<Camera />} onClick={() => onCredit(i)}>المصوّر</AdButton> : null}
                  {editable ? <AdButton variant="danger" size="sm" icon={<Trash />} onClick={() => onRemove(i)}>حذف</AdButton> : null}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {dropZone}
    </div>
  );
}
