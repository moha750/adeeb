"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Field, Select, Stat, Modal } from "@adeeb/design-system";
import {
  Newspaper, Megaphone, UsersThree, Archive, ChatCircleDots, Heart, Images, ClipboardText, PaperPlaneTilt } from "@phosphor-icons/react";
import {
  Plus, PencilSimple, Trash, EyeSlash, Star, MagnifyingGlass, ArrowUUpLeft, Eye, WarningCircle,
} from "@/app/_components/glyphs";
import { DataTable, type Column } from "../_components/DataTable";
import { Toolbar, type FilterDef } from "../_components/Toolbar";
import { Pagination } from "../_components/Pagination";
import { EmptyState } from "../_components/EmptyState";
import { Tabs } from "../_components/Tabs";
import { ConfirmDialog } from "../_components/ConfirmDialog";
import { Avatar } from "../_components/Avatar";
import { useToast } from "../_components/ToastProvider";
import type { MenuGroup } from "../_components/DropdownMenu";
import type { NewsRow, Option } from "./data";
import {
  CATEGORY_META, CATEGORY_OPTIONS, IN_FLIGHT, WORKFLOW_META,
  missingForPublish, type Category, type Workflow,
} from "./vocab";
import { createNews, deleteNews, setNewsStatus, toggleFeatured } from "./actions";
import { Breadcrumb } from "../_shell/Breadcrumb";

/** مراحل اللوحة — تبويبٌ لكلّ محطّة في الطريق، لا قائمةٌ واحدة يضيع فيها ما يحتاجك الآن. */
const STAGES: { value: string; label: string; match: (n: NewsRow) => boolean }[] = [
  { value: "all", label: "الكلّ", match: () => true },
  { value: "flight", label: "قيد العمل", match: (n) => (IN_FLIGHT as string[]).includes(n.workflow) },
  { value: "review", label: "تنتظر المراجعة", match: (n) => n.workflow === "ready_for_review" },
  { value: "published", label: "منشور", match: (n) => n.workflow === "published" },
  { value: "archived", label: "مؤرشف", match: (n) => n.workflow === "archived" },
];

