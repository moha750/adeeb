"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Field, Segmented, Select, Stat, Textarea, matchesSearch, Modal } from "@adeeb/design-system";
import {
  MicrophoneStage, Playlist, Megaphone, Hash, LinkSimple, TextAlignLeft, User, UsersThree, Palette,
  Archive, Broadcast, Waveform } from "@phosphor-icons/react";
import { PencilSimple, Plus, Trash, EyeSlash, Star, MagnifyingGlass } from "@/app/_components/glyphs";
import { DataTable, type Column } from "../_components/DataTable";
import { Toolbar, type FilterDef } from "../_components/Toolbar";
import { usePersistentView } from "../_components/usePersistentView";
import { ShowCard } from "./ShowCard";
import { Pagination } from "../_components/Pagination";
import { EmptyState } from "../_components/EmptyState";
import { ConfirmDialog } from "../_components/ConfirmDialog";
import { useToast } from "../_components/ToastProvider";
import type { MenuGroup } from "../_components/DropdownMenu";
import { useReactTable, getCoreRowModel, getSortedRowModel, type SortingState, type ColumnDef } from "@tanstack/react-table";
import type { MemberOption, ShowRow, StationData } from "./data";
import { SHOW_STATUS_META, TONE_OPTIONS, formatTalkStart, parseTalkStart, slugify, type ShowTone } from "./vocab";
import { createShow, updateShow, setShowStatus, toggleShowFeatured, deleteShow } from "./actions";
import { StationForm } from "./StationForm";
import { PageHeader } from "../_components/PageHeader";

type FormState = {
  title: string; slug: string; tagline: string; description: string;
  tone: ShowTone; hostId: string; committeeId: string; talkStart: string;
};
const EMPTY_FORM: FormState = {
  title: "", slug: "", tagline: "", description: "", tone: "brand", hostId: "", committeeId: "", talkStart: "",
};

