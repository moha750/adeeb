"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Badge, Button, Field, Stat, Textarea } from "@adeeb/design-system";
import { Bank, Buildings, CaretDown, PencilSimple, Users, UsersThree, Warning, ArrowRight, NoteBlank, LinkSimple, Globe } from "@phosphor-icons/react";
import { Avatar } from "../../_components/Avatar";
import { Modal } from "../../_components/Modal";
import { Toolbar } from "../../_components/Toolbar";
import { useToast } from "../../_components/ToastProvider";
import { updateOrgUnit } from "./actions";
import type { StructureModel, Holder, CommitteeNode, CouncilBody, DepartmentNode, UnitMeta } from "./model";

// تبويب الهيكلة يعرض ولا يُسنِد — الإسناد كلّه في «تعيين المناصب»، مسارُ كتابةٍ واحد.
// فلا يبقى هنا إلّا تحرير البيانات الوصفيّة (الوصف ورابط القروب).
type ModalState = { kind: "meta"; unit: UnitMeta } | null;

function Person({ h, role, tone }: { h: Holder; role?: boolean; tone?: "gold" | "steel" }) {
  return (
    <div className={"org-person" + (tone ? ` org-person-${tone}` : "")}>
      <Avatar name={h.name} src={h.avatar ?? undefined} size="sm" />
      <span className="org-person-tx"><b>{h.name}</b>{role ? <span>{h.roleAr}</span> : null}</span>
    </div>
  );
}
const Vacant = ({ label }: { label: string }) => <span className="org-vacant"><Warning weight="fill" /> {label}</span>;

// المجلس هيئةٌ لا حاوية: مقاعده تُقرأ من القاعدة (roles.membership_kind='member')،
// ورئيسه من councils.head_role_name. أضِف دورًا عضوًا في القاعدة فيظهر هنا بلا شيفرة.
function Seats({ body, q }: { body: CouncilBody; q: string }) {
  const match = (n: string) => q === "" || n.includes(q);
  return (
    <div className="org-seats">
      {body.seats.map((s) => {
        const shown = s.holders.filter((h) => match(h.name));
        if (q !== "" && shown.length === 0) return null;
        return (
          <div key={s.roleName} className="org-seat">
            <span className="org-seat-lbl">
              {s.roleAr}
              {s.isHead ? <Badge tone="warning" variant="soft">يرأس المجلس</Badge> : null}
            </span>
            {shown.length ? (
              <div className="org-people">
                {shown.map((h, i) => <Person key={h.userId + i} h={h} tone={s.isHead ? "gold" : "steel"} />)}
              </div>
            ) : <Vacant label="شاغر" />}
          </div>
        );
      })}
    </div>
  );
}
const MetaBtn = ({ onClick, light }: { onClick: () => void; light?: boolean }) => (
  <button type="button" className={"org-meta" + (light ? " lt" : "")} onClick={onClick} aria-label="تعديل البيانات" title="تعديل الوصف والرابط"><PencilSimple weight="bold" /></button>
);

