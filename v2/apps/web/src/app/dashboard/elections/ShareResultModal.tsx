"use client";

/**
 * **نافذةُ مشاركة النتيجة** — بابٌ واحدٌ يجمع ما يُرسَل: الصورةُ تُرى قبل أن تُرسَل، والتهنئةُ
 * تُقرأ قبل أن تُنسَخ. وكانا زرَّين متجاورين في التنبيه، فكان النسخُ **قفزةً في الظلام** (تنسخ
 * كلامًا لم تره) والبطاقةُ تُنزَّل على غير رؤية.
 *
 * **والنصُّ يُحرَّر**: التهنئةُ كلامُ مرسِلها، فمن أراد أن يزيد فيها لمقعدٍ بعينه زاد قبل النسخ،
 * ولا يُبدَّل الكودُ كلّما اختلفت مناسبة. والأصلُ يعود بزرّ «أعِد النصّ الأصليّ».
 */

import { useEffect, useState } from "react";
import { Button, Modal, Textarea } from "@adeeb/design-system";
import { ArrowUUpLeft } from "@/app/_components/glyphs";
import { Copy, DownloadSimple, Megaphone, Note } from "@phosphor-icons/react";
import { copyText } from "@/lib/clipboard";
import { renderResultCard, resultMessage, saveResultCard, type ResultCard } from "@/lib/elections/resultCard";
import { useToast } from "../_components/ToastProvider";

export function ShareResultModal({ card, open, onClose }: { card: ResultCard | null; open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [src, setSrc] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  // النصُّ يُبنى مرّةً عند فتح النافذة على مرشّحٍ بعينه، ثمّ يملكه المستخدم (تحريرُه لا يُداس)
  const key = card ? `${card.winner}|${card.position}|${card.votes}` : "";
  const [textKey, setTextKey] = useState("");
  if (open && card && textKey !== key) {
    setTextKey(key);
    setText(resultMessage(card));
  }

  // الصورةُ تُرسَم عند الفتح لا عند تركيب الصفحة (رسمُها يجلب خطوطًا ونقشًا)
  useEffect(() => {
    if (!open || !card) return;
    let url: string | null = null;
    let alive = true;
    renderResultCard(card)
      .then((blob) => { url = URL.createObjectURL(blob); if (alive) setSrc(url); })
      .catch(() => { if (alive) setSrc(null); });
    return () => { alive = false; if (url) URL.revokeObjectURL(url); setSrc(null); };
  }, [open, card]);

  const copy = async () => {
    try {
      await copyText(text);
      toast.success("نُسخت التهنئة، ألصِقها في القروب.");
    } catch {
      toast.error("تعذّر النسخ، حدّد النصّ وانسخه بيدك.");
    }
  };

  const save = async () => {
    if (!card) return;
    setBusy(true);
    try {
      const how = await saveResultCard(card, text);
      if (how === "shared") toast.success("بطاقة النتيجة جاهزة.");
      else if (how === "downloaded") toast.success("نُزّلت بطاقة النتيجة.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر توليد بطاقة النتيجة.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="مشاركة النتيجة"
      description="انظر البطاقة، واقرأ التهنئة قبل أن ترسلها في قروب القسم أو اللجنة."
      size="md"
      busy={busy}
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onClose} disabled={busy}>إغلاق</Button>
          <Button variant="ghost" size="md" onClick={copy} disabled={busy}><Copy size={18} />انسخ التهنئة</Button>
          <Button variant="primary" size="md" onClick={save} loading={busy}><DownloadSimple size={18} />احفظ البطاقة</Button>
        </>
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- صورةٌ مولَّدةٌ في المتصفّح (blob) لا أصلٌ يُحسّنه Next */}
      {src ? <img src={src} alt="بطاقة نتيجة الانتخاب" style={{ width: "100%", display: "block", borderRadius: "var(--radius)" }} />
        : <p className="txt">جارٍ رسم البطاقة…</p>}
      <Textarea
        label="التهنئة المرافقة"
        icon={<Megaphone />}
        innerIcon={<Note />}
        placeholder="نصّ التهنئة…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={7}
      />
      {card && text !== resultMessage(card) ? (
        <Button variant="ghost" size="sm" onClick={() => setText(resultMessage(card))}><ArrowUUpLeft size={18} />أعِد النصّ الأصليّ</Button>
      ) : null}
    </Modal>
  );
}
