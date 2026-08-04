"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Textarea, matchesSearch } from "@adeeb/design-system";
import { PencilSimple, NoteBlank, LinkSimple, Globe } from "@phosphor-icons/react";
import { Modal } from "../../_components/Modal";
import { Toolbar } from "../../_components/Toolbar";
import { useToast } from "../../_components/ToastProvider";
import { updateOrgUnit } from "./actions";
import { Committee, MetaBtn, Person, Seats, Vacant } from "./tree";
import type { StructureModel, CommitteeNode, DepartmentNode, UnitMeta } from "./model";

// توجّه «الشجرة الحيّة» — الهرم موصولًا: مجالس ← أقسام ← لجان.
// يعرض ويحرّر البيانات الوصفيّة؛ الإسناد كلّه في «تعيين المناصب».
type ModalState = { kind: "meta"; unit: UnitMeta } | null;

export function TreeView({ model }: { model: StructureModel }) {
  const router = useRouter();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [edit, setEdit] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);
  const [desc, setDesc] = useState("");
  const [link, setLink] = useState("");
  const [busy, start] = useTransition();

  const q = query.trim();
  const match = (n: string) => matchesSearch(q, n);

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

  return (
    <>
      <Toolbar
        searchPlaceholder="ابحث عن عضو بالاسم…"
        search={query}
        onSearch={setQuery}
        actions={
          <>
            <button type="button" className="org-btn" onClick={toggleAll}>{allOpen ? "طيّ الكلّ" : "توسيع الكلّ"}</button>
            <button type="button" className={"org-btn org-editbtn" + (edit ? " on" : "")} onClick={() => setEdit((v) => !v)}><PencilSimple /> {edit ? "إنهاء التحرير" : "تحرير"}</button>
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
        busy={busy}
        title={modal?.kind === "meta" ? `تعديل «${modal.unit.name}»` : ""}
        description={modal?.kind === "meta" ? "الوصف ورابط قروب الواتساب (الاسم غير قابل للتعديل)." : undefined}
        size="sm"
        footer={
          modal?.kind === "meta" ? (
            <><Button variant="ghost" size="md" onClick={() => setModal(null)} disabled={busy}>إلغاء</Button><Button variant="primary" size="md" loading={busy} onClick={submitMeta}>حفظ</Button></>
          ) : null
        }
      >
        {modal?.kind === "meta" ? (
          <div className="org-modal">
            <Textarea label="الوصف" icon={<NoteBlank />} innerIcon={<PencilSimple />} placeholder="اكتب هنا…" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} optional />
            <Field label="رابط قروب الواتساب" icon={<LinkSimple />} innerIcon={<Globe />} placeholder="https://chat.whatsapp.com/…" type="url" charset="latin" value={link} onChange={(e) => setLink(e.target.value)} helper="اتركه فارغًا إن لا يوجد." optional />
          </div>
        ) : null}
      </Modal>
    </>
  );
}
