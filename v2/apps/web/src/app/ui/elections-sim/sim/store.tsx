"use client";

// **متجرُ المحاكي** — يحمل العالمَ والهويّةَ والشاشة، ويقدّم للشاشات منفذَ الأفعال
// (`ElectionApi`) موصولًا بالمحرّك بدل القاعدة. لا تعرف الشاشةُ أنّها في مختبر.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ElectionApi } from "@/app/dashboard/elections/actions-context";
import type { ElectionResult } from "@/app/dashboard/elections/actions";
import * as R from "./rules";
import { SCENARIOS, scenarioOf, type ScreenKey } from "./scenarios";
import { toAppointOptions } from "./project";
import { sweep } from "./rules";
import { shiftWorld, type SimWorld } from "./world";

/**
 * لحظةُ بدءٍ ثابتة للرسم الأوّل — لا `Date.now()` فيه (وإلّا اختلف الخادمُ عن المتصفّح
 * فانكسرت الإماهة). ثمّ يُعاد بناءُ العالم بساعة الجهاز بعد التركيب، فتتّحد الساعتان.
 */
export const SIM_EPOCH = Date.UTC(2026, 7, 20, 9, 0, 0);

export type SimRoute = { screen: ScreenKey; id?: string };

/** سطرٌ في «ما جرى» — كلُّ فعلٍ تفعله في الغرفة يُكتب بنتيجته، فيُقرأ الأثرُ بلا تخمين. */
export type SimEvent = { id: number; at: number; text: string; ok: boolean };

type Ctx = {
  world: SimWorld;
  actorId: string;
  route: SimRoute;
  scenarioKey: string;
  events: SimEvent[];
  /** ما مضى من الزمن في هذا العالم (بالميلّي) — يُعرَض في الشريط. */
  traveled: number;
  api: ElectionApi;
  setActor: (id: string) => void;
  go: (route: SimRoute) => void;
  loadScenario: (key: string) => void;
  advance: (ms: number) => void;
  reset: () => void;
};

const SimCtx = createContext<Ctx | null>(null);
export const useSim = () => {
  const c = useContext(SimCtx);
  if (!c) throw new Error("useSim خارج المحاكي");
  return c;
};

/** المسارُ الحقيقيّ ← شاشةٌ في المحاكي. مصدرٌ واحد يقرؤه `nav` ومُلتقِطُ الروابط. */
export function routeOf(href: string): SimRoute | null {
  const p = href.split("?")[0].replace(/\/+$/, "");
  if (!p.startsWith("/dashboard/elections")) return null;
  const rest = p.slice("/dashboard/elections".length).split("/").filter(Boolean);
  if (!rest.length) return { screen: "list" };
  const [head, a, b] = rest;
  if (head === "run") return a ? { screen: "apply", id: a } : { screen: "run" };
  if (head === "vote") return a ? { screen: "ballot", id: a } : { screen: "vote" };
  if (head === "my") return a ? (b === "edit" ? { screen: "edit", id: a } : { screen: "candidacy", id: a }) : { screen: "my" };
  return { screen: "detail", id: head };
}

/** نسخةٌ عميقةٌ قبل كلّ فعل — العالمُ بياناتٌ خالصة، فتكفيه `structuredClone`. */
const clone = (w: SimWorld): SimWorld => structuredClone(w);

