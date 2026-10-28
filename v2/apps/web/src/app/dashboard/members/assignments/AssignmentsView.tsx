"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Modal, Stat, matchesSearch } from "@adeeb/design-system";
import { Briefcase, CalendarBlank, CalendarCheck, CalendarX, UserCheck, UserMinus } from "@phosphor-icons/react";
import { clubDayKey } from "@/lib/dates";
import { ConfirmDialog } from "../../_components/ConfirmDialog";
import { MagnifyingGlass } from "@/app/_components/glyphs";
import { UnitIconNodesProvider } from "../../_components/UnitIcon";
import { StatsScope, scopeLabels } from "../../_components/StatsScope";
import { Toolbar, type FilterDef } from "../../_components/Toolbar";
import { EmptyState } from "../../_components/EmptyState";
import { useToast } from "../../_components/ToastProvider";
import { applyPositionBatch, assignActing, assignPosition, cancelPositionBatch, endActing, extendActing, loadActingCandidates, removePosition, createOrgUnit, updateOrgUnit, type ActingCandidate } from "../structure/actions";
import type { Holder, Position, RawCommittee, RawCouncil, RawDept } from "../structure/model";
import { SeatBoard, buildSeatBoard, type SeatActions } from "./SeatBoard";
import { AssignmentModal, type AssignState, type AssignSubmit, type MemberOption } from "./AssignmentModal";
import { ScheduledBatches } from "./ScheduledBatches";
import type { ScheduledBatch } from "./batches";
import { ActingModal, type ActingSeat, type ActingValues } from "./ActingModal";
import { UnitEditModal, type EditableUnit, type UnitValues } from "./UnitEditModal";

