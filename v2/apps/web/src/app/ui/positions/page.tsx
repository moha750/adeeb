"use client";

import { useState } from "react";
import { Button, Container } from "@adeeb/design-system";
import { ArrowsClockwise, Trash } from "@phosphor-icons/react";
import { PositionCard } from "../../dashboard/members/assignments/PositionCard";
import { AssignmentModal, type AssignState, type MemberOption } from "../../dashboard/members/assignments/AssignmentModal";
import type { MenuGroup } from "../../dashboard/_components/DropdownMenu";
import type { Holder, Position } from "../../dashboard/members/structure/model";

// شاغلٌ وهميّ — لا أفتار (رجوعٌ للأحرف)، يكفي لعرض الشريط
const H = (name: string): Holder => ({ userId: name, name, avatar: null, gender: null, roleName: "x", roleAr: "x", committeeId: null, departmentId: null });

// منصبٌ وهميّ مُختصَر — القيم الافتراضيّة ثمّ ما يُهمّ العرض
const P = (o: Partial<Position> & { key: string; roleAr: string; scope: string }): Position => ({
  roleName: o.key, council: "executive", committeeId: null, departmentId: null, holders: [],
  singleton: true, elected: false, voteWeight: 1, councilMember: false, ...o,
});

const FILLED_ACTIONS: MenuGroup[] = [
  { header: "إجراءات", items: [
    { label: "استبدال الشاغل", icon: <ArrowsClockwise /> },
    { label: "إزالة من المنصب", icon: <Trash />, danger: true },
  ] },
];
const ACTIONS = () => FILLED_ACTIONS;

// عيّنةٌ تغطّي المحاور: مشغول/شاغر · مفرد/متعدّد · تنفيذيّ/إداريّ · عضو/تابع · منتخَب/تعيين · أوزان ١…٤
const SAMPLE: Position[] = [
  P({ key: "president", roleAr: "رئيس النادي", scope: "المجلس الإداري", council: "administrative", councilMember: true, voteWeight: 4, holders: [H("محمد بن إسماعيل")] }),
  P({ key: "lead", roleAr: "قائد لجنة", scope: "لجنة الإعلام", elected: true, voteWeight: 3, holders: [H("خالد العتيبي")] }),
  P({ key: "dep", roleAr: "نائب قائد لجنة", scope: "لجنة الإعلام", elected: true, voteWeight: 2, holders: [H("سارة القحطاني")] }),
  P({ key: "hr", roleAr: "عضو إدارة الموارد البشرية", scope: "إدارة الموارد البشرية", council: "administrative", councilMember: false, voteWeight: 1 }),
  P({ key: "head", roleAr: "منسّق قسم", scope: "قسم التطوير", elected: true, voteWeight: 3 }),
  P({ key: "member", roleAr: "عضو مجلس إداريّ", scope: "المجلس الإداري", council: "administrative", councilMember: true, voteWeight: 1, holders: [H("نورة الدوسري")] }),
];

// المتعدّد — منصبٌ يقبل أكثر من شاغل (`roles.holder_uniqueness='multi'`): لكلٍّ شريطُه
// وقائمتُه، ونداءُ الزيادة يبقى مفتوحًا مهما امتلأ. والشاغرُ منه شاغرٌ كغيره.
const MULTI: Position[] = [
  P({ key: "adv1", roleAr: "مستشار رئيس النادي", scope: "المجلس الإداري", council: "administrative", councilMember: true, singleton: false, holders: [H("عبدالله الشمري"), H("ريم الحربي"), H("فيصل الزهراني")] }),
  P({ key: "adv2", roleAr: "مستشار رئيس النادي", scope: "المجلس الإداري", council: "administrative", councilMember: true, singleton: false, holders: [H("عبدالله الشمري")] }),
  P({ key: "adv3", roleAr: "مستشار رئيس النادي", scope: "المجلس الإداري", council: "administrative", councilMember: true, singleton: false }),
];

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 font-latin text-xs font-bold uppercase tracking-[0.18em] text-content-muted">{children}</p>;
}

const noop = () => {};

// أعضاء وهميّون لمنتقي المحرّر (بلا أفتار → رجوعٌ للأحرف)
const DEMO_MEMBERS: MemberOption[] = [
  { id: "1", name: "محمد بن إسماعيل" },
  { id: "2", name: "خالد العتيبي" },
  { id: "3", name: "سارة القحطاني" },
  { id: "4", name: "نورة الدوسري" },
];

