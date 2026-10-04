"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Modal, Select, countPhrase } from "@adeeb/design-system";
import { Megaphone } from "@phosphor-icons/react";
import { useToast } from "../../../_components/ToastProvider";
import { LINK_UNIT } from "./copy";
import { setLinksCampaign } from "./actions";
import type { QrCampaignBrief } from "./data";

/**
 * **نافذةُ الضمّ** — تُختار الحاويةُ لما هو محدَّد.
 *
 * وفعلٌ واحدٌ للواحد وللجملة: «ضُمّ» و«انقل» جوابان لا مساراتُ كود، والفرقُ بينهما جملةُ
 * الجواب في `setLinksCampaign`.
 *
 * **وليس فيها «إخراجٌ من الحملة»** (رآه المالك ٢٠٢٦-٠٩-٢٤ فسأل: «أهناك حملةٌ بهذا
 * الاسم؟»): بندٌ يقف في قائمة الحملات يُقرأ واحدًا منها. وكان يُعرَض كذلك لباركودٍ **مفردٍ**
 * لا حاويةَ له يخرج منها. **والإخراجُ له بابُه** في غرفة الحملة: فعلٌ في صفّه ونافذةُ
 * تأكيدٍ تقول تبعتَه.
 *
 * **والاختيارُ منسدلٌ لا قائمةٌ مبسوطة** (أمرُ المالك ٢٠٢٦-٠٩-٢٤): كانت `OptionList` تبسط
 * الحملاتِ في النافذة، فتطول النافذةُ بطول حملاتك وتُقرأ القائمةُ متنًا لا حقلَ اختيار.
 * والمنسدلُ يقول «هذا حقلٌ يُملأ»، وهو حقلُ نافذة المشاركة نفسُه (`Select` ببحثه)، فلا
 * يتعلّم المستعملُ شكلين لفعلٍ واحد في غرفةٍ واحدة.
 */
export function AssignCampaignModal({
  open,
  linkIds,
  campaigns,
  mode = "assign",
  onClose,
  onDone,
}: {
  /**
   * **الفعلُ يُسمّى بما هو** (٢٠٢٦-٠٩-٢٤): «ضمٌّ» لمفردٍ لا حاويةَ له، و«نقلٌ» لما هو في
   * حاويةٍ يُخرَج منها إلى أخرى. والنافذةُ واحدةٌ والكلماتُ تتبع الموضع.
   */
  mode?: "assign" | "move";
  open: boolean;
  linkIds: string[];
  campaigns: QrCampaignBrief[];
  onClose: () => void;
  onDone?: () => void;
}) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startPending] = useTransition();
  const [pick, setPick] = useState<string | null>(null);

  const save = () => {
    if (!pick) return;
    startPending(async () => {
      const res = await setLinksCampaign(linkIds, pick);
      if (!res.ok) { toast.error(res.message); return; }
      toast.success(res.message);
      onClose();
      onDone?.();
      router.refresh();
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={pending}
      size="sm"
      title={mode === "move" ? "نقلٌ إلى حملة أخرى" : "ضمٌّ إلى حملة"}
      description={
        mode === "move"
          ? `المحدَّد ${countPhrase(linkIds.length, LINK_UNIT)}. اختر حاويتَه الجديدة.`
          : `المحدَّد ${countPhrase(linkIds.length, LINK_UNIT)}. اختر حاويتَه.`
      }
      footer={
        // **ولا زرَّ فعلٍ حين لا حاويةَ تُختار**: زرٌّ رماديٌّ لا يُضغَط أبدًا حشوٌ في صفٍّ،
        // والدعوةُ في المتن («بابُ الحملات») هي الفعلُ الوحيدُ المتاح.
        campaigns.length ? (
          <>
            <Button variant="primary" size="md" loading={pending} disabled={!pick} onClick={save}>{mode === "move" ? "نقل" : "ضمّ"}</Button>
            <Button variant="ghost" size="md" disabled={pending} onClick={onClose}>إلغاء</Button>
          </>
        ) : (
          <Button variant="ghost" size="md" onClick={onClose}>إغلاق</Button>
        )
      }
    >
      {campaigns.length ? (
        <div className="form-grid">
          <Select
            className="form-full"
            label="الحملة"
            icon={<Megaphone />}
            value={pick ?? ""}
            onValueChange={setPick}
            searchable
            options={campaigns.map((c) => ({ value: c.id, label: c.name }))}
            helper={mode === "move" ? "الحاويةُ الحاليّةُ ليست في القائمة." : "حملاتُك أنت، فلا تُضمّ باركوداتُك إلى حملة غيرك."}
          />
        </div>
      ) : (
        <p className="txt">لا حملات بعد. أنشئ حملةً من بابها ثمّ عُد لتضمّ إليها.</p>
      )}
      {campaigns.length ? null : (
        <Link href="/dashboard/tools/qr/campaigns" className="abtn abtn-primary abtn-md">
          <Megaphone size={18} />بابُ الحملات
        </Link>
      )}
    </Modal>
  );
}
