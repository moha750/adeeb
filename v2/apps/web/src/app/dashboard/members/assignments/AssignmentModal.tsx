"use client";

import { Fragment, useMemo, useState } from "react";
import { Button, Field, IconButton, Modal, ModalSectionHeading, Select, type SelectOption } from "@adeeb/design-system";
import { ArrowsLeftRight, Briefcase, CalendarBlank, CalendarCheck, Gavel, ListChecks, NotePencil, UserPlus, UserSwitch } from "@phosphor-icons/react";
import { ArrowLeft, Plus, Trash } from "@/app/_components/glyphs";
import { positionLine } from "@/lib/positionLabel";
import { clubDayKey } from "@/lib/dates";
import { Avatar } from "../../_components/Avatar";
import type { Holder, Position, RawCommittee, RawDept } from "../structure/model";
import { COUNCIL_AR } from "./positionLabels";

export type MemberOption = { id: string; name: string; avatar?: string | null; gender?: "male" | "female" | null; held?: string | null; heldRole?: string | null };

// حالة المحرّر: إسنادٌ (لشاغرٍ أو زيادةٌ لمتعدّد أو استبدالٌ لمشغولٍ مفرد) أو إزالة.
// تُملَك من المستدعي (مُتحكَّم به). والإزالة تحمل **شاغلَها**: المنصب المتعدّد فيه
// أكثر من واحد، فـ«شاغل المنصب» وحدها لا تعيّن من يُزال.
export type AssignState =
  | { kind: "assign"; position: Position; replace: boolean }
  | { kind: "remove"; position: Position; holder: Holder };

/** نقلةٌ واحدة كما تصل الخادم: عضوٌ إلى مقعد. */
export type BatchMove = { userId: string; roleName: string; committeeId: number | null; departmentId: number | null };

/**
 * ما يُرسَل: النقلاتُ كلُّها (الأولى مقعدُ النافذة)، و«يسري في» و«القرار أو السبب». و`simple` حين تكون
 * نقلةً واحدةً بلا تاريخٍ ولا سبب ولا من يُزاح: تمرّ بـ`assign_position` وحدها كما كانت (ومنها
 * تثبيتُ المكلَّف في مقعده واستبدالُ المكلَّف، ولا يدخلان الدفعة).
 */
export type AssignSubmit = { moves: BatchMove[]; effectiveOn: string | null; reason: string; simple: boolean };

/** مقعدٌ يُختار في نقلةٍ إضافيّة: المناصبُ القياديّة، وعضويّةُ كلِّ لجنة. */
type Seat = {
  key: string;
  roleName: string;
  committeeId: number | null;
  departmentId: number | null;
  label: string;
  group: string;
  singleton: boolean;
  holders: Holder[];
  prerequisite: string | null;
  requiresMembership: boolean;
};

/** تغييرٌ أُضيف بيد («إضافة تعيين آخر»): مقعدٌ وعضو. */
type Extra = { id: number; seatKey: string; userId: string };
/** صفٌّ في الخطّة: عضوٌ إلى مقعد. `root` التغييرُ الذي ولّده (0 مقعدُ النافذة)، و`ask` جوابُ «وأين ينتقل؟». */
type Row = { seat: Seat | null; userId: string; root: number; extraId?: number; ask?: boolean };
/** سؤالُ «وأين ينتقل؟»: شاغلٌ يُزاح من مقعدٍ مفردٍ طلبته الخطّة. */
type Ask = { holder: Holder; from: Seat; root: number };

// المقعدان الرئيسان ثابتان (لا يُسنَدان من هنا)، وحسابُ النادي ليس مقعدَ عضو.
const FIXED = new Set(["club_president", "executive_council_president", "adeeb_admin"]);

const seatKeyOf = (roleName: string, committeeId: number | null, departmentId: number | null) =>
  `${roleName}|${committeeId ?? ""}|${departmentId ?? ""}`;

