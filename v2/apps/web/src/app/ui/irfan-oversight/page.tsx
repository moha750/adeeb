"use client";

/**
 * **معاينةُ إشراف عِرفان** (٢٠٢٦-١٠-١٧) — صفحةُ رئيس أدِيب، بشكلين للقائمة يختار المالكُ أحدَهما:
 * جدولٌ مسطّحٌ بالرسائل، أو مجموعاتٌ بالقائد. والأرقامُ والتوزيعاتُ واحدةٌ في الشكلين.
 * الأسماءُ مخترَعة: `/ui` صفحةٌ عامّة.
 */

import { Container } from "@adeeb/design-system";
import { ToastProvider } from "../../dashboard/_components/ToastProvider";
import { OversightView } from "../../dashboard/irfan/oversight/OversightView";
import type { OversightData, OversightRow } from "../../dashboard/irfan/oversight/vocab";

const SEASON = "اليوم العالمي للمدير";
const card = (to: string, seat: string, from: string, title: string | null, body: string) =>
  ({ to, seat, from, title, body, season: SEASON });

const R = (id: number, at: string, from: string, to: string, seat: string, title: string | null, look: "letter" | "aurora", body: string | null, pictured = true, read = false): OversightRow =>
  ({ id, at, from, to, seat, title, look, card: body ? card(to, seat, from, title, body) : null, pictured, read });

const ROWS: OversightRow[] = [
  R(1, "2026-10-17T09:30:00Z", "ريم سعد الخالدي", "سديم بندر القحطاني", "قائدة لجنة التصوير", "شكرًا لكِ", "aurora", null, false, true),
  R(2, "2026-10-17T10:10:00Z", "مريم هاني العلوي", "سديم بندر القحطاني", "قائدة لجنة التصوير", "تعلّمتُ منكِ", "letter", null, true, true),
  R(3, "2026-10-17T13:20:00Z", "عبد الرحمن خالد الشيخ", "نواف ثلاب الشمري", "منسّق قسم الإعلام", "ممتنٌّ لك", "letter", "كنتَ سندًا لنا في كلّ تغطية، ولم تقل يومًا هذا ليس من شأنك.", true, false),
  R(4, "2026-10-18T08:00:00Z", "لطيفة عبد العزيز السليطين", "نواف ثلاب الشمري", "منسّق قسم الإعلام", null, "aurora", "شكرًا على صبرك معنا في المعرض حتّى آخر الليل.", true, true),
  R(5, "2026-10-18T11:45:00Z", "ريم سعد الخالدي", "بشائر فاروق الحداد", "الرئيسة التنفيذية", "قدوتي", "aurora", "أثرُك في أدِيب يراه كلُّ من دخله هذا العام.", true, false),
];
const DATA: OversightData = { season: { title: SEASON, closesAt: "2026-10-23T21:00:00.000Z" }, leaders: 17, rows: ROWS, failures: 1, error: null };

export default function IrfanOversightLab() {
  return (
    <ToastProvider>
      <main className="py-16">
        <Container className="max-w-5xl">
          <p className="font-latin text-xs font-bold uppercase tracking-[0.16em] text-content-muted">الشكل الأوّل: جدولٌ بالرسائل كلِّها</p>
          <div className="mt-4"><OversightView data={DATA} layout="table" /></div>
          <p className="mt-20 font-latin text-xs font-bold uppercase tracking-[0.16em] text-content-muted">الشكل الثاني: الرسائلُ مجموعةً تحت قائدها</p>
          <div className="mt-4"><OversightView data={DATA} layout="leaders" /></div>
        </Container>
      </main>
    </ToastProvider>
  );
}
