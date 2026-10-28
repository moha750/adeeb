"use client";

/**
 * **رأسُ غرفة الإدارة** — ما اختاره محمد من المقترح «أ» في الجولة الأولى (٢٠٢٦-١٠-٢٧): الدوراتُ مبدّلٌ واحد،
 * والدورةُ المختارة مراحلُ على خطٍّ (الفتح، آخر يوم، الحكم) تُضاء مرحلتُها، ثمّ أرقامُها كروتَ إحصاء. وتحتها
 * ما يحتاج فعلًا الآن (منسّقٌ مستبعَدٌ ينتظر لجنةً) تنبيهًا بزرّه، لا شارةً تُدفن في القائمة.
 * ويقرؤه مقترحا الجولة الثانية كلاهما، فلا يفترق الرأسُ بينهما.
 */
import { Alert, Badge, Button, Segmented, Stat } from "@adeeb/design-system";
import { CalendarCheck, Gavel, LockKey, Notebook, UserCircleMinus, UserFocus, UsersThree, UserSwitch } from "@phosphor-icons/react";
import { fmtDayMonth } from "@/lib/dates";
import { PageHeader } from "../../_components/PageHeader";
import type { CycleRow, ElectorRow, TargetRow } from "../data";
import { CYCLE_STATUS_LABEL } from "../vocab";
import { Of, cycleName, cycleShort, quorumLine } from "./parts";
import type { DetailActions } from "./TargetDetail";

export type RoomProps = {
  cycles: CycleRow[];
  cycleId: number;
  onCycle: (id: number) => void;
  targets: TargetRow[];
  departments: Record<number, string>;
  canManage: boolean;
  canViewResults: boolean;
  /** مقيِّمو مقيَّمٍ واحد يُجلبون عند فتح تفصيله (أسماءٌ وشقّ، ولا شيءَ عن مشاركتهم). */
  loadElectorate: (targetId: number) => Promise<ElectorRow[]>;
  /** بعد كلّ تصحيح: تُعاد قراءةُ الدورة (في الصفحة `router.refresh`). */
  onChanged?: () => void;
  people: { id: string; name: string }[];
  committees: { id: number; name: string; department_id?: number | null }[];
  actions: DetailActions;
  /** الأوجهُ قيد الاختيار (المعرض وحده يسمّيها). */
  look?: Partial<RoomLook>;
  /** يُفتح تفصيلُ هذا المقيَّم عند الرسم (المعرض). */
  initialOpen?: number;
};

const STATUS_TONE = { scheduled: "neutral", open: "info", closed: "warning", executed: "success" } as const;

