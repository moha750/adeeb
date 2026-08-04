"use client";

import { useEffect, useState } from "react";
import { Alert, Badge, Button, Card, CardBody, CardHeader } from "@adeeb/design-system";
import { Certificate as CertIcon, DownloadSimple } from "@phosphor-icons/react";
import { downloadCertificate, renderCertificate } from "@/lib/certificates/letter";
import type { Certificate } from "@/lib/certificates/text";
import { Breadcrumb } from "../../../_shell/Breadcrumb";

/**
 * ثلاث عيّنات **متخيَّلة** (كعيّنات معرض المكوّنات) تكشف ما يختلف فعلًا:
 * أنثى بمسمًّى قصير · ذكر بمسمّى إدارةٍ يحمل وحدته في اسمه · ومسمًّى طويلٌ يمتحن الضغط.
 */
const SAMPLES: { label: string; note: string; c: Certificate }[] = [
  {
    label: "أنثى — عضو لجنة",
    note: "نصّ ورقتك المعتمدة: المسمّى لا يُؤنَّث، والضمائر تُؤنَّث",
    c: {
      name: "سارة فاروق الحداد",
      position: "عضو لجنة السفراء والتصوير",
      gender: "female",
      serial: "ADEEB-EXP-2026-0000-A1B2C3",
      from: "2024-10-17",
      to: "2025-08-29",
    },
  },
  {
    label: "ذكر — قائد إدارة",
    note: "مسمّى الإدارات يحمل وحدتَه في اسمه فلا تُلحَق ثانيةً",
    c: {
      name: "عبدالله أحمد باجعيفر",
      position: "قائد إدارة الموارد البشرية",
      gender: "male",
      serial: "ADEEB-EXP-2026-0000-D4E5F6",
      from: "2026-01-30",
      to: "2026-08-02",
    },
  },
  {
    label: "امتحانُ الطول",
    note: "اسمٌ رباعيّ ومسمّى مشرفٍ طويل — يُضغط المقاس ولا يطفح على الزخرفة",
    c: {
      name: "عبدالرحمن عبدالعزيز محمد القحطاني",
      position: "مشرف إدارة الضمان والجودة على لجنة التقارير والأرشفة",
      gender: "male",
      serial: "ADEEB-EXP-2026-0000-7A8B9C",
      from: "2025-10-28",
      to: "2026-08-02",
    },
  },
];

/**
 * **معاينة شهادة الخبرة** — الورقة كما تخرج فعلًا، مولَّدةً بالرسّام نفسه
 * (`renderCertificate`) على قالب المالك لا بمحاكاةٍ تُشبهه. فما يُرى هنا هو ما يُنزَّل.
 */
export function PreviewView() {
  const [images, setImages] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const urls: string[] = [];
    (async () => {
      try {
        const out: Record<string, string> = {};
        for (const s of SAMPLES) {
          const blob = await renderCertificate(s.c);
          const url = URL.createObjectURL(blob);
          urls.push(url);
          out[s.label] = url;
        }
        if (alive) setImages(out);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "تعذّر توليد المعاينة.");
      }
    })();
    return () => {
      alive = false;
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  return (
    <>
      <div className="ash-phead">
        <div>
          <Breadcrumb leaf="معاينة شهادة الخبرة" />
          <h1>معاينة شهادة الخبرة</h1>
        </div>
        <Badge tone="info" variant="soft" icon={<CertIcon />}>عيّنةٌ لا سجلّ</Badge>
      </div>

      <Alert tone="info" title="ما تراه هو ما يُنزَّل">
        كلّ ورقةٍ أدناه مولَّدةٌ على قالبك بالرسّام الذي سيعمل عند الإصدار — والأسماء والأرقام
        المرجعيّة متخيَّلة (لا تُعرَف في صفحة التحقّق).
        والنصّ نصُّ ورقتك حرفًا بحرف، ومذكَّرُه مشتقٌّ منه. والمواضع مقيسةٌ على بكسلات القالب:
        الاسم يجلس فوق المسطرة، والفترة والدعاء فوق المسطرة الثانية.
      </Alert>

      {error ? <Alert tone="danger" title="تعذّرت المعاينة">{error}</Alert> : null}

      <div className="card-grid card-grid-1col mt-4">
        {SAMPLES.map((s) => (
          <Card key={s.label}>
            <CardHeader variant="soft" icon={<CertIcon />} title={s.label} subtitle={s.note} />
            <CardBody>
              {images[s.label] ? (
                // eslint-disable-next-line @next/next/no-img-element -- صورةٌ مولَّدةٌ في المتصفّح (blob) لا أصلٌ ثابت
                <img src={images[s.label]} alt={`شهادة خبرة — ${s.label}`} className="w-full h-auto rounded" />
              ) : (
                <p className="txt">تُولَّد…</p>
              )}
              <div className="mt-4">
                <Button variant="neutral" size="md" onClick={() => void downloadCertificate(s.c)}>
                  <DownloadSimple /> تنزيل هذه العيّنة
                </Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </>
  );
}
