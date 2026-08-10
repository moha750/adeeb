"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Stat, matchesSearch } from "@adeeb/design-system";
import { Scales, Megaphone, Trophy } from "@phosphor-icons/react";
import { MagnifyingGlass } from "@/app/_components/glyphs";
import { Plus } from "@/app/_components/glyphs";
import { DataTable, type Column } from "../_components/DataTable";
import { Toolbar, type FilterDef } from "../_components/Toolbar";
import { Tabs } from "../_components/Tabs";
import { Pagination } from "../_components/Pagination";
import { EmptyState } from "../_components/EmptyState";
import { useReactTable, getCoreRowModel, getSortedRowModel, type SortingState, type ColumnDef } from "@tanstack/react-table";
import type { ElectionRow, ElectionCreateOptions } from "./data";
import { NewElectionDialog } from "./NewElectionDialog";
import { STATUS_META } from "./vocab";
import { Breadcrumb } from "../_shell/Breadcrumb";

/** شارة الحالة — من STATUS_META (المصدر الواحد)؛ الطورا المفتوحان ينبضان live. */
function statusBadge(e: ElectionRow) {
  const meta = STATUS_META[e.status];
  return <Badge tone={meta.tone} variant="soft" dot live={meta.live}>{meta.label}</Badge>;
}

/**
 * موعدُ الإغلاق التلقائيّ للطور **الجاري** — الترشّح في طوره والتصويت في طوره،
 * وفارغُه بابٌ يُغلق بيد المشرف (كنّاسة القاعدة لا تلمس ما لا موعد له).
 */
const deadlineOf = (e: ElectionRow): string | null =>
  e.status === "candidacy_open" ? e.candidacyEnd
    : e.status === "voting_open" ? e.votingEnd
      : null;

// نغمة الصفّ حسب حالته — الملغى خطر، والمنتظِر فعلًا (ترشّح/تصويت مغلق) تحذير
const SURFACE_TONE: Partial<Record<ElectionRow["status"], "success" | "warning" | "danger">> = {
  cancelled: "danger",
  candidacy_closed: "warning",
  voting_closed: "warning",
};

// تبويبات دورة الحياة — «الجارية» تجمع طوري الترشّح والتصويت (تحتاج فعل المشرف)،
// و«مكتملة»/«ملغاة» مخزَنٌ نهائيّ. كلّ تبويب صفوفه متجانسة القراءة.
const LIFECYCLE_TABS: { value: string; label: string; match: (e: ElectionRow) => boolean; empty: string }[] = [
  { value: "live", label: "الجارية", match: (e) => e.status === "candidacy_open" || e.status === "candidacy_closed" || e.status === "voting_open" || e.status === "voting_closed", empty: "لا انتخابات جارية الآن." },
  { value: "completed", label: "مكتملة", match: (e) => e.status === "completed", empty: "لا انتخابات مكتملة بعد." },
  { value: "cancelled", label: "ملغاة", match: (e) => e.status === "cancelled", empty: "لا انتخابات ملغاة." },
];

