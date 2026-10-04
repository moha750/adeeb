"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Modal } from "@adeeb/design-system";
import { Megaphone, TextAa } from "@phosphor-icons/react";
import { PencilSimple } from "@/app/_components/glyphs";
import { useToast } from "../../../_components/ToastProvider";
import { QR_CAMPAIGN_NAME_MAX, QR_CAMPAIGN_NOTE_MAX } from "@/lib/qrLinks";
import { createQrCampaign, renameQrCampaign } from "./actions";
import type { QrCampaignRow } from "./data";

/**
 * **نافذةُ الحاوية: إنشاءً وتعديلًا** — نموذجٌ واحدٌ يخدم البابين.
 *
 * القائمةُ تُنشئ وتُعدّل، والغرفةُ تُعدّل حاويتَها، وحقلاهما واحدٌ حرفًا بحرف. فلو كُتب في
 * الموضعين لافترق حدُّ الطول في أحدهما يومَ يتغيّر (سابقةُ `EditTargetModal` التي وُحّدت
 * بعد أن افترق نصُّها في جرد ٢٠٢٦-٠٩-٠٥).
 *
 * **والحالةُ تُبذَر بالمفتاح لا بأثر**: يُركَّب المكوّنُ من جديدٍ لكلّ صفٍّ يُفتح
 * (`key` عند المستدعي)، فلا `useEffect` يزامن حقلًا مع خاصّيّة.
 */
export function CampaignFormModal({
  open,
  row,
  onClose,
  onDone,
}: {
  open: boolean;
  /** الحاويةُ المعدَّلة، أو `null` لحاويةٍ جديدة. */
  row: QrCampaignRow | null;
  onClose: () => void;
  /** يُنادى بعد نجاحٍ ومعه معرّفُ الحاوية (المُنشأة أو المعدَّلة). */
  onDone?: (id: string) => void;
}) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startPending] = useTransition();
  const [name, setName] = useState(row?.name ?? "");
  const [note, setNote] = useState(row?.note ?? "");

  const save = () => {
    startPending(async () => {
      const res = row
        ? await renameQrCampaign(row.id, { name, note })
        : await createQrCampaign({ name, note });
      if (!res.ok) { toast.error(res.message); return; }
      toast.success(res.message);
      onClose();
      onDone?.(res.id ?? row?.id ?? "");
      router.refresh();
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={pending}
      title={row ? "تعديل الحملة" : "حملةٌ جديدة"}
      description="حاويةٌ تجمع ملصقاتِ عملٍ واحدٍ فتُقرأ مجموعةً، ويبقى لكلّ ملصقٍ رمزُه وعدّادُه."
      footer={
        <>
          <Button variant="primary" size="md" loading={pending} disabled={!name.trim()} onClick={save}>
            {row ? "حفظ" : "إنشاء الحملة"}
          </Button>
          <Button variant="ghost" size="md" disabled={pending} onClick={onClose}>إلغاء</Button>
        </>
      }
    >
      <div className="form-grid">
        <Field
          className="form-full"
          label="اسم الحملة"
          icon={<Megaphone />}
          innerIcon={<TextAa />}
          placeholder="معرض اليوم الوطنيّ"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, QR_CAMPAIGN_NAME_MAX))}
          required
        />
        <Field
          className="form-full"
          label="تعريفٌ قصير"
          icon={<TextAa />}
          innerIcon={<PencilSimple />}
          placeholder="ستّةُ مواضعَ في المعرض"
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, QR_CAMPAIGN_NOTE_MAX))}
          helper="يُقرأ تحت الاسم في الكرت، ويُترَك فارغًا بلا حرج."
          optional
        />
      </div>
    </Modal>
  );
}
