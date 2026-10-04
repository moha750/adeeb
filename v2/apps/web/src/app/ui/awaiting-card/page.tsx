"use client";

import { useMemo, useState } from "react";
import { Button, Container, Modal, Segmented } from "@adeeb/design-system";
import { AwaitOpportunityCard, type AwaitHandlers } from "../../dashboard/volunteering/certificates/AwaitingCards";
import { ToastProvider, useToast } from "../../dashboard/_components/ToastProvider";
import { MasonryGrid } from "../../dashboard/_components/MasonryGrid";
import { VolunteerHero, VolunteerRecord } from "../../dashboard/volunteering/volunteers/VolunteerRecord";
import type { CertQueueRow, VolunteerRow } from "../../dashboard/volunteering/data";

/**
 * **معرضُ «بانتظار الحضور» — معرضُ المُقَرّ** (٢٠٢٦-١٠-٠٢): كرتُ الفرصة، اختاره المالكُ على كرتٍ لكلّ متطوّع
 * (أُعدم). والطابورُ حيٌّ هنا: الحاضرُ ينتقل إلى «جاهزة لم تصدر»، والغائبُ يغادر (لا تقييمَ بعد سياسة
 * ٢٠٢٦-١٠-٠٣). والعيّنةُ: فرصةٌ بفترتين، وفرصةٌ بيومٍ واحدٍ بلا لجنةٍ وعنوانُها واسمُ متطوّعها
 * طويلان، وفرصةٌ مرنةٌ كلماتُها «أنجز/لم ينجز». والأسماءُ مختلَقة.
 */
const base = { userId: "u", avatar: null, endedAt: null, evaluatedBy: null, evaluatedAt: null, adminNote: null, denialReason: null, distinctionNote: null };
const O1 = { oppId: "o1", opportunity: "منظّمو معرض اليوم الوطني", committee: "لجنة الفعاليّات", dateLabel: "28 إلى 29 سبتمبر 2026", startsOn: "2026-09-28", endsOn: "2026-09-29", flexible: false };
const O2 = { oppId: "o2", opportunity: "مصوّرٌ فوتوغرافيٌّ لتغطية أمسية الشعر في مسرح الجامعة الكبير", committee: null, dateLabel: "الخميس 1 أكتوبر 2026", startsOn: "2026-10-01", endsOn: "2026-10-01", flexible: false };
const O3 = { oppId: "o3", opportunity: "تدقيقُ نصوص العدد الخامس من المجلّة", committee: "لجنة الأدب", dateLabel: null, startsOn: null, endsOn: "2026-09-30", flexible: true };

const SAMPLE: CertQueueRow[] = [
  { ...base, ...O1, id: "a1", name: "ريم عبدالله الدوسري", phone: "0551234567", gender: "female", missing: "attendance", period: "الاثنين 28 سبتمبر، من 4 م إلى 8 م" },
  { ...base, ...O1, id: "a2", name: "نوف سعد المطيري", phone: "0539876543", gender: "female", missing: "attendance", period: "الاثنين 28 سبتمبر، من 4 م إلى 8 م", adminNote: "تأخّرت نصف ساعة عن بداية الفترة لظرفٍ أبلغت به قبلها، وغطّت ركن الاستقبال وحدها بعد انسحاب زميلتها." },
  { ...base, ...O1, id: "a3", name: "خالد فهد العنزي", phone: "0501112233", gender: "male", missing: "attendance", period: "الثلاثاء 29 سبتمبر، من 4 م إلى 8 م" },
  { ...base, ...O2, id: "a4", name: "عبدالرحمن بن عبدالعزيز آل الشيخ", phone: "0567778899", gender: "male", missing: "attendance", period: null, adminNote: "صوّر الأمسية كاملةً وسلّم الصور في اليوم نفسه." },
  { ...base, ...O3, id: "a5", name: "سلمان ماجد الحربي", phone: "0544455566", gender: "male", missing: "attendance", period: null },
  { ...base, ...O3, id: "a6", name: "هيا خالد العتيبي", phone: "0598887766", gender: "female", missing: "attendance", period: null },
];

