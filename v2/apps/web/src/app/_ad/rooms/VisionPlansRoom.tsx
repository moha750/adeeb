"use client";

/**
 * **«الرؤى»** (دورةُ حياة الرؤية، محمد ٢٠٢٦-١١-٢٢: «نبني كل شيء من الآن») — الرؤى كلُّها بحالها: ما يُكتب، وما عند الرئيسين، والسارية،
 * والمنتهية. ومنها «رؤيةٌ جديدة»: نافذةٌ بالاسم والمعرّف والموعدين (ومساراتِ رؤيةٍ سابقةٍ إن شاء)، ثمّ المحرّرُ على المنضدة.
 * الرؤيةُ عادةٌ إداريّة: تُكتب الثانيةُ والأولى سارية، وتُطلَق حين تُغلق تلك.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Modal, Select, matchesSearch } from "@adeeb/design-system";
import { CalendarBlank, Flag, Hash, Link as LinkIcon, Stack, Stamp, Target } from "@phosphor-icons/react";
import { PencilSimple, Plus } from "@/app/_components/glyphs";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import type { PlanAccess, PlanListItem, PlanStatus } from "@/app/dashboard/vision/plans/data";
import { createPlan } from "@/app/dashboard/vision/plans/actions";
import { arCount, arCounted, type ArForms } from "@/lib/arabicCount";
import { visionSpan } from "@/lib/vision/span";
import { AdBadge, AdButton, AdCard, type AdMeta, type AdTone } from "../primitives";
import { CollectionRoom, type Position } from "../collection";

const NOUN: ArForms = ["رؤيةٌ واحدة", "رؤيتان", "رؤى", "رؤيةً"];
const AR_GOAL: ArForms = ["هدفٌ واحد", "هدفان", "أهداف", "هدفًا"];
const AR_TRACK: ArForms = ["مسارٌ واحد", "مساران", "مسارات", "مسارًا"];
export const PLANS_PATH = "/dashboard/vision/plans";

export const PLAN_STATUS: Record<PlanStatus, { label: string; tone: AdTone }> = {
  draft: { label: "قيد الكتابة", tone: "neutral" },
  review: { label: "عند الرئيسين", tone: "warn" },
  active: { label: "سارية", tone: "info" },
  closed: { label: "منتهية", tone: "ok" },
};

const POSITIONS: Position<PlanListItem>[] = [
  { key: "all", label: "الكلّ", match: () => true, empty: "لا رؤى بعد." },
  { key: "draft", label: "قيد الكتابة", match: (p) => p.status === "draft", empty: "لا مسوّدة قيد الكتابة." },
  { key: "review", label: "عند الرئيسين", match: (p) => p.status === "review", empty: "لا مسوّدة بانتظار الموافقة." },
  { key: "active", label: "سارية", match: (p) => p.status === "active", empty: "لا رؤية سارية الآن." },
  { key: "closed", label: "منتهية", match: (p) => p.status === "closed", empty: "لم تنتهِ رؤيةٌ بعد." },
];

const EMPTY = { name: "", slug: "", startsOn: "", horizonOn: "", horizonLabel: "", from: "" };

export function VisionPlansRoom({ plans, access }: { plans: PlanListItem[]; access: PlanAccess }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  // كلُّ رؤيةٍ إلى صفحتها هنا، والساريةُ أيضًا (محمد ٢٠٢٦-١١-٢٣): منها يُعدَّل فريقُها وتُغلق، ومنها زرُّ «متابعة الرؤية»
  const href = (p: PlanListItem) => `${PLANS_PATH}/${p.id}`;

  const meta = (p: PlanListItem): AdMeta[] => [
    { icon: <CalendarBlank />, text: visionSpan(p.startsOn, p.startsLabel, p.horizonOn, p.horizonLabel) },
    { icon: <Target />, text: `${arCount(p.tracks, AR_TRACK)} و${arCount(p.goals, AR_GOAL)}` },
    ...(p.status === "review" ? [{ icon: <Stamp />, text: p.approvals.length >= 2 ? "وافق الرئيسان" : p.approvals.length ? "وافق أحد الرئيسين" : "لم يوافق أحد بعد", tone: p.approvals.length >= 2 ? ("ok" as const) : undefined }] : []),
    ...(p.status === "active" || p.status === "closed" ? [{ icon: <Flag />, text: `تحقّق ${p.done} من ${p.goals}` }] : []),
  ];

  const create = () => start(async () => {
    const r = await createPlan({ ...form, from: form.from ? Number(form.from) : null });
    if (!r.ok || !r.id) { toast.error(r.message); return; }
    toast.success(r.message);
    setOpen(false);
    router.push(`${PLANS_PATH}/${r.id}`);
  });

  const sources = plans.filter((p) => p.tracks > 0);

  return (
    <>
      <CollectionRoom<PlanListItem>
        navPath={PLANS_PATH}
        title="الرؤى"
        action={access.writer ? { label: "رؤية جديدة", icon: <Plus />, onClick: () => { setForm(EMPTY); setOpen(true); } } : undefined}
        noun={NOUN}
        items={plans}
        positions={POSITIONS}
        defaultPosition="all"
        searchPlaceholder="ابحث باسم الرؤية…"
        matchSearch={(p, q) => matchesSearch(q, p.name, p.slug)}
        idOf={(p) => String(p.id)}
        emptyAll={{ title: "لا رؤى بعد", desc: "تكتب إدارة الضمان والجودة الرؤية مسوّدةً، فيوافق عليها الرئيسان، ثمّ تُطلَق." }}
        createAction={access.writer ? <AdButton variant="fill" icon={<Plus />} onClick={() => { setForm(EMPTY); setOpen(true); }}>رؤية جديدة</AdButton> : undefined}
        renderCard={(p) => (
          <AdCard key={p.id} seed={String(p.id)} stub={p.goals ? { big: String(p.goals), small: arCounted(p.goals, AR_GOAL) } : { big: "0", small: "بلا أهداف", icon: <Stack /> }}
            chips={<AdBadge tone={PLAN_STATUS[p.status].tone}>{PLAN_STATUS[p.status].label}</AdBadge>}
            title={p.name} href={href(p)} meta={meta(p)} />
        )}
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        busy={pending}
        size="md"
        title="رؤية جديدة"
        description={access.seat ? "تبدأ مسوّدةً لا يراها غيرك، تكتب فيها المسارات والأهداف والعلامة، ثمّ ترسلها للرئيسين." : "تبدأ مسوّدةً لا يراها غير إدارة الضمان والجودة، تكتب فيها المسارات والأهداف والعلامة، ثمّ ترسلها للرئيسين."}
        footer={
          <>
            <Button variant="primary" size="md" loading={pending} onClick={create}>إنشاء المسوّدة</Button>
            <Button variant="ghost" size="md" onClick={() => setOpen(false)} disabled={pending}>إلغاء</Button>
          </>
        }
      >
        <div className="form-grid">
          <Field className="form-full" label="اسم الرؤية" icon={<Target />} innerIcon={<PencilSimple />} placeholder="رؤية الربيع" value={form.name} onChange={set("name")} maxLength={60} required />
          <Field className="form-full" label="المعرّف في الرابط" icon={<LinkIcon />} innerIcon={<Hash />} placeholder="spring" dir="ltr" value={form.slug} onChange={set("slug")} maxLength={40}
            helper={`بحروفٍ إنجليزيّة صغيرة وأرقامٍ وشرطات، ويُقرأ في رابطها: /vision/${form.slug.trim() || "spring"}`} required />
          <Field placeholder="اختر اليوم" innerIcon={<CalendarBlank />} label="تبدأ في" type="date" icon={<CalendarBlank />} value={form.startsOn} onChange={set("startsOn")} required />
          <Field placeholder="اختر اليوم" innerIcon={<CalendarBlank />} label="تنتهي في" type="date" icon={<CalendarBlank />} value={form.horizonOn} onChange={set("horizonOn")} required />
          {sources.length ? (
            <Select className="form-full" label="ابدأ بمسارات رؤية سابقة" icon={<Stack />} value={form.from} onValueChange={(v) => setForm((f) => ({ ...f, from: v }))}
              options={[{ value: "", label: "بلا مسارات، أكتبها من البداية" }, ...sources.map((p) => ({ value: String(p.id), label: `مسارات ${p.name} (${arCount(p.tracks, AR_TRACK)})` }))]}
              helper="تُنسخ أسماء المسارات وتعريفاتها ورموزها، بلا أهداف." optional />
          ) : null}
        </div>
      </Modal>
    </>
  );
}
