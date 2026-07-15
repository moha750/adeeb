"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Badge, Button, Field, Select, Stat, Textarea } from "@adeeb/design-system";
import { Bank, Buildings, CaretDown, PencilSimple, UserCircle, UserPlus, Users, UsersThree, Warning, ArrowRight, NoteBlank, LinkSimple, Globe } from "@phosphor-icons/react";
import { Avatar } from "../../_components/Avatar";
import { Modal } from "../../_components/Modal";
import { Toolbar } from "../../_components/Toolbar";
import { useToast } from "../../_components/ToastProvider";
import { assignPosition, updateOrgUnit } from "./actions";
import type { StructureModel, Holder, CommitteeNode, DepartmentNode, UnitMeta } from "./model";

const ROLE_AR: Record<string, string> = {
  department_head: "منسّق قسم",
  committee_leader: "قائد لجنة",
  executive_council_president: "رئيس المجلس التنفيذي",
};

type ModalState =
  | { kind: "assign"; roleId: number; roleAr: string; scope: string; committeeId: number | null; departmentId: number | null }
  | { kind: "meta"; unit: UnitMeta }
  | null;

function Person({ h, role, tone }: { h: Holder; role?: boolean; tone?: "gold" | "steel" }) {
  return (
    <div className={"org-person" + (tone ? ` org-person-${tone}` : "")}>
      <Avatar name={h.name} src={h.avatar ?? undefined} size="sm" />
      <span className="org-person-tx"><b>{h.name}</b>{role ? <span>{h.roleAr}</span> : null}</span>
    </div>
  );
}
const Vacant = ({ label }: { label: string }) => <span className="org-vacant"><Warning weight="fill" /> {label}</span>;
const Fill = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button type="button" className="org-assign" onClick={onClick}><UserPlus weight="bold" /> {label}</button>
);
const MetaBtn = ({ onClick, light }: { onClick: () => void; light?: boolean }) => (
  <button type="button" className={"org-meta" + (light ? " lt" : "")} onClick={onClick} aria-label="تعديل البيانات" title="تعديل الوصف والرابط"><PencilSimple weight="bold" /></button>
);

function Committee({ c, q, open, onToggle, edit, onFill, onMeta }: {
  c: CommitteeNode; q: string; open: boolean; onToggle: () => void; edit: boolean;
  onFill: () => void; onMeta: () => void;
}) {
  const match = (n: string) => q === "" || n.includes(q);
  const members = q === "" ? c.members : c.members.filter((m) => match(m.name));
  const expanded = q !== "" ? true : open;
  const isOp = c.kind === "operational";
  return (
    <div className="org-com">
      <div className="org-com-head">
        <button type="button" className="org-com-toggle" onClick={onToggle} aria-expanded={expanded}>
          <CaretDown className={"org-caret" + (expanded ? " on" : "")} weight="bold" />
          <span className="org-com-name">{c.name}</span>
        </button>
        {c.leader ? (
          <span className="org-com-leader"><Avatar name={c.leader.name} src={c.leader.avatar ?? undefined} size="xs" /><span>{c.leader.name}</span></span>
        ) : edit && isOp ? (
          <Fill label="إسناد قائد" onClick={onFill} />
        ) : (
          <span className="org-com-leader org-com-leaderless"><Warning weight="fill" /> بلا قائد</span>
        )}
        {edit ? <MetaBtn onClick={onMeta} /> : null}
        <Badge tone="neutral" variant="soft"><Users weight="fill" /> {c.total}</Badge>
      </div>
      {expanded ? (
        <div className="org-com-body">
          {c.deputy ? <div className="org-subrow"><span className="org-sublbl">النائب</span><Person h={c.deputy} /></div> : null}
          {isOp ? (
            <>
              <div className="org-subrow">
                <span className="org-sublbl">مشرف الموارد</span>
                {c.hrOverseer ? <Person h={c.hrOverseer} role /> : <span className="org-ov-vac">— يُسنَد من «تعيين المناصب»</span>}
              </div>
              <div className="org-subrow">
                <span className="org-sublbl">مشرف الضمان</span>
                {c.qaOverseer ? <Person h={c.qaOverseer} role /> : <span className="org-ov-vac">— يُسنَد من «تعيين المناصب»</span>}
              </div>
            </>
          ) : null}
          {members.length ? (
            <div className="org-people">{members.map((m, i) => <Person key={m.userId + i} h={m} role={m.roleName !== "committee_member"} />)}</div>
          ) : <p className="org-empty">{q ? "لا مطابقون هنا." : "لا أعضاء بعد."}</p>}
        </div>
      ) : null}
    </div>
  );
}

