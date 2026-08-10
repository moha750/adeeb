"use client";

import { useState } from "react";
import { Button, Container, LogoLoader } from "@adeeb/design-system";

function Sec({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <section className="mt-14">
      <h2 className="font-display text-2xl font-black text-content">{title}</h2>
      <p className="mt-2 max-w-2xl leading-relaxed text-content-muted">{note}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return <div className="overflow-hidden rounded border border-line bg-surface">{children}</div>;
}

export default function LoadingGalleryPage() {
  const [boot, setBoot] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // معاينةُ شاشة البدء بدورتها كاملة: ظهورٌ ثمّ تلاشٍ ثمّ نزعٌ من الشجرة.
  const preview = () => {
    setBoot(true);
    setDismissed(false);
    setTimeout(() => setDismissed(true), 3200);
    setTimeout(() => setBoot(false), 3600);
  };

  return (
    <main className="py-16">
      <Container className="max-w-4xl">
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System, Loader</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">معرض شاشة التحميل</h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-content-muted">
          الشعارُ نفسُه هو المؤشّر لا دائرةٌ تدور: شعارٌ شبحٌ باهت يبقى، ووهجٌ بتدرّج العلامة يصعد فيه من أسفله
          إلى أعلاه، مقنَّعًا بشكل الشعار فلا يفيض عن حدوده. حركتُه CSS خالصة، فتعمل قبل وصول جافاسكربت.
        </p>

        <Sec
          title="الرأسيّ: شاشةُ بدء الموقع"
          note="يملأ شاشةً فارغة، ويُستعمل في شاشة البدء وفي حدّ التحميل للجذر."
        >
          <Frame>
            <LogoLoader minHeight="420px" />
          </Frame>
        </Sec>

        <Sec
          title="الأفقيّ: تحميلُ التنقّل في اللوحة"
          note="متنُ اللوحة عريضٌ قصير، فالرأسيّ يمدّه ويقفز به. هذا ما يظهر عند التنقّل بين التبويبات ويبقى الشريط الجانبيّ."
        >
          <Frame>
            <LogoLoader orientation="horizontal" minHeight="300px" />
          </Frame>
        </Sec>

        <Sec
          title="المقاس"
          note="العرضُ وحده يُمرَّر (size)، والارتفاعُ يتبعه بنسبة الأصل، فلا يُشوَّه الشعار أبدًا."
        >
          <div className="flex flex-wrap items-end gap-6">
            {[72, 110, 150].map((s) => (
              <Frame key={s}>
                <LogoLoader size={s} minHeight="260px" />
              </Frame>
            ))}
          </div>
        </Sec>

        <Sec
          title="الطبقةُ الثابتة"
          note="شاشةُ البدء الحقيقيّة: تغطّي النافذة فوق كلّ شيء ثمّ تتلاشى. اضغط لتراها بدورتها كاملة."
        >
          <Button onClick={preview}>عايِن شاشة البدء</Button>
          {boot ? <LogoLoader fixed size={150} dismissed={dismissed} label="جارٍ فتح الموقع…" /> : null}
        </Sec>
      </Container>
    </main>
  );
}