export function NewsView({
  rows, committees, isChief,
}: { rows: NewsRow[]; committees: Option[]; isChief: boolean }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startPending] = useTransition();

  const [stage, setStage] = useState("all");
  const [search, setSearch] = useState("");
  const [fv, setFv] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const [form, setForm] = useState<{ title: string; category: Category; committeeId: string } | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [confirmKill, setConfirmKill] = useState<NewsRow | null>(null);

  const filters: FilterDef[] = useMemo(() => {
    const base: FilterDef[] = [{ key: "category", label: "القسم", options: CATEGORY_OPTIONS }];
    if (isChief && committees.length) {
      base.push({ key: "committee", label: "اللجنة", options: committees });
    }
    return base;
  }, [isChief, committees]);

  const staged = useMemo(() => {
    const s = STAGES.find((x) => x.value === stage) ?? STAGES[0];
    return rows.filter(s.match);
  }, [rows, stage]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staged.filter((n) => {
      if (q) {
        const hay = [n.title, n.summary ?? "", n.authors.join(" "), n.tags.join(" ")].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (fv.category && n.category !== fv.category) return false;
      if (fv.committee && String(n.committeeId ?? "") !== fv.committee) return false;
      return true;
    });
  }, [staged, search, fv]);

  useEffect(() => { setPage(1); }, [search, fv, pageSize, stage]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const open = (n: NewsRow) => router.push(`/dashboard/news/${n.id}`);

  const run = (fn: () => Promise<{ ok: boolean; message: string }>) => startPending(async () => {
    const r = await fn();
    if (r.ok) { toast.success(r.message); router.refresh(); } else toast.error(r.message);
  });

  const submitCreate = () => {
    if (!form) return;
    if (!form.title.trim()) { setFormErr("عنوان الخبر مطلوب."); return; }
    setFormErr(null);
    startPending(async () => {
      const r = await createNews({
        title: form.title,
        category: form.category,
        committeeId: form.committeeId ? Number(form.committeeId) : null,
      });
      if (r.ok) {
        toast.success(r.message);
        setForm(null);
        router.refresh();
        if (r.id) router.push(`/dashboard/news/${r.id}`);
      } else toast.error(r.message);
    });
  };

  const actionsFor = (n: NewsRow): MenuGroup[] => {
    const groups: MenuGroup[] = [
      { header: "إجراءات", items: [{ label: "فتح المحرّر", icon: <PencilSimple />, onSelect: () => open(n) }] },
    ];
    if (!isChief) return groups;

    const gaps = missingForPublish({
      summary: n.summary, imageUrl: n.imageUrl, authors: n.authors, content: n.content,
    });
    groups.push({
      header: "الحالة",
      items: [
        n.workflow === "published"
          ? { label: "إلغاء النشر", icon: <EyeSlash />, onSelect: () => run(() => setNewsStatus(n.id, "unpublish")) }
          : {
              label: gaps.length ? `ينقصه: ${gaps.join("، ")}` : "نشر",
              icon: gaps.length ? <WarningCircle /> : <Megaphone />,
              onSelect: () => gaps.length
                ? toast.error(`لا يُنشَر خبرٌ ناقص — ينقصه ${gaps.join("، ")}.`)
                : run(() => setNewsStatus(n.id, "publish")),
            },
        { label: n.isFeatured ? "إلغاء التمييز" : "تمييز في الواجهة", icon: <Star />, onSelect: () => run(() => toggleFeatured(n.id, !n.isFeatured)) },
        n.workflow === "archived"
          ? { label: "إعادة من الأرشيف", icon: <ArrowUUpLeft />, onSelect: () => run(() => setNewsStatus(n.id, "restore")) }
          : { label: "أرشفة", icon: <Archive />, onSelect: () => run(() => setNewsStatus(n.id, "archive")) },
      ],
    });
    groups.push({
      header: "منطقة الخطر", danger: true,
      items: [{ label: "حذف", icon: <Trash />, danger: true, onSelect: () => setConfirmKill(n) }],
    });
    return groups;
  };

  const columns: Column<NewsRow>[] = useMemo(() => [
    {
      key: "title", header: "الخبر", width: "minmax(260px, 2.6fr)",
      render: (n) => (
        <span className="txt" title={n.summary ?? undefined}>
          <b>{n.title}</b>
          {n.isFeatured ? (
            <Star size={14} className="text-warning" style={{ marginInlineStart: 6, verticalAlign: "-2px" }} aria-label="مميّز" />
          ) : null}
          <span className="text-content-muted" style={{ marginInlineStart: 8 }}>
            {CATEGORY_META[n.category].label}
            {n.committeeName ? ` · ${n.committeeName}` : ""}
          </span>
          {n.rejectionReason && n.workflow === "in_progress" ? (
            <span className="text-danger" style={{ display: "block", fontSize: ".82em", marginTop: 2 }}>
              أُعيد: {n.rejectionReason}
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: "writers", header: "الطاقم", width: "1.3fr",
      render: (n) => (n.writers.length ? (
        <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
          {n.writers.slice(0, 4).map((w) => (
            <Avatar key={w.id} name={w.name} src={w.avatarUrl ?? undefined} gender={w.gender} size="xs" />
          ))}
          {n.writers.length > 4 ? <span className="text-content-muted num">+{n.writers.length - 4}</span> : null}
        </span>
      ) : <span className="text-content-muted">بلا تكليف</span>),
    },
    {
      key: "stage", header: "المرحلة", width: "1fr",
      render: (n) => (
        // `Badge` لا يمرّر `title` — فالتلميح على الغلاف لا على الشارة نفسها.
        <span title={WORKFLOW_META[n.workflow].hint}>
          <Badge tone={WORKFLOW_META[n.workflow].tone} dot>
            {WORKFLOW_META[n.workflow].label}
          </Badge>
        </span>
      ),
    },
    {
      key: "reach", header: "الأثر", width: "1.1fr", align: "center",
      render: (n) => (n.workflow === "published" ? (
        <span className="txt num" style={{ display: "inline-flex", gap: 10, alignItems: "center" }}>
          <span title="مشاهدات"><Eye size={14} style={{ verticalAlign: "-2px" }} /> {n.views}</span>
          <span title="إعجابات"><Heart size={14} style={{ verticalAlign: "-2px" }} /> {n.likes}</span>
          <span title={n.pendingComments ? `${n.pendingComments} بانتظار الإقرار` : "تعليقات"}>
            <ChatCircleDots size={14} style={{ verticalAlign: "-2px" }} /> {n.comments}
            {n.pendingComments ? <b className="text-warning"> ({n.pendingComments})</b> : null}
          </span>
        </span>
      ) : (
        <span className="text-content-muted num" title="عدد كلمات المتن">
          {n.wordCount ? `${n.wordCount} كلمة` : "—"}
        </span>
      )),
    },
    {
      key: "media", header: "الوسائط", width: "0.8fr", align: "center",
      render: (n) => (
        <span className="txt num" style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
          {n.imageUrl
            ? <Badge tone="success" variant="outline">غلاف</Badge>
            : <Badge tone="warning" variant="outline">بلا غلاف</Badge>}
          {n.galleryCount ? <span className="text-content-muted"><Images size={14} style={{ verticalAlign: "-2px" }} /> {n.galleryCount}</span> : null}
        </span>
      ),
    },
  ], []);

  const clearFilters = () => { setSearch(""); setFv({}); };
  const filtering = !!search.trim() || Object.values(fv).some(Boolean);

  const createBtn = isChief ? (
    <Button variant="primary" size="md" onClick={() => { setForm({ title: "", category: "coverage", committeeId: "" }); setFormErr(null); }}>
      <Plus size={18} />خبر جديد
    </Button>
  ) : null;

  const emptyState = rows.length === 0 ? (
    <EmptyState
      variant="aurora"
      icon={<Newspaper />}
      title={isChief ? "لا أخبار بعد" : "لا تكاليف لك"}
      description={isChief
        ? "أنشئ أوّل خبر — يُحفظ مسودّةً، ثمّ تكلّف كاتبه وتراجعه قبل النشر."
        : "حين يكلّفك رئيس التحرير بخبر ظهر هنا، ورأيتَ ما تملك تحريره منه."}
      action={createBtn ?? undefined}
    />
  ) : filtered.length === 0 ? (
    <EmptyState
      variant="soft"
      icon={<MagnifyingGlass />}
      title="لا أخبار مطابقة"
      description={filtering ? "لم نعثر على أخبار تطابق بحثك أو المرشّح." : "لا خبر في هذه المرحلة الآن."}
      action={filtering ? <Button variant="ghost" size="md" onClick={clearFilters}>مسح المرشّحات</Button> : undefined}
    />
  ) : null;

  const pager = filtered.length ? (
    <Pagination page={safePage} pageSize={pageSize} total={filtered.length}
      onPageChange={setPage} onPageSizeChange={setPageSize} noun="خبر" />
  ) : null;

  const inFlight = rows.filter((n) => (IN_FLIGHT as string[]).includes(n.workflow)).length;
  const awaiting = rows.filter((n) => n.workflow === "ready_for_review").length;
  const published = rows.filter((n) => n.workflow === "published").length;
  const pendingComments = rows.reduce((s, n) => s + n.pendingComments, 0);

  const tabs = useMemo(
    () => STAGES.map((s) => {
      const n = rows.filter(s.match).length;
      return { value: s.value, label: s.label, badge: n ? String(n) : undefined };
    }),
    [rows],
  );

  const committeeOptions = useMemo(
    () => [{ value: "", label: "بلا لجنة" }, ...committees],
    [committees],
  );

  return (
    <>
      <div className="ash-phead">
        <div>
          <Breadcrumb />
          <h1>غرفة تحرير أدِيب</h1>
        </div>
        {createBtn}
      </div>

      <div className="stat-grid" style={{ marginBottom: 18 }}>
        <Stat icon={<Newspaper />} value={rows.length} label={isChief ? "إجمالي الأخبار" : "تكاليفي"} />
        <Stat icon={<ClipboardText />} value={inFlight} label="قيد العمل" tone="brand" />
        <Stat icon={<PaperPlaneTilt />} value={awaiting} label={isChief ? "تنتظر مراجعتك" : "رفعتها للمراجعة"} tone="warning" />
        <Stat icon={<Megaphone />} value={published} label="منشور" tone="success" />
        {isChief && pendingComments ? (
          <Stat icon={<ChatCircleDots />} value={pendingComments} label="تعليقات تنتظر الإقرار" tone="warning" />
        ) : null}
      </div>

      <Tabs items={tabs} value={stage} onValueChange={setStage} variant="underline" className="mb-4" />

      <Toolbar
        searchPlaceholder="ابحث بالعنوان أو الملخّص أو الكاتب أو الوسم…"
        search={search} onSearch={setSearch}
        filters={filters} filterValues={fv}
        onFilter={(k, v) => setFv((p) => ({ ...p, [k]: v }))} onReset={() => setFv({})}
      />

      <DataTable
        columns={columns}
        rows={pageRows}
        getRowId={(n) => n.id}
        emptyState={emptyState}
        footer={pager ?? undefined}
        rowActions={actionsFor}
        onRowClick={open}
      />

      <Modal
        open={form !== null}
        onClose={() => setForm(null)}
        title="خبر جديد"
        description="يُحفظ مسودّةً، ثمّ تفتحه لتكتبه أو تكلّف كاتبه."
        busy={pending}
        size="md"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setForm(null)} disabled={pending}>إلغاء</Button>
            <Button variant="primary" size="md" onClick={submitCreate} loading={pending}>إنشاء الخبر</Button>
          </>
        }
      >
        {form ? (
          <div className="form-grid">
            <Field
              className="form-full" label="عنوان الخبر" icon={<Newspaper />} innerIcon={<PencilSimple />}
              placeholder="مشاركة أدِيب في…"
              value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              error={formErr ?? undefined}
              helper="عنوانٌ مبدئيّ يكفي — يُحرّر لاحقًا في المحرّر." required
            />
            <Select
              label="القسم" icon={<ClipboardText />} options={CATEGORY_OPTIONS} value={form.category}
              onValueChange={(v) => setForm({ ...form, category: v as Category })}
              helper={CATEGORY_META[form.category].hint} required
            />
            <Select
              label="اللجنة" icon={<UsersThree />} options={committeeOptions} value={form.committeeId}
              onValueChange={(v) => setForm({ ...form, committeeId: v })} optional
            />
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={confirmKill !== null}
        onClose={() => setConfirmKill(null)}
        tone="danger"
        icon={<Trash />}
        title="حذف الخبر؟"
        text={confirmKill ? `سيُحذف «${confirmKill.title}» وتكاليفه وتعليقاته وصوره نهائيًّا. لا استرجاع بعده.` : undefined}
        confirmLabel="حذف"
        loading={pending}
        onConfirm={() => {
          if (!confirmKill) return;
          startPending(async () => {
            const r = await deleteNews(confirmKill.id);
            if (r.ok) { toast.success(r.message); setConfirmKill(null); router.refresh(); } else toast.error(r.message);
          });
        }}
      />
    </>
  );
}
