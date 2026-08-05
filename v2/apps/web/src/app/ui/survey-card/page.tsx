"use client";

// معرضُ كرت الاستبيان (المنقسم) — توثيقُ المكوّن النهائيّ بحالاته الحيّة، كنظير /ui/positions لكرت المنصب.
// المصدر الحيّ هو dashboard/surveys/SurveyCard؛ هذا يعرضه بعيّناتٍ تغطّي كلّ ما يقوله سطر الحالة.
import { Button, Card, CardFooter, Container } from "@adeeb/design-system";
import { PencilSimple } from "@/app/_components/glyphs";
import { Trash } from "@/app/_components/glyphs";
import { DropdownMenu, type MenuGroup } from "../../dashboard/_components/DropdownMenu";
import { StatusBadge } from "../../dashboard/surveys/StatusBadge";
import { SurveyStatusLine } from "../../dashboard/surveys/SurveyStatusLine";
import { ACCESS_LABEL } from "../../dashboard/surveys/vocab";
import type { SurveyRow } from "../../dashboard/surveys/data";

type Tone = "success" | "neutral" | "warning" | undefined;

const ACTIONS: MenuGroup[] = [
  { header: "إجراءات", items: [{ label: "تحرير", icon: <PencilSimple /> }] },
  { header: "منطقة الخطر", danger: true, items: [{ label: "نقل إلى المحذوفات", icon: <Trash />, danger: true }] },
];

/** استبيانٌ وهميّ مختصَر — الافتراضات ثمّ ما يُهمّ العرض. */
const S = (o: Partial<SurveyRow> & { id: number; title: string }): SurveyRow => ({
  description: null, status: "active", access: "public", scheduled: false, expired: false,
  archived: false, deleted: false, questions: 5, responses: 33, views: 140,
  createdBy: "بشائر فاروق الحداد", created: "٢١ مايو ٢٠٢٦", createdRaw: "2026-05-21",
  startDate: "2026-05-21T11:01:00Z", endDate: null, ...o,
});

const primaryLabel = (s: SurveyRow) => (s.questions === 0 ? "أضف أسئلة" : s.status === "draft" ? "متابعة التحرير" : "عرض النتائج");

/** الكرت النهائيّ — نسخةٌ توثيقيّة مطابقةٌ للحيّ (بلا router؛ الفعل زرٌّ صامت). */
function SurveyCard({ s, tone }: { s: SurveyRow; tone: Tone }) {
  return (
    <Card tone={tone} className="scard-split">
      <div className="scard-row">
        <div className="scard-rail">
          <StatusBadge survey={s} />
          <span className="scard-rail-num">{s.responses}</span>
          <span className="scard-rail-lbl">مشاركة</span>
        </div>
        <div className="scard-main">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-col gap-0.5">
              <h3 className="scard-title">{s.title}</h3>
              <span className="scard-meta">{ACCESS_LABEL[s.access]}</span>
            </div>
            <DropdownMenu groups={ACTIONS} tone={tone} />
          </div>
          <SurveyStatusLine survey={s} />
        </div>
      </div>
      <CardFooter>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm text-content-muted" title={s.createdBy ?? undefined}>بقلم {s.createdBy ?? "غير معروف"}</span>
          <span className="truncate text-xs text-content-muted">أُنشئ في {s.created}</span>
        </div>
        <Button variant={tone ?? "primary"} size="sm" className="shrink-0">{primaryLabel(s)}</Button>
      </CardFooter>
    </Card>
  );
}

// عيّناتٌ تغطّي كلّ ما يقوله سطر الحالة (التواريخ نسبيّةٌ لليوم فيظهر العدّاد الحيّ)
const SAMPLE: { row: SurveyRow; tone: Tone }[] = [
  { row: S({ id: 1, title: "تقييم ورشة احتراف الفوتوغراف", endDate: "2026-08-20T11:01:00Z" }), tone: "success" },        // مفتوح، يُغلق بعد…
  { row: S({ id: 2, title: "استبيان مفتوحٌ للمشاركة بلا موعد إغلاق محدّد" }), tone: "success" },                          // متاحٌ دائمًا
  { row: S({ id: 3, title: "استبيانٌ مجدولٌ لم يبدأ بعد", scheduled: true, startDate: "2026-08-05T09:00:00Z" }), tone: undefined }, // يفتح بعد…
  { row: S({ id: 4, title: "استبانة تقييم تجربة القادة وتطوير بيئة العمل", status: "closed", endDate: "2026-06-30T11:01:00Z" }), tone: "neutral" }, // انتهى في…
  { row: S({ id: 5, title: "استبيانٌ موقوفٌ مؤقّتًا", status: "paused" }), tone: "warning" },                              // موقوفٌ مؤقّتًا
  { row: S({ id: 6, title: "مسودّةٌ لم تُنشر بعد", status: "draft", responses: 0, startDate: null }), tone: undefined },   // لم يُنشر بعد
];

export default function SurveyCardPage() {
  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System · Survey Card</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">كرت الاستبيان</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          بطاقةُ هويّةٍ للاستبيان (لا لوحةَ أداء): <b>رصيفٌ منغَّم</b> بالحالة وعدد المشاركات، والهويّةُ إلى جانبه
          (العنوان بطلٌ · الوصول · <b>سطرُ حالةٍ مُخاطِبٌ بعدّادٍ حيّ</b>)، وذيلٌ يقول مَن أنشأه ومتى. يبني على
          <code className="font-latin"> .acard</code> ونظام النغمة (ق٤/٥)، أنماطُه <code className="font-latin">.scard-*</code> بالمكتبة.
          النغمة تقول الحالة: <b>أخضر</b> = حيّ · <b>رماديّ</b> = منتهٍ · <b>أصفر</b> = موقوف · بلا نغمة = مسودّة/مجدول.
        </p>

        <p className="mt-10 mb-4 font-latin text-xs font-bold uppercase tracking-[0.18em] text-content-muted">
          سطر الحالة عبر الأحوال — أيقونتُه في رقاقة Aurora بلون حالها (يفتح · يُغلق · متاحٌ دائمًا · انتهى · موقوف · مسودّة)
        </p>
        <div className="card-grid card-grid-2col">
          {SAMPLE.map(({ row, tone }) => <SurveyCard key={row.id} s={row} tone={tone} />)}
        </div>
      </Container>
    </main>
  );
}
