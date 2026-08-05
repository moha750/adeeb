"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Stat, matchesSearch } from "@adeeb/design-system";
import { CalendarBlank, CalendarCheck, Megaphone, UsersThree } from "@phosphor-icons/react";
import { ArrowCounterClockwise } from "@/app/_components/glyphs";
import { Eye, EyeSlash, MagnifyingGlass, PencilSimple, Plus, Prohibit, Trash } from "@/app/_components/glyphs";
import { DataTable, type Column } from "../_components/DataTable";
import { Toolbar, type FilterDef } from "../_components/Toolbar";
import { usePersistentView } from "../_components/usePersistentView";
import { Tabs } from "../_components/Tabs";
import { Pagination } from "../_components/Pagination";
import { EmptyState } from "../_components/EmptyState";
import { ConfirmDialog } from "../_components/ConfirmDialog";
import { useToast } from "../_components/ToastProvider";
import type { MenuGroup } from "../_components/DropdownMenu";
import { useReactTable, getCoreRowModel, getSortedRowModel, type SortingState, type ColumnDef } from "@tanstack/react-table";
import type { EventRow } from "./data";
import { STATUS_OPS, TYPE_OPTIONS, type EventStatus, type StatusOp } from "./vocab";
import { deleteEvent, setEventStatus } from "./actions";
import { TypeBadge } from "./TypeBadge";
import { EventCard } from "./EventCard";
import { Breadcrumb } from "../_shell/Breadcrumb";

/** أيقونات إجراءات دورة الحياة — بمفاتيح STATUS_OPS نفسها (المصدر الواحد للانتقالات). */
const OP_ICON: Record<StatusOp, React.ReactNode> = {
  publish: <Megaphone />,
  unpublish: <EyeSlash />,
  cancel: <Prohibit />,
  reactivate: <ArrowCounterClockwise />,
};

/** الإجراءات الهدّامة تُصادَق قبل تنفيذها؛ الباقي ينفَّذ مباشرة. */
const CONFIRMED_OPS: Partial<Record<StatusOp, { title: string; text: (n: string) => string; confirm: string; tone: "danger" | "warning" }>> = {
  cancel: {
    title: "إلغاء الفعاليّة؟",
    text: (n) => `ستُلغى «${n}» وتُخفى عن العامّة. حجوزاتها تبقى محفوظةً، ويمكن إعادة تفعيلها لاحقًا.`,
    confirm: "إلغاء الفعاليّة",
    tone: "danger",
  },
};

// تبويبات دورة الحياة — تجميعٌ دلاليّ بديل مرشّح الحالة: كلّ تبويب صفوفه متجانسة الأفعال.
// «قادمة» = منشورة لم يمضِ وقتها (السطح الأخضر الحيّ)، والباقي مكانٌ يُقصَد.
const LIFECYCLE_TABS: { value: EventStatus; label: string; empty: string }[] = [
  { value: "published", label: "قادمة", empty: "لا فعاليّات قادمة منشورة الآن." },
  { value: "draft", label: "مسودّات", empty: "لا مسودّات." },
  { value: "ended", label: "منتهية", empty: "لا فعاليّات منتهية بعد." },
  { value: "cancelled", label: "ملغاة", empty: "لا فعاليّات ملغاة." },
];

// نغمة السطح من الحالة — مصدرٌ واحد يقرؤه الجدول والكرت: المنشورة (القادمة) خضراء حيّة،
// المنتهية رماديّة، الملغاة حمراء، والمسودّة بلا نغمة سطح (بادئتها المعلوماتيّة على الشارة وحدها).
const toneFor = (s: EventStatus): "success" | "neutral" | "danger" | undefined =>
  s === "published" ? "success" : s === "ended" ? "neutral" : s === "cancelled" ? "danger" : undefined;

