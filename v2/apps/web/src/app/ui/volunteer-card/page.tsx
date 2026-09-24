"use client";

import { useState } from "react";
import { Container, Segmented } from "@adeeb/design-system";
import { VolunteerCard } from "../../dashboard/volunteering/volunteers/VolunteerCard";
import type { VolunteerRow } from "../../dashboard/volunteering/data";

const noop = () => {};

const BASE: VolunteerRow = {
  userId: "1", name: "عبد الرحمن بن عبد العزيز آل الشيخ", phone: "0501234567",
  email: "abdulrahman.alshaikh.2026@student.kfu.edu.sa", gender: "male", city: "الأحساء",
  avatarUrl: null, bio: null, publicSlug: "abdulrahman", accountStatus: "active",
  accountCreatedAt: "3 أغسطس 2026 الساعة 9:14 م", acceptsMarketing: true, deletionRequestedAt: null,
  deletionReason: null, lastSignInAt: "22 سبتمبر 2026 الساعة 11:59 م", seenLast30: true,
  providers: ["google"], emailConfirmed: true, status: "active",
  appliedAt: "15 أغسطس 2026", appliedStamp: "15 أغسطس 2026 الساعة 4:02 م",
  endedAt: null, endedBy: null, endReason: null,
  prefs: [{ id: 1, name: "لجنة الفعاليات" }, { id: 2, name: "لجنة العلاقات العامّة" }, { id: 3, name: "لجنة التصوير" }],
  prefsUpdatedAt: "16 أغسطس 2026 الساعة 1:20 ص",
  apps: [], certs: [],
  applied: 0, pending: 0, accepted: 0, rejected: 0, withdrawn: 0, attended: 0, absent: 0, certificates: 0,
  trace: { reservations: 0, reservedAttended: 0, activities: [], badges: [], pageviews: 0, devices: 0, lastSeenAt: null },
};

// عيّنةٌ تغطّي المحاور : اسمٌ طويلٌ بثلاث رغبات · رغبةٌ واحدةٌ باسمٍ طويلٍ ولم يدخل قطّ ·
// بلا رغباتٍ أصلًا · متطوّعٌ سابقٌ بسببٍ طويل (نغمةٌ رصاصيّةٌ تعمّ الكرت)
const SAMPLE: VolunteerRow[] = [
  BASE,
  {
    ...BASE, userId: "2", name: "لطيفه عبدالعزيز السليطين", gender: "female", city: null,
    phone: "0548633404", lastSignInAt: null, seenLast30: false, publicSlug: null,
    prefs: [{ id: 4, name: "لجنة الموارد البشريّة" }], prefsUpdatedAt: null, appliedAt: "22 سبتمبر 2026",
  },
  { ...BASE, userId: "3", name: "فاطمه ال شيخ", gender: "female", city: "الهفوف", prefs: [], prefsUpdatedAt: null },
  {
    ...BASE, userId: "4", name: "سديم بندر القحطاني", gender: "female", status: "former",
    endReason: "اعتذرت عن الاستمرار لارتباطها بالتدريب الميدانيّ هذا الفصل، وطلبت العودة في الفصل القادم.",
    endedAt: "20 سبتمبر 2026 الساعة 8:00 م", endedBy: "محمّد بن إسماعيل",
  },
];

/**
 * معرضُ كرت المتطوّع — **معرضُ المُقَرّ لا مضمارُ مفاضلة**: أُقِرّت «الهويّةُ المضطجعة»
 * ٢٠٢٦-٠٩-٢٤ من ستّة توجّهاتٍ عُرضت حيّةً، وأُعدمت الخمسةُ بأصنافها كما أُعدمت أخواتُ
 * كرت الانتخاب وكرت غرفة اللعب. والباقي مبدّلٌ واحدٌ ينتظر كلمتَه: سطحُ الأفتار.
 */
export default function VolunteerCardPage() {
  const [avatar, setAvatar] = useState<"grad" | "light">("grad");

  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System, Volunteer Card</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">كرت المتطوّع</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          كرتُ الكشف في «سجلّ المتطوّعين»: بطاقةُ الهويّة نفسُها (<code className="font-latin">.acard-profile</code>){" "}
          بمحورٍ مضطجع (<code className="font-latin">.acard-wide</code>). الجنبُ ثلاثُ مناطق: صفتُه، ثمّ وجهُه
          متوسّطًا، ثمّ رغبتُه الأولى على شعرة. والنغمةُ تعمّ الكرتَ كلَّه: الوهجُ ومربّعُ الأفتار والرقاقاتُ
          والحبرُ والتذييل، فالمتطوّعُ السابقُ رصاصيٌّ بلا زرقةٍ واحدة.
        </p>

        <div className="mt-8">
          <p className="mb-3 font-latin text-xs font-bold uppercase tracking-[0.18em] text-content-muted">سطحُ الأفتار</p>
          <Segmented
            items={[{ value: "grad", label: "تدرّجُ النغمة" }, { value: "light", label: "أبيض" }]}
            value={avatar}
            onValueChange={(a) => setAvatar(a as "grad" | "light")}
          />
        </div>

        <div className="card-grid card-grid-2col mt-8">
          {SAMPLE.map((v) => (
            <VolunteerCard key={v.userId} v={v} avatar={avatar} onOpen={noop} onGrant={noop} onEnd={noop} />
          ))}
        </div>
      </Container>
    </main>
  );
}
