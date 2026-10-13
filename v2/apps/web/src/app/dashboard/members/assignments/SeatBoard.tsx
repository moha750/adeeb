"use client";

import { Badge, Card, CardHeader, IconButton } from "@adeeb/design-system";
import {
  Bank, Briefcase, CalendarBlank, CalendarX, Compass, Crown, HourglassMedium, SealCheck, Snowflake, StarHalf,
  LockSimple, UserCheck, UserCircle, UserPlus, UsersThree, UserSwitch,
} from "@phosphor-icons/react";
import { ArrowsClockwise, CaretDown, PencilSimple, Plus, Star, Trash } from "@/app/_components/glyphs";
import { clubDayKey, daysBetweenKeys } from "@/lib/dates";
import { firstNameOf } from "@/lib/personName";
import { rankFor } from "@/lib/positionLabel";
import { Avatar } from "../../_components/Avatar";
import { DropdownMenu, type MenuGroup } from "../../_components/DropdownMenu";
import { UnitIcon } from "../../_components/UnitIcon";
import type { Holder, Position, RawCommittee, RawCouncil, RawDept } from "../structure/model";
import { holderNote } from "./PositionCard";
import type { EditableUnit } from "./UnitEditModal";

/**
 * **لوحة المقاعد** — تبويب «تعيين المناصب» بعد إعادة بنائه (المالك ٢٠٢٦-١٠-١٠، سبعُ جولاتٍ في `/ui/seats`).
 *
 * البنيةُ هي التخطيط: المجلسُ الإداريّ بتراتبيّته (الرئيسُ، فالرئيسُ التنفيذيّ، فقائدا الإدارتين متجاورين)،
 * ثمّ كلُّ قسمٍ كرتٌ يتصدّره منسّقُه وفيه لجانُه، والقائدُ والنائبُ متجاوران. فما كان تسعةً وعشرين كرتًا
 * تكرّر شارةَ المجلس وتفرّق القائدَ عن نائبه صار خريطةً تُقرأ كما تُدار.
 *
 * وكلُّ مقعدٍ لوحةٌ بذيل أفعالٍ ظاهر، **لا ثلاثَ نقاط** (بكلمة المالك): الأصيلُ «استبدال» و«إزالة»،
 * والمكلَّفُ «تعديل آخر يوم» و«إنهاء التكليف»، والمجمَّدُ «تكليف»، والشاغرُ «تعيين» ينزل منه القرار
 * (إسنادٌ دائم أو تكليفٌ مؤقّت). والأفعالُ نفسُها أبوابُ الشاشة كما كانت: هذا المكوّنُ يرسم ولا يقرّر.
 *
 * أيقونةُ الرتبة من `role_name` (مفاتيحُ ثابتةٌ في القاعدة)، وأيقونةُ الوحدة من عمودها (`icon`، بإذن المالك
 * ٢٠٢٦-١٠-١٠) عبر `UnitIcon`، والفارغُ منها عامّة.
 */

/* ══ الأيقونات ══ */
/** أيقونةُ الرتبة: تاجٌ للرئيس، وحقيبةٌ للتنفيذيّ، وبوصلةٌ للمنسّق، ونجمةٌ للقائد، ونصفُ نجمةٍ للنائب. */
function RankGlyph({ roleName }: { roleName: string }) {
  switch (roleName) {
    case "club_president": return <Crown aria-hidden />;
    case "executive_council_president": return <Briefcase aria-hidden />;
    case "hr_committee_leader": return <UsersThree aria-hidden />;
    case "qa_committee_leader": return <SealCheck aria-hidden />;
    case "department_head": return <Compass aria-hidden />;
    case "committee_leader": return <Star aria-hidden />;
    case "deputy_committee_leader": return <StarHalf aria-hidden />;
    default: return <UserCircle aria-hidden />;
  }
}

