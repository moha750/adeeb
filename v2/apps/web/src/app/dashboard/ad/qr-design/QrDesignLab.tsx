"use client";

import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { QrDesignRoom } from "@/app/_ad/rooms/QrDesignRoom";
import type { QrLinkRow } from "@/app/dashboard/tools/qr/data";

/** مختبر: الحفظُ لا يكتب شيئًا، و«تمّ» تنتهي إلى بيت الباركود في المختبر */
export function QrDesignLab({ link, fresh }: { link: QrLinkRow; fresh?: boolean }) {
  const toast = useToast();
  return <QrDesignRoom link={link} fresh={fresh} done={`/dashboard/ad/qr-home?id=${link.id}${fresh ? "&ready=1" : ""}`} onSaveSpec={async (_spec, opts) => {
    if (!opts?.silent) toast.info("مختبر: لم يُحفظ شيء.");
    return { ok: true, message: "مختبر" };
  }} />;
}