/** «بعد يومين» على تاريخٍ بلا وقت: يُحسب بالتقويم لا بالساعة، فلا تزيحه منطقةُ الخادم. */
export function addDays(dateOnly: string, n: number): string {
  const [y, m, d] = dateOnly.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/**
 * **أوجهُ الغرفة قيد الاختيار** (جولة ملاحظات المحاكي، ٢٠٢٦-١٠-٢٧). لكلّ مسألةٍ وجهان في `/ui/evaluation`، ويُعدَم
 * المرفوضُ بعد اختيار محمد. وما لم يُسمَّ يأخذ الوجهَ الأوّل.
 * (صفُّ المستبعَد حُسم: «صبغة» مستويةٌ بلا تدرّج وأشرطةٌ محايدة، اختيارُ محمد ٢٠٢٦-١٠-٢٨، وأُعدمت «الحافّة».)
 * (علامةُ النصاب حُسمت: خطٌّ مسمًّى «النصف» على شريط الأعضاء، اختيارُ محمد ٢٠٢٦-١٠-٢٨، وأُعدمت «الجملة».)
 * - `excluded`: المستثنى: «صفّ» في مكانه من لجنته بسببه، أو «كرت» مستقلّ «خارج هذه الدورة».
 * - `detail`: نافذةُ التفصيل: «ملفّ» بنمط نافذة الشخص في المنصّة، أو «تبويبات».
 */
export type RoomLook = { excluded: "row" | "card"; detail: "profile" | "tabs" };
export const DEFAULT_LOOK: RoomLook = { excluded: "row", detail: "profile" };

/**
 * شريطُ مشاركةِ شقٍّ: الممتلئُ أوراقُه، والنصابُ (للأعضاء وحدهم، م٥/1) خطٌّ عند منتصفه اسمُه **«النصف»** لا «النصاب»:
 * بلا تشكيلٍ تُقرأ «النصّاب» (المحتال)، والخطُّ يعني حرفيًّا نصفَ الأعضاء (محمد ٢٠٢٦-١٠-٢٨).
 */
export function PartMeter({ n, of, quorum, label, closed = false }: { n: number; of: number; quorum?: boolean; label?: string; closed?: boolean }) {
  const p = of ? Math.min(100, (n / of) * 100) : 0;
  const q = quorum ? quorumLine(n, of, closed) : null;
  const met = q ? q.met : n >= 1;
  return (
    <span className={"eva-meter" + (met ? " met" : "")}>
      {label ? <span className="eva-meter-l">{label}</span> : null}
      <span className="eva-meter-track" aria-hidden>
        <span className="eva-meter-fill" style={{ inlineSize: `${p}%` }} />
        {q ? <span className="eva-meter-q"><span className="eva-meter-qw">النصف</span></span> : null}
      </span>
      <Of n={n} of={of} className="eva-meter-n" />
    </span>
  );
}

export function RoomHead({ cycles, cycle, onCycle, targets, canManage, canViewResults, onOpen }: {
  cycles: CycleRow[];
  cycle: CycleRow;
  onCycle: (id: number) => void;
  targets: TargetRow[];
  canManage: boolean;
  canViewResults: boolean;
  onOpen: (id: number) => void;
}) {
  const evaluated = targets.filter((t) => !t.excluded);
  const excluded = targets.length - evaluated.length;
  const waiting = canManage ? targets.filter((t) => t.awaiting_return) : [];
  const steps = [
    { key: "open", label: "الفتح", date: cycle.due_on, icon: <CalendarCheck /> },
    { key: "last", label: "آخر يوم", date: addDays(cycle.due_on, 2), icon: <LockKey /> },
    { key: "verdict", label: "الحكم والتنفيذ", date: addDays(cycle.due_on, 3), icon: <Gavel /> },
  ];
  // المرحلةُ القائمة: المفتوحةُ تنتظر «آخر يوم»، والمغلقةُ تنتظر الحكم، والمنتهيةُ مضت مراحلُها كلُّها
  const at = { scheduled: -1, open: 1, closed: 2, executed: 3 }[cycle.status];

  return (
    <>
      <PageHeader title="إدارة التقييم" crumb={[{ kind: "leaf", label: "تقييم القيادات" }]} />

      {cycles.length > 1 ? (
        <Segmented
          className="eva-cycles"
          items={cycles.map((c) => ({ value: String(c.id), label: cycleShort(c.due_on) }))}
          value={String(cycle.id)}
          onValueChange={(v) => onCycle(Number(v))}
        />
      ) : null}

      <section className="eva-cycle">
        <div className="eva-cycle-h">
          <h2>{cycleName(cycle.due_on)}</h2>
          <Badge tone={STATUS_TONE[cycle.status]} variant="soft" dot live={cycle.status === "open"}>{CYCLE_STATUS_LABEL[cycle.status]}</Badge>
        </div>
        <ol className="eva-steps">
          {steps.map((s, i) => (
            <li key={s.key} className={"eva-step" + (i < at ? " past" : i === at ? " now" : "")}>
              <span className="eva-step-ic" aria-hidden>{s.icon}</span>
              <span className="eva-step-tx"><b>{s.label}</b><span>{fmtDayMonth(s.date)}</span></span>
            </li>
          ))}
        </ol>
      </section>

      <div className="stat-grid eva-stats">
        <Stat icon={<UserFocus />} value={<span className="font-latin">{evaluated.length}</span>} label="المقيَّمون" />
        <Stat icon={<UsersThree />} value={<span className="font-latin">{cycle.raters}</span>} label="المقيِّمون" />
        <Stat icon={<Notebook />} value={<span className="font-latin">{cycle.ballots}</span>} label="الأوراق" />
        {cycle.status === "executed" && canViewResults ? (
          <Stat icon={<UserCircleMinus />} value={<span className="font-latin">{cycle.removed}</span>} label="المستبعَدون" tone={cycle.removed ? "danger" : undefined} />
        ) : (
          <Stat icon={<UserCircleMinus />} value={<span className="font-latin">{excluded}</span>} label="المستثنَون" />
        )}
      </div>

      {waiting.map((t) => (
        <Alert
          key={t.id}
          tone="warning"
          className="eva-wait"
          title={`استبعادُ ${t.full_name} ينتظر لجنةً يعود إليها`}
          actions={<Button size="sm" variant="warning" onClick={() => onOpen(t.id)}><UserSwitch aria-hidden />اختر اللجنة</Button>}
        >
          لا لجنةَ سابقةَ له، فيبقى في منصبه حتى تُختار.
        </Alert>
      ))}
    </>
  );
}
