"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Badge, Button, CountBadge, Segmented, Select } from "@adeeb/design-system";
import { Bell, EnvelopeSimple } from "@phosphor-icons/react";
import { ArrowCounterClockwise, ArrowLeft } from "@/app/_components/glyphs";
import { percentText } from "@/lib/evaluation/score";
import { Avatar } from "../../../dashboard/_components/Avatar";
import { VERDICT_LABEL } from "../../../dashboard/evaluation/vocab";
import {
  MOODS, PERSONAS, SCENES, STAGES, TURNOUTS, act, advance, applyScene, forecast, initialState, person, play, setCrowd, viewFor,
  type Act, type Mood, type SimState,
} from "./engine";

/**
 * **محاكي تقييم القيادات** (٢٠٢٦-١٠-٢٧). على اليمين لوحةُ المخرج: من تكون، وأين الزمن، وما يفعله الآخرون، وما جرى.
 * وعلى اليسار عينُ الشخص المتقمَّص (`SimView` في `iframe` بعرض الجهاز): لوحتُه كما ستكون، بجرسها وقائمتها.
 * لا قاعدةَ ولا بريد: الحالُ كلُّها هنا، وتُمحى بإعادة التحميل أو «من البداية».
 */
const SIZES = [
  { value: "1280", label: "حاسوب" },
  { value: "390", label: "جوّال" },
];

