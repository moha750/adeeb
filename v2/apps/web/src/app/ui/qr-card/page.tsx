"use client";

import { useMemo } from "react";
import { Badge, Button, Container, SectionCard } from "@adeeb/design-system";
import { Palette, Pause, QrCode } from "@phosphor-icons/react";
import { DownloadSimple, PencilSimple } from "@/app/_components/glyphs";
import { QrPreview } from "@/app/dashboard/tools/qr/QrToolView";
import { defaultQrSpec } from "@/app/dashboard/tools/qr/defaults";
import { qrShortUrl } from "@/lib/qrLinks";
import { qrSvg } from "@/lib/qr";

/**
 * **مختبرُ كرت «الباركود ووجهتُه»** — ٢٠٢٦-٠٨-٣١.
 *
 * علّةُ القائم بكلمة المالك: «أحسّه ليس جميلًا بصريًّا». والمقيسُ فيه ثلاثةٌ: أربعةُ أزرارٍ
 * بعرضٍ واحدٍ تملأ السطر فلا يُعرَف أوّلُها، وسطران نحيلان يطفوان في بياضٍ واسع بجوار
 * باركودٍ كبير، ورابطٌ لاتينيٌّ طويلٌ يشدّ العينَ في سطرٍ عربيّ.
 */

const TARGET =
  "https://docs.google.com/forms/d/e/1FAIpQLSfIcJy9H2uBAMo-FbtaXCkpDAoxQCpgAWxRZfNtvbGYZ-MTpw/viewform?usp=publish-editor";
const HOST = "docs.google.com";

function useSvg(size: number) {
  return useMemo(() => qrSvg({ ...defaultQrSpec(qrShortUrl("e4trprm")), size }), [size]);
}

