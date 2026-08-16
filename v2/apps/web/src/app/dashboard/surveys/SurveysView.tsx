"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Stat, matchesSearch } from "@adeeb/design-system";
import {
  Archive, ChartBar, ChatCenteredDots, ClipboardText, LinkSimple, PauseCircle, Play, StopCircle } from "@phosphor-icons/react";
import {
  ArrowClockwise, ArrowCounterClockwise, CheckCircle, Eye, MagnifyingGlass, PencilSimple, Plus,
  Trash,
} from "@/app/_components/glyphs";
import { DataTable, type Column } from "../_components/DataTable";
import { Toolbar, type FilterDef } from "../_components/Toolbar";
import { usePersistentView } from "../_components/usePersistentView";
import { useLiveNow } from "../_components/useLiveNow";
import { Tabs } from "../_components/Tabs";
import { Pagination } from "../_components/Pagination";
import { EmptyState } from "../_components/EmptyState";
import { ConfirmDialog } from "../_components/ConfirmDialog";
import { useToast } from "../_components/ToastProvider";
import type { MenuGroup } from "../_components/DropdownMenu";
import { useReactTable, getCoreRowModel, getSortedRowModel, type SortingState, type ColumnDef } from "@tanstack/react-table";
import type { SurveyRow } from "./data";
import { ACCESS_LABEL, ACCESS_TYPES, STATUS_OPS, type StatusOp } from "./vocab";
import { deleteSurveyPermanently, getSurveyPreview, setSurveyStatus } from "./actions";
import { StatusBadge } from "./StatusBadge";
import { ScheduleLine } from "./ScheduleLine";
import { SurveyPreview } from "./SurveyPreview";
import type { PublicSurvey, PublicQuestion } from "@/app/surveys/[id]/SurveyRespond";
import { SurveyCard } from "./SurveyCard";
import { Breadcrumb } from "../_shell/Breadcrumb";
import { copyText } from "@/lib/clipboard";

// نغمة سطح الصفّ من الحالة المخزّنة — المتوقّف أصفر. النشط لا يُدرَج هنا لأنّ خضرته مشروطة
// بكونه حيًّا الآن (لا مجدولًا ولا منتهيًا) لا بحالته المخزّنة وحدها — تُحسب في isLiveActive.
// المحذوفات تبويب أحاديّ الحالة، فتُلوَّن الطاولة كاملةً بنغمة الخطر (كقاعدة الجداول) لا كلّ صفّ.
const ROW_TONE: Partial<Record<SurveyRow["status"], "success" | "warning" | "danger">> = {
  paused: "warning",
};

// النشط الحيّ = مخزَّن نشط ونافذته مفتوحة الآن (لا مجدول ولا منتهٍ) — السطح الأخضر الوحيد،
// مصدرٌ واحد يقرؤه الجدول والكرت وشارتُه «نشط» الخضراء. المجدول/المنتهية مدّته نشطٌ مخزَّنًا
// لكنّه ليس حيًّا الآن، فلا يستحقّ خضرة السطح.
const isLiveActive = (s: SurveyRow) => s.status === "active" && !s.scheduled && !s.expired && !s.archived && !s.deleted;

// نغمة صفّ الجدول — في تبويب «نشطة» تختلط الحالات فيقول كلٌّ حالته بلون سطحه (كالكرت):
// الحيّ أخضر · المتوقّف أصفر · **انتهت مدّته رماديّ** (كـ«منتهٍ»: انتهى فعلًا) · والمجدول وحده يبقى خامًا
// (لم يبدأ بعد، وشارته الزرقاء تقوله).
const rowToneFor = (s: SurveyRow): "neutral" | "success" | "warning" | "danger" | undefined =>
  s.deleted || s.archived ? undefined // مواضع أحاديّة الحالة (الأرشيف/المحذوفات): النغمة على الطاولة كاملةً
    : isLiveActive(s) ? "success"
    : s.expired ? "neutral"
    : ROW_TONE[s.status];

