"use client";

import { useState } from "react";
import { Alert, Button } from "@adeeb/design-system";
import { Scales } from "@phosphor-icons/react";
import { CheckCircle, PencilSimple } from "@/app/_components/glyphs";
import { Breadcrumb } from "../../_shell/Breadcrumb";
import { TermsGate } from "../_member/TermsGate";
import { OpportunityCard } from "../_member/OpportunityCard";
import { Countdown } from "../_member/Countdown";
import type { RunItem } from "../member-data";

/** باب «الترشُّح» — انتخاباتٌ مفتوحةٌ لترشُّح العضو؛ زرُّ «ترشّح» يفتح بوّابةَ الشروط ثمّ صفحةَ البيان. */
export function RunView({ items, error }: { items: RunItem[]; error: string | null }) {
  const [gate, setGate] = useState<{ electionId: string; position: string } | null>(null);

  return (
    <>
      <div className="ash-phead">
        <div><Breadcrumb /><h1>الترشُّح</h1></div>
      </div>

      {error ? <Alert tone="warning" title="تعذّر جلب الانتخابات">{error}</Alert> : null}
      {!error && items.length === 0 ? (
        <Alert tone="info" title="لا ترشّح مفتوح الآن">حين يُفتح بابُ ترشّحٍ لمنصبٍ في نطاقك، يظهر هنا لتقدّم بيانك.</Alert>
      ) : null}

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

      <TermsGate target={gate} onClose={() => setGate(null)} />
    </>
  );
}
