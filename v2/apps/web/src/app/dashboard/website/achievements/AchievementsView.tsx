"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Stat } from "@adeeb/design-system";
import { ChartBar } from "@phosphor-icons/react";
import { ArrowUp } from "@/app/_components/glyphs";
import { ArrowDown, PencilSimple, Plus, Trash } from "@/app/_components/glyphs";
import { DataTable, type Column } from "../../_components/DataTable";
import { Toolbar } from "../../_components/Toolbar";
import { usePersistentView } from "../../_components/usePersistentView";
import { EmptyState } from "../../_components/EmptyState";
import { ConfirmDialog } from "../../_components/ConfirmDialog";
import { useToast } from "../../_components/ToastProvider";
import type { MenuGroup } from "../../_components/DropdownMenu";
import { StatIcon } from "@/app/_components/statIcons";
import { formatThousands as fmt } from "@/app/_components/format";
import type { AchievementRow } from "./data";
import { AchievementCard } from "./AchievementCard";
import { deleteAchievement, moveAchievement } from "./actions";
import { PageHeader } from "../../_components/PageHeader";

export function AchievementsView({ items }: { items: AchievementRow[] }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startPending] = useTransition();
  const [confirmKill, setConfirmKill] = useState<AchievementRow | null>(null);
  const [view, changeView] = usePersistentView("achievements-view");

  const openEdit = (a: AchievementRow) => router.push(`/dashboard/website/achievements/${a.id}/edit`);

  const move = (a: AchievementRow, dir: "up" | "down") => {
    startPending(async () => {
      const r = await moveAchievement(a.id, dir);
      if (r.ok) router.refresh(); else toast.error(r.message);
    });
  };

  const actionsFor = (a: AchievementRow, i: number): MenuGroup[] => [
    { header: "إجراءات", items: [
      { label: "تحرير", icon: <PencilSimple />, onSelect: () => openEdit(a) },
      { label: "تحريك لأعلى", icon: <ArrowUp />, disabled: i === 0 || pending, onSelect: () => move(a, "up") },
      { label: "تحريك لأسفل", icon: <ArrowDown />, disabled: i === items.length - 1 || pending, onSelect: () => move(a, "down") },
    ] },
    { header: "منطقة الخطر", danger: true, items: [
      { label: "حذف", icon: <Trash />, danger: true, onSelect: () => setConfirmKill(a) },
    ] },
  ];

  // الكرت يفتح التحرير بالنقر، فتسقط «تحرير» عن قائمة نقاطه (وتبقى كاملةً في الجدول).
  const cardActionsFor = (a: AchievementRow, i: number): MenuGroup[] =>
    actionsFor(a, i)
      .map((g) => ({ ...g, items: g.items.filter((it) => it.label !== "تحرير") }))
      .filter((g) => g.items.length > 0);

  const columns: Column<AchievementRow>[] = [
    {
      key: "icon", header: "الأيقونة", width: "64px", align: "center",
      render: (a) => (
        <span className="inline-flex h-6 w-6 items-center justify-center text-content-muted [&>svg]:h-full [&>svg]:w-full">
          <StatIcon name={a.icon} />
        </span>
      ),
    },
    { key: "label", header: "الإحصائيّة", width: "minmax(220px, 2.4fr)", render: (a) => <span className="txt"><b>{a.label}</b></span> },
    { key: "count", header: "الرقم", width: "1.2fr", align: "center", render: (a) => <span className="txt num">{fmt(a.count)}{a.plus ? "+" : ""}</span> },
    { key: "order", header: "الترتيب", width: "0.7fr", align: "center", render: (_a, i) => <span className="txt num">{i + 1}</span> },
  ];

  const createBtn = (
    <Link href="/dashboard/website/achievements/new" className="abtn abtn-primary abtn-md"><Plus size={18} />إحصائيّة جديدة</Link>
  );

  const emptyState = (
    <EmptyState
      variant="aurora"
      icon={<ChartBar />}
      title="لا إحصاءات بعد"
      description="أضِف أوّل إحصائيّة، تظهر مباشرةً في «ملخص المسيرة» بحجمٍ يتناسب مع رقمها."
      action={createBtn}
    />
  );

  return (
    <>
      <PageHeader title="ملخص المسيرة" action={{ label: "إحصائيّة جديدة", icon: <Plus size={18} />, href: "/dashboard/website/achievements/new" }} />

      <div className="stat-grid" style={{ marginBottom: 18 }}>
        <Stat icon={<ChartBar />} value={items.length} label="إحصاءات في الملخّص" />
      </div>

      <Toolbar view={view} onViewChange={changeView} />

      {view === "table" ? (
        <DataTable
          columns={columns}
          rows={items}
          getRowId={(a) => a.id}
          emptyState={emptyState}
          rowActions={(a) => actionsFor(a, items.findIndex((x) => x.id === a.id))}
          onRowClick={openEdit}
        />
      ) : items.length === 0 ? (
        <div className="card-empty">{emptyState}</div>
      ) : (
        <div className="card-grid card-grid-1col">
          {items.map((a, i) => (
            <AchievementCard key={a.id} item={a} order={i + 1} actions={cardActionsFor(a, i)} onOpen={() => openEdit(a)} />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmKill !== null}
        onClose={() => setConfirmKill(null)}
        tone="danger"
        icon={<Trash />}
        title="حذف الإحصائيّة؟"
        text={confirmKill ? `ستُحذف «${confirmKill.label}» من ملخّص المسيرة نهائيًّا. لا استرجاع بعده.` : undefined}
        confirmLabel="حذف"
        loading={pending}
        onConfirm={() => {
          if (!confirmKill) return;
          startPending(async () => {
            const r = await deleteAchievement(confirmKill.id);
            if (r.ok) { toast.success(r.message); setConfirmKill(null); router.refresh(); } else toast.error(r.message);
          });
        }}
      />
    </>
  );
}
