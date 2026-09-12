"use client";

import { useRouter } from "next/navigation";
import { Alert } from "@adeeb/design-system";
import { useToast } from "../../../../_components/ToastProvider";
import { PageHeader } from "../../../../_components/PageHeader";
import { QrToolView, type QrSpecSaver } from "../../QrToolView";
import { updateQrSpec } from "../../actions";
import type { QrLinkRow } from "../../data";

/**
 * **الخطوةُ الثانية: الشكل.**
 *
 * وصلةٌ بين المحرّر وأفعال الغرفة، ووجودُها لعلّةٍ واحدة: `QrToolView` يُعرَض أيضًا في
 * `‎/ui/qr-dock` بلا مزوّدِ توست ولا مُوجِّه، فلا يجوز أن ينادي `useToast` بنفسه.
 */
export function QrDesignView({ link }: { link: QrLinkRow }) {
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

  return (
    <>
      <PageHeader title={link.title} crumbLeaf="التصميم" />
      {/* **الموقوفُ يُقال في غرفة تصميمه** (٢٠٢٦-٠٩-٠٥): كانت المعاينةُ تُعرَض حيّةً لرمزٍ
          يقود ماسحَه إلى صفحة «غير متاح»، فيُصمَّم ويُطبَع وهو ميّت. */}
      {link.active ? null : (
        <Alert tone="warning" title="الباركود موقوف">
          تصميمُك يُحفَظ، لكنّ من يمسحه الآن يرى صفحةً تقول إنّه غير متاح. تشغيلُه من صفحة الباركود.
        </Alert>
      )}
      <QrToolView code={link.code} title={link.title} initial={link.spec} embedded onSaveSpec={onSaveSpec} />
    </>
  );
}
