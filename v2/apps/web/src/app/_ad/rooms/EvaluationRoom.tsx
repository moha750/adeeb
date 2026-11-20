"use client";

/**
 * **إدارةُ التقييم على الهويّة الجديدة** (٢٠٢٦-١١-٢٠، مسوّدةٌ للعرض) — السلوكُ سلوكُ `dashboard/evaluation/_views/RoomRows.tsx` حرفًا:
 * المقيَّمون بهيكلهم، والدورةُ بمراحلها، والمنسّقُ المستبعَد ينتظر لجنةً بتنبيهه، والتفصيلُ نافذتُه نفسُها (`TargetDetail`) بتصحيحها
 * وإعادة حسابها واختيار لجنته.
 *
 * والشكلُ **قالبُ «قائمة السجلّات»** كتعيين المناصب (محمد ٢٠٢٦-١١-١٤: «هل نحن محتاجون فعلًا أن يكون لها مكوّنٌ خاصّ؟»): المقيَّمُ سجلّ،
 * وسجلّاتُ الوحدة تحت رأسها (تنسيقُ القسم، ثمّ كلُّ لجنةٍ فرعًا منه)، والمشاركةُ عمودان بشريطهما («الأعضاء»، «المجلس»)، والنتيجةُ
 * والحكمُ بعد التنفيذ. وكروتُ الإحصاء الأربعة صارت سطرًا في قسم الدورة (لا كروتَ إحصاءٍ في الهويّة)، والمستثنى موضعٌ نادر
 * «خارج هذه الدورة» لا كرتٌ في الذيل.
 */
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Buildings, CalendarCheck, CalendarX, ChartBar, Compass, Gavel, LockKey, Scales, StarHalf, UserCircle, UsersThree, UserSwitch } from "@phosphor-icons/react";
import { DuotoneZone, Info, Star } from "@/app/_components/glyphs";
import { fmtDayMonth } from "@/lib/dates";
import { arCount, type ArForms } from "@/lib/arabicCount";
import { percentText } from "@/lib/evaluation/score";
import type { ElectorRow, TargetRow } from "@/app/dashboard/evaluation/data";
import { CYCLE_STATUS_LABEL, verdictWord } from "@/app/dashboard/evaluation/vocab";
import { addDays, cycleName, cycleShort, excludedWhy, frac, quorumLine, seatLine, type RoomProps } from "@/app/dashboard/evaluation/shared";
import { EvaluationDetail, ofMembers } from "./EvaluationDetail";
import { AdBadge, AdButton, AdGroupHead, AdNote, AdRow, AdStages, AdSwitch, type AdCell, type AdMeta, type AdTone } from "../primitives";
import { AdLine, AdSection } from "../account";
import { CollectionRoom, type Position } from "../collection";

const NAV = "/dashboard/evaluation";
const AR_TARGET: ArForms = ["مقيَّمٌ واحد", "مقيَّمان", "مقيَّمين", "مقيَّمًا"];
const AR_RATER: ArForms = ["مقيِّمٌ واحد", "مقيِّمان", "مقيِّمين", "مقيِّمًا"];
const AR_SHEET: ArForms = ["ورقةٌ واحدة", "ورقتان", "أوراق", "ورقةً"];

const VERDICT_TONE: Record<string, AdTone> = { kept: "ok", removed: "bad", no_result: "neutral" };
const STATUS_TONE: Record<string, AdTone> = { scheduled: "neutral", open: "info", closed: "warn", executed: "ok" };

const rankIcon = (role: string): ReactNode =>
  role === "department_head" ? <Compass /> : role === "committee_leader" ? <Star /> : <StarHalf />;

/** المجموعةُ: تنسيقُ القسم رأسٌ أعلى، واللجنةُ فرعٌ تحته (كتعيين المناصب) */
type Unit = { key: string; title: string; sub: string; top: boolean; order: number };