export function ElectionsView({ elections, createOptions, readOnly = false }: { elections: ElectionRow[]; createOptions: ElectionCreateOptions | null; readOnly?: boolean }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [fv, setFv] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [tab, setTab] = useState("live");
  const [newOpen, setNewOpen] = useState(false);

  const currentTab = LIFECYCLE_TABS.find((t) => t.value === tab) ?? LIFECYCLE_TABS[0];

  // مرشّح المنصب — يُشتقّ من الأدوار الحاضرة فعلًا في القائمة (لا قائمة محفورة)
  const filters: FilterDef[] = useMemo(() => {
    const seen = new Map<string, string>();
    for (const e of elections) if (!seen.has(e.targetRoleName)) seen.set(e.targetRoleName, e.roleLabel);
    return [{ key: "role", label: "المنصب", options: [...seen].map(([value, label]) => ({ value, label })) }];
  }, [elections]);

  // عدّاد كلّ تبويب — يقول للمشرف أين الأشياء بلمحة
  const tabItems = useMemo(
    () => LIFECYCLE_TABS.map((t) => {
      const n = elections.filter(t.match).length;
      return { value: t.value, label: t.label, badge: n > 0 ? String(n) : undefined };
    }),
    [elections],
  );

  const rows = useMemo(() => {
    return elections.filter((e) => {
      if (!currentTab.match(e)) return false;
      if (!matchesSearch(search, e.positionLabel)) return false;
      if (fv.role && e.targetRoleName !== fv.role) return false;
      return true;
    });
  }, [elections, search, fv, currentTab]);

  // فرز عبر TanStack Table — نموذج أعمدة مُنمّط (كما في الاستبيانات والأعضاء)
  const [sorting, setSorting] = useState<SortingState>([]);
  const tanColumns = useMemo<ColumnDef<ElectionRow>[]>(() => [
    { id: "position", accessorFn: (e) => e.positionLabel.toLowerCase() },
    { id: "candidates", accessorFn: (e) => e.candidates },
    { id: "votes", accessorFn: (e) => e.votes },
    { id: "created", accessorFn: (e) => e.createdRaw },
  ], []);
  const table = useReactTable({
    data: rows,
    columns: tanColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (e) => e.id,
  });
  const sortedRows = table.getRowModel().rows.map((r) => r.original);
  const sort = sorting[0] ? { id: sorting[0].id, desc: sorting[0].desc } : null;
  const toggleSort = (id: string) => table.getColumn(id)?.toggleSorting();

  useEffect(() => { setPage(1); }, [search, fv, pageSize, sorting, tab]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = sortedRows.slice((safePage - 1) * pageSize, safePage * pageSize);

  // عمود الحالة شرطيّ: يظهر في «الجارية» وحدها — هناك تختلط أربع حالات فيحمل معلومة.
  // في «مكتملة»/«ملغاة» قيمته ثابتة (التبويب قاله سلفًا) فيُسقَط ويُستردّ عرضه.
  const columns: Column<ElectionRow>[] = useMemo(() => [
    {
      key: "position", header: "المنصب والنطاق", width: "minmax(220px, 2.4fr)", sortable: true,
      render: (e) => <span className="txt"><b>{e.roleLabel}</b>{e.scopeLabel ? ` ${e.scopeLabel}` : ""}</span>,
    },
    ...(tab === "live"
      ? [{ key: "status", header: "الحالة", width: "1.1fr", render: (e: ElectionRow) => statusBadge(e) }]
      : []),
    { key: "candidates", header: "المرشّحون", width: "0.9fr", align: "center", sortable: true, render: (e) => <span className="txt num">{e.candidates}</span> },
    { key: "votes", header: "الأصوات", width: "0.8fr", align: "center", sortable: true, render: (e) => <span className="txt num">{e.votes}</span> },
    ...(tab === "live"
      ? [{
        key: "deadline", header: "يُغلق تلقائيًّا", width: "minmax(150px, 1.3fr)",
        render: (e: ElectionRow) => { const d = deadlineOf(e); return <span className="txt">{d ?? "بيد المشرف"}</span>; },
      }]
      : []),
    { key: "created", header: "أُنشئ", width: "1.1fr", sortable: true, render: (e) => <span className="txt">{e.created}</span> },
  ], [tab]);

  const clearFilters = () => { setSearch(""); setFv({}); };
  const liveCount = elections.filter((e) => !e.archived && e.status !== "completed" && e.status !== "cancelled").length;
  const completedCount = elections.filter((e) => e.status === "completed").length;
  const filtering = !!search.trim() || !!fv.role;

  const createCta = readOnly ? null : (
    <Button variant="primary" size="md" onClick={() => setNewOpen(true)}><Plus size={18} />انتخاب جديد</Button>
  );

  const emptyState = elections.length === 0 ? (
    <EmptyState
      variant="aurora"
      icon={<Scales />}
      title="لا انتخابات بعد"
      description="افتح أوّل انتخابٍ لمنصبٍ منتخَبٍ شاغر، فيظهر هنا بمرشّحيه وأصواته."
      action={createCta}
    />
  ) : filtering ? (
    <EmptyState
      variant="soft"
      icon={<MagnifyingGlass />}
      title="لا انتخابات مطابقة"
      description="لم نعثر على انتخابات تطابق بحثك أو المرشّح."
      action={<Button variant="ghost" size="md" onClick={clearFilters}>مسح المرشّحات</Button>}
    />
  ) : (
    <EmptyState
      variant="soft"
      icon={<Scales />}
      title={`لا انتخابات في «${currentTab.label}»`}
      description={currentTab.empty}
      action={tab === "live" ? createCta : undefined}
    />
  );

  const pager = rows.length ? (
    <Pagination page={safePage} pageSize={pageSize} total={rows.length} onPageChange={setPage} onPageSizeChange={setPageSize} noun="انتخاب" />
  ) : null;

  return (
    <>
      <div className="ash-phead">
        <div>
          <Breadcrumb />
          <h1>الانتخابات</h1>
        </div>
        {createCta}
      </div>

      <div className="stat-grid" style={{ marginBottom: 18 }}>
        <Stat icon={<Scales />} value={elections.length} label="إجمالي الانتخابات" />
        <Stat icon={<Megaphone />} value={liveCount} label="جارية الآن" tone="success" />
        <Stat icon={<Trophy />} value={completedCount} label="مكتملة" />
      </div>

      <div style={{ marginBottom: 14 }}>
        <Tabs items={tabItems} value={tab} onValueChange={setTab} variant="pill" />
      </div>

      <Toolbar
        searchPlaceholder="ابحث بالمنصب أو النطاق…"
        search={search}
        onSearch={setSearch}
        filters={filters}
        filterValues={fv}
        onFilter={(k, v) => setFv((p) => ({ ...p, [k]: v }))}
        onReset={() => setFv({})}
      />

      <DataTable
        columns={columns}
        rows={pageRows}
        getRowId={(e) => e.id}
        sort={sort}
        onToggleSort={toggleSort}
        emptyState={emptyState}
        footer={pager ?? undefined}
        onRowClick={(e) => router.push(`/dashboard/elections/${e.id}`)}
        rowTone={(e) => SURFACE_TONE[e.status]}
      />

      {createOptions ? <NewElectionDialog open={newOpen} onClose={() => setNewOpen(false)} options={createOptions} /> : null}
    </>
  );
}
