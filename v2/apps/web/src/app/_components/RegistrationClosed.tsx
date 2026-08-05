"use client";

import { useState } from "react";
import { Button, Modal } from "@adeeb/design-system";

/**
 * «التسجيل مغلق» — **المصدر الواحد لكلماتها**.
 *
 * كان بابُ الانضمام مسارًا كاملًا (`/join`) وحاله يُقرأ من `membership_settings`؛ ونُحر النظام
 * كلُّه ٢٠٢٦-٠٨-٠٤، فبقي الزرُّ ولم يبقَ خلفه باب. فالجوابُ الآن ههنا: نصٌّ ثابتٌ في الكود، لأنّ
 * الجدولَ الذي كان يحمله سقط، ولا يُبنى جدولٌ لجملةٍ واحدة.
 *
 * وتُركّب في موضعين (رأسُ الموقع وزرُّ الهبوط) — نسختان من المُطلِق، وكلمةٌ واحدة لا تفترق.
 */
export function RegistrationClosedModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="التسجيل مغلق"
      footer={<Button onClick={onClose}>حسنًا</Button>}
    >
      <p className="text-content-muted">
        بابُ الانضمام إلى نادي أدِيب مغلقٌ في الوقت الحاليّ. تابِعنا لتعرف موعد فتحه في الموسم القادم — ويسعدنا أن نراك حينها.
      </p>
    </Modal>
  );
}

/**
 * زرُّ الانضمام في صفحةٍ عامّة — يفتح النافذة بدل أن ينقل إلى بابٍ لم يعد قائمًا.
 * الصنفُ يأتي من المستدعي فيبقى الزرُّ بهيئة موضعه (مقلوبٌ كبيرٌ في الهبوط مثلًا).
 */
export function JoinCta({ className, children }: { className: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {children}
      </button>
      <RegistrationClosedModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
