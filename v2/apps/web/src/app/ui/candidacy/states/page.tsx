"use client";

// ★ مؤقّت — معاينةٌ تفاعليّة: تبويب «سِجلّ ترشُّحي» **الحقيقيّ** (نفس مكوّن CandidacyJourney)
// بكلّ حالاته، ولوحةٌ تشرح متى يظهر التبويب ويختفي. بلا حاجةٍ لقبولٍ/رفضٍ فعليّ. تُحذف بعد التأكّد.

import { useState } from "react";
import { Alert, Card, CardBody, CardHeader, Container } from "@adeeb/design-system";
import { Scales } from "@phosphor-icons/react";
import { Eye, EyeSlash } from "@/app/_components/glyphs";
import { ToastProvider, useToast } from "../../../dashboard/_components/ToastProvider";
import { CandidacyJourney } from "../../../dashboard/elections/_member/CandidacyJourney";
import type { CandidacyJourney as CJ } from "../../../dashboard/elections/member-data";
import { PageHeader } from "@/app/dashboard/_components/PageHeader";
import type { CrumbStep } from "@/app/dashboard/_shell/crumb";

/** فتاتٌ مرسومٌ لأنّ صفحةَ المعرض ليست في خريطة اللوحة (خاصّيّةُ `crumb` للمعارض وحدها) */
const CRUMB: CrumbStep[] = [
  { kind: "link", label: "الانتخابات", href: "#" },
  { kind: "leaf", label: "سِجلّ ترشُّحي" },
];

const D = "2 أغسطس 2026،14:20";
const BASE = {
  candidateId: "a", electionId: "e1", cycle: "دورة أغسطس 2026", archived: false, position: "قائد لجنة الإعلام", number: 3, status: "pending" as const,
  fileUrl: null as string | null, fileName: "خطة-الإعلام.pdf" as string | null,
  statement:
    "أسعى إلى بناء تغطيةٍ إعلاميّةٍ أسبوعيّةٍ منتظمة تُبرز أنشطة النادي وتصل إلى كلّ الأعضاء عبر قنواتٍ متجدّدة. لديّ خبرةُ عامين في إدارة المحتوى، وأخطّط لفريقٍ صغيرٍ يغطّي الفعاليّات ويُصدر نشرةً شهريّة.",
};
const S = (o: Omit<CJ, keyof typeof BASE> & Partial<CJ>): CJ => ({ ...BASE, ...o });

const T = {
  submit: { kind: "submit" as const, label: "قُدّم الترشّح", date: D },
  approve: { kind: "approve" as const, label: "اعتُمد الترشّح", date: "3 أغسطس 2026،16:45" },
  open: { kind: "open" as const, label: "فُتح التصويت", date: "5 أغسطس 2026" },
};

const STATES: { key: string; label: string; cjs: CJ[] | null }[] = [
  { key: "pending", label: "قيد المراجعة", cjs: [S({
    statusLabel: "قيد المراجعة", statusTone: "warning", future: "تصويت",
    next: "طلبك تحت مراجعة إدارة الموارد البشرية. يمكنك تعديل أو تطوير ترشّحك خلال مراجعة ترشيحك.",
    trail: [T.submit], canEdit: true, canWithdraw: true })] },
  { key: "needs_edit", label: "يحتاج تعديلًا", cjs: [S({
    statusLabel: "يحتاج تعديلًا", statusTone: "info", future: "تصويت",
    next: "راجِع ملاحظة إدارة الموارد البشرية وعدّل بيانك أو ملفّك، ثمّ أعِد الإرسال.",
    trail: [T.submit, { kind: "edit", label: "طُلب تعديل", date: "3 أغسطس 2026،09:10", note: "وضّح خطّتك للتغطية الأسبوعيّة، وأضِف جدولًا زمنيًّا." }],
    canEdit: true, canWithdraw: true })] },
  { key: "approved_c", label: "معتمَد (الترشّح مفتوح)", cjs: [S({
    statusLabel: "معتمَد", statusTone: "success", future: "تصويت",
    next: "مُبارك لك! تم قبول ترشحك لخوض مرحلة التصويت.",
    trail: [T.submit, T.approve], canEdit: false, canWithdraw: true })] },
  { key: "approved_v", label: "معتمَد (التصويت جارٍ)", cjs: [S({
    statusLabel: "معتمَد", statusTone: "success", future: "النتيجة",
    next: "التصويت جارٍ الآن على ترشّحك.",
    trail: [T.submit, T.approve, T.open], canEdit: false, canWithdraw: false })] },
  { key: "rejected", label: "مرفوض", cjs: [S({
    statusLabel: "مرفوض", statusTone: "danger", future: null,
    next: "تعتذر إدارة الموارد البشرية عن قبول ترشّحك في هذا الانتخاب، يُمكنك رؤية سبب الرفض.",
    trail: [T.submit, { kind: "reject", label: "رُفض الترشّح", date: "3 أغسطس 2026،16:45", note: "شكرًا لتقدّمك؛ رأت الإدارة ترشّحًا أنسبَ للنطاق." }],
    canEdit: false, canWithdraw: false })] },
  { key: "withdrawn", label: "منسحب", cjs: [S({
    statusLabel: "منسحب", statusTone: "neutral", future: null,
    next: "سحبتَ ترشّحك من هذا الانتخاب.",
    trail: [T.submit, { kind: "withdraw", label: "سُحب الترشّح", date: "3 أغسطس 2026،18:00" }],
    canEdit: false, canWithdraw: false })] },
  { key: "won", label: "فائز", cjs: [S({
    statusLabel: "فائز", statusTone: "success", future: null,
    next: "مُبارَك لك! فزتَ بالمنصب يا قائد لجنة الإعلام",
    trail: [T.submit, T.approve, T.open, { kind: "win", label: "فاز بالمنصب", date: "8 أغسطس 2026" }],
    canEdit: false, canWithdraw: false })] },
  { key: "lost", label: "لم يُوفَّق", cjs: [S({
    statusLabel: "لم يُوفَّق", statusTone: "info", future: null,
    next: "انتهى التصويت؛ لم يُوفَّق ترشّحك هذه المرّة، شكرًا لِمُشاركتك.",
    trail: [T.submit, T.approve, T.open, { kind: "end", label: "انتهى التصويت", date: "8 أغسطس 2026" }],
    canEdit: false, canWithdraw: false })] },
  { key: "multiple", label: "ترشّحان (متعدّد)", cjs: [
    S({ statusLabel: "معتمَد", statusTone: "success", future: "تصويت", next: "مُبارك لك! تم قبول ترشحك لخوض مرحلة التصويت.", trail: [T.submit, T.approve], canEdit: false, canWithdraw: true }),
    S({ candidateId: "b", position: "نائب لجنة البرمجة", number: 2, statusLabel: "قيد المراجعة", statusTone: "warning", future: "تصويت", next: "طلبك تحت مراجعة إدارة الموارد البشرية. يمكنك تعديل أو تطوير ترشّحك خلال مراجعة ترشيحك.", trail: [{ kind: "submit", label: "قُدّم الترشّح", date: "4 أغسطس 2026،10:00" }], canEdit: true, canWithdraw: true }),
  ] },
  { key: "empty", label: "لا ترشّحات (الباب مخفيّ)", cjs: null },
];

