"use client";

// ★ مؤقّت — محاكي باب «الترشُّح»: قائمةُ الانتخابات المفتوحة لترشُّحك بكلّ حالاتها، وزرّ «ترشّح»
// يفتح بوّابةَ الشروط (الموافقةُ محاكاةٌ هنا؛ في الحقيقة تنتقل لصفحة إكمال البيان). تُحذف بعد التأكّد.

import { useState } from "react";
import { Alert, Button, Container } from "@adeeb/design-system";
import { Scales } from "@phosphor-icons/react";
import { CheckCircle, PencilSimple } from "@/app/_components/glyphs";
import { ToastProvider, useToast } from "../../../dashboard/_components/ToastProvider";
import { TermsGate } from "../../../dashboard/elections/_member/TermsGate";
import { OpportunityCard } from "../../../dashboard/elections/_member/OpportunityCard";
import { Countdown } from "../../../dashboard/elections/_member/Countdown";
import type { RunItem } from "../../../dashboard/elections/member-data";

// موعدٌ معروضٌ وخامُه معًا (كما يأتيان من `member-data`)، ومستقبليٌّ كي يتحرّك العدّاد في المختبر
const END = "5 سبتمبر 2026";
const END_RAW = "2026-09-05T20:59:00.000Z";
const END2 = "6 سبتمبر 2026";
const END2_RAW = "2026-09-06T20:59:00.000Z";
const STATES: { key: string; label: string; items: RunItem[] }[] = [
  { key: "open", label: "مفتوحٌ للترشّح", items: [{ electionId: "e1", position: "قائد لجنة الإعلام", candidacyEnd: END, candidacyEndRaw: END_RAW, hasSubmission: false, committeeId: 1, roleName: "committee_leader" }] },
  { key: "submitted", label: "ترشّحت", items: [{ electionId: "e1", position: "قائد لجنة الإعلام", candidacyEnd: END, candidacyEndRaw: END_RAW, hasSubmission: true, committeeId: 1, roleName: "committee_leader" }] },
  { key: "pair", label: "مقعدا اللجنة (أفضليّة)", items: [
    { electionId: "e1", position: "قائد لجنة الإعلام", candidacyEnd: END, candidacyEndRaw: END_RAW, hasSubmission: true, committeeId: 1, roleName: "committee_leader" },
    { electionId: "e2", position: "نائب لجنة الإعلام", candidacyEnd: END, candidacyEndRaw: END_RAW, hasSubmission: false, committeeId: 1, roleName: "deputy_committee_leader" },
  ] },
  { key: "multi", label: "أكثرُ من لجنة", items: [
    { electionId: "e1", position: "قائد لجنة الإعلام", candidacyEnd: END, candidacyEndRaw: END_RAW, hasSubmission: false, committeeId: 1, roleName: "committee_leader" },
    { electionId: "e3", position: "نائب لجنة البرمجة", candidacyEnd: END2, candidacyEndRaw: END2_RAW, hasSubmission: true, committeeId: 2, roleName: "deputy_committee_leader" },
  ] },
  { key: "empty", label: "لا ترشّح مفتوح", items: [] },
];

function RunPreview({ items }: { items: RunItem[] }) {
  const toast = useToast();
  const [gate, setGate] = useState<{ electionId: string; position: string } | null>(null);
  return (
    <>
      <div className="rounded border border-line p-4 md:p-7" style={{ background: "var(--color-bg)" }}>
        <div className="ash-phead"><div><h1>الترشُّح</h1></div></div>
        {items.length === 0 ? (
          <Alert tone="info" title="لا ترشّح مفتوح الآن">حين يُفتح بابُ ترشّحٍ لمنصبٍ في نطاقك، يظهر هنا لتقدّم بيانك.</Alert>
        ) : (
          <div className="opp-grid">
            {items.map((e) => (
              <OpportunityCard
                key={e.electionId}
                done={e.hasSubmission}
                icon={<Scales />}
                title={e.position}
                subtitle={e.candidacyEnd ? (
                  <>باب التقدّم على الترشّح ينتهي: {e.candidacyEnd}{e.candidacyEndRaw ? <Countdown iso={e.candidacyEndRaw} /> : null}</>
                ) : "باب الترشّح مفتوح"}
                action={e.hasSubmission
                  ? <Button variant="success" size="sm" disabled><CheckCircle size={16} />ترشّحت</Button>
                  : <Button variant="primary" size="sm" onClick={() => setGate({ electionId: e.electionId, position: e.position })}><PencilSimple size={16} />ترشّح</Button>}
              />
            ))}
          </div>
        )}
      </div>
      <TermsGate target={gate} onClose={() => setGate(null)} onAgree={() => toast.success("محاكاة: ينتقل إلى صفحة إكمال البيان")} />
    </>
  );
}

export default function RunLab() {
  const [sel, setSel] = useState(0);
  return (
    <main className="py-16">
      <Container className="max-w-3xl">
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Run Door · Lab</p>
        <h1 className="mt-1 font-display text-4xl font-black text-content">محاكي باب «الترشُّح»</h1>
        <p className="mt-2 max-w-xl text-content-muted">
          قائمةُ الانتخابات المفتوحة لترشُّحك بحالاتها. زرّ «ترشّح» يفتح بوّابةَ الشروط، والموافقةُ تنقل لصفحة إكمال البيان (<b className="text-content">هنا محاكاة</b>). بدّل الحالة.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {STATES.map((s, i) => (
            <button key={s.key} type="button" onClick={() => setSel(i)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${i === sel ? "border-primary bg-primary text-white" : "border-line bg-surface text-content-muted hover:border-primary"}`}>
              {s.label}
            </button>
          ))}
        </div>
        <div className="mt-6">
          <ToastProvider>
            <RunPreview key={sel} items={STATES[sel].items} />
          </ToastProvider>
        </div>
      </Container>
    </main>
  );
}
