"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal, Select, Textarea, type SelectOption } from "@adeeb/design-system";
import { CalendarBlank, ChatCenteredText, HandHeart, NotePencil, SealCheck, UserCircle } from "@phosphor-icons/react";
import { Avatar } from "../../_components/Avatar";
import { useToast } from "../../_components/ToastProvider";
import { issueManualCertificate } from "../actions";
import type { ManualIssueOptions } from "../data";

/**
 * **إصدارُ شهادةٍ لمتطوّعٍ بلا طلب** (طلبُ المالك ٢٠٢٦-١٠-٠٣) — فعلُ رأس الغرفة.
 *
 * لمن شارك فعلًا ولم يقدّم من الموقع: يُختار المتطوّعُ والفرصةُ (وفترتُها إن كانت لها فترات) ويُكتب السبب، فتكتب
 * القاعدةُ طلبَه مقبولًا حاضرًا بيد المُصدِر، ثمّ تصدر الشهادةُ من المُصدِر الواحد نفسِه
 * (`issue_manual_participation_certificate`). والسببُ يُحفظ في ملاحظته الإداريّة، فلا يراه المتطوّع.
 * ومن له طلبٌ في الفرصة يُكمَل من سجلّ الفرصة: القاعدةُ تردّه هنا ولا تتجاوز حكمَها.
 */
export function ManualIssueModal({ open, onClose, options }: {
  open: boolean;
  onClose: () => void;
  options: ManualIssueOptions;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [userId, setUserId] = useState("");
  const [oppId, setOppId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [reason, setReason] = useState("");

  const people: SelectOption[] = useMemo(
    () => options.volunteers.map((v) => ({
      value: v.id,
      label: v.name,
      hint: [v.former ? "متطوّعٌ سابق" : null, v.phone || null].filter(Boolean).join("، ") || undefined,
      icon: <Avatar name={v.name} src={v.avatar ?? undefined} gender={v.gender} size="xs" />,
    })),
    [options.volunteers],
  );
  const opps: SelectOption[] = useMemo(
    () => options.opportunities.map((o) => ({
      value: o.id,
      label: o.title,
      hint: [o.committee, o.dateLabel].filter(Boolean).join("، ") || undefined,
    })),
    [options.opportunities],
  );
  const opp = options.opportunities.find((o) => o.id === oppId) ?? null;
  const periods: SelectOption[] = (opp?.periods ?? []).map((p) => ({ value: p.id, label: p.label }));
  const ready = !!userId && !!opp && (periods.length === 0 || !!periodId) && reason.trim().length >= 5;

  const reset = () => { setUserId(""); setOppId(""); setPeriodId(""); setReason(""); };
  const close = () => { if (!pending) { onClose(); reset(); } };

  const submit = () => {
    if (!ready || !opp) return;
    start(async () => {
      const r = await issueManualCertificate(userId, opp.id, periods.length ? periodId : null, reason);
      if (!r.ok) { toast.error(r.message); return; }
      toast.success(r.message);
      onClose();
      reset();
      router.refresh();
    });
  };

  return (
    <Modal
      open={open}
      onClose={close}
      size="sm"
      busy={pending}
      title="إصدار شهادة"
      description="لمن شارك ولم يقدّم من الموقع. يُسجَّل له طلبٌ مقبولٌ حاضرٌ باسمك، وتصدر شهادتُه برقمها وتظهر في حسابه."
      footer={
        <>
          <Button variant="primary" size="md" loading={pending} disabled={!ready} onClick={submit}>
            <SealCheck aria-hidden /> إصدار
          </Button>
          <Button variant="ghost" size="md" onClick={close} disabled={pending}>إلغاء</Button>
        </>
      }
    >
      <Select
        label="المتطوّع"
        icon={<UserCircle />}
        options={people}
        value={userId}
        onValueChange={setUserId}
        searchable
        required
      />
      <Select
        label="الفرصة"
        icon={<HandHeart />}
        options={opps}
        value={oppId}
        // فترةُ فرصةٍ لا تصلح لأخرى، والفترةُ الوحيدةُ تُختار عن صاحبها
        onValueChange={(v) => {
          setOppId(v);
          const ps = options.opportunities.find((o) => o.id === v)?.periods ?? [];
          setPeriodId(ps.length === 1 ? ps[0]!.id : "");
        }}
        searchable
        required
        helper="الفرصُ المنشورةُ التي حلّ موعدُها."
      />
      {periods.length ? (
        <Select
          label="الفترة"
          icon={<CalendarBlank />}
          options={periods}
          value={periodId}
          onValueChange={setPeriodId}
          required
        />
      ) : null}
      <Textarea
        label="السبب"
        icon={<ChatCenteredText />}
        innerIcon={<NotePencil />}
        placeholder="لماذا يُصدَر بلا طلب؟ (أُضيف يومَ الفعاليّة، جاء بديلًا لغائب…)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        required
        helper="خمسة أحرف فأكثر. يُحفظ في ملاحظته الإداريّة ولا يراه المتطوّع."
      />
    </Modal>
  );
}
