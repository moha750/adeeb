"use client";

import { useState } from "react";
import { Avatar } from "../../dashboard/_components/Avatar";
import { IconBell, IconCaretDown } from "../../dashboard/_shell/icons";
import { MobileSheet, MobileTabs } from "../../dashboard/_shell/MobileNav";
import { navFor } from "../../dashboard/_shell/nav";
import type { MyScope } from "@/lib/myScope";
import { PageHeader } from "../../dashboard/_components/PageHeader";
import { QrToolView, type QrSpecSaver } from "../../dashboard/tools/qr/QrToolView";

/**
 * **شاشةُ المعرض** — اللوحةُ كما هي على الجهاز: ترويسةٌ وجزيرةُ تنقّلٍ ومحتوًى يُمرَّر في
 * `.ash-content`. تُعرض داخل `iframe` في `/ui/qr-dock`، فيصدق فيها ما يكذب في صندوقٍ
 * ضيّقٍ على شاشةٍ عريضة: عتبةُ الوسائط، و`fixed`، و`100dvh`.
 *
 * **والجزيرةُ حاضرةٌ عمدًا:** الورقةُ تنتهي عندها، ومرساها الأخيرُ معيَّرٌ عليها — فالحكمُ
 * في الفراغ يكذب.
 */

// رئيسُ نادٍ: خريطةٌ كاملة، وفيها مفتاحُ مولّد الباركود
const CAPS = [
  "view_own_membership", "view_members", "view_org_structure", "manage_activities",
  "manage_surveys", "manage_library", "use_qr_generator", "view_site_stats",
];
const SCOPE: MyScope = {
  unit: null,
  units: [{ id: 2, name: "الإدارة التنفيذيّة" }],
  department: { id: 3, name: "قسم المحتوى" },
  committee: { id: 1, name: "لجنة الإعلام" },
  elections: { canRun: false, hasCandidacy: false, canVote: false },
};

/** حافظٌ لا يحفظ: يقول ذلك صراحةً بدل أن يزعم نجاحًا لا صفَّ له في القاعدة. */
const showcaseSaver: QrSpecSaver = async () => ({
  ok: false,
  message: "هذه معاينةُ معرضٍ لا غرفةُ عمل: الحفظُ في «رموزي».",
});

/** رمزٌ للعرض وحده: بطول الرمز الحقيقيّ، فعددُ الوحدات في المعرض هو عددُها في الغرفة. */
const SHOWCASE_CODE = "d3m9qk4";

export function QrFrame() {
  const [open, setOpen] = useState(false);
  const nav = navFor(CAPS, SCOPE);

  return (
    <div className="ash">
      <div className="ash-main">
        <header className="ash-top">
          <span className="ash-greet">
            <Avatar name="محمّد إسماعيل" gender="male" className="ash-av" />
            <span className="ash-gtx">
              <span className="ash-ghi">مساءُ الخير 👋</span>
              <b>محمّد إسماعيل</b>
            </span>
            <IconCaretDown className="ash-gcaret" />
          </span>
          <div className="ash-tools">
            <span className="ash-bell" aria-hidden><IconBell /><i /></span>
          </div>
        </header>
        <div className="ash-content">
          {/* رأسُ الصفحة فوق المحرّر كما في باب التصميم بعينه: هو ما يقيسه المحرّرُ ليبدأ
              من تحته (`--qcanvas-top`)، فحذفُه هنا كان يُخفي القياسَ كلَّه. */}
          <PageHeader title="ملصق حفل الافتتاح" crumbLeaf="التصميم" />
          {/* والحفظُ يُناوَل هنا كما تناوله `‎/new`، وإلّا عُرض المحرّرُ ساكنًا والإنتاجُ متتبَّع
              فكذب المعرضُ على ناظره. ويردّ برسالةٍ صريحة: معرضٌ لا غرفة. */}
          <QrToolView code={SHOWCASE_CODE} embedded onSaveSpec={showcaseSaver} />
        </div>
        {/* الغلافُ `display: contents` يُطفَأ فوق ٨٦٠ (`.ash-mob`) كما في `DashboardShell`:
            بلا هذا تظهر جزيرةُ الجوّال في إطار العرض الواسع، فيكذب المعرضُ على ناظره. */}
        <div className="ash-mob">
          <MobileTabs nav={nav} pathname="/dashboard/tools/qr" sheetOpen={open} onOpenAll={() => setOpen(true)} />
          <MobileSheet nav={nav} pathname="/dashboard/tools/qr" open={open} onClose={() => setOpen(false)} />
        </div>
      </div>
    </div>
  );
}
