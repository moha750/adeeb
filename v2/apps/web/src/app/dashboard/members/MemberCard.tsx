"use client";

import { Button } from "@adeeb/design-system";
import { Phone, Envelope, CalendarBlank, FileText } from "@phosphor-icons/react";
import { Avatar } from "../_components/Avatar";
import { DropdownMenu, type MenuGroup } from "../_components/DropdownMenu";
import type { MemberRow } from "./data";

type Props = {
  member: MemberRow;
  onOpen: () => void;
  actions: MenuGroup[];
  onRestore?: () => void;
  onDelete?: () => void;
};

// نغمة سطح الكرت بحالة العضو — النشط بهوية العلامة (فولاذيّ) لا أخضر؛ الأخضر لشارة «نشط» فقط.
const TONE_CLASS: Record<string, string> = { active: "mc-tone-brand", pending: "mc-tone-warning", suspended: "mc-tone-danger" };

export function MemberCard({ member, onOpen, actions, onRestore, onDelete }: Props) {
  const suspended = member.status === "suspended";
  const roleLine = [member.role, member.committee].filter(Boolean).join(" ") || "غير متوفّر";
  const toneClass = TONE_CLASS[member.status];
  return (
    <article className={"mc" + (toneClass ? " " + toneClass : "")}>
      <div className="mc-head">
        <span onClick={(e) => e.stopPropagation()}>
          <DropdownMenu groups={actions} triggerClassName="mc-dots" />
        </span>
      </div>

      <Avatar name={member.name} src={member.avatar ?? undefined} size="xl" className="mc-av" />
      <h4 className="mc-name">{member.name}</h4>
      {suspended
        ? <div className="mc-role mc-role-danger">{member.endAgo ? `عضوية منتهية ${member.endAgo}` : "عضوية منتهية"}</div>
        : <div className="mc-role">{roleLine}</div>}

      <div className="mc-info">
        {suspended ? (
          <>
            <div className="mc-info-row">
              <span className="mc-ic"><CalendarBlank aria-hidden /></span>
              <span className="mc-info-txt"><span className="mc-info-label">تاريخ إنهاء العضوية</span><span className="mc-info-val">{member.endDate || "غير مسجّل"}</span></span>
            </div>
            <div className="mc-info-row mc-info-row-top">
              <span className="mc-ic"><FileText aria-hidden /></span>
              <span className="mc-info-txt"><span className="mc-info-label">سبب إنهاء العضوية</span><span className="mc-info-val mc-info-reason">{member.endReason || "غير مذكور"}</span></span>
            </div>
          </>
        ) : (
          <>
            <div className="mc-info-row">
              <span className="mc-ic"><Phone aria-hidden /></span>
              <span className="mc-info-txt"><span className="mc-info-label">رقم الجوّال</span>{member.phone ? <span className="mc-info-val lat">{member.phone}</span> : <span className="mc-info-val na">غير متوفّر</span>}</span>
            </div>
            <div className="mc-info-row">
              <span className="mc-ic"><Envelope aria-hidden /></span>
              <span className="mc-info-txt"><span className="mc-info-label">البريد الإلكترونيّ</span><span className="mc-info-val lat">{member.email}</span></span>
            </div>
            <div className="mc-info-row">
              <span className="mc-ic"><CalendarBlank aria-hidden /></span>
              <span className="mc-info-txt"><span className="mc-info-label">تاريخ الانضمام</span><span className="mc-info-val">{member.joined}</span></span>
            </div>
          </>
        )}
      </div>

      <div className="mc-foot">
        {suspended ? (
          <>
            <Button variant="success" size="sm" onClick={onRestore}>إعادة العضوية</Button>
            <div className="mc-foot-row">
              <Button variant="ghost" size="sm" onClick={onOpen}>عرض الملف الشخصي</Button>
              <Button variant="danger" size="sm" onClick={onDelete}>حذف نهائي</Button>
            </div>
          </>
        ) : (
          <Button variant="primary" size="md" onClick={onOpen}>عرض الملف الشخصي</Button>
        )}
      </div>
    </article>
  );
}