export default function PositionsPage() {
  const [demo, setDemo] = useState<AssignState | null>(null);
  const [pick, setPick] = useState("");
  const openDemo = (s: AssignState) => { setPick(""); setDemo(s); };

  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System · Position Card</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">كرت المنصب</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          عرضُ منصبٍ قياديّ وحالته في تبويب «تعيين المناصب». المنصبُ هو البطل، وشارةُ
          المجلس والعضويّة مدموجةً («عضو المجلس …» / «تابع للمجلس …»)، ثمّ شريطُ شاغلٍ أو نداءُ «شاغر». النغمةُ تقول الحالة:
          <b> brand</b> = مشغول (هادئ فولاذيّ) · <b>danger</b> = شاغر (يطلب الإسناد) — يبني على أساس
          <code className="font-latin"> .acard</code> ونظام النغمة (ق٤/٥)، أنماطُه <code className="font-latin">.pcard-*</code> بالمكتبة.
        </p>

        <div className="mt-12 space-y-12">
          <section>
            <Label>الحالات (مشغول · شاغر · عضو المجلس / تابع للمجلس · تنفيذيّ/إداريّ)</Label>
            <div className="card-grid">
              {SAMPLE.map((p) => (
                <PositionCard key={p.key} position={p} actions={ACTIONS} onAssign={noop} />
              ))}
            </div>
          </section>

          <section>
            <Label>المفرد والمتعدّد (منصبٌ يقبل أكثر من شاغل)</Label>
            <p className="mb-6 max-w-2xl text-content-muted">
              التفرّد ليس قرارَ الواجهة: تقوله <code className="font-latin">roles.holder_uniqueness</code> في القاعدة —
              <b> global</b> واحدٌ في النادي · <b>per_committee</b> واحدٌ لكلّ لجنة · <b>per_department</b> واحدٌ لكلّ قسم ·
              <b> multi</b> يقبل الزيادة. في المتعدّد: لكلّ شاغلٍ شريطُه وقائمتُه (بلا «استبدال» — يُضاف ويُزال)،
              ونداءُ الزيادة يبقى مفتوحًا مهما امتلأ.
            </p>
            <div className="card-grid">
              {MULTI.map((p) => (
                <PositionCard key={p.key} position={p} actions={ACTIONS} onAssign={noop} />
              ))}
            </div>
          </section>

          <section>
            <Label>القاعدة ٦ — الصفّ الأخير لا يترك فراغًا (شاغرٌ يتيم يمتدّ)</Label>
            <p className="mb-6 max-w-2xl text-content-muted">
              نفس <code className="font-latin">.card-grid</code>: ضيّق النافذة فيتغيّر عدد الأعمدة والقاعدة تصمد —
              الصفّ الناقص يمتلئ بما فيه.
            </p>
            <div className="card-grid">
              {Array.from({ length: 5 }, (_, i) =>
                i === 4
                  ? <PositionCard key={i} position={P({ key: `v${i}`, roleAr: "نائب قائد لجنة", scope: "لجنة التصميم", elected: true, voteWeight: 2 })} actions={() => []} onAssign={noop} />
                  : <PositionCard key={i} position={P({ key: `f${i}`, roleAr: "قائد لجنة", scope: `لجنة رقم ${i + 1}`, elected: true, voteWeight: 3, holders: [H(`قائد ${i + 1}`)] })} actions={ACTIONS} onAssign={noop} />,
              )}
            </div>
          </section>

          <section>
            <Label>محرّر الإسناد — النافذة المنغّمة (إسناد · استبدال · إزالة · إضافة لمتعدّد)</Label>
            <p className="mb-6 max-w-2xl text-content-muted">
              النغمةُ تقول شدّة الفعل: إسنادٌ لشاغرٍ <b>محايد</b> · استبدالٌ لمشغول <b>warning</b> · إزالة <b>danger</b>.
              رأسٌ بسياق المنصب ومنتقي عضوٍ بأفتار (بحث) — يبني على
              <code className="font-latin"> Modal</code> + القاعدة ٩. (وتوزيعُ الإشراف بابُه الآخر: <code className="font-latin">/ui/supervisors</code>.)
            </p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => openDemo({ kind: "assign", replace: false, position: P({ key: "e1", roleAr: "قائد لجنة", scope: "لجنة الإعلام" }) })}>إسناد (شاغر)</Button>
              <Button variant="warning" onClick={() => openDemo({ kind: "assign", replace: true, position: P({ key: "e2", roleAr: "قائد لجنة", scope: "لجنة الإعلام", holders: [H("خالد العتيبي")] }) })}>استبدال</Button>
              <Button variant="danger" onClick={() => setDemo({ kind: "remove", position: P({ key: "e3", roleAr: "قائد لجنة", scope: "لجنة الإعلام", holders: [H("خالد العتيبي")] }), holder: H("خالد العتيبي") })}>إزالة</Button>
              <Button variant="neutral" onClick={() => openDemo({ kind: "assign", replace: false, position: P({ key: "e5", roleAr: "مستشار رئيس النادي", scope: "المجلس الإداري", council: "administrative", councilMember: true, singleton: false, holders: [H("عبدالله الشمري")] }) })}>إضافة (متعدّد)</Button>
            </div>
          </section>
        </div>
      </Container>
      <AssignmentModal state={demo} members={DEMO_MEMBERS} pick={pick} onPick={setPick} busy={false} onClose={() => setDemo(null)} onSubmit={() => setDemo(null)} />
    </main>
  );
}