/** المسمّى المجرّد للمقعد داخل وحدته (الوحدةُ يقولها عنوانُها)، ثمّ يُؤنَّث بجنس شاغله. */
const RANK_TITLE: Record<string, string> = {
  department_head: "منسّق القسم",
  committee_leader: "قائد اللجنة",
  deputy_committee_leader: "نائب القائد",
};
const VACANT_NAME: Record<string, string> = {
  department_head: "مقعد المنسّق",
  committee_leader: "مقعد القائد",
  deputy_committee_leader: "مقعد النائب",
};
const seatTitle = (p: Position, gender: Holder["gender"]) => rankFor(RANK_TITLE[p.roleName] ?? p.roleAr, gender);
const vacantName = (p: Position) => VACANT_NAME[p.roleName] ?? p.roleAr;

/** العددُ والمعدود كما تقولهما العربيّة: واحد، اثنان، ٣–١٠ جمعًا، وما فوقها مفردًا منصوبًا. */
const counted = (n: number, one: string, two: string, few: string, many: string, zero?: string) =>
  n === 0 && zero ? zero : n === 1 ? one : n === 2 ? two : n <= 10 ? `${n} ${few}` : `${n} ${many}`;
const daysLeftAr = (n: number) =>
  n <= 0 ? "ينتهي اليوم" : n === 1 ? "باقٍ يوم" : n === 2 ? "باقٍ يومان" : n <= 10 ? `باقٍ ${n} أيام` : `باقٍ ${n} يومًا`;

/* ══ النموذج ══ */
/** بياناتُ الوحدة الوصفيّة معها (الوصف ورابط القروب)، تملأ نافذةَ «تعديل الوحدة» حين تُفتح. */
type UnitMeta = { icon: string | null; description: string | null; link: string | null };
export type SeatCommittee = UnitMeta & { id: number; name: string; lead: Position | null; dep: Position | null };
export type SeatDept = UnitMeta & { id: number | null; name: string; head: Position | null; committees: SeatCommittee[] };
/** المجلسان ببياناتهما الوصفيّة (الوصف ورابط القروب) لزرّ تعديلهما؛ والاسمُ من القاعدة. */
export type SeatCouncil = { id: string; name: string; description: string | null; link: string | null };
export type SeatBoardModel = { council: Position[]; depts: SeatDept[]; admin: SeatCouncil | null; ops: SeatCouncil | null };

/**
 * يجمع المقاعدَ المسطّحة (`buildPositions`) في بنيتها: المجلسُ، ثمّ الأقسامُ بترتيب عرضها ولجانُها.
 * ولجنةٌ تشغيليّةٌ بلا قسمٍ حيٍّ لا تسقط: تُجمع في كرتٍ أخير «لجانٌ بلا قسم».
 */
export function buildSeatBoard(positions: Position[], departments: RawDept[], committees: RawCommittee[], councils: RawCouncil[] = []): SeatBoardModel {
  const byKey = new Map(positions.map((p) => [p.key, p]));
  const scoped = /^(head|lead|dep)-/;
  const council = positions.filter((p) => !scoped.test(p.key));
  const ops = committees.filter((c) => c.council_id !== "administrative").sort((a, b) => a.id - b.id);
  const seatCom = (c: RawCommittee): SeatCommittee => ({
    id: c.id, name: c.committee_name_ar ?? `لجنة #${c.id}`, icon: c.icon ?? null, description: c.description, link: c.group_link, lead: byKey.get(`lead-${c.id}`) ?? null, dep: byKey.get(`dep-${c.id}`) ?? null,
  });
  const live = new Set(departments.map((d) => d.id));
  const depts: SeatDept[] = [...departments]
    .sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999))
    .map((d) => ({
      id: d.id, name: d.name_ar ?? `قسم #${d.id}`, icon: d.icon ?? null, description: d.description, link: d.group_link, head: byKey.get(`head-${d.id}`) ?? null,
      committees: ops.filter((c) => c.department_id === d.id).map(seatCom),
    }));
  const orphans = ops.filter((c) => c.department_id == null || !live.has(c.department_id));
  if (orphans.length) depts.push({ id: null, name: "لجانٌ بلا قسم", icon: null, description: null, link: null, head: null, committees: orphans.map(seatCom) });
  const meta = (id: string, fallback: string): SeatCouncil | null => {
    const c = councils.find((x) => x.id === id);
    return c ? { id, name: c.name_ar ?? fallback, description: c.description, link: c.group_link } : null;
  };
  return { council, depts, admin: meta("administrative", "المجلس الإداري"), ops: meta("executive", "المجلس التشغيلي") };
}

