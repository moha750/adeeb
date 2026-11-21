"use client";

/** مختبر (لا يُرفع): أحوالُ الحجز بلا جلسة (نصوصُ صندوق الحجز نفسُها) — الزائرُ بلا حساب، ومن حجز ولم يُتّصل به بعد */
import { SignIn, Ticket, UserPlus } from "@phosphor-icons/react";
import { XCircle } from "../_components/glyphs";
import { AdButton } from "../_ad/primitives";
import { ActivityRead } from "../_ad/rooms/ActivityReadRoom";
import type { BookingParts } from "../activities/[id]/BookingWidget";
import type { PublicActivity } from "../activities/data";

const DEMO: Record<"guest" | "booked", BookingParts> = {
  guest: {
    title: "احجز مقعدك بحسابك في أدِيب", sub: "أنشئ حسابك في دقيقة، أو سجّل الدخول إن كان لديك حساب، وتعود إلى هنا لتُتمّ حجزك.", tone: "info",
    acts: <><AdButton variant="soft" size="sm" icon={<UserPlus />} href="/signup">أنشئ حسابًا</AdButton><AdButton variant="soft" size="sm" icon={<SignIn />} href="/login">سجّل الدخول</AdButton></>,
  },
  booked: {
    title: "حُفظ مقعدُك", sub: "سنتواصل معك عبر واتساب لتأكيد حضورك.", tone: "ok",
    acts: <><AdButton variant="soft" size="sm" icon={<Ticket />} href="/dashboard/bookings">حجوزاتي</AdButton><AdButton variant="danger" size="sm" icon={<XCircle />} onClick={() => {}}>إلغاء الحجز</AdButton></>,
  },
};

export function LabRead({ a, demo }: { a: PublicActivity; demo?: "guest" | "booked" }) {
  return <ActivityRead a={a} demo={demo ? DEMO[demo] : undefined} />;
}