export function AssignmentsView({ positions, units, members, canEditUnits, iconNodes = {}, batches = [] }: {
  positions: Position[];
  /** الأقسامُ واللجان بترتيبها: منها تُبنى لوحةُ المقاعد (المجلس، ثمّ كلُّ قسمٍ ولجانُه). */
  units: { councils: RawCouncil[]; departments: RawDept[]; committees: RawCommittee[] };
  members: MemberOption[];
  /** «تعديل الوحدة» و«إضافة لجنة/قسم» لمن يملك `manage_positions` وحده (الخادمُ يقفل الحفظَ بالقدرة نفسها). */
  canEditUnits: boolean;
  /** رسومُ أيقونات الوحدات من خارج المقترحة (رسمها الخادمُ من المكتبة). */
  iconNodes?: Record<string, React.ReactNode>;
  /** دفعاتُ المناصب المجدولة (٢٠٢٦-١٠-٢٣): تُعرض فوق اللوحة بأيّامها، وتُلغى من هنا. */
  batches?: ScheduledBatch[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [fv, setFv] = useState<Record<string, string>>({});
  const [modal, setModal] = useState<AssignState | null>(null);
  // كلُّ فتحٍ للمحرّر نافذةٌ جديدة بحالتها (الاختيار والنقلات والتاريخ والسبب): مفتاحُها يتجدّد
  const [modalSeq, setModalSeq] = useState(0);
  const [cancelFor, setCancelFor] = useState<ScheduledBatch | null>(null);
  const [busy, start] = useTransition();
  // التكليف (20261010): المقعدُ المفتوح للتكليف وبِركتُه (تُجلب عند الفتح لأنّها تتبع الدور)،
  // والشاغلُ المكلَّف الذي يُعدَّل آخرُ يومه أو يُنهى تكليفه.
  const [acting, setActing] = useState<{ position: Position; seat: ActingSeat } | null>(null);
  const [actingPool, setActingPool] = useState<ActingCandidate[] | null>(null);
  const [extendFor, setExtendFor] = useState<Holder | null>(null);
  const [extendUntil, setExtendUntil] = useState("");
  const [endFor, setEndFor] = useState<Holder | null>(null);
  // الوحدةُ المفتوحة في نافذتها: للتعديل من زرّ رأس القسم أو اسم اللجنة، وللإنشاء (بلا معرّف) من «إضافة لجنة/قسم»
  const [editUnit, setEditUnit] = useState<EditableUnit | null>(null);

  /**
   * **النطاقُ** (ق١٧): المجلسُ وحدَه. ومرشِّحُ **الحالة** يُستثنى: بطاقتا «شاغرة» و«مشغولة»
   * تفصيلُ الشغور نفسِه، والبُعدُ لا يُطبَّق على بطاقةٍ موضوعُها هو. والبحثُ لا يدخل النطاق.
   */
  const scope = useMemo(
    () => positions.filter((p) => !fv.council || p.council === fv.council),
    [positions, fv.council],
  );

  // ما يُعرض: المرشِّحان والبحث عدسةٌ على اللوحة (يُسقط المقعدَ، فاللجنةَ الفارغة، فالقسمَ الفارغ)
  const visible = useMemo(() => {
    const inScope = new Set(scope.map((p) => p.key));
    return (p: Position) => {
      if (!inScope.has(p.key)) return false;
      if (!matchesSearch(search, p.roleAr, p.scope, ...p.holders.map((h) => h.name))) return false;
      if (fv.status === "vacant" && p.holders.length > 0) return false;
      if (fv.status === "filled" && p.holders.length === 0) return false;
      return true;
    };
  }, [scope, search, fv.status]);
  const board = useMemo(() => buildSeatBoard(positions, units.departments, units.committees, units.councils), [positions, units]);
  const anyVisible = positions.some(visible);

  const filters: FilterDef[] = [
    { key: "council", label: "المجلس", options: [{ value: "administrative", label: "المجلس الإداري" }, { value: "executive", label: "المجلس التشغيلي" }] },
    { key: "status", label: "الحالة", options: [{ value: "vacant", label: "الشاغرة" }, { value: "filled", label: "المشغولة" }] },
  ];

  const stats = useMemo(() => ({
    total: scope.length,
    vacant: scope.filter((p) => p.holders.length === 0).length,
    filled: scope.filter((p) => p.holders.length > 0).length,
  }), [scope]);

  // تُهيَّأ الحالة عند الفتح لا في أثرٍ بعده — فلا رسمَ متتالٍ (cascading render).
  const openAssign = (pos: Position, replace: boolean) => {
    setModalSeq((n) => n + 1);
    setModal({ kind: "assign", position: pos, replace });
  };
  const openRemove = (pos: Position, holder: Holder) => {
    setModalSeq((n) => n + 1);
    setModal({ kind: "remove", position: pos, holder });
  };

  const openAct = (pos: Position) => {
    const owner = pos.holders.find((h) => h.frozen) ?? null;
    setActingPool(null);
    setActing({ position: pos, seat: { roleAr: pos.roleAr, scope: pos.scope, owner: owner ? { name: owner.name, gender: owner.gender } : null } });
    void loadActingCandidates(pos.roleName).then((r) => {
      if (!r.ok) toast.error(r.message ?? "تعذّر جلب المرشّحين.");
      setActingPool(r.members);
    });
  };
  const submitActing = (v: ActingValues) => {
    if (!acting) return;
    const pos = acting.position;
    start(async () => {
      const r = await assignActing({ userId: v.userId, roleName: pos.roleName, committeeId: pos.committeeId, departmentId: pos.departmentId, until: v.until, freeze: v.freeze, reason: v.reason });
      if (r.ok) { toast.success(r.message); setActing(null); router.refresh(); } else toast.error(r.message);
    });
  };
  const submitExtend = () => {
    const rowId = extendFor?.rowId;
    if (!rowId || !extendUntil) return;
    start(async () => {
      const r = await extendActing({ rowId, until: extendUntil });
      if (r.ok) { toast.success(r.message); setExtendFor(null); router.refresh(); } else toast.error(r.message);
    });
  };
  const submitEnd = () => {
    const rowId = endFor?.rowId;
    if (!rowId) return;
    start(async () => {
      const r = await endActing({ rowId });
      if (r.ok) { toast.success(r.message); setEndFor(null); router.refresh(); } else toast.error(r.message);
    });
  };

  const submitUnit = (v: UnitValues) => {
    const u = editUnit;
    if (!u) return;
    start(async () => {
      // المجلسُ يُعدَّل بلا أيقونة (لا عمودَ لها، و`updateOrgUnit` يردّها له)، ولا يُنشأ
      const r = u.kind === "council"
        ? await updateOrgUnit({ kind: "council", id: String(u.id), description: v.description, groupLink: v.link })
        : u.id == null
        ? await createOrgUnit({ kind: u.kind, name: v.name, departmentId: u.parent?.id ?? null, icon: v.icon, description: v.description, groupLink: v.link })
        : await updateOrgUnit({ kind: u.kind, id: u.id, icon: v.icon, description: v.description, groupLink: v.link });
      if (r.ok) { toast.success(r.message); setEditUnit(null); router.refresh(); } else toast.error(r.message);
    });
  };

  // الإسناد: نقلةٌ واحدةٌ بسيطة تمرّ بـ`assign_position` كما كانت، وما سواها دفعةٌ (`create_position_batch`):
  // نقلاتٌ معًا، أو تاريخُ سريان، أو سبب. والمحرّرُ يملك الشكل، والمنطقُ هنا.
  const submitAssign = (v: AssignSubmit) => {
    if (!modal || modal.kind !== "assign") return;
    start(async () => {
      const m = v.moves[0];
      const r = v.simple
        ? await assignPosition({ userId: m.userId, roleName: m.roleName, committeeId: m.committeeId, departmentId: m.departmentId, replace: modal.replace })
        : await applyPositionBatch({ moves: v.moves, effectiveOn: v.effectiveOn, reason: v.reason });
      if (r.ok) { toast.success(r.message); setModal(null); router.refresh(); } else toast.error(r.message);
    });
  };
  const submitRemove = () => {
    if (!modal || modal.kind !== "remove") return;
    const h = modal.holder;
    start(async () => {
      const r = await removePosition({ userId: h.userId, roleName: h.roleName, committeeId: h.committeeId });
      if (r.ok) { toast.success(r.message); setModal(null); router.refresh(); } else toast.error(r.message);
    });
  };
  const submitCancelBatch = () => {
    const b = cancelFor;
    if (!b) return;
    start(async () => {
      const r = await cancelPositionBatch({ id: b.id });
      if (r.ok) { toast.success(r.message); setCancelFor(null); router.refresh(); } else toast.error(r.message);
    });
  };

  // أبوابُ المقعد في لوحة المقاعد: الأفعالُ نفسُها، والمكوّنُ يرسم أزرارَها ظاهرةً لا في قائمة.
  const seatActions: SeatActions = {
    onAssign: (p) => openAssign(p, false),
    onReplace: (p) => openAssign(p, true),
    onRemove: (p, h) => openRemove(p, h),
    onAct: (p) => openAct(p),
    onExtend: (h) => { setExtendUntil(h.acting?.until ?? ""); setExtendFor(h); },
    onEnd: (h) => setEndFor(h),
    onEditUnit: canEditUnits ? (u) => setEditUnit(u) : undefined,
    onAddUnit: canEditUnits && !search.trim() && !fv.status && !fv.council ? (u) => setEditUnit(u) : undefined,
  };

  const empty = (
    <EmptyState variant="soft" icon={<MagnifyingGlass />} title="لا مناصب مطابقة"
      description="جرّب تعديل البحث أو المرشّحات." action={<Button variant="ghost" size="md" onClick={() => { setSearch(""); setFv({}); }}>مسح المرشّحات</Button>} />
  );

  return (
    <UnitIconNodesProvider nodes={iconNodes}>
    <div className="asg">
      <StatsScope
        labels={scopeLabels(filters.filter((d) => d.key === "council"), fv)}
        onClear={() => setFv((f) => ({ ...f, council: "" }))}
      />

      <div className="stat-grid">
        <Stat icon={<Briefcase />} value={stats.total} label="منصبًا قياديًّا" tone="brand" />
        <Stat icon={<UserCheck />} value={stats.filled} label="مشغولة" tone="success" />
        <Stat icon={<UserMinus />} value={stats.vacant} label="شاغرة" tone="danger" />
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

      <ScheduledBatches batches={batches} busy={busy} onCancel={setCancelFor} />

      {anyVisible ? <SeatBoard model={board} actions={seatActions} visible={visible} /> : empty}

      <AssignmentModal
        key={`asg-${modalSeq}`}
        state={modal}
        members={members}
        positions={positions}
        committees={units.committees}
        departments={units.departments}
        busy={busy}
        onClose={() => setModal(null)}
        onAssign={submitAssign}
        onRemove={submitRemove}
      />

      <ConfirmDialog
        open={cancelFor !== null}
        onClose={() => setCancelFor(null)}
        tone="danger"
        icon={<CalendarX />}
        title="إلغاء التغييرات المجدولة؟"
        text={cancelFor ? `لن تُطبَّق نقلاتها (${cancelFor.moves.length}) في يومها.` : undefined}
        confirmLabel="إلغاء الدفعة"
        cancelLabel="إبقاؤها"
        onConfirm={submitCancelBatch}
        loading={busy}
      />

      <ActingModal
        key={acting?.position.key ?? "none"}
        seat={acting?.seat ?? null}
        members={actingPool}
        busy={busy}
        onClose={() => setActing(null)}
        onSubmit={submitActing}
      />

      <Modal
        open={extendFor !== null}
        onClose={() => setExtendFor(null)}
        busy={busy}
        size="sm"
        title="تعديل آخر يوم في التكليف"
        description={extendFor?.name}
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setExtendFor(null)} disabled={busy}>إلغاء</Button>
            <Button variant="primary" size="md" loading={busy} disabled={!extendUntil || extendUntil === extendFor?.acting?.until} onClick={submitExtend}>حفظ</Button>
          </>
        }
      >
        <Field
          label="آخر يوم في التكليف"
          icon={<CalendarBlank />}
          innerIcon={<CalendarCheck />}
          placeholder="اختر التاريخ"
          type="date"
          min={clubDayKey(new Date().toISOString())}
          value={extendUntil}
          onChange={(e) => setExtendUntil(e.target.value)}
          required
        />
      </Modal>

      <UnitEditModal key={editUnit ? `unit-${editUnit.kind}-${editUnit.id ?? `new-${editUnit.parent?.id ?? ""}`}` : "unit-none"} unit={editUnit} busy={busy}
        onClose={() => setEditUnit(null)} onSubmit={submitUnit} />

      <ConfirmDialog
        open={endFor !== null}
        onClose={() => setEndFor(null)}
        tone="warning"
        icon={<CalendarX />}
        title="إنهاء التكليف؟"
        text={endFor ? `ينتهي تكليف ${endFor.name} الآن.` : undefined}
        confirmLabel="إنهاء التكليف"
        onConfirm={submitEnd}
        loading={busy}
      />
    </div>
    </UnitIconNodesProvider>
  );
}
