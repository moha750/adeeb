"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Alert, Badge, Stat } from "@adeeb/design-system";
import { ArrowUp } from "@/app/_components/glyphs";
import { ArrowDown, Eye, EyeSlash, PencilSimple, Plus, Trash } from "@/app/_components/glyphs";
import { IconDeebo } from "../../_shell/icons";
import { DataTable, type Column } from "../../_components/DataTable";
import { Toolbar } from "../../_components/Toolbar";
import { usePersistentView } from "../../_components/usePersistentView";
import { EmptyState } from "../../_components/EmptyState";
import { ConfirmDialog } from "../../_components/ConfirmDialog";
import { useToast } from "../../_components/ToastProvider";
import type { MenuGroup } from "../../_components/DropdownMenu";
import type { FactRow } from "./data";
import { FactCard } from "./FactCard";
import { deleteFact, moveFact, toggleFact } from "./actions";
import { PageHeader } from "../../_components/PageHeader";

/**
 * **وقائعُ ديبو** — ما يعرفه عن أديب مكتوبًا بيد صاحب الغرفة.
 *
 * وهي أختُ «الأسئلة الشائعة» شكلًا لا موضوعًا: تلك أجوبةٌ يقرؤها الزائرُ بنفسه في
 * الصفحة الرئيسية، وهذه وقائعُ لا تُعرَض لأحدٍ — تُحشى في نصّ توجيه ديبو فيجيب منها.
 * ولذلك لا زرَّ «معاينة» هنا: موضعُ معاينتها محادثةٌ مع ديبو نفسه.
 */
export function KnowledgeView({ facts }: { facts: FactRow[] }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startPending] = useTransition();
  const [confirmKill, setConfirmKill] = useState<FactRow | null>(null);
  const [view, changeView] = usePersistentView("deebo-facts-view");

  const openEdit = (f: FactRow) => router.push(`/dashboard/deebo/knowledge/${f.id}/edit`);

  const run = (fn: () => Promise<{ ok: boolean; message: string }>, quiet = false) => {
    startPending(async () => {
      const r = await fn();
      if (r.ok) {
        if (!quiet) toast.success(r.message);
        router.refresh();
      } else toast.error(r.message);
    });
  };

  const actionsFor = (f: FactRow, i: number): MenuGroup[] => [
    {
      header: "إجراءات",
      items: [
        { label: "تحرير", icon: <PencilSimple />, onSelect: () => openEdit(f) },
        {
          label: f.isActive ? "إيقاف" : "إعادة",
          icon: f.isActive ? <EyeSlash /> : <Eye />,
          disabled: pending,
          onSelect: () => run(() => toggleFact(f.id, !f.isActive)),
        },
        {
          label: "تحريك لأعلى",
          icon: <ArrowUp />,
          disabled: i === 0 || pending,
          onSelect: () => run(() => moveFact(f.id, "up"), true),
        },
        {
          label: "تحريك لأسفل",
          icon: <ArrowDown />,
          disabled: i === facts.length - 1 || pending,
          onSelect: () => run(() => moveFact(f.id, "down"), true),
        },
      ],
    },
    {
      header: "منطقة الخطر",
      danger: true,
      items: [{ label: "حذف", icon: <Trash />, danger: true, onSelect: () => setConfirmKill(f) }],
    },
  ];

  // الكرت يفتح التحرير بالنقر، فتسقط «تحرير» عن قائمة نقاطه (وتبقى كاملةً في الجدول).
  const cardActionsFor = (f: FactRow, i: number): MenuGroup[] =>
    actionsFor(f, i)
      .map((g) => ({ ...g, items: g.items.filter((it) => it.label !== "تحرير") }))
      .filter((g) => g.items.length > 0);

  const columns: Column<FactRow>[] = [
    { key: "sort", header: "#", width: "48px", align: "center", render: (_f, i) => <span className="txt num">{i + 1}</span> },
    {
      key: "fact",
      header: "الواقعة",
      width: "minmax(320px, 4fr)",
      wrap: true,
      render: (f) => (
        <span className="txt">
          <b>{f.title}</b>
          <span className="mt-1 block text-content-muted">{f.body}</span>
        </span>
      ),
    },
    {
      key: "state",
      header: "الحالة",
      width: "110px",
      render: (f) =>
        f.isActive ? (
          <Badge tone="success" dot>يقولها</Badge>
        ) : (
          <Badge tone="neutral" dot>موقوفة</Badge>
        ),
    },
  ];

  const createBtn = (
    <Link href="/dashboard/deebo/knowledge/new" className="abtn abtn-primary abtn-md">
      <Plus size={18} />واقعة جديدة
    </Link>
  );

  const emptyState = (
    <EmptyState
      variant="aurora"
      icon={<IconDeebo />}
      title="لا وقائع بعد"
      description="أضِف أوّل واقعة، يقولها ديبو في محادثته من اللحظة."
      action={createBtn}
    />
  );

  const live = facts.filter((f) => f.isActive).length;

  return (
    <>
      <PageHeader
        title="معرفة ديبو"
        action={{ label: "واقعة جديدة", icon: <Plus size={18} />, href: "/dashboard/deebo/knowledge/new" }}
      />

      {/* حدُّ الغرفة مكتوبٌ فيها لا في وثيقةٍ بعيدة: كاتبُ الواقعة يقرؤه وهو يكتب. */}
      <Alert tone="info" title="الثابتُ وحده يُكتب هنا">
        عددُ الأعضاء واسمُ القائد الحاليّ وتاريخُ فعاليّةٍ قادمة: كلُّها تتبدّل، فتصير كذبًا
        على لسان ديبو بعد شهور. اكتب ما لا يتغيّر، ودع المتغيّر تقولُه شاشاتُه.
      </Alert>

      <div className="stat-grid" style={{ marginBottom: 18 }}>
        <Stat icon={<IconDeebo />} value={live} label="وقائع يقولها" />
        <Stat icon={<EyeSlash />} value={facts.length - live} label="وقائع موقوفة" />
      </div>

      <Toolbar view={view} onViewChange={changeView} />

      {view === "table" ? (
        <DataTable
          columns={columns}
          rows={facts}
          getRowId={(f) => f.id}
          emptyState={emptyState}
          rowActions={(f) => actionsFor(f, facts.findIndex((x) => x.id === f.id))}
          onRowClick={openEdit}
        />
      ) : facts.length === 0 ? (
        <div className="card-empty">{emptyState}</div>
      ) : (
        <div className="card-grid card-grid-1col">
          {facts.map((f, i) => (
            <FactCard key={f.id} fact={f} order={i + 1} actions={cardActionsFor(f, i)} onOpen={() => openEdit(f)} />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmKill !== null}
        onClose={() => setConfirmKill(null)}
        tone="danger"
        icon={<Trash />}
        title="حذف الواقعة؟"
        text={confirmKill ? `سيُحذف «${confirmKill.title}» نهائيًّا. ولو أردت إخراجها من كلامه وحدَه فأوقِفها.` : undefined}
        confirmLabel="حذف"
        loading={pending}
        onConfirm={() => {
          if (!confirmKill) return;
          startPending(async () => {
            const r = await deleteFact(confirmKill.id);
            if (r.ok) {
              toast.success(r.message);
              setConfirmKill(null);
              router.refresh();
            } else toast.error(r.message);
          });
        }}
      />
    </>
  );
}
