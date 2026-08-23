"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AreaChart, Badge, BarList, Button, SectionCard, ColumnBars, Donut, Stat, matchesSearch, Modal } from "@adeeb/design-system";
import {
  CalendarBlank, ChartBar, ChatCenteredDots, ClockCountdown, DeviceMobile, Percent, User } from "@phosphor-icons/react";
import { DownloadSimple, Eye, MagnifyingGlass, PencilSimple } from "@/app/_components/glyphs";
import { deviceName } from "@/lib/devices";
import { DataTable, type Column } from "../_components/DataTable";
import { Toolbar } from "../_components/Toolbar";
import { Pagination } from "../_components/Pagination";
import { EmptyState } from "../_components/EmptyState";
import { useToast } from "../_components/ToastProvider";
import { downloadBlob } from "@/lib/download";
import type { SurveyAggregates, QuestionAgg } from "@/lib/surveys/aggregate";
import type { ResponseRow } from "./results-data";
import { QUESTION_TYPE_LABEL, STATUS_META, type SurveyStatus } from "./vocab";
import { PageHeader } from "../_components/PageHeader";

const fmtDur = (s: number | null): string => (s == null ? "—" : s < 60 ? `${s}ث` : `${Math.floor(s / 60)}د ${s % 60}ث`);

// ————— اشتقاقات تبويب التحليلات: كلّها من `agg.totals` و`responses` المجلوبَين سلفًا، بلا طلبٍ إضافيّ —————
const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const fmtDay = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;

const DEVICE_LABEL: Record<string, string> = { mobile: "جوّال", tablet: "لوحيّ", desktop: "حاسوب" };
const DEVICE_ORDER = ["mobile", "tablet", "desktop", "unknown"];
const TIME_BUCKETS: { max: number; label: string }[] = [
  { max: 30, label: "<٣٠ث" }, { max: 60, label: "٣٠–٦٠ث" }, { max: 120, label: "١–٢د" },
  { max: 300, label: "٢–٥د" }, { max: 600, label: "٥–١٠د" }, { max: Infinity, label: ">١٠د" },
];

/** توزيع المشاركات على الأجهزة (فئات الحلقة) — بترتيبٍ ثابت، والمجهول فئةٌ صريحة. */
function deviceDist(rows: ResponseRow[]): { label: string; value: number }[] {
  const c = new Map<string, number>();
  for (const r of rows) { const k = deviceName(r.device); c.set(k, (c.get(k) ?? 0) + 1); }
  return DEVICE_ORDER.filter((k) => c.has(k)).map((k) => ({ label: k === "unknown" ? "غير معروف" : DEVICE_LABEL[k] ?? k, value: c.get(k) ?? 0 }));
}

/** مدرّج أوقات الإجابة — ستّ فئاتٍ ثابتة؛ n عدد المشاركات المؤقّتة (بلا زمنٍ تُستثنى). */
function timeDist(rows: ResponseRow[]): { n: number; bars: { value: number; tick: string; label: string }[] } {
  const counts = TIME_BUCKETS.map(() => 0);
  let n = 0;
  for (const r of rows) {
    const s = r.seconds;
    if (s == null || s <= 0) continue;
    n++;
    let idx = TIME_BUCKETS.findIndex((b) => s < b.max);
    if (idx < 0) idx = TIME_BUCKETS.length - 1;
    counts[idx]++;
  }
  return { n, bars: TIME_BUCKETS.map((b, i) => ({ value: counts[i], tick: b.label, label: b.label })) };
}

