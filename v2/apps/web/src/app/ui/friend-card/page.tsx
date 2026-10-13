"use client";

import { Container } from "@adeeb/design-system";
import { FriendCard } from "../../dashboard/friends/FriendCard";
import type { FriendRow, Program } from "../../dashboard/friends/data";

/**
 * **معاينةُ كرت الصديق بعد ملاحظات ٢٠٢٦-١٠-١٠** — الكرتُ الحقيقيّ (`FriendCard`) ببياناتٍ مخترَعة.
 * وعُرض فيها وجهان لمن لا ملفَّ له (الحرفُ الأوّل من بريده، ورسمُ «بلا ملف») فاختار المالك الرسم، وحُذف الحرف.
 * ثمّ وجهان للحقول الثابتة (معلومات، أعداد) فاعتُمدت المعلومات ورُفضت الأعداد لأنّها لا تتّسع لبرامجَ تُضاف.
 * ثمّ وجهان لعلامة من لم يُكمل ملفَّه («بلا ملف» مبهمة): وسامٌ تحت الصورة (اعتُمد)، أو سطرٌ تحت البريد.
 */



const PROGRAM: Record<Program, string> = {
  events: "فعاليّات أدِيب", darb: "دربك خضر", surveys: "استبيانات أدِيب", radio: "إذاعة أدِيب", deebo: "ديبو",
};

const base = {
  city: null, volunteeredBefore: false, wasMember: false, radio: null, surveys: null, deebo: null,
  events: null, darb: null, depth: {}, programs: [] as Program[], lastProgram: null,
} as const;

const SAMPLES: FriendRow[] = [
  {
    ...base, id: "1", name: "لمى خالد السبيعي", email: "lama@example.com", phone: "0500000101", gender: "female", hasProfile: true,
    since: "أبريل 2026", sinceRaw: "2026-04-02",
    programs: ["events", "darb"], depth: { events: "حضرت 3 مرّات", darb: "11 جولةً" },
    surveys: 1, events: { booked: 4, attended: 3, lastAttended: "3 أكتوبر 2026" }, darb: { nickname: "برق", best: 920, runs: 11, tamr: 64 },
    lastProgram: { program: "events", date: "3 أكتوبر 2026", raw: "2026-10-03", event: { title: "ملتقى صنّاع المحتوى", attended: true } },
  },
  {
    ...base, id: "2", name: "نورة سعد الهاجري", email: "noura@example.com", phone: "0500000102", gender: "female", hasProfile: true, wasMember: true,
    since: "مارس 2025", sinceRaw: "2025-03-01",
    programs: ["events"], depth: { events: "حجزت ولم تحضر" },
    events: { booked: 1, attended: 0, lastAttended: "" },
    lastProgram: { program: "events", date: "14 أغسطس 2026", raw: "2026-08-14", event: { title: "أمسية القصّة القصيرة", attended: false } },
  },
  {
    ...base, id: "3", name: null, email: "runner.falcon@example.com", phone: null, gender: null, hasProfile: false,
    since: "سبتمبر 2026", sinceRaw: "2026-09-21",
    programs: ["darb"], depth: { darb: "37 جولةً" }, darb: { nickname: "صقر الأحساء", best: 1840, runs: 37, tamr: 212 },
    lastProgram: { program: "darb", date: "23 سبتمبر 2026", raw: "2026-09-23" },
  },
  {
    ...base, id: "4", name: null, email: "6f2de3dc@example.com", phone: null, gender: null, hasProfile: false,
    since: "مايو 2026", sinceRaw: "2026-05-02",
  },
  {
    ...base, id: "5", name: "عبد الله فهد المري", email: "abdullah@example.com", phone: "0500000104", gender: "male", hasProfile: true,
    since: "مايو 2026", sinceRaw: "2026-05-05",
  },
];

export default function FriendCardPreviewPage() {
  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Dashboard, Friends</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">كرت الصديق</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          الحقولُ ثابتةٌ في كلّ كرت. ثلاثُ معلومات (آخر مشاركة، شارك في، رقم الجوّال) والغائبُ منها خافت.
          الأسماءُ والأرقامُ مخترَعة.
        </p>



        <div className="card-grid card-grid-2col mt-8">
          {SAMPLES.map((f) => (
            <FriendCard key={f.id} f={f} programLabel={PROGRAM} actions={[]} onOpen={() => {}} />
          ))}
        </div>
      </Container>
    </main>
  );
}
