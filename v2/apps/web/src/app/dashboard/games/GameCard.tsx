"use client";

import { Badge, Button, Card, CardBody, CardFooter, CardHeader } from "@adeeb/design-system";
import { Timer, UsersThree } from "@phosphor-icons/react";
import { CaretLeft } from "@/app/_components/glyphs";
import { AR_PLAYER, arCount } from "@/lib/arabicCount";
import { DropdownMenu, type MenuGroup } from "../_components/DropdownMenu";
import { ROOM_STATUS_META } from "./vocab";
import type { RoomRow } from "./data";

/**
 * **كرتُ غرفة اللعب** — النموذجُ الرابع، أُقِرّ من المالك ٢٠٢٦-٠٨-٢٦ من بين أربعةٍ
 * في `/ui/game-cards`، وأُعدمت قواعدُ الثلاثة الباقية.
 *
 * وفكرتُه أنّ **المضمارَ يُرى قبل أن يُقرأ الرقم**: من يمسح قائمةَ الغرف يعرف أين
 * بلغت كلٌّ منها بنظرةٍ واحدة، ثمّ يقرأ «٣ من ١٠» إن أراد الدقّة.
 *
 * **والأيقوناتُ في رقاقة `.tico-card`** (أمرُ المالك في القرار نفسِه): مربّعٌ متراكزٌ
 * بخلفيّة Aurora **تتبع نغمةَ الكرت** (`--card-t`/`--card-aurora`، ق٤) فلا تنشز
 * رقاقةٌ زرقاءُ على سطحٍ أخضر، ولا تذوب الأيقونةُ في سطرٍ صغير.
 *
 * **ولماذا كرتٌ مرسومٌ لا `DataCards`:** الخدمةُ ترسم الكرتَ من أعمدة الجدول، ولا
 * تعبير فيها عن مضمارٍ يقرأ نسبةً من عمودين. وهي سابقةُ `SurveyCard` و`FactCard`
 * و`EventCard` — الكرتُ يُرسَم حين يطلب المحتوى شكلًا لا تصفه الأعمدة.
 */
export function GameCard({
  room,
  actions,
  onOpen,
}: {
  room: RoomRow;
  actions: MenuGroup[];
  onOpen: () => void;
}) {
  const meta = ROOM_STATUS_META[room.status];
  // النغمةُ تُعلَن على الكرت مرّةً فتقرؤها الرقاقةُ والحدُّ والظلُّ والتذييل (ق٤).
  const tone = room.status === "active" ? "success" : room.status === "waiting" ? "warning" : undefined;
  const pct = room.wordCount > 0 ? Math.round((room.playedCount / room.wordCount) * 100) : 0;
  /** الفعلُ يقول ما سيقع: لا مِقوَدَ في غرفةٍ انتهت. */
  const action = room.status === "finished" ? "النتائج" : "فتحُ المِقوَد";
  /**
   * **والزرُّ يلبس نغمةَ كرته** (رآه المالك: «لماذا الزر ليس بلون الكارد؟»): كان
   * `ghost` فولاذيًّا على سطحٍ أخضر، وهو عينُ النشاز الذي عولج في `.tico-card`.
   * وق٤ تقولها: السطحُ المنغَّم لا يفقد نغمتَه في أجزائه.
   */
  const btn = tone === "success" ? "ghost-success" : tone === "warning" ? "ghost-warning" : "ghost";
  /** «لا لاعبين بعد» أصدقُ من «٠ لاعبًا» — الصفرُ حالٌ تُقال لا عددٌ يُطبَع. */
  const players = room.playerCount === 0 ? "لا لاعبين بعد" : arCount(room.playerCount, AR_PLAYER);

  return (
    <Card tone={tone} className={`gwc-tone-${room.status}`}>
      {/* **الشارةُ في رُكن الرأس** (سؤالُ المالك ٢٠٢٦-٠٨-٢٦): كانت سطرًا مستقلًّا تحت
          العنوان، فتزيد الكرتَ صفًّا كاملًا فيطول عن إخوته في الصفّ. ورُكنُ الرأس
          (`.acard-hactions`) موضعُها في كروت المستودع — `ElectionCard` تضعها فيه بعينه —
          فتقع على سطر العنوان نفسِه ولا تزيد ارتفاعًا. */}
      <CardHeader
        className="gwc-head"
        variant="chip"
        title={room.title}
        actions={
          <span className="flex shrink-0 items-center gap-1">
            <Badge tone={meta.tone} dot>
              {meta.label}
            </Badge>
            {actions.length > 0 ? <DropdownMenu groups={actions} tone={tone} /> : null}
          </span>
        }
      />
      <CardBody className="pt-3">
        {/* **الرمزُ سطرٌ مستقلٌّ بلا أيقونة** (أمرُ المالك ٢٠٢٦-٠٨-٢٦): هو هويّةُ الغرفة
            عند اللاعبين، ورقاقةُ الهاشتاق تُقزّمه وتزاحمه بلا أن تزيد معنًى.
            ولاتينيٌّ محضٌ فيُعزَل اتّجاهُه، وإلّا انتقلت محايداتُه إلى الطرف الآخر. */}
        <p className="gwc-code" dir="ltr">
          {room.code}
        </p>

        {/* الجولاتُ في صدر السطر واللاعبون في عَجُزه، فوق المضمار مباشرةً: ما يُعنوِن
            المضمارَ يلاصقه. (أمرُ المالك في الترتيب نفسِه.) */}
        <div className="mt-3 flex items-center justify-between gap-3 text-sm">
          <span className="flex items-center gap-2">
            <span className="tico tico-card" aria-hidden>
              <Timer />
            </span>
            <span className="text-content-muted">
              الجولات{" "}
              <span className="lat" dir="ltr">
                {room.playedCount}/{room.wordCount}
              </span>
            </span>
          </span>
          <span className="flex items-center gap-2">
            <span className="tico tico-card" aria-hidden>
              <UsersThree />
            </span>
            <span className="text-content-muted">{players}</span>
          </span>
        </div>

        <div className="gwc-rail mt-2" role="presentation">
          <span style={{ width: `${pct}%` }} />
        </div>
      </CardBody>

      {/* تذييلُ «خبرٌ وفعل» بنسق `ElectionCard` و`CandidateCard`: نصٌّ هادئٌ يبتلع
          الفراغَ، وزرٌّ `shrink-0` لا يُضغَط ويهبط صفَّه وحدَه حين يضيق الكرت. */}
      <CardFooter>
        <span className="text-sm text-content-muted">أُنشئت {room.createdAtLabel}</span>
        <Button variant={btn} size="sm" className="shrink-0" onClick={onOpen}>
          {action}
          <CaretLeft aria-hidden />
        </Button>
      </CardFooter>
    </Card>
  );
}
