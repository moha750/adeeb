"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge, Stat } from "@adeeb/design-system";
import { ArrowUp, ArrowDown, ArrowUpRight, Handshake, PencilSimple, Plus, Trash } from "@phosphor-icons/react";
import { DataTable, type Column } from "../../_components/DataTable";
import { Toolbar } from "../../_components/Toolbar";
import { usePersistentView } from "../../_components/usePersistentView";
import { EmptyState } from "../../_components/EmptyState";
import { ConfirmDialog } from "../../_components/ConfirmDialog";
import { useToast } from "../../_components/ToastProvider";
import type { MenuGroup } from "../../_components/DropdownMenu";
import type { SponsorRow } from "./data";
import { SponsorCard } from "./SponsorCard";
import { deleteSponsor, moveSponsor } from "./actions";
import { Breadcrumb } from "../../_shell/Breadcrumb";

function linkLabel(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

export function SponsorsView({ sponsors }: { sponsors: SponsorRow[] }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startPending] = useTransition();
  const [confirmKill, setConfirmKill] = useState<SponsorRow | null>(null);
  const [view, changeView] = usePersistentView("sponsors-view");

  const openEdit = (s: SponsorRow) => router.push(`/dashboard/website/sponsors/${s.id}/edit`);

  const move = (s: SponsorRow, dir: "up" | "down") => {
    startPending(async () => {
      const r = await moveSponsor(s.id, dir);
      if (r.ok) router.refresh(); else toast.error(r.message);
    });
  };

  const actionsFor = (s: SponsorRow, i: number): MenuGroup[] => [
    { header: "إجراءات", items: [
      { label: "تحرير", icon: <PencilSimple />, onSelect: () => openEdit(s) },
      { label: "تحريك لأعلى", icon: <ArrowUp />, disabled: i === 0 || pending, onSelect: () => move(s, "up") },
      { label: "تحريك لأسفل", icon: <ArrowDown />, disabled: i === sponsors.length - 1 || pending, onSelect: () => move(s, "down") },
    ] },
    { header: "منطقة الخطر", danger: true, items: [
      { label: "حذف", icon: <Trash />, danger: true, onSelect: () => setConfirmKill(s) },
    ] },
  ];

  // الكرت يفتح التحرير بالنقر، فتسقط «تحرير» عن قائمة نقاطه (وتبقى كاملةً في الجدول).
  const cardActionsFor = (s: SponsorRow, i: number): MenuGroup[] =>
    actionsFor(s, i)
      .map((g) => ({ ...g, items: g.items.filter((it) => it.label !== "تحرير") }))
      .filter((g) => g.items.length > 0);

  const columns: Column<SponsorRow>[] = [
    {
      key: "logo", header: "الشعار", width: "84px", align: "center",
      render: (s) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={s.logoUrl} alt={s.name} loading="lazy" className="h-11 w-16 rounded bg-white/60 object-contain p-1 ring-1 ring-navy-950/5" />
      ),
    },
    {
      key: "name", header: "الراعي", width: "minmax(200px, 2.2fr)",
      render: (s) => (
        <span className="txt inline-flex items-center gap-2">
          <b>{s.name}</b>
          {s.badge ? <Badge tone="info" size="sm">{s.badge}</Badge> : null}
        </span>
      ),
    },
    {
      key: "link", header: "الرابط", width: "minmax(140px, 1.4fr)",
      render: (s) => s.linkUrl
        ? <a href={s.linkUrl} target="_blank" rel="noopener noreferrer" className="txt inline-flex items-center gap-1 text-secondary" onClick={(e) => e.stopPropagation()}>{linkLabel(s.linkUrl)}<ArrowUpRight /></a>
        : <span className="txt text-content-muted">—</span>,
    },
    { key: "order", header: "الترتيب", width: "0.7fr", align: "center", render: (_s, i) => <span className="txt num">{i + 1}</span> },
  ];

  const createBtn = (
    <Link href="/dashboard/website/sponsors/new" className="abtn abtn-primary abtn-md"><Plus size={18} />راعٍ جديد</Link>
  );

  const emptyState = (
    <EmptyState
      variant="aurora"
      icon={<Handshake weight="duotone" />}
      title="لا رعاة بعد"
      description="أضِف أوّل راعٍ — بشعاره ووسمه ورابطه. (القسم العلنيّ للرعاة يُبنى لاحقًا.)"
      action={createBtn}
    />
  );

  return (
    <>
      <div className="ash-phead">
        <div>
          <Breadcrumb />
          <h1>الرعاة والشركاء</h1>
        </div>
        {createBtn}
      </div>

      <div className="stat-grid" style={{ marginBottom: 18 }}>
        <Stat icon={<Handshake weight="fill" />} value={sponsors.length} label="رعاة وشركاء" />
      </div>

      <Toolbar view={view} onViewChange={changeView} />

      {view === "table" ? (
        <DataTable
          columns={columns}
          rows={sponsors}
          getRowId={(s) => s.id}
          emptyState={emptyState}
          rowActions={(s) => actionsFor(s, sponsors.findIndex((x) => x.id === s.id))}
          onRowClick={openEdit}
        />
      ) : sponsors.length === 0 ? (
        <div className="card-empty">{emptyState}</div>
      ) : (
        <div className="card-grid card-grid-1col">
          {sponsors.map((s, i) => (
            <SponsorCard key={s.id} sponsor={s} order={i + 1} actions={cardActionsFor(s, i)} onOpen={() => openEdit(s)} />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmKill !== null}
        onClose={() => setConfirmKill(null)}
        tone="danger"
        icon={<Trash weight="bold" />}
        title="حذف الراعي؟"
        text={confirmKill ? `سيُحذف «${confirmKill.name}» نهائيًّا. لا استرجاع بعده.` : undefined}
        confirmLabel="حذف"
        loading={pending}
        onConfirm={() => {
          if (!confirmKill) return;
          startPending(async () => {
            const r = await deleteSponsor(confirmKill.id);
            if (r.ok) { toast.success(r.message); setConfirmKill(null); router.refresh(); } else toast.error(r.message);
          });
        }}
      />
    </>
  );
}
