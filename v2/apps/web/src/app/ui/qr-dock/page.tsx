import { Container } from "@adeeb/design-system";

/**
 * معرضُ **المعاينة الحيّة في محرّر** — الهيئةُ المعتمَدة، لا مقارنةٌ بين مقترحات.
 *
 * العلّةُ قالها المالك: «مع التعديلات يكون الباركود فوق، فلا بدّ أن أصعد أعلى الصفحة لأرى
 * التعديل». وجولةٌ أولى رُدّت: رصيفٌ دائمٌ في أعلى الجوّال (ينكمش أو يُثبَّت) «مزعج»، لأنّ
 * كلَّ ما يُرصَف في أعلى شاشةٍ ضيّقة يُقتطع من المحرّر فيُدفع الثمنُ مرّتين. وثلاثٌ عُرضت
 * بعدها فاعتُمدت الأولى (٢٠٢٦-٠٨-٢١): **الرمزُ هو الشاشة، والمحرّرُ ورقةٌ فوقه تُسحَب**.
 * وأُعدمت الأخريان (وميضٌ عند التغيير، وجزيرةٌ تُنقر) فلم يبقَ منهما سطر.
 */

export const metadata = { title: "المعاينة الحيّة، معرض أديب" };

export default function QrDockLab() {
  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System, Live Preview</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">لوحةٌ وورقةٌ تُسحَب</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          المعاينةُ في محرّرٍ ليست محتوى الصفحة، هي <b>أداةُ قياس</b>. وعلى الجوّال لا فراغَ
          تُرصَف فيه: كلُّ ما يُثبَّت في الأعلى يُقتطع من المحرّر. فقُلبت الأدوار: <b>الرمزُ هو
          الشاشة</b>، والمحرّرُ ورقةٌ فوقه تُرفع وتُخفض بمقبضها على ثلاثة مراسٍ: محرّرٌ كامل،
          فنصفان، فرمزٌ كامل. فالقسمةُ بيدك لا بيد الشاشة.
        </p>
        <p className="mt-3 max-w-2xl text-content-muted">
          وزرّا التنزيل في رأس الورقة لا على اللوحة: اللوحةُ تنكمش بالسحب حتى لا تسع زرًّا،
          والفعلُ الأوّل لا يُقايض بمرسًى. وفي العرض الواسع يعود الترتيبُ المألوف: عمودُ
          معاينةٍ لاصقٌ بجوار الضوابط.
        </p>
        <p className="mt-3 max-w-2xl text-content-muted">
          والإطارُ أدناه <b>نافذةٌ حقيقيّة</b> فيها اللوحةُ بترويستها وجزيرةِ تنقّلها: اكتب
          رابطًا، واسحب المقبض، وغيّر لونَ الحبر وانزل إلى العيون والإطار.
        </p>
      </Container>

      <div className="mx-auto w-full max-w-[1320px] px-6">
        <div className="qdlab mt-12">
          <div className="qdlab-col">
            <div className="phdlab-tag good"><span className="dot" aria-hidden />الجوّال ٣٩٠: الهيئة المعتمَدة</div>
            <iframe className="qdlab-screen" src="/ui/qr-dock/screen" title="الهيئة المعتمَدة على الجوّال" loading="lazy" />
            <p className="nvlab-note">
              اسحب المقبضَ أعلى الورقة: ثلاثةُ مراسٍ. والمرسى الأخير معيَّرٌ على جزيرة التنقّل
              فلا يُدفَن زرّا التنزيل تحتها.
            </p>
          </div>
          <div className="qdlab-col" style={{ ["--qdlab-w" as string]: "1180px" }}>
            <div className="phdlab-tag good"><span className="dot" aria-hidden />العرض الواسع: العمود يثبت</div>
            <iframe className="qdlab-screen" src="/ui/qr-dock/screen" title="العرض الواسع" loading="lazy" />
            <p className="nvlab-note">لا ورقةَ ولا مقبض هنا: انزل في الضوابط، والرمزُ لا يغادر.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