function buildSeats(positions: Position[], committees: RawCommittee[], departments: RawDept[]): Seat[] {
  const deptName = new Map(departments.map((d) => [d.id, d.name_ar ?? `قسم #${d.id}`]));
  const comById = new Map(committees.map((c) => [c.id, c]));
  const groupOf = (committeeId: number | null, departmentId: number | null, council: Position["council"]) => {
    if (departmentId != null) return deptName.get(departmentId) ?? COUNCIL_AR[council];
    const c = committeeId != null ? comById.get(committeeId) : undefined;
    if (c?.department_id != null) return deptName.get(c.department_id) ?? COUNCIL_AR[council];
    return COUNCIL_AR[council];
  };

  const out: Seat[] = [];
  const seen = new Set<string>();
  for (const p of positions) {
    if (FIXED.has(p.roleName)) continue;
    const key = seatKeyOf(p.roleName, p.committeeId, p.departmentId);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      key, roleName: p.roleName, committeeId: p.committeeId, departmentId: p.departmentId,
      label: positionLine(p.roleAr, p.scope) ?? p.roleAr, group: groupOf(p.committeeId, p.departmentId, p.council),
      singleton: p.singleton, holders: p.holders, prerequisite: p.prerequisite, requiresMembership: p.requiresMembership,
    });
  }
  // عضويّةُ اللجنة مقعدٌ متعدّد: إليها يعود من نُقل من منصبه، ومنها يُرقّى القادة
  for (const c of committees) {
    if (!c.member_role_name || FIXED.has(c.member_role_name)) continue;
    const key = seatKeyOf(c.member_role_name, c.id, null);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      key, roleName: c.member_role_name, committeeId: c.id, departmentId: null,
      label: positionLine("عضو", c.committee_name_ar) ?? "عضو", group: groupOf(c.id, null, c.council_id === "administrative" ? "administrative" : "executive"),
      singleton: false, holders: [], prerequisite: null, requiresMembership: false,
    });
  }
  return out;
}

const seatOfPosition = (p: Position): Seat => ({
  key: seatKeyOf(p.roleName, p.committeeId, p.departmentId), roleName: p.roleName, committeeId: p.committeeId, departmentId: p.departmentId,
  label: positionLine(p.roleAr, p.scope) ?? p.roleAr, group: COUNCIL_AR[p.council], singleton: p.singleton, holders: p.holders,
  prerequisite: p.prerequisite, requiresMembership: p.requiresMembership,
});

// شرطُ المقعد يضيّق البِركة: منصبٌ بعينه (`prerequisite`)، أو العضويّة (`requiresMembership`). بيانٌ يُقرأ لا حُكمٌ
// يُستنسخ؛ والقاعدة تردّ ما فات (`NEEDS_PREREQUISITE`/`NEEDS_MEMBERSHIP`).
const eligibleFor = (seat: Pick<Seat, "prerequisite" | "requiresMembership"> | null, members: MemberOption[]) =>
  seat?.prerequisite ? members.filter((m) => m.heldRole === seat.prerequisite)
    : seat?.requiresMembership ? members.filter((m) => m.heldRole != null) : members;

const memberOptions = (list: MemberOption[]): SelectOption[] => list.map((m) => ({
  value: m.id, label: m.name, hint: m.held ?? undefined,
  icon: <Avatar name={m.name} src={m.avatar ?? undefined} gender={m.gender} size="xs" />,
}));

/**
 * محرّر الإسناد — النافذة المنغّمة (القاعدة ٩). النغمةُ تقول شدّة الفعل:
 * إسنادٌ واستبدالٌ = محايد (الاستبدالُ كان برتقاليًّا فردّه محمد ٢٠٢٦-١٠-٢٣) · إزالة = danger.
 *
 * **وتغييراتٌ معًا** (٢٠٢٦-١٠-٢٣، قرار محمد): تُطبَّق كلُّها أو لا يُطبَّق منها شيء (`create_position_batch`).
 * والنافذةُ مبنيّةٌ حول الأشخاص لا «النقلات» (ردّ محمد الأولى: «لم أفهم شيئًا»): من يُزاح من مقعده تسأل عنه
 * «وأين ينتقل فلان؟» تحت اختياره مباشرة، وجوابُه قد يُزيح غيرَه فتسأل عنه — حتى تنغلق الدورة. فتبديلُ قائدٍ ونائبه
 * ودورةُ ثلاثةٍ بين مقاعدهم نافذةٌ واحدةٌ بلا فكرةٍ جديدة، و«تغيير منصب عضو آخر» للمستقلّ (التشكيل السنويّ).
 * و«ملخص التغييرات» يقول لكلّ واحدٍ من أين إلى أين، وما يبقى شاغرًا.
 * و«يسري في» يجعلها مجدولة، و«القرار أو السبب» سجلٌّ داخليّ لا يصل العضو.
 *
 * تملك حالتَها (الاختيار والنقلات والتاريخ والسبب) وتُفتح من جديدٍ بمفتاحٍ يضعه المستدعي.
 */
