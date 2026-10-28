"use client";

import { useEffect, useState } from "react";
import { LabShell } from "./LabShell";
import {
  COUNCIL_SHEETS, CYCLES, CYCLE_OPEN, ELECTORATE, MY_COMMENTS, MY_REMOVED, MY_RESULTS, RETURN_COMMITTEES,
  SHEETS, TARGETS_DONE, TARGETS_OPEN,
} from "./sample";
import { RateA } from "../../../dashboard/evaluation/_views/RateA";
import { RoomRows } from "../../../dashboard/evaluation/_views/RoomRows";
import type { RoomLook, RoomProps } from "../../../dashboard/evaluation/_views/RoomHead";
import { MineA } from "../../../dashboard/evaluation/_views/MineA";
import type { MyScope } from "@/lib/myScope";

/**
 * **نافذةُ المقترح** داخل `iframe`: المقترحُ نفسُه (`dashboard/evaluation/_views`) ببيانات المعرض، في اللوحة
 * كما تُرى على الجهاز. والأفعالُ لا تكتب شيئًا: تنجح بعد لحظة، فيُرى ما يحدث بعد الإرسال والتصحيح.
 */
export type Screen = "rate" | "room" | "mine";
export type Option = "a" | "b";

const ok = (message: string) => () => new Promise<{ ok: true; message: string }>((r) => setTimeout(() => r({ ok: true, message }), 500));

const BASE_CAPS = ["use_portal", "view_own_membership", "manage_committee_members"];
const MEMBER_SCOPE: MyScope = {
  unit: null, units: [], department: null, committee: { id: 11, name: "لجنة التصوير" },
  elections: { canRun: false, hasCandidacy: false, canVote: false },
  evaluation: { canRate: true, pending: 2, hasResults: true },
};

const DEPARTMENTS = { 1: "قسم الإنتاج", 2: "قسم الفعاليات", 3: "قسم التواصل" };
const PEOPLE = ELECTORATE.map((e) => ({ id: e.rater_id ?? "", name: e.full_name ?? "" })).concat([
  { id: "x1", name: "رهف عبد الإله السالم" },
  { id: "x2", name: "عمر ياسر الخالدي" },
]);

/** `look`: «quorum=text,excluded=card» يسمّي أوجهَ جولة الملاحظات، و`open` يفتح تفصيلَ مقيَّمٍ عند الرسم. */
export function LabFrame({ screen, state, look, open: openId }: { screen: Screen; option: Option; state: string; look?: string; open?: number }) {
  const [cycleId, setCycleId] = useState(state === "open" ? 1 : 1);
  // المعرضُ يمرّر الإطارَ إلى ما يُقارَن فيه: الصفوفُ تحت الرأس، والمستثنى في آخرها
  useEffect(() => {
    if (!look || openId) return;
    const sel = look.includes("excluded=card") ? ".evs-ex-card" : look.includes("excluded") ? ".evs-row.is-ex" : ".evs";
    // يُمرَّر الإطارُ وحده: `scrollIntoView` يمرّر الصفحةَ الأمَّ معه فيسحب المعرضَ كلَّه
    const t = window.setTimeout(() => {
      const el = document.querySelector(sel);
      if (!el) return;
      let box: HTMLElement | null = el.parentElement;
      while (box && !(box.scrollHeight > box.clientHeight && /auto|scroll/.test(getComputedStyle(box).overflowY))) box = box.parentElement;
      const top = el.getBoundingClientRect().top;
      if (box) box.scrollTop += top - box.getBoundingClientRect().top - box.clientHeight / 3;
      else window.scrollTo(0, window.scrollY + top - window.innerHeight / 3);
    }, 300);
    return () => window.clearTimeout(t);
  }, [look, openId]);

  if (screen === "rate") {
    const sheets = state === "council" ? COUNCIL_SHEETS : SHEETS;
    return (
      <LabShell caps={BASE_CAPS} scope={MEMBER_SCOPE} here="/dashboard/evaluation/rate" name="عبير ناصر القرني" gender="female">
        <RateA sheets={sheets} dueOn="2027-01-21" onSubmit={ok("وصل تقييمُك.")} />
      </LabShell>
    );
  }

  if (screen === "room") {
    const open = state === "open";
    const cycles = open ? [CYCLES[0], CYCLE_OPEN] : CYCLES;
    const props: RoomProps = {
      cycles,
      cycleId: open ? 1 : cycleId,
      onCycle: setCycleId,
      targets: open ? TARGETS_OPEN : cycleId === 2 ? [] : TARGETS_DONE,
      departments: DEPARTMENTS,
      canManage: true,
      canViewResults: true,
      loadElectorate: async () => ELECTORATE,
      people: PEOPLE,
      committees: RETURN_COMMITTEES,
      look: Object.fromEntries((look ?? "").split(",").filter(Boolean).map((kv) => kv.split("="))) as Partial<RoomLook>,
      initialOpen: openId,
      actions: {
        correctRater: ok("صُحّحت الأهليّة."),
        recompute: ok("صُحّحت النتيجة، ولم يتغيّر الحكم."),
        chooseReturn: ok("نُفّذ الاستبعاد."),
      },
    };
    return (
      <LabShell
        caps={[...BASE_CAPS, "view_leader_evaluation_results", "assign_positions", "view_members"]}
        scope={{ ...MEMBER_SCOPE, committee: null, evaluation: { canRate: true, pending: 3, hasResults: false } }}
        here="/dashboard/evaluation"
        name="سارة يوسف الراشد"
        gender="female"
      >
        <RoomRows {...props} />
      </LabShell>
    );
  }

  const results = state === "removed" ? [MY_REMOVED, MY_RESULTS[1]] : MY_RESULTS;
  return (
    <LabShell caps={BASE_CAPS} scope={MEMBER_SCOPE} here="/dashboard/evaluation/mine" name="ريم سعد العتيبي" gender="female">
      <MineA results={results} comments={Object.fromEntries(results.map((r) => [r.target_id, MY_COMMENTS]))} gender="female" />
    </LabShell>
  );
}