/* ══ الأبواب ══ */
export type SeatActions = {
  onAssign: (p: Position) => void;
  onReplace: (p: Position) => void;
  onRemove: (p: Position, h: Holder) => void;
  onAct: (p: Position) => void;
  onExtend: (h: Holder) => void;
  onEnd: (h: Holder) => void;
  /** «تعديل الوحدة» (أيقونةٌ ووصفٌ ورابط). يُمرَّر لمن يملك `manage_positions` وحده، وبغيابه لا زرّ. */
  onEditUnit?: (u: EditableUnit) => void;
  /**
   * «إضافة لجنة» في ذيل كلّ قسم و«إضافة قسم» بعد الأقسام: تفتح نافذةَ الوحدة نفسَها بلا معرّف. لمن يملك
   * `manage_positions`، ولا يمرّره المستدعي والبحثُ أو المرشّحُ قائمٌ (الإضافةُ فعلٌ على الهيكل كلّه لا على عدسته).
   */
  onAddUnit?: (u: EditableUnit) => void;
};

const blank = (kind: EditableUnit["kind"], parent?: EditableUnit["parent"]): EditableUnit =>
  ({ kind, id: null, name: "", icon: null, description: null, link: null, parent });

/**
 * **المنصبان الثابتان**: رئيس أدِيب والرئيس التنفيذيّ لا يُزالان ولا يُستبدَلان ولا يُسنَد إليهما من هنا
 * (ترحيل `20261010091310_top_seats_fixed`، قرار المالك). فلا أزرارَ في ذيلهما بل شريطٌ هادئ «منصبٌ ثابت»،
 * توأمُ `PROTECTED` في القاعدة.
 */
const FIXED = new Set(["club_president", "executive_council_president"]);

function Fixed() {
  return <div className="seat-fixed"><LockSimple aria-hidden />منصبٌ ثابت</div>;
}

function Act({ icon, label, danger = false, onClick }: { icon: React.ReactNode; label: string; danger?: boolean; onClick: () => void }) {
  return <button type="button" className={"seat-act" + (danger ? " is-danger" : "")} onClick={onClick}>{icon}{label}</button>;
}

/** الوجهُ بشارة حالته في ركنه: ساعةٌ رمليّةٌ للمكلَّف، وندفةُ ثلجٍ للمجمَّد. */
function Face({ h, lg }: { h: Holder; lg: boolean }) {
  return (
    <span className={"seat-face" + (h.acting ? " is-acting" : h.frozen ? " is-frozen" : "")}>
      <Avatar name={h.name} src={h.avatar ?? undefined} gender={h.gender} size={lg ? "lg" : "md"} />
      {h.acting ? <i className="seat-badge is-acting" aria-hidden><HourglassMedium /></i> : null}
      {h.frozen ? <i className="seat-badge is-frozen" aria-hidden><Snowflake /></i> : null}
    </span>
  );
}

/** مدّةُ التكليف مرسومة: شريطٌ يتناقص مع الأيّام بتوقيت النادي، وما بقي منها. */
function Term({ h }: { h: Holder }) {
  const until = h.acting?.until;
  if (!until) return null;
  const today = clubDayKey(new Date().toISOString());
  const left = Math.max(0, daysBetweenKeys(today, until));
  const total = h.acting?.since ? daysBetweenKeys(clubDayKey(h.acting.since), until) : 0;
  const pct = total > 0 ? Math.min(100, Math.round((left / total) * 100)) : 100;
  return (
    <div className="seat-term">
      <span className="seat-term-track" aria-hidden><span className="seat-term-fill" style={{ inlineSize: `${pct}%` }} /></span>
      <span className="seat-term-left">{daysLeftAr(left)}</span>
    </div>
  );
}

/**
 * مقعدٌ واحد: لوحةٌ لكلّ شاغلٍ جالس (والمقاعدُ هنا مفردةٌ في واقعها، فلوحةٌ واحدة)، أو لوحةُ صاحبه
 * المجمَّد محجوزةً له، أو إطارٌ شاغر.
 */
