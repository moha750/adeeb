"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, SectionCard, Stat, countPhrase, matchesSearch, unitWord } from "@adeeb/design-system";
import { Buildings, Clock, EnvelopeSimple, Heartbeat, Hourglass, PaperPlaneTilt } from "@phosphor-icons/react";
import { ArrowCounterClockwise, ArrowsClockwise, Warning } from "@/app/_components/glyphs";
import { DataCards, type CardSpec } from "../../_components/DataCards";
import type { Column, Group } from "../../_components/DataTable";
import type { MenuGroup } from "../../_components/DropdownMenu";
import { EmptyState } from "../../_components/EmptyState";
import { PageHeader } from "../../_components/PageHeader";
import { StatsScope, scopeLabels } from "../../_components/StatsScope";
import { Toolbar, type FilterDef } from "../../_components/Toolbar";
import { useToast } from "../../_components/ToastProvider";
import { clubDayKey, daysBetweenKeys, fmtSince } from "@/lib/dates";
import { liftSuppression, retryMail, sendTestMail } from "./actions";
import type { MailHealth, MailRow, MailStatus } from "./data";

/**
 * **سجلُّ البريد** (٢٠٢٦-١٠-١٨) — كلُّ رسالةٍ خرجت من أدِيب أو تعثّرت.
 *
 * **وجهان في غرفةٍ واحدة** (عُرضا في `/ui/email-log`، فقال المالك: «أبغاهم اثنينهم»):
 * ١. **النبضُ أوّلًا**: متى خرجت آخرُ رسالةٍ وكم تنتظر، ثمّ صندوقُ «يحتاج نظرك» بالمتعثّر وحدَه وزرِّه. فمن
 *    فتح الغرفةَ من إنذار التعطّل يرى جوابَ سؤاله قبل أيّ تمرير.
 * ٢. **ثمّ السجلّ** على سنّة سجلّ ديبو: كروتٌ مضغوطةٌ تجمعها الأيّام، ببحثٍ ومرشّحين.
 * وسقط من الوجهين ما تكرّر: جدولُ الثاني وشرائطُه (مرشّحُ «الحال» يقوم مقامَها)، وإحصاءا الأوّل («تعثّرت»
 * يقوله الصندوق، و«خرجت» يقوله عدُّ كلّ يومٍ في رأس مجموعته).
 *
 * **ورسالةُ المصادقة لا تُعاد ولا تُعرَض**: رمزُها يموت في دقائقه ومن رآه دخل الحساب، فتُذكر بموضوعها
 * ومستلمها لا غير، ويطلب صاحبُها رمزًا جديدًا بنفسه.
 */

const STATUS: Record<MailStatus, { label: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
  sent: { label: "خرجت", tone: "success" },
  queued: { label: "تنتظر", tone: "warning" },
  sending: { label: "تخرج الآن", tone: "warning" },
  dead: { label: "تعثّرت", tone: "danger" },
  cancelled: { label: "أُلغيت", tone: "neutral" },
};
/**
 * **حالُ ما بعد الخروج يغلب «خرجت»** (خطّافُ Resend، ٢٠٢٦-١٠-١٩): «خرجت» تعني أنّ المزوّد قبلها، فإن قال بعدها
 * وصلت أو ارتدّت قيل ذلك مكانها.
 */
const DELIVERY: Record<NonNullable<MailRow["delivery"]>, { label: string; tone: "success" | "warning" | "danger" }> = {
  delivered: { label: "وصلت", tone: "success" },
  delayed: { label: "تتأخّر", tone: "warning" },
  bounced: { label: "ارتدّت", tone: "danger" },
  complained: { label: "عُدّت مزعجة", tone: "danger" },
};
const badgeOf = (m: MailRow) => (m.status === "sent" && m.delivery ? DELIVERY[m.delivery] : STATUS[m.status]);
const MAIL_UNIT = { one: "رسالة", two: "رسالتان", few: "رسائل" };
/** المتعثّرُ في أسبوعه يحتاج نظرًا، وما بعده صار تاريخًا يُقرأ في السجلّ لا مهمّةً في الصدر. */
const NEEDS_DAYS = 7;

/** الإعادةُ لما مات قبل الخروج، لا لرسالة مصادقة، ولا لعنوانٍ موقوف: تموت ثانيةً حتى يُرفع إيقافُه. */
const canRetry = (m: MailRow) => m.status === "dead" && !m.auth && !m.suppressed;
const pending = (m: MailRow) => m.status === "queued" || m.status === "sending";
const returned = (m: MailRow) => m.delivery === "bounced" || m.delivery === "complained";
const toneOf = (m: MailRow) => {
  const t = badgeOf(m).tone;
  return t === "danger" || t === "warning" ? t : undefined;
};
const ticoOf = (m: MailRow) => {
  const t = toneOf(m);
  return t === "danger" ? "tico-danger" : t === "warning" ? "tico-warning" : "tico-steel";
};

