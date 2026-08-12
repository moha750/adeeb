// معرضُ تذييل الموقع — **التذييلُ المعتمَد** (المالك ٢٠٢٦-٠٨-١٢): الجزيرةُ المقلوبة
// كحليّةً والنقشُ في قاعها. عُرِضت ستُّ هيئاتٍ في جولتين (اللوحُ الملتحم · الكحليُّ
// العميق · الجزيرةُ الكحليّة بنقشٍ في رأسها · القاعدة · جزيرةُ الوسم) وأُعدمت كلُّها
// يوم الاعتماد، فلم يبقَ منها سطرٌ ولا خاصّيّةُ جلد — سابقةُ الرأس نفسُها.
import { Ambient, Container, Footer } from "@adeeb/design-system";

/** متنٌ قصيرٌ فوق التذييل — التذييلُ لا يُقرأ وحدَه، يُقرأ بعد صفحةٍ تنتهي. */
function Tail() {
  return (
    <section className="py-14 text-center">
      <Container>
        <h2 className="font-display text-2xl font-black text-content">آخرُ ما في الصفحة</h2>
        <p className="mx-auto mt-3 max-w-lg text-content-muted">
          سطرٌ يسبق التذييلَ ليُرى الانتقالُ من المتن إلى القدم.
        </p>
      </Container>
    </section>
  );
}

export default function FooterGalleryPage() {
  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System, Footer</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">تذييل الموقع</h1>
        <p className="mt-2 max-w-3xl leading-relaxed text-content-muted">
          كان التذييلُ <b>سطرًا وخيطًا</b>: حدٌّ علويّ ونصٌّ رماديّ، بلا كتلةِ أنماطٍ في المكتبة أصلًا.
          وهو آخرُ ما يقرؤه الزائر، فصار <b>جزيرةً مقلوبة</b>: كرتٌ عائمٌ من عائلة الكروت كأخيه الرأس
          (زاويةُ الأساس ق٢ وظلٌّ من السلّم ق٥)، يعوم عن حافّة الصفحة، <b>فيُقفَل الموقعُ بما فُتح به</b>.
        </p>
        <p className="mt-3 max-w-3xl leading-relaxed text-content-muted">
          وسطحُه تدرّجُ الهوية <b>رأسيًّا</b> (فاتحٌ في رأسه أعمقُ في قدمه): هي فلسفةُ الشفق نفسُها
          المكتوبة في <code className="font-latin">tokens.css</code>، ولأنّ الميلَ 135° يحسب خطَّه من
          العرض <b>والارتفاع</b> معًا فيهدر شطرَه على سطحٍ عريضٍ قصير (الدرسُ المقيس في ق١٢).
          و<b>النقشُ يختم القاع</b> كما يختم قسمَ الانضمام في الهبوط، وهو <b>قناعٌ لا صورةٌ ملوّنة</b>:
          ملفٌّ واحدٌ و<code className="font-latin">mask</code> تُلبسه أيَّ حبر، فلا نسختان تفترقان.
        </p>
        <p className="mt-3 max-w-3xl leading-relaxed text-content-muted">
          وروابطُه من <code className="font-latin">lib/nav</code> نفسِه الذي يقرؤه الرأس، فالقائمةُ
          واحدةٌ لا تفترق يومَ يُضاف رابط. <b>جرِّب:</b> مرِّر المؤشّرَ على الروابط (خطٌّ يُخَطّ من
          اليمين، صبغتُه صبغةُ تظليل الرأس)، واضغط «للأعلى»، وضيِّق النافذةَ فتنطوي الأعمدةُ أربعةً ثمّ
          اثنين ثمّ واحدًا. والانطواءُ يقيس <b>عرضَ التذييل</b> لا عرضَ شاشتك.
        </p>

        <div className="sftr-demo mt-8">
          <div className="amb-host">
            <Ambient />
            <Tail />
            <Footer />
          </div>
        </div>
        <div className="pb-10" />
      </Container>
    </main>
  );
}
