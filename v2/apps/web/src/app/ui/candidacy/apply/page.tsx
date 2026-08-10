"use client";

// ★ مؤقّت — معاينةُ صفحة إكمال الترشّح (ApplyForm) بحالاتها: جديد · جديد+مقعدٌ شقيق (أفضليّة) ·
// تعديل · معتمَدٌ لا يُعدَّل. الإرسال/الرجوع محاكاةٌ (preview). تُحذف بعد التأكّد.

import { useState } from "react";
import { Container } from "@adeeb/design-system";
import { ToastProvider } from "../../../dashboard/_components/ToastProvider";
import { ApplyForm } from "../../../dashboard/elections/_member/ApplyForm";
import type { ApplyContext } from "../../../dashboard/elections/member-data";

const STMT = "أسعى إلى بناء تغطيةٍ إعلاميّةٍ أسبوعيّةٍ منتظمة تُبرز أنشطة النادي وتصل إلى كلّ الأعضاء عبر قنواتٍ متجدّدة. لديّ خبرةُ عامين في إدارة المحتوى، وأخطّط لفريقٍ صغيرٍ يغطّي الفعاليّات ويُصدر نشرةً شهريّة.";
const BASE: ApplyContext = { ok: true, error: null, electionId: "e1", position: "قائد لجنة الإعلام", committeeId: 1, roleName: "committee_leader", status: "candidacy_open", existing: null, sibling: null, otherOpen: 1 };

const STATES: { key: string; label: string; ctx: ApplyContext }[] = [
  { key: "new", label: "ترشّحٌ جديد", ctx: BASE },
  { key: "last", label: "جديد بلا فرصةٍ أخرى (نافذةٌ بزرّ)", ctx: { ...BASE, otherOpen: 0 } },
  { key: "sibling", label: "جديد + مقعدٌ شقيق (أفضليّة)", ctx: { ...BASE, sibling: { electionId: "e2", position: "نائب لجنة الإعلام" } } },
  { key: "edit", label: "تعديل", ctx: { ...BASE, existing: { candidateId: "c1", statement: STMT, fileName: "خطة-الإعلام.pdf", fileUrl: "x", canEdit: true } } },
  { key: "readonly", label: "معتمَدٌ لا يُعدَّل", ctx: { ...BASE, existing: { candidateId: "c1", statement: STMT, fileName: "خطة-الإعلام.pdf", fileUrl: "x", canEdit: false } } },
];

export default function ApplyLab() {
  const [sel, setSel] = useState(0);
  return (
    <main className="py-16">
      <Container className="max-w-3xl">
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Apply Page · Lab</p>
        <h1 className="mt-1 font-display text-4xl font-black text-content">معاينة صفحة إكمال الترشّح</h1>
        <p className="mt-2 max-w-xl text-content-muted">
          الصفحةُ التي يصلها العضو بعد بوّابة الشروط (جديد) أو من «سِجلّ ترشُّحي» (تعديل). الإرسالُ والرجوع <b className="text-content">محاكاة</b>، وإرسالُ الجديد يفتح <b className="text-content">نافذة النجاح</b> بوجهتيها. بدّل الحالة.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {STATES.map((s, i) => (
            <button key={s.key} type="button" onClick={() => setSel(i)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${i === sel ? "border-primary bg-primary text-white" : "border-line bg-surface text-content-muted hover:border-primary"}`}>
              {s.label}
            </button>
          ))}
        </div>
        <div className="mt-6 rounded border border-line p-4 md:p-7" style={{ background: "var(--color-bg)" }}>
          <ToastProvider>
            <ApplyForm key={STATES[sel].key} ctx={STATES[sel].ctx} userId="demo-user" preview />
          </ToastProvider>
        </div>
      </Container>
    </main>
  );
}
