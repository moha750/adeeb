"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Stat, matchesSearch } from "@adeeb/design-system";
import { Briefcase, UserCheck, UserMinus } from "@phosphor-icons/react";
import { ArrowsClockwise } from "@/app/_components/glyphs";
import { MagnifyingGlass, Trash } from "@/app/_components/glyphs";
import { Toolbar, type FilterDef } from "../../_components/Toolbar";
import { EmptyState } from "../../_components/EmptyState";
import { useToast } from "../../_components/ToastProvider";
import type { MenuGroup } from "../../_components/DropdownMenu";
import { assignPosition, removePosition } from "../structure/actions";
import type { Holder, Position } from "../structure/model";
import { PositionCard } from "./PositionCard";
import { AssignmentModal, type AssignState, type MemberOption } from "./AssignmentModal";

export function AssignmentsView({ positions, members, anomalies }: { positions: Position[]; members: MemberOption[]; anomalies: string[] }) {
  const router = useRouter();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [fv, setFv] = useState<Record<string, string>>({});
  const [modal, setModal] = useState<AssignState | null>(null);
  const [pick, setPick] = useState("");
  const [showAnoms, setShowAnoms] = useState(false);
  const [busy, start] = useTransition();

  const rows = useMemo(() => {
    return positions.filter((p) => {
      if (!matchesSearch(search, p.roleAr, p.scope, ...p.holders.map((h) => h.name))) return false;
      if (fv.council && p.council !== fv.council) return false;
      if (fv.status === "vacant" && p.holders.length > 0) return false;
      if (fv.status === "filled" && p.holders.length === 0) return false;
      return true;
    });
  }, [positions, search, fv]);

  const filters: FilterDef[] = [
    { key: "council", label: "المجلس", options: [{ value: "administrative", label: "المجلس الإداري" }, { value: "executive", label: "المجلس التنفيذي" }] },
    { key: "status", label: "الحالة", options: [{ value: "vacant", label: "الشاغرة" }, { value: "filled", label: "المشغولة" }] },
  ];

  const stats = useMemo(() => ({
    total: positions.length,
    vacant: positions.filter((p) => p.holders.length === 0).length,
    filled: positions.filter((p) => p.holders.length > 0).length,
  }), [positions]);

  // تُهيَّأ الحالة عند الفتح لا في أثرٍ بعده — فلا رسمَ متتالٍ (cascading render).
  const openAssign = (pos: Position, replace: boolean) => {
    setPick("");
    setModal({ kind: "assign", position: pos, replace });
  };
  const openRemove = (pos: Position, holder: Holder) => {
    setPick("");
    setModal({ kind: "remove", position: pos, holder });
  };

  // إرسالٌ واحد يخدم الأوضاع الثلاثة (المحرّر يملك الشكل، والمنطق هنا).
  const submit = () => {
    if (!modal) return;
    if (modal.kind === "assign") {
      if (!pick) return;
      const pos = modal.position;
      start(async () => {
        const r = await assignPosition({ userId: pick, roleName: pos.roleName, committeeId: pos.committeeId, departmentId: pos.departmentId, replace: modal.replace });
        if (r.ok) { toast.success(r.message); setModal(null); router.refresh(); } else toast.error(r.message);
      });
    } else {
      const h = modal.holder;
      start(async () => {
        const r = await removePosition({ userId: h.userId, roleName: h.roleName, committeeId: h.committeeId });
        if (r.ok) { toast.success(r.message); setModal(null); router.refresh(); } else toast.error(r.message);
      });
    }
  };

  // لكلّ شاغلٍ قائمتُه (المتعدّد يجلس فيه أكثر من واحد، فالفعل يخصّ صاحبه لا الكرت).
  // و«الاستبدال» للمفرد وحده: منصبٌ يقبل الزيادة لا يُستبدَل شاغلُه — يُضاف إليه أو يُزال منه.
  const holderActions = (p: Position) => (h: Holder): MenuGroup[] => [{
    header: "إجراءات",
    items: [
      ...(p.singleton ? [{ label: "استبدال الشاغل", icon: <ArrowsClockwise />, onSelect: () => openAssign(p, true) }] : []),
      { label: "إزالة من المنصب", icon: <Trash />, danger: true, onSelect: () => openRemove(p, h) },
    ],
  }];

  const empty = (
    <EmptyState variant="soft" icon={<MagnifyingGlass />} title="لا مناصب مطابقة"
      description="جرّب تعديل البحث أو المرشّحات." action={<Button variant="ghost" size="md" onClick={() => { setSearch(""); setFv({}); }}>مسح المرشّحات</Button>} />
  );

  return (
    <div className="asg">
      <div className="stat-grid">
        <Stat icon={<Briefcase />} value={stats.total} label="منصبًا قياديًّا" tone="brand" />
        <Stat icon={<UserCheck />} value={stats.filled} label="مشغولة" tone="success" />
        <Stat icon={<UserMinus />} value={stats.vacant} label="شاغرة" tone="danger" />
      </div>

      {anomalies.length ? (
        <Alert tone="warning" title={`${anomalies.length} ملاحظة على الهيكلة`}
          actions={<button type="button" className="cred-link" onClick={() => setShowAnoms((v) => !v)}>{showAnoms ? "إخفاء" : "التفاصيل"}</button>}>
          مناصب شاغرة أو لجان بلا قيادة. فصّلها وأسندها من البطاقات أدناه.
          {showAnoms ? <ul className="org-anoms">{anomalies.map((a, i) => <li key={i}>{a}</li>)}</ul> : null}
        </Alert>
      ) : null}

      <Toolbar
        searchPlaceholder="ابحث بالمنصب أو النطاق أو الشاغل…"
        search={search}
        onSearch={setSearch}
        filters={filters}
        filterValues={fv}
        onFilter={(k, v) => setFv((p) => ({ ...p, [k]: v }))}
        onReset={() => setFv({})}
      />

      {rows.length === 0 ? empty : (
        <div className="card-grid">
          {rows.map((p) => (
            <PositionCard key={p.key} position={p} actions={holderActions(p)} onAssign={() => openAssign(p, false)} />
          ))}
        </div>
      )}

      <AssignmentModal
        state={modal}
        members={members}
        pick={pick}
        onPick={setPick}
        busy={busy}
        onClose={() => setModal(null)}
        onSubmit={submit}
      />
    </div>
  );
}
