"use client";

import { Button, Card, CardBanner } from "@adeeb/design-system";
import { Phone, Envelope, CalendarBlank, FileText } from "@phosphor-icons/react";
import { Avatar } from "../_components/Avatar";
import { DropdownMenu, type MenuGroup } from "../_components/DropdownMenu";
import type { MemberRow } from "./data";

type Props = {
  member: MemberRow;
  onOpen: () => void;
  actions: MenuGroup[];
  onRestore?: () => void;
  /** يفتح نافذة السبب — السبب مقصوص بـ«…» هنا، فالنقر يكشفه بلا فتح الملفّ كلّه. */
  onReason?: () => void;
};

// نغمة الكرت بحالة العضو — مصدر واحد يقرأ منه السطح والحدّ والظلّ وقائمة النقاط معًا (لا خريطة لكلّ طبقة).
// النشط بهوية العلامة (فولاذيّ) لا أخضر؛ الأخضر لشارة «نشط» فقط.
const TONE: Record<string, "brand" | "warning" | "danger"> = { active: "brand", pending: "warning", suspended: "danger" };

export function MemberCard({ member, onOpen, actions, onRestore, onReason }: Props) {
  const suspended = member.status === "suspended";
  const roleLine = [member.role, member.committee].filter(Boolean).join(" ") || "غير متوفّر";
  const tone = TONE[member.status];
  // القائمة تتبع نغمة الكرت — و«brand» هي مظهر القائمة الافتراضيّ (فولاذيّ) فلا تُمرَّر نغمةً،
  // كما في الجدول (SURFACE_TONE.active = undefined). نغمةٌ باسمٍ آخر للشيء نفسه تُفرِّق ما هو واحد.
  const menuTone = tone === "brand" ? undefined : tone;
  return (
    // كرت الشخص = بطاقة الهوية `.acard-profile` (النظام الموحَّد)، النغمة عبر خاصّيّة Card.
    <Card tone={tone} className="acard-profile">
      <CardBanner
        actions={
          // بلا بنود فلا مُطلِق: نقاطٌ تفتح قائمة فارغة وعدٌ كاذب (الموقوف: أزراره تقول كلّ شيء).
          actions.length > 0 ? (
            <span onClick={(e) => e.stopPropagation()}>
              <DropdownMenu groups={actions} triggerClassName="acard-dots" tone={menuTone} />
            </span>
          ) : undefined
        }
      />

      <Avatar name={member.name} src={member.avatar ?? undefined} gender={member.gender} size="xl" className="acard-av" />
      <h4 className="acard-pname">{member.name}</h4>
      {suspended
        ? <div className="acard-role acard-role-danger">{member.endAgo ? `عضوية منتهية ${member.endAgo}` : "عضوية منتهية"}</div>
        : <div className="acard-role">{roleLine}</div>}

      <div className="acard-info">
        {suspended ? (
          <>
            <div className="acard-info-row">
              <span className="acard-ic"><CalendarBlank aria-hidden /></span>
              <span className="acard-info-txt"><span className="acard-info-label">تاريخ إنهاء العضوية</span><span className="acard-info-val">{member.endDate || "غير مسجّل"}</span></span>
            </div>
            <div className="acard-info-row">
              <span className="acard-ic"><FileText aria-hidden /></span>
              <span className="acard-info-txt">
                <span className="acard-info-label">سبب إنهاء العضوية</span>
                {/* زرٌّ بهيئة القيمة (`.txt-more`) لا زرٌّ بجوارها — الكرت ضيّق، وصفٌّ إضافيّ يزاحمه.
                    ولا سبب ⇒ لا شيء يُكشف، فيبقى نصًّا باهتًا لا زرًّا يَعِد بما لا يملك. */}
                {member.endReason && onReason
                  ? <button type="button" className="acard-info-val txt-more" title={member.endReason} onClick={onReason}>{member.endReason}</button>
                  : <span className="acard-info-val" title={member.endReason || undefined}>{member.endReason || "غير مذكور"}</span>}
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="acard-info-row">
              <span className="acard-ic"><Phone aria-hidden /></span>
              <span className="acard-info-txt"><span className="acard-info-label">رقم الجوّال</span>{member.phone ? <span className="acard-info-val lat">{member.phone}</span> : <span className="acard-info-val na">غير متوفّر</span>}</span>
            </div>
            <div className="acard-info-row">
              <span className="acard-ic"><Envelope aria-hidden /></span>
              <span className="acard-info-txt"><span className="acard-info-label">البريد الإلكترونيّ</span><span className="acard-info-val lat">{member.email}</span></span>
            </div>
            <div className="acard-info-row">
              <span className="acard-ic"><CalendarBlank aria-hidden /></span>
              <span className="acard-info-txt"><span className="acard-info-label">تاريخ الانضمام</span><span className="acard-info-val">{member.joined}</span></span>
            </div>
          </>
        )}
      </div>

      <div className="acard-foot">
        {suspended ? (
          <>
            {/* بلا سلطةٍ لا زرّ — كما تسقط قائمة النقاط حين تخلو. من لا تبلغه سلطتُه لا يُعرَض له وعدٌ يُردّ */}
            {onRestore ? <Button variant="success" size="sm" onClick={onRestore}>إعادة العضوية</Button> : null}
            {/* كرت الموقوف يقول سببه لا ملفَّه: زرّه يكشف تفاصيل الإنهاء (السبب مقصوص أعلاه بـ«…»).
                والملفّ الكامل يبقى مبلوغًا من قائمة النقاط — لم يُحذف، إنّما لم يعد صدارة الكرت.
                وكان بجانبه «حذف نهائي» فأُزيل: لا حذفَ في اللوحة، الإنهاء هو الفعل. */}
            <Button variant="neutral" size="sm" onClick={onReason}>عرض التفاصيل</Button>
          </>
        ) : (
          <Button variant="primary" size="md" onClick={onOpen}>عرض الملف الشخصي</Button>
        )}
      </div>
    </Card>
  );
}
