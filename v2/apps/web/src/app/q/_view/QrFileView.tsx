import Link from "next/link";
import { FilePdf } from "@phosphor-icons/react/dist/ssr";
import { DownloadSimple } from "@/app/_components/glyphs";
import { ICON_WEIGHT } from "@/lib/iconWeight";

/**
 * **ما يراه من يمسح باركودًا وجهتُه ملف** (م٢١ وم٢٤).
 *
 * **الصورةُ وحدها** على مسرحٍ كحليٍّ كعارض الصور في الجوّال — اختارها المالك من `/ui/qr-image`
 * (٢٠٢٦-١٠-٠٨)، وأُعدمت أختُها («صفحةٌ من الموقع» برأسه وشفقه): رأسُ الموقع يقتطع من الصورة على
 * الجوّال، ومن مسح ملصقًا جاء ليرى الصورة لا ليتصفّح.
 *
 * **والـPDF بطاقةٌ على المسرح نفسِه** — اختارها المالك (٢٠٢٦-١٠-٠٨) على فتحٍ مباشرٍ بلا صفحة.
 * الـPDF لا يُعرَض داخل صفحةٍ على الجوّال: سفاري يُري صفحتَه الأولى وحدها، وكروم أندرويد لا يعرضه
 * أصلًا بل يُنزّله. فالبطاقةُ تقول ما هو، وتُسلّمه لعارض الجهاز بزرّ: يبقى توقيعُ أدِيب، ولا يُفاجَأ
 * ماسحُ أندرويد بتنزيلٍ لم يطلبه.
 *
 * والصفحةُ لا تحمل اسمَ الباركود: الاسمُ «تكتبه لك أنت لتعرفه بين باركوداتك، ولا يظهر لمن
 * يمسحه» (شاشةُ الإنشاء). فلا يبقى فيها إلّا الملفُّ وتوقيعُ أدِيب وفعلاه.
 */
export type QrFileViewProps = {
  /** رابطُ الملفّ العلنيّ. */
  src: string;
  /** رابطُ التنزيل: الملفُّ نفسُه بترويسة «احفظ» (`?download=` في المخزن). */
  save: string;
};

// صورةٌ من المخزن بمقاسها الأصليّ: مُصغِّرُ Next لا شأنَ له بها (صُغّرت قبل الرفع)
/* eslint-disable @next/next/no-img-element */

/** «مُشغَّل بواسطة» والشعار — توقيعُ الشريط السفليّ في الهيئتين. */
function Signature() {
  return (
    <Link href="/" className="qimg-by" aria-label="مُشغَّلٌ بواسطة نادي أدِيب">
      <span className="qimg-by-tx" aria-hidden>
        <span>مُشغَّل</span>
        <span>بواسطة</span>
      </span>
      <img src="/brand/logo-horizontal-white.svg" alt="" />
    </Link>
  );
}

export function QrImageView({ src, save }: QrFileViewProps) {
  return (
    <main className="qimg-stage">
      <div className="qimg-stage-pic">
        <img src={src} alt="الصورة" />
      </div>
      <div className="qimg-bar">
        <Signature />
        <a className="abtn abtn-inverse abtn-md" href={save} download>
          <DownloadSimple /> احفظ الصورة
        </a>
      </div>
    </main>
  );
}

export function QrPdfView({ src, save }: QrFileViewProps) {
  return (
    <main className="qimg-stage">
      <div className="qimg-stage-pic">
        <div className="qimg-doc">
          <span className="qimg-doc-ic" aria-hidden><FilePdf weight={ICON_WEIGHT} /></span>
          <b>ملف PDF</b>
          <div className="btn-row">
            <a className="abtn abtn-inverse abtn-lg" href={src}>افتح الملف</a>
            <a className="abtn abtn-inverse-ghost abtn-lg" href={save} download>
              <DownloadSimple /> احفظه
            </a>
          </div>
        </div>
      </div>
      <div className="qimg-bar">
        <Signature />
      </div>
    </main>
  );
}