/** المشاركات عبر الزمن — تقطيعٌ يتكيّف مع المدى (يوميّ ≤٤٥ يومًا · أسبوعيّ ≤سنة · شهريّ)، بملء الفجوات صفرًا. */
function overTime(rows: ResponseRow[]): { label: string; a: number }[] {
  const dates = rows.map((r) => new Date(r.dateRaw)).filter((d) => !Number.isNaN(d.getTime()));
  if (!dates.length) return [];
  const times = dates.map((d) => d.getTime());
  const min = Math.min(...times), max = Math.max(...times), DAY = 86400000, span = (max - min) / DAY;

  if (span <= 45) {
    const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const counts = new Map<string, number>();
    for (const d of dates) counts.set(key(d), (counts.get(key(d)) ?? 0) + 1);
    const out: { label: string; a: number }[] = [];
    const cur = new Date(min); cur.setHours(0, 0, 0, 0);
    const end = new Date(max); end.setHours(0, 0, 0, 0);
    while (cur.getTime() <= end.getTime()) {
      out.push({ label: fmtDay(cur), a: counts.get(key(cur)) ?? 0 });
      cur.setDate(cur.getDate() + 1);
    }
    return out;
  }
  if (span <= 365) {
    const n = Math.floor(span / 7) + 1;
    const arr = new Array<number>(n).fill(0);
    for (const t of times) arr[Math.min(n - 1, Math.floor((t - min) / (7 * DAY)))]++;
    return arr.map((c, i) => ({ label: fmtDay(new Date(min + i * 7 * DAY)), a: c }));
  }
  const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
  const counts = new Map<string, number>();
  for (const d of dates) counts.set(key(d), (counts.get(key(d)) ?? 0) + 1);
  const out: { label: string; a: number }[] = [];
  const cur = new Date(new Date(min).getFullYear(), new Date(min).getMonth(), 1);
  const end = new Date(max);
  while (cur.getTime() <= end.getTime()) {
    out.push({ label: `${MONTHS[cur.getMonth()]} ${cur.getFullYear()}`, a: counts.get(key(cur)) ?? 0 });
    cur.setMonth(cur.getMonth() + 1);
  }
  return out;
}

/** أشرطة عدّ الخيارات — محوّلٌ رفيع على BarList: الخيار السابق يُلوَّن بـchart-6 ويُوسَم، والنسبة من المجيبين في التلميح. */
function ChoiceBars({ items, answered }: { items: { label: string; count: number; retired?: boolean }[]; answered: number }) {
  return (
    <BarList
      total={answered}
      unit={{ one: "إجابة", two: "إجابتان", few: "إجابات" }}
      empty="لا خيارات."
      items={items.map((it) => ({
        label: it.label,
        value: it.count,
        color: it.retired ? "var(--chart-6)" : "var(--chart-1)",
        note: it.retired ? "(خيار سابق)" : undefined,
      }))}
    />
  );
}

function QuestionCard({ q }: { q: QuestionAgg }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <SectionCard
      headerVariant="chip"
      title={q.text}
      actions={
        <span className="svy-r-qmeta">
          <Badge tone="neutral" variant="soft">{QUESTION_TYPE_LABEL[q.type] ?? q.type}</Badge>
          <span className="num">{q.answered}</span> إجابة
        </span>
      }
    >
      {q.answered === 0 ? (
        <p className="chart-empty">لا إجابات على هذا السؤال بعد.</p>
      ) : q.kind === "choice" ? (
        <ChoiceBars items={q.items} answered={q.answered} />
      ) : q.kind === "boolean" ? (
        <ChoiceBars items={[{ label: "نعم", count: q.yes }, { label: "لا", count: q.no }]} answered={q.answered} />
      ) : q.kind === "number" ? (
        <>
          <div className="svy-r-nums">
            <span>المتوسّط <b className="num">{q.avg ?? "—"}</b></span>
            <span>الأدنى <b className="num">{q.min ?? "—"}</b></span>
            <span>الأعلى <b className="num">{q.max ?? "—"}</b></span>
          </div>
          <ChoiceBars items={q.dist.map((d) => ({ label: String(d.value), count: d.count }))} answered={q.answered} />
        </>
      ) : (
        <>
          <ul className="svy-r-texts">
            {(expanded ? q.samples : q.samples.slice(0, 8)).map((s, i) => (
              <li key={i}>«{s}»</li>
            ))}
          </ul>
          {q.samples.length > 8 ? (
            <Button variant="ghost" size="sm" onClick={() => setExpanded((e) => !e)}>
              {expanded ? "إظهار أقلّ" : `إظهار الكلّ (${q.samples.length})`}
            </Button>
          ) : null}
        </>
      )}
    </SectionCard>
  );
}

/** CSV بترويسة BOM (يفتح عربيًّا سليمًا في Excel) — من البيانات المجلوبة سلفًا، بلا طلب إضافيّ. */
function exportCsv(agg: SurveyAggregates, responses: ResponseRow[]) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const header = ["التاريخ", "المجيب", "المدّة", "الجهاز", ...agg.questions.map((q) => q.text)];
  const lines = responses.map((r) => [
    r.date,
    r.name ?? "مجهول",
    fmtDur(r.seconds),
    r.device ?? "",
    ...agg.questions.map((q) => r.answers[q.qid] ?? ""),
  ].map(esc).join(","));
  const csv = "\uFEFF" + [header.map(esc).join(","), ...lines].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, `${agg.title}_${new Date().toISOString().slice(0, 10)}.csv`, "نتائج-استبيان.csv");
}