// تبويبات دورة الحياة — تجميعٌ دلاليّ يستبدل مرشّح الحالة المكدِّس: كلّ تبويب
// صفوفه متجانسة الأفعال، و«الأرشيف»/«المحذوفات» مكانان يُقصَدان لا صفّان يزاحمان الحيّ.
// «نشطة» تضمّ النشط والمتوقّف (والمجدول حالته active) — كلّها في التشغيل.
// الموضع بالعلمين ثمّ الحالة (الأسبقيّة: محذوف ← مؤرشف ← حالة): الأرشيف والمحذوفات عَلَمان لا حالتان.
const LIFECYCLE_TABS: { value: string; label: string; match: (s: SurveyRow) => boolean; empty: string; canCreate?: boolean }[] = [
  { value: "active", label: "نشطة", match: (s) => !s.deleted && !s.archived && (s.status === "active" || s.status === "paused"), empty: "لا استبيانات نشطة الآن.", canCreate: true },
  { value: "draft", label: "مسودّات", match: (s) => !s.deleted && !s.archived && s.status === "draft", empty: "لا مسودّات. ابدأ استبيانًا جديدًا.", canCreate: true },
  { value: "closed", label: "منتهية", match: (s) => !s.deleted && !s.archived && s.status === "closed", empty: "لا استبيانات منتهية بعد." },
  { value: "archived", label: "الأرشيف", match: (s) => !s.deleted && s.archived, empty: "الأرشيف فارغ." },
  { value: "deleted", label: "المحذوفات", match: (s) => s.deleted, empty: "سلّة المحذوفات فارغة." },
];

/** أيقونات إجراءات دورة الحياة — بمفاتيح STATUS_OPS نفسها (المصدر الواحد للانتقالات). */
const OP_ICON: Record<StatusOp, React.ReactNode> = {
  publish: <Play />,
  pause: <PauseCircle />,
  close: <StopCircle />,
  reopen: <ArrowClockwise />,
  archive: <Archive />,
  unarchive: <ArrowCounterClockwise />,
  softDelete: <Trash />,
  restore: <ArrowCounterClockwise />,
};

/** الإجراءات الهدّامة تُصادَق قبل تنفيذها؛ الباقي ينفَّذ مباشرة. */
const CONFIRMED_OPS: Partial<Record<StatusOp, { title: string; text: (t: string) => string; confirm: string; tone: "danger" | "warning" }>> = {
  close: { title: "إنهاء الاستبيان؟", text: (t) => `سيتوقّف استقبال الإجابات على «${t}» نهائيًّا.`, confirm: "إنهاء", tone: "warning" },
  softDelete: { title: "نقل إلى المحذوفات؟", text: (t) => `سيُنقل «${t}» إلى المحذوفات ويتوقّف عن استقبال الإجابات. يمكن استعادته لاحقًا.`, confirm: "نقل إلى المحذوفات", tone: "danger" },
};

