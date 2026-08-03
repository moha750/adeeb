"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Field, Select, Stat, Textarea, matchesSearch } from "@adeeb/design-system";
import {
  BookOpen, Books, PencilSimple, Plus, Trash, Megaphone, EyeSlash, Star,
  MagnifyingGlass, Hash, LinkSimple, TextAlignLeft, CalendarBlank,
} from "@phosphor-icons/react";
import { DataTable, type Column } from "../_components/DataTable";
import { Toolbar, type FilterDef } from "../_components/Toolbar";
import { Pagination } from "../_components/Pagination";
import { EmptyState } from "../_components/EmptyState";
import { Modal } from "../_components/Modal";
import { ConfirmDialog } from "../_components/ConfirmDialog";
import { useToast } from "../_components/ToastProvider";
import type { MenuGroup } from "../_components/DropdownMenu";
import { useReactTable, getCoreRowModel, getSortedRowModel, type SortingState, type ColumnDef } from "@tanstack/react-table";
import type { BookRow } from "./data";
import { KIND_META, KIND_OPTIONS, STATUS_META, slugify, type BookKind } from "./vocab";
import { createBook, updateBook, setBookStatus, toggleBookFeatured, deleteBook } from "./actions";
import { Breadcrumb } from "../_shell/Breadcrumb";

type FormState = { title: string; slug: string; kind: BookKind; summary: string; yearHijri: string; yearGregorian: string };
const EMPTY_FORM: FormState = { title: "", slug: "", kind: "annual_report", summary: "", yearHijri: "", yearGregorian: "" };

