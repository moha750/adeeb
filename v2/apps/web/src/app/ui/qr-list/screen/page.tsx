"use client";

import { useState } from "react";
import { Avatar } from "../../../dashboard/_components/Avatar";
import { IconBell, IconCaretDown } from "../../../dashboard/_shell/icons";
import { MobileSheet, MobileTabs } from "../../../dashboard/_shell/MobileNav";
import { navFor } from "../../../dashboard/_shell/nav";
import { ToastProvider } from "../../../dashboard/_components/ToastProvider";
import { SavedLinksView } from "../../../dashboard/tools/qr/SavedLinksView";
import { defaultQrSpec } from "../../../dashboard/tools/qr/defaults";
import type { QrLinkRow } from "../../../dashboard/tools/qr/data";
import { qrShortUrl } from "@/lib/qrLinks";
import type { MyScope } from "@/lib/myScope";

/**
 * **قائمةُ الباركودات في نافذةٍ حيّة** — الغرفةُ خلف تسجيل الدخول، فتُعرَض هنا بالمكوّن
 * نفسِه وبصفوفٍ مصنوعةٍ تشبه حملةً حقيقيّة: ستّةُ ملصقاتٍ لحملة التسجيل في ستّة مواضع،
 * وباركودان خارجها، وواحدٌ موقوف.
 *
 * وأفعالُها معطَّلةُ الأثر: الكتابةُ لا تبلغ قاعدةً (الأفعالُ الخادميّة تُردّ بلا جلسة).
 * الغرضُ **النظرُ إلى الحملات والوسم الجماعيّ** لا التشغيل.
 */

const CAPS = ["view_own_membership", "use_qr_generator"];
const SCOPE: MyScope = {
  unit: null, units: [], department: null, committee: { id: 1, name: "لجنة الإعلام" },
  elections: { canRun: false, hasCandidacy: false, canVote: false },
};

const row = (
  i: number,
  title: string,
  host: string,
  scans: number,
  active = true,
): QrLinkRow => ({
  id: `demo-${i}`,
  code: `demo${i}xy`,
  title,
  targetUrl: `https://${host}/x`,
  spec: defaultQrSpec(qrShortUrl(`demo${i}xy`)),
  active,
  ownerId: "demo-owner",
  scanCount: scans,
  createdAt: new Date(Date.UTC(2026, 7, 20 + i)).toISOString(),
  updatedAt: new Date(Date.UTC(2026, 8, 1)).toISOString(),
});

const ROWS: QrLinkRow[] = [
  row(1, "ملصق بوّابة الكلّيّة", "docs.google.com", 210),
  row(2, "ملصق طاولة المدخل", "docs.google.com", 80),
  row(3, "ملصق لوحة الإعلانات", "docs.google.com", 15),
  row(4, "منشور إنستغرام", "docs.google.com", 96),
  row(5, "شاشة القاعة", "docs.google.com", 29),
  row(6, "ظهر كرت العضوية", "adeeb.club", 12),
  row(7, "ملصق إذاعة أديب", "youtube.com", 143),
  row(8, "ملصق معرض الكتاب", "adeeb.club", 61, false),
];

export default function QrListScreen() {
  const [open, setOpen] = useState(false);
  const nav = navFor(CAPS, SCOPE);

  return (
    <ToastProvider>
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
            <SavedLinksView rows={ROWS} error={null} />
          </div>
          <div className="ash-mob">
            <MobileTabs nav={nav} pathname="/dashboard/tools/qr" sheetOpen={open} onOpenAll={() => setOpen(true)} />
            <MobileSheet nav={nav} pathname="/dashboard/tools/qr" open={open} onClose={() => setOpen(false)} />
          </div>
        </div>
      </div>
    </ToastProvider>
  );
}
