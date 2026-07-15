"use client";

import { useState } from "react";
import { Button, Container, Carousel, Card, CardMedia, CardBody, Badge } from "@adeeb/design-system";

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-6">
      <h2 className="mb-6 font-display text-2xl font-black text-content">{title}</h2>
      {children}
    </section>
  );
}

function Lab({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 font-latin text-xs font-bold uppercase tracking-[0.16em] text-content-muted">{children}</p>
  );
}

const SLIDES = [
  { tag: "ورشة", title: "رحلتك في عالم التصميم", desc: "أساسيّات التصميم الجرافيكيّ من الصفر." },
  { tag: "مسابقة", title: "مسابقة القصّة القصيرة", desc: "شارك بقصّتك واربح جوائز قيّمة." },
  { tag: "لقاء", title: "أمسية شعريّة", desc: "ليلة من الشعر والحكاية." },
  { tag: "تدريب", title: "احتراف الفوتوغراف", desc: "من اختيار العدسة إلى إدارة المشروع." },
  { tag: "ندوة", title: "الكتابة الإبداعيّة", desc: "أدوات ومهارات لصياغة النصّ." },
  { tag: "معرض", title: "معرض الفنون البصريّة", desc: "أعمال مختارة من أعضاء النادي." },
];

/** شريحة عرض بسيطة داخل الكاروسيل — بطاقة العلامة. */
function Slide({ tag, title, desc }: { tag: string; title: string; desc: string }) {
  return (
    <Card interactive className="h-full">
      <CardMedia />
      <CardBody>
        <Badge dot>{tag}</Badge>
        <h3 className="mt-2 font-display text-lg font-bold text-content">{title}</h3>
        <p className="mt-1 text-sm text-content-muted">{desc}</p>
      </CardBody>
    </Card>
  );
}

const DELAYS = [
  { label: "سريع · ١٥٠٠ms", value: 1500 },
  { label: "افتراضيّ · ٤٠٠٠ms", value: 4000 },
  { label: "بطيء · ٨٠٠٠ms", value: 8000 },
];

export default function CarouselPage() {
  const [delay, setDelay] = useState(4000);

  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">
          Design System · Carousel
        </p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">معرض الكاروسيل</h1>
        <p className="mt-2 max-w-xl text-content-muted">
          كاروسيل أفقيّ موحّد: تشغيل تلقائيّ + دوران لانهائيّ + أزرار أسفل، باتّجاه RTL. يتوقّف التشغيل عند مرور
          المؤشّر فوقه. عدد الشرائح لكلّ شاشة يُضبط عبر <code className="font-latin">slideClassName</code>، وسرعة التنقّل
          عبر <code className="font-latin">autoplayDelay</code>.
        </p>

        <div className="mt-12 space-y-14">
          <Sec title="افتراضيّ">
            <Lab>slideClassName الافتراضيّ · ١ / ٢ / ٣ شرائح حسب اتّساع الشاشة</Lab>
            <Carousel>
              {SLIDES.map((s) => (
                <Slide key={s.title} {...s} />
              ))}
            </Carousel>
          </Sec>

          <Sec title="شريحة واحدة لكلّ شاشة">
            <Lab>slideClassName = &quot;basis-full&quot;</Lab>
            <Carousel slideClassName="basis-full">
              {SLIDES.map((s) => (
                <Slide key={s.title} {...s} />
              ))}
            </Carousel>
          </Sec>

          <Sec title="عدد أكبر من الشرائح">
            <Lab>slideClassName = &quot;basis-1/2 sm:basis-1/3 lg:basis-1/4&quot;</Lab>
            <Carousel slideClassName="basis-1/2 sm:basis-1/3 lg:basis-1/4">
              {SLIDES.map((s) => (
                <Slide key={s.title} {...s} />
              ))}
            </Carousel>
          </Sec>

          <Sec title="سرعة التشغيل التلقائيّ (autoplayDelay)">
            <Lab>غيّر مدّة الانتظار بين الشرائح — المفتاح يُعيد بناء الكاروسيل بالمدّة الجديدة</Lab>
            <div className="mb-6 flex flex-wrap items-center gap-3">
              {DELAYS.map((d) => (
                <Button
                  key={d.value}
                  variant={delay === d.value ? "primary" : "ghost"}
                  onClick={() => setDelay(d.value)}
                >
                  {d.label}
                </Button>
              ))}
            </div>
            <Carousel key={delay} autoplayDelay={delay}>
              {SLIDES.map((s) => (
                <Slide key={s.title} {...s} />
              ))}
            </Carousel>
          </Sec>
        </div>
      </Container>
    </main>
  );
}
