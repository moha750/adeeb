"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Badge, Button, Container, Segmented } from "@adeeb/design-system";
import { ArrowRight, Eye, EyeSlash, Trash } from "@/app/_components/glyphs";
import { DownloadSimple } from "@/app/_components/glyphs";
import { CrumbTrail } from "../../dashboard/_shell/Breadcrumb";
import type { CrumbStep } from "../../dashboard/_shell/crumb";
import { DataTable, type Column } from "../../dashboard/_components/DataTable";
import { Toolbar, type FilterDef, type ViewMode } from "../../dashboard/_components/Toolbar";
import { PageHeader } from "../../dashboard/_components/PageHeader";
import type { MenuGroup } from "../../dashboard/_components/DropdownMenu";

/**
 * معاينةُ شاشةٍ كاملة — **الرأسُ والشريطُ والجدولُ مجتمعةً**، لا مكوّنًا معزولًا.
 *
 * ما سبق كان يعرض كلَّ قطعةٍ وحدَها، والسؤالُ الباقي: **كم من الشاشة الأولى يبقى للبيانات
 * بعد أن يأخذ الرأسُ والشريطُ نصيبَهما؟** فالرقمُ المعروض هو ما يُستهلك قبل أوّل صفٍّ من
 * الجدول، مقيسًا حيًّا.
 *
 * والقطعُ كلُّها المكوّناتُ الحقيقيّة: `PageHeader` و`ToolbarNext` و`DataTable`.
 */

const WIDTHS = [
  { value: "390", label: "جوّال ٣٩٠" },
  { value: "430", label: "جوّال كبير ٤٣٠" },
  { value: "820", label: "لوح ٨٢٠" },
  { value: "1180", label: "سطح مكتب" },
];

const CRUMB: CrumbStep[] = [
  { kind: "link", label: "الأعضاء", href: "#" },
  { kind: "leaf", label: "السجلّ" },
];

const FILTERS: FilterDef[] = [
  { key: "dept", label: "القسم", options: [
    { value: "media", label: "الإعلام" }, { value: "tech", label: "التقنية" }, { value: "content", label: "المحتوى" },
  ] },
  { key: "role", label: "الدور", options: [
    { value: "member", label: "عضو" }, { value: "lead", label: "قائد" }, { value: "head", label: "رئيس قسم" },
  ] },
  { key: "status", label: "الحالة", options: [
    { value: "active", label: "نشط" }, { value: "inactive", label: "غير نشط" },
  ] },
];

type Row = { id: string; name: string; role: string; dept: string; active: boolean };
const ROWS: Row[] = [
  { id: "1", name: "محمّد إسماعيل", role: "رئيس النادي", dept: "الإدارة", active: true },
  { id: "2", name: "سارة القحطاني", role: "نائبة الرئيس", dept: "الإدارة", active: true },
  { id: "3", name: "فهد العتيبي", role: "عضو لجنة الإعلام", dept: "الإعلام", active: true },
  { id: "4", name: "ليلى المطيري", role: "منسّقة الفعاليّات", dept: "المحتوى", active: false },
];

const COLUMNS: Column<Row>[] = [
  { key: "name", header: "العضو", width: "1.4fr", render: (r) => (
    <div>
      <div style={{ fontWeight: 800 }}>{r.name}</div>
      <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{r.role}</div>
    </div>
  ) },
  { key: "dept", header: "القسم", width: "1fr" },
  { key: "st", header: "الحالة", width: "120px", render: (r) => (
    <Badge tone={r.active ? "success" : "neutral"} variant="soft" dot>{r.active ? "نشط" : "غير نشط"}</Badge>
  ) },
];