export function LibraryView({ books }: { books: BookRow[] }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startPending] = useTransition();
  const [search, setSearch] = useState("");
  const [fv, setFv] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // نافذة البيانات: null مغلقة، كائن مفتوحة (edit=null للإنشاء)
  const [form, setForm] = useState<{ edit: BookRow | null; state: FormState; slugTouched: boolean } | null>(null);
  const [formErr, setFormErr] = useState<Partial<Record<keyof FormState, string>>>({});
  const [confirmKill, setConfirmKill] = useState<BookRow | null>(null);

  const filters: FilterDef[] = useMemo(() => [
    { key: "kind", label: "النوع", options: KIND_OPTIONS },
    { key: "status", label: "الحالة", options: [{ value: "published", label: "منشور" }, { value: "draft", label: "مسودّة" }] },
  ], []);

  const rows = useMemo(() => {
    return books.filter((b) => {
      if (!matchesSearch(search, b.title, b.slug, b.summary)) return false;
      if (fv.kind && b.kind !== fv.kind) return false;
      if (fv.status && b.status !== fv.status) return false;
      return true;
    });
  }, [books, search, fv]);

  // فرز عبر TanStack — نموذج أعمدة مُنمّط
  const [sorting, setSorting] = useState<SortingState>([]);
  const tanColumns = useMemo<ColumnDef<BookRow>[]>(() => [
    { id: "title", accessorFn: (b) => b.title.toLowerCase() },
    { id: "pages", accessorFn: (b) => b.pageCount },
    { id: "views", accessorFn: (b) => b.views },
  ], []);
  const table = useReactTable({
    data: rows, columns: tanColumns, state: { sorting }, onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(), getRowId: (b) => b.id,
  });
  const sortedRows = table.getRowModel().rows.map((r) => r.original);
  const sort = sorting[0] ? { id: sorting[0].id, desc: sorting[0].desc } : null;
  const toggleSort = (id: string) => table.getColumn(id)?.toggleSorting();

  useEffect(() => { setPage(1); }, [search, fv, pageSize, sorting]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = sortedRows.slice((safePage - 1) * pageSize, safePage * pageSize);

  const openEditor = (b: BookRow) => router.push(`/dashboard/library/${b.id}`);

  const openCreate = () => { setForm({ edit: null, state: EMPTY_FORM, slugTouched: false }); setFormErr({}); };
  const openEditMeta = (b: BookRow) => {
    setForm({
      edit: b, slugTouched: true,
      state: { title: b.title, slug: b.slug, kind: b.kind, summary: b.summary ?? "", yearHijri: b.yearHijri ? String(b.yearHijri) : "", yearGregorian: b.yearGregorian ? String(b.yearGregorian) : "" },
    });
    setFormErr({});
  };

  const patchForm = (patch: Partial<FormState>) => setForm((f) => (f ? { ...f, state: { ...f.state, ...patch } } : f));

  const onTitle = (v: string) => setForm((f) => {
    if (!f) return f;
    const next = { ...f.state, title: v };
    if (!f.slugTouched) next.slug = slugify(v); // اقتراح السلاگ ما لم يُحرَّر يدويًّا
    return { ...f, state: next };
  });
  const onSlug = (v: string) => setForm((f) => (f ? { ...f, slugTouched: true, state: { ...f.state, slug: v } } : f));
  const onGreg = (v: string) => setForm((f) => {
    if (!f) return f;
    const next = { ...f.state, yearGregorian: v };
    if (!f.slugTouched && !next.slug && /^\d{3,4}$/.test(v)) next.slug = v; // سلاگ افتراضيّ من سنة الميلاد
    return { ...f, state: next };
  });

  const submit = () => {
    if (!form) return;
    const s = form.state;
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!s.title.trim()) errs.title = "العنوان مطلوب.";
    if (!slugify(s.slug)) errs.slug = "المعرّف مطلوب — أحرف لاتينيّة وأرقام.";
    setFormErr(errs);
    if (Object.keys(errs).length) return;

    const input = {
      title: s.title, slug: s.slug, kind: s.kind,
      summary: s.summary || null,
      yearHijri: s.yearHijri ? Number(s.yearHijri) : null,
      yearGregorian: s.yearGregorian ? Number(s.yearGregorian) : null,
    };
    startPending(async () => {
      const r = form.edit ? await updateBook(form.edit.id, input) : await createBook(input);
      if (r.ok) {
        toast.success(r.message);
        setForm(null);
        router.refresh();
        if (!form.edit && r.id) router.push(`/dashboard/library/${r.id}`); // بعد الإنشاء: افتح المحرّر مباشرةً
      } else toast.error(r.message);
    });
  };

  const runStatus = (b: BookRow, op: "publish" | "unpublish") => startPending(async () => {
    const r = await setBookStatus(b.id, op);
    if (r.ok) { toast.success(r.message); router.refresh(); } else toast.error(r.message);
  });
  const runFeature = (b: BookRow, value: boolean) => startPending(async () => {
    const r = await toggleBookFeatured(b.id, value);
    if (r.ok) { toast.success(r.message); router.refresh(); } else toast.error(r.message);
  });

  const actionsFor = (b: BookRow): MenuGroup[] => [
    { header: "إجراءات", items: [
      { label: "تحرير الصفحات", icon: <BookOpen />, onSelect: () => openEditor(b) },
      { label: "تعديل البيانات", icon: <PencilSimple />, onSelect: () => openEditMeta(b) },
    ] },
    { header: "الحالة", items: [
      b.status === "draft"
        ? { label: "نشر", icon: <Megaphone />, onSelect: () => runStatus(b, "publish") }
        : { label: "إلغاء النشر", icon: <EyeSlash />, onSelect: () => runStatus(b, "unpublish") },
      { label: b.isFeatured ? "إلغاء التمييز" : "تمييز على الرفّ", icon: <Star />, onSelect: () => runFeature(b, !b.isFeatured) },
    ] },
    { header: "منطقة الخطر", danger: true, items: [
      { label: "حذف", icon: <Trash />, danger: true, onSelect: () => setConfirmKill(b) },
    ] },
  ];

  const columns: Column<BookRow>[] = useMemo(() => [
    {
      key: "title", header: "المنشور", width: "minmax(220px, 2.4fr)", sortable: true,
      render: (b) => (
        <span className="txt" title={b.summary ?? undefined}>
          <b>{b.title}</b>
          {b.isFeatured ? <Star weight="fill" size={14} className="text-warning" style={{ marginInlineStart: 6, verticalAlign: "-2px" }} aria-label="مميّز" /> : null}
          <span className="text-content-muted" dir="ltr" style={{ marginInlineStart: 8 }}>/{b.slug}</span>
        </span>
      ),
    },
    { key: "kind", header: "النوع", width: "1fr", render: (b) => <Badge tone="neutral" variant="outline">{KIND_META[b.kind].label}</Badge> },
    { key: "year", header: "السنة", width: "1fr", render: (b) => <span className="txt num">{b.yearLabel || <span className="text-content-muted">—</span>}</span> },
    { key: "pages", header: "الصفحات", width: "0.8fr", align: "center", sortable: true, render: (b) => <span className="txt num">{b.pageCount}</span> },
    { key: "status", header: "الحالة", width: "0.9fr", render: (b) => <Badge tone={STATUS_META[b.status].tone} dot>{STATUS_META[b.status].label}</Badge> },
    { key: "views", header: "المشاهدات", width: "0.8fr", align: "center", sortable: true, render: (b) => <span className="txt num">{b.views}</span> },
  ], []);

  const clearFilters = () => { setSearch(""); setFv({}); };
  const filtering = !!search.trim() || !!fv.kind || !!fv.status;
  const published = books.filter((b) => b.status === "published").length;
  const totalPagesCount = books.reduce((s, b) => s + b.pageCount, 0);

  const createBtn = <Button variant="primary" size="md" onClick={openCreate}><Plus size={18} />منشور جديد</Button>;
  const emptyState = books.length === 0 ? (
    <EmptyState variant="aurora" icon={<Books weight="duotone" />} title="لا منشورات بعد"
      description="أنشئ أوّل منشور — يُحفظ مسودّةً، ثمّ تفتحه لتضع صفحاته." action={createBtn} />
  ) : filtering ? (
    <EmptyState variant="soft" icon={<MagnifyingGlass weight="duotone" />} title="لا منشورات مطابقة"
      description="لم نعثر على منشورات تطابق بحثك أو المرشّح."
      action={<Button variant="ghost" size="md" onClick={clearFilters}>مسح المرشّحات</Button>} />
  ) : null;

  const pager = rows.length ? (
    <Pagination page={safePage} pageSize={pageSize} total={rows.length} onPageChange={setPage} onPageSizeChange={setPageSize} noun="منشور" />
  ) : null;

  return (
    <>
      <div className="ash-phead">
        <div>
          <Breadcrumb />
          <h1>مكتبة «إرثٌ يُروى»</h1>
        </div>
        <Button variant="primary" size="md" onClick={openCreate}><Plus size={18} />منشور جديد</Button>
      </div>

      <div className="stat-grid" style={{ marginBottom: 18 }}>
        <Stat icon={<Books weight="fill" />} value={books.length} label="إجمالي المنشورات" />
        <Stat icon={<Megaphone weight="fill" />} value={published} label="منشورة" tone="success" />
        <Stat icon={<BookOpen weight="fill" />} value={totalPagesCount} label="إجمالي الصفحات" />
      </div>

      <Toolbar
        searchPlaceholder="ابحث بعنوان المنشور أو معرّفه…"
        search={search} onSearch={setSearch}
        filters={filters} filterValues={fv}
        onFilter={(k, v) => setFv((p) => ({ ...p, [k]: v }))} onReset={() => setFv({})}
      />

      <DataTable
        columns={columns}
        rows={pageRows}
        getRowId={(b) => b.id}
        sort={sort}
        onToggleSort={toggleSort}
        emptyState={emptyState}
        footer={pager ?? undefined}
        rowActions={actionsFor}
        onRowClick={openEditor}
      />

      <Modal
        open={form !== null}
        onClose={() => setForm(null)}
        title={form?.edit ? "تعديل بيانات المنشور" : "منشور جديد"}
        description={form?.edit ? undefined : "تُحفظ البيانات مسودّةً، ثمّ يُفتح المحرّر لإضافة الصفحات."}
        busy={pending}
        size="md"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setForm(null)} disabled={pending}>إلغاء</Button>
            <Button variant="primary" size="md" onClick={submit} loading={pending}>{form?.edit ? "حفظ التغييرات" : "إنشاء المنشور"}</Button>
          </>
        }
      >
        {form ? (
          <div className="form-grid">
            <Field className="form-full" label="عنوان المنشور" icon={<BookOpen />} innerIcon={<PencilSimple />} placeholder="عامٌ بألف ذكرى"
              value={form.state.title} onChange={(e) => onTitle(e.target.value)} error={formErr.title} required />
            <Field className="form-full" label="المعرّف (رابط المكتبة)" icon={<LinkSimple />} innerIcon={<Hash />} placeholder="2026" charset="latin"
              value={form.state.slug} onChange={(e) => onSlug(e.target.value)} error={formErr.slug} helper="يظهر في رابط المكتبة العامّ." required />
            <Select className="form-full" label="النوع" icon={<Books />} options={KIND_OPTIONS} value={form.state.kind} onValueChange={(v) => patchForm({ kind: v as BookKind })} required />
            <Field label="السنة الميلاديّة" icon={<CalendarBlank />} innerIcon={<Hash />} placeholder="2026" charset="digits"
              value={form.state.yearGregorian} onChange={(e) => onGreg(e.target.value)} optional />
            <Field label="السنة الهجريّة" icon={<CalendarBlank />} innerIcon={<Hash />} placeholder="1447" charset="digits"
              value={form.state.yearHijri} onChange={(e) => patchForm({ yearHijri: e.target.value })} optional />
            <Textarea className="form-full" label="ملخّص" icon={<TextAlignLeft />} innerIcon={<PencilSimple />} placeholder="نبذةٌ تُعرض تحت الغلاف في الرفّ…"
              rows={3} value={form.state.summary} onChange={(e) => patchForm({ summary: e.target.value })} optional />
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={confirmKill !== null}
        onClose={() => setConfirmKill(null)}
        tone="danger"
        icon={<Trash weight="bold" />}
        title="حذف المنشور؟"
        text={confirmKill ? `سيُحذف «${confirmKill.title}» وكلّ صفحاته نهائيًّا. لا استرجاع بعده.` : undefined}
        confirmLabel="حذف"
        loading={pending}
        onConfirm={() => {
          if (!confirmKill) return;
          startPending(async () => {
            const r = await deleteBook(confirmKill.id);
            if (r.ok) { toast.success(r.message); setConfirmKill(null); router.refresh(); } else toast.error(r.message);
          });
        }}
      />
    </>
  );
}