export function SurveysView({ surveys }: { surveys: SurveyRow[] }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startPending] = useTransition();
  const [search, setSearch] = useState("");
  const [fv, setFv] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [tab, setTab] = useState("active");
  const [confirm, setConfirm] = useState<{ survey: SurveyRow; op: StatusOp } | null>(null);
  const [confirmKill, setConfirmKill] = useState<SurveyRow | null>(null);
  const [preview, setPreview] = useState<{ survey: PublicSurvey; questions: PublicQuestion[] } | null>(null);
  const [, startPreview] = useTransition();
  const [view, changeView] = usePersistentView("surveys-view");

  const currentTab = LIFECYCLE_TABS.find((t) => t.value === tab) ?? LIFECYCLE_TABS[0];

  const runOp = (survey: SurveyRow, op: StatusOp) => {
    startPending(async () => {
      const r = await setSurveyStatus(survey.id, op);
      if (r.ok) { toast.success(r.message); setConfirm(null); router.refresh(); } else toast.error(r.message);
    });
  };

  const copyLink = async (s: SurveyRow) => {
    try {
      await copyText(`${window.location.origin}/surveys/${s.id}`);
      toast.success("نُسخ رابط الاستبيان.");
    } catch { toast.error("تعذّر النسخ."); }
  };

  // معاينة حيّة في القائمة — تُعيد استعمال طبقة البنّاء نفسها (SurveyPreview) مغذّاةً بتفاصيل الاستبيان
  // المجلوبة، لأيّ حالة وبلا عدّ مشاهدة (بخلاف فتح الصفحة العلنيّة الذي يبوّب المسودّة ويضخّم المشاهدات).
  const openPreview = (s: SurveyRow) => {
    startPreview(async () => {
      const r = await getSurveyPreview(s.id);
      if (r.ok) setPreview({ survey: r.survey, questions: r.questions });
      else toast.error(r.message);
    });
  };

  // الحالة صارت تبويبات؛ يبقى الوصول مرشّحًا متعامدًا (عامّ/أعضاء)
  const filters: FilterDef[] = useMemo(() => [
    { key: "access", label: "الوصول", options: ACCESS_TYPES.map((a) => ({ value: a.value, label: ACCESS_LABEL[a.value] })) },
  ], []);

  // مطابقةُ البحث/المرشّح **مستقلّةً عن التبويب** — مصدرٌ واحد يخدم عدّ التبويبات والصفوفَ وتلميحَ الحالة الفارغة،
  // فيقدر البحث أن يقول «أين» وقعت نتائجك لا أن يصمت بـ«لا نتائج» داخل تبويبٍ واحد.
  const query = search.trim();
  const filtering = !!query || !!fv.access;
  const matchesQuery = useCallback((s: SurveyRow) => {
    if (!matchesSearch(query, s.title, s.description)) return false;
    if (fv.access && s.access !== fv.access) return false;
    return true;
  }, [query, fv.access]);

  // عدّاد كلّ تبويب — أثناء البحث يعرض **عدد المطابقات فيه** (فتُبصر أين نتائجك عبر كلّ التبويبات)، وإلّا إجماليّه.
  const tabItems = useMemo(
    () => LIFECYCLE_TABS.map((t) => {
      const inTab = surveys.filter(t.match);
      const n = filtering ? inTab.filter(matchesQuery).length : inTab.length;
      return { value: t.value, label: t.label, badge: n > 0 ? String(n) : undefined };
    }),
    [surveys, filtering, matchesQuery],
  );

  const rows = useMemo(
    () => surveys.filter((s) => currentTab.match(s) && matchesQuery(s)),
    [surveys, currentTab, matchesQuery],
  );

  // فرز عبر TanStack Table — نموذج أعمدة مُنمّط (كما في وحدة الأعضاء)
  const [sorting, setSorting] = useState<SortingState>([]);
  const tanColumns = useMemo<ColumnDef<SurveyRow>[]>(() => [
    { id: "title", accessorFn: (s) => s.title.toLowerCase() },
    { id: "responses", accessorFn: (s) => s.responses },
    { id: "questions", accessorFn: (s) => s.questions },
    { id: "created", accessorFn: (s) => s.createdRaw },
  ], []);
  const table = useReactTable({
    data: rows,
    columns: tanColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (s) => String(s.id),
  });
  const sortedRows = table.getRowModel().rows.map((r) => r.original);
  const sort = sorting[0] ? { id: sorting[0].id, desc: sorting[0].desc } : null;
  const toggleSort = (id: string) => table.getColumn(id)?.toggleSorting();

  useEffect(() => { setPage(1); }, [search, fv, pageSize, sorting, tab]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = sortedRows.slice((safePage - 1) * pageSize, safePage * pageSize);

  // تحديث حيّ للحالات المحسوبة زمنيًّا (مجدول→نشط→منتهٍ): مؤقّتٌ يضبط لحظات انتقال الاستبيانات المؤرَّخة،
  // ونعيد حساب scheduled/expired على العميل من التواريخ الخام — فتنقلب الشارة والنغمة بلا تحديث صفحة.
  const transitionTimes = useMemo(() => {
    const ts: number[] = [];
    for (const s of surveys) {
      if (s.status !== "active") continue;
      if (s.startDate) ts.push(new Date(s.startDate).getTime());
      if (s.endDate) ts.push(new Date(s.endDate).getTime());
    }
    return ts;
  }, [surveys]);
  const now = useLiveNow(transitionTimes);
  const livePageRows = useMemo(() => {
    if (!now) return pageRows; // قبل التركيب: قيم الخادم (دقيقة لحظة التحميل)
    return pageRows.map((s) => {
      if (s.status !== "active") return s;
      const start = s.startDate ? new Date(s.startDate).getTime() : null;
      const end = s.endDate ? new Date(s.endDate).getTime() : null;
      const scheduled = start != null && start > now;
      const expired = end != null && end < now;
      return scheduled === s.scheduled && expired === s.expired ? s : { ...s, scheduled, expired };
    });
  }, [pageRows, now]);

  // مزامنة الإغلاق التلقائيّ: استبيانٌ انقضت مدّته وما زال مخزّنًا active يُغلقه الكنس (كلّ دقيقة)؛ نُعيد
  // الجلب بعد مهلةٍ تكفيه فينتقل إلى «منتهية» بلا تحديث يدويّ. يتوقّف حين لا يبقى منقضٍ غير مُغلق في اللقطة.
  useEffect(() => {
    if (!now) return;
    const pendingClose = surveys.some((s) => s.status === "active" && !s.deleted && !s.archived && s.endDate && new Date(s.endDate).getTime() < now);
    if (!pendingClose) return;
    const t = window.setTimeout(() => router.refresh(), 70000);
    return () => window.clearTimeout(t);
  }, [now, surveys, router]);

  // عمود الحالة شرطيّ: يظهر في «نشطة» وحده — هناك تختلط أربع حالات (نشط/متوقّف/
  // مجدول/انتهت مدّته) فيحمل معلومة. في التبويبات أحاديّة الحالة قيمته ثابتة على
  // كلّ صفّ (التبويب قاله سلفًا) فيُسقَط، ويُستردّ عرضه للأعمدة الأنفع.
  const columns: Column<SurveyRow>[] = useMemo(() => [
    {
      // العنوان وحده يُعرّف — لا وصف نثريّ مبتور في جدول للمسح البصريّ.
      // الوصف يبقى قابلًا للبحث، ويظهر كاملًا عند المرور (title)، ومكانه الطبيعيّ صفحتا النتائج والتحرير.
      key: "title", header: "الاستبيان", width: "minmax(220px, 2.4fr)", sortable: true,
      render: (s) => <span className="txt" title={s.description ?? undefined}><b>{s.title}</b></span>,
    },
    ...(tab === "active"
      ? [{ key: "status", header: "الحالة", width: "1.1fr", render: (s: SurveyRow) => <StatusBadge survey={s} /> }]
      : []),
    { key: "access", header: "الوصول", width: "0.9fr", render: (s) => <span className="txt">{ACCESS_LABEL[s.access]}</span> },
    { key: "questions", header: "الأسئلة", width: "0.7fr", align: "center", sortable: true, render: (s) => <span className="txt num">{s.questions}</span> },
    { key: "responses", header: "المشاركات", width: "0.8fr", align: "center", sortable: true, render: (s) => <span className="txt num">{s.responses}</span> },
    { key: "created", header: "التوقيت", width: "minmax(150px, 1.4fr)", sortable: true, render: (s) => <ScheduleLine survey={s} className="text-sm" /> },
  ], [tab]);

  // قائمة إجراءات الصفّ — دورة الحياة من STATUS_OPS نفسها: ما يصحّ على حالته يظهر، وما سواه لا
  const actionsFor = (s: SurveyRow): MenuGroup[] => {
    const lifecycle = (Object.keys(STATUS_OPS) as StatusOp[])
      .filter((op) => op !== "softDelete" && op !== "restore")
      .filter((op) => STATUS_OPS[op].when({ status: s.status, archived: s.archived, deleted: s.deleted }))
      .map((op) => ({
        label: STATUS_OPS[op].label,
        icon: OP_ICON[op],
        onSelect: () => (CONFIRMED_OPS[op] ? setConfirm({ survey: s, op }) : runOp(s, op)),
      }));
    const danger = s.deleted
      ? [
          { label: STATUS_OPS.restore.label, icon: OP_ICON.restore, onSelect: () => runOp(s, "restore") },
          { label: "حذف نهائيّ", icon: <Trash />, danger: true, onSelect: () => setConfirmKill(s) },
        ]
      : [{ label: STATUS_OPS.softDelete.label, icon: OP_ICON.softDelete, danger: true, onSelect: () => setConfirm({ survey: s, op: "softDelete" }) }];
    return [
      {
        header: "إجراءات",
        items: [
          { label: "النتائج", icon: <ChartBar />, onSelect: () => router.push(`/dashboard/surveys/${s.id}/results`) },
          { label: "تحرير", icon: <PencilSimple />, onSelect: () => router.push(`/dashboard/surveys/${s.id}/edit`) },
          { label: "معاينة صفحة الاستبيان", icon: <Eye />, onSelect: () => openPreview(s) },
          { label: "نسخ رابط الاستبيان", icon: <LinkSimple />, onSelect: () => copyLink(s) },
        ],
      },
      ...(lifecycle.length ? [{ header: "دورة الحياة", items: lifecycle }] : []),
      { header: "منطقة الخطر", danger: true, items: danger },
    ];
  };

  // الفعل الأساسيّ المُدرِك للحالة — مصدرٌ واحد للعرضين: زرُّ الكرت، ووجهةُ نقر صفّ الجدول.
  // بلا أسئلة → «أضف أسئلة» (الخطوة الناقصة)؛ مسودّةٌ بأسئلة → «متابعة التحرير»؛ وسواها → «عرض النتائج».
  const primaryAction = (s: SurveyRow): { key: "results" | "edit"; label: string; icon: React.ReactNode; href: string } => {
    const base = `/dashboard/surveys/${s.id}`;
    if (s.questions === 0) return { key: "edit", label: "أضف أسئلة", icon: <Plus />, href: `${base}/edit` };
    if (s.status === "draft") return { key: "edit", label: "متابعة التحرير", icon: <PencilSimple />, href: `${base}/edit` };
    return { key: "results", label: "عرض النتائج", icon: <ChartBar />, href: `${base}/results` };
  };

  // الكرت يُبرز الفعل الأساسيّ زرًّا، فيسقط **توأمُه** عن قائمة نقاطه (لا تكرار)، وتبقى القائمة كاملةً في الجدول.
  const cardActionsFor = (s: SurveyRow): MenuGroup[] => {
    const twin = primaryAction(s).key === "results" ? "النتائج" : "تحرير";
    return actionsFor(s)
      .map((g) => ({ ...g, items: g.items.filter((it) => it.label !== twin) }))
      .filter((g) => g.items.length > 0);
  };

  // نغمة الكرت تشارك الجدول سطوحه: **المحذوف** أحمر (العَلَم يسبق كلّ شيء)، ثمّ **الحيّ** أخضر،
  // ثمّ **«انتهى»** رماديّ (بالوقت «انتهت مدّته» أو بالإغلاق «منتهٍ»/«مؤرشف» — كلّها status='closed')،
  // ثمّ **المتوقّف** أصفر (ROW_TONE). والمجدول وحده يبقى خامًا (لم يبدأ، وشارته الزرقاء تقوله).
  const cardTone = (s: SurveyRow) =>
    s.deleted ? "danger"
      : isLiveActive(s) ? "success"
      : s.expired || s.status === "closed" ? "neutral"
      : ROW_TONE[s.status] ?? undefined;

  const clearFilters = () => { setSearch(""); setFv({}); };
  const active = useMemo(
    () => surveys.filter((s) => {
      if (s.status !== "active" || s.deleted || s.archived) return false;
      if (!now) return !s.expired; // قبل التركيب: قيمة الخادم (دقيقة لحظة التحميل)
      const end = s.endDate ? new Date(s.endDate).getTime() : null;
      return !(end != null && end < now); // انقضاء حيّ
    }).length,
    [surveys, now],
  );
  // الإجماليّات تستثني ما في **سلّة المحذوفات** (ليست استبياناتٍ قائمة)، ويبقى **المؤرشف** محسوبًا
  // (محفوظٌ لا ممحوّ). بهذا تتّسق البطاقات الثلاث بدل أن يناقض «الإجمالي» المنتفخُ «نشطَ الآن».
  const kept = useMemo(() => surveys.filter((s) => !s.deleted), [surveys]);
  const totalResponses = kept.reduce((sum, s) => sum + s.responses, 0);

  // تبويباتٌ أخرى طابقها البحث — تُرشد الحالةَ الفارغة إلى «أين وُجد» بدل صمتٍ كاذب
  const otherTabMatches = filtering
    ? LIFECYCLE_TABS.filter((t) => t.value !== tab)
        .map((t) => ({ t, n: surveys.filter(t.match).filter(matchesQuery).length }))
        .filter((x) => x.n > 0)
    : [];

  const emptyState = surveys.length === 0 ? (
    // لا استبيانات في المنظومة كلّها — دعوة الإنشاء الكبيرة
    <EmptyState
      variant="aurora"
      icon={<ClipboardText />}
      title="لا استبيانات بعد"
      description="أنشئ أوّل استبيان وشاركه بالرابط أو مع الأعضاء."
      action={<Button variant="primary" size="md" onClick={() => router.push("/dashboard/surveys/new")}><Plus size={18} />استبيان جديد</Button>}
    />
  ) : filtering ? (
    // التبويب الحاليّ بلا مطابقة — فإن طابقت تبويباتٌ أخرى أرشدنا إليها بنقرةٍ بدل «لا نتائج» عمياء
    <EmptyState
      variant="soft"
      icon={<MagnifyingGlass />}
      title={otherTabMatches.length ? "لا نتائج في هذا التبويب" : "لا استبيانات مطابقة"}
      description={otherTabMatches.length ? "لكنّ بحثك طابق في تبويباتٍ أخرى:" : "لم نعثر على استبيانات تطابق بحثك أو المرشّح."}
      action={
        otherTabMatches.length ? (
          <div className="flex flex-wrap items-center justify-center gap-2">
            {otherTabMatches.map(({ t, n }) => (
              <Button key={t.value} variant="ghost" size="sm" onClick={() => setTab(t.value)}>
                {t.label} <b className="num">{n}</b>
              </Button>
            ))}
            <Button variant="ghost" size="sm" onClick={clearFilters}>مسح البحث</Button>
          </div>
        ) : (
          <Button variant="ghost" size="md" onClick={clearFilters}>مسح المرشّحات</Button>
        )
      }
    />
  ) : (
    // التبويب نفسه فارغ — رسالته الخاصّة (مع دعوة الإنشاء في تبويبَي العمل)
    <EmptyState
      variant="soft"
      icon={<ClipboardText />}
      title={`لا استبيانات في «${currentTab.label}»`}
      description={currentTab.empty}
      action={currentTab.canCreate ? <Button variant="primary" size="md" onClick={() => router.push("/dashboard/surveys/new")}><Plus size={18} />استبيان جديد</Button> : undefined}
    />
  );

  const pager = rows.length ? (
    <Pagination page={safePage} pageSize={pageSize} total={rows.length} onPageChange={setPage} onPageSizeChange={setPageSize} noun="استبيان" />
  ) : null;

  const confirmSpec = confirm ? CONFIRMED_OPS[confirm.op] : undefined;

  return (
    <>
      <div className="ash-phead">
        <div>
          <Breadcrumb />
          <h1>الاستبيانات</h1>
        </div>
        <Link href="/dashboard/surveys/new" className="abtn abtn-primary abtn-md"><Plus size={18} />استبيان جديد</Link>
      </div>

      <div className="stat-grid" style={{ marginBottom: 18 }}>
        <Stat icon={<ClipboardText />} value={kept.length} label="إجمالي الاستبيانات" />
        <Stat icon={<CheckCircle />} value={active} label="نشط الآن" tone="success" />
        <Stat icon={<ChatCenteredDots />} value={totalResponses} label="مشاركة مكتملة" />
      </div>

      {/* تبويبات دورة الحياة — بديل مرشّح الحالة: مساحة العمل (نشطة/مسودّات/منتهية) منفصلة
          عن المخزَن (الأرشيف/المحذوفات)، وكلّ تبويب صفوفه متجانسة الأفعال */}
      <div style={{ marginBottom: 14 }}>
        <Tabs items={tabItems} value={tab} onValueChange={setTab} variant="pill" />
      </div>

      <Toolbar
        searchPlaceholder="ابحث بعنوان الاستبيان…"
        search={search}
        onSearch={setSearch}
        filters={filters}
        filterValues={fv}
        onFilter={(k, v) => setFv((p) => ({ ...p, [k]: v }))}
        onReset={() => setFv({})}
        view={view}
        onViewChange={changeView}
      />

      {view === "table" ? (
        <DataTable
          columns={columns}
          rows={livePageRows}
          getRowId={(s) => String(s.id)}
          sort={sort}
          onToggleSort={toggleSort}
          emptyState={emptyState}
          footer={pager ?? undefined}
          rowActions={actionsFor}
          onRowClick={(s) => router.push(primaryAction(s).href)}
          tone={tab === "deleted" ? "danger" : (tab === "closed" || tab === "archived") ? "neutral" : undefined}
          rowTone={rowToneFor}
        />
      ) : rows.length === 0 ? (
        <div className="card-empty">{emptyState}</div>
      ) : (
        <>
          <div className="card-grid card-grid-2col">
            {livePageRows.map((s) => {
              const p = primaryAction(s);
              return (
                <SurveyCard
                  key={s.id}
                  survey={s}
                  actions={cardActionsFor(s)}
                  tone={cardTone(s)}
                  primary={{ label: p.label, icon: p.icon, onClick: () => router.push(p.href) }}
                />
              );
            })}
          </div>
          <div className="card-pager">{pager}</div>
        </>
      )}

      <ConfirmDialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        tone={confirmSpec?.tone ?? "warning"}
        icon={confirm ? OP_ICON[confirm.op] : <StopCircle />}
        title={confirmSpec?.title ?? ""}
        text={confirm && confirmSpec ? confirmSpec.text(confirm.survey.title) : undefined}
        confirmLabel={confirmSpec?.confirm ?? "تأكيد"}
        loading={pending}
        onConfirm={() => { if (confirm) runOp(confirm.survey, confirm.op); }}
      />

      <ConfirmDialog
        open={confirmKill !== null}
        onClose={() => setConfirmKill(null)}
        tone="danger"
        icon={<Trash />}
        title="حذف نهائيّ؟"
        text={confirmKill ? `سيُحذف «${confirmKill.title}» نهائيًّا مع ${confirmKill.responses} مشاركة وكلّ إجاباتها. لا استرجاع بعدها.` : undefined}
        confirmLabel="حذف نهائيّ"
        loading={pending}
        onConfirm={() => {
          if (!confirmKill) return;
          startPending(async () => {
            const r = await deleteSurveyPermanently(confirmKill.id);
            if (r.ok) { toast.success(r.message); setConfirmKill(null); router.refresh(); } else toast.error(r.message);
          });
        }}
      />

      {preview ? (
        <SurveyPreview survey={preview.survey} questions={preview.questions} onClose={() => setPreview(null)} />
      ) : null}
    </>
  );
}