export function AssignmentModal({
  state,
  members,
  positions,
  committees,
  departments,
  busy,
  onClose,
  onAssign,
  onRemove,
}: {
  state: AssignState | null;
  members: MemberOption[];
  positions: Position[];
  committees: RawCommittee[];
  departments: RawDept[];
  busy: boolean;
  onClose: () => void;
  onAssign: (v: AssignSubmit) => void;
  onRemove: () => void;
}) {
  const [pick, setPick] = useState("");
  // «وأين ينتقل؟»: لكلّ من يُزاح من مقعده مقعدُه الجديد (معرّفُ العضو ← مفتاحُ المقعد)
  const [dest, setDest] = useState<Record<string, string>>({});
  const [extras, setExtras] = useState<Extra[]>([]);
  const [nextId, setNextId] = useState(1);
  const [effectiveOn, setEffectiveOn] = useState("");
  const [reason, setReason] = useState("");

  const p = state?.position ?? null;
  const isRemove = state?.kind === "remove";
  const isReplace = state?.kind === "assign" && state.replace;
  const isAssign = state?.kind === "assign";
  // الاستبدالُ بلون النافذة العاديّ لا البرتقاليّ (محمد ٢٠٢٦-١٠-٢٣)؛ والإزالةُ وحدها منغّمة
  const tone = isRemove ? "danger" : undefined;
  const isAdd = isAssign && !state.replace && p !== null && !p.singleton && p.holders.length > 0;
  const verb = isRemove ? "إزالة من منصب" : isReplace ? "استبدال شاغل منصب" : isAdd ? "إضافة شاغل إلى منصب" : "إسناد منصب";
  const holder = state?.kind === "remove" ? state.holder : isReplace ? p?.holders[0] ?? null : null;

  const seats = useMemo(() => buildSeats(positions, committees, departments), [positions, committees, departments]);
  const seatByKey = useMemo(() => new Map(seats.map((s) => [s.key, s])), [seats]);
  const primarySeat = useMemo(() => (p ? seatOfPosition(p) : null), [p]);

  // من يُرى في النافذة: البِركةُ وشاغلو المقاعد (من يُزاح قد لا يكون في البِركة، واسمُه يُقال على كلّ حال)
  const people = useMemo(() => {
    const m = new Map<string, { name: string; avatar: string | null; gender: "male" | "female" | null; held: string | null }>();
    for (const s of seats) for (const h of s.holders) if (!h.frozen) m.set(h.userId, { name: h.name, avatar: h.avatar, gender: h.gender, held: s.label });
    for (const x of members) m.set(x.id, { name: x.name, avatar: x.avatar ?? null, gender: x.gender ?? null, held: x.held ?? m.get(x.id)?.held ?? null });
    return m;
  }, [seats, members]);

  /**
   * **الخطّة**: التغييراتُ كلُّها بترتيبها، وأسئلةُ «وأين ينتقل؟». الأوّلُ مقعدُ النافذة، ثمّ ما أُضيف بيد.
   * ومن يُزاح من مقعدٍ مفرد (شاغلٌ أصيلٌ ليس في الخطّة) يُسأل عنه؛ فإذا اختير له مقعدٌ صار في الخطّة، وقد يُزيح
   * غيرَه فيُسأل عنه بعده — حتى تنغلق الدورة على مقعدٍ أخلاه أحدُهم. وكلُّ سؤالٍ يُعرض تحت التغيير الذي ولّده (`root`).
   * والمكلَّفُ لا يُزاح: يعود إلى أصيله.
   */
  const plan = useMemo(() => {
    const rows: Row[] = [];
    if (primarySeat) rows.push({ seat: primarySeat, userId: pick, root: 0 });
    for (const e of extras) rows.push({ seat: seatByKey.get(e.seatKey) ?? null, userId: e.userId, extraId: e.id, root: e.id });
    const asks: Ask[] = [];
    for (let round = 0; round < 64; round++) {
      const movers = new Set(rows.map((r) => r.userId).filter(Boolean));
      const fresh: Ask[] = [];
      for (const r of rows) {
        if (!r.seat?.singleton || !r.userId) continue;
        for (const h of r.seat.holders) {
          if (h.acting || h.frozen || movers.has(h.userId)) continue;
          if (asks.some((a) => a.holder.userId === h.userId) || fresh.some((a) => a.holder.userId === h.userId)) continue;
          fresh.push({ holder: h, from: r.seat, root: r.root });
        }
      }
      if (!fresh.length) break;
      for (const a of fresh) {
        asks.push(a);
        const k = dest[a.holder.userId];
        if (k) rows.push({ seat: seatByKey.get(k) ?? null, userId: a.holder.userId, root: a.root, ask: true });
      }
    }
    const movers = new Set(rows.map((r) => r.userId).filter(Boolean));
    const pending = asks.filter((a) => !movers.has(a.holder.userId));
    const targeted = new Set(rows.filter((r) => r.seat).map((r) => r.seat!.key));
    // ما يبقى شاغرًا: مقعدٌ مفردٌ يغادره من في الخطّة ولا يدخله أحد
    const vacated = seats.filter((s) => s.singleton && !targeted.has(s.key)
      && s.holders.some((h) => !h.acting && !h.frozen && movers.has(h.userId))).map((s) => s.label);
    const users = rows.map((r) => r.userId).filter(Boolean);
    const dupUser = users.find((u, i) => users.indexOf(u) !== i) ?? null;
    const singles = rows.filter((r) => r.seat?.singleton).map((r) => r.seat!.key);
    const dupSeat = singles.find((k, i) => singles.indexOf(k) !== i) ?? null;
    const incomplete = rows.some((r) => !r.seat || !r.userId);
    return { rows, asks, pending, vacated, dupUser, dupSeat, incomplete };
  }, [primarySeat, pick, extras, dest, seatByKey, seats]);

  const multi = plan.rows.length > 1 || extras.length > 0;
  const showSummary = isAssign && pick !== "" && (plan.rows.length > 1 || plan.vacated.length > 0);
  const scheduled = effectiveOn !== "";
  const ready = !plan.incomplete && !plan.dupUser && !plan.dupSeat && plan.pending.length === 0;
  // التغييرُ الواحد بلا تاريخٍ ولا سبب يمرّ بـ`assign_position` وحدها كما كان (ومنه استبدالُ المكلَّف وتثبيتُه)
  const simple = plan.rows.length === 1 && extras.length === 0 && !scheduled && reason.trim() === "";

  // أوّلُ يومٍ يُجدوَل فيه: الغد (اليومُ نفسُه فوريّ). يُحسب مرّةً عند الفتح
  const [tomorrow] = useState(() => clubDayKey(new Date(Date.now() + 86400000).toISOString()));

  const addExtra = () => {
    setExtras((xs) => [...xs, { id: nextId, seatKey: "", userId: "" }]);
    setNextId((n) => n + 1);
  };
  const setExtra = (id: number, patch: Partial<Extra>) => setExtras((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const dropExtra = (id: number) => setExtras((xs) => xs.filter((x) => x.id !== id));

  const canSubmit = isAssign && pick !== "" && ready;
  const submit = () => {
    if (isRemove) return onRemove();
    if (!canSubmit) return;
    onAssign({
      moves: plan.rows.map((r) => ({ userId: r.userId, roleName: r.seat!.roleName, committeeId: r.seat!.committeeId, departmentId: r.seat!.departmentId })),
      effectiveOn: scheduled ? effectiveOn : null,
      reason: reason.trim(),
      simple,
    });
  };

  const submitLabel = scheduled ? "جدولة" : multi ? "تطبيق التعيينات" : isReplace ? "استبدال" : isAdd ? "إضافة" : "إسناد";

  // المقاعدُ المعروضة لاختيارٍ ما: لا مقعدٌ مفردٌ طلبه غيرُه في الخطّة، ولا المقعدُ الذي يُزاح منه صاحبُ السؤال
  const seatOptions = (self: (r: Row) => boolean, except?: string): SelectOption[] => {
    const taken = new Set(plan.rows.filter((r) => !self(r) && r.seat?.singleton).map((r) => r.seat!.key));
    return seats.filter((s) => !taken.has(s.key) && s.key !== except).map((s) => ({
      value: s.key, label: s.label, group: s.group,
      hint: s.singleton ? (s.holders.filter((h) => !h.frozen).map((h) => h.name).join("، ") || "شاغر") : undefined,
    }));
  };
  // والأعضاءُ المعروضون: لا من اختير في تغييرٍ آخر
  const membersFor = (seat: Seat | null, self: (r: Row) => boolean) => {
    const others = new Set(plan.rows.filter((r) => !self(r) && r.userId).map((r) => r.userId));
    return eligibleFor(seat, members).filter((m) => !others.has(m.id));
  };

  const askFor = (a: Ask) => {
    const first = a.holder.name.split(" ")[0];
    const her = a.holder.gender === "female";
    return (
      <Select
        key={`ask-${a.holder.userId}`}
        label={`وأين ${her ? "تنتقل" : "ينتقل"} ${first}؟`}
        icon={<UserSwitch />}
        searchable
        options={seatOptions((r) => r.userId === a.holder.userId, a.from.key)}
        value={dest[a.holder.userId] ?? ""}
        onValueChange={(v) => setDest((d) => ({ ...d, [a.holder.userId]: v }))}
        placeholder="اختر المنصب"
        helper={`${her ? "تغادر" : "يغادر"} «${a.from.label}».`}
        required
      />
    );
  };
  const asksOf = (root: number) => plan.asks.filter((a) => a.root === root).map(askFor);

  return (
    <Modal
      open={state !== null}
      onClose={onClose}
      busy={busy}
      className={tone ? `mdl-tone-${tone}` : undefined}
      title={p ? `${verb} ${p.roleAr}` : verb}
      description={p ? `«${p.scope}»` : undefined}
      // الإسنادُ أعرض: حقلا القرار يتجاوران ويبقى التاريخُ مقروءًا كاملًا. والإزالةُ تأكيدٌ ضيّق
      size={isRemove ? "sm" : "md"}
      footer={
        isRemove ? (
          <>
            <Button variant="ghost-danger" size="md" onClick={onClose} disabled={busy}>إلغاء</Button>
            <Button variant="danger" size="md" loading={busy} onClick={submit}>إزالة</Button>
          </>
        ) : (
          <>
            <Button variant="ghost" size="md" onClick={onClose} disabled={busy}>إلغاء</Button>
            <Button variant="primary" size="md" loading={busy} disabled={!canSubmit} onClick={submit}>{submitLabel}</Button>
          </>
        )
      }
    >
      {p ? (
        <>
          {holder ? (
            <div className="org-modal-cur">
              <span className="org-sublbl">{isRemove ? "الشاغل" : "الشاغل الحاليّ"}</span>
              <span className="asgm-holder"><Avatar name={holder.name} src={holder.avatar ?? undefined} gender={holder.gender} size="sm" /><span>{holder.name}</span></span>
            </div>
          ) : null}

          {isAssign ? (
            <>
              <Select
                label={isReplace ? "الشاغل الجديد" : "العضو"}
                icon={<UserPlus />}
                searchable
                options={memberOptions(membersFor(primarySeat, (r) => r.root === 0 && !r.ask && r.extraId == null))}
                value={pick}
                onValueChange={setPick}
                helper={p.prerequisite ? `المرشّحون: من يشغل «${p.prerequisiteAr}» الآن، فهذا المقعد انتقالٌ لا ضمٌّ من خارج.` : undefined}
                required
              />
              {asksOf(0)}

              {extras.length > 0 ? <ModalSectionHeading icon={<ArrowsLeftRight />} title="تعيينات أخرى" /> : null}
              {extras.map((e) => {
                const seat = seatByKey.get(e.seatKey) ?? null;
                const self = (r: Row) => r.extraId === e.id;
                return (
                  <Fragment key={e.id}>
                    <div className="asgm-move">
                      <div className="form-grid">
                        <Select label="المنصب" icon={<Briefcase />} searchable options={seatOptions(self)} value={e.seatKey}
                          onValueChange={(v) => setExtra(e.id, { seatKey: v })} placeholder="اختر المنصب" required />
                        <Select label="العضو" icon={<UserPlus />} searchable options={memberOptions(membersFor(seat, self))} value={e.userId}
                          onValueChange={(v) => setExtra(e.id, { userId: v })} placeholder="اختر العضو" required />
                      </div>
                      <IconButton tone="danger" aria-label="حذف التعيين" onClick={() => dropExtra(e.id)} disabled={busy}><Trash /></IconButton>
                    </div>
                    {asksOf(e.id)}
                  </Fragment>
                );
              })}

              {showSummary ? (
                <>
                  <ModalSectionHeading icon={<ListChecks />} title="ملخص التعيينات" />
                  <div className="asgm-out">
                    {plan.rows.filter((r) => r.userId && r.seat).map((r) => {
                      const m = people.get(r.userId);
                      if (!m) return null;
                      return (
                        <div key={`${r.userId}-${r.seat!.key}`} className="asgm-out-row">
                          <Avatar name={m.name} src={m.avatar ?? undefined} gender={m.gender} size="sm" />
                          <div className="asgm-out-tx">
                            <span className="asgm-out-name">{m.name}</span>
                            <span className="asgm-out-path">
                              <span>{m.held ?? "بلا منصب"}</span>
                              <ArrowLeft aria-hidden="true" />
                              <b>{r.seat!.label}</b>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {plan.vacated.map((label) => (
                      <p key={`v-${label}`} className="asgm-out-vac">{`يبقى شاغرًا: ${label}`}</p>
                    ))}
                    {plan.dupUser ? <p className="asgm-out-err">{`«${people.get(plan.dupUser)?.name ?? ""}» في أكثر من تعيين.`}</p> : null}
                    {plan.dupSeat ? <p className="asgm-out-err">{`«${seatByKey.get(plan.dupSeat)?.label ?? primarySeat?.label ?? ""}» مقعدٌ واحد، واختير له أكثر من عضو.`}</p> : null}
                  </div>
                </>
              ) : null}

              {pick !== "" ? (
                <Button variant="ghost" size="sm" className="asgm-add" onClick={addExtra} disabled={busy}><Plus />إضافة تعيين آخر</Button>
              ) : null}

              <ModalSectionHeading icon={<Gavel />} title="القرار" />
              {/* حقلا القرار في صفٍّ واحد، والسببُ سطرٌ واحد: القسمُ أخفُّ من الإسناد نفسِه (محمد ٢٠٢٦-١٠-٢٣) */}
              <div className="form-grid">
                <Field
                  label="يسري في"
                  icon={<CalendarBlank />}
                  innerIcon={<CalendarCheck />}
                  placeholder="فورًا"
                  type="date"
                  min={tomorrow}
                  value={effectiveOn}
                  onChange={(ev) => setEffectiveOn(ev.target.value)}
                  optional
                />
                <Field
                  label="القرار أو السبب"
                  icon={<NotePencil />}
                  innerIcon={<NotePencil />}
                  placeholder="مثل: قرار المجلس الإداري"
                  value={reason}
                  onChange={(ev) => setReason(ev.target.value)}
                  optional
                />
              </div>
            </>
          ) : (
            <p className="org-modal-warn">سيُلغى تفعيل هذا المنصب. لا يُحذف السجلّ نهائيًّا، لكن قد يُسحب ترشّح العضو الانتخابيّ إن كان قائمًا.</p>
          )}
        </>
      ) : null}
    </Modal>
  );
}