function Seat({ p, lg = false, actions }: { p: Position; lg?: boolean; actions: SeatActions }) {
  const sitting = p.holders.filter((h) => !h.frozen);
  const owner = p.holders.find((h) => h.frozen) ?? null;
  const size = lg ? " is-lg" : "";

  if (sitting.length) {
    return (
      <>
        {sitting.map((h) => (
          <div key={`${h.userId}-${h.rowId ?? ""}`} className={"seat" + size + (h.acting ? " is-acting" : "")}>
            <div className="seat-id">
              <Face h={h} lg={lg} />
              <span className="seat-tx">
                <b className="seat-name">{h.name}</b>
                <span className="seat-title"><RankGlyph roleName={p.roleName} />{seatTitle(p, h.gender)}</span>
                {h.acting && !h.acting.awaits ? <span className="seat-note">{holderNote(h)}</span> : null}
                {h.acting?.awaits ? (
                  <span className="seat-await">
                    {owner ? <Avatar name={owner.name} src={owner.avatar ?? undefined} gender={owner.gender} size="xs" /> : null}
                    حتى عودة {firstNameOf(h.acting.awaits)}
                  </span>
                ) : null}
              </span>
            </div>
            <Term h={h} />
            {FIXED.has(p.roleName) ? <Fixed /> : <div className="seat-acts">
              {h.acting ? (
                <>
                  {h.acting.awaits ? null : <Act icon={<CalendarBlank aria-hidden />} label="تعديل آخر يوم" onClick={() => actions.onExtend(h)} />}
                  <Act icon={<CalendarX aria-hidden />} label="إنهاء التكليف" danger onClick={() => actions.onEnd(h)} />
                </>
              ) : (
                <>
                  {p.singleton ? <Act icon={<ArrowsClockwise aria-hidden />} label="استبدال" onClick={() => actions.onReplace(p)} /> : null}
                  <Act icon={<Trash aria-hidden />} label="إزالة" danger onClick={() => actions.onRemove(p, h)} />
                </>
              )}
            </div>}
          </div>
        ))}
      </>
    );
  }

  if (owner) {
    return (
      <div className={"seat is-frozen" + size}>
        <div className="seat-id">
          <Face h={owner} lg={lg} />
          <span className="seat-tx">
            <b className="seat-name">{owner.name}</b>
            <span className="seat-title"><RankGlyph roleName={p.roleName} />{seatTitle(p, owner.gender)}</span>
            <span className="seat-note">{holderNote(owner)}</span>
          </span>
        </div>
        {p.actable ? (
          <div className="seat-acts"><Act icon={<UserSwitch aria-hidden />} label="تكليف" onClick={() => actions.onAct(p)} /></div>
        ) : null}
      </div>
    );
  }

  // الشاغر: «تعيين» ينزل منه القرار؛ ومقعدٌ لا تكليفَ فيه طريقُه الإسنادُ وحده، فزرُّه مباشر
  const decide: MenuGroup[] = [{ items: [
    { label: "إسناد دائم", icon: <UserPlus />, onSelect: () => actions.onAssign(p) },
    { label: "تكليف مؤقّت", icon: <UserSwitch />, onSelect: () => actions.onAct(p) },
  ] }];
  return (
    <div className={"seat is-vacant" + size}>
      <div className="seat-id">
        <span className="seat-slot" aria-hidden><RankGlyph roleName={p.roleName} /></span>
        <span className="seat-tx">
          <b className="seat-name">{vacantName(p)}</b>
          <span className="seat-vac">شاغر</span>
        </span>
      </div>
      {FIXED.has(p.roleName) ? <Fixed /> : <div className="seat-acts">
        {p.actable ? (
          <DropdownMenu groups={decide} ariaLabel={`تعيين في ${vacantName(p)}`} matchWidth triggerClassName="seat-act is-primary"
            trigger={<><UserPlus aria-hidden />تعيين<CaretDown aria-hidden className="seat-caret" /></>} />
        ) : (
          <button type="button" className="seat-act is-primary" onClick={() => actions.onAssign(p)}><UserPlus aria-hidden />إسناد</button>
        )}
      </div>}
    </div>
  );
}

const filledOf = (ps: Position[]) => ps.filter((p) => p.holders.some((h) => !h.frozen)).length;
const vacantOf = (ps: Position[]) => ps.filter((p) => p.holders.length === 0).length;

