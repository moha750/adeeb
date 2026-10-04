"use client";

import { Container } from "@adeeb/design-system";
import { ParticipationView } from "../../dashboard/volunteering/certificates/ParticipationView";
import { ToastProvider } from "../../dashboard/_components/ToastProvider";
import type { CertQueueRow, ManualIssueOptions } from "../../dashboard/volunteering/data";

/**
 * **معرضُ «جاهزة لم تصدر» — معرضُ المُقَرّ** (٢٠٢٦-١٠-٠٣): الشاشةُ الحقيقيّةُ نفسُها (`ParticipationView`) بعيّنةٍ
 * مختلَقة، لأنّ التبويبَ فارغٌ في القاعدة ولا يُكتب فيها للتجربة. وكرتُه كرتُ الفرصة الذي اعتمده المالك. والمعرّفاتُ ليست UUID
 * عمدًا: لو ضُغط «إصدار» ردّه الخادمُ قبل القاعدة، فلا تصدر شهادةٌ لأحد.
 */
const base = {
  userId: "u", avatar: null, endedAt: null, missing: null, period: null, adminNote: null, denialReason: null, distinctionNote: null,
  evaluatedBy: null, evaluatedAt: null,
};
const O1 = { oppId: "o1", opportunity: "منظّمو معرض اليوم الوطني", committee: "لجنة الفعاليّات", dateLabel: "28 إلى 29 سبتمبر 2026", startsOn: "2026-09-28", endsOn: "2026-09-29", flexible: false };
const O2 = { oppId: "o2", opportunity: "مصوّرٌ فوتوغرافيٌّ لتغطية أمسية الشعر في مسرح الجامعة الكبير", committee: null, dateLabel: "الخميس 1 أكتوبر 2026", startsOn: "2026-10-01", endsOn: "2026-10-01", flexible: false };

const OWED: CertQueueRow[] = [
  { ...base, ...O1, id: "w1", name: "ريم عبدالله الدوسري", phone: "0551234567", gender: "female" },
  { ...base, ...O1, id: "w2", name: "نوف سعد المطيري", phone: "0539876543", gender: "female", distinctionNote: "غطّت ركن الاستقبال وحدها بعد انسحاب زميلتها، وأدارت الطابور حتى آخر زائر" },
  { ...base, ...O2, id: "w3", name: "عبدالرحمن بن عبدالعزيز آل الشيخ", phone: "0567778899", gender: "male" },
];

/** خياراتُ «إصدار شهادة» لمتطوّعٍ بلا طلب، فيُرى فعلُ الرأس ونافذتُه. والمعرّفاتُ ليست UUID فلا يصدر شيء. */
const MANUAL: ManualIssueOptions = {
  volunteers: [
    { id: "v1", name: "ريم عبدالله الدوسري", phone: "0551234567", avatar: null, gender: "female", former: false },
    { id: "v2", name: "خالد فهد العنزي", phone: "0501112233", avatar: null, gender: "male", former: false },
    { id: "v3", name: "سديم بندر القحطاني", phone: "0548633404", avatar: null, gender: "female", former: true },
  ],
  opportunities: [
    { id: "o1", title: "منظّمو معرض اليوم الوطني", committee: "لجنة الفعاليّات", dateLabel: "28 إلى 29 سبتمبر 2026",
      periods: [{ id: "p1", label: "الاثنين 28 سبتمبر، من 4 م إلى 8 م" }, { id: "p2", label: "الثلاثاء 29 سبتمبر، من 4 م إلى 8 م" }] },
    { id: "o2", title: "مصوّرٌ فوتوغرافيٌّ لتغطية أمسية الشعر", committee: null, dateLabel: "1 أكتوبر 2026", periods: [] },
  ],
};

export default function OwedCardPage() {
  return (
    <ToastProvider>
      <main className="py-16">
        <Container>
          <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System, Owed Certificates</p>
          <p className="mt-2 max-w-2xl text-content-muted">
            تبويبُ «جاهزة لم تصدر» في الشاشة الحقيقيّة بكرت الفرصة، بعيّنةٍ مختلَقة. افتح التبويبَ الثاني.
          </p>
          <div className="mt-8">
            <ParticipationView room={{ awaiting: [], owed: OWED, issued: [] }} today="2026-10-03" manual={MANUAL} />
          </div>
        </Container>
      </main>
    </ToastProvider>
  );
}
