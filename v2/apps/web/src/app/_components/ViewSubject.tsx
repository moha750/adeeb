"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import type { ViewSubjectKind } from "@adeeb/core/tracking";
import { declareViewSubject } from "@/lib/viewSubject";

/**
 * **الصفحةُ تقول ما تعرضه** (٢٠٢٦-١١-١٧). يوضع حيث صُيِّر الموضوعُ فعلًا (بعد التحقّق منه، لا قبله)،
 * فتُعدّ مشاهدتُه من الزيارة نفسها: الخبرُ والكتابُ والاستبيانُ بعدّادٍ واحد، يستثني الروبوتَ والتطوير
 * واللوحة كما يستثنيها `VisitTracker`. ولا يُعدّ شيءٌ لم يُصيَّر: صفحةُ «غير موجود» أو «للأعضاء» لا تضعه.
 *
 * لا يرسم شيئًا. وهو البابُ الوحيد لعدّ المشاهدة: لا نداءَ عدٍّ من المتصفّح ولا من تصيير الخادم.
 */
export function ViewSubject({ kind, id }: { kind: ViewSubjectKind; id: string | number }) {
  const path = usePathname();
  const sid = String(id);
  useEffect(() => {
    if (!path) return;
    return declareViewSubject(path, { kind, id: sid });
  }, [path, kind, sid]);
  return null;
}
