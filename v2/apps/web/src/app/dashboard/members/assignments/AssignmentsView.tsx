"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Button, Select, Stat } from "@adeeb/design-system";
import { ArrowsClockwise, Briefcase, MagnifyingGlass, Trash, TreeStructure, UserCheck, UserMinus, UserPlus } from "@phosphor-icons/react";
import { DataTable, type Column } from "../../_components/DataTable";
import { Toolbar, type FilterDef } from "../../_components/Toolbar";
import { Modal } from "../../_components/Modal";
import { Avatar } from "../../_components/Avatar";
import { EmptyState } from "../../_components/EmptyState";
import { useToast } from "../../_components/ToastProvider";
import type { MenuGroup } from "../../_components/DropdownMenu";
import { assignPosition, removePosition } from "../structure/actions";
import type { Position } from "../structure/model";

const COUNCIL_AR: Record<Position["council"], string> = {
  executive: "المجلس التنفيذي",
  administrative: "المجلس الإداري",
};

type ModalState =
  | { kind: "assign"; pos: Position; replace: boolean }
  | { kind: "remove"; pos: Position }
  | null;

export function AssignmentsView({ positions, members }: { positions: Position[]; members: { id: string; name: string }[] }) {
  const router = useRouter();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [fv, setFv] = useState<Record<string, string>>({});
  const [modal, setModal] = useState<ModalState>(null);
  const [pick, setPick] = useState("");
  const [admin, setAdmin] = useState<"hr" | "qa">("hr"); // الإدارة لمنصب المشرف الإداريّ
  const [busy, start] = useTransition();

  const memberOptions = useMemo(() => members.map((m) => ({ value: m.id, label: m.name })), [members]);

  const rows = useMemo(() => {
    const q = search.trim();
    return positions.filter((p) => {
      if (q && !(p.roleAr.includes(q) || p.scope.includes(q) || (p.holder?.name.includes(q) ?? false))) return false;
      if (fv.council && p.council !== fv.council) return false;
      if (fv.status === "vacant" && p.holder) return false;
      if (fv.status === "filled" && !p.holder) return false;
      return true;
    });
  }, [positions, search, fv]);

  const filters: FilterDef[] = [
    { key: "council", label: "المجلس", options: [{ value: "administrative", label: "المجلس الإداري" }, { value: "executive", label: "المجلس التنفيذي" }] },
    { key: "status", label: "الحالة", options: [{ value: "vacant", label: "الشاغرة" }, { value: "filled", label: "المشغولة" }] },
  ];

  const stats = useMemo(() => ({
    total: positions.length,
    vacant: positions.filter((p) => !p.holder).length,
    filled: positions.filter((p) => p.holder).length,
  }), [positions]);

  // تُهيَّأ الحالة عند الفتح لا في أثرٍ بعده — فلا رسمَ متتالٍ (cascading render).
  const openAssign = (pos: Position, replace: boolean) => {
    setPick("");
    if (pos.adminSlot) setAdmin(pos.holder?.roleName === "qa_admin_member" ? "qa" : "hr");
    setModal({ kind: "assign", pos, replace });
  };
  const openRemove = (pos: Position) => {
    setPick("");
    setModal({ kind: "remove", pos });
  };

  const submitAssign = () => {
    if (modal?.kind !== "assign" || !pick) return;
    const pos = modal.pos;
    const replace = modal.replace;
    // منصب المشرف الإداريّ: الدور يُحدَّد باختيار الإدارة (HR/QA)
    const roleName = pos.adminSlot ? (admin === "qa" ? "qa_admin_member" : "hr_admin_member") : pos.roleName;
    start(async () => {
      const r = await assignPosition({ userId: pick, roleName, committeeId: pos.committeeId, departmentId: pos.departmentId, replace });
      if (r.ok) { toast.success(r.message); setModal(null); router.refresh(); } else toast.error(r.message);
    });
  };
  const submitRemove = () => {
    if (modal?.kind !== "remove" || !modal.pos.holder) return;
    const h = modal.pos.holder;
    start(async () => {
      const r = await removePosition({ userId: h.userId, roleName: h.roleName, committeeId: h.committeeId });
      if (r.ok) { toast.success(r.message); setModal(null); router.refresh(); } else toast.error(r.message);
    });
  };

  const columns: Column<Position>[] = [
    {
      key: "position", header: "المنصب", width: "minmax(200px, 1.7fr)", sortable: false,
      render: (p) => <span className="asg-pos"><b>{p.roleAr}</b><span>{p.scope}</span></span>,
    },
    {
      key: "council", header: "المجلس", width: "1.2fr",
      // «عضو» = يجلس في المجلس ويقرّر · «تابع» = يقع تحت فرعه (roles.membership_kind)
      render: (p) => (
        <span className="asg-council">
          <span className="txt">{COUNCIL_AR[p.council]}</span>
          <Badge tone={p.councilMember ? "success" : "neutral"} variant="soft">{p.councilMember ? "عضو" : "تابع"}</Badge>
        </span>
      ),
    },
    { key: "how", header: "الاختيار", width: "0.8fr", render: (p) => p.elected ? <Badge tone="info" variant="soft">منتخَب</Badge> : <Badge tone="neutral" variant="soft">تعيين</Badge> },
    {
      key: "weight", header: "وزن الصوت", width: "0.7fr",
      // يُرى وأنت تُسنِد لا يُكتشف في انتخاب: قائدة الموارد 3.0 ونظيرتها في الضمان 1.0.
      render: (p) => <Badge tone={p.voteWeight >= 3 ? "warning" : p.voteWeight > 1 ? "info" : "neutral"} variant="soft">{p.voteWeight}×</Badge>,
    },
    {
      key: "holder", header: "الشاغل", width: "minmax(180px, 1.5fr)",
      render: (p) => p.holder
        ? <span className="asg-holder"><Avatar name={p.holder.name} src={p.holder.avatar ?? undefined} size="xs" /><span>{p.holder.name}</span></span>
        : <Badge tone="danger" variant="soft" dot>شاغر</Badge>,
    },
  ];

  const rowActions = (p: Position): MenuGroup[] =>
    p.holder
      ? [{
          header: "إجراءات", items: [
            { label: "استبدال الشاغل", icon: <ArrowsClockwise />, onSelect: () => openAssign(p, true) },
            { label: "إزالة من المنصب", icon: <Trash />, danger: true, onSelect: () => openRemove(p) },
          ],
        }]
      : [{ items: [{ label: "إسناد المنصب", icon: <UserPlus />, onSelect: () => openAssign(p, false) }] }];

  const empty = (
    <EmptyState variant="soft" icon={<MagnifyingGlass weight="duotone" />} title="لا مناصب مطابقة"
      description="جرّب تعديل البحث أو المرشّحات." action={<Button variant="ghost" size="md" onClick={() => { setSearch(""); setFv({}); }}>مسح المرشّحات</Button>} />
  );

  return (
    <div className="asg">
      <div className="asg-stats">
        <div className="stat-grid">
          <Stat icon={<Briefcase weight="fill" />} value={stats.total} label="منصبًا قياديًّا" tone="brand" />
          <Stat icon={<UserCheck weight="fill" />} value={stats.filled} label="مشغولة" tone="success" />
          <Stat icon={<UserMinus weight="fill" />} value={stats.vacant} label="شاغرة" tone="danger" />
        </div>
        <Link href="/dashboard/members/structure" className="org-btn org-link asg-tostruct"><TreeStructure weight="bold" /><span>عرض الهيكلة</span></Link>
      </div>

      <Toolbar
        searchPlaceholder="ابحث بالمنصب أو النطاق أو الشاغل…"
        search={search}
        onSearch={setSearch}
        filters={filters}
        filterValues={fv}
        onFilter={(k, v) => setFv((p) => ({ ...p, [k]: v }))}
        onReset={() => setFv({})}
      />

      <DataTable columns={columns} rows={rows} getRowId={(p) => p.key} rowActions={rowActions} emptyState={empty} />

      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal?.kind === "assign" ? `${modal.replace ? "استبدال" : "إسناد"}: ${modal.pos.roleAr}` : "إزالة من المنصب"}
        description={modal?.kind === "assign" ? `«${modal.pos.scope}»${modal.replace ? " — سيحلّ محلّ الشاغل الحاليّ" : ""}.` : undefined}
        size="sm"
        footer={
          modal?.kind === "assign" ? (
            <><Button variant="ghost" size="md" onClick={() => setModal(null)}>إلغاء</Button><Button variant="primary" size="md" loading={busy} disabled={!pick} onClick={submitAssign}>{modal.replace ? "استبدال" : "إسناد"}</Button></>
          ) : modal?.kind === "remove" ? (
            <><Button variant="ghost" size="md" onClick={() => setModal(null)}>إلغاء</Button><Button variant="danger" size="md" loading={busy} onClick={submitRemove}>إزالة</Button></>
          ) : null
        }
      >
        {modal?.kind === "assign" ? (
          <div className="org-modal">
            {modal.pos.holder ? <div className="org-modal-cur"><span className="org-sublbl">الشاغل الحاليّ</span><span className="asg-holder"><Avatar name={modal.pos.holder.name} src={modal.pos.holder.avatar ?? undefined} size="xs" /><span>{modal.pos.holder.name}</span></span></div> : null}
            {modal.pos.adminSlot ? (
              <Select label="الإدارة التابع لها" value={admin} onValueChange={(v) => setAdmin(v as "hr" | "qa")}
                options={[{ value: "hr", label: "الموارد البشرية" }, { value: "qa", label: "الضمان والجودة" }]} />
            ) : null}
            <Select label="العضو" options={memberOptions} value={pick} onValueChange={setPick} searchable />
          </div>
        ) : modal?.kind === "remove" && modal.pos.holder ? (
          <div className="org-modal">
            <span className="asg-holder"><Avatar name={modal.pos.holder.name} src={modal.pos.holder.avatar ?? undefined} size="sm" /><span>{modal.pos.holder.name} — {modal.pos.roleAr}</span></span>
            <p className="org-modal-warn">سيُلغى تفعيل هذا المنصب. لا يُحذف السجلّ نهائيًّا، لكن قد يُسحب ترشّح العضو الانتخابيّ إن كان قائمًا.</p>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