export function EvaluationRoom(props: RoomProps) {
  const { cycles, cycleId, onCycle, targets, departments, canManage, canViewResults } = props;
  const cycle = cycles.find((c) => c.id === cycleId) ?? cycles[0];
  const [openId, setOpenId] = useState<number | null>(null);
  const [electorate, setElectorate] = useState<ElectorRow[] | null>(null);
  const open = targets.find((t) => t.id === openId) ?? null;
  const fetchElectorate = async (id: number) => setElectorate(await props.loadElectorate(id));
  const openTarget = (id: number) => { setOpenId(id); setElectorate(null); void fetchElectorate(id); };
  useEffect(() => {
    const id = props.initialOpen;
    if (id) void props.loadElectorate(id).then((e) => { setOpenId(id); setElectorate(e); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const results = canViewResults && cycle.status === "executed";
  const closed = cycle.status !== "open";
  const live = targets.filter((t) => !t.excluded);
  const waiting = canManage ? targets.filter((t) => t.awaiting_return) : [];

  // ── الوحدات: لكلّ قسمٍ رأسُ تنسيقه، ثمّ لجانُه بأسمائها مرتّبة ──
  const units = useMemo(() => {
    const map = new Map<string, Unit>();
    const depts = [...new Set(targets.map((t) => t.department_id ?? 0))]
      .sort((a, b) => (departments[a] ?? "").localeCompare(departments[b] ?? "", "ar"));
    let order = 0;
    for (const d of depts) {
      const dName = departments[d] ?? "بلا قسم";
      map.set(`d${d}`, { key: `d${d}`, title: dName, sub: "تنسيق القسم", top: true, order: order++ });
      const comms = [...new Set(targets.filter((t) => (t.department_id ?? 0) === d && t.role_name !== "department_head").map((t) => t.unit_name))]
        .sort((a, b) => a.localeCompare(b, "ar"));
      for (const c of comms) map.set(`d${d}:${c}`, { key: `d${d}:${c}`, title: c, sub: dName, top: false, order: order++ });
    }
    return map;
  }, [targets, departments]);
  const unitOf = (t: TargetRow) => (t.role_name === "department_head" ? `d${t.department_id ?? 0}` : `d${t.department_id ?? 0}:${t.unit_name}`);

  // ── السطر ──
  const members = (t: TargetRow): AdCell => {
    const q = quorumLine(t.members_ballots, t.members_eligible, closed);
    const need = Math.max(1, Math.ceil(t.members_eligible / 2)) - t.members_ballots;
    const n = ofMembers(t.members_ballots, t.members_eligible);
    // «القطعُ وكلمتُه» (اعتمده محمد ٢٠٢٦-١١-٢٠): الشريطُ مقطوعٌ عند نصفه وتحت القطع «النصف»، وما بقي له كلمةٌ مكانَ النسبة
    return {
      label: "أوراق الأعضاء", value: n, tone: q.met ? undefined : closed ? "bad" : "warn",
      of: { now: t.members_ballots, max: t.members_eligible, mark: { at: 50, label: "النصف" }, word: q.met ? undefined : closed ? "لم يبلغه" : `بقي ${need}` },
    };
  };
  const council = (t: TargetRow): AdCell => ({
    label: "أوراق المجلس", value: `${t.council_ballots} من ${t.council_eligible}`, of: { now: t.council_ballots, max: t.council_eligible },
  });
  const cellsOf = (t: TargetRow): AdCell[] => {
    const base = [
      members(t),
      council(t),
    ];
    if (!results) return base;
    const f = frac(t.final_num, t.final_den);
    // النتيجةُ بشريطها وقطعِ حدّ الاستبعاد عند 40% كنافذة التفاصيل: كانت رقمًا وحده، فيقعد تحت اسم عموده بفراغٍ كبير بين جارَيه ذوَي الشريط
    // (محمد ٢٠٢٦-١١-٢٠: «لماذا في عمود النتيجة gap؟»). والحكمُ شارةُ السطر، فلا كلمةَ مكانَ النسبة
    return [...base, {
      label: "النتيجة", value: f ? `${percentText(f)}%` : "—", ltr: true,
      of: { now: f ? (f.num / f.den) * 100 : 0, max: 100, word: "", mark: { at: 40, label: "الحدّ" } },
    }];
  };
  const badgeOf = (t: TargetRow) => {
    if (t.excluded) return <AdBadge icon={<CalendarX />}>خارج هذه الدورة</AdBadge>;
    if (!results || !t.verdict) return null;
    return t.awaiting_return
      ? <AdBadge tone="warn" icon={<UserSwitch />}>ينتظر لجنة</AdBadge>
      : <AdBadge tone={VERDICT_TONE[t.verdict]}>{verdictWord(t.verdict, t.gender)}</AdBadge>;
  };
  // **المنصبُ تحت الاسم لا عمودًا** (محمد ٢٠٢٦-١١-٢٠: «نورة عبد الله القحطاني، قائدة لجنة كذا… فيفرغ المكانُ لأوراق الأعضاء وأوراق المجلس»)
  const subOf = (t: TargetRow): AdMeta[] => [
    { icon: <DuotoneZone>{rankIcon(t.role_name)}</DuotoneZone>, text: seatLine(t.role_name, t.unit_name, t.gender) },
    ...(t.excluded ? [{ icon: <CalendarX />, text: excludedWhy(t.gender, cycle.due_on), tone: "muted" as const }] : []),
  ];
  const row = (t: TargetRow) => (
    <AdRow key={t.id} face={{ name: t.full_name, gender: t.gender }} title={t.full_name} onOpen={() => openTarget(t.id)}
      badge={badgeOf(t)} sub={subOf(t)} cells={cellsOf(t)}
      acts={<AdButton variant="soft" size="sm" icon={<ChartBar />} onClick={() => openTarget(t.id)}>التفاصيل</AdButton>} />
  );
  const headOf = (items: TargetRow[]) => {
    const u = units.get(unitOf(items[0]))!;
    return (
      <AdGroupHead title={u.title}
        lead={<span className={u.top ? "ad-sec-ic" : "ad-asg-sub-ic"} aria-hidden>{u.top ? <Buildings /> : <UsersThree />}</span>}
        sub={[{ icon: u.top ? <Compass /> : <Buildings />, text: `${u.sub}، ${arCount(items.length, AR_TARGET)}` }]} />
    );
  };

  // ── المواضع ──
  const POS: Position<TargetRow>[] = results
    ? [
      { key: "all", label: "الكلّ", match: (t) => !t.excluded, empty: "لا مقيَّمين في هذه الدورة." },
      { key: "kept", label: "باقون", match: (t) => !t.excluded && t.verdict === "kept", empty: "لا أحد." },
      { key: "removed", label: "مستبعَدون", match: (t) => !t.excluded && t.verdict === "removed", empty: "لم يُستبعد أحد." },
      { key: "excluded", label: "خارج هذه الدورة", match: (t) => !!t.excluded, empty: "لا مستثنى.", rare: true },
    ]
    : [
      { key: "all", label: "الكلّ", match: (t) => !t.excluded, empty: "لا مقيَّمين في هذه الدورة." },
      { key: "short", label: "دون النصف", match: (t) => !t.excluded && !quorumLine(t.members_ballots, t.members_eligible, closed).met, empty: "بلغ الجميعُ النصف." },
      { key: "excluded", label: "خارج هذه الدورة", match: (t) => !!t.excluded, empty: "لا مستثنى.", rare: true },
    ];

  // ── الدورة: مراحلُها سطورًا، وأرقامُها جملةً، والدوراتُ مبدّلٌ إن تعدّدت ──
  const at = { scheduled: -1, open: 1, closed: 2, executed: 3 }[cycle.status];
  const steps = [
    { key: "open", label: "الفتح", date: cycle.due_on, icon: <CalendarCheck /> },
    { key: "last", label: "آخر يوم", date: addDays(cycle.due_on, 2), icon: <LockKey /> },
    { key: "verdict", label: "الحكم والتنفيذ", date: addDays(cycle.due_on, 3), icon: <Gavel /> },
  ];
  const excludedN = targets.length - live.length;
  // الدورةُ بلا مقيَّمين بعدُ (قادمة) لا تُعدّ أصفارًا («0 مقيَّمًا، 0 مقيِّمًا، 0 ورقةً»): مراحلُها وشارتُها وفراغُ القائمة تقول ما يُنتظر
  const facts = targets.length === 0 ? undefined : [
    arCount(live.length, AR_TARGET),
    arCount(cycle.raters, AR_RATER),
    arCount(cycle.ballots, AR_SHEET),
    cycle.status === "executed" && canViewResults
      ? (cycle.removed ? `${cycle.removed} مستبعَد` : "لا مستبعَد")
      : excludedN ? `${excludedN} خارج الدورة` : null,
  ].filter(Boolean).join("، ") || undefined;
  const sorted = [...cycles].sort((a, b) => a.due_on.localeCompare(b.due_on));

  // الحالُ بموعدها في الشارة، فلا تتكرّر الكلمةُ في السطر، والسطرُ للأرقام وحدها
  const statusWord =
    cycle.status === "open" ? `مفتوحة حتى ${fmtDayMonth(addDays(cycle.due_on, 2))}`
      : cycle.status === "scheduled" ? `تُفتح ${fmtDayMonth(cycle.due_on)}`
        : cycle.status === "closed" ? `مغلقة، والحكم ${fmtDayMonth(addDays(cycle.due_on, 3))}`
          : CYCLE_STATUS_LABEL[cycle.status];
  const lead = (
    <>
      {cycles.length > 1 ? (
        <AdSwitch label="الدورات" positions={sorted.map((c) => ({ key: String(c.id), label: cycleShort(c.due_on) }))}
          position={String(cycle.id)} onPosition={(k) => onCycle(Number(k))} />
      ) : null}
      <AdSection icon={<Scales />} title={cycleName(cycle.due_on)} sub={facts}
        act={<AdBadge tone={STATUS_TONE[cycle.status]}>{statusWord}</AdBadge>}
        media={<AdStages label="مراحل الدورة" stages={steps.map((s, i) => ({
          key: s.key, icon: s.icon, label: s.label, date: s.date, state: i < at ? "past" : i === at ? "now" : "next",
        }))} />}>
        {/* القاعدةُ مرّةً واحدة فوق القائمة (محمد ٢٠٢٦-١١-٢٠): من يقيّم، ومتى يُعتدّ بأوراق الأعضاء (م٥/1؛ `lib/evaluation/score.ts`) */}
        <AdLine icon={<Info />} read v="يقيّم كلَّ قائدٍ أعضاءُ لجنته والمجلسُ الإداري. ولا يُعتدّ بأوراق الأعضاء إلّا إن شارك نصفُهم، وإلّا حُكم بأوراق المجلس وحدها." />
      </AdSection>
    </>
  );
  const notice = waiting.length ? (
    <>
      {waiting.map((t) => (
        <AdNote key={t.id} tone="warn" label="ينتظر قرارك" title={`استبعادُ ${t.full_name} ينتظر لجنةً يعود إليها`}
          action={<AdButton size="sm" icon={<UserSwitch />} onClick={() => openTarget(t.id)}>اختر اللجنة</AdButton>}>
          لا لجنةَ سابقةَ له، فيبقى في منصبه حتى تُختار.
        </AdNote>
      ))}
    </>
  ) : undefined;

  const columns = [
    { key: "members", label: "أوراق الأعضاء", icon: <UsersThree /> },
    { key: "council", label: "أوراق المجلس", icon: <Scales /> },
    ...(results ? [{ key: "score", label: "النتيجة", icon: <ChartBar /> }] : []),
  ];

  return (
    <>
      <CollectionRoom<TargetRow>
        navPath={NAV}
        title="إدارة التقييم"
        noun={AR_TARGET}
        items={targets}
        positions={POS}
        defaultPosition="all"
        searchPlaceholder="ابحث باسم المقيَّم أو وحدته"
        matchSearch={(t, q) => [t.full_name, t.unit_name, departments[t.department_id ?? 0] ?? ""].some((s) => s.includes(q))}
        listOnly
        group={{ of: unitOf, head: headOf, order: (a, b) => units.get(unitOf(a[0]))!.order - units.get(unitOf(b[0]))!.order }}
        table={{ head: "المقيَّم", stub: { key: "face", label: "", icon: <UserCircle /> }, columns }}
        emptyAll={{ title: "لا مقيَّمين بعد", desc: cycle.status === "scheduled" ? `تُفتح الدورةُ في ${fmtDayMonth(cycle.due_on)}، ويُعرف مقيَّموها يومَ فتحها.` : "لم يُسجَّل في هذه الدورة مقيَّم." }}
        lead={lead}
        notice={notice}
        renderCard={row}
        renderRow={row}
      />

      {open ? (
        <EvaluationDetail target={open} electorate={electorate} people={props.people} committees={props.committees} departments={departments}
          canManage={canManage} canViewResults={canViewResults} closed={closed} actions={props.actions}
          onClose={() => setOpenId(null)} onDone={() => { void fetchElectorate(open.id); props.onChanged?.(); }} />
      ) : null}
    </>
  );
}
