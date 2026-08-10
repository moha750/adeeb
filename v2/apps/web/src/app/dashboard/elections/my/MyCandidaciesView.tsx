"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@adeeb/design-system";
import { Prohibit } from "@phosphor-icons/react";
import { ConfirmDialog } from "../../_components/ConfirmDialog";
import { useToast } from "../../_components/ToastProvider";
import { Breadcrumb } from "../../_shell/Breadcrumb";
import { CandidacyJourney } from "../_member/CandidacyJourney";
import { withdrawCandidacy } from "../actions";
import type { CandidacyJourney as CJ } from "../member-data";

/** باب «سِجلّ ترشُّحي» — كلُّ ترشّحٍ رحلةً كاملة، والتعديلُ/السحبُ في محطّته الحاليّة (بحسب ما يُتاح). */
export function MyCandidaciesView({ items, error }: { items: CJ[]; error: string | null }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [withdraw, setWithdraw] = useState<CJ | null>(null);

  const doWithdraw = () => {
    if (!withdraw) return;
    start(async () => {
      const r = await withdrawCandidacy(withdraw.candidateId);
      if (r.ok) { toast.success(r.message); setWithdraw(null); router.refresh(); } else toast.error(r.message);
    });
  };

  return (
    <>
      <div className="ash-phead"><div><Breadcrumb /><h1>سِجلّ ترشُّحي</h1></div></div>

      {error ? <Alert tone="warning" title="تعذّر جلب ترشّحاتك">{error}</Alert> : null}
      {!error && items.length === 0 ? (
        <Alert tone="info" title="لا ترشّحات بعد">حين تترشّح لانتخابٍ، تظهر هنا رحلتُه: حالتُه وبيانُه وخطُّ أحداثه.</Alert>
      ) : null}

      <div className="mpage">
        {items.map((c) => (
          <CandidacyJourney
            key={c.candidateId}
            c={c}
            onEdit={() => router.push(`/dashboard/elections/my/${c.electionId}`)}
            onWithdraw={() => setWithdraw(c)}
          />
        ))}
      </div>

      <ConfirmDialog
        open={withdraw !== null}
        onClose={() => setWithdraw(null)}
        tone="danger"
        icon={<Prohibit weight="bold" />}
        title="سحب الترشّح؟"
        text={withdraw ? `سيُسحب ترشّحك في «${withdraw.position}» نهائيًّا في هذه الدورة.` : undefined}
        confirmLabel="نعم، اسحب"
        loading={pending}
        onConfirm={doWithdraw}
      />
    </>
  );
}
