import { Container } from "@adeeb/design-system";
import { CreateLab } from "./CreateLab";

/**
 * **مختبرُ الباركود الذي وجهتُه صورة** — سؤالان ذوقيّان يُنظَران لا يُوصَفان (٢٠٢٦-١٠-٠٨).
 *
 * ١) **ما يراه من يمسح**: اختار المالكُ «الصورةَ وحدها» على مسرحٍ كحليّ (وأُعدمت «صفحةٌ من الموقع»).
 * ٢) **ملف PDF**: بطاقةٌ على المسرح تفتحه بزرّ (وأُعدم الفتحُ المباشر).
 * ٣) **كيف يُختار النوعُ عند الإنشاء**: بطاقتا «رابط / ملف» (وأُعدم الشريطُ المقطعيّ).
 *
 * والصفحةُ العلنيّةُ تُعرَض في نوافذَ حقيقيّة (`iframe`) لأنّها تقيس ارتفاعَ النافذة، وبصورتين:
 * طوليّةٍ كالملصق وعرضيّةٍ كالشريحة. وما لم يُختر حُذف بأصنافه.
 */

export const metadata = { title: "صورة الباركود، معرض أدِيب" };

const VIEW = [
  { pic: "tall", tag: "الجوّال: صورةٌ طوليّة كالملصق" },
  { pic: "wide", tag: "الجوّال: صورةٌ عرضيّة كالشريحة" },
] as const;

const phone = { ["--qdlab-w" as string]: "390px", ["--qdlab-h" as string]: "760px" };
const wide = { ["--qdlab-w" as string]: "1180px", ["--qdlab-h" as string]: "720px" };

export default function QrImageLab() {
  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System, QR Image</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">باركودٌ وجهتُه ملف</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          ما يراه من يمسح الباركود، وكيف يُختار النوعُ في شاشة الإنشاء: الهيئتان المعتمدتان
          (٢٠٢٦-١٠-٠٨).
        </p>
      </Container>

      <div className="mx-auto w-full max-w-[1320px] px-6">
        <h2 className="mt-12 font-display text-xl font-black text-content">١) ما يراه من يمسح: الهيئةُ المعتمدة</h2>
        <p className="mt-2 max-w-2xl text-content-muted">
          اختار المالك «الصورةَ وحدها» (٢٠٢٦-١٠-٠٨)، وأضاف توقيعًا بجوار الشعار: «مُشغَّل بواسطة».
          وأُعدمت «صفحةٌ من الموقع» بأصنافها.
        </p>
        <div className="qdlab mt-4">
          {VIEW.map((v) => (
            <div className="qdlab-col" style={phone} key={v.pic}>
              <div className="phdlab-tag good"><span className="dot" aria-hidden />{v.tag}</div>
              <iframe className="qdlab-screen" src={`/ui/qr-image/view?pic=${v.pic}`} title={v.tag} loading="lazy" />
            </div>
          ))}
          <div className="qdlab-col" style={wide}>
            <div className="phdlab-tag good"><span className="dot" aria-hidden />سطح المكتب</div>
            <iframe className="qdlab-screen" src="/ui/qr-image/view?pic=tall" title="سطح المكتب" loading="lazy" />
          </div>
        </div>

        <h2 className="mt-16 font-display text-xl font-black text-content">٢) ملف PDF: الهيئةُ المعتمدة</h2>
        <p className="mt-2 max-w-2xl text-content-muted">
          بطاقةٌ على المسرح نفسِه تفتح الملفَّ بزرّ (اختارها المالك ٢٠٢٦-١٠-٠٨ على فتحٍ مباشرٍ بلا صفحة):
          الـPDF لا يُعرَض داخل صفحةٍ على الجوّال، وكروم أندرويد يُنزّله بدل أن يعرضه.
        </p>
        <div className="qdlab mt-4">
          <div className="qdlab-col" style={phone}>
            <div className="phdlab-tag good"><span className="dot" aria-hidden />بطاقةٌ على المسرح</div>
            <iframe className="qdlab-screen" src="/ui/qr-image/view?pic=pdf" title="بطاقة الـPDF" loading="lazy" />
          </div>
        </div>

        <h2 className="mt-16 font-display text-xl font-black text-content">٣) اختيارُ النوع في شاشة الإنشاء: المعتمَد</h2>
        <p className="mt-2 max-w-2xl text-content-muted">
          الشاشةُ حيّة: بدّل بين رابطٍ وصورة، وأزِل الصورةَ واختر غيرَها من جهازك.
        </p>
        <div className="phdlab mt-4">
          <div className="phdlab-col">
            <div className="phdlab-tag good"><span className="dot" aria-hidden />بطاقتا اختيار</div>
            <div className="phdlab-frame"><CreateLab /></div>
          </div>
        </div>
      </div>
    </main>
  );
}
