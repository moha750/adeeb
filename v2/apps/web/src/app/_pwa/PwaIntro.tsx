"use client";

import { useEffect, useState } from "react";
import { Button, Modal } from "@adeeb/design-system";
import { PwaContent } from "./PwaContent";
import { usePwa } from "./usePwa";

/**
 * **نافذةُ الاستقبال** — تظهر وحدَها **مرّةً** لمن يدخل من جوّال (الخيار «ب» بإقرار المالك
 * ٢٠٢٦-١٠-٠٣)، في موضعين لا ثالث لهما:
 * - **قبل التثبيت** (آيفون من تبويب): تعلّمه الخطوات الثلاث.
 * - **بعده، أو في أندرويد**: تطلب الإذن بالإشعارات.
 *
 * وإغلاقُها يُحفظ لكلّ موضعٍ على حدة: من أغلقها قبل التثبيت تستقبله مرّةً ثانيةً بعده، لأنّ
 * تطبيق آيفون المثبَّت ذاكرتُه غيرُ ذاكرة سفاري أصلًا. ولا تعود بعدها؛ والبطاقةُ في الحساب
 * باقيةٌ لمن أراد. والحاسوبُ لا تُعرض عليه: الإشعارُ فيه أقلُّ شأنًا من أن يُقاطَع لأجله.
 */
const KEY = "adeeb.pwa.intro.";
const DELAY_MS = 1500;

function seen(group: string): boolean {
  try {
    return localStorage.getItem(KEY + group) === "1";
  } catch {
    return true; // ذاكرةٌ لا تُكتب = لا نضمن ألّا تعود، فلا تُعرض أصلًا
  }
}
function markSeen(group: string) {
  try {
    localStorage.setItem(KEY + group, "1");
  } catch {
    /* لا شيء */
  }
}

export function PwaIntro() {
  const pwa = usePwa();
  const [openFor, setOpenFor] = useState<string | null>(null);
  const mobile = pwa.platform === "ios" || pwa.platform === "android";
  const group = pwa.stage === "ios-install" ? "install" : pwa.stage === "ready" ? "enable" : null;

  useEffect(() => {
    if (!mobile || !group || seen(group)) return;
    const t = window.setTimeout(() => setOpenFor(group), DELAY_MS);
    return () => window.clearTimeout(t);
  }, [mobile, group]);

  const close = () => {
    if (openFor) markSeen(openFor);
    setOpenFor(null);
  };

  return (
    <Modal
      open={openFor !== null}
      onClose={close}
      busy={pwa.busy === "enable"}
      title="أَدِيب على جوّالك"
      description="تطبيقٌ على شاشتك الرئيسيّة، وإشعاراتٌ على شاشة القفل"
      footer={
        <Button variant="ghost" onClick={close} disabled={pwa.busy === "enable"}>
          {pwa.stage === "on" ? "تمّ" : "ليس الآن"}
        </Button>
      }
    >
      <PwaContent pwa={pwa} />
    </Modal>
  );
}
