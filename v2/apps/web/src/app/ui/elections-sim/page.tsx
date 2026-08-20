"use client";

// **محاكي الانتخابات** — غرفةُ تحكّمٍ واحدة: تختار سيناريو، وتلبس هويّة، وتفتح أيَّ شاشة،
// وتضغط الأزرارَ الحقيقيّة. العالمُ في الذاكرة ولا يمسّ القاعدةَ ولا الإنتاج، وقواعدُه
// منقولةٌ عن دوالّ القاعدة دالّةً دالّة (`sim/rules.ts` — كلُّ حكمٍ باسم نظيرته).
//
// وليست هذه معاينةً تُحذَف بعد الإقرار: **أداةُ اختبارٍ تبقى**، تُجرَّب بها الحالاتُ التي لا
// تُبلَغ حيًّا (الفوزُ بمقعدين · سقوطُ التزكية · الوصيف · تسعُ هويّاتٍ بلا تسعِ عمليّات دخول).

import { useMemo, useState, type MouseEvent } from "react";
import { Alert, Badge, Button, Card, CardBody, CardHeader, Container, Select } from "@adeeb/design-system";
import { ClockClockwise, Scales } from "@phosphor-icons/react";
import { ArrowClockwise } from "@/app/_components/glyphs";
import { ElectionApiProvider } from "@/app/dashboard/elections/actions-context";
import { ToastProvider } from "@/app/dashboard/_components/ToastProvider";
import { ROLES, VIEWPOINTS, committeeOf, departmentOf, type SimMember } from "./sim/org";
import { SCENARIOS, scenarioOf, type ScreenKey } from "./sim/scenarios";
import { SimProvider, routeOf, useSim } from "./sim/store";
import { SCREENS, Screen, screenOf } from "./sim/screens";
import { COVERAGE, COVER_GROUPS } from "./sim/coverage";
import { labelsOf } from "./sim/project";
import { hasCap, memberIn, type SimWorld } from "./sim/world";
import { arDuration } from "@/lib/duration";

const HOUR = 3_600_000;
const DAY = 86_400_000;

/* ══ قطعٌ صغيرةٌ للغرفة ═════════════════════════════════════════════ */

function Chip({ on, onClick, children, tone }: { on?: boolean; onClick: () => void; children: React.ReactNode; tone?: "muted" | "danger" }) {
  const base = "rounded-full border px-3.5 py-1.5 text-xs font-medium transition";
  const style = on
    ? "border-primary bg-primary text-white"
    : tone === "danger"
      ? "border-line bg-surface text-content-muted opacity-55"
      : tone === "muted"
        ? "border-dashed border-line bg-surface text-content-muted"
        : "border-line bg-surface text-content-muted hover:border-primary";
  return <button type="button" onClick={onClick} className={`${base} ${style}`}>{children}</button>;
}

/** وصفُ صاحب الهويّة في سطر: رتبتُه ووحدتُه ووزنُه وما يملكه من مفاتيح. */
function actorLine(w: SimWorld, m: SimMember | null): string {
  if (!m) return "";
  const role = ROLES[m.roleName];
  const unit = committeeOf(m.committeeId)?.ar ?? departmentOf(m.departmentId)?.ar ?? null;
  const keys = [
    hasCap(w, m.id, "manage_elections") ? "إدارة" : null,
    hasCap(w, m.id, "view_election_candidates") ? "اطّلاع" : null,
    hasCap(w, m.id, "run_for_election") ? "ترشُّح" : null,
    role?.votesAll ? "يصوّت في كلّ مقعد" : null,
  ].filter(Boolean).join("، ");
  return `${role?.ar ?? m.roleName}${unit ? ` ${unit}` : ""}، وزنُه ${role?.weight ?? 1}${keys ? `، ${keys}` : "، بلا مفاتيح"}`;
}

/* ══ الشريط العلويّ ═════════════════════════════════════════════════ */