/** أ) القائمُ اليوم: أربعةُ أزرارٍ في صفٍّ ممتدّ، وسطران فوقها. */
function ShapeA() {
  const svg = useSvg(220);
  return (
    <SectionCard headerVariant="soft" icon={<QrCode />} title="الباركود ووجهتُه">
      <div className="flex flex-wrap items-center justify-center gap-6">
        <div className="shrink-0"><QrPreview svg={svg} max={220} /></div>
        <div className="flex min-w-[340px] flex-1 flex-col gap-2">
          <p className="txt flex min-w-0 items-baseline gap-2">
            <span className="shrink-0">وجهته:</span>
            <a className="font-latin truncate" dir="ltr" href="#" title={TARGET}>{TARGET}</a>
          </p>
          <p className="txt">حالته: <Badge tone="success" size="sm">يعمل</Badge></p>
          <div className="mt-2 btn-row">
            <Button variant="primary" size="md"><DownloadSimple /> نزّل الباركود</Button>
            <Button variant="primary" size="md"><Palette /> عدّل التصميم</Button>
            <Button variant="primary" size="md"><PencilSimple /> عدّل الوجهة</Button>
            <Button variant="neutral" size="md"><Pause /> أوقف الباركود</Button>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

/** ب) هرميّةٌ في الأزرار: أوّلٌ مصمتٌ وثلاثةٌ مفرَّغة، والصفُّ بعرض حبره لا ممتدًّا. */
function ShapeB() {
  const svg = useSvg(220);
  return (
    <SectionCard headerVariant="soft" icon={<QrCode />} title="الباركود ووجهتُه">
      <div className="flex flex-wrap items-center justify-center gap-6">
        <div className="shrink-0"><QrPreview svg={svg} max={220} /></div>
        <div className="flex min-w-[340px] flex-1 flex-col gap-2">
          <p className="txt flex min-w-0 items-baseline gap-2">
            <span className="shrink-0">وجهته:</span>
            <a className="font-latin truncate" dir="ltr" href="#" title={TARGET}>{TARGET}</a>
          </p>
          <p className="txt">حالته: <Badge tone="success" size="sm">يعمل</Badge></p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="primary" size="md"><DownloadSimple /> نزّل الباركود</Button>
            <Button variant="ghost" size="md"><Palette /> عدّل التصميم</Button>
            <Button variant="ghost" size="md"><PencilSimple /> عدّل الوجهة</Button>
            <Button variant="ghost" size="md"><Pause /> أوقف الباركود</Button>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

/**
 * ج) صفوفٌ لكلٍّ فعلُه — **مراجَعةُ الجوّال ٢٠٢٦-٠٨-٣١**: كانت `viewbar` تلتفّ فينزل الزرُّ
 * سطرًا، وموضعُه يختلف من صفٍّ لآخر بطول نصِّه فيقرأ العينُ صفًّا مبعثرًا. والعلّةُ الشرحُ
 * الطويل: الكرتُ ليس دليلَ استعمال. فصار الصفُّ **سطرًا واحدًا لا يلتفّ**: تسميةٌ وقيمةٌ
 * تُقصّ عند الضيق، وزرٌّ ثابتٌ في طرفه — فالأزرارُ الثلاثةُ على استقامةٍ واحدة.
 */
function ShapeC() {
  const svg = useSvg(190);
  const rows = [
    { label: "الوجهة", value: HOST, latin: true, action: "تعديل", icon: <PencilSimple /> },
    { label: "التصميم", value: "شكلٌ ولونٌ وإطار", latin: false, action: "تعديل", icon: <Palette /> },
    { label: "التشغيل", value: "يعمل الآن", latin: false, action: "إيقاف", icon: <Pause /> },
  ];
  return (
    <SectionCard
      headerVariant="soft"
      icon={<QrCode />}
      title="الباركود ووجهتُه"
      actions={<Badge tone="success" size="sm">يعمل</Badge>}
    >
      <div className="flex flex-wrap items-start justify-center gap-6">
        <div className="flex shrink-0 flex-col items-center">
          <QrPreview svg={svg} max={190} />
          <Button variant="primary" size="md"><DownloadSimple /> نزّل الباركود</Button>
        </div>
        <div className="min-w-[300px] flex-1">
          <div className="setl">
            {rows.map((r) => (
              <div className="flex items-center gap-3" key={r.label}>
                <span className="txt flex min-w-0 flex-1 items-baseline gap-2">
                  <b className="shrink-0">{r.label}</b>
                  <span className={"truncate text-content-muted" + (r.latin ? " font-latin" : "")} dir={r.latin ? "ltr" : undefined}>
                    {r.value}
                  </span>
                </span>
                <Button variant="ghost" size="sm" className="min-w-[104px] shrink-0 justify-center">{r.icon} {r.action}</Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

const SHAPES = [
  { tag: "أ) القائمُ اليوم", node: <ShapeA />, note: "أربعةُ أزرارٍ بعرضٍ واحدٍ تملأ السطر، وسطران نحيلان فوقها." },
  { tag: "ب) هرميّةٌ في الأزرار", node: <ShapeB />, note: "أقلُّ تغييرًا: الفعلُ الأوّلُ مصمتٌ وحدَه، والباقي مفرَّغ، والصفُّ بعرض حبره." },
  { tag: "ج) صفوفٌ لكلٍّ فعلُه", node: <ShapeC />, note: "صفٌّ واحدٌ لا يلتفّ: تسميةٌ وقيمةٌ تُقصّ وزرٌّ ثابتٌ في الطرف، فالأزرارُ على استقامةٍ واحدة." },
];

export default function QrCardLab() {
  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System, QR Stats</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">كرتُ الباركود ووجهته</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          ثلاثُ هيئاتٍ بالمكوّنات نفسِها وببياناتها الحقيقيّة (رابطُ نموذجٍ طويل). انظر العرضَ
          الواسع أوّلًا ثمّ الجوّال ٣٧٥ تحته.
        </p>

        <h2 className="mt-10 font-display text-xl font-black text-content">على العرض الواسع</h2>
        <div className="mt-4 flex flex-col gap-6">
          {SHAPES.map((s) => (
            <div key={s.tag}>
              <div className="phdlab-tag"><span className="dot" aria-hidden />{s.tag}</div>
              <div className="phdlab-frame">{s.node}<div className="phdlab-body">{s.note}</div></div>
            </div>
          ))}
        </div>

        <h2 className="mt-12 font-display text-xl font-black text-content">على الجوّال ٣٧٥</h2>
        <div className="phdlab mt-4">
          {SHAPES.map((s) => (
            <div className="phdlab-col" key={s.tag}>
              <div className="phdlab-tag"><span className="dot" aria-hidden />{s.tag}</div>
              <div className="phdlab-frame">{s.node}</div>
            </div>
          ))}
        </div>
      </Container>
    </main>
  );
}
