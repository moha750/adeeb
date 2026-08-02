"use client";

import { useState } from "react";
import { Button, Container } from "@adeeb/design-system";
import { UnitMemberCard, committeesLabel } from "../../dashboard/unit/UnitMemberCard";
import { SupervisionModal, type JoinSlot, type SupState } from "../../dashboard/unit/SupervisionModal";
import type { MemberOption } from "../../dashboard/members/assignments/AssignmentModal";
import type { UnitMember, Target, Unit } from "../../dashboard/unit/model";

const T = (id: number, name: string): Target => ({ id, name });

const COMMITTEES: Target[] = [
  T(1, "لجنة الفعاليات"), T(2, "لجنة الرواة"), T(3, "لجنة التأليف"),
  T(4, "لجنة السُفراء"), T(5, "لجنة التصوير"), T(6, "لجنة التصميم"),
];

const UNIT: Unit = { id: 22, name: "إدارة الموارد البشرية", desc: null, link: null, memberRoleName: "hr_admin_member", memberRoleAr: "عضو موارد بشرية", memberPrerequisite: "committee_member", memberPrerequisiteAr: "عضو" };

const S = (name: string, coms: Target[]): UnitMember => ({ userId: name, name, avatar: null, gender: null, committees: coms });

// عيّنةٌ تغطّي المحاور: حِملٌ ثقيل · مثنّى · مفرد · عضوٌ ضُمّ ولم يُوزَّع (نغمة warning)
const SAMPLE: UnitMember[] = [
  S("فاطمة جاسم المرزوق", COMMITTEES.slice(0, 4)),
  S("نافل قاسي السبيعي", COMMITTEES.slice(4, 6)),
  S("اريام رشيد الخلف", COMMITTEES.slice(0, 1)),
  S("عضوٌ بلا لجنة", []),
];

const DEMO_MEMBERS: MemberOption[] = [
  { id: "1", name: "فاطمة جاسم المرزوق" },
  { id: "2", name: "نافل قاسي السبيعي" },
  { id: "3", name: "اريام رشيد الخلف" },
];

// مقاعد «إسناد لجنة» — شاغرٌ ومشغولٌ معًا، فالمنسدلة تعرض المجموعتين لا الشاغر وحده
const DEMO_SLOTS: JoinSlot[] = [
  { committee: T(3, "لجنة التأليف"), holder: null },
  { committee: T(5, "لجنة التصوير"), holder: null },
  { committee: T(4, "لجنة السُفراء"), holder: { userId: "2", name: "نافل قاسي السبيعي", avatar: null, gender: null } },
  { committee: T(6, "لجنة التصميم"), holder: { userId: "3", name: "اريام رشيد الخلف", avatar: null, gender: null } },
];

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 font-latin text-xs font-bold uppercase tracking-[0.18em] text-content-muted">{children}</p>;
}

const noop = () => {};

export default function SupervisorsPage() {
  const [demo, setDemo] = useState<SupState | null>(null);
  const [pick, setPick] = useState("");
  const open = (s: SupState) => { setPick(""); setDemo(s); };
  const person = { userId: "1", name: "فاطمة جاسم المرزوق", avatar: null, gender: null };

  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System · Unit Member Card</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">كرت عضو الوحدة</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          نظيرُ كرت المنصب بالعين المقلوبة، في تبويب «إدارتي»: هناك اللجنةُ هي البطل ومقعدُها
          شاغرٌ أو مشغول، وهنا <b>الشخصُ</b> هو البطل وشرائحُ لجانه هي المحتوى — لأنّ العضو الإداريّ
          يشرف على عدّة لجان، فسؤال «كم يحمل فلان؟» لا تجيبه شبكةُ المقاعد. النغمةُ تقول الحِمل:
          <b> brand</b> = يشرف على لجان · <b>warning</b> = عضوٌ لم يُوزَّع بعد. ومن ضُمّ ولم يُوزَّع
          يظهر بلا شرائح — الكرت نفسه بمعطًى فارغ لا نسخةٌ ثانية.
          يبني على أساس <code className="font-latin">.acard</code> ونظام النغمة (ق٤/٥)، أنماطُه{" "}
          <code className="font-latin">.ovcard-*</code> بالمكتبة.
        </p>

        <div className="mt-12 space-y-12">
          <section>
            <Label>إدارةٌ توزّع إشرافًا (حِملٌ ثقيل · مثنّى · مفرد · بلا لجنة)</Label>
            <div className="card-grid">
              {SAMPLE.map((s) => (
                <UnitMemberCard key={s.userId} member={s} subtitle={committeesLabel(s.committees.length)} onAdd={noop} onRemove={noop} onExpel={noop} />
              ))}
            </div>
          </section>

          <section>
            <Label>محرّر التوزيع — النافذة المنغّمة (ضمّ · إسناد · استبدال · إسناد لجنة · سحب · إخراج)</Label>
            <p className="mb-6 max-w-2xl text-content-muted">
              فعلان تنظيميّان (ضمُّ عضوٍ إلى الإدارة وإخراجُه منها) وثلاثةٌ تشغيليّة بمجهولٍ واحدٍ لكلٍّ
              منها: اللجنةُ معلومة فيُختار المشرف · المشرفُ معلوم فيُختار المقعد · الاثنان معلومان
              فالتأكيدُ وحده. والنغمةُ تقول شدّة الفعل — يبني على
              <code className="font-latin"> Modal</code> + القاعدة ٩.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => open({ kind: "recruit" })}>ضمّ عضو (انتماء)</Button>
              <Button onClick={() => open({ kind: "seat", committee: T(1, "لجنة الفعاليات"), holder: null })}>إسناد (مقعد شاغر)</Button>
              <Button variant="warning" onClick={() => open({ kind: "seat", committee: T(1, "لجنة الفعاليات"), holder: person })}>استبدال المشرف</Button>
              <Button variant="neutral" onClick={() => open({ kind: "join", member: person, slots: DEMO_SLOTS })}>إسناد لجنة (لمشرف)</Button>
              <Button variant="danger" onClick={() => open({ kind: "remove", member: person, committee: T(1, "لجنة الفعاليات") })}>سحب الإشراف</Button>
              <Button variant="danger" onClick={() => open({ kind: "expel", member: person, count: 4 })}>إخراج من الإدارة</Button>
            </div>
          </section>
        </div>
      </Container>
      <SupervisionModal state={demo} unit={UNIT} candidates={DEMO_MEMBERS} unitMembers={DEMO_MEMBERS} pick={pick} onPick={setPick} busy={false} onClose={() => setDemo(null)} onSubmit={() => setDemo(null)} />
    </main>
  );
}
