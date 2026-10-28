"use client";

/**
 * **إدارة التقييم: «أقسامٌ وصفوف»** (اعتمده محمد ٢٠٢٦-١٠-٢٧ من الجولة الثانية) — فكرةُ «خريطة الوحدات»
 * (المقيَّمون بهيكلهم) بتنفيذٍ آخر. لكلّ قسمٍ كرتٌ واحدٌ رأسُه اسمُه، وفي صدره منسّقُه، ثمّ لجانُه عناوينَ خفيفة
 * وتحت كلٍّ قائدُها ونائبُها صفوفًا. ولا سطحَ مؤطَّرٌ داخل آخر (ق١٢): الصفوفُ متنُ الكرت تفصلها شعرة.
 * والصفُّ يقرأ كالجدول (الأعمدةُ تصطفّ في القسم كلِّه) فتُقارَن المشاركةُ بنظرة.
 *
 * وأوجهُ جولة الملاحظات (صفُّ المستبعَد، وعلامةُ النصاب، والمستثنى، ونافذةُ التفصيل) تُختار بـ`look`
 * (انظر `RoomLook` في `RoomHead.tsx`).
 */
import { useEffect, useMemo, useState } from "react";
import { Badge, Card, CardHeader } from "@adeeb/design-system";
import { CaretLeft } from "@/app/_components/glyphs";
import { CalendarX, SquaresFour } from "@phosphor-icons/react";
import { rankFor } from "@/lib/positionLabel";
import { Avatar } from "../../_components/Avatar";
import type { ElectorRow, TargetRow } from "../data";
import { RANK, VERDICT_LABEL } from "../vocab";
import { Pct, excludedWhy, frac, seatLine } from "./parts";
import { DEFAULT_LOOK, PartMeter, RoomHead, type RoomLook, type RoomProps } from "./RoomHead";
import { TargetDetail, VERDICT_TONE } from "./TargetDetail";

/** المقيَّمون مجموعين بالهيكل: قسمٌ، فمنسّقُه، فلجانُه وفي كلٍّ قائدُها ثمّ نائبُها. والمستثنى معهم إن طُلب. */
export function byStructure(targets: TargetRow[], departments: Record<number, string>, withExcluded = false) {
  const live = targets.filter((t) => withExcluded || !t.excluded);
  const ids = [...new Set(live.map((t) => t.department_id ?? 0))];
  return ids.map((d) => {
    const rows = live.filter((t) => (t.department_id ?? 0) === d);
    const head = rows.find((t) => t.role_name === "department_head") ?? null;
    const units = [...new Set(rows.filter((t) => t.role_name !== "department_head").map((t) => t.unit_name))]
      .sort((a, b) => a.localeCompare(b, "ar"))
      .map((name) => ({
        name,
        people: rows
          .filter((t) => t.unit_name === name && t.role_name !== "department_head")
          .sort((a, b) => Number(b.role_name === "committee_leader") - Number(a.role_name === "committee_leader")),
      }));
    return { id: d, name: departments[d] ?? "بلا قسم", head, units, count: rows.length };
  });
}

type RowProps = { t: TargetRow; results: boolean; onOpen: () => void; head?: boolean; look: RoomLook; closed: boolean; dueOn: string };

function Who({ t, head }: { t: TargetRow; head?: boolean }) {
  return (
    <span className="evs-who">
      <Avatar name={t.full_name} gender={t.gender} size="sm" />
      <span className="evs-who-tx">
        <b>{t.full_name}</b>
        <span>{head ? seatLine(t.role_name, t.unit_name, t.gender) : rankFor(RANK[t.role_name], t.gender)}</span>
      </span>
    </span>
  );
}