function Committee({ c, q, open, onToggle, edit, onMeta }: {
  c: CommitteeNode; q: string; open: boolean; onToggle: () => void; edit: boolean; onMeta: () => void;
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

export function StructureView({ model }: { model: StructureModel }) {
  const router = useRouter();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [showAnoms, setShowAnoms] = useState(false);
  const [edit, setEdit] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);
  const [desc, setDesc] = useState("");
  const [link, setLink] = useState("");
  const [busy, start] = useTransition();

  const q = query.trim();
  const match = (n: string) => q === "" || n.includes(q);


  const allComIds = useMemo(() => {
    const ids: number[] = [];
    model.executive.departments.forEach((d) => d.committees.forEach((c) => ids.push(c.id)));
    model.administrative.committees.forEach((c) => ids.push(c.id));
    return ids;
  }, [model]);
  const allOpen = expanded.size === allComIds.length && allComIds.length > 0;
  const toggleAll = () => setExpanded(allOpen ? new Set() : new Set(allComIds));
  const toggle = (id: number) => setExpanded((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // تُملأ الحقول عند الفتح لا في أثرٍ لاحق — فلا رسمَ متتالٍ (cascading render).
  const openMeta = (unit: UnitMeta) => {
    setDesc(unit.desc ?? "");
    setLink(unit.link ?? "");
    setModal({ kind: "meta", unit });
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

  // طبقات الهيكلة الأربع بترتيبها: مجالس ← إدارات/أقسام ← لجان.
  // «عضو نشط» لا مكان له هنا — هذا تبويب الهيكلة لا تبويب الأعضاء،
  // والإدارة تُعدّ على حدة وإن سكنت جدول اللجان.
  const s = model.stats;
  const stats = [
    { n: s.councils, l: "مجالس", icon: <Bank weight="fill" /> },
    { n: s.administrations, l: "إدارات", icon: <Bank weight="fill" /> },
    { n: s.departments, l: "أقسام", icon: <Buildings weight="fill" /> },
    { n: s.committees, l: "لجان", icon: <UsersThree weight="fill" /> },
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

      {/* «قيادة النادي» كانت قسمًا محفورًا يطفو فوق الشجرة، ويعرض رئيس النادي
          مرّةً ثانية — فهو أصلًا عضوٌ في المجلس الإداريّ ورئيسُه، والقاعدة تقولها
          (council_type + membership_kind + head_role_name). حُذف: مصدرٌ واحد لا اثنان. */}
      <section className="org-council">
        <div className="org-council-h org-council-admin">
          <div className="org-council-t"><h3>{model.administrative.name}</h3>{edit ? <MetaBtn light onClick={() => openMeta({ kind: "council", id: model.administrative.id, name: model.administrative.name, desc: model.administrative.desc, link: model.administrative.link })} /> : null}</div>
          <Seats body={model.administrative} q={q} />
        </div>
        <div className="org-coms org-coms-admin">
          {model.administrative.committees.filter(comVisible).map((c) => (
            <Committee key={c.id} c={c} q={q} open={expanded.has(c.id)} onToggle={() => toggle(c.id)}
              edit={edit} onMeta={() => openMeta({ kind: "committee", id: c.id, name: c.name, desc: c.desc, link: c.link })} />
          ))}
        </div>
      </section>

      <section className="org-council">
        <div className="org-council-h org-council-exec">
          <div className="org-council-t"><h3>{model.executive.name}</h3>{edit ? <MetaBtn light onClick={() => openMeta({ kind: "council", id: model.executive.id, name: model.executive.name, desc: model.executive.desc, link: model.executive.link })} /> : null}</div>
          <Seats body={model.executive} q={q} />
        </div>
        <div className="org-depts">
          {model.executive.departments.filter(deptVisible).map((d) => (
            <div key={d.id} className="org-dept">
              <div className="org-dept-h">
                <div className="org-council-t"><span className="org-dept-name">{d.name}</span>{edit ? <MetaBtn onClick={() => openMeta({ kind: "department", id: d.id, name: d.name, desc: d.desc, link: d.link })} /> : null}</div>
                {d.head ? <Person h={d.head} /> : <Vacant label="بلا منسّق قسم" />}
              </div>
              <div className="org-coms">
                {d.committees.filter(comVisible).map((c) => (
                  <Committee key={c.id} c={c} q={q} open={expanded.has(c.id)} onToggle={() => toggle(c.id)}
                    edit={edit} onMeta={() => openMeta({ kind: "committee", id: c.id, name: c.name, desc: c.desc, link: c.link })} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal?.kind === "meta" ? `تعديل «${modal.unit.name}»` : ""}
        description={modal?.kind === "meta" ? "الوصف ورابط قروب الواتساب (الاسم غير قابل للتعديل)." : undefined}
        size="sm"
        footer={
          modal?.kind === "meta" ? (
            <><Button variant="ghost" size="md" onClick={() => setModal(null)}>إلغاء</Button><Button variant="primary" size="md" loading={busy} onClick={submitMeta}>حفظ</Button></>
          ) : null
        }
      >
        {modal?.kind === "meta" ? (
          <div className="org-modal">
            <Textarea label="الوصف" icon={<NoteBlank />} innerIcon={<PencilSimple />} placeholder="اكتب هنا…" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} />
            <Field label="رابط قروب الواتساب" icon={<LinkSimple />} innerIcon={<Globe />} placeholder="https://chat.whatsapp.com/…" type="url" charset="latin" value={link} onChange={(e) => setLink(e.target.value)} helper="اتركه فارغًا إن لا يوجد." />
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
