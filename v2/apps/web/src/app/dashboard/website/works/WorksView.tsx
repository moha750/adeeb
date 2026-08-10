"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Stat } from "@adeeb/design-system";
import { ImagesSquare } from "@phosphor-icons/react";
import { ArrowUp } from "@/app/_components/glyphs";
import { ArrowDown, ArrowUpRight, PencilSimple, Plus, Trash } from "@/app/_components/glyphs";
import { DataTable, type Column } from "../../_components/DataTable";
import { Toolbar } from "../../_components/Toolbar";
import { usePersistentView } from "../../_components/usePersistentView";
import { EmptyState } from "../../_components/EmptyState";
import { ConfirmDialog } from "../../_components/ConfirmDialog";
import { useToast } from "../../_components/ToastProvider";
import type { MenuGroup } from "../../_components/DropdownMenu";
import type { WorkRow } from "./data";
import { WorkCard } from "./WorkCard";
import { deleteWork, moveWork } from "./actions";
import { Breadcrumb } from "../../_shell/Breadcrumb";

/** يستخرج نطاق الرابط للعرض المختصر (بلا بروتوكول)، أو يعيد الرابط كما هو إن تعذّر. */
function linkLabel(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

export function WorksView({ works }: { works: WorkRow[] }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startPending] = useTransition();
  const [confirmKill, setConfirmKill] = useState<WorkRow | null>(null);
  const [view, changeView] = usePersistentView("works-view");

  const openEdit = (w: WorkRow) => router.push(`/dashboard/website/works/${w.id}/edit`);

  const move = (w: WorkRow, dir: "up" | "down") => {
    startPending(async () => {
      const r = await moveWork(w.id, dir);
      if (r.ok) router.refresh(); else toast.error(r.message);
    });
  };

  const actionsFor = (w: WorkRow, i: number): MenuGroup[] => {
    const isFirst = i === 0;
    const isLast = i === works.length - 1;
    return [
      { header: "إجراءات", items: [
        { label: "تحرير", icon: <PencilSimple />, onSelect: () => openEdit(w) },
        { label: "تحريك لأعلى", icon: <ArrowUp />, disabled: isFirst || pending, onSelect: () => move(w, "up") },
        { label: "تحريك لأسفل", icon: <ArrowDown />, disabled: isLast || pending, onSelect: () => move(w, "down") },
      ] },
      { header: "منطقة الخطر", danger: true, items: [
        { label: "حذف", icon: <Trash />, danger: true, onSelect: () => setConfirmKill(w) },
      ] },
    ];
  };

  // الكرت يفتح التحرير بالنقر، فتسقط «تحرير» عن قائمة نقاطه (وتبقى كاملةً في الجدول).
  const cardActionsFor = (w: WorkRow, i: number): MenuGroup[] =>
    actionsFor(w, i)
      .map((g) => ({ ...g, items: g.items.filter((it) => it.label !== "تحرير") }))
      .filter((g) => g.items.length > 0);

  const columns: Column<WorkRow>[] = [
    {
      key: "image", header: "الصورة", width: "72px", align: "center",
      render: (w) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={w.imageUrl} alt={w.title} loading="lazy" className="h-11 w-11 rounded object-cover ring-1 ring-navy-950/5" />
      ),
    },
    {
      key: "title", header: "العمل", width: "minmax(220px, 2.4fr)",
      render: (w) => (
        <span className="txt">
          <b>{w.title}</b>
          {w.category ? <span className="text-content-muted">، {w.category}</span> : null}
        </span>
      ),
    },
    {
      key: "link", header: "الرابط", width: "minmax(140px, 1.4fr)",
      render: (w) => w.linkUrl
        ? <a href={w.linkUrl} target="_blank" rel="noopener noreferrer" className="txt inline-flex items-center gap-1 text-secondary" onClick={(e) => e.stopPropagation()}>{linkLabel(w.linkUrl)}<ArrowUpRight /></a>
        : <span className="txt text-content-muted">عارض داخليّ</span>,
    },
    { key: "order", header: "الترتيب", width: "0.7fr", align: "center", render: (_w, i) => <span className="txt num">{i + 1}</span> },
  ];

  const createBtn = (
    <Link href="/dashboard/website/works/new" className="abtn abtn-primary abtn-md"><Plus size={18} />عمل جديد</Link>
  );

  const emptyState = (
    <EmptyState
      variant="aurora"
      icon={<ImagesSquare />}
      title="لا أعمال بعد"
      description="أضِف أوّل عمل، يظهر مباشرةً في معرض «أعمال وإبداعات» على الصفحة الرئيسية."
      action={createBtn}
    />
  );

  return (
    <>
      <div className="ash-phead">
        <div>
          <Breadcrumb />
          <h1>معرض الأعمال</h1>
        </div>
        {createBtn}
      </div>

      <div className="stat-grid" style={{ marginBottom: 18 }}>
        <Stat icon={<ImagesSquare />} value={works.length} label="أعمال في المعرض" />
      </div>

      <Toolbar view={view} onViewChange={changeView} />

      {view === "table" ? (
        <DataTable
          columns={columns}
          rows={works}
          getRowId={(w) => w.id}
          emptyState={emptyState}
          rowActions={(w) => actionsFor(w, works.findIndex((x) => x.id === w.id))}
          onRowClick={openEdit}
        />
      ) : works.length === 0 ? (
        <div className="card-empty">{emptyState}</div>
      ) : (
        <div className="card-grid card-grid-1col">
          {works.map((w, i) => (
            <WorkCard key={w.id} work={w} order={i + 1} actions={cardActionsFor(w, i)} onOpen={() => openEdit(w)} />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmKill !== null}
        onClose={() => setConfirmKill(null)}
        tone="danger"
        icon={<Trash />}
        title="حذف العمل؟"
        text={confirmKill ? `سيُحذف «${confirmKill.title}» من المعرض نهائيًّا. لا استرجاع بعده.` : undefined}
        confirmLabel="حذف"
        loading={pending}
        onConfirm={() => {
          if (!confirmKill) return;
          startPending(async () => {
            const r = await deleteWork(confirmKill.id);
            if (r.ok) { toast.success(r.message); setConfirmKill(null); router.refresh(); } else toast.error(r.message);
          });
        }}
      />
    </>
  );
}