// المعاينةُ التفاعليّة — زرّ «تعديل الترشّح» ينتقل (في الحقيقة) إلى صفحة تعديل البيان؛ هنا محاكاةٌ
// بتنبيه، والسحبُ كذلك. الغرضُ رؤيةُ حالات التبويب لا الإرسال الفعليّ.
function Preview({ cjs }: { cjs: CJ[] | null }) {
  const toast = useToast();
  return (
    <Frame>
      {cjs ? (
        <div className="mpage">
          {cjs.map((c) => (
            <CandidacyJourney
              key={c.candidateId}
              c={c}
              onEdit={() => toast.success("محاكاة: ينتقل إلى صفحة تعديل البيان")}
              onWithdraw={() => toast.success("محاكاة: سُحب الترشّح (لا يحفظ فعليًّا)")}
            />
          ))}
        </div>
      ) : (
        <Alert tone="info" title="لا ترشّحات بعد">حين تترشّح لانتخابٍ، تظهر هنا رحلتُه: حالتُه وبيانُه وخطُّ أحداثه. (وفي الواقع يكون بند التبويب مخفيًّا من القائمة أصلًا.)</Alert>
      )}
    </Frame>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded border border-line p-4 md:p-7" style={{ background: "var(--color-bg)" }}>
      <PageHeader crumb={CRUMB} title="سِجلّ ترشُّحي" />
      {children}
    </div>
  );
}

export default function CandidacyStatesLab() {
  const [sel, setSel] = useState(0);
  const st = STATES[sel];

  return (
    <main className="py-16">
      <Container className="max-w-4xl">
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Candidacy Tab, States</p>
        <h1 className="mt-1 font-display text-4xl font-black text-content">سِجلّ ترشُّحي: كلّ الحالات</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          هذا هو التبويب <b className="text-content">الحقيقيّ</b> (مكوّن CandidacyJourney نفسه) بكلّ حالاته. بدّل الحالة لترى كيف يتبدّل الهيرو و«ما التالي» والأزرار والرحلة، بلا قبولٍ أو رفضٍ فعليّ.
        </p>

        {/* لوحةُ الظهور والاختفاء */}
        <Card className="mt-6">
          <CardHeader variant="soft" icon={<Eye />} title="متى يظهر التبويب ويختفي؟" />
          <CardBody>
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <Eye size={18} style={{ color: "var(--success)", flex: "none", marginTop: 2 }} />
                <span className="txt"><b>يظهر</b> في القائمة حين يكون لك ترشّحٌ واحدٌ على الأقلّ (إشارة <b>hasCandidacy</b>)، ويبقى في كلّ حالاته سِجلًّا (من «قيد المراجعة» إلى «فائز/لم يُوفَّق»).</span>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <EyeSlash size={18} style={{ color: "var(--color-text-muted)", flex: "none", marginTop: 2 }} />
                <span className="txt"><b>يختفي</b> حين لا ترشّح لك بعد (لا صفوف)، ويشترط أصلًا قدرة <b>run_for_election</b> (دورك يؤهّلك للترشّح).</span>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <Scales size={18} style={{ color: "var(--steel-600)", flex: "none", marginTop: 2 }} />
                <span className="txt">وأخواه بابان مستقلّان: <b>الترشُّح</b> يظهر بإشارة canRun (انتخابٌ مفتوحٌ لم تقدّم له)، و<b>التصويت</b> بإشارة canVote (تصويتٌ مفتوحٌ في نطاقك، أدليتَ فيه أو لم تُدلِ).</span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* مبدّل الحالة */}
        <div className="mt-6 flex flex-wrap gap-2">
          {STATES.map((s, i) => (
            <button key={s.key} type="button" onClick={() => setSel(i)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${i === sel ? "border-primary bg-primary text-white" : "border-line bg-surface text-content-muted hover:border-primary"}`}>
              {s.label}
            </button>
          ))}
        </div>

        {/* التبويب الحقيقيّ — وزرّ «تعديل الترشّح» يفتح نافذة الترشّح الحقيقيّة */}
        <div className="mt-6">
          <ToastProvider>
            <Preview key={sel} cjs={st.cjs} />
          </ToastProvider>
        </div>
      </Container>
    </main>
  );
}
