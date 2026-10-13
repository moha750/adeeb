"use client";

// معاينةُ نافذة «التكليف» قبل بنائها (٢٠٢٦-١٠-١٠). قرّر المالك أن يكون في النظام تكليفٌ بمدّة: مقعدٌ
// مؤقّتٌ فوق المنصب الأصيل، يُختار عنده «مع استمرار منصبه» أو «مع تجميد منصبه»، ولا يقع إلّا على مقعدٍ
// شاغر. والمقعدُ المجمَّد لصاحبه يجوز التكليف عليه بلا تاريخ: ينتهي بعودة صاحبه.
//
// عُرض شكلان: (أ) الخياران شريطٌ ممتدّ وآخر يومٍ تاريخٌ يُختار، و(ب) الخياران بطاقتان تسمّيان منصب العضو.
// فاختار المالك (ب) وحُذف (أ)، وعدّله بكلمته: البطاقتان جنبًا إلى جنب لا واحدةً تحت الأخرى، والمدّة أربعة
// خيارات: شهر، شهران، ثلاثة أشهر، تاريخٌ يختاره. والبطاقتان متجاورتين تحتاجان النافذة المتوسّطة (`md`)،
// وإلّا انكسر عنوانا البطاقتين على سطرين. وعلى الجوّال تتكدّسان من نفسهما (`.form-grid` تحت 720px). والقاعدة جاهزة: `assign_acting` في ترحيل التكليف (لم يُطبَّق).
//
// وكانت تحت النافذة معاينةُ كرت المنصب بشكلين لعلامة التكليف، فردّهما المالك وطلب إعادةَ «تعيين المناصب»
// كلِّها: صارت لوحةَ مقاعد معاينتُها في `/ui/seats`.
//
// الأسماء مخترَعة: `/ui` صفحةٌ عامّة.
import { useState } from "react";
import { Button, Container } from "@adeeb/design-system";
import { ActingModal, type ActingSeat } from "../../dashboard/members/assignments/ActingModal";
import type { ActingCandidate } from "../../dashboard/members/structure/actions";

// المرشّحون والمقعدان مخترَعون؛ والنافذة نفسها هي الحيّة (`ActingModal`)، مصدرٌ واحد لا نسخة.
const MEMBERS: ActingCandidate[] = [
  { id: "m1", name: "سديم بندر القحطاني", gender: "female", avatar: null, held: "نائبة قائد لجنة التصوير" },
  { id: "m2", name: "عبد الرحمن خالد الشيخ", gender: "male", avatar: null, held: "عضو لجنة الفعاليات" },
  { id: "m3", name: "لطيفة عبد العزيز السليطين", gender: "female", avatar: null, held: "قائدة لجنة الرواة" },
  { id: "m4", name: "نواف ثلاب الشمري", gender: "male", avatar: null, held: "منسّق قسم الإعلام" },
];
const SEATS: Record<"vacant" | "frozen", ActingSeat> = {
  vacant: { roleAr: "قائد", scope: "لجنة التسويق", owner: null },
  frozen: { roleAr: "نائب قائد", scope: "لجنة التصوير", owner: { name: "سديم بندر القحطاني", gender: "female" } },
};

export default function ActingPreview() {
  const [open, setOpen] = useState<"vacant" | "frozen" | null>(null);
  return (
    <Container className="space-y-10 py-16">
      <h1 className="font-display text-4xl font-black text-content">التكليف</h1>
      <div className="flex flex-wrap gap-3">
        <Button variant="primary" size="md" onClick={() => setOpen("vacant")}>مقعدٌ شاغر</Button>
        <Button variant="ghost" size="md" onClick={() => setOpen("frozen")}>مقعدٌ مجمَّدٌ لصاحبه</Button>
      </div>
      <ActingModal key={open ?? "none"} seat={open ? SEATS[open] : null} members={MEMBERS} busy={false} onClose={() => setOpen(null)} onSubmit={() => setOpen(null)} />
    </Container>
  );
}