/** يقيس ما يُستهلك من أعلى الشاشة حتى أوّل صفٍّ من الجدول */
function useConsumed(): [number, (el: HTMLDivElement | null) => void] {
  const [h, setH] = useState(0);
  const ref = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const apply = () => {
      /* أوّلُ **خليّةٍ** في متن الجدول لا أوّلُ صفّ: `.dt-row` عنصرٌ `display: contents`
         فلا صندوقَ له، و`getBoundingClientRect` تُرجع أصفارًا — فيخرج القياسُ سالبًا. */
      const first = el.querySelector(".dt-body .dt-c");
      if (!first) return;
      const v = Math.round(first.getBoundingClientRect().top - el.getBoundingClientRect().top);
      // حارسٌ: أوّلُ نداءٍ قد يقع قبل التخطيط فيخرج رقمًا سالبًا لا معنى له
      if (v > 0) setH(v);
    };
    requestAnimationFrame(() => { apply(); requestAnimationFrame(apply); });
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    // ويُراقَب الصفُّ نفسُه: الإطارُ لا يتغيّر حجمُه حين ينكمش ما فوقه، فلا يوقظ المراقب
    const row = el.querySelector(".dt-body .dt-c");
    if (row) ro.observe(row);
  }, []);
  return [h, ref];
}

function Frame({ tag, tone, children }: { tag: string; tone: "bad" | "good"; children: React.ReactNode }) {
  const [h, ref] = useConsumed();
  return (
    <div className="phdlab-col">
      <div className={"phdlab-tag " + tone}>
        <span className="dot" aria-hidden />
        {tag}
        <span className="h">{h ? "قبل البيانات " + h + "px" : ""}</span>
      </div>
      <div className="phdlab-frame" style={{ paddingBottom: 14 }} ref={ref}>{children}</div>
    </div>
  );
}

const MENU: MenuGroup[] = [
  { items: [{ label: "معاينة السجلّ", icon: <Eye /> }, { label: "تصدير", icon: <EyeSlash /> }] },
  { danger: true, items: [{ label: "حذف", icon: <Trash />, danger: true }] },
];


/* ══════════ العنوانُ الطويل ══════════ */

const TITLES = [
  { tag: "قصير", text: "سجلّ الأعضاء" },
  { tag: "متوسّط", text: "سجلّ أعضاء لجنة الموارد البشريّة" },
  { tag: "طويل", text: "سجلّ أعضاء لجنة الموارد البشريّة والضمان والجودة للموسم الثقافيّ الثاني" },
];

/** يقيس ارتفاع الرأس وحدَه — الدعوى أنّه لا يطول بطول عنوانه */
function useH2(): [number, (el: HTMLDivElement | null) => void] {
  const [h, setH] = useState(0);
  const ref = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const apply = () => setH(Math.round(el.getBoundingClientRect().height));
    requestAnimationFrame(apply);
    const ro = new ResizeObserver(apply);
    ro.observe(el);
  }, []);
  return [h, ref];
}

