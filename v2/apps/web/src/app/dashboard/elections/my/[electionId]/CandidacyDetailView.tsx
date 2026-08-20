"use client";

import { useState, useTransition } from "react";
import { Prohibit } from "@/app/_components/glyphs";
import { ConfirmDialog } from "../../../_components/ConfirmDialog";
import { useToast } from "../../../_components/ToastProvider";
import { PageHeader } from "../../../_components/PageHeader";
import { CandidacyJourney } from "../../_member/CandidacyJourney";
import { useElectionApi } from "../../actions-context";
import type { CandidacyJourney as CJ } from "../../member-data";

/**
 * صفحةُ ترشّحٍ واحد — يصلها العضو من كرتٍ في سجلّه، فتحمل السردَ الكامل الذي كان يُحشَر
 * في الكشف: هيروُ الهوية، ورسالةُ الحال، والرحلةُ، والبيانُ والملفّ، والتعديلُ والسحب.
 * والسحبُ يقع هنا لا في الكشف: الفعلُ الخطِر يُطلَب من صفحة صاحبِه بعد قراءته.
 */
export function CandidacyDetailView({ c }: { c: CJ }) {
  const toast = useToast();
  const api = useElectionApi();
  const [pending, start] = useTransition();
  const [ask, setAsk] = useState(false);

  const doWithdraw = () =>
    start(async () => {
      const r = await api.withdrawCandidacy(c.candidateId);
      if (r.ok) { toast.success(r.message); setAsk(false); api.refresh(); } else toast.error(r.message);
    });

  return (
    <>
      <PageHeader title={c.position} />

      <CandidacyJourney
        c={c}
        cycle={c.cycle}
        onEdit={() => api.nav(`/dashboard/elections/my/${c.electionId}/edit`)}
        onWithdraw={() => setAsk(true)}
      />

      <ConfirmDialog
        open={ask}
        onClose={() => setAsk(false)}
        tone="danger"
        icon={<Prohibit />}
        title="سحب الترشّح؟"
        text={`سيُسحب ترشّحك في «${c.position}» نهائيًّا في هذه الدورة.`}
        confirmLabel="نعم، اسحب"
        loading={pending}
        onConfirm={doWithdraw}
      />
    </>
  );
}