export function SimProvider({ children, initialScenario }: { children: ReactNode; initialScenario?: string }) {
  const first = scenarioOf(initialScenario ?? SCENARIOS[0].key);
  const [scenarioKey, setScenarioKey] = useState(first.key);
  const [world, setWorld] = useState<SimWorld>(() => first.build(SIM_EPOCH));
  const [actorId, setActorId] = useState(first.start.viewpoint);
  const [route, setRoute] = useState<SimRoute>({ screen: first.start.screen, id: first.start.electionId });
  const [events, setEvents] = useState<SimEvent[]>([]);
  const [traveled, setTraveled] = useState(0);

  const note = useCallback((text: string, ok = true) => {
    setEvents((prev) => [{ id: prev.length + 1, at: Date.now(), text, ok }, ...prev].slice(0, 60));
  }, []);

  /** يُشغّل فعلًا في نسخةٍ من العالم، ويُثبّتها إن نجح — ويكتب أثرَه في «ما جرى». */
  const act = useCallback((label: string, fn: (w: SimWorld) => ElectionResult): ElectionResult => {
    const draft = clone(world);
    draft.now = Date.now(); // الساعةُ واحدةٌ للعالم وللشاشة (انظر `shiftWorld`)
    const res = fn(draft);
    if (res.ok) setWorld(draft);
    note(`${label} : ${res.message}`, res.ok);
    return res;
  }, [world, note]);

  const go = useCallback((r: SimRoute) => setRoute(r), []);

  const loadScenario = useCallback((key: string) => {
    const s = scenarioOf(key);
    setScenarioKey(s.key);
    setWorld(s.build(Date.now()));
    setActorId(s.start.viewpoint);
    setRoute({ screen: s.start.screen, id: s.start.electionId });
    setTraveled(0);
    setEvents([{ id: 1, at: Date.now(), text: `حُمّل السيناريو: ${s.label}`, ok: true }]);
  }, []);

  /**
   * إعادةُ بناء العالم بساعة الجهاز بعد التركيب — الرسمُ الأوّل بـ`SIM_EPOCH` كي يتّفق الخادمُ
   * والمتصفّح، وهذا يُصلحه بعده. و`setTimeout` لا جسمُ الأثر (سابقةُ `useClientNow`).
   */
  useEffect(() => {
    const t = setTimeout(() => setWorld(scenarioOf(scenarioKey).build(Date.now())), 0);
    return () => clearTimeout(t);
    // مرّةً واحدةً عند التركيب — وتبديلُ السيناريو له `loadScenario`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = useCallback(() => loadScenario(scenarioKey), [loadScenario, scenarioKey]);

  /**
   * **مرورُ الزمن** — يُزاح العالمُ إلى الوراء (فتقترب المواعيد) ثمّ تمرّ الكنّاسة،
   * كما تمرّ في الإنتاج كلَّ دقيقة بـ`pg_cron`.
   */
  const advance = useCallback((ms: number) => {
    const draft = clone(world);
    shiftWorld(draft, ms);
    draft.now = Date.now();
    const r = sweep(draft);
    setWorld(draft);
    setTraveled((t) => t + ms);
    const done = r.closedCandidacy + r.stalled + r.closedVoting;
    note(done
      ? `مرّ الزمن، ومرّت الكنّاسة : أُغلق ترشّحُ ${r.closedCandidacy}، ووقف ${r.stalled}، وأُغلق تصويتُ ${r.closedVoting}`
      : "مرّ الزمن، ولم تجد الكنّاسةُ ما تفعله");
  }, [world, note]);

  const api = useMemo<ElectionApi>(() => ({
    createElection: async (input) => act("فتحُ انتخاب", (w) => R.createElection(w, actorId, input)),
    reviewCandidate: async (id, status, n) => act("مراجعةُ مرشّح", (w) => R.reviewCandidate(w, actorId, id, status, n)),
    restoreCandidacy: async (id) => act("إرجاعُ منسحب", (w) => R.restoreCandidacy(w, actorId, id)),
    transitionElection: async (id, next) => act("نقلُ الحالة", (w) => R.transitionElection(w, actorId, id, next)),
    setDeadline: async (id, isoWhen) => act("ضبطُ الموعد", (w) => R.setDeadline(w, actorId, id, isoWhen)),
    openVoting: async (id, endIso) => act("فتحُ التصويت", (w) => R.openVoting(w, actorId, id, endIso)),
    loadAppointOptions: async (id) => ({ members: toAppointOptions(world, id), error: null }),
    appointToSeat: async (id, userId, reason) => act("تكليفُ شاغل", (w) => R.appointToSeat(w, actorId, id, userId, reason)),
    declareWinner: async (id, candidateId) => act("إعلانُ فائز", (w) => R.declareWinner(w, actorId, id, candidateId)),
    resolveDepartmentWinners: async (departmentId) => act("حسمُ مقاعد القسم", (w) => R.resolveDepartmentWinners(w, actorId, departmentId)),
    cancelElection: async (id, reason) => act("إلغاءُ انتخاب", (w) => R.cancelElection(w, actorId, id, reason)),

    submitCandidacy: async (id, statement, file) => act("إرسالُ ترشّح", (w) => R.submitCandidacy(w, actorId, id, statement, file ?? null)),
    resubmitCandidacy: async (candidateId, statement, file) => act("تعديلُ ترشّح", (w) => R.resubmitCandidacy(w, actorId, candidateId, statement, file ?? null)),
    castVote: async (id, candidateId, choice) => act("ختمُ بطاقة", (w) => R.castVote(w, actorId, id, candidateId, choice)),
    withdrawCandidacy: async (candidateId) => act("سحبُ ترشّح", (w) => R.withdrawCandidacy(w, actorId, candidateId)),

    // المخزنُ لا يُمسّ: يُوصَف الملفُّ ولا يُرفَع، فما يصل الدالّةَ وصفٌ صادقُ الشكل
    uploadCandidacyFile: async (userId, electionId, file) => {
      note(`رُفع الملفّ (محاكاة) : ${file.name}`);
      return { url: `${userId}/${electionId}/${file.name}`, name: file.name, size: file.size, mime: file.type || null };
    },
    setSeatPreference: async (departmentId, preferred) => {
      const draft = clone(world);
      R.setSeatPreference(draft, actorId, departmentId, preferred);
      setWorld(draft);
      note("سُجّلت أفضليّةُ المقعد");
    },
    // لا دلوَ ولا رابطٌ موقَّع — يُقال إنّ الملفّ فُتح، فيُعرَف أنّ الزرّ وصل إلى فعله
    openFile: async (path) => { note(`فُتح الملفّ الانتخابيّ (محاكاة) : ${path}`); return true; },

    nav: (href) => {
      const r = routeOf(href);
      if (r) setRoute(r);
      else note(`مسارٌ خارج الانتخابات، لا يُتَّبع في المحاكي : ${href}`, false);
    },
    refresh: () => { /* العالمُ في الذاكرة، فالرسمُ يتبع الحالة بلا إعادة جلب */ },
  }), [act, actorId, world, note]);

  const value = useMemo<Ctx>(() => ({
    world, actorId, route, scenarioKey, events, traveled, api,
    setActor: setActorId, go, loadScenario, advance, reset,
  }), [world, actorId, route, scenarioKey, events, traveled, api, go, loadScenario, advance, reset]);

  return <SimCtx.Provider value={value}>{children}</SimCtx.Provider>;
}