function ControlBar() {
  const { world, actorId, scenarioKey, traveled, setActor, loadScenario, advance, reset } = useSim();
  const me = memberIn(world, actorId);

  return (
    <Card className="mb-4">
      <CardBody className="flex flex-col gap-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Select
            label="السيناريو"
            icon={<Scales />}
            options={SCENARIOS.map((s) => ({ value: s.key, label: s.label }))}
            value={scenarioKey}
            onValueChange={loadScenario}
          />
          <Select
            label="أنت الآن"
            icon={<Scales />}
            options={VIEWPOINTS.map((v) => ({ value: v.id, label: v.label }))}
            value={actorId}
            onValueChange={setActor}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-content-muted">{actorLine(world, me)}</span>
        </div>

        {/* مرورُ الزمن إزاحةٌ للماضي لا تقديمٌ لساعةٍ (انظر `shiftWorld`): تقترب المواعيد
            وتشيخ الوقائع، وساعةُ الجهاز تبقى هي ساعةَ العالم فلا يفترق حكمان. */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-content-muted">
            {traveled ? <>مضى في هذا العالم: <b>{arDuration(traveled)}</b></> : "لم يمضِ زمنٌ بعد"}
          </span>
          <Button variant="ghost" size="sm" onClick={() => advance(HOUR)}><ClockClockwise size={16} />مرّت ساعة</Button>
          <Button variant="ghost" size="sm" onClick={() => advance(DAY)}><ClockClockwise size={16} />مرّ يوم</Button>
          <Button variant="ghost" size="sm" onClick={() => advance(3 * DAY)}><ClockClockwise size={16} />مرّت ٣ أيّام</Button>
          <Button variant="ghost" size="sm" onClick={reset}><ArrowClockwise size={16} />أعِد السيناريو</Button>
        </div>
      </CardBody>
    </Card>
  );
}

/* ══ شريطُ الشاشات ══════════════════════════════════════════════════ */

function ScreenBar() {
  const { world, actorId, route, go } = useSim();

  /** مقاعدُ يصلح فتحُها في شاشةٍ تحتاج معرّفًا — تختلف بالشاشة، فلا يُعرَض ما لا يُفتح. */
  const seatsFor = (key: ScreenKey) => {
    if (key === "detail") return world.elections.map((e) => ({ id: e.id, label: labelsOf(e).positionLabel }));
    if (key === "ballot") {
      return world.elections
        .filter((e) => e.status === "voting_open")
        .map((e) => ({ id: e.id, label: labelsOf(e).positionLabel }));
    }
    if (key === "apply") {
      return world.elections
        .filter((e) => e.status === "candidacy_open")
        .map((e) => ({ id: e.id, label: labelsOf(e).positionLabel }));
    }
    // ترشُّحك أنت (صفحتُه وتعديلُه)
    return world.candidates
      .filter((c) => c.userId === actorId)
      .map((c) => {
        const e = world.elections.find((x) => x.id === c.electionId)!;
        return { id: e.id, label: labelsOf(e).positionLabel };
      });
  };

  const def = screenOf(route.screen);
  const seats = def.needsId ? seatsFor(route.screen) : [];

  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {SCREENS.map((s) => {
          const locked = !hasCap(world, actorId, s.cap);
          const hidden = !locked && !!s.signal && !s.signal(world, actorId);
          return (
            <Chip
              key={s.key}
              on={route.screen === s.key}
              tone={locked ? "danger" : hidden ? "muted" : undefined}
              onClick={() => {
                const list = s.needsId ? seatsFor(s.key) : [];
                go({ screen: s.key, id: s.needsId ? list[0]?.id : undefined });
              }}
            >
              {s.label}
              {locked ? "، مقفول" : hidden ? "، لا يظهر له" : ""}
            </Chip>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* المسارُ لاتينيٌّ في صفحةٍ عربيّة، فيُقلَب ما لم يُصرَّح باتّجاهه */}
        <Badge tone="neutral" variant="soft"><span className="font-latin" dir="ltr">{def.path}</span></Badge>
        {def.needsId ? (
          seats.length ? (
            <div className="flex flex-wrap gap-2">
              {seats.map((s) => (
                <Chip key={s.id} on={route.id === s.id} onClick={() => go({ screen: route.screen, id: s.id })}>{s.label}</Chip>
              ))}
            </div>
          ) : <span className="text-sm text-content-muted">لا مقعدَ يصلح لهذه الشاشة في العالم الحاليّ.</span>
        ) : null}
      </div>
    </div>
  );
}

/* ══ المسرح ═════════════════════════════════════════════════════════ */

/**
 * **مُلتقِطُ الروابط** — الشاشاتُ فيها روابطُ `Link` حقيقيّة (زرُّ الرجوع مثلًا) تخرج بك من
 * المختبر إلى اللوحة. فتُلتقَط الضغطةُ هنا وتُترجَم إلى شاشةٍ في المحاكي، ولا تُمسّ الشاشة.
 */
function Stage() {
  const { api, go } = useSim();

  const capture = (e: MouseEvent<HTMLDivElement>) => {
    const a = (e.target as HTMLElement).closest?.("a[href]");
    if (!a) return;
    const href = a.getAttribute("href") ?? "";
    if (!href.startsWith("/")) return;
    e.preventDefault();
    e.stopPropagation();
    const r = routeOf(href);
    if (r) go(r);
  };

  return (
    <div
      onClickCapture={capture}
      className="rounded border border-line p-4 md:p-7"
      style={{ background: "var(--color-bg)" }}
    >
      <ElectionApiProvider value={api}>
        <Screen />
      </ElectionApiProvider>
    </div>
  );
}

/* ══ ما جرى ═════════════════════════════════════════════════════════ */

function Trace() {
  const { events } = useSim();
  if (!events.length) return null;
  return (
    <Card className="mt-4">
      <CardHeader variant="soft" icon={<ClockClockwise />} title="ما جرى" subtitle="كلُّ فعلٍ ونتيجتُه كما تردّها القاعدة، الأحدثُ أوّلًا" />
      <CardBody>
        <ul className="flex flex-col gap-1.5">
          {events.map((e) => (
            <li key={e.id} className="flex items-start gap-2 text-sm">
              <Badge tone={e.ok ? "success" : "danger"} variant="soft" dot>{e.ok ? "تمّ" : "رُدّ"}</Badge>
              <span className="text-content-muted">{e.text}</span>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}

/* ══ مصفوفةُ التغطية ════════════════════════════════════════════════ */

function Coverage() {
  const { world, loadScenario } = useSim();
  const [open, setOpen] = useState(false);
  const live = useMemo(() => new Set(COVERAGE.filter((c) => c.probe(world)).map((c) => c.key)), [world]);

  return (
    <Card className="mt-4">
      <CardHeader
        variant="soft"
        icon={<Scales />}
        title={`مصفوفة التغطية (${live.size} من ${COVERAGE.length} حاضرةٌ في هذا العالم)`}
        subtitle="كلُّ حالةٍ في النظام ومِجَسُّها وسيناريوها — اضغط بندًا فيُحمَّل عالمُه"
        actions={<Button variant="ghost" size="sm" onClick={() => setOpen((v) => !v)}>{open ? "أخفِ" : "أظهِر"}</Button>}
      />
      {open ? (
        <CardBody>
          <div className="flex flex-col gap-4">
            {COVER_GROUPS.map((g) => (
              <div key={g} className="flex flex-col gap-2">
                <b className="text-sm">{g}</b>
                <div className="flex flex-wrap gap-2">
                  {COVERAGE.filter((c) => c.group === g).map((c) => (
                    <Chip key={c.key} on={live.has(c.key)} onClick={() => loadScenario(c.scenario)}>
                      {c.label}
                    </Chip>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      ) : null}
    </Card>
  );
}

/* ══ الغرفة ═════════════════════════════════════════════════════════ */

function Room() {
  const { scenarioKey } = useSim();
  const s = scenarioOf(scenarioKey);

  return (
    <main className="py-10">
      <Container className="max-w-6xl">
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Elections Simulator</p>
        <h1 className="mt-1 font-display text-4xl font-black text-content">محاكي الانتخابات</h1>
        <p className="mt-2 max-w-3xl text-content-muted">
          الشاشاتُ هنا هي شاشاتُ اللوحة نفسُها، والأحكامُ منقولةٌ عن دوالّ القاعدة حرفًا بحرف، والعالمُ في ذاكرة متصفّحك
          <b className="text-content"> لا يمسّ القاعدة</b>. بدّل السيناريو والهويّة والشاشة، واضغط الأزرار كما تضغطها في اللوحة.
        </p>

        <div className="mt-6">
          <ControlBar />

          <Alert tone="info" title={s.label} className="mb-4">
            <span>{s.about}</span>
            <ol className="mt-2 list-decimal pe-5 text-sm">
              {s.steps.map((t, i) => <li key={i} className="mt-1">{t}</li>)}
            </ol>
          </Alert>

          <ScreenBar />
          <Stage />
          <Trace />
          <Coverage />
        </div>
      </Container>
    </main>
  );
}

export default function ElectionsSimPage() {
  return (
    <SimProvider>
      <ToastProvider>
        <Room />
      </ToastProvider>
    </SimProvider>
  );
}
