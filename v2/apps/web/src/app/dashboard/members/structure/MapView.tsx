"use client";

import { useMemo, useState } from "react";
import { Accordion, Badge, Button, Card, CardBody, CardHeader, Modal, ModalSectionHeading, matchesSearch } from "@adeeb/design-system";
import { Bank, Buildings, MapPin, Scales, UsersFour, UsersThree } from "@phosphor-icons/react";
import { CaretLeft, WhatsappLogo } from "@/app/_components/glyphs";
import { Toolbar } from "../../_components/Toolbar";
import { Avatar } from "../../_components/Avatar";
import { AvatarStack } from "../../_components/AvatarStack";
import { Person } from "./tree";
import type { CommitteeNode, CouncilBody, DepartmentNode, Holder, StructureModel } from "./model";

/**
 * **خريطة العضو** — الجيل الثاني من شجرة الهيكلة، مقترحٌ ينتظر إقرار المالك.
 * فإن أُقِرّ حلّ محلّ الشجرات الثلاث وأخذ اسمها؛ لا يُترك رابعًا يُصان.
 *
 * ### الفكرة التي تحكم الشكل
 * الجيل الأوّل كان **جدارًا**: سطحٌ واحدٌ طويل تتساوى فيه مئةُ صفٍّ بارتفاعٍ ولونٍ وخطٍّ واحد،
 * فلا تجد العينُ فيه مبتدأً ولا منتهى. وعلاجُه ليس تجميلَ الصفوف بل **تفكيك الجدار**:
 *
 *   ١) **بطلٌ واحدٌ في الصدر** — «موقعك في أديب». العضوُ يفتح الشاشة وسؤالُه الأوّل عن نفسه،
 *      فيُجاب قبل أن يسأل، ويبقى ما تحته هادئًا لا ينازعه.
 *   ٢) **شبكةُ كروتٍ لا قائمة** — كلّ وحدةٍ كرتٌ له رأسٌ واسم ووصف، فالفجواتُ بين الكروت هي
 *      التنفّس الذي لم يكن في الجدار، وكلُّ كرتٍ قطعةٌ تُلتقَط وحدها.
 *   ٣) **الوجوهُ بدل السطور** — كومةُ أفتارٍ تقول «من فيها وكم هم» في مساحةِ سطر، فيسقط
 *      اثنا عشر صفًّا مكتوبًا كانت تتكرّر فيها عبارةُ «قائد اللجنة:» اثنتي عشرة مرّة.
 *   ٤) **التفصيلُ في طبقةٍ لا في العمود** — من أراد لجنةً بعينها فتحها في نافذة. الصفحةُ
 *      تُجيب «ما هيكل أديب؟»، والنافذةُ تُجيب «من في هذه اللجنة؟» — سؤالان لا يُخلطان في سطح.
 *
 * ولغةُ الشاغر تلين: «لم يُنتخب بعد» للمنتخَب و«لم يُعيَّن بعد» للمعيَّن (`roles.is_elected`) —
 * الشاغرُ في شاشة الرئيس عملٌ ينتظره، وفي شاشة العضو حالٌ يُخبَر بها.
 */

/** موضعُ القارئ من الهيكل — تبنيه الصفحة من صفوفه هو، ويقرؤه العرض بطلًا ووسمًا. */
export type YouAre = {
  committees: number[];
  departments: number[];
  councils: string[];
  /** لجنتُه التنفيذيّة — بطلُ الصدر. */
  home: number | null;
};

export const NO_YOU: YouAre = { committees: [], departments: [], councils: [], home: null };

const vacantWord = (elected: boolean) => (elected ? "لم يُنتخب بعد" : "لم يُعيَّن بعد");

/** أهلُ اللجنة كلُّهم في قائمةٍ واحدة — تقرؤها الكومةُ والنافذة معًا (لا عدّتان تفترقان). */
const peopleOf = (c: CommitteeNode): Holder[] => [c.leader, c.deputy, ...c.members].filter(Boolean) as Holder[];

