"use client";

import { useRouter } from "next/navigation";
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

  const onSaveSpec: QrSpecSaver = async (spec) => {
    const res = await updateQrSpec(link.id, spec);
    if (res.ok) {
      toast.success("حُفظ التصميم.");
      router.refresh();
    } else {
      toast.error(res.message);
    }
    return res;
  };

  return (
    <>
      <PageHeader title={link.title} crumbLeaf="التصميم" />
      <QrToolView code={link.code} initial={link.spec} embedded onSaveSpec={onSaveSpec} />
    </>
  );
}
