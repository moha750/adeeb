"use client";

import { useState } from "react";
import { Avatar } from "../../../dashboard/_components/Avatar";
import { IconBell, IconCaretDown } from "../../../dashboard/_shell/icons";
import { MobileSheet, MobileTabs } from "../../../dashboard/_shell/MobileNav";
import { navFor } from "../../../dashboard/_shell/nav";
import { ToastProvider } from "../../../dashboard/_components/ToastProvider";
import { QrStatsView } from "../../../dashboard/tools/qr/QrStatsView";
import type { QrStats } from "../../../dashboard/tools/qr/data";
import { defaultQrSpec } from "../../../dashboard/tools/qr/defaults";
import { qrShortUrl } from "@/lib/qrLinks";
import type { MyScope } from "@/lib/myScope";

/**
 * **شاشةُ إحصاء الباركود في نافذةٍ حيّة** — الغرفةُ خلف تسجيل الدخول، فلا تُرى للحكم عليها.
 * فتُعرَض هنا بالمكوّن نفسِه (`QrStatsView`) وبياناتٍ مصنوعةٍ تشبه الواقع: وجهةٌ طويلة
 * كروابط النماذج، وثلاثون يومًا فيها ذروةٌ وسكون، وأجهزةٌ متفاوتة.
 *
 * وأفعالُها معطَّلةُ الأثر عمدًا: مزوّدُ التوست حاضرٌ فلا تسقط الصفحة، والكتابةُ لا تصل
 * قاعدةً (الأفعالُ الخادميّة تُردّ بلا جلسة). الغرضُ **النظرُ والقياس** لا التشغيل.
 */

const CAPS = ["view_own_membership", "view_members", "manage_activities", "use_qr_generator"];
const SCOPE: MyScope = {
  unit: null, units: [], department: null, committee: { id: 1, name: "لجنة الإعلام" },
  elections: { canRun: false, hasCandidacy: false, canVote: false },
};

const TARGET =
  "https://docs.google.com/forms/d/e/1FAIpQLSfIcJy9H2uBAMo-FbtaXCkpDAoxQCpgAWxRZfNtvbGYZ-MTpw/viewform?usp=publish-editor";

/** ثلاثون يومًا: سكونٌ ثمّ ذروةُ يوم الحدث ثمّ ذيل. رقمٌ مصنوعٌ لا عشوائيّ، فالصورة تتكرّر. */
const DAILY = Array.from({ length: 30 }, (_, i) => {
  const day = new Date(Date.UTC(2026, 7, 28 - (29 - i)));
  const key = day.toISOString().slice(0, 10);
  const shape = [0, 0, 1, 0, 2, 1, 0, 3, 2, 1, 0, 0, 4, 6, 9, 14, 11, 7, 4, 3, 2, 2, 1, 3, 2, 1, 0, 1, 2, 4];
  return { day: key, count: shape[i] };
});

const LINK = {
  id: "demo", code: "e4trprm", title: "الملتقى التعريفيّ لبرنامج الولاء الوظيفيّ «دوم»",
  targetUrl: TARGET, spec: defaultQrSpec(qrShortUrl("e4trprm")),
  active: true, ownerId: "demo-owner", scanCount: 86, createdAt: "2026-07-30T09:00:00Z", updatedAt: "2026-08-27T09:00:00Z",
};

/**
 * القراءةُ الأعمقُ مصنوعةٌ بنمطٍ يشبه الواقع: ذروةٌ عند الحادية عشرة صباحًا (وقتُ المرور
 * بين المحاضرتين) وأخرى عند الثامنة مساءً، وسكونٌ في الفجر. والأسبوعُ يصعد ثمّ يهدأ.
 */
const HOUR_SHAPE = [0, 0, 0, 0, 0, 1, 2, 5, 9, 12, 16, 21, 14, 8, 6, 7, 9, 11, 13, 17, 12, 6, 3, 1];
const DEEP = {
  hours: HOUR_SHAPE,
  heat: Array.from({ length: 7 }, (_, d) =>
    HOUR_SHAPE.map((v) => Math.round(v * [0.9, 1.2, 1.1, 1, 0.8, 0.3, 0.5][d] * 0.25)),
  ),
  firstScan: "2026-07-30T09:12:00Z",
  lastScan: "2026-09-04T19:41:00Z",
  thisWeek: 38,
  lastWeek: 26,
};

const STATS: QrStats = {
  link: LINK,
  daily: DAILY,
  devices: [{ key: "mobile", count: 83 }, { key: "tablet", count: 2 }, { key: "desktop", count: 1 }],
  bots: 0,
  clipped: false,
  ...DEEP,
  error: null,
};

/** **الفارغةُ تُعرَض كما تُعرَض المملوءة**: أوّلُ يومٍ لباركودٍ لم يُمسح بعد، وهي الحالُ
 *  التي يراها صاحبُه لحظةَ إنشائه — فتُقاس هنا لا في الإنتاج. */
const EMPTY: QrStats = {
  ...STATS,
  link: { ...LINK, scanCount: 0, createdAt: "2026-08-31T09:00:00Z" },
  daily: [{ day: "2026-08-31", count: 0 }],
  devices: [],
};

export default function QrStatsScreen() {
  const [open, setOpen] = useState(false);
  const [empty, setEmpty] = useState(false);
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
              {/* مبدّلُ المعرض: بياناتٌ أو باركودٌ لم يُمسح بعد. لا وجودَ له في الإنتاج. */}
              <button type="button" className="abtn abtn-ghost abtn-sm" onClick={() => setEmpty((v) => !v)}>
                {empty ? "بيانات" : "بلا مسحات"}
              </button>
              <span className="ash-bell" aria-hidden><IconBell /><i /></span>
            </div>
          </header>
          <div className="ash-content">
            <QrStatsView stats={empty ? EMPTY : STATS} range={{ preset: "all", from: null, to: null }} />
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