const matchCommittee = (q: string, c: CommitteeNode) =>
  matchesSearch(q, c.name, c.desc) || peopleOf(c).concat([c.hrOverseer, c.qaOverseer].filter(Boolean) as Holder[]).some((h) => matchesSearch(q, h.name));

// ═══ صفُّ لجنةٍ داخل كرت وحدتها: اسمٌ ووجوهٌ وعدد. النقرُ يفتح تفصيلها في نافذة ═══
function CommitteeRow({ c, mine, onOpen }: { c: CommitteeNode; mine: boolean; onOpen: () => void }) {
  const people = peopleOf(c);
  return (
    <button type="button" className={"omap-com" + (mine ? " mine" : "")} onClick={onOpen}>
      <span className="omap-com-nm">{c.name}</span>
      {mine ? <Badge tone="info" variant="soft">أنت هنا</Badge> : null}
      {people.length ? <AvatarStack people={people} max={4} size="xs" /> : <span className="omap-vac">لا أعضاء بعد</span>}
      <CaretLeft className="omap-com-go" aria-hidden />
    </button>
  );
}

// ═══ نافذةُ اللجنة: الجواب الكامل حين يُطلَب ═══
function CommitteeModal({ c, mine, onClose }: { c: CommitteeNode | null; mine: boolean; onClose: () => void }) {
  if (!c) return null;
  const isOp = c.kind === "operational";
  const seat = (label: string, h: Holder | null, none: string) => (
    <div className="omap-seatrow">
      <span className="omap-seat-lbl">{label}</span>
      {h ? <Person h={h} /> : <span className="omap-vac">{none}</span>}
    </div>
  );
  return (
    <Modal
      open
      onClose={onClose}
      title={c.name}
      description={c.desc ?? undefined}
      footer={c.link && mine ? (
        <Button variant="neutral" onClick={() => window.open(c.link as string, "_blank", "noopener")}>
          <WhatsappLogo /> قروب اللجنة
        </Button>
      ) : undefined}
    >
      {seat(c.leaderRoleAr, c.leader, vacantWord(c.leaderElected))}
      {c.deputy ? seat("النائب", c.deputy, "") : null}
      {isOp ? (
        <>
          {seat("مشرف الموارد", c.hrOverseer, "لم يُوزَّع بعد")}
          {seat("مشرف الضمان", c.qaOverseer, "لم يُوزَّع بعد")}
        </>
      ) : null}
      <div className="omap-mem">
        <span className="omap-seat-lbl">الأعضاء</span>
        {c.members.length ? (
          <div className="org-people">{c.members.map((m, i) => <Person key={m.userId + i} h={m} role={m.roleName !== "committee_member"} />)}</div>
        ) : <span className="omap-vac">لا أعضاء بعد</span>}
      </div>
    </Modal>
  );
}

// ═══ بطلُ الصدر: موقعُ القارئ نفسه ═══
function Hero({ committee, dept, council, onOpen }: {
  committee: CommitteeNode | null; dept: DepartmentNode | null; council: string; onOpen: () => void;
}) {
  const lead = committee?.leader ?? null;
  return (
    <Card variant="elevated" className="omap-hero">
      <CardHeader variant="solid" icon={<MapPin />} title="موقعك في أديب" subtitle={council} />
      <CardBody>
        {committee ? (
          <div className="omap-hero-grid">
            <div className="omap-hero-main">
              <div className="omap-hero-top">
                <h2 className="omap-hero-nm">{committee.name}</h2>
                {dept ? <span className="omap-hero-path">{dept.name}</span> : null}
              </div>
              {committee.desc ? <p className="omap-hero-desc">{committee.desc}</p> : null}
              <Button variant="neutral" size="sm" onClick={onOpen}>كشفُ اللجنة كاملًا</Button>
            </div>
            <div className="omap-hero-side">
              {lead ? (
                <div className="omap-hero-lead">
                  <Avatar name={lead.name} src={lead.avatar ?? undefined} gender={lead.gender} size="lg" />
                  <span className="omap-hero-lead-tx"><b>{lead.name}</b><span>{committee.leaderRoleAr}</span></span>
                </div>
              ) : null}
              <div className="omap-hero-rest">
                <span className="omap-seat-lbl">معك في اللجنة</span>
                <AvatarStack people={[committee.deputy, ...committee.members].filter(Boolean) as Holder[]} max={7} />
              </div>
            </div>
          </div>
        ) : (
          <p className="omap-hero-desc">أنت في {council}. تصفّح وحدات أديب أدناه لتعرف من فيها وماذا تعمل.</p>
        )}
      </CardBody>
    </Card>
  );
}