/** الزمنُ رأسُ مجموعة، بقسمة سجلّ ديبو نفسِها: يُقال مرّةً لعشرٍ لا عشرَ مرّات. */
function byDay(rows: MailRow[], todayKey: string): Group<MailRow>[] {
  const order = ["اليوم", "أمس", "آخر سبعة أيّام", "أقدم"];
  const buckets = new Map<string, MailRow[]>();
  for (const m of rows) {
    const d = daysBetweenKeys(clubDayKey(m.createdAt), todayKey);
    const label = d <= 0 ? "اليوم" : d === 1 ? "أمس" : d <= 7 ? "آخر سبعة أيّام" : "أقدم";
    const list = buckets.get(label);
    if (list) list.push(m);
    else buckets.set(label, [m]);
  }
  return order
    .filter((l) => buckets.has(l))
    .map((l) => ({ key: l, label: l, hint: countPhrase(buckets.get(l)!.length, MAIL_UNIT), rows: buckets.get(l)! }));
}

const SPANS = [
  { secs: 86400, unit: { one: "يوم", two: "يومان", few: "أيّام", many: "يومًا" } },
  { secs: 3600, unit: { one: "ساعة", two: "ساعتان", few: "ساعات", many: "ساعة" } },
  { secs: 60, unit: { one: "دقيقة", two: "دقيقتان", few: "دقائق", many: "دقيقة" } },
];

/**
 * **العددُ رقمُ الكرت، ووحدتُه تنزل إلى تسميته**: «منذ 3 ساعات» رقمًا التفّت في نصف عرض الجوّال سطرين،
 * فصار الرقمُ «3» والتسميةُ «ساعات منذ آخر رسالةٍ خرجت». والزمنُ يُحسب عند العرض، كـ`fmtSince`.
 */
function lastSentStat(iso: string | null): { value: string; label: string } {
  if (!iso) return { value: "لا شيء", label: "لم تخرج رسالةٌ بعد" };
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  const span = SPANS.find((s) => secs >= s.secs);
  if (!span) return { value: "الآن", label: "خرجت آخرُ رسالة" };
  const n = Math.floor(secs / span.secs);
  return { value: String(n), label: `${unitWord(n, span.unit)} منذ آخر رسالةٍ خرجت` };
}