export function RadioView({
  shows, members, committees, station,
}: { shows: ShowRow[]; members: MemberOption[]; committees: MemberOption[]; station: StationData | null }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startPending] = useTransition();
  const [search, setSearch] = useState("");
  const [fv, setFv] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [view, changeView] = usePersistentView("radio-view");

  // نافذة البيانات: null مغلقة، كائن مفتوحة (edit=null للإنشاء)
  const [form, setForm] = useState<{ edit: ShowRow | null; state: FormState; slugTouched: boolean } | null>(null);
  const [formErr, setFormErr] = useState<Partial<Record<keyof FormState, string>>>({});
  const [confirmKill, setConfirmKill] = useState<ShowRow | null>(null);

  /**
   * **تبويبا الغرفة** (٢٠٢٦-٠٨-١٨): «البرامج» و«هويّة المحطّة».
   *
   * وسببُهما تناظرٌ كان مكسورًا: صفحةُ البرنامج تعرض حلقاتِه في تبويبٍ وهويّتَه في
   * تبويبٍ بجواره، وصفحةُ المحطّة كانت تعرض برامجَها جسدًا وتدفن هويّتَها في `⋯`.
   * فمستويان متناظران يُقرآن اليوم بقاعدةٍ واحدة، والمدفونُ صار مرئيًّا بلا بندٍ
   * جديدٍ في الشريط الجانبيّ. (عُرضت الاحتمالاتُ الثلاثة في `/ui/radio-structure`
   * فاختار المالكُ هذا.)
   */
  const [tab, setTab] = useState<"shows" | "station">("shows");

  const filters: FilterDef[] = useMemo(() => [
    { key: "status", label: "الحالة", options: [
      { value: "published", label: "منشور" }, { value: "draft", label: "مسودّة" }, { value: "archived", label: "مؤرشف" },
    ] },
  ], []);

  const rows = useMemo(() => {
    return shows.filter((s) => {
      if (!matchesSearch(search, s.title, s.slug, s.hostName)) return false;
      if (fv.status && s.status !== fv.status) return false;
      return true;
    });
  }, [shows, search, fv]);

  const [sorting, setSorting] = useState<SortingState>([]);
  const tanColumns = useMemo<ColumnDef<ShowRow>[]>(() => [
    { id: "title", accessorFn: (s) => s.title.toLowerCase() },
    { id: "episodes", accessorFn: (s) => s.episodeCount },
  ], []);
  const table = useReactTable({
    data: rows, columns: tanColumns, state: { sorting }, onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(), getRowId: (s) => s.id,
  });
  const sortedRows = table.getRowModel().rows.map((r) => r.original);
  const sort = sorting[0] ? { id: sorting[0].id, desc: sorting[0].desc } : null;
  const toggleSort = (id: string) => table.getColumn(id)?.toggleSorting();

  useEffect(() => { setPage(1); }, [search, fv, pageSize, sorting]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = sortedRows.slice((safePage - 1) * pageSize, safePage * pageSize);

  const openEditor = (s: ShowRow) => router.push(`/dashboard/radio/${s.id}`);

  const openCreate = () => { setForm({ edit: null, state: EMPTY_FORM, slugTouched: false }); setFormErr({}); };
  const openEditMeta = (s: ShowRow) => {
    setForm({
      edit: s, slugTouched: true,
      state: {
        title: s.title, slug: s.slug, tagline: s.tagline ?? "", description: s.description ?? "",
        tone: s.tone, hostId: s.hostId, committeeId: s.committeeId ? String(s.committeeId) : "",
        talkStart: formatTalkStart(s.talkStartsAt),
      },
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

  const submit = () => {
    if (!form) return;
    const s = form.state;
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!s.title.trim()) errs.title = "اسم البرنامج مطلوب.";
    if (!slugify(s.slug)) errs.slug = "المعرّف مطلوب: أحرف لاتينيّة وأرقام.";
    if (!s.hostId) errs.hostId = "اختر مقدّم البرنامج.";
    const talkStart = parseTalkStart(s.talkStart);
    if (talkStart === null || Number.isNaN(talkStart)) {
      errs.talkStart = "مطلوبة: ثوانٍ مثل 10.633 أو توقيتُ المحرّر مثل 0:00:10:19.";
    }
    setFormErr(errs);
    if (Object.keys(errs).length || talkStart === null || Number.isNaN(talkStart)) return;

    const input = {
      title: s.title, slug: s.slug, tagline: s.tagline || null, description: s.description || null,
      tone: s.tone, hostId: s.hostId, committeeId: s.committeeId ? Number(s.committeeId) : null,
      talkStartsAt: talkStart,
    };
    startPending(async () => {
      const r = form.edit ? await updateShow(form.edit.id, input) : await createShow(input);
      if (r.ok) {
        toast.success(r.message);
        setForm(null);
        router.refresh();
        if (!form.edit && r.id) router.push(`/dashboard/radio/${r.id}`); // بعد الإنشاء: افتح المحرّر مباشرةً
      } else toast.error(r.message);
    });
  };

  const runStatus = (s: ShowRow, op: "publish" | "unpublish" | "archive") => startPending(async () => {
    const r = await setShowStatus(s.id, op);
    if (r.ok) { toast.success(r.message); router.refresh(); } else toast.error(r.message);
  });
  const runFeature = (s: ShowRow, value: boolean) => startPending(async () => {
    const r = await toggleShowFeatured(s.id, value);
    if (r.ok) { toast.success(r.message); router.refresh(); } else toast.error(r.message);
  });

  const actionsFor = (s: ShowRow): MenuGroup[] => [
    { header: "إجراءات", items: [
      { label: "الحلقات والشعار", icon: <Playlist />, onSelect: () => openEditor(s) },
      { label: "تعديل البيانات", icon: <PencilSimple />, onSelect: () => openEditMeta(s) },
    ] },
    { header: "الحالة", items: [
      s.status === "published"
        ? { label: "إلغاء النشر", icon: <EyeSlash />, onSelect: () => runStatus(s, "unpublish") }
        : { label: "نشر", icon: <Megaphone />, onSelect: () => runStatus(s, "publish") },
      { label: s.isFeatured ? "إلغاء التمييز" : "تمييز في الواجهة", icon: <Star />, onSelect: () => runFeature(s, !s.isFeatured) },
      ...(s.status === "archived" ? [] : [{ label: "أرشفة", icon: <Archive />, onSelect: () => runStatus(s, "archive") }]),
    ] },
    { header: "منطقة الخطر", danger: true, items: [
      { label: "حذف", icon: <Trash />, danger: true, onSelect: () => setConfirmKill(s) },
    ] },
  ];

  const columns: Column<ShowRow>[] = useMemo(() => [
    {
      key: "title", header: "البرنامج", width: "minmax(220px, 2.4fr)", sortable: true,
      render: (s) => (
        <span className="txt" title={s.tagline ?? undefined}>
          <b>{s.title}</b>
          {s.isFeatured ? <Star size={14} className="text-warning" style={{ marginInlineStart: 6, verticalAlign: "-2px" }} aria-label="مميّز" /> : null}
          <span className="text-content-muted" dir="ltr" style={{ marginInlineStart: 8 }}>/{s.slug}</span>
        </span>
      ),
    },
    { key: "host", header: "المقدّم", width: "1.4fr", render: (s) => <span className="txt">{s.hostName}</span> },
    {
      key: "episodes", header: "الحلقات", width: "0.9fr", align: "center", sortable: true,
      render: (s) => (
        <span className="txt num">
          {s.episodeCount}
          {s.publishedCount !== s.episodeCount ? <span className="text-content-muted"> ({s.publishedCount} منشورة)</span> : null}
        </span>
      ),
    },
    {
      key: "logo", header: "الشعار", width: "0.9fr", align: "center",
      render: (s) => (s.logoUrl
        ? <Badge tone="success" variant="outline">جاهز</Badge>
        : <Badge tone="warning" variant="outline">ناقص</Badge>),
    },
    { key: "status", header: "الحالة", width: "0.9fr", render: (s) => <Badge tone={SHOW_STATUS_META[s.status].tone} dot>{SHOW_STATUS_META[s.status].label}</Badge> },
  ], []);

  const clearFilters = () => { setSearch(""); setFv({}); };
  const filtering = !!search.trim() || !!fv.status;
  const published = shows.filter((s) => s.status === "published").length;
  const episodes = shows.reduce((n, s) => n + s.episodeCount, 0);

  const createBtn = <Button variant="primary" size="md" onClick={openCreate}><Plus size={18} />برنامج جديد</Button>;
  const emptyState = shows.length === 0 ? (
    <EmptyState variant="aurora" icon={<MicrophoneStage />} title="لا برامج بعد"
      description="أنشئ أوّل برنامج: يُحفظ مسودّةً، ثمّ تفتحه لترفع شعاره وتضيف حلقاته." action={createBtn} />
  ) : filtering ? (
    <EmptyState variant="soft" icon={<MagnifyingGlass />} title="لا برامج مطابقة"
      description="لم نعثر على برامج تطابق بحثك أو المرشّح."
      action={<Button variant="ghost" size="md" onClick={clearFilters}>مسح المرشّحات</Button>} />
  ) : null;

  const pager = rows.length ? (
    <Pagination page={safePage} pageSize={pageSize} total={rows.length} onPageChange={setPage} onPageSizeChange={setPageSize} noun="برنامج" />
  ) : null;

  const memberOptions = useMemo(() => members.map((m) => ({ value: m.value, label: m.label })), [members]);
  const committeeOptions = useMemo(
    () => [{ value: "", label: "بلا لجنة" }, ...committees.map((c) => ({ value: c.value, label: c.label }))],
    [committees],
  );

  return (
    <>
      <PageHeader
        title="إذاعة أدِيب"
        // «برنامج جديد» غايةُ تبويب البرامج وحدَه؛ وحفظُ المحطّة فعلُ تبويبها لا فعلُ الرأس.
        action={tab === "shows" ? { label: "برنامج جديد", icon: <Plus size={18} />, onClick: openCreate } : undefined}
      />

      <Segmented
        items={[
          { value: "shows", label: `البرامج (${shows.length})` },
          { value: "station", label: "هويّة الإذاعة" },
        ]}
        value={tab}
        onValueChange={(v) => setTab(v as typeof tab)}
        aria-label="أقسام الإذاعة"
        className="seg-block mb-4"
      />

      {tab === "shows" ? (
        <>
        <div className="stat-grid" style={{ marginBottom: 18 }}>
          <Stat icon={<MicrophoneStage />} value={shows.length} label="إجمالي البرامج" />
          <Stat icon={<Broadcast />} value={published} label="برامج منشورة" tone="success" />
          <Stat icon={<Playlist />} value={episodes} label="إجمالي الحلقات" />
        </div>

        <Toolbar
          searchPlaceholder="ابحث باسم البرنامج أو معرّفه أو مقدّمه…"
          search={search} onSearch={setSearch}
          filters={filters} filterValues={fv}
          onFilter={(k, v) => setFv((p) => ({ ...p, [k]: v }))} onReset={() => setFv({})}
          view={view} onViewChange={changeView}
        />

        {view === "table" ? (
          <DataTable
            columns={columns}
            rows={pageRows}
            getRowId={(s) => s.id}
            sort={sort}
            onToggleSort={toggleSort}
            emptyState={emptyState}
            footer={pager ?? undefined}
            rowActions={actionsFor}
            onRowClick={openEditor}
          />
        ) : rows.length === 0 ? (
          <div className="card-empty">{emptyState}</div>
        ) : (
          <>
            <div className="card-grid">
              {pageRows.map((s) => (
                <ShowCard key={s.id} show={s} actions={actionsFor(s)} onOpen={() => openEditor(s)} />
              ))}
            </div>
            <div className="card-pager">{pager}</div>
          </>
        )}
        </>
      ) : (
        <StationForm station={station} />
      )}

      <Modal
        open={form !== null}
        onClose={() => setForm(null)}
        title={form?.edit ? "تعديل بيانات البرنامج" : "برنامج جديد"}
        description={form?.edit ? undefined : "يُحفظ مسودّةً، ثمّ يُفتح المحرّر لرفع الشعار وإضافة الحلقات."}
        busy={pending}
        size="md"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setForm(null)} disabled={pending}>إلغاء</Button>
            <Button variant="primary" size="md" onClick={submit} loading={pending}>{form?.edit ? "حفظ التغييرات" : "إنشاء البرنامج"}</Button>
          </>
        }
      >
        {form ? (
          <div className="form-grid">
            <Field className="form-full" label="اسم البرنامج" icon={<MicrophoneStage />} innerIcon={<PencilSimple />} placeholder="على هامش الكلمة"
              value={form.state.title} onChange={(e) => onTitle(e.target.value)} error={formErr.title} required />
            <Field className="form-full" label="المعرّف (رابط البرنامج)" icon={<LinkSimple />} innerIcon={<Hash />} placeholder="hamesh" charset="latin"
              value={form.state.slug} onChange={(e) => onSlug(e.target.value)} error={formErr.slug}
              helper="يظهر في رابط البرنامج العامّ، ولا يُغيَّر بعد النشر." required />
            <Select className="form-full" label="المقدّم" icon={<User />} options={memberOptions} value={form.state.hostId}
              onValueChange={(v) => patchForm({ hostId: v })} error={formErr.hostId}
              helper="عضوٌ نشطٌ واحد، يُختم مقدّمًا لكلّ حلقةٍ جديدة." required />
            <Select label="النغمة" icon={<Palette />} options={TONE_OPTIONS} value={form.state.tone}
              onValueChange={(v) => patchForm({ tone: v as ShowTone })} required />
            <Select label="اللجنة المنتجة" icon={<UsersThree />} options={committeeOptions} value={form.state.committeeId}
              onValueChange={(v) => patchForm({ committeeId: v })} optional />
            {/**
              * بدايةُ الحديث: **إلزاميّةٌ عند إنشاء البرنامج** لا موروثةٌ من المحطّة.
              * ويقبل الحقلُ توقيتَ المحرّر كما يُقرأ منه، فلا يُطالَب صاحبُه بحسابٍ ذهنيّ.
              */}
            <Field className="form-full" label="بداية الحديث" icon={<Waveform />} innerIcon={<Hash />}
              placeholder="10:19" charset="latin"
              value={form.state.talkStart} onChange={(e) => patchForm({ talkStart: e.target.value })}
              error={formErr.talkStart}
              helper={(() => {
                const v = parseTalkStart(form.state.talkStart);
                const read = v !== null && !Number.isNaN(v) ? ` تُقرأ ${formatTalkStart(v)}ث.` : "";
                return `نهايةُ المقدّمة الموسيقيّة. اكتبها ثانيةً:إطارًا كما تقرؤها من المحرّر (10:19)، أو توقيتًا كاملًا (0:00:10:19)، أو ثوانيَ (10.633).${read}`;
              })()}
              required />

            <Field className="form-full" label="الجملة التعريفيّة" icon={<TextAlignLeft />} innerIcon={<PencilSimple />}
              placeholder="حوارٌ أسبوعيّ عن الكتابة وأهلها"
              value={form.state.tagline} onChange={(e) => patchForm({ tagline: e.target.value })} optional />
            <Textarea className="form-full" label="الوصف" icon={<TextAlignLeft />} innerIcon={<PencilSimple />}
              placeholder="وصفٌ يظهر في صفحة البرنامج…" rows={3}
              value={form.state.description} onChange={(e) => patchForm({ description: e.target.value })}
              helper="مطلوبٌ قبل النشر: لا تُنشَر صفحةُ برنامجٍ بلا وصف." optional />
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={confirmKill !== null}
        onClose={() => setConfirmKill(null)}
        tone="danger"
        icon={<Trash />}
        title="حذف البرنامج؟"
        text={confirmKill ? `سيُحذف «${confirmKill.title}» وكلّ حلقاته وملفّاته نهائيًّا. لا استرجاع بعده.` : undefined}
        confirmLabel="حذف"
        loading={pending}
        onConfirm={() => {
          if (!confirmKill) return;
          startPending(async () => {
            const r = await deleteShow(confirmKill.id);
            if (r.ok) { toast.success(r.message); setConfirmKill(null); router.refresh(); } else toast.error(r.message);
          });
        }}
      />
    </>
  );
}
