"use client";

import { Container } from "@adeeb/design-system";
import { QrDeepStats } from "../../dashboard/tools/qr/QrDeepStats";
import { defaultQrSpec } from "../../dashboard/tools/qr/defaults";
import type { QrStats } from "../../dashboard/tools/qr/data";
import { qrShortUrl } from "@/lib/qrLinks";

/**
 * **معاينةُ القراءة الأعمق** — قبل أن تُركَّب في صفحة الباركود (أمرُ المالك ٢٠٢٦-٠٩-٠٥:
 * تُعرَض معاينةً قبل الإنزال).
 *
 * وبياناتُها مصنوعةٌ بنمطٍ يشبه الواقع لا بعشوائيّة: ذروةٌ عند الحادية عشرة صباحًا (المرورُ
 * بين المحاضرتين) وأخرى مساءً، وسكونٌ في الفجر، وجمعةٌ هادئة. وحالٌ ثانيةٌ تحتها: باركودٌ
 * لم يُمسح بعد، فتُرى الشاشةُ في أضعف أحوالها لا في أزهاها.
 */

const SHAPE = [0, 0, 0, 0, 0, 1, 2, 5, 9, 12, 16, 21, 14, 8, 6, 7, 9, 11, 13, 17, 12, 6, 3, 1];
const WEEK = [0.9, 1.2, 1.1, 1, 0.8, 0.3, 0.5];

const base: QrStats = {
  link: {
    id: "demo", code: "e4trprm", title: "ملصق الملتقى",
    targetUrl: "https://adeeb.club/register", spec: defaultQrSpec(qrShortUrl("e4trprm")),
    active: true, ownerId: "demo-owner", scanCount: 646, createdAt: "2026-07-30T09:00:00Z", updatedAt: "2026-09-04T09:00:00Z",
  },
  daily: [],
  devices: [],
  bots: 0,
  clipped: false,
  hours: SHAPE,
  heat: Array.from({ length: 7 }, (_, d) => SHAPE.map((v) => Math.round(v * WEEK[d] * 0.25))),
  firstScan: "2026-07-30T09:12:00Z",
  lastScan: "2026-09-04T19:41:00Z",
  thisWeek: 38,
  lastWeek: 26,
  error: null,
};

const silent: QrStats = {
  ...base,
  hours: Array(24).fill(0),
  heat: Array.from({ length: 7 }, () => Array(24).fill(0)),
  firstScan: null,
  lastScan: null,
  thisWeek: 0,
  lastWeek: 0,
};

export default function QrDeepLab() {
  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System, QR Stats</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">القراءةُ الأعمق</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          ثلاثةُ أسئلةٍ لا يجيبها الخطُّ اليوميّ: متى يُمسح ملصقُك في اليوم، وفي أيّ يومٍ من
          الأسبوع، وأيصعد أم يهبط. معاينةٌ قبل تركيبها في صفحة الباركود.
        </p>

        <h2 className="mt-10 font-display text-xl font-black text-content">باركودٌ حيٌّ يُمسح</h2>
        <QrDeepStats stats={base} />

        <h2 className="mt-12 font-display text-xl font-black text-content">باركودٌ لم يُمسح بعد</h2>
        <QrDeepStats stats={silent} />
      </Container>
    </main>
  );
}
