"use client";

import { useEffect, useState, useTransition } from "react";
import { Alert, Button, Modal, Radio } from "@adeeb/design-system";
import { useToast } from "../../_components/ToastProvider";
import type { BallotCandidate, VoteItem } from "../member-data";
import { castVote, loadBallot } from "../actions";

/** نافذةُ التصويت المُعَمّاة — تُحمِّل المرشّحين بلا أسماء (رقم + بيان)، وتُرسل صوتًا واحدًا سرّيًّا. */
export function BallotModal({ election, onClose, onDone, loader = loadBallot }: {
  election: VoteItem | null;
  onClose: () => void;
  onDone: () => void;
  /** مُحمِّلُ المرشّحين — افتراضُه الحقيقيّ `loadBallot`؛ يُمرَّر مُحاكاةً في المعاينة. */
  loader?: (electionId: string) => Promise<{ candidates: BallotCandidate[]; error: string | null }>;
}) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [candidates, setCandidates] = useState<BallotCandidate[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pick, setPick] = useState("");

  // إعادةُ الضبط عند تغيّر الانتخاب **أثناء العرض** (لا في تأثير)، والتحميلُ الشبكيّ في التأثير.
  const [shownFor, setShownFor] = useState<VoteItem | null>(null);
  if (election !== shownFor) {
    setShownFor(election);
    setCandidates(null); setErr(null); setPick("");
  }

  // تُحمَّل البطاقة عند فتح النافذة على انتخابٍ بعينه (الضبطُ الشبكيّ في رجوع الوعد لا في جسم التأثير).
  useEffect(() => {
    if (!election) return;
    let alive = true;
    loader(election.electionId).then((res) => {
      if (!alive) return;
      if (res.error) { setErr(res.error); setCandidates([]); } else setCandidates(res.candidates);
    });
    return () => { alive = false; };
  }, [election, loader]);

  const submit = () => {
    if (!election || !pick) return;
    start(async () => {
      const r = await castVote(election.electionId, pick);
      if (r.ok) { toast.success(r.message); onDone(); } else toast.error(r.message);
    });
  };

  return (
    <Modal
      open={election !== null}
      onClose={() => { if (!pending) onClose(); }}
      title="صوتُك السرّيّ"
      description={election?.position}
      size="md"
      busy={pending}
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onClose} disabled={pending}>إلغاء</Button>
          <Button variant="primary" size="md" loading={pending} disabled={!pick} onClick={submit}>إرسال صوتي</Button>
        </>
      }
    >
      <div style={{ display: "grid", gap: 12 }}>
        <Alert tone="warning" title="صوتك سرّيٌّ ونهائيّ">اختر مرشّحًا واحدًا؛ لا يمكن تغيير الصوت بعد إرساله.</Alert>
        {err ? <Alert tone="danger" title="تعذّر">{err}</Alert> : null}
        {candidates === null ? <p className="txt">جارٍ تحميل المرشّحين…</p>
          : candidates.length === 0 ? <p className="txt">لا مرشّحين معتمَدين بعد.</p>
            : candidates.map((c) => (
              <Radio key={c.id} card name="ballot" checked={pick === c.id} onChange={() => setPick(c.id)} label={`المرشّح رقم ${c.number}`} description={c.statement} />
            ))}
      </div>
    </Modal>
  );
}
