"use client";

/**
 * **شاشاتُ الحال** بهيئة الإيصال نفسِها (`Ticket`): من يفتح رابطَ استبيانٍ لم يبدأ أو انتهى أو هو للأعضاء
 * يرى غلافَ الصفحة نفسَه لا بطاقةَ تنبيهٍ في صفحةٍ بيضاء. والعلامةُ تقول الحالَ قبل العنوان.
 * (عميلٌ لأنّ أيقونات Phosphor تحمل سياقًا لا يحمله المكوّنُ الخادميّ.)
 */

import Link from "next/link";
import { CalendarX, Hourglass, IdentificationCard, LockSimple, ListDashes } from "@phosphor-icons/react";
import { WarningCircle } from "@/app/_components/glyphs";
import { Drawn, Ticket } from "./Ticket";

export type StateKind = "closed" | "soon" | "ended" | "members" | "inactive" | "answered" | "empty" | "error";

const MARK: Record<StateKind, React.ReactNode> = {
  closed: <LockSimple />,
  soon: <Hourglass />,
  ended: <CalendarX />,
  members: <IdentificationCard />,
  inactive: <IdentificationCard />,
  answered: <Drawn />,
  empty: <ListDashes />,
  error: <WarningCircle />,
};

export function StateScreen({ kind, title, text, action }: { kind: StateKind; title: string; text: string; action?: { href: string; label: string } }) {
  return (
    <Ticket mark={MARK[kind]} title={title} text={text}>
      <div className="spt-ticket-acts">
        {action ? <Link href={action.href} className="abtn abtn-primary abtn-lg spt-btn">{action.label}</Link> : null}
        <Link href="/" className={action ? "abtn abtn-ghost abtn-lg spt-btn" : "abtn abtn-primary abtn-lg spt-btn"}>موقع أدِيب</Link>
      </div>
    </Ticket>
  );
}
