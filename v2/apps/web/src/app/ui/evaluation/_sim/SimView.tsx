"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "@adeeb/design-system";
import { IdentificationCard } from "@phosphor-icons/react";
import type { InboxItem } from "@/lib/notifications/types";
import { EmptyState } from "../../../dashboard/_components/EmptyState";
import { PageHeader } from "../../../dashboard/_components/PageHeader";
import { MineA } from "../../../dashboard/evaluation/_views/MineA";
import { RateA } from "../../../dashboard/evaluation/_views/RateA";
import { RoomRows } from "../../../dashboard/evaluation/_views/RoomRows";
import type { ElectorRow } from "../../../dashboard/evaluation/data";
import { LabShell } from "../_lab/LabShell";
import { DEPARTMENTS, DUE, committeesForReturn, person, viewFor, type Act, type ActResult, type SimState } from "./engine";

/**
 * **عينُ الشخص المتقمَّص** — تُفتح في `iframe` من `/ui/evaluation/sim` بعرض الجهاز. لا حالةَ هنا إلّا الصفحةُ
 * المفتوحة: الحالُ كلُّها في الصفحة الأمّ تصلها رسالةً (`sim:state`)، وكلُّ فعلٍ (إرسالُ ورقة، تصحيح، قراءة
 * إشعار) يُرسَل إليها (`sim:act`) ويعود جوابُه. فما يفعله الشخصُ هنا يراه غيرُه حين يُتقمَّص.
 */
type Page = "home" | "rate" | "mine" | "room";
const PATH: Record<Page, string> = {
  home: "/dashboard",
  rate: "/dashboard/evaluation/rate",
  mine: "/dashboard/evaluation/mine",
  room: "/dashboard/evaluation",
};

export function SimView() {
  const [msg, setMsg] = useState<{ state: SimState; persona: string; run: number } | null>(null);
  const [page, setPage] = useState<Page>("home");
  const [cycleId, setCycleId] = useState(1);
  const waiting = useRef(new Map<number, (r: ActResult) => void>());
  const seq = useRef(1);
  const lastPersona = useRef<string | null>(null);

  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const d = e.data as { type?: string };
      if (d?.type === "sim:state") {
        const m = e.data as { state: SimState; persona: string; run: number };
        setMsg(m);
        // شخصٌ آخر: تُفتح صفحتُه الأولى كما يفتحها هو
        if (lastPersona.current !== m.persona) {
          lastPersona.current = m.persona;
          const v = viewFor(m.state, m.persona);
          setPage(v.canManage || v.canViewResults ? "room" : v.canRate ? "rate" : v.hasResults ? "mine" : "home");
          setCycleId(1);
        }
      }
      if (d?.type === "sim:res") {
        const r = e.data as { id: number; res: ActResult };
        waiting.current.get(r.id)?.(r.res);
        waiting.current.delete(r.id);
      }
    };
    window.addEventListener("message", on);
    window.parent.postMessage({ type: "sim:ready" }, window.location.origin);
    return () => window.removeEventListener("message", on);
  }, []);

  const send = useCallback((a: Act) => {
    const id = seq.current++;
    return new Promise<ActResult>((resolve) => {
      waiting.current.set(id, resolve);
      window.parent.postMessage({ type: "sim:act", id, act: a }, window.location.origin);
    });
  }, []);

  if (!msg) return null;
  const { state, persona, run } = msg;
  const me = person(state, persona);
  const v = viewFor(state, persona);
  const go = (href: string) => {
    const p = (Object.keys(PATH) as Page[]).find((k) => PATH[k] === href.split("?")[0]);
    if (p) setPage(p);
  };
  const items: InboxItem[] = v.notes.map((n) => ({ id: n.id, icon: "evaluation", level: n.level, title: n.title, body: n.body, href: n.href, at: n.at, unread: n.unread }));

  let body: React.ReactNode;
  if (page === "rate") {
    body = v.sheets.length ? (
      <RateA
        sheets={v.sheets}
        dueOn={DUE}
        draftOwner={`sim${run}:${persona}`}
        onSubmit={(i) => send({ kind: "submit", as: persona, ...i })}
      />
    ) : (
      <>
        <PageHeader title="قيّم القيادات" />
        <Alert tone="neutral">لا تقييمَ مفتوحٌ لك الآن.</Alert>
      </>
    );
  } else if (page === "mine") {
    body = v.results.length ? (
      <MineA results={v.results} comments={v.comments} gender={me.gender} />
    ) : (
      <>
        <PageHeader title="نتيجتي" />
        <Alert tone="neutral">لا نتيجةَ لك بعد.</Alert>
      </>
    );
  } else if (page === "room") {
    body = (
      <RoomRows
        cycles={v.cycles}
        cycleId={cycleId}
        onCycle={setCycleId}
        targets={cycleId === 1 ? v.targets : []}
        departments={DEPARTMENTS}
        canManage={v.canManage}
        canViewResults={v.canViewResults}
        loadElectorate={async (id) => ((await send({ kind: "electorate", targetId: id })).electorate ?? []) as ElectorRow[]}
        people={state.people.map((p) => ({ id: p.id, name: p.name }))}
        committees={committeesForReturn()}
        actions={{
          correctRater: (i) => send({ kind: "correct", as: persona, ...i }),
          recompute: (targetId, reason) => send({ kind: "recompute", as: persona, targetId, reason }),
          chooseReturn: (targetId, committeeId) => send({ kind: "chooseReturn", as: persona, targetId, committeeId }),
        }}
      />
    );
  } else {
    body = (
      <>
        <PageHeader title="عضويتي" />
        <EmptyState
          icon={<IdentificationCard />}
          title={v.seatLine}
          description="هنا صفحةُ عضويتك كما هي، والمحاكي لا يرسمها. وأبوابُ التقييم تظهر في القائمة حين تخصّك."
        />
      </>
    );
  }

  return (
    <LabShell
      caps={v.caps}
      scope={{
        unit: null, units: [], department: null, committee: null,
        elections: { canRun: false, hasCandidacy: false, canVote: false },
        evaluation: { canRate: v.canRate, pending: v.pending, hasResults: v.hasResults },
      }}
      here={PATH[page]}
      name={me.name}
      gender={me.gender}
      onGo={go}
      bell={{
        items,
        onOpen: (n) => {
          void send({ kind: "read", as: persona, note: n.id });
          if (n.href) go(n.href);
        },
        onReadAll: () => void send({ kind: "read", as: persona }),
      }}
    >
      {body}
    </LabShell>
  );
}
