"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Field, Select, Stat, Textarea, matchesSearch, Modal } from "@adeeb/design-system";
import {
  MicrophoneStage, Playlist, Megaphone, Hash, LinkSimple, TextAlignLeft, User, UsersThree, Palette,
  Archive, Broadcast, Waveform, SlidersHorizontal } from "@phosphor-icons/react";
import { PencilSimple, Plus, Trash, EyeSlash, Star, MagnifyingGlass, UploadSimple } from "@/app/_components/glyphs";
import { DataTable, type Column } from "../_components/DataTable";
import { Toolbar, type FilterDef } from "../_components/Toolbar";
import { Pagination } from "../_components/Pagination";
import { EmptyState } from "../_components/EmptyState";
import { ConfirmDialog } from "../_components/ConfirmDialog";
import { useToast } from "../_components/ToastProvider";
import type { MenuGroup } from "../_components/DropdownMenu";
import { useReactTable, getCoreRowModel, getSortedRowModel, type SortingState, type ColumnDef } from "@tanstack/react-table";
import type { MemberOption, ShowRow, StationData } from "./data";
import { SHOW_STATUS_META, TONE_OPTIONS, formatTalkStart, parseTalkStart, slugify, type ShowTone } from "./vocab";
import {
  createShow, updateShow, setShowStatus, toggleShowFeatured, deleteShow, saveStation,
  createStationLogoUploadUrl, setStationLogo,
} from "./actions";
import { Breadcrumb } from "../_shell/Breadcrumb";

type FormState = {
  title: string; slug: string; tagline: string; description: string;
  tone: ShowTone; hostId: string; committeeId: string;
};
const EMPTY_FORM: FormState = {
  title: "", slug: "", tagline: "", description: "", tone: "brand", hostId: "", committeeId: "",
};