// ═══ كرتُ وحدةٍ: قسمٌ بلجانه، أو إدارةٌ بأهلها ═══
function UnitCard({ icon, title, subtitle, desc, mine, wide, children }: {
  icon: React.ReactNode; title: string; subtitle: React.ReactNode; desc: string | null; mine?: boolean; wide?: boolean; children: React.ReactNode;
}) {
  return (
    <Card className={"omap-card" + (wide ? " omap-wide" : "")}>
      <CardHeader variant="soft" icon={icon} title={title} subtitle={subtitle}
        actions={mine ? <Badge tone="info" variant="soft" icon={<MapPin />}>أنت هنا</Badge> : undefined} />
      <CardBody>
        {desc ? <p className="omap-desc">{desc}</p> : null}
        {children}
      </CardBody>
    </Card>
  );
}

export function MapView({ model, you = NO_YOU }: { model: StructureModel; you?: YouAre }) {
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);

  const all = useMemo(() => {
    const list: CommitteeNode[] = [...model.administrative.committees];
    for (const d of model.executive.departments) list.push(...d.committees);
    return list;
  }, [model]);

  const myCommittee = all.find((c) => c.id === you.home) ?? null;
  const myDept = model.executive.departments.find((d) => d.committees.some((c) => c.id === you.home)) ?? null;
  const myCouncil = you.councils.includes("executive") ? model.executive.name
    : you.councils.includes("administrative") ? model.administrative.name : "أديب";
  const open = all.find((c) => c.id === openId) ?? null;

  const shown = (c: CommitteeNode) => matchCommittee(q, c);
  const row = (c: CommitteeNode) => (
    <CommitteeRow key={c.id} c={c} mine={you.committees.includes(c.id)} onOpen={() => setOpenId(c.id)} />
  );

  const adminComs = model.administrative.committees.filter(shown);
  const depts = model.executive.departments
    .map((d) => ({ d, coms: d.committees.filter(shown) }))
    .filter(({ d, coms }) => coms.length > 0 || matchesSearch(q, d.name, d.desc));

  const seats = model.administrative.seats.filter((s) => q === "" || matchesSearch(q, s.roleAr) || s.holders.some((h) => matchesSearch(q, h.name)));

  return (
    <div className="omap">
      <Hero committee={myCommittee} dept={myDept} council={myCouncil} onOpen={() => setOpenId(you.home)} />

      <Toolbar search={q} onSearch={setQ} searchPlaceholder="ابحث عن اسمٍ أو لجنةٍ أو قسم…" />

      <section>
        <ModalSectionHeading icon={<Bank />} title={model.administrative.name} />
        <p className="omap-sub">الرئاسةُ وإدارتان تخدمان النادي كلَّه</p>
        <div className="card-grid">
          {/* الرئاسةُ تأخذ الصفّ كلَّه ومقاعدُها بلاطاتٌ متجاورة: أربعةُ مقاعدَ في عمودٍ ضيّق
              تترك فراغًا تحتها، وفي صفٍّ عريض تملؤه. */}
          {seats.length ? (
            <UnitCard wide icon={<Bank />} title="الرئاسة" subtitle="من يجلس في المجلس ويقرّر" desc={model.administrative.desc}
              mine={you.councils.includes("administrative")}>
              <div className="omap-seats-row">
                {seats.map((s) => (
                  <div key={s.roleName} className="omap-seatrow">
                    <span className="omap-seat-lbl">{s.roleAr}</span>
                    {s.holders.length
                      ? <div className="org-people">{s.holders.map((h, i) => <Person key={h.userId + i} h={h} tone={s.isHead ? "gold" : undefined} />)}</div>
                      : <span className="omap-vac">{vacantWord(s.isElected)}</span>}
                  </div>
                ))}
              </div>
            </UnitCard>
          ) : null}
          {/* الإدارةُ لجنةٌ بنفسها، فلا يُعاد اسمُها صفًّا تحت ترويسته: وجوهُها وزرُّ كشفِها يكفيان. */}
          {adminComs.map((c) => (
            <UnitCard key={c.id} icon={<UsersFour />} title={c.name}
              subtitle={c.leader ? `${c.leaderRoleAr}: ${c.leader.name}` : <span className="omap-vac">{vacantWord(c.leaderElected)}</span>}
              desc={c.desc} mine={you.committees.includes(c.id)}>
              <div className="omap-inline">
                {peopleOf(c).length ? <AvatarStack people={peopleOf(c)} max={6} /> : <span className="omap-vac">لا أعضاء بعد</span>}
                <Button variant="ghost" size="sm" onClick={() => setOpenId(c.id)}>كشفُ الإدارة</Button>
              </div>
            </UnitCard>
          ))}
        </div>
      </section>

      <section>
        <ModalSectionHeading icon={<UsersThree />} title={model.executive.name} />
        <p className="omap-sub">{model.executive.head ? `يرأسه ${model.executive.head.name}، وتحته أقسامٌ تجمع لجانَ العمل` : "أقسامٌ تجمع لجانَ العمل"}</p>
        <div className="card-grid">
          {depts.map(({ d, coms }) => (
            <UnitCard key={d.id} icon={<Buildings />} title={d.name}
              subtitle={d.head ? `${d.headRoleAr}: ${d.head.name}` : <span className="omap-vac">{vacantWord(d.headElected)}</span>}
              desc={d.desc} mine={you.departments.includes(d.id) || d.committees.some((c) => you.committees.includes(c.id))}>
              <div className="omap-coms">{(coms.length ? coms : d.committees).map(row)}</div>
            </UnitCard>
          ))}
          {depts.length === 0 && adminComs.length === 0 ? <p className="org-empty">لا مطابقين لهذا البحث.</p> : null}
        </div>
      </section>

      {/* مفتاحُ المصطلحات في الذيل مطويًّا: يحتاجه العضوُ الجديد مرّةً، فلا يزاحم الخريطةَ كلَّ مرّة. */}
      <Accordion items={[{
        q: "ما معنى مجلس وإدارة وقسم ولجنة؟",
        a: (
          <dl className="omap-key">
            <div><dt><Bank /> المجلس</dt><dd>هيئةٌ تقرّر ولا تُنفّذ. في أديب مجلسان: الإداريّ (الرئاسة والإدارتان) والتنفيذيّ (الأقسام واللجان).</dd></div>
            <div><dt><UsersFour /> الإدارة</dt><dd>وحدةٌ تحت المجلس الإداريّ تخدم النادي كلَّه: الموارد البشريّة والضمان والجودة.</dd></div>
            <div><dt><Buildings /> القسم</dt><dd>مظلّةٌ تجمع لجانًا متقاربة العمل، ينسّقها منسّق قسمٍ منتخَب.</dd></div>
            <div><dt><UsersThree /> اللجنة</dt><dd>بيتُ العمل: لها قائد ونائب وأعضاء، وهي مقعدُك الأوّل في أديب.</dd></div>
            <div><dt><MapPin /> المشرف</dt><dd>عضوٌ من إدارة الموارد أو الضمان يتابع اللجنة من خارجها، ليس عضوًا فيها ولا يُعدّ في أهلها.</dd></div>
            <div><dt><Scales /> المنتخَب والمعيَّن</dt><dd>منسّق القسم وقائد اللجنة ونائبه يبلغون مقاعدهم بانتخاب، وسواهم بتعيين. ولذا يقول المقعد الخالي «لم يُنتخب بعد» أو «لم يُعيَّن بعد».</dd></div>
          </dl>
        ),
      }]} />

      <CommitteeModal c={open} mine={open ? you.committees.includes(open.id) : false} onClose={() => setOpenId(null)} />
    </div>
  );
}