export function StructureView({ model, members }: { model: StructureModel; members: { id: string; name: string }[] }) {
  const router = useRouter();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [showAnoms, setShowAnoms] = useState(false);
  const [edit, setEdit] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);
  const [pick, setPick] = useState("");
  const [desc, setDesc] = useState("");
  const [link, setLink] = useState("");
  const [busy, start] = useTransition();

  const q = query.trim();
  const match = (n: string) => q === "" || n.includes(q);
  const memberOptions = useMemo(() => members.map((m) => ({ value: m.id, label: m.name })), [members]);

  useEffect(() => {
    setPick("");
    if (modal?.kind === "meta") { setDesc(modal.unit.desc ?? ""); setLink(modal.unit.link ?? ""); }
  }, [modal]);

  const allComIds = useMemo(() => {
    const ids: number[] = [];
    model.executive.departments.forEach((d) => d.committees.forEach((c) => ids.push(c.id)));
    model.administrative.committees.forEach((c) => ids.push(c.id));
    return ids;
  }, [model]);
  const allOpen = expanded.size === allComIds.length && allComIds.length > 0;
  const toggleAll = () => setExpanded(allOpen ? new Set() : new Set(allComIds));
  const toggle = (id: number) => setExpanded((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const openFill = (roleName: string, scopeLabel: string, scope: { committeeId?: number; departmentId?: number }) => {
    const roleId = model.roleIds[roleName];
    if (!roleId) { toast.error("منصب غير معروف."); return; }
    setModal({ kind: "assign", roleId, roleAr: ROLE_AR[roleName] ?? roleName, scope: scopeLabel, committeeId: scope.committeeId ?? null, departmentId: scope.departmentId ?? null });
  };
  const openMeta = (unit: UnitMeta) => setModal({ kind: "meta", unit });

  const submitAssign = () => {
    if (modal?.kind !== "assign" || !pick) return;
    start(async () => {
      const r = await assignPosition({ userId: pick, roleId: modal.roleId, committeeId: modal.committeeId, departmentId: modal.departmentId });
      if (r.ok) { toast.success(r.message); setModal(null); router.refresh(); } else toast.error(r.message);
    });
  };
  const submitMeta = () => {
    if (modal?.kind !== "meta") return;
    start(async () => {
      const r = await updateOrgUnit({ kind: modal.unit.kind, id: modal.unit.id, description: desc, groupLink: link });
      if (r.ok) { toast.success(r.message); setModal(null); router.refresh(); } else toast.error(r.message);
    });
  };

  const comVisible = (c: CommitteeNode) => q === "" || (c.leader && match(c.leader.name)) || (c.deputy && match(c.deputy.name)) || c.members.some((m) => match(m.name));
  const deptVisible = (d: DepartmentNode) => q === "" || (d.head && match(d.head.name)) || d.committees.some(comVisible);

  const s = model.stats;
  const stats = [
    { n: s.councils, l: "مجالس", icon: <Bank weight="fill" /> },
    { n: s.departments, l: "أقسام", icon: <Buildings weight="fill" /> },
    { n: s.committees, l: "لجان", icon: <UsersThree weight="fill" /> },
    { n: s.people, l: "عضوًا نشطًا", icon: <UserCircle weight="fill" /> },
  ];

  return (
    <div className="org">
      <div className="stat-grid">{stats.map((x) => <Stat key={x.l} icon={x.icon} value={x.n} label={x.l} />)}</div>

      {model.anomalies.length ? (
        <Alert tone="warning" title={`${model.anomalies.length} ملاحظة على الهيكلة`}
          actions={<button type="button" className="cred-link" onClick={() => setShowAnoms((v) => !v)}>{showAnoms ? "إخفاء" : "التفاصيل"}</button>}>
          مناصب شاغرة أو لجان بلا قيادة. للإسناد السريع فعّل «تحرير»، وللإدارة الكاملة افتح <Link href="/dashboard/members/assignments" className="cred-link">تعيين المناصب</Link>.
          {showAnoms ? <ul className="org-anoms">{model.anomalies.map((a, i) => <li key={i}>{a}</li>)}</ul> : null}
        </Alert>
      ) : null}

      <Toolbar
        searchPlaceholder="ابحث عن عضو بالاسم…"
        search={query}
        onSearch={setQuery}
        actions={
          <>
            <button type="button" className="org-btn" onClick={toggleAll}>{allOpen ? "طيّ الكلّ" : "توسيع الكلّ"}</button>
            <button type="button" className={"org-btn org-editbtn" + (edit ? " on" : "")} onClick={() => setEdit((v) => !v)}><PencilSimple weight="bold" /> {edit ? "إنهاء التحرير" : "تحرير"}</button>
            <Link href="/dashboard/members/assignments" className="org-btn org-link"><span>تعيين المناصب</span><ArrowRight weight="bold" /></Link>
          </>
        }
      />

      {(model.president || model.advisors.length) ? (
        <section className="org-sec">
          <h3 className="org-sec-h">قيادة النادي</h3>
          <div className="org-people">
            {model.president && match(model.president.name) ? <Person h={model.president} role tone="gold" /> : null}
            {model.advisors.filter((a) => match(a.name)).map((a, i) => <Person key={i} h={a} role tone="steel" />)}
          </div>
        </section>
      ) : null}

      <section className="org-council">
        <div className="org-council-h org-council-exec">
          <div className="org-council-t"><h3>{model.executive.name}</h3>{edit ? <MetaBtn light onClick={() => openMeta({ kind: "council", id: model.executive.id, name: model.executive.name, desc: model.executive.desc, link: model.executive.link })} /> : null}</div>
          {model.executive.president ? <Person h={model.executive.president} tone="gold" /> : edit ? <Fill label="إسناد رئيس المجلس" onClick={() => openFill("executive_council_president", "المجلس التنفيذي", {})} /> : <Vacant label="بلا رئيس مجلس" />}
        </div>
        <div className="org-depts">
          {model.executive.departments.filter(deptVisible).map((d) => (
            <div key={d.id} className="org-dept">
              <div className="org-dept-h">
                <div className="org-council-t"><span className="org-dept-name">{d.name}</span>{edit ? <MetaBtn onClick={() => openMeta({ kind: "department", id: d.id, name: d.name, desc: d.desc, link: d.link })} /> : null}</div>
                {d.head ? <Person h={d.head} /> : edit ? <Fill label="إسناد منسّق قسم" onClick={() => openFill("department_head", d.name, { departmentId: d.id })} /> : <Vacant label="بلا منسّق قسم" />}
              </div>
              <div className="org-coms">
                {d.committees.filter(comVisible).map((c) => (
                  <Committee key={c.id} c={c} q={q} open={expanded.has(c.id)} onToggle={() => toggle(c.id)} edit={edit}
                    onFill={() => openFill("committee_leader", c.name, { committeeId: c.id })}
                    onMeta={() => openMeta({ kind: "committee", id: c.id, name: c.name, desc: c.desc, link: c.link })} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="org-council">
        <div className="org-council-h org-council-admin">
          <div className="org-council-t"><h3>{model.administrative.name}</h3>{edit ? <MetaBtn light onClick={() => openMeta({ kind: "council", id: model.administrative.id, name: model.administrative.name, desc: model.administrative.desc, link: model.administrative.link })} /> : null}</div>
          <div className="org-people">{model.administrative.leaders.filter((l) => match(l.name)).map((l, i) => <Person key={i} h={l} role tone="steel" />)}</div>
        </div>
        <div className="org-coms org-coms-admin">
          {model.administrative.committees.filter(comVisible).map((c) => (
            <Committee key={c.id} c={c} q={q} open={expanded.has(c.id)} onToggle={() => toggle(c.id)} edit={edit}
              onFill={() => {}} onMeta={() => openMeta({ kind: "committee", id: c.id, name: c.name, desc: c.desc, link: c.link })} />
          ))}
        </div>
      </section>

      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal?.kind === "assign" ? `إسناد ${modal.roleAr}` : modal?.kind === "meta" ? `تعديل «${modal.unit.name}»` : ""}
        description={modal?.kind === "assign" ? `اختر من يشغل هذا المنصب في «${modal.scope}».` : modal?.kind === "meta" ? "الوصف ورابط قروب الواتساب (الاسم غير قابل للتعديل)." : undefined}
        size="sm"
        footer={
          modal?.kind === "assign" ? (
            <><Button variant="ghost" size="md" onClick={() => setModal(null)}>إلغاء</Button><Button variant="primary" size="md" loading={busy} disabled={!pick} onClick={submitAssign}>إسناد</Button></>
          ) : modal?.kind === "meta" ? (
            <><Button variant="ghost" size="md" onClick={() => setModal(null)}>إلغاء</Button><Button variant="primary" size="md" loading={busy} onClick={submitMeta}>حفظ</Button></>
          ) : null
        }
      >
        {modal?.kind === "assign" ? (
          <div className="org-modal"><Select label="العضو" options={memberOptions} value={pick} onValueChange={setPick} searchable /></div>
        ) : modal?.kind === "meta" ? (
          <div className="org-modal">
            <Textarea label="الوصف" icon={<NoteBlank />} innerIcon={<PencilSimple />} placeholder="اكتب هنا…" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} />
            <Field label="رابط قروب الواتساب" icon={<LinkSimple />} innerIcon={<Globe />} placeholder="https://chat.whatsapp.com/…" type="url" dir="ltr" value={link} onChange={(e) => setLink(e.target.value)} helper="اتركه فارغًا إن لا يوجد." />
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