export function ResultsView({ agg, responses }: { agg: SurveyAggregates; responses: ResponseRow[] }) {
  const toast = useToast();
  const router = useRouter();
  const [tab, setTab] = useState<"summary" | "analytics" | "responses">("summary");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [detail, setDetail] = useState<ResponseRow | null>(null);

  const statusMeta = STATUS_META[agg.status as SurveyStatus] ?? STATUS_META.draft;

  // مقاييس التحليلات — مشتقّةٌ من الخصائص المجلوبة سلفًا (لا قاعدة، لا طلب). معدّل التحويل «تقريبيّ»:
  // total_views يعدّ كلّ فتحٍ للصفحة (معايناتٌ، تكرار، روبوتات) فالنسبة مؤشّرٌ لا رقمٌ قاطع.
  const analytics = useMemo(() => {
    const views = agg.totals.views;
    const conv = views > 0 ? Math.min(100, Math.round((agg.totals.responses / views) * 100)) : null;
    const lastRaw = responses[0]?.dateRaw; // مرتّبة تنازليًّا بـcompleted_at، فأوّلها الأحدث
    return {
      conv,
      last: lastRaw ? fmtDay(new Date(lastRaw)) : "—",
      over: overTime(responses),
      devices: deviceDist(responses),
      time: timeDist(responses),
    };
  }, [agg.totals.views, agg.totals.responses, responses]);

  const rows = useMemo(() => {
    return responses.filter((r) => matchesSearch(search, r.name ?? "مجهول"));
  }, [responses, search]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize);

  const columns: Column<ResponseRow>[] = useMemo(() => [
    {
      key: "name", header: "المجيب", width: "minmax(160px, 1.6fr)",
      render: (r) => (r.name ? <span className="txt"><b>{r.name}</b></span> : <span className="txt na">مجهول</span>),
    },
    { key: "date", header: "التاريخ", width: "1.2fr", render: (r) => <span className="txt">{r.date}</span> },
    { key: "seconds", header: "المدّة", width: "0.7fr", align: "center", render: (r) => <span className="txt num">{fmtDur(r.seconds)}</span> },
    { key: "device", header: "الجهاز", width: "0.8fr", render: (r) => (r.device ? <span className="txt">{deviceName(r.device)}</span> : <span className="txt na">—</span>) },
    // عمودٌ لكلّ سؤال — الجدول مصفوفةٌ كاملة (كترويسة CSV): الترويسة عنوان السؤال والخليّة إجابته.
    // حرٌّ لا مقصوص (`wrap`): العنوان والإجابة يلتفّان على أسطر فيُقرآن كاملَين، وعرض العمود ثابتٌ فينمو الصفّ طولًا لا التمرير.
    ...agg.questions.map((q): Column<ResponseRow> => ({
      key: `q${q.qid}`,
      header: q.text,
      width: "240px",
      wrap: true,
      render: (r) => {
        const ans = r.answers[q.qid];
        return ans ? <span className="txt">{ans}</span> : <span className="txt na">—</span>;
      },
    })),
  ], [agg.questions]);

  return (
    <>
      {/* غايةُ شاشة النتائج تصديرُها، و«تحرير» بابُ شاشةٍ أخرى — فنزل إلى `⋯`.
          و«النتائج» ورقةٌ لا يقولها العنوان (وهو اسمُ الاستبيان)، فتُمرَّر. */}
      <PageHeader
        title={agg.title}
        crumbLeaf="النتائج"
        status={{ label: statusMeta.label, tone: statusMeta.tone, variant: "soft", live: agg.status === "active" }}
        action={{
          label: "تصدير CSV",
          icon: <DownloadSimple size={18} />,
          onClick: () => {
            if (!responses.length) { toast.info("لا مشاركات لتصديرها."); return; }
            exportCsv(agg, responses);
            toast.success("جُهّز ملفّ CSV.");
          },
        }}
        menu={[{ items: [{
          label: "تحرير",
          icon: <PencilSimple size={18} />,
          onSelect: () => router.push(`/dashboard/surveys/${agg.id}/edit`),
        }] }]}
      />

      <div className="stat-grid" style={{ marginBottom: 18 }}>
        <Stat icon={<ChatCenteredDots />} value={agg.totals.responses} label="مشاركة مكتملة" />
        <Stat icon={<ChartBar />} value={agg.questions.length} label="سؤال" />
      </div>

      <div className="tabs tabs-segmented" role="tablist" style={{ marginBottom: 18 }}>
        <button type="button" role="tab" aria-selected={tab === "summary"} className={"tab" + (tab === "summary" ? " on" : "")} onClick={() => setTab("summary")}>الملخّص</button>
        <button type="button" role="tab" aria-selected={tab === "analytics"} className={"tab" + (tab === "analytics" ? " on" : "")} onClick={() => setTab("analytics")}>التحليلات</button>
        <button type="button" role="tab" aria-selected={tab === "responses"} className={"tab" + (tab === "responses" ? " on" : "")} onClick={() => setTab("responses")}>
          المشاركات<em className="tab-b num">{String(responses.length)}</em>
        </button>
      </div>

      {tab === "summary" ? (
        agg.totals.responses === 0 ? (
          <EmptyState
            variant="aurora"
            icon={<ChatCenteredDots />}
            title="لا مشاركات بعد"
            description="حين تصل أوّل مشاركة تظهر النتائج هنا."
          />
        ) : (
          <div className="svy-r-list">
            {agg.questions.map((q) => <QuestionCard key={q.qid} q={q} />)}
          </div>
        )
      ) : tab === "analytics" ? (
        <div className="st">
          {agg.totals.responses === 0 ? (
            <EmptyState
              variant="aurora"
              icon={<ChatCenteredDots />}
              title="لا مشاركات بعد"
              description="حين تصل أوّل مشاركة تظهر التحليلات هنا."
            />
          ) : (
            <>
              <div className="stat-grid">
                <Stat icon={<Eye />} value={agg.totals.views} label="مشاهدة للصفحة" />
                <Stat icon={<ClockCountdown />} value={fmtDur(agg.totals.avgSeconds)} label="متوسّط وقت الإجابة" />
                <Stat icon={<Percent />} value={analytics.conv == null ? "—" : `${analytics.conv}٪`} label="معدّل تحويل تقريبيّ" />
                <Stat icon={<CalendarBlank />} value={analytics.last} label="آخر مشاركة" />
              </div>
              <SectionCard title="المشاركات عبر الزمن">
                <AreaChart labels={analytics.over.map((o) => o.label)} series={[{ name: "مشاركة", values: analytics.over.map((o) => o.a) }]} />
              </SectionCard>
              <div className="st-grid2">
                <SectionCard title="الأجهزة" icon={<DeviceMobile />}>
                  <Donut items={analytics.devices} unit={{ one: "مشاركة", two: "مشاركتان", few: "مشاركات" }} empty="لا بيانات جهاز." />
                </SectionCard>
                <SectionCard title="توزيع أوقات الإجابة">
                  {analytics.time.n === 0 ? (
                    <p className="chart-empty">لا أوقات مسجّلة.</p>
                  ) : (
                    <ColumnBars bars={analytics.time.bars} barMaxWidth={44} />
                  )}
                </SectionCard>
              </div>
            </>
          )}
        </div>
      ) : (
        <>
          <Toolbar searchPlaceholder="ابحث باسم المجيب…" search={search} onSearch={(v) => { setSearch(v); setPage(1); }} />
          <DataTable
            columns={columns}
            rows={pageRows}
            getRowId={(r) => String(r.id)}
            onRowClick={setDetail}
            emptyState={
              <EmptyState
                variant={responses.length ? "soft" : "aurora"}
                icon={responses.length ? <MagnifyingGlass /> : <ChatCenteredDots />}
                title={responses.length ? "لا مشاركات مطابقة" : "لا مشاركات بعد"}
                description={responses.length ? "لم نعثر على مجيب بهذا الاسم." : "حين تصل أوّل مشاركة تظهر هنا."}
              />
            }
            footer={rows.length ? (
              <Pagination page={safePage} pageSize={pageSize} total={rows.length} onPageChange={setPage} onPageSizeChange={setPageSize} noun="مشاركة" />
            ) : undefined}
          />
        </>
      )}

      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail?.name ?? "مشاركة مجهولة"}
        description={detail ? `${detail.date}، ${fmtDur(detail.seconds)}` : undefined}
        size="md"
        footer={<Button variant="ghost" size="md" onClick={() => setDetail(null)}>إغلاق</Button>}
      >
        {detail ? (
          <div className="svy-r-detail">
            {agg.questions.map((q) => (
              <div key={q.qid} className="svy-r-drow">
                <div className="svy-r-dq"><User size={14} aria-hidden />{q.text}</div>
                <div className={"svy-r-da" + (detail.answers[q.qid] ? "" : " na")}>{detail.answers[q.qid] || "لم تُجَب"}</div>
              </div>
            ))}
          </div>
        ) : null}
      </Modal>
    </>
  );
}