function Row({ t, results, onOpen, head, closed, dueOn }: RowProps) {
  // المستثنى (م١/4) في مكانه من لجنته: لا مشاركةَ ولا نتيجة، فالصفُّ يقول سببَه ومتى يُقيَّم، ولا يُفتح
  if (t.excluded) {
    return (
      <div className={"evs-row is-ex" + (head ? " is-head" : "")}>
        <Who t={t} head={head} />
        <span className="evs-ex-why">{excludedWhy(t.gender, dueOn)}</span>
        <span className="evs-res">
          <Badge tone="neutral" variant="soft" size="sm">{t.gender === "female" ? "مستثناة" : "مستثنى"}</Badge>
        </span>
      </div>
    );
  }
  const f = frac(t.final_num, t.final_den);
  const out = results && t.verdict === "removed";
  return (
    <button
      type="button"
      className={
        "evs-row" + (head ? " is-head" : "") + (results ? " has-res" : "") +
        (out ? " is-out" + (t.awaiting_return ? " is-wait" : "") : "")
      }
      onClick={onOpen}
    >
      <Who t={t} head={head} />
      <span className="evs-meters">
        <PartMeter n={t.members_ballots} of={t.members_eligible} quorum label="الأعضاء" closed={closed} />
        <PartMeter n={t.council_ballots} of={t.council_eligible} label="المجلس" />
      </span>
      {results ? (
        <span className="evs-res">
          {f ? <Pct f={f} className="evs-res-n" /> : null}
          {t.verdict ? (
            <Badge tone={t.awaiting_return ? "warning" : VERDICT_TONE[t.verdict]} variant="soft" dot size="sm">
              {t.awaiting_return ? "ينتظر لجنة" : VERDICT_LABEL[t.verdict]}
            </Badge>
          ) : null}
        </span>
      ) : null}
      <CaretLeft className="evs-go" aria-hidden />
    </button>
  );
}

export function RoomRows(props: RoomProps) {
  const { cycles, cycleId, onCycle, targets, departments, canManage, canViewResults } = props;
  const look: RoomLook = { ...DEFAULT_LOOK, ...props.look };
  const cycle = cycles.find((c) => c.id === cycleId) ?? cycles[0];
  const [openId, setOpenId] = useState<number | null>(null);
  const [electorate, setElectorate] = useState<ElectorRow[] | null>(null);
  const open = targets.find((t) => t.id === openId) ?? null;
  // المقيِّمون يُجلبون عند الفتح وبعد كلّ تصحيح
  const fetchElectorate = async (id: number) => setElectorate(await props.loadElectorate(id));
  const openTarget = (id: number) => {
    setOpenId(id);
    setElectorate(null);
    void fetchElectorate(id);
  };
  useEffect(() => {
    // المعرضُ وحده يسمّيه، ومرّةً بعد التركيب (النافذةُ بوّابةٌ لا تُرسم على الخادم)
    const id = props.initialOpen;
    if (id)
      void props.loadElectorate(id).then((e) => {
        setOpenId(id);
        setElectorate(e);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const results = canViewResults && cycle.status === "executed";
  const closed = cycle.status !== "open";
  const inRows = look.excluded === "row";
  const tree = useMemo(() => byStructure(targets, departments, inRows), [targets, departments, inRows]);
  const excluded = targets.filter((t) => t.excluded);
  const rowProps = { results, look, closed, dueOn: cycle.due_on };

  return (
    <>
      <RoomHead cycles={cycles} cycle={cycle} onCycle={onCycle} targets={targets} canManage={canManage} canViewResults={canViewResults} onOpen={openTarget} />

      <div className="evs">
        {tree.map((d) => (
          <Card key={d.id} className="evs-dept">
            <CardHeader variant="soft" icon={<SquaresFour />} title={d.name} />
            {d.head ? <Row t={d.head} head onOpen={() => openTarget(d.head!.id)} {...rowProps} /> : null}
            {d.units.map((u) => (
              <div key={u.name} className="evs-unit">
                <div className="evs-unit-h">{u.name}</div>
                {u.people.map((t) => (
                  <Row key={t.id} t={t} onOpen={() => openTarget(t.id)} {...rowProps} />
                ))}
              </div>
            ))}
          </Card>
        ))}

        {!inRows && excluded.length ? (
          <Card className="evs-dept evs-ex-card">
            <CardHeader variant="soft" icon={<CalendarX />} title="خارج هذه الدورة" />
            {excluded.map((t) => (
              <div key={t.id} className="evs-row is-ex">
                <Who t={t} head />
                <span className="evs-ex-why">{excludedWhy(t.gender, cycle.due_on)}</span>
                <span className="evs-res" />
              </div>
            ))}
          </Card>
        ) : null}
      </div>

      {open ? (
        <TargetDetail
          target={open}
          layout={look.detail}
          electorate={electorate}
          people={props.people}
          committees={props.committees}
          departments={departments}
          canManage={canManage}
          canViewResults={canViewResults}
          closed={closed}
          actions={props.actions}
          onClose={() => setOpenId(null)}
          onDone={() => {
            void fetchElectorate(open.id);
            props.onChanged?.();
          }}
        />
      ) : null}
    </>
  );
}
