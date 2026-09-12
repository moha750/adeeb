"use client";

import { AreaChart, Container, SectionCard } from "@adeeb/design-system";
import { ChartLineUp } from "@phosphor-icons/react";
import { fmtDate, fmtDayMonth } from "@/lib/dates";

/**
 * **اقتراحٌ يُنظَر لا يُوصَف: تجميعُ الخطّ أسبوعيًّا حين تطول المدّة.**
 *
 * الخطُّ اليوميُّ يقرأ الحركةَ في مدّةٍ قصيرة، فإذا امتدّت المدّةُ أربعةَ أشهرٍ صار مئةً
 * وعشرين نقطةً في عرضٍ لا يتّسع لثلاثين، فتتلاصق القمم ويصير الخطُّ شعرًا مشعّثًا لا
 * يُقرأ منه اتّجاه. والتجميعُ الأسبوعيُّ يبقي الاتّجاهَ ويُسقط الضجيج.
 */

const DAYS = 120;

/** يومٌ يومًا: سكونٌ، ثمّ حملةٌ تصعد وتهبط، ثمّ ذيلٌ متذبذب. رقمٌ مصنوعٌ لا عشوائيّ. */
const daily = Array.from({ length: DAYS }, (_, i) => {
  const t = Date.UTC(2026, 4, 10 + i);
  const wave = i > 40 && i < 60 ? Math.round(14 * Math.sin(((i - 40) / 20) * Math.PI)) : 0;
  const base = i % 7 === 5 || i % 7 === 6 ? 0 : (i % 5) - 1;
  return { day: new Date(t).toISOString().slice(0, 10), count: Math.max(0, base + wave + (i > 95 ? 2 : 0)) };
});

/** أسبوعًا أسبوعًا: مجموعُ كلّ سبعة، وتسميتُه أوّلُ يومٍ فيه. */
const weekly = Array.from({ length: Math.ceil(DAYS / 7) }, (_, w) => {
  const chunk = daily.slice(w * 7, w * 7 + 7);
  return { day: chunk[0].day, count: chunk.reduce((n, d) => n + d.count, 0) };
});
void weekly;

export default function QrTrendLab() {
  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System, QR</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">خطُّ الحركة في مدّةٍ طويلة</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          المدّةُ أربعةُ أشهر (١٢٠ يومًا) فيها حملةٌ في منتصفها. الشكلان بالبيانات نفسِها.
        </p>

        <div className="card-grid mt-8">
          <SectionCard className="card-full" headerVariant="soft" icon={<ChartLineUp />} title="أ) نقطةٌ لكلّ يوم (القائم اليوم)">
            <AreaChart
              tall
              labels={daily.map((d) => fmtDate(`${d.day}T12:00:00Z`))}
              series={[{ name: "المسحات", values: daily.map((d) => d.count) }]}
            />
          </SectionCard>
        </div>

        <div className="card-grid mt-6">
          <SectionCard className="card-full" headerVariant="soft" icon={<ChartLineUp />} title="ب) نقطةٌ لكلّ أسبوع (المعتمَد ٢٠٢٦-٠٩-٠٦)">
            {/* لا بياناتٍ مجمَّعةٍ بيدنا هنا: يُمرَّر اليوميُّ نفسُه و`groupable`، فيجمعه
                المخطّطُ كما يفعل في الإنتاج — فما يُرى هنا هو ما يقع هناك. */}
            <AreaChart
              tall
              groupable
              groupLabel={(start) => `أسبوع ${start}`}
              labels={daily.map((d) => fmtDayMonth(`${d.day}T12:00:00Z`))}
              series={[{ name: "المسحات", values: daily.map((d) => d.count) }]}
            />
          </SectionCard>
        </div>

        <p className="mt-6 max-w-2xl text-content-muted">
          والقاعدةُ المقترَحة: يبقى اليوميُّ ما دامت المدّةُ ستّين يومًا فأقلّ، ويتجمّع أسبوعيًّا
          فوقها. ولا يُسأل عنه المستعمِل: يتبدّل مع المصفّي وحدَه.
        </p>
      </Container>
    </main>
  );
}
