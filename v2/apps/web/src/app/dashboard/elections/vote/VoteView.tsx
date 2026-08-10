"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button } from "@adeeb/design-system";
import { CheckCircle, Checks, Scales } from "@phosphor-icons/react";
import { Breadcrumb } from "../../_shell/Breadcrumb";
import { BallotModal } from "../_member/BallotModal";
import { OpportunityCard } from "../_member/OpportunityCard";
import { Countdown } from "../_member/Countdown";
import type { VoteItem } from "../member-data";

/** باب «التصويت» — انتخاباتٌ مفتوحةٌ لتصويت العضو، لكلٍّ زرُّ «صوّت» يفتح بطاقةً مُعَمّاة. */
export function VoteView({ items, error }: { items: VoteItem[]; error: string | null }) {
  const router = useRouter();
  const [ballot, setBallot] = useState<VoteItem | null>(null);

  return (
    <>
      <div className="ash-phead">
        <div><Breadcrumb /><h1>التصويت</h1></div>
      </div>

      {error ? <Alert tone="warning" title="تعذّر جلب الانتخابات">{error}</Alert> : null}
      {!error && items.length === 0 ? (
        <Alert tone="info" title="لا تصويت مفتوح الآن">حين يُفتح بابُ تصويتٍ في نطاقك، يظهر هنا لتدلي بصوتك.</Alert>
      ) : null}

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

      <BallotModal
        election={ballot}
        onClose={() => setBallot(null)}
        onDone={() => { setBallot(null); router.refresh(); }}
      />
    </>
  );
}
