"use client";

import { useRouter } from "next/navigation";
import { useToast } from "../../../../_components/ToastProvider";
import type { QrSpecSaver } from "../../QrToolView";
import { updateQrSpec } from "../../actions";
import type { QrLinkRow } from "../../data";
import { QrDesignRoom } from "@/app/_ad/rooms/QrDesignRoom";

/**
 * **الخطوةُ الثانية: الشكل.**
 *
 * وصلةٌ بين الغرفة وأفعالها. والغرفةُ «المنضدة» (`_ad/rooms/QrDesignRoom`، اعتمدها محمد ٢٠٢٦-١١-١٧) مكانَ `QrToolView`:
 * لا «حفظ» ولا «تحميل» فيها، والفعلُ الواحدُ «تمّ» إلى بيت الباركود حيث يُحمَّل ويُنسخ رابطُه.
 */
export function QrDesignView({ link, fresh }: { link: QrLinkRow; fresh?: boolean }) {
  const toast = useToast();
  const router = useRouter();

  const onSaveSpec: QrSpecSaver = async (spec, opts) => {
    const res = await updateQrSpec(link.id, spec);
    if (res.ok) {
      // الحفظُ التلقائيّ صامت: توستٌ كلّ ثانيتين ضجيجٌ لا خبر. والخطأُ يُقال في الحالين.
      if (!opts?.silent) toast.success("حُفظ التصميم.");
      router.refresh();
    } else {
      toast.error(res.message);
    }
    return res;
  };

  return <QrDesignRoom link={link} fresh={fresh} done={`/dashboard/tools/qr/${link.id}${fresh ? "?ready=1" : ""}`} onSaveSpec={onSaveSpec} />;
}
