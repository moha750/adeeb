"use client";

// ★ مؤقّت — محاكي باب «التصويت»: قائمةُ الانتخابات المفتوحة لتصويتك بحالاتها، وزرّ «صوّت» يفتح
// بطاقةَ التصويت المُعَمّاة الحقيقيّة بمرشّحين تجريبيّين (عبر مَنفذ loader). الإدلاءُ محاكاة. تُحذف بعد التأكّد.

import { useState } from "react";
import { Alert, Button, Container } from "@adeeb/design-system";
import { CheckCircle, Checks, Scales } from "@phosphor-icons/react";
import { ToastProvider } from "../../../dashboard/_components/ToastProvider";
import { BallotModal } from "../../../dashboard/elections/_member/BallotModal";
import { OpportunityCard } from "../../../dashboard/elections/_member/OpportunityCard";
import { Countdown } from "../../../dashboard/elections/_member/Countdown";
import type { BallotCandidate, VoteItem } from "../../../dashboard/elections/member-data";

// موعدٌ معروضٌ وخامُه معًا، ومستقبليٌّ كي يتحرّك العدّاد في المختبر
const END = "8 سبتمبر 2026";
const END_RAW = "2026-09-08T20:59:00.000Z";
const END2 = "9 سبتمبر 2026";
const END2_RAW = "2026-09-09T20:59:00.000Z";
const STATES: { key: string; label: string; items: VoteItem[] }[] = [
  { key: "open", label: "مفتوحٌ للتصويت", items: [{ electionId: "e1", position: "قائد لجنة الإعلام", votingEnd: END, votingEndRaw: END_RAW, hasVoted: false }] },
  { key: "voted", label: "صوّتت", items: [{ electionId: "e1", position: "قائد لجنة الإعلام", votingEnd: END, votingEndRaw: END_RAW, hasVoted: true }] },
  { key: "multi", label: "أكثرُ من انتخاب", items: [
    { electionId: "e1", position: "قائد لجنة الإعلام", votingEnd: END, votingEndRaw: END_RAW, hasVoted: false },
    { electionId: "e2", position: "نائب لجنة البرمجة", votingEnd: END2, votingEndRaw: END2_RAW, hasVoted: true },
  ] },
  { key: "empty", label: "لا تصويت مفتوح", items: [] },
];

// مُحمِّلُ مرشّحين محاكاةً (مُعمَّون: رقمٌ وبيانٌ بلا اسم) — بدل الجلب الحقيقيّ
const mockBallot = async (): Promise<{ candidates: BallotCandidate[]; error: string | null }> => ({
  candidates: [
    { id: "c1", number: 1, statement: "أسعى إلى بناء تغطيةٍ إعلاميّةٍ أسبوعيّة منتظمة تُبرز أنشطة النادي وتصل إلى الأعضاء عبر قنواتٍ متجدّدة." },
    { id: "c2", number: 2, statement: "خبرةُ عامين في إدارة المحتوى، وخطّةٌ لفريقٍ صغيرٍ يغطّي الفعاليّات ويُصدر نشرةً شهريّة." },
    { id: "c3", number: 3, statement: "رؤيةٌ لرفع مشاركة الأعضاء عبر محتوى تفاعليّ وحملاتٍ موسميّة." },
  ],
  error: null,
});

function VotePreview({ items }: { items: VoteItem[] }) {
  const [ballot, setBallot] = useState<VoteItem | null>(null);
  return (
    <>
      <div className="rounded border border-line p-4 md:p-7" style={{ background: "var(--color-bg)" }}>
        <div className="ash-phead"><div><h1>التصويت</h1></div></div>
        {items.length === 0 ? (
          <Alert tone="info" title="لا تصويت مفتوح الآن">حين يُفتح بابُ تصويتٍ في نطاقك، يظهر هنا لتدلي بصوتك.</Alert>
        ) : (
          <div className="opp-grid">
            {items.map((e) => (
              <OpportunityCard
                key={e.electionId}
                done={e.hasVoted}
                icon={<Scales />}
                title={e.position}
                subtitle={e.votingEnd ? (
                  <>باب التصويت ينتهي: {e.votingEnd}{e.votingEndRaw ? <Countdown iso={e.votingEndRaw} /> : null}</>
                ) : "التصويت مفتوح"}
                action={e.hasVoted
                  ? <Button variant="success" size="sm" disabled><CheckCircle size={16} />صوّتت</Button>
                  : <Button variant="primary" size="sm" onClick={() => setBallot(e)}><Checks size={16} />صوّت</Button>}
              />
            ))}
          </div>
        )}
      </div>
      <BallotModal election={ballot} loader={mockBallot} onClose={() => setBallot(null)} onDone={() => setBallot(null)} />
    </>
  );
}

export default function VoteLab() {
  const [sel, setSel] = useState(0);
  return (
    <main className="py-16">
      <Container className="max-w-3xl">
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Vote Door · Lab</p>
        <h1 className="mt-1 font-display text-4xl font-black text-content">محاكي باب «التصويت»</h1>
        <p className="mt-2 max-w-xl text-content-muted">
          قائمةُ الانتخابات المفتوحة لتصويتك بحالاتها. زرّ «صوّت» يفتح بطاقةَ التصويت المُعَمّاة بمرشّحين تجريبيّين (<b className="text-content">الإدلاءُ محاكاة</b>). بدّل الحالة.
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
            <VotePreview key={sel} items={STATES[sel].items} />
          </ToastProvider>
        </div>
      </Container>
    </main>
  );
}