/** ملفُّ المتطوّع في المعرض: سجلٌّ مختلَقٌ بمشاركتين سابقتين وشهادةٍ، والفرصةُ التي ينتظر فيها. */
function recordOf(r: CertQueueRow): VolunteerRow {
  const app = (id: string, opportunity: string, committee: string | null, done: boolean) => ({
    id, opportunityId: id, opportunity, committee, status: "accepted" as const, appliedAt: "10 سبتمبر 2026",
    decidedBy: "نورة سعد القحطاني", decidedAt: "12 سبتمبر 2026", decisionReason: null, excuseReason: null,
    attendance: done ? ("attended" as const) : null, attendanceAt: done ? "14 سبتمبر 2026" : null, attendanceBy: done ? "نورة سعد القحطاني" : null,
    deservesCertificate: null, denialReason: null, distinctionNote: null, adminNote: null,
    evaluatedBy: done ? "نورة سعد القحطاني" : null, evaluatedAt: done ? "15 سبتمبر 2026" : null,
  });
  return {
    userId: r.id, name: r.name, phone: r.phone, email: "volunteer@student.kfu.edu.sa", gender: r.gender, city: "الأحساء",
    avatarUrl: null, bio: null, publicSlug: null, accountStatus: "active", accountCreatedAt: "3 أغسطس 2026 الساعة 9:14 م",
    acceptsMarketing: true, deletionRequestedAt: null, deletionReason: null, lastSignInAt: "1 أكتوبر 2026 الساعة 10:02 م",
    seenLast30: true, providers: ["google"], emailConfirmed: true, status: "active",
    appliedAt: "15 أغسطس 2026", appliedStamp: "15 أغسطس 2026 الساعة 4:02 م", endedAt: null, endedBy: null, endReason: null, returnedAt: null,
    prefs: [{ id: 1, name: "لجنة الفعاليّات" }, { id: 2, name: "لجنة التصوير" }], prefsUpdatedAt: "16 أغسطس 2026 الساعة 1:20 ص",
    apps: [app(`${r.id}-now`, r.opportunity, r.committee, false), app(`${r.id}-past`, "منظّم لورشة الكتابة الإبداعيّة", "لجنة الأدب", true)],
    certs: [{
      serial: "ADEEB-VOL-2026-0007-A90F3B", holderName: r.name, opportunity: "منظّم لورشة الكتابة الإبداعيّة", committee: "لجنة الأدب",
      served: "14 سبتمبر 2026", issuedBy: "نورة سعد القحطاني", issuedAt: "15 سبتمبر 2026", status: "active", revokedBy: null, revokedAt: null, revokeReason: null,
    }],
    applied: 2, pending: 0, accepted: 2, rejected: 0, withdrawn: 0, attended: 1, absent: 0, certificates: 1,
    trace: { reservations: 3, reservedAttended: 2, activities: [], badges: [], pageviews: 0, devices: 1, lastSeenAt: null },
  };
}

const wait = () => new Promise((r) => setTimeout(r, 450));
const first = (n: string) => n.split(" ")[0];

function Lab() {
  const toast = useToast();
  const [width, setWidth] = useState<"desk" | "phone">("desk");
  const [rows, setRows] = useState(SAMPLE);
  const [busy, setBusy] = useState<string | null>(null);
  // الملفُّ يبقى في النافذة وهي تُغلَق، فلا تفرغ في حركة خروجها
  const [profile, setProfile] = useState<VolunteerRow | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const drop = (id: string) => setRows((rs) => rs.filter((x) => x.id !== id));
  const h: AwaitHandlers = {
    busy,
    onAttend: async (r, a) => {
      setBusy(`${r.id}-${a === "attended" ? "yes" : "no"}`);
      await wait();
      setBusy(null);
      drop(r.id);
      if (a === "attended") {
        toast.success(r.flexible ? `سُجّل إنجازُ ${first(r.name)}، وشهادتُه جاهزة` : `سُجّل حضورُ ${first(r.name)}، وشهادتُه جاهزة`);
      } else {
        toast.success(r.flexible ? `سُجّل أنّ ${first(r.name)} لم ينجز` : `سُجّل غيابُ ${first(r.name)}`);
      }
    },
    onRecord: () => toast.success("هنا يُفتح سجلّ الفرصة"),
    onProfile: (r) => { setProfile(recordOf(r)); setProfileOpen(true); },
  };

  // كرتٌ لكلّ فرصة، بترتيب ظهورها في الطابور
  const byOpp = useMemo(() => {
    const m = new Map<string, CertQueueRow[]>();
    for (const r of rows) m.set(r.oppId, [...(m.get(r.oppId) ?? []), r]);
    return [...m.values()];
  }, [rows]);

  const view = (
    <MasonryGrid>
      {byOpp.map((g) => <AwaitOpportunityCard key={g[0]!.oppId} rows={g} {...h} />)}
    </MasonryGrid>
  );

  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System, Awaiting Queue</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">بانتظار الحضور</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          الحضورُ من الكرت نفسِه. جرّب الأزرار: الحاضرُ تصير شهادتُه جاهزة، والغائبُ يغادر الطابور.
          والضغطُ على المتطوّع (وجهِه أو اسمِه) يفتح ملفَّه.
        </p>

        <div className="mt-8 flex flex-wrap items-end gap-6">
          <div>
            <p className="mb-3 font-latin text-xs font-bold uppercase tracking-[0.18em] text-content-muted">العرض</p>
            <Segmented items={[{ value: "desk", label: "الحاسوب" }, { value: "phone", label: "الجوّال" }]} value={width} onValueChange={(v) => setWidth(v as "desk" | "phone")} />
          </div>
          <Button variant="ghost" size="md" onClick={() => setRows(SAMPLE)}>إعادة العيّنة</Button>
        </div>

        <div className="mt-8">
          {rows.length === 0 ? <p className="text-content-muted">فرغ الطابور.</p> : width === "phone" ? <div className="cvlab">{view}</div> : view}
        </div>
      </Container>

      {/* ملفُّ المتطوّع: نافذةُ «متطوّعو أدِيب» نفسُها لا شكلٌ ثانٍ لها */}
      <Modal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        title={profile?.name ?? "الملفّ"}
        size="md"
        className="pvb-modal"
        hero={profile ? <VolunteerHero v={profile} /> : undefined}
        footer={<Button variant="ghost" size="md" onClick={() => setProfileOpen(false)}>إغلاق</Button>}
      >
        {profile ? <VolunteerRecord v={profile} /> : null}
      </Modal>

    </main>
  );
}

export default function AwaitingCardPage() {
  return <ToastProvider><Lab /></ToastProvider>;
}