function Head({ icon, title, sub, seats, onEdit }: { icon: React.ReactNode; title: string; sub: string; seats: Position[]; onEdit?: () => void }) {
  return (
    <CardHeader
      variant="solid"
      className="acard-header-pattern"
      icon={icon}
      title={title}
      subtitle={sub}
      actions={
        <>
          <Badge variant="glass" size="sm" icon={<UserCheck />}>{filledOf(seats)} من {seats.length} مشغولة</Badge>
          {onEdit ? (
            // «تعديل» مكتوبةٌ تظهر وحدها حين ينزل الزرُّ سطرًا في الكرت الضيّق (`.seat-edit-lbl`)
            <IconButton size="sm" className="seat-edit" aria-label={`تعديل ${title}`} title="تعديل" onClick={onEdit}>
              <PencilSimple aria-hidden /><span className="seat-edit-lbl" aria-hidden>تعديل</span>
            </IconButton>
          ) : null}
        </>
      }
    />
  );
}

/**
 * **عنوانُ المجلس التشغيليّ** بين كرت المجلس الإداريّ والأقسام (المالك ٢٠٢٦-١٠-١١: الأقسامُ كانت تنزل تحت
 * المجلس الإداريّ بلا اسمٍ يقول إنّها المجلسُ التشغيليّ؛ اعتمده بعد معاينته). عنوانُ قسمٍ خفيفٌ لا كرت: كرتٌ يحوي كروتَ الأقسام
 * ثقيلٌ ويضيّقها في الجوّال. بلغة عنوان اللجنة (مربّعُ أيقونة، فالاسم، فالخطّ، فالعدّاد)، وأيقونتُه أيقونةُ
 * المجلس في خريطة الهيكلة (`MapView`). والعدّادُ للمجلس كلّه كعدّادات الرؤوس.
 */
function SectionTitle({ title, sub, seats, onEdit }: { title: string; sub: string; seats: Position[]; onEdit?: () => void }) {
  return (
    <div className="seat-sec">
      <span className="seat-sec-ic" aria-hidden><UsersThree /></span>
      <span className="seat-sec-tx">
        <h2 className="seat-sec-t">{title}</h2>
        <span className="seat-sec-sub">{sub}</span>
      </span>
      {onEdit ? (
        <IconButton size="sm" className="seat-edit" aria-label={`تعديل ${title}`} title="تعديل" onClick={onEdit}>
          <PencilSimple aria-hidden />
        </IconButton>
      ) : null}
      <span className="seat-sec-rule" aria-hidden />
      <Badge tone="info" variant="soft" size="sm" icon={<UserCheck />}>{filledOf(seats)} من {seats.length} مشغولة</Badge>
    </div>
  );
}

/**
 * اللوحة. `visible` يقول أيَّ المقاعد تُعرض (البحثُ والمرشِّحات)، فتسقط اللجنةُ التي لم يبقَ منها مقعد،
 * ويسقط القسمُ الذي لم يبقَ منه شيء، ويسقط المجلس كذلك. والعدّاداتُ في الرؤوس تعدّ الوحدةَ كلَّها لا المعروضَ
 * منها: «٤ من ٧ مشغولة» حقيقةُ القسم، والتصفيةُ عدسةٌ لا تغيّرها.
 */
