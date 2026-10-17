"use client";

/**
 * **معاينةُ إشراف عِرفان** (٢٠٢٦-١٠-١٧) — صفحةُ رئيس أدِيب كما اختارها: القائمةُ المسطّحة، والتصميمُ حلقة.
 * ثمّ كروتًا: جدارَ بطاقات، ثمّ صفًّا كاملًا لكلّ رسالة بنصّها. والمصغّراتُ صورُ معاينةٍ تُرسم هنا كما تُرفع في الإنتاج.
 * الأسماءُ مخترَعة: `/ui` صفحةٌ عامّة.
 */

import { useEffect, useState } from "react";
import { Container } from "@adeeb/design-system";
import { renderIrfanPreview } from "@/lib/irfan/card";
import { ToastProvider } from "../../dashboard/_components/ToastProvider";
import { OversightView } from "../../dashboard/irfan/oversight/OversightView";
import type { OversightData, OversightRow } from "../../dashboard/irfan/oversight/vocab";

const SEASON = "اليوم العالمي للمدير";
const card = (to: string, seat: string, from: string, title: string | null, body: string) =>
  ({ to, seat, from, title, body, season: SEASON });

const R = (id: number, at: string, from: string, to: string, seat: string, title: string | null, look: "letter" | "aurora", body: string, pictured = true, read = false): OversightRow =>
  ({ id, at, from, to, seat, toGender: seat.startsWith("قائدة") || seat.startsWith("الرئيسة") ? "female" : "male", toAvatar: null,
     title, look, card: card(to, seat, from, title, body), pictured, read, thumb: null });

const ROWS: OversightRow[] = [
  R(1, "2026-10-17T09:30:00Z", "ريم سعد الخالدي", "سديم بندر القحطاني", "قائدة لجنة التصوير", "شكرًا لكِ", "aurora", "شكرًا على صبركِ معي في أوّل تغطيةٍ لي، حين أخطأتُ في الإعدادات وأعدتِ شرحها بهدوء.", false, true),
  R(2, "2026-10-17T10:10:00Z", "مريم هاني العلوي", "سديم بندر القحطاني", "قائدة لجنة التصوير", "تعلّمتُ منكِ", "letter", "أنّ القيادة تبدأ من الاستماع، وأنّ الصبر على المبتدئ أوّلُ التعليم.", true, true),
  R(3, "2026-10-17T13:20:00Z", "عبد الرحمن خالد الشيخ", "نواف ثلاب الشمري", "منسّق قسم الإعلام", "ممتنٌّ لك", "letter", "كنتَ سندًا لنا في كلّ تغطية، ولم تقل يومًا هذا ليس من شأنك.", true, false),
  R(4, "2026-10-18T08:00:00Z", "لطيفة عبد العزيز السليطين", "نواف ثلاب الشمري", "منسّق قسم الإعلام", null, "aurora", "شكرًا على صبرك معنا في المعرض حتّى آخر الليل.", true, true),
  R(5, "2026-10-18T11:45:00Z", "ريم سعد الخالدي", "بشائر فاروق الحداد", "الرئيسة التنفيذية", "قدوتي", "aurora", "أثرُك في أدِيب يراه كلُّ من دخله هذا العام.", true, false),
];
const DATA: OversightData = { season: { title: SEASON, closesAt: "2026-10-23T21:00:00.000Z" }, leaders: 17, rows: ROWS, error: null };

export default function IrfanOversightLab() {
  const [data, setData] = useState<OversightData>(DATA);
  useEffect(() => {
    let alive = true;
    void (async () => {
      const rows: OversightRow[] = [];
      for (const r of ROWS) {
        const thumb = r.pictured ? URL.createObjectURL(await renderIrfanPreview(r.card, r.look)) : null;
        rows.push({ ...r, thumb });
      }
      if (alive) setData({ ...DATA, rows });
    })();
    return () => { alive = false; };
  }, []);
  return (
    <ToastProvider>
      <main className="py-16">
        <Container className="max-w-5xl">
          <OversightView data={data} />
        </Container>
      </main>
    </ToastProvider>
  );
}
