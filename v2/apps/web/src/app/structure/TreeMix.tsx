"use client";

import { useState, type ReactNode } from "react";
import { countPhrase, Modal, type ChartUnit } from "@adeeb/design-system";
import { UnitIcon } from "@/app/dashboard/_components/UnitIcon";
import { Armchair, Briefcase, Buildings, Compass, Crown, User, UserCircleDashed, UsersThree } from "@phosphor-icons/react";
import { ArrowLeft, CaretDown, CaretLeft, Info } from "@/app/_components/glyphs";
import { AdButton } from "@/app/_ad/primitives";
import { AdLine, AdLineVoid, AdSection } from "@/app/_ad/account";
import { PubIndex, type PubFact } from "@/app/_ad/public";
import { avatarFace } from "@/lib/avatarFace";
import { rankOf, type OrgDepartment, type OrgPerson, type OrgSeat, type OrgUnit, type PubOrg } from "./org";

/**
 * **شجرةُ أدِيب** (اعتمدها محمد ٢٠٢٦-١١-٢٢ بعد جولتين على مادّتها).
 *
 * **التكوينُ المعتمد من قبل** (المزيج ١٠-١٣، الوصل ١٠-١٧، لافتتا المجلسين ١٠-١٨): الرئاسةُ جذعٌ، ثمّ جسرٌ إلى الإدارات والتنفيذيّةُ في وسطها
 * تحت رئيستها، ثمّ الأقسامُ ولجانُها نازلةً على جذوعها. ومحمد: «نظامُ الشجرة القديمة أفضل» — والتصميمُ يقوم على الشجرة نفسِها وعلى
 * الوجوه وحجمها، لا على الأوعية (رُدّت الورقةُ واللوحُ وعاءً لكلّ وحدة: «البارزُ فيها الكونتينر»، ورُدّت شجرةُ الكروت).
 *
 * **ومادّتُه من الهويّة** (الجولتان ٢٠٢٦-١١-٢١ و٢٢):
 * - **اسمُ الوحدة لوحةُ الاسم** (`.ad-gtitle-name`) زرًّا يفتح نافذتَها، **والوجهُ على أرض اللوح بحلقة الورقة**، والفارغُ الشخصُ المقطَّع،
 *   وزرُّ الصفحة المختومُ على حافّة الوجه (وحده ينقل)، والفريقُ وجوهُه فوق الزرّ المختوم بعدده.
 * - **النائبُ والإشرافُ سطورُ الهويّة على الأرض بلا وعاء** (`AdLine`، «ب»): مربّعُ السطر يحمل وجهَ صاحبه، ودورُه فوق اسمه، وزرُّ صفحته
 *   ختمًا في طرفه. (كانت صبغةً من اجتهادي فرُدّت: «إذا كانت من اجتهاداتك فلماذا تجتهد؟»، ورُدّت السطورُ في ورقة.)
 * - **المجلسُ قطعةٌ من اللوح** بعنوانه وتعريفه بحبر اللوح («ب»؛ كان سطرًا تحت لوحته «ضعيفًا جدًّا»، ورُدّ إخفاؤه خلف زرّ).
 * - **نافذةُ الوحدة بأقسام قالب النوافذ** (`.ad-evd`): التعريفُ أوّلًا، ثمّ القيادةُ والإشرافُ وجوهًا، ثمّ الأعضاءُ سطورًا عمودين.
 * - **صفوفُ الأقسام مشتركة** (`subgrid`): لجانُ المرتبة الواحدة على خطٍّ واحد («غير مرتّبة… غير منسّقة»).
 * - **المجلسُ الإداريّ في لوح الرأس نفسِه** («لوحٌ واحد»، محمد ٢٠٢٦-١١-٢٢): كان لوحُه تحت لوح الرأس مباشرةً فيتتابع لوحان كحليّان،
 *   فصار بعد خيطٍ تحت الحقائق، وجذعٌ ينزل منه إلى الرئيس. (رُدّ: لوحٌ أصغرُ تحت الرأس — يخفّف التتابعَ ولا يزيله.)
 */

