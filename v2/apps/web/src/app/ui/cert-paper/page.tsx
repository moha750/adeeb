"use client";

import { useEffect, useState } from "react";
import { Container } from "@adeeb/design-system";
import type { ParticipationCertificate } from "@/lib/certificates/participation";

/**
 * **معاينةُ ورقة المشاركة بعد سياسة ٢٠٢٦-١٠-٠٣** — مؤقّتة، تُحذف بعد الاعتماد. مرسومةٌ بالراسم الحيّ نفسِه
 * (`renderParticipation`): الساعاتُ في سطر المدّة، ومن رُشّح للتميّز جملةُ مشرفه تحت اسمه وختمُ «بتميّز».
 * والأسماءُ مختلَقة.
 */
const SERIAL = "ADEEB-VOL-2026-0021-3C9A1F";
const SAMPLES: { caption: string; c: ParticipationCertificate }[] = [
  {
    caption: "شهادةُ مشاركة: يومٌ واحد بأربع ساعات",
    c: { name: "نورة عبدالله السالم", serial: SERIAL, opportunity: "منظّمو يوم المهنة", gender: "female", from: "2026-10-15", to: "2026-10-15", hours: 4 },
  },
  {
    caption: "شهادةُ مشاركة بتميّز: يومان باثنتي عشرة ساعة، وجملةُ المشرف",
    c: {
      name: "سارة خالد الخالد", serial: SERIAL, opportunity: "منظّم لمعرض اليوم الوطني", gender: "female", from: "2026-09-28", to: "2026-09-29", hours: 12,
      distinction: "نظّمت طابور التسجيل كلَّه، وساندت زملاءها حتى آخر زائر",
    },
  },
  {
    caption: "مرنة: بلا ساعات",
    c: { name: "محمد إسماعيل المطر", serial: SERIAL, opportunity: "مصمّمو منشورات حملة التسجيل", gender: "male", from: "2026-09-20", to: "2026-09-29" },
  },
];

function Paper({ c, caption }: { c: ParticipationCertificate; caption: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let url: string | null = null;
    let alive = true;
    void import("@/lib/certificates/participation").then(async (m) => {
      const blob = await m.renderParticipation(c, "image/jpeg");
      if (!alive) return;
      url = URL.createObjectURL(blob);
      setSrc(url);
    });
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [c]);

  return (
    <figure className="m-0">
      <figcaption className="mb-2 text-sm font-bold text-content-muted">{caption}</figcaption>
      {src
        // eslint-disable-next-line @next/next/no-img-element -- صورةٌ مرسومةٌ في المتصفّح (blob) لا ملفٌّ يُحسَّن
        ? <img src={src} alt={caption} className="block w-full rounded shadow-md" />
        : <div className="grid aspect-[3508/2480] w-full place-items-center rounded bg-surface-2 text-sm text-content-muted">تُرسَم الورقة…</div>}
    </figure>
  );
}

export default function CertPaperPage() {
  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Preview, Participation Paper</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">ورقةُ المشاركة</h1>
        <div className="mt-8 grid gap-10">
          {SAMPLES.map((s) => <Paper key={s.caption} c={s.c} caption={s.caption} />)}
        </div>
      </Container>
    </main>
  );
}
