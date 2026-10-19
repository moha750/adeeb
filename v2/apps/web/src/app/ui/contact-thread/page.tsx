"use client";

import { Container } from "@adeeb/design-system";
import { ToastProvider } from "../../dashboard/_components/ToastProvider";
import { ContactView } from "../../dashboard/contact/ContactView";
import type { ContactRow } from "../../dashboard/contact/data";

/**
 * **رسائلُ التواصل محادثةً** (٢٠٢٦-١٠-١٩) — الغرفةُ الحيّة نفسُها (`ContactView`) بحقائق مخترعة: افتح رسالةً
 * لترى محادثتها، رسالتُه الأولى ثمّ ردُّنا ثمّ ردُّه علينا. والأفعالُ هنا لا تُرسَل (الحقائق لا وجود لها).
 */
const ago = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

const ROWS: ContactRow[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "ريم العبدالله",
    email: "reem.a@example.com",
    subject: "التسجيل",
    message: "متى يفتح باب التسجيل في النادي؟",
    status: "new",
    notes: null,
    createdAt: ago(60),
    turns: [
      { id: "t1", direction: "out", body: "أهلًا بكِ، والتسجيلُ مفتوحٌ طوال العام.\nتجدين النموذجَ في صفحة الانضمام.", at: ago(40), by: "بشائر الحداد", otherEmail: null },
      { id: "t2", direction: "in", body: "شكرًا لكم، وهل يشمل التسجيلُ طلابَ الدراسات العليا؟", at: ago(3), by: null, otherEmail: null },
    ],
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "فهد العتيبي",
    email: "fahad.ot@example.com",
    subject: null,
    message: "أرغب في رعاية فعاليتكم القادمة، كيف أتواصل مع المسؤول؟",
    status: "read",
    notes: null,
    createdAt: ago(30),
    turns: [],
  },
];

export default function ContactThreadLab() {
  return (
    <ToastProvider>
      <main className="py-10">
        <Container>
          <ContactView rows={ROWS} />
        </Container>
      </main>
    </ToastProvider>
  );
}