const MEMBER: ChartUnit = { one: "عضو", two: "عضوان", few: "أعضاء", many: "عضوًا" };
const COUNCIL: ChartUnit = { one: "مجلس", two: "مجلسان", few: "مجالس", many: "مجلسًا" };
const ADMIN: ChartUnit = { one: "إدارة", two: "إدارتان", few: "إدارات", many: "إدارةً" };
const DEPT: ChartUnit = { one: "قسم", two: "قسمان", few: "أقسام", many: "قسمًا" };
const COMMITTEE: ChartUnit = { one: "لجنة", two: "لجنتان", few: "لجان", many: "لجنةً" };

const pageWord = (p: OrgPerson) => (p.gender === "female" ? "صفحتها" : p.gender === "male" ? "صفحته" : "الصفحة");
const href = (p: OrgPerson) => (p.slug ? `/m/${encodeURIComponent(p.slug)}` : null);
const vacantLine = (s: OrgSeat) => (s.elected ? "لم يُنتخب بعد" : "لم يُعيَّن بعد");
const shortUnit = (name: string) => name.replace(/^إدارة\s+/, "");

/** الوجه: صورتُه أو رسمُ جنسه على أرض اللوح، والفارغُ الشخصُ المقطَّع (وجهُ المقاعد الفارغ في الهويّة) */
export function Face({ p, size }: { p: OrgPerson | null; size: "lead" | "node" | "sm" | "xs" }) {
  const f = p ? avatarFace(p.avatar, p.gender) : null;
  return (
    <span className="tm-f" data-size={size} data-vacant={p ? undefined : ""} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element -- صورُ الأعضاء من مخزنها كما في سائر الوجوه */}
      {!f ? <UserCircleDashed /> : f.kind === "photo" ? <img src={f.url} alt="" loading="lazy" draggable={false} />
        // eslint-disable-next-line @next/next/no-img-element
        : f.kind === "figure" ? <img className="is-fig" src={f.url} alt="" loading="lazy" draggable={false} />
        : <User />}
    </span>
  );
}

/** الشخصُ في رأس الشجرة أو رأسِ وحدته: وجهُه وزرُّ صفحته على حافّته، واسمُه، ولقبُه */
function Head({ p, seat, title, size = "node" }: { p: OrgPerson | null; seat: OrgSeat; title: string; size?: "lead" | "node" }) {
  const h = p ? href(p) : null;
  return (
    <div className="tm-head" data-size={size}>
      <span className="tm-fw">
        <Face p={p} size={size} />
        {h && p ? <span className="tm-go"><AdButton href={h} size="sm" icon={<ArrowLeft />} iconEnd>{pageWord(p)}</AdButton></span> : null}
      </span>
      <span className="tm-nm" data-vacant={p ? undefined : ""}>{p ? p.name : "فارغ"}</span>
      <span className="tm-rl">{p ? rankOf(title, p) ?? title : `${title}، ${vacantLine(seat)}`}</span>
    </div>
  );
}

/**
 * سطرُ مقعد: وجهُ صاحبه في مربّع السطر، ودورُه فوق اسمه، و**زرُّ «صفحته» بكلمته** في طرفه — زرُّ الوجه نفسُه (محمد ٢٠٢٦-١١-٢٢: الختمُ
 * وحده «ضعيفٌ جدًّا»). والفارغُ «فارغ» خافتًا وتحته طريقُ شغله
 */