export function EmailLogView({ rows, health, todayKey }: { rows: MailRow[]; health: MailHealth; todayKey: string }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, start] = useTransition();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});

  const retry = (m: MailRow) => {
    setBusyId(m.id);
    start(async () => {
      const r = await retryMail(m.id);
      setBusyId(null);
      if (r.ok) toast.success(r.message);
      else toast.error(r.message);
      router.refresh();
    });
  };
  const lift = (m: MailRow) => {
    setBusyId(m.id);
    start(async () => {
      const r = await liftSuppression(m.email);
      setBusyId(null);
      if (r.ok) toast.success(r.message);
      else toast.error(r.message);
      router.refresh();
    });
  };
  const test = () =>
    start(async () => {
      const r = await sendTestMail();
      if (r.ok) toast.success(r.message);
      else toast.error(r.message);
      router.refresh();
    });

  const needs = useMemo(
    () => rows.filter((m) => (m.status === "dead" || returned(m)) && daysBetweenKeys(clubDayKey(m.createdAt), todayKey) <= NEEDS_DAYS),
    [rows, todayKey],
  );

  /** الجهاتُ الحاضرةُ في السجلّ نفسِه لا قائمةٌ مكتوبةٌ بجانبه: جهةٌ جديدةٌ تظهر يومَ تُرسل. */
  const units = useMemo(() => [...new Set(rows.map((m) => m.unit).filter((u): u is string => !!u))], [rows]);
  const filterDefs: FilterDef[] = [
    {
      key: "status",
      label: "الحال",
      options: [
        { value: "sent", label: "خرجت" },
        { value: "returned", label: "ارتدّت" },
        { value: "pending", label: "تنتظر" },
        { value: "dead", label: "تعثّرت" },
        { value: "cancelled", label: "أُلغيت" },
      ],
    },
    ...(units.length > 1 ? [{ key: "unit", label: "الجهة", options: units.map((u) => ({ value: u, label: u })) }] : []),
  ];

  const filtered = useMemo(
    () =>
      rows.filter((m) => {
        const st = filters.status;
        if (st === "pending" ? !pending(m) : st === "returned" ? !returned(m) : st && m.status !== st) return false;
        if (filters.unit && m.unit !== filters.unit) return false;
        return matchesSearch(search, `${m.subject} ${m.to} ${m.email}`);
      }),
    [rows, filters, search],
  );

  /* أعمدةٌ ذرّيّة: الكرتُ يُرسَم من تعريف الأعمدة نفسِه (`CardSpec` خريطةُ مفاتيح). */
  const fact = (m: MailRow, icon: React.ReactNode, text: React.ReactNode) => (
    <span className="inline-flex items-center gap-2">
      <span className={`tico ${ticoOf(m)}`}>{icon}</span>
      {text}
    </span>
  );
  const columns: Column<MailRow>[] = [
    { key: "subject", header: "الرسالة", render: (m) => m.subject },
    {
      key: "to",
      header: "إلى",
      render: (m) => (
        <span className="inline-flex items-center gap-2">
          <span className={`tico tico-solid ${ticoOf(m)}`}><EnvelopeSimple aria-hidden /></span>
          {m.to}
        </span>
      ),
    },
    { key: "state", header: "", render: (m) => <Badge tone={badgeOf(m).tone} size="sm" dot>{badgeOf(m).label}</Badge> },
    { key: "why", header: "", render: (m) => (m.why ? fact(m, <Warning aria-hidden />, m.why) : null) },
    { key: "unit", header: "", render: (m) => (m.unit ? fact(m, <Buildings aria-hidden />, m.unit) : null) },
    { key: "when", header: "", render: (m) => fact(m, <Clock aria-hidden />, fmtSince(m.sentAt ?? m.createdAt)) },
  ];
  const spec: CardSpec = { title: "subject", subtitle: "to", badge: "state", facts: ["why", "unit", "when"], bareFacts: true };

  const actions = (m: MailRow): MenuGroup[] => [
    {
      items: [
        ...(canRetry(m) ? [{ label: "أعد إرسالها", icon: <ArrowsClockwise />, onSelect: () => retry(m), disabled: busy }] : []),
        ...(m.suppressed ? [{ label: "ارفع إيقاف العنوان", icon: <ArrowCounterClockwise />, onSelect: () => lift(m), disabled: busy }] : []),
      ],
    },
  ];

  const last = lastSentStat(health.lastSentAt);

  return (
    <>
      <PageHeader
        title="سجلّ البريد"
        status={health.down
          ? { label: "البريدُ متعطّل", tone: "danger", live: true }
          : { label: "البريدُ يعمل", tone: "success", live: true }}
        action={{ label: "أرسل رسالة تجربة", icon: <PaperPlaneTilt size={18} />, onClick: test, loading: busy && busyId === null }}
      />

      {/* النبض: متى خرجت آخرُ رسالةٍ وكم تنتظر. وهما ما يقول «البريدُ حيّ» قبل كلّ عدد. */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <Stat icon={<Heartbeat />} value={last.value} label={last.label} tone={health.down ? "danger" : "success"} />
        <Stat icon={<Hourglass />} value={health.queued} label="في الطابور" tone={health.queued ? "warning" : "brand"} />
      </div>

      {needs.length ? (
        <SectionCard title="يحتاج نظرك" icon={<Warning />} style={{ marginBottom: 16 }}>
          <div className="grid gap-3">
            {needs.map((m) => (
              <div key={m.id} className="grid gap-1">
                <b className="font-display text-content">{m.subject}، إلى {m.to}</b>
                <span className="text-sm text-content-muted">{m.why ?? "تعثّرت"}، <span className="whitespace-nowrap">{fmtSince(m.createdAt)}</span></span>
                {/* العنوانُ الموقوف يُرفع إيقافُه بعد تصحيحه، ثمّ تُعاد رسالتُه إن لزم. والمرتدّةُ ارتدادًا عابرًا
                    لا فعلَ لها: Resend يعيد المحاولة وحدَه. */}
                {m.suppressed ? (
                  <>
                    <span className="text-sm text-content-muted">صحّح العنوانَ في ملفّ صاحبه، ثمّ ارفع إيقافَه.</span>
                    <div>
                      <Button size="sm" variant="ghost" loading={busy && busyId === m.id} disabled={busy} onClick={() => lift(m)}>
                        <ArrowCounterClockwise />ارفع الإيقاف
                      </Button>
                    </div>
                  </>
                ) : canRetry(m) ? (
                  <div>
                    <Button size="sm" variant="ghost" loading={busy && busyId === m.id} disabled={busy} onClick={() => retry(m)}>
                      <ArrowsClockwise />أعد إرسالها
                    </Button>
                  </div>
                ) : m.auth && m.status === "dead" ? (
                  <span className="text-sm text-content-muted">رسالةُ مصادقةٍ لا تُعاد: يطلب صاحبُها رمزًا جديدًا.</span>
                ) : null}
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      <StatsScope labels={scopeLabels(filterDefs, filters)} onClear={() => setFilters({})} />

      <Toolbar
        searchPlaceholder="ابحث بالموضوع أو المستلم أو بريده"
        search={search}
        onSearch={setSearch}
        filters={filterDefs}
        filterValues={filters}
        onFilter={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<EnvelopeSimple />}
          title={rows.length === 0 ? "لم تخرج رسالةٌ في ثلاثين يومًا" : "لا رسالةَ تطابق بحثك"}
          description={rows.length === 0
            ? "كلُّ رسالةٍ يرسلها أدِيب تُكتب هنا من نفسها: رموزُ الدخول، والإشعارات، والردود."
            : "جرّب كلمةً أخرى أو ارفع المرشِّح."}
        />
      ) : (
        <DataCards
          columns={columns}
          groups={byDay(filtered, todayKey)}
          getRowId={(m) => String(m.id)}
          spec={spec}
          variant="compact"
          openLabel="افتح الرسالة"
          onRowClick={(m) => router.push(`/dashboard/system/email/${m.id}`)}
          rowActions={actions}
          rowTone={toneOf}
        />
      )}
    </>
  );
}
