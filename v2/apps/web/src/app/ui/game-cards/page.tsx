"use client";

import { useState } from "react";
import { Container, Segmented } from "@adeeb/design-system";
import { fmtDate } from "@/lib/dates";
import { GameCard } from "../../dashboard/games/GameCard";
import type { RoomRow } from "../../dashboard/games/data";

/**
 * **معرضُ كرت غرفة اللعب.**
 *
 * عُرضت هنا أربعةُ نماذجَ في ٢٠٢٦-٠٨-٢٦، **وأُقِرّ الرابع** (المضمار) بأيقوناتٍ في
 * رقاقة `.tico-card`. فصارت الصفحةُ معرضَ المُقَرّ لا مضمارَ مفاضلة، وأُعدمت قواعدُ
 * الثلاثة الباقية من `components.css` في اليوم نفسِه (ق١: لا قاعدةَ بلا مستعمِل).
 *
 * **والتاريخُ يُطبَع بطابع الإنتاج** (`fmtDate`) لا بنصٍّ يُكتب بيد: كُتب مرّةً
 * بأرقامٍ عربيّةٍ فبدا المعرضُ يخالف الشاشةَ الحيّة، وهي لاتينيّةٌ دائمًا (الطابعُ
 * يبني من `Number`). فالمعرضُ ينادي المصدرَ الواحد ولا يحاكيه.
 *
 * **والحالاتُ الثلاثُ بمقاسات الواقع**: غرفةٌ جارية، وأخرى بعنوانٍ طويلٍ يلتفّ ولم
 * يدخلها أحد، وثالثةٌ انتهت — فالكرتُ يُحكَم عليه بأسوأ حالاته لا بأجملها.
 */

const ROOMS: RoomRow[] = [
  {
    id: "a",
    code: "G69GRA",
    title: "حفل قطوف",
    status: "active",
    secondsPerWord: 60,
    wordCount: 10,
    playedCount: 3,
    playerCount: 24,
    createdAt: "2026-08-26T10:00:00.000Z",
    createdAtLabel: fmtDate("2026-08-26T10:00:00.000Z"),
  },
  {
    id: "b",
    code: "AZSCGS",
    title: "أمسيةُ الشعر العربيّ في ختام الفصل",
    status: "waiting",
    secondsPerWord: 60,
    wordCount: 15,
    playedCount: 0,
    playerCount: 0,
    createdAt: "2026-08-26T10:00:00.000Z",
    createdAtLabel: fmtDate("2026-08-26T10:00:00.000Z"),
  },
  {
    id: "c",
    code: "K7MQPT",
    title: "ليلة أدِيب",
    status: "finished",
    secondsPerWord: 45,
    wordCount: 12,
    playedCount: 12,
    playerCount: 41,
    createdAt: "2026-08-14T10:00:00.000Z",
    createdAtLabel: fmtDate("2026-08-14T10:00:00.000Z"),
  },
];

const ACTIONS = [
  { header: "إجراءات", items: [{ label: "فتحُ المِقوَد", onSelect: () => {} }] },
];

export default function GameCardsPage() {
  const [width, setWidth] = useState("wide");
  const narrow = width === "narrow";

  return (
    <Container className="py-10">
      <h1 className="font-display text-3xl font-black text-content">كرتُ غرفة اللعب</h1>
      <p className="mt-2 text-content-muted">
        النموذجُ المُقَرّ: المضمارُ يُرى قبل أن يُقرأ الرقم، والأيقوناتُ في رقاقةٍ تتبع
        نغمةَ الكرت.
      </p>

      <div className="mt-6">
        <Segmented
          aria-label="عرضُ المعاينة"
          value={width}
          onValueChange={setWidth}
          items={[
            { value: "wide", label: "الحاسوب" },
            { value: "narrow", label: "الجوّال 375" },
          ]}
        />
      </div>

      <div className="mt-10">
        <div className={narrow ? "flex flex-wrap gap-6" : "card-grid"}>
          {ROOMS.map((r) => (
            <div key={r.id} style={narrow ? { width: 375, maxWidth: "100%" } : undefined}>
              <GameCard room={r} actions={ACTIONS} onOpen={() => {}} />
            </div>
          ))}
        </div>
      </div>
    </Container>
  );
}