/**
 * سطرُ مقعد: وجهُ صاحبه في مربّع السطر، ودورُه فوق اسمه، ثمّ زرُّ «صفحته» بكلمته (زرُّ الوجه نفسُه). وفي **الشجرة** (`.tm-lines`) ينزل الزرُّ
 * **تحت الاسم** على حدّ نصّه (محمد ٢٠٢٦-١١-٢٢: كان بجانبه فينكسر الاسمُ إذا ضاق العمود، ورُدّ الختمُ وحده)، **والفارغُ مكانَ زرّه
 * طريقُ شغله** («لم يُنتخب بعد» أو «لم يُعيَّن بعد») بارتفاع الزرّ نفسِه، فالسطورُ ثلاثةٌ متساوية (ورُدّ زرٌّ معطّلٌ للفارغ: «غيرُ جميل»).
 * وفي النافذة الزرُّ في طرف السطر.
 */
function personLine(k: string | undefined, s: OrgSeat, key: string) {
  const p = s.person;
  // المكلَّفُ يُقال تكليفُه مع دوره («النائب تكليفًا»)، كما يُقال في عقدة القائد
  if (k && p?.acting) k = `${k} تكليفًا`;
  const h = p ? href(p) : null;
  return (
    <AdLine key={key} icon={<Face p={p} size="xs" />} k={k} v={p ? p.name : "فارغ"} tone={p ? undefined : "muted"} sub={p ? undefined : vacantLine(s)}
      href={h ?? undefined} act={h && p ? { icon: <ArrowLeft />, text: pageWord(p), label: `${pageWord(p)}: ${p.name}`, end: true } : undefined}
 />
  );
}

/**
 * **النائبُ والإشرافُ على ورقة الهويّة** (اختارها محمد ٢٠٢٦-١١-٢٢: «أحسّ وجودَ أرضيّةٍ أجملُ بصريًّا»): ورقةُ القسم بحدّها وظلّها (`.ad-sec`)
 * تجمعهم كتلةً واحدةً تحت قائدهم. رُدّت صبغةُ رأس القسم: صُمّمت لتجلس على ورقة، وعلى أرض الصفحة المصبوغة تذوب فلا تُرى.
 */
function Ground({ children }: { children: ReactNode }) {
  return <ul className="ad-lines tm-lines">{children}</ul>;
}