function HeadPair({ title }: { title: string }) {
  const [hOld, refOld] = useH2();
  const [hNew, refNew] = useH2();
  return (
    <div className="phdlab">
      <div className="phdlab-col">
        <div className="phdlab-tag bad"><span className="dot" aria-hidden />الآن<span className="h">{hOld ? hOld + "px" : ""}</span></div>
        <div className="phdlab-frame" style={{ paddingBottom: 14 }}>
          <div ref={refOld}>
            <div className="phdlab-was">
              <div>
                <CrumbTrail steps={CRUMB} />
                <h1>{title}</h1>
              </div>
              <div className="phdlab-was-acts">
                <Badge tone="info" variant="soft">١٢٤ عضوًا</Badge>
                <Button variant="ghost" size="md"><Eye size={18} />معاينة</Button>
                <Button variant="primary" size="md"><DownloadSimple size={18} />تصدير</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="phdlab-col">
        <div className="phdlab-tag good"><span className="dot" aria-hidden />المقترح<span className="h">{hNew ? hNew + "px" : ""}</span></div>
        <div className="phdlab-frame" style={{ paddingBottom: 14 }}>
          <div ref={refNew}>
            <PageHeader
              title={title}
              crumb={CRUMB}
              status={<Badge tone="info" variant="soft">١٢٤ عضوًا</Badge>}
              primary={{ label: "تصدير", icon: <DownloadSimple size={18} />, onClick: () => {} }}
              menu={MENU}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ScreenPreviewLab() {
  const [w, setW] = useState("390");

  const [s1, setS1] = useState(""); const [f1, setF1] = useState<Record<string, string>>({ dept: "media" }); const [v1, setV1] = useState<ViewMode>("table");
  const [s2, setS2] = useState(""); const [f2, setF2] = useState<Record<string, string>>({ dept: "media" }); const [v2, setV2] = useState<ViewMode>("table");

  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System, Screen Preview</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">الشاشة كاملةً</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          الرأسُ والشريطُ والجدولُ مجتمعةً بمكوّناتها الحقيقيّة. والرقمُ فوق كلّ إطارٍ هو
          <b> ما يُستهلك قبل أوّل صفٍّ من البيانات</b> — وهو المقياسُ الذي يهمّ فعلًا.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <span className="text-sm font-bold text-content-muted">عرض الإطار:</span>
          <Segmented items={WIDTHS} value={w} onValueChange={setW} aria-label="عرض إطار المعاينة" />
        </div>
      </Container>

      <div className="mx-auto w-full max-w-[1400px] px-6">
        <div className="mt-12" style={{ ["--phdlab-w" as string]: w + "px" }}>
          <div className="phdlab">
            <Frame tag="الآن" tone="bad">
              <div className="phdlab-was">
                <div>
                  <CrumbTrail steps={CRUMB} />
                  <h1>سجلّ الأعضاء</h1>
                </div>
                <div className="phdlab-was-acts">
                  <Badge tone="info" variant="soft">١٢٤ عضوًا</Badge>
                  <Button variant="ghost" size="md"><Eye size={18} />معاينة</Button>
                  <Link href="#" className="abtn abtn-ghost abtn-md"><ArrowRight size={18} />رجوع</Link>
                  <Button variant="primary" size="md"><DownloadSimple size={18} />تصدير</Button>
                </div>
              </div>
              <Toolbar
                searchPlaceholder="ابحث بالاسم أو رقم الجوّال…"
                search={s1} onSearch={setS1}
                filters={FILTERS} filterValues={f1}
                onFilter={(k, v) => setF1((p) => ({ ...p, [k]: v }))} onReset={() => setF1({})}
                view={v1} onViewChange={setV1}
              />
              <DataTable columns={COLUMNS} rows={ROWS} getRowId={(r) => r.id} />
            </Frame>

            <Frame tag="المقترح" tone="good">
              <PageHeader
                title="سجلّ الأعضاء"
                crumb={CRUMB}
                status={<Badge tone="info" variant="soft">١٢٤ عضوًا</Badge>}
                primary={{ label: "تصدير", icon: <DownloadSimple size={18} />, onClick: () => {} }}
                menu={MENU}
              />
              <Toolbar
                searchPlaceholder="ابحث بالاسم أو رقم الجوّال…"
                search={s2} onSearch={setS2}
                filters={FILTERS} filterValues={f2}
                onFilter={(k, v) => setF2((p) => ({ ...p, [k]: v }))} onReset={() => setF2({})}
                view={v2} onViewChange={setV2}
              />
              <DataTable columns={COLUMNS} rows={ROWS} getRowId={(r) => r.id} />
            </Frame>
          </div>

          <section className="mt-20">
            <h2 className="mb-2 font-display text-2xl font-black text-content">والعنوانُ الطويل؟</h2>
            <p className="mb-8 max-w-2xl text-sm text-content-muted">
              الدعوى أنّ الرأسَ <b>لا يطول بطول عنوانه</b>: العنوانُ يُهذَّب بسطرين ثمّ حذف،
              والأفعالُ لا تنكمش ولا تلتفّ. والعنوانُ كاملًا في <span className="font-latin">title</span>
              فيُقرأ بالوقوف عليه. قارِن الأرقام أدناه عند العرض نفسِه.
            </p>
            <div className="space-y-10">
              {TITLES.map((t) => (
                <div key={t.tag}>
                  <div className="mb-3 text-sm font-bold text-content-muted">{t.tag}: {t.text}</div>
                  <HeadPair title={t.text} />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
