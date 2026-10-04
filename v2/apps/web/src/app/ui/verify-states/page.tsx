"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, Container } from "@adeeb/design-system";
import { VerifyForm } from "../../verify/VerifyForm";
import { VerifyResultView } from "../../verify/VerifyResult";
import type { VerifyResult } from "../../verify/data";

/**
 * **معاينةُ التحقّق بعد تغيّر الاسم** (قرارُ المالك ٢٠٢٦-١٠-٠١: الشهادةُ تتبع اسمَ صاحبها، والتحقّقُ يعرف
 * تاريخَه). الصدرُ سيناريو المالك نفسُه: ورقةٌ قدّمها محمد للشركة باسمٍ فيه خطأ، وورقةٌ تُنزَّل اليوم
 * بالمصحَّح، والرقمُ واحد، ثمّ ما تراه الشركةُ حين تمسح الرمز. وبعده الأحوالُ كلُّها بالمكوّن الحيّ نفسِه
 * (`VerifyResultView`)، فلا تفترق المعاينةُ عن الصفحة. والأسماءُ والأرقامُ مختلَقة.
 */

const SERIAL = "ADEEB-VOL-2026-0021-3C9A1F";
const BASE = {
  serial: SERIAL,
  positionTitle: "متطوّعٌ في منظّم لمعرض اليوم الوطني",
  periodFrom: "2026-09-28",
  periodTo: "2026-09-29",
  issuedOn: "2026-09-30",
  revokedOn: null,
  hours: 12,
  distinction: null,
} as const;

const MOHAMMED: VerifyResult = {
  state: "valid", ...BASE, holderName: "محمد إسماعيل المطر",
  formerNames: [{ name: "محمد اسماعيل المطر", until: "2026-10-03" }],
};

const STATES: { title: string; note: string; code: string; result: VerifyResult }[] = [
  {
    title: "صحيحة، لم يتغيّر اسمُها",
    note: "كما كانت الصفحةُ قبل اليوم تمامًا: لا سطرَ زائد.",
    code: SERIAL,
    result: { state: "valid", ...BASE, holderName: "ريم عبدالله الدوسري", formerNames: [] },
  },
  {
    title: "صحيحة، تغيّر اسمُها مرّتين",
    note: "نسخةٌ نُزّلت بين التصحيحين تحمل الاسمَ الأوسط، فيُذكر هو أيضًا.",
    code: SERIAL,
    result: {
      state: "valid", ...BASE, holderName: "عبدالرحمن بن عبدالعزيز آل الشيخ",
      formerNames: [
        { name: "عبدالرحمن آل الشيخ", until: "2026-10-05" },
        { name: "عبدالرحمن بن عبدالعزيز ال الشيخ", until: "2026-11-12" },
      ],
    },
  },
  {
    title: "مُبطَلة، وتغيّر اسمُها",
    note: "الأسماءُ تُذكر ليعرف القارئُ أنّ ورقتَه هي هذه، والحكمُ أنّها لا يُعتدّ بها.",
    code: SERIAL,
    result: {
      state: "revoked", ...BASE, revokedOn: "2026-10-20", holderName: "سارة خالد العتيبي",
      formerNames: [{ name: "ساره خالد العتيبي", until: "2026-10-10" }],
    },
  },
  {
    title: "لا شهادة بهذا الرقم",
    note: "بلا تغيير.",
    code: "ADEEB-VOL-2026-9999-000000",
    result: { state: "missing" },
  },
];

/** ورقةُ المشاركة مرسومةً بالراسم الحيّ نفسِه (`renderParticipation`)، باسمٍ يُمرَّر. */
function Paper({ name, caption }: { name: string; caption: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let url: string | null = null;
    let alive = true;
    void import("@/lib/certificates/participation").then(async (m) => {
      const blob = await m.renderParticipation(
        { name, serial: SERIAL, opportunity: "منظّم لمعرض اليوم الوطني", gender: "male", from: "2026-09-28", to: "2026-09-29" },
        "image/jpeg",
      );
      if (!alive) return;
      url = URL.createObjectURL(blob);
      setSrc(url);
    });
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [name]);

  return (
    <figure className="m-0">
      <figcaption className="mb-2 text-sm font-bold text-content-muted">{caption}</figcaption>
      {src
        // eslint-disable-next-line @next/next/no-img-element -- صورةٌ مرسومةٌ في المتصفّح (blob) لا ملفٌّ يُحسَّن
        ? <img src={src} alt={`شهادة مشاركة باسم ${name}`} className="block w-full rounded shadow-md" />
        : <div className="grid aspect-[3508/2480] w-full place-items-center rounded bg-surface-2 text-sm text-content-muted">تُرسَم الورقة…</div>}
    </figure>
  );
}

export default function VerifyStatesPage() {
  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System, Verify States</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">التحقّق بعد تغيّر الاسم</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          الشهادةُ تتبع اسمَ صاحبها: كلُّ تنزيلٍ بعد التصحيح يخرج بالاسم الجديد، والرقمُ هو هو. وصفحةُ التحقّق تقول
          الاسمَ اليوم وكلَّ اسمٍ حملته الشهادةُ قبله وإلى متى، فالنسخةُ القديمةُ بيد أيّ جهةٍ تُطابَق ولا تبدو مزوّرة.
        </p>

        <section className="mt-12">
          <h2 className="font-display text-2xl font-black text-content">سيناريو محمد</h2>
          <p className="mb-5 mt-1 max-w-2xl text-content-muted">
            نزّل شهادتَه وقدّمها لشركة، ثمّ تذكّر أنّه كتب «اسماعيل» بلا همزة فصحّحه في الموقع يومَ ٣ أكتوبر.
          </p>
          <div className="grid gap-6 md:grid-cols-2">
            <Paper name="محمد اسماعيل المطر" caption="١) النسخةُ التي بيد الشركة (قبل التصحيح)" />
            <Paper name="محمد إسماعيل المطر" caption="٢) النسخةُ التي تُنزَّل اليوم (بعد التصحيح)" />
          </div>
          <p className="mb-3 mt-8 text-sm font-bold text-content-muted">٣) ما تراه الشركةُ حين تمسح الرمز في نسختها</p>
          <Card style={{ maxWidth: 720, margin: "0 auto" }}>
            <CardBody>
              <VerifyForm defaultCode={SERIAL} />
              <VerifyResultView result={MOHAMMED} />
            </CardBody>
          </Card>
        </section>

        <section className="mt-16">
          <h2 className="font-display text-2xl font-black text-content">الأحوالُ كلُّها</h2>
          <div className="mt-6 flex flex-col gap-10">
            {STATES.map((s) => (
              <div key={s.title}>
                <p className="text-base font-bold text-content">{s.title}</p>
                <p className="mb-3 text-sm text-content-muted">{s.note}</p>
                <Card style={{ maxWidth: 720, margin: "0 auto" }}>
                  <CardBody>
                    <VerifyForm defaultCode={s.code} />
                    <VerifyResultView result={s.result} />
                  </CardBody>
                </Card>
              </div>
            ))}
          </div>
        </section>
      </Container>
    </main>
  );
}
