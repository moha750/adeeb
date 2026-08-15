"use client";

import { useEffect, useState } from "react";
import { Alert, Badge, Card, CardBody, CardHeader, Segmented } from "@adeeb/design-system";
import { ShieldWarning } from "@phosphor-icons/react";
import { Warning } from "@/app/_components/glyphs";
import { WARNING_CATEGORIES, warningTitle } from "@/lib/warnings/vocab";
import { renderWarningLetter } from "@/lib/warnings/letter";
import { warningWhatsappMessage, type WarningLetter } from "@/lib/warnings/message";
import { PageHeader } from "../../../_components/PageHeader";

/**
 * عيّنةٌ ثابتة — **اسمٌ متخيَّل** لا عضوٌ حقيقيّ (كعيّنات معرض المكوّنات)، فالمعاينة تُقرأ
 * وتُلتقط صورتُها ولا تحمل اسم أحد. والسبب يُكتب كما يكتبه المُصدِر في النافذة.
 */
const SAMPLE = {
  name: "سارة الفيصل", gender: "female" as const,
  role: "قائد", committee: "لجنة التصميم",   // ← منهما يُبنى سطر النداء: «قائدة لجنة التصميم/ …»
  issuedAt: "2026-08-02T09:00:00Z", limit: 3,
};

const REASON: Record<string, string> = {
  absence: "الغياب عن اجتماعَي اللجنة الأخيرين دون إشعار",
  lateness: "التأخّر عن موعد تسليم أعمال الحملة ثلاث مرّات",
  task_neglect: "لم تُسلَّم المهامّ المتّفق عليها رغم تذكيرين",
  unresponsive: "عدم الردّ على رسائل قائد اللجنة أسبوعين",
  conduct: "أسلوبٌ غير لائق في نقاش مجموعة العمل",
  policy: "استخدام هوية النادي في منشورٍ خارج قنواته الرسميّة",
  other: "الانسحاب من تنظيم الفعاليّة قبل موعدها بيوم",
};

const letterOf = (category: string, ordinal: number): WarningLetter => ({
  ...SAMPLE,
  ordinal,
  activeCount: ordinal,
  category,
  reason: REASON[category] ?? "",
});

/**
 * **معاينة الخطاب** — البوست كما يخرج فعلًا لكلّ تصنيف، مولَّدًا بالرسّام نفسه
 * (`renderWarningLetter`) لا بمحاكاةٍ تُشبهه. فما تراه هنا هو ما يُنزَّل هناك.
 *
 * ومبدّلُ الرتبة يكشف الفرق الحقيقيّ: الأوّل والثاني يقولان ما بقي، والثالث يُعلن سحب العضويّة.
 */
export function PreviewView() {
  const [ordinal, setOrdinal] = useState(1);
  const [images, setImages] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const urls: string[] = [];
    (async () => {
      try {
        const out: Record<string, string> = {};
        for (const c of WARNING_CATEGORIES) {
          const blob = await renderWarningLetter(letterOf(c.value, ordinal));
          const url = URL.createObjectURL(blob);
          urls.push(url);
          out[c.value] = url;
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
  }, [ordinal]);

  return (
    <>
      <PageHeader title="معاينة الخطاب" status={<Badge tone="info" variant="soft" icon={<ShieldWarning />}>عيّنةٌ لا سجلّ</Badge>} />

      <Alert tone="info" title="ما تراه هو ما يُنزَّل">
        كلّ ورقةٍ أدناه مولَّدةٌ بالرسّام نفسه الذي يعمل عند الإصدار، على قالبك، والاسم والسبب عيّنةٌ متخيَّلة.
        ونصُّ الورقة هو نصّ رسالة واتساب حرفًا بحرف.
      </Alert>

      <div className="mt-4 mb-4">
        <Segmented
          items={[1, 2, 3].map((n) => ({ value: String(n), label: warningTitle(n) }))}
          value={String(ordinal)}
          onValueChange={(v) => { setImages({}); setOrdinal(Number(v)); }}
        />
      </div>

      {error ? <Alert tone="danger" title="تعذّرت المعاينة">{error}</Alert> : null}

      <div className="card-grid card-grid-2col">
        {WARNING_CATEGORIES.map((c) => (
          <Card key={c.value}>
            <CardHeader
              variant="soft"
              icon={<Warning />}
              title={c.label}
              subtitle={ordinal >= 3 ? "بالغُ الحدّ: يُعلن سحب العضويّة" : `${warningTitle(ordinal)}: يقول ما بقي`}
            />
            <CardBody>
              {images[c.value] ? (
                // eslint-disable-next-line @next/next/no-img-element -- صورةٌ مولَّدةٌ في المتصفّح (blob) لا أصلٌ ثابت
                <img src={images[c.value]} alt={`خطاب إنذار، ${c.label}`} className="w-full h-auto rounded" />
              ) : (
                <p className="txt">يُولَّد…</p>
              )}
              <p className="txt whitespace-pre-wrap mt-4">{warningWhatsappMessage(letterOf(c.value, ordinal))}</p>
            </CardBody>
          </Card>
        ))}
      </div>
    </>
  );
}