export function SimLab() {
  const [st, setSt] = useState<SimState>(() => initialState());
  const [who, setWho] = useState("mohammed");
  const [scene, setScene] = useState("all");
  const [size, setSize] = useState("1280");
  const [run, setRun] = useState(1);
  const frame = useRef<HTMLIFrameElement>(null);
  // الحالُ الحاضرة لمعالجات الرسائل: تُحدَّث بعد الرسم، ويكتبها معالجُ الفعل نفسُه فورًا
  const live = useRef({ st, who, run });
  useEffect(() => {
    live.current = { st, who, run };
  }, [st, who, run]);

  const post = useCallback((s: SimState, w: string, r: number) => {
    frame.current?.contentWindow?.postMessage({ type: "sim:state", state: s, persona: w, run: r }, window.location.origin);
  }, []);
  useEffect(() => post(st, who, run), [st, who, run, post]);

  // أفعالُ الإطار: تُطبَّق على الحال الحاضرة، ويعود جوابُها
  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== frame.current?.contentWindow) return;
      const d = e.data as { type?: string; id?: number; act?: Act };
      if (d.type === "sim:ready") post(live.current.st, live.current.who, live.current.run);
      if (d.type === "sim:act" && d.act && d.id) {
        const { st: next, res } = act(live.current.st, d.act);
        live.current.st = next;
        setSt(next);
        frame.current?.contentWindow?.postMessage({ type: "sim:res", id: d.id, res }, window.location.origin);
      }
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, [post]);

  const become = (id: string) => {
    setWho(id);
    setSt((s) => play(s, id));
  };
  const restart = () => {
    setSt(applyScene(initialState(), scene));
    setRun((r) => r + 1);
  };

  const evaluated = Object.keys(st.crowd);
  const closed = st.stage === 4;

  return (
    <div className="evsim">
      <aside className="evsim-panel">
        <header className="evsim-head">
          <p className="evsim-k">محاكي</p>
          <h1>تقييم القيادات</h1>
          <p className="evsim-sub">دورةٌ كاملة على أدِيبٍ صغير. الشاشاتُ والحسابُ ونصوصُ الإشعارات حقيقيّة، ولا شيء يُكتب أو يُرسَل.</p>
        </header>

        <section className="evsim-sec">
          <h2>الزمن</h2>
          <ol className="evsim-clock">
            {STAGES.map((s, i) => (
              <li key={s.label} className={i < st.stage ? "past" : i === st.stage ? "now" : ""}>
                <b>{s.label}</b>
                <span>{s.hint}</span>
              </li>
            ))}
          </ol>
          <div className="evsim-row">
            <Button size="sm" disabled={closed} onClick={() => setSt((s) => play(advance(s), live.current.who))}>
              {closed ? "انتهت الدورة" : `إلى ${STAGES[st.stage + 1].label}`}
              {closed ? null : <ArrowLeft aria-hidden />}
            </Button>
            <Button size="sm" variant="ghost" onClick={restart}>
              <ArrowCounterClockwise aria-hidden />
              من البداية
            </Button>
          </div>
        </section>

        <section className="evsim-sec">
          <h2>أنت الآن</h2>
          {["الإدارة", "المقيَّمون", "الأعضاء"].map((g) => (
            <div key={g} className="evsim-group">
              <div className="evsim-group-h">{g}</div>
              {PERSONAS.filter((p) => p.group === g).map((p) => {
                const me = person(st, p.id);
                const v = viewFor(st, p.id);
                const unread = v.notes.filter((n) => n.unread).length;
                return (
                  <button key={p.id} type="button" className={"evsim-who" + (who === p.id ? " on" : "")} onClick={() => become(p.id)}>
                    <Avatar name={me.name} gender={me.gender} size="sm" />
                    <span className="evsim-who-tx">
                      <b>{me.name}</b>
                      <span>{v.seatLine}، {p.why}</span>
                    </span>
                    <span className="evsim-who-n">
                      {v.pending ? <Badge tone="info" variant="soft" size="sm">بقي {v.pending}</Badge> : null}
                      {unread ? <span className="evsim-bell"><Bell aria-hidden /><CountBadge>{unread}</CountBadge></span> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </section>

        <section className="evsim-sec">
          <h2>ما يفعله الآخرون</h2>
          <p className="evsim-note">من لم تتقمّصه يصوّت وحده بهذا الضبط، وتزداد أوراقُهم يومًا بعد يوم. ومن تقمّصته أثناء الأيام الثلاثة صارت أوراقُه بيدك.</p>
          <Segmented
            items={SCENES.map((s) => ({ value: s.key, label: s.label }))}
            value={scene}
            onValueChange={(k) => {
              setScene(k);
              if (!closed) setSt((s) => applyScene(s, k));
            }}
          />
          <div className="evsim-crowd">
            {evaluated.map((id) => {
              const p = person(st, id);
              const c = st.crowd[id];
              const t = st.targets.find((x) => x.userId === id);
              const f = t ? forecast(st, t.id) : null;
              return (
                <div key={id} className="evsim-crowd-row">
                  <div className="evsim-crowd-h">
                    <b>{p.name}</b>
                    {t?.excluded ? <Badge tone="neutral" variant="soft" size="sm">مستثنى</Badge> : null}
                    {f ? (
                      <span className={"evsim-fc" + (f.verdict === "removed" ? " out" : "")}>
                        {closed ? "" : "لو أُغلق الآن: "}
                        {f.final ? <span className="font-latin" dir="ltr">{percentText({ num: f.final[0], den: f.final[1] })}%</span> : null}
                        {" "}{VERDICT_LABEL[f.verdict]}
                      </span>
                    ) : null}
                  </div>
                  <div className="evsim-crowd-c">
                    <Select options={MOODS.map((m) => ({ value: m.value, label: m.label }))} value={c.mood} disabled={closed} onValueChange={(m) => setSt((s) => setCrowd(s, id, { mood: m as Mood }))} />
                    <Select options={TURNOUTS.map((x) => ({ ...x, label: `الأعضاء: ${x.label}` }))} value={String(c.members)} disabled={closed} onValueChange={(m) => setSt((s) => setCrowd(s, id, { members: Number(m) }))} />
                    <Select options={TURNOUTS.map((x) => ({ ...x, label: `المجلس: ${x.label}` }))} value={String(c.council)} disabled={closed} onValueChange={(m) => setSt((s) => setCrowd(s, id, { council: Number(m) }))} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="evsim-sec">
          <h2>ما جرى</h2>
          {st.log.length === 0 ? <p className="evsim-note">لم يحدث شيءٌ بعد. التقييمُ يُفتح يوم 21 يناير.</p> : null}
          <ol className="evsim-log">
            {st.log.map((h) => (
              <li key={h.id}>
                <span className="evsim-log-d">{STAGES[h.stage].label}</span>
                <b>{h.text}</b>
                {h.detail ? <span>{h.detail}</span> : null}
              </li>
            ))}
          </ol>
          {st.notes.some((n) => n.email) ? (
            <p className="evsim-note">
              <EnvelopeSimple aria-hidden /> البريدُ في الواقع يصل مع الجرس للاستبعاد والتصحيح وحدهما، ولا يُرسَل هنا.
            </p>
          ) : null}
        </section>
      </aside>

      <div className="evsim-stage">
        <div className="evsim-stage-h">
          <span>
            ترى بعين <b>{person(st, who).name}</b>
          </span>
          <Segmented items={SIZES} value={size} onValueChange={setSize} />
        </div>
        <iframe
          ref={frame}
          className="evsim-frame"
          style={{ ["--evsim-w" as string]: `${size}px` }}
          src="/ui/evaluation/sim/view"
          title="عين الشخص المتقمَّص"
          onLoad={() => post(live.current.st, live.current.who, live.current.run)}
        />
      </div>
    </div>
  );
}
