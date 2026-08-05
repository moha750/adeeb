"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Stat } from "@adeeb/design-system";
import { ArrowUp } from "@/app/_components/glyphs";
import { ArrowDown, PencilSimple, Plus, Question, Trash } from "@/app/_components/glyphs";
import { DataTable, type Column } from "../../_components/DataTable";
import { Toolbar } from "../../_components/Toolbar";
import { usePersistentView } from "../../_components/usePersistentView";
import { EmptyState } from "../../_components/EmptyState";
import { ConfirmDialog } from "../../_components/ConfirmDialog";
import { useToast } from "../../_components/ToastProvider";
import type { MenuGroup } from "../../_components/DropdownMenu";
import type { FaqRow } from "./data";
import { FaqCard } from "./FaqCard";
import { deleteFaq, moveFaq } from "./actions";
import { Breadcrumb } from "../../_shell/Breadcrumb";

export function FaqView({ faqs }: { faqs: FaqRow[] }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startPending] = useTransition();
  const [confirmKill, setConfirmKill] = useState<FaqRow | null>(null);
  const [view, changeView] = usePersistentView("faq-view");

  const openEdit = (f: FaqRow) => router.push(`/dashboard/website/faq/${f.id}/edit`);

  const move = (f: FaqRow, dir: "up" | "down") => {
    startPending(async () => {
      const r = await moveFaq(f.id, dir);
      if (r.ok) router.refresh(); else toast.error(r.message);
    });
  };

  const actionsFor = (f: FaqRow, i: number): MenuGroup[] => [
    { header: "إجراءات", items: [
      { label: "تحرير", icon: <PencilSimple />, onSelect: () => openEdit(f) },
      { label: "تحريك لأعلى", icon: <ArrowUp />, disabled: i === 0 || pending, onSelect: () => move(f, "up") },
      { label: "تحريك لأسفل", icon: <ArrowDown />, disabled: i === faqs.length - 1 || pending, onSelect: () => move(f, "down") },
    ] },
    { header: "منطقة الخطر", danger: true, items: [
      { label: "حذف", icon: <Trash />, danger: true, onSelect: () => setConfirmKill(f) },
    ] },
  ];

  // الكرت يفتح التحرير بالنقر، فتسقط «تحرير» عن قائمة نقاطه (وتبقى كاملةً في الجدول).
  const cardActionsFor = (f: FaqRow, i: number): MenuGroup[] =>
    actionsFor(f, i)
      .map((g) => ({ ...g, items: g.items.filter((it) => it.label !== "تحرير") }))
      .filter((g) => g.items.length > 0);

  const columns: Column<FaqRow>[] = [
    { key: "order", header: "#", width: "48px", align: "center", render: (_f, i) => <span className="txt num">{i + 1}</span> },
    {
      key: "qa", header: "السؤال والإجابة", width: "minmax(320px, 4fr)", wrap: true,
      render: (f) => (
        <span className="txt">
          <b>{f.question}</b>
          <span className="mt-1 block text-content-muted">{f.answer}</span>
        </span>
      ),
    },
  ];

  const createBtn = (
    <Link href="/dashboard/website/faq/new" className="abtn abtn-primary abtn-md"><Plus size={18} />سؤال جديد</Link>
  );

  const emptyState = (
    <EmptyState
      variant="aurora"
      icon={<Question />}
      title="لا أسئلة بعد"
      description="أضِف أوّل سؤال — يظهر مباشرةً في قسم «الأسئلة الشائعة» بالصفحة الرئيسية."
      action={createBtn}
    />
  );

  return (
    <>
      <div className="ash-phead">
        <div>
          <Breadcrumb />
          <h1>الأسئلة الشائعة</h1>
        </div>
        {createBtn}
      </div>

      <div className="stat-grid" style={{ marginBottom: 18 }}>
        <Stat icon={<Question />} value={faqs.length} label="أسئلة منشورة" />
      </div>

      <Toolbar view={view} onViewChange={changeView} />

      {view === "table" ? (
        <DataTable
          columns={columns}
          rows={faqs}
          getRowId={(f) => f.id}
          emptyState={emptyState}
          rowActions={(f) => actionsFor(f, faqs.findIndex((x) => x.id === f.id))}
          onRowClick={openEdit}
        />
      ) : faqs.length === 0 ? (
        <div className="card-empty">{emptyState}</div>
      ) : (
        <div className="card-grid card-grid-1col">
          {faqs.map((f, i) => (
            <FaqCard key={f.id} faq={f} order={i + 1} actions={cardActionsFor(f, i)} onOpen={() => openEdit(f)} />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmKill !== null}
        onClose={() => setConfirmKill(null)}
        tone="danger"
        icon={<Trash />}
        title="حذف السؤال؟"
        text={confirmKill ? `سيُحذف «${confirmKill.question}» نهائيًّا. لا استرجاع بعده.` : undefined}
        confirmLabel="حذف"
        loading={pending}
        onConfirm={() => {
          if (!confirmKill) return;
          startPending(async () => {
            const r = await deleteFaq(confirmKill.id);
            if (r.ok) { toast.success(r.message); setConfirmKill(null); router.refresh(); } else toast.error(r.message);
          });
        }}
      />
    </>
  );
}