export function SeatBoard({ model, actions, visible = () => true }: { model: SeatBoardModel; actions: SeatActions; visible?: (p: Position) => boolean }) {
  const show = (p: Position | null): p is Position => !!p && visible(p);
  const pres = model.council.find((p) => p.roleName === "club_president") ?? null;
  const ceo = model.council.find((p) => p.roleName === "executive_council_president") ?? null;
  const rest = model.council.filter((p) => p !== pres && p !== ceo);
  const tiers = [[pres].filter(show), [ceo].filter(show), rest.filter(show)].filter((t) => t.length);
  const opsSeats = model.depts.flatMap((d) => [d.head, ...d.committees.flatMap((c) => [c.lead, c.dep])]).filter((p): p is Position => !!p);
  const realDepts = model.depts.filter((d) => d.id != null).length;
  // تعديلُ المجلس: الوصفُ ورابطُ القروب وحدهما (لا أيقونةَ له)
  const editCouncil = (c: SeatCouncil | null) => actions.onEditUnit && c
    ? () => actions.onEditUnit?.({ kind: "council", id: c.id, name: c.name, icon: null, description: c.description, link: c.link })
    : undefined;

  return (
    <div className="seat-board">
      {tiers.length ? (
        <Card>
          <Head icon={<Bank />} title={model.admin?.name ?? "المجلس الإداري"} sub={counted(model.council.length, "مقعد واحد", "مقعدان", "مقاعد", "مقعدًا")} seats={model.council}
            onEdit={editCouncil(model.admin)} />
          <div className="seat-body">
            <div className="seat-tiers">
              {tiers.map((t, i) => (
                <div key={i} className={"seat-tier" + (t.length > 1 ? " is-pair" : "")}>
                  {t.map((p) => <Seat key={p.key} p={p} lg actions={actions} />)}
                </div>
              ))}
            </div>
          </div>
        </Card>
      ) : null}

      {opsSeats.some(show) ? (
        <SectionTitle title={model.ops?.name ?? "المجلس التشغيلي"} sub={counted(realDepts, "قسم واحد", "قسمان", "أقسام", "قسمًا", "بلا أقسام")} seats={opsSeats}
          onEdit={editCouncil(model.ops)} />
      ) : null}

      <div className="seat-depts">
        {model.depts.map((d) => {
          const coms = d.committees
            .map((c) => ({ c, seats: [c.lead, c.dep].filter(show) }))
            .filter((x) => x.seats.length);
          const head = show(d.head) ? d.head : null;
          if (!head && !coms.length) return null;
          const all = [d.head, ...d.committees.flatMap((c) => [c.lead, c.dep])].filter((p): p is Position => !!p);
          return (
            <Card key={d.id ?? "orphans"}>
              <Head icon={<UnitIcon icon={d.icon} kind="department" />} title={d.name} sub={counted(d.committees.length, "لجنة واحدة", "لجنتان", "لجان", "لجنة", "بلا لجان")} seats={all}
                onEdit={actions.onEditUnit && d.id != null ? () => actions.onEditUnit?.({ kind: "department", id: d.id as number, name: d.name, icon: d.icon, description: d.description, link: d.link }) : undefined} />
              {head ? <div className="seat-body"><Seat p={head} lg actions={actions} /></div> : null}
              {coms.map(({ c, seats }) => {
                const gaps = vacantOf([c.lead, c.dep].filter((p): p is Position => !!p));
                return (
                  <div key={c.id} className="seat-com">
                    <h4 className="seat-com-t">
                      <span className="seat-com-ic" aria-hidden><UnitIcon icon={c.icon} kind="committee" /></span>
                      <span className="seat-com-name">{c.name}</span>
                      {actions.onEditUnit ? (
                        <IconButton size="sm" className="seat-edit" aria-label={`تعديل ${c.name}`} title="تعديل"
                          onClick={() => actions.onEditUnit?.({ kind: "committee", id: c.id, name: c.name, icon: c.icon, description: c.description, link: c.link })}>
                          <PencilSimple aria-hidden />
                        </IconButton>
                      ) : null}
                      <span className="seat-com-rule" aria-hidden />
                      {gaps ? <Badge tone="danger" variant="soft" size="sm">{gaps === 1 ? "مقعدٌ شاغر" : "مقعدان شاغران"}</Badge> : null}
                    </h4>
                    <div className="seat-pair">{seats.map((p) => <Seat key={p.key} p={p} actions={actions} />)}</div>
                  </div>
                );
              })}
              {actions.onAddUnit && d.id != null ? (
                <div className="seat-add-row">
                  <button type="button" className="seat-add" onClick={() => actions.onAddUnit?.(blank("committee", { id: d.id as number, name: d.name }))}>
                    <Plus aria-hidden />إضافة لجنة جديدة
                  </button>
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>

      {actions.onAddUnit ? (
        <button type="button" className="seat-add is-dept" onClick={() => actions.onAddUnit?.(blank("department"))}>
          <Plus aria-hidden />إضافة قسم جديد
        </button>
      ) : null}
    </div>
  );
}
