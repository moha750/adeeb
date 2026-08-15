"use client";

import { Alert, Button } from "@adeeb/design-system";
import { Scales } from "@phosphor-icons/react";
import { CheckCircle, Checks } from "@/app/_components/glyphs";
import { Breadcrumb } from "../../_shell/Breadcrumb";
import { OpportunityCard } from "../_member/OpportunityCard";
import { Countdown } from "../_member/Countdown";
import { useElectionApi } from "../actions-context";
import type { VoteItem } from "../member-data";

/**
 * باب «التصويت» — انتخاباتٌ مفتوحةٌ لتصويت العضو، لكلٍّ زرٌّ يفتح **بطاقتَه صفحةً**
 * (`‎/vote/[electionId]`) لا نافذةً: البيانُ والملفُّ لا يُحشران في مودال.
 *
 * ومن صوّت يدخل مطّلِعًا لا مصوّتًا، فزرُّه يقول «صوّتت» ويبقى بابًا لا شاهدَ حالٍ معطَّلًا.
 */
export function VoteView({ items, error }: { items: VoteItem[]; error: string | null }) {
  const api = useElectionApi();
  return (
    <>
      <div className="ash-phead">
        <div><Breadcrumb /><h1>صوّت الآن</h1></div>
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
            action={
              <Button
                variant={e.hasVoted ? "success" : "primary"}
                size="sm"
                onClick={() => api.nav(`/dashboard/elections/vote/${e.electionId}`)}
              >
                {e.hasVoted ? <><CheckCircle size={16} />صوّتت</> : <><Checks size={16} />صوّت</>}
              </Button>
            }
          />
        ))}
      </div>
    </>
  );
}