type StationForm = { name: string; tagline: string; description: string; talkStart: string };

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

  // نافذة البيانات: null مغلقة، كائن مفتوحة (edit=null للإنشاء)
  const [form, setForm] = useState<{ edit: ShowRow | null; state: FormState; slugTouched: boolean } | null>(null);
  const [formErr, setFormErr] = useState<Partial<Record<keyof FormState, string>>>({});
  const [confirmKill, setConfirmKill] = useState<ShowRow | null>(null);

  // إعدادات المحطّة، وفيها ثانيةُ بدء الحديث التي ترثها كلّ حلقةٍ لم تُصرّح بغيرها.
  const [stForm, setStForm] = useState<StationForm | null>(null);
  const [stErr, setStErr] = useState<Partial<Record<keyof StationForm, string>>>({});
  const stLogoRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  /**
   * رفعُ شعار المحطّة — نفسُ طريق شعار البرنامج: رابطٌ موقّع يرفع إليه المتصفّح
   * مباشرةً، ثمّ يُثبَّت المسارُ في القاعدة. ولا يمرّ الملفُّ بخادمنا.
   */
  const onStationLogo = async (file: File | undefined) => {
    if (!file) return;
    setUploadingLogo(true);
    try {
      const ticket = await createStationLogoUploadUrl(file.type, file.size);
      if (!ticket.ok || !ticket.url || !ticket.path) { toast.error(ticket.message ?? "تعذّر الرفع."); return; }
      let failed: string | null = null;
      try {
        const res = await fetch(ticket.url, { method: "PUT", body: file, headers: { "content-type": file.type } });
        if (!res.ok) failed = `ردّ المخزن ${res.status}. أعِد المحاولة.`;
      } catch {
        // فشلُ الشبكة يرمي ولا يردّ `ok: false`، وأشهرُ أسبابه أنّ الدلو لا يأذن لأصلنا.
        failed = "تعذّر الوصول إلى المخزن. غالبًا أنّ الدلو لا يأذن لهذا الأصل: شغّل «pnpm r2:cors» بتوكن R2 إداريّ.";
      }
      if (failed) { toast.error(failed, { duration: 12000 }); return; }
      const r = await setStationLogo(ticket.path);
      if (r.ok) { toast.success(r.message); router.refresh(); } else toast.error(r.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const openStation = () => {
    if (!station) { toast.error("تعذّر جلب إعدادات المحطّة."); return; }
    setStForm({
      name: station.name,
      tagline: station.tagline ?? "",
      description: station.description ?? "",
      talkStart: formatTalkStart(station.talkStartsAt),
    });
    setStErr({});
  };
  const submitStation = () => {
    if (!stForm) return;
    const errs: Partial<Record<keyof StationForm, string>> = {};
    if (!stForm.name.trim()) errs.name = "اسم المحطّة مطلوب.";
    const talkStart = parseTalkStart(stForm.talkStart);
    if (talkStart === null || Number.isNaN(talkStart)) errs.talkStart = "ثوانٍ ورقمٌ عشريٌّ اختياريّ، مثل 10.633.";
    setStErr(errs);
    if (Object.keys(errs).length || talkStart === null || Number.isNaN(talkStart)) return;

    startPending(async () => {
      const r = await saveStation({
        name: stForm.name,
        tagline: stForm.tagline || null,
        description: stForm.description || null,
        talkStartsAt: talkStart,
      });
      if (r.ok) { toast.success(r.message); setStForm(null); router.refresh(); } else toast.error(r.message);
    });
  };

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
    setFormErr(errs);
    if (Object.keys(errs).length) return;

    const input = {
      title: s.title, slug: s.slug, tagline: s.tagline || null, description: s.description || null,
      tone: s.tone, hostId: s.hostId, committeeId: s.committeeId ? Number(s.committeeId) : null,
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
      <div className="ash-phead">
        <div>
          <Breadcrumb />
          <h1>إذاعة أدِيب</h1>
        </div>
        <div className="form-head-actions">
          <Button variant="ghost" size="md" onClick={openStation}><SlidersHorizontal size={18} />إعدادات المحطّة</Button>
          <Button variant="primary" size="md" onClick={openCreate}><Plus size={18} />برنامج جديد</Button>
        </div>
      </div>

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
      />

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

      <Modal
        open={stForm !== null}
        onClose={() => setStForm(null)}
        title="إعدادات المحطّة"
        description="تعمّ الإذاعة كلَّها: اسمُها وتعريفُها، وثانيةُ بدء الحديث التي ترثها الحلقات."
        busy={pending}
        size="md"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setStForm(null)} disabled={pending}>إلغاء</Button>
            <Button variant="primary" size="md" onClick={submitStation} loading={pending}>حفظ</Button>
          </>
        }
      >
        {stForm ? (
          <div className="form-grid">
            <div className="form-full">
              <div
                onDragOver={(ev) => ev.preventDefault()}
                onDrop={(ev) => { ev.preventDefault(); void onStationLogo(ev.dataTransfer.files?.[0]); }}
                className="rounded border-2 border-dashed border-line bg-surface-2 p-6 flex flex-col items-center gap-3 text-center"
              >
                {station?.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={station.logoUrl} alt="شعار الإذاعة" className="h-24 w-24 rounded object-cover" />
                ) : (
                  <UploadSimple size={28} className="text-content-muted" />
                )}
                <div className="text-content-muted text-sm">
                  شعار الإذاعة: مربّع ١٤٠٠×١٤٠٠. يظهر في صدر صفحة الإذاعة.
                </div>
                <Button variant="ghost" size="md" onClick={() => stLogoRef.current?.click()} loading={uploadingLogo}>
                  <UploadSimple size={18} />{station?.logoUrl ? "استبدال الشعار" : "اختر الشعار"}
                </Button>
                <input ref={stLogoRef} type="file" accept="image/webp,image/jpeg,image/png" hidden
                  onChange={(ev) => { void onStationLogo(ev.target.files?.[0]); ev.target.value = ""; }} />
              </div>
            </div>
            <Field className="form-full" label="اسم المحطّة" icon={<Broadcast />} innerIcon={<PencilSimple />}
              placeholder="إذاعة أدِيب" value={stForm.name}
              onChange={(e) => setStForm((f) => (f ? { ...f, name: e.target.value } : f))}
              error={stErr.name} required />
            <Field className="form-full" label="بداية الحديث (ثانية)" icon={<Waveform />} innerIcon={<Hash />}
              placeholder="10.633" charset="latin" value={stForm.talkStart}
              onChange={(e) => setStForm((f) => (f ? { ...f, talkStart: e.target.value } : f))}
              error={stErr.talkStart}
              helper="نهايةُ المقدّمة الموسيقيّة. لا تمسّ دقّةَ التبديل (النسختان تايم لاينٌ واحد)، بل تمنع المستمعَ أن يجلس في صمتٍ إن بدأ بالنسخة المجرّدة."
              required />
            <Field className="form-full" label="الجملة التعريفيّة" icon={<TextAlignLeft />} innerIcon={<PencilSimple />}
              placeholder="أصواتُ أدِيب كما تُسمَع" value={stForm.tagline}
              onChange={(e) => setStForm((f) => (f ? { ...f, tagline: e.target.value } : f))} optional />
            <Textarea className="form-full" label="الوصف" icon={<TextAlignLeft />} innerIcon={<PencilSimple />}
              placeholder="وصفٌ يظهر في صدر صفحة الإذاعة…" rows={3} value={stForm.description}
              onChange={(e) => setStForm((f) => (f ? { ...f, description: e.target.value } : f))} optional />
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