export function EventsView({ events }: { events: EventRow[] }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startPending] = useTransition();
  const [search, setSearch] = useState("");
  const [fv, setFv] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [tab, setTab] = useState<EventStatus>("published");
  const [confirm, setConfirm] = useState<{ event: EventRow; op: StatusOp } | null>(null);
  const [confirmKill, setConfirmKill] = useState<EventRow | null>(null);
  const [view, changeView] = usePersistentView("events-view");

  const currentTab = LIFECYCLE_TABS.find((t) => t.value === tab) ?? LIFECYCLE_TABS[0];

  const runOp = (event: EventRow, op: StatusOp) => {
    startPending(async () => {
      const r = await setEventStatus(event.id, op);
      if (r.ok) { toast.success(r.message); setConfirm(null); router.refresh(); } else toast.error(r.message);
    });
  };

  // مرشّحان متعامدان على تبويبات الحالة: النوع، والجهة المنظِّمة (المشتقّة من الفعاليّات الحاضرة).
  const organizerOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const e of events) if (e.organizer && e.organizerName) seen.set(e.organizer, e.organizerName);
    return [...seen.entries()].map(([value, label]) => ({ value, label }));
  }, [events]);

  const filters: FilterDef[] = useMemo(() => {
    const fs: FilterDef[] = [{ key: "type", label: "النوع", options: TYPE_OPTIONS }];
    if (organizerOptions.length) fs.push({ key: "organizer", label: "الجهة", options: organizerOptions });
    return fs;
  }, [organizerOptions]);

  // عدّاد كلّ تبويب من الحالة المشتقّة — يقول للمشرف أين الأشياء بلمحة
  const tabItems = useMemo(
    () => LIFECYCLE_TABS.map((t) => {
      const n = events.filter((e) => e.status === t.value).length;
      return { value: t.value, label: t.label, badge: n > 0 ? String(n) : undefined };
    }),
    [events],
  );

  const rows = useMemo(() => {
    return events.filter((e) => {
      if (e.status !== tab) return false;
      if (!matchesSearch(search, e.name, e.description, e.location)) return false;
      if (fv.type && e.type !== fv.type) return false;
      if (fv.organizer && e.organizer !== fv.organizer) return false;
      return true;
    });
  }, [events, search, fv, tab]);

  // فرز عبر TanStack Table — نموذج أعمدة مُنمّط
  const [sorting, setSorting] = useState<SortingState>([]);
  const tanColumns = useMemo<ColumnDef<EventRow>[]>(() => [
    { id: "name", accessorFn: (e) => e.name.toLowerCase() },
    { id: "date", accessorFn: (e) => e.date },
    { id: "reserved", accessorFn: (e) => e.reserved },
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

  const columns: Column<EventRow>[] = useMemo(() => [
    {
      key: "name", header: "الفعاليّة", width: "minmax(220px, 2.4fr)", sortable: true,
      render: (e) => <span className="txt" title={e.description ?? undefined}><b>{e.name}</b></span>,
    },
    { key: "type", header: "النوع", width: "1fr", render: (e) => <TypeBadge type={e.type} /> },
    {
      key: "organizer", header: "الجهة المنظِّمة", width: "minmax(140px, 1.3fr)",
      render: (e) => e.organizerName
        ? <span className="txt">{e.organizerName}</span>
        : <span className="txt text-content-muted">النادي</span>,
    },
    { key: "date", header: "التاريخ", width: "1.1fr", sortable: true, render: (e) => <span className="txt" title={e.timeLabel || undefined}>{e.dateLabel}</span> },
    { key: "reserved", header: "الحجوزات", width: "0.9fr", align: "center", sortable: true, render: (e) => <span className="txt num">{e.reserved} / {e.totalSeats ?? "∞"}</span> },
  ], []);

  const openDetail = (e: EventRow) => router.push(`/dashboard/events/${e.id}`);
  const openEdit = (e: EventRow) => router.push(`/dashboard/events/${e.id}/edit`);

  // قائمة إجراءات الصفّ — التفاصيل والتحرير، ثمّ دورة الحياة من STATUS_OPS (ما يصحّ على حالته)،
  // ثمّ الحذف الصلب لمسوّدة/ملغاة بلا حجوزات (الخادم يحرس؛ لا يُعرض للمنشورة/المنتهية).
  const actionsFor = (e: EventRow): MenuGroup[] => {
    const lifecycle = (Object.keys(STATUS_OPS) as StatusOp[])
      .filter((op) => (STATUS_OPS[op].from as readonly string[]).includes(e.status))
      .map((op) => ({
        label: STATUS_OPS[op].label,
        icon: OP_ICON[op],
        onSelect: () => (CONFIRMED_OPS[op] ? setConfirm({ event: e, op }) : runOp(e, op)),
      }));
    const canDelete = e.status === "draft" || e.status === "cancelled";
    return [
      { header: "إجراءات", items: [
        { label: "التفاصيل", icon: <Eye />, onSelect: () => openDetail(e) },
        { label: "تحرير", icon: <PencilSimple />, onSelect: () => openEdit(e) },
      ] },
      ...(lifecycle.length ? [{ header: "دورة الحياة", items: lifecycle }] : []),
      ...(canDelete ? [{ header: "منطقة الخطر", danger: true, items: [{ label: "حذف", icon: <Trash />, danger: true, onSelect: () => setConfirmKill(e) }] }] : []),
    ];
  };

  // الكرت قابل للفتح إلى التفاصيل، فتسقط «التفاصيل» عن قائمة نقاطه (وتبقى كاملةً في الجدول).
  const cardActionsFor = (e: EventRow): MenuGroup[] =>
    actionsFor(e)
      .map((g) => ({ ...g, items: g.items.filter((it) => it.label !== "التفاصيل") }))
      .filter((g) => g.items.length > 0);

  const clearFilters = () => { setSearch(""); setFv({}); };
  const upcoming = events.filter((e) => e.status === "published").length;
  const totalReserved = events.reduce((sum, e) => sum + e.reserved, 0);
  const filtering = !!search.trim() || !!fv.type || !!fv.organizer;

  const createBtn = <Button variant="primary" size="md" onClick={() => router.push("/dashboard/events/new")}><Plus size={18} />فعاليّة جديدة</Button>;
  const emptyState = events.length === 0 ? (
    <EmptyState
      variant="aurora"
      icon={<CalendarBlank />}
      title="لا فعاليّات بعد"
      description="أنشئ أوّل فعاليّة — تُحفظ مسودّةً حتّى تنشرها."
      action={createBtn}
    />
  ) : filtering ? (
    <EmptyState
      variant="soft"
      icon={<MagnifyingGlass />}
      title="لا فعاليّات مطابقة"
      description="لم نعثر على فعاليّات تطابق بحثك أو المرشّح."
      action={<Button variant="ghost" size="md" onClick={clearFilters}>مسح المرشّحات</Button>}
    />
  ) : (
    <EmptyState
      variant="soft"
      icon={<CalendarBlank />}
      title={`لا فعاليّات في «${currentTab.label}»`}
      description={currentTab.empty}
      action={tab === "draft" || tab === "published" ? createBtn : undefined}
    />
  );

  const pager = rows.length ? (
    <Pagination page={safePage} pageSize={pageSize} total={rows.length} onPageChange={setPage} onPageSizeChange={setPageSize} noun="فعاليّة" />
  ) : null;

  const confirmSpec = confirm ? CONFIRMED_OPS[confirm.op] : undefined;

  return (
    <>
      <div className="ash-phead">
        <div>
          <Breadcrumb />
          <h1>الفعاليّات</h1>
        </div>
        <Link href="/dashboard/events/new" className="abtn abtn-primary abtn-md"><Plus size={18} />فعاليّة جديدة</Link>
      </div>

      <div className="stat-grid" style={{ marginBottom: 18 }}>
        <Stat icon={<CalendarBlank />} value={events.length} label="إجمالي الفعاليّات" />
        <Stat icon={<CalendarCheck />} value={upcoming} label="قادمة الآن" tone="success" />
        <Stat icon={<UsersThree />} value={totalReserved} label="إجمالي الحجوزات" />
      </div>

      <div style={{ marginBottom: 14 }}>
        <Tabs items={tabItems} value={tab} onValueChange={(v) => setTab(v as EventStatus)} variant="pill" />
      </div>

      <Toolbar
        searchPlaceholder="ابحث باسم الفعاليّة أو مكانها…"
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
          rows={pageRows}
          getRowId={(e) => e.id}
          sort={sort}
          onToggleSort={toggleSort}
          emptyState={emptyState}
          footer={pager ?? undefined}
          rowActions={actionsFor}
          onRowClick={openDetail}
          tone={tab === "cancelled" ? "danger" : tab === "ended" ? "neutral" : undefined}
          rowTone={() => (tab === "published" ? "success" : undefined)}
        />
      ) : rows.length === 0 ? (
        <div className="card-empty">{emptyState}</div>
      ) : (
        <>
          <div className="card-grid card-grid-2col">
            {pageRows.map((e) => (
              <EventCard key={e.id} event={e} actions={cardActionsFor(e)} tone={toneFor(e.status)} onOpen={() => openDetail(e)} />
            ))}
          </div>
          <div className="card-pager">{pager}</div>
        </>
      )}

      <ConfirmDialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        tone={confirmSpec?.tone ?? "warning"}
        icon={confirm ? OP_ICON[confirm.op] : <Prohibit />}
        title={confirmSpec?.title ?? ""}
        text={confirm && confirmSpec ? confirmSpec.text(confirm.event.name) : undefined}
        confirmLabel={confirmSpec?.confirm ?? "تأكيد"}
        loading={pending}
        onConfirm={() => { if (confirm) runOp(confirm.event, confirm.op); }}
      />

      <ConfirmDialog
        open={confirmKill !== null}
        onClose={() => setConfirmKill(null)}
        tone="danger"
        icon={<Trash />}
        title="حذف الفعاليّة؟"
        text={confirmKill ? `سيُحذف «${confirmKill.name}» نهائيًّا. لا استرجاع بعده. (الفعاليّات ذات الحجوزات لا تُحذف — تُلغى.)` : undefined}
        confirmLabel="حذف"
        loading={pending}
        onConfirm={() => {
          if (!confirmKill) return;
          startPending(async () => {
            const r = await deleteEvent(confirmKill.id);
            if (r.ok) { toast.success(r.message); setConfirmKill(null); router.refresh(); } else toast.error(r.message);
          });
        }}
      />
    </>
  );
}