/** الفريق: وجوهُه المتراكبة فوق الزرّ المختوم بعدده، يفتح شبكةَ وجوهه بأسمائها. والخالي سطرُ الغياب */
function Team({ people }: { people: OrgPerson[] }) {
  const [open, setOpen] = useState(false);
  if (!people.length) return <div className="tm-team is-empty"><AdLineVoid icon={<UsersThree />} text="لا أعضاء بعد" /></div>;
  const stack = [...people].sort((a, b) => Number(!!b.avatar) - Number(!!a.avatar)).slice(0, 5);
  return (
    <div className="tm-team">
      <span className="tm-stk" aria-hidden>{stack.map((p) => <Face key={p.id} p={p} size="xs" />)}</span>
      <AdButton size="sm" icon={<UsersThree />} pressed={open} onClick={() => setOpen((o) => !o)}>
        <span className="tm-ct">{countPhrase(people.length, MEMBER)}<CaretDown className="tm-caret" aria-hidden /></span>
      </AdButton>
      {open ? (
        <div className="tm-grid">
          {people.map((p) => {
            const h = href(p);
            return (
              <div key={p.id} className="tm-m">
                <Face p={p} size="sm" />
                <span className="tm-mn">{p.name}</span>
                {h ? <AdButton href={h} size="sm" icon={<ArrowLeft />} iconEnd>{pageWord(p)}</AdButton> : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export type Open = { kind: "unit"; u: OrgUnit; where: string } | { kind: "dept"; d: OrgDepartment };


/** اسمُ الوحدة: لوحةُ الاسم (عنوانُ المجموعة في الهويّة) زرًّا يفتح نافذتَها */
function Name({ icon, name, onOpen }: { icon: ReactNode; name: string; onOpen: () => void }) {
  return (
    <button type="button" className="tm-name" onClick={onOpen} aria-label={`عن ${name}`}>
      <span className="ad-gtitle-name">{icon}<span>{name}</span><CaretLeft className="tm-name-c" aria-hidden /></span>
    </button>
  );
}

function Unit({ u, where, onOpen }: { u: OrgUnit; where: string; onOpen: (o: Open) => void }) {
  return (
    <section className="tm-unit" aria-label={u.name}>
      <Name icon={u.kind === "committee" ? <UnitIcon icon={u.icon} kind="committee" /> : <Briefcase />} name={u.name} onOpen={() => onOpen({ kind: "unit", u, where })} />
      <div className="tm-body">
        <Head p={u.leader.person} seat={u.leader} title="قائد" />
        {u.deputy || u.supervisors.length ? (
          <Ground>
            {u.deputy ? personLine("النائب", u.deputy, "dep") : null}
            {u.supervisors.map((x) => personLine(`مشرف ${shortUnit(x.from)}`, x.seat, x.from))}
          </Ground>
        ) : null}
        <Team people={u.members} />
      </div>
    </section>
  );
}

/**
 * **الشخصُ بوجه الشجرة** (في النافذة): وجهُه وزرُّ «صفحته» على حافّته، ثمّ دورُه، ثمّ اسمُه — كما يُرى في الشجرة نفسِها، بلا وعاء
 */
function Person({ label, s }: { label?: string; s: OrgSeat }) {
  const p = s.person;
  // المكلَّفُ يُقال تكليفُه مع دوره (محمد ٢٠٢٦-١١-٢٢: «القادةُ المكلَّفون لماذا لا يظهر أنّهم مكلَّفون؟»)
  if (label && p?.acting) label = `${label} تكليفًا`;
  return (
    <div className="tm-person">
      <span className="tm-fw">
        <Face p={p} size="node" />
        {p && href(p) ? <span className="tm-go"><AdButton href={href(p) as string} size="sm" icon={<ArrowLeft />} iconEnd>{pageWord(p)}</AdButton></span> : null}
      </span>
      {label ? <span className="tm-rl">{label}</span> : null}
      <span className="tm-strip-n" data-vacant={p ? undefined : ""}>{p ? p.name : "فارغ"}</span>
      {p ? null : <span className="tm-rl">{vacantLine(s)}</span>}
    </div>
  );
}

/**
 * **نافذةُ الوحدة والقسم** (اعتُمدت ٢٠٢٦-١١-٢٢، الهيئةُ «د» بمبدّل): أقسامُ قالب النوافذ (`.ad-evd`) — القيادةُ والإشرافُ وجوهُ الشجرة
 * كبيرةً، والأعضاءُ سطورٌ عمودين؛ من يقود بارزٌ، ومن يعمل قائمةٌ مرتّبة.
 *
 * **والتعريفُ أوّلُها قسمًا برأسه** (محمد ٢٠٢٦-١١-٢٢ بعد أن فتح لجانًا وأقسامًا كثيرة): جُرّب موضعًا وحده في مبدّل النافذة فرُدّ —
 * النافذةُ تأخذ طولَ أشخاصها، فإذا بُدِّل إلى التعريف ملأ منها جزءًا يسيرًا وبقي سائرُها فارغًا. ورُدّ قبله على لوح الرأس وفاتحةً للورق.
 */
function Win({ title, where, size, desc, onClose, children }: { title: string; where: string; size: "md" | "lg"; desc: string | null;
  onClose: () => void; children: ReactNode }) {
  return (
    <Modal open onClose={onClose} size={size} title={title} description={where} className="ad-evd tm-win">
      {desc ? <AdSection icon={<Info />} title="التعريف" media={<p className="tm-desc">{desc}</p>} /> : null}
      {children}
    </Modal>
  );
}

export function UnitWindow({ open, onClose, onOpen }: { open: Open | null; onClose: () => void; onOpen: (o: Open) => void }) {
  if (!open) return null;
  if (open.kind === "dept") {
    const d = open.d;
    return (
      <Win key={`d${d.id}`} title={d.name} where="قسمٌ في المجلس التشغيليّ" size="md" desc={d.desc} onClose={onClose}>
        <AdSection icon={<Compass />} title="التنسيق">{personLine("المنسّق", d.head, "head")}</AdSection>
        <AdSection icon={<UsersThree />} title="لجانُه">
          {/* كلُّ لجنةٍ تفتح نافذتَها مكانَ نافذة القسم (محمد ٢٠٢٦-١١-٢٢: «نعم») — كما يفتحها اسمُها في الشجرة */}
          {d.units.map((u) => (
            <AdLine key={u.id} icon={<Face p={u.leader.person} size="xs" />} v={u.name} sub={u.leader.person ? `يقودها ${u.leader.person.name}` : "القائد فارغ"}
              onClick={() => onOpen({ kind: "unit", u, where: `لجنةٌ في ${d.name}` })} act={{ icon: <CaretLeft />, text: "عرض", label: "عرض اللجنة", end: true }} />
          ))}
        </AdSection>
      </Win>
    );
  }
  const u = open.u;
  return (
    <Win key={`u${u.id}`} title={u.name} where={open.where} size="lg" desc={u.desc} onClose={onClose}>
      <AdSection icon={<Crown />} title={u.supervisors.length ? "القيادة والإشراف" : "القيادة"} media={
        <div className="tm-people-row">
          <Person label="القائد" s={u.leader} />
          {u.deputy ? <Person label="النائب" s={u.deputy} /> : null}
          {u.supervisors.map((x) => <Person key={x.from} label={`مشرف ${shortUnit(x.from)}`} s={x.seat} />)}
        </div>
      } />
      {/* الفارغُ يقوله رأسُ القسم نفسُه («لا أعضاء بعد» تحت اسمه) لا سطرٌ برمزٍ ثانٍ (محمد ٢٠٢٦-١١-٢٢: «ما هذا التكرار؟») */}
      <AdSection icon={<UsersThree />} title={u.members.length ? `الأعضاء (${u.members.length})` : "الأعضاء"} sub={u.members.length ? undefined : "لا أعضاء بعد"}>
        {u.members.length ? u.members.map((p) => personLine(undefined, { person: p, elected: false }, p.id)) : null}
      </AdSection>
    </Win>
  );
}

/** المجلسُ التشغيليّ قطعةٌ من اللوح في وسط الشجرة: مربّعُ رمزه زجاجٌ عليه، وعنوانُه، وتعريفُه بحبر اللوح */
function Council({ name, desc }: { name: string; desc: string | null }) {
  return (
    <div className="tr-council tm-council">
      <section className="ad-plate tm-council-plate" aria-label={name}>
        <span className="ad-sec-ic ad-plate-ic" aria-hidden><Armchair /></span>
        <h2 className="ad-plate-title">{name}</h2>
        {desc ? <p className="ad-plate-lead">{desc}</p> : null}
      </section>
    </div>
  );
}

export function TreeMix({ org }: { org: PubOrg }) {
  const [open, setOpen] = useState<Open | null>(null);
  const a = org.administrative;
  const x = org.executive;
  const pres = a.seats.find((s) => s.head);
  const presP = pres?.holders[0] ?? null;
  const ceo = x.head;
  // الإدارةُ التنفيذيّة يقودها الرئيسُ التنفيذيّ نفسُه، فتقع في وسط صفّ الإدارات تحته
  const execUnit = a.units.find((u) => u.leader.person && ceo && u.leader.person.id === ceo.id) ?? null;
  const others = a.units.filter((u) => u !== execUnit);
  const half = Math.ceil(others.length / 2);
  const row: (OrgUnit | "exec")[] = execUnit ? [...others.slice(0, half), "exec", ...others.slice(half)] : others;
  const facts: PubFact[] = [
    { icon: <Armchair />, text: countPhrase(2, COUNCIL) },
    { icon: <Briefcase />, text: countPhrase(org.stats.administrations, ADMIN) },
    { icon: <Buildings />, text: countPhrase(org.stats.departments, DEPT) },
    { icon: <UsersThree />, text: countPhrase(org.stats.committees, COMMITTEE) },
    { icon: <User />, text: countPhrase(org.stats.people, MEMBER) },
  ];
  // المجلسُ الإداريّ في لوح الرأس نفسِه: خيطٌ يفصله عن الحقائق، ثمّ رمزُه وعنوانُه وتعريفُه
  const mast = (
    <div className="ad-pi-lead">
      <span className="ad-sec-ic ad-plate-ic" aria-hidden><Armchair /></span>
      <h2 className="ad-pi-lead-t">{a.name}</h2>
      {a.desc ? <p className="ad-plate-lead">{a.desc}</p> : null}
    </div>
  );

  return (
    <PubIndex title="هيكلة أدِيب" facts={facts} after={mast}>
      <div className="tr tm">
        <div className="tr-col">
          {pres ? <div className="tm-unit is-person"><Head p={presP} seat={{ person: presP, elected: pres.elected }} title={pres.title} size="lead" /></div> : null}
          {ceo ? <><span className="tr-v" aria-hidden /><div className="tm-unit is-person"><Head p={ceo} seat={{ person: ceo, elected: false }} title={x.headTitle} size="lead" /></div></> : null}
        </div>
        <div className="tr-fork" data-n={row.length}>
          {row.map((u) => u === "exec" ? (
            <div key="exec" className="tr-branch is-exec">
              {execUnit ? (
                <section className="tm-unit" aria-label={execUnit.name}>
                  <Name icon={<Briefcase />} name={execUnit.name} onOpen={() => setOpen({ kind: "unit", u: execUnit, where: `إدارةٌ في ${a.name}، يقودها ${x.headTitle}` })} />
                  {/* قائدُها مقعدُ الرئيس التنفيذيّ نفسُه (٢٠٢٦-١٠-١٠)، فيُقال في عقدتها كما يُقال قائدا الإدارتين (محمد ٢٠٢٦-١١-٢٢) */}
                  <div className="tm-body"><Head p={execUnit.leader.person} seat={execUnit.leader} title={x.headTitle} /><Team people={execUnit.members} /></div>
                </section>
              ) : null}
              <span className="tr-v tr-grow" aria-hidden />
            </div>
          ) : (
            <div key={u.id} className="tr-branch"><Unit u={u} where={`إدارةٌ في ${a.name}`} onOpen={setOpen} /></div>
          ))}
        </div>
        <Council name={x.name} desc={x.desc} />
        {/* صفوفٌ مشتركةٌ بين الأقسام (`subgrid`): القسمُ صفٌّ، وأوّلُ لجانه صفٌّ، وثانيها صفّ — فلجانُ المرتبة الواحدة على خطٍّ واحد
            وإن اختلفت أطوالُ ما فوقها (محمد ٢٠٢٦-١١-٢٢)، والجذعُ يمتدّ في الفسحة تحت الأقصر */}
        <div className="tr-fork is-depts" data-n={x.departments.length} data-rows={1 + Math.max(0, ...x.departments.map((d) => d.units.length))}>
          {x.departments.map((d) => (
            <div key={d.id} className="tr-branch">
              <div className="tr-step is-head">
                <section className="tm-unit" aria-label={d.name}>
                  <Name icon={<UnitIcon icon={d.icon} kind="department" />} name={d.name} onOpen={() => setOpen({ kind: "dept", d })} />
                  <div className="tm-body"><Head p={d.head.person} seat={d.head} title="منسّق" /></div>
                </section>
              </div>
              {d.units.map((u) => (
                <div key={u.id} className="tr-step">
                  <span className="tr-v" aria-hidden />
                  <Unit u={u} where={`لجنةٌ في ${d.name}`} onOpen={setOpen} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <UnitWindow open={open} onClose={() => setOpen(null)} onOpen={setOpen} />
    </PubIndex>
  );
}
