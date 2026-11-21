"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Select } from "@adeeb/design-system";
import {
  Bell, Briefcase, CalendarBlank, ChartBar, ClockCounterClockwise, CursorClick, DoorOpen, EnvelopeSimple, Gavel, HandPointing,
  Hourglass, SlidersHorizontal, Smiley, UserCircle, UserSwitch, UsersThree,
} from "@phosphor-icons/react";
import { ArrowCounterClockwise, ArrowLeft, Star } from "@/app/_components/glyphs";
import { percentText } from "@/lib/evaluation/score";
import { AdBadge, AdButton, AdRoom, AdStages, AdSwitch, RoomPlate, type AdStage } from "@/app/_ad/primitives";
import { AdLine, AdSection } from "@/app/_ad/account";
import { seatIcon } from "@/app/_ad/rooms/EvaluationDetail";
import { verdictWord } from "../../../dashboard/evaluation/vocab";
import {
  MOODS, PERSONAS, SCENES, STAGES, TURNOUTS, act, advance, applyScene, forecast, initialState, person, play, setCrowd, viewFor,
  type Act, type Mood, type SimState,
} from "./engine";

/**
 * **تجربةُ تقييم القيادات** (٢٠٢٦-١٠-٢٧؛ على الهويّة ٢٠٢٦-١١-٢١ لأنّها تُرسَل للمجلس الإداريّ، محمد: «لا تفشلني»). على جهةٍ لوحةُ من يجرّب:
 * كيف تجرّب، وأين الزمن، ومن تكون، وما يفعله الآخرون، وما جرى — كلُّها أقسامُ الهويّة وسطورُها، ومراحلُ الزمن «كعوبُ الأيّام». وعلى الأخرى
 * عينُ الشخص المتقمَّص (`SimView` في `iframe` بعرض الجهاز): لوحتُه كما ستكون، بجرسها وقائمتها.
 * لا قاعدةَ ولا بريد: الحالُ كلُّها هنا، وتُمحى بإعادة التحميل أو «من البداية».
 */
const SIZES = [
  { key: "1280", label: "حاسوب" },
  { key: "390", label: "جوّال" },
];
/** أيّامُ الدورة المتخيَّلة (21 إلى 26 نوفمبر 2026)، وما يقع في كلّ يوم برمزه */
const STAGE_ICONS = [<Hourglass key="0" />, <DoorOpen key="1" />, <CalendarBlank key="2" />, <Bell key="3" />, <Gavel key="4" />];
const GROUPS: { key: string; icon: React.ReactNode; sub: string }[] = [
  { key: "الإدارة", icon: <Briefcase />, sub: "من يدير التقييم ومن يرى نتائجه" },
  { key: "المقيَّمون", icon: <Star />, sub: "القادة والنوّاب والمنسّقون: يُقيَّمون، ومنهم من يقيّم غيره" },
  { key: "الأعضاء", icon: <UsersThree />, sub: "العضو يقيّم قائد لجنته ونائبه ومنسّق قسمه" },
];

export function SimLab() {
  const [st, setSt] = useState<SimState>(() => initialState());
  const [who, setWho] = useState("mohammed");
  const [scene, setScene] = useState("all");
  const [size, setSize] = useState("1280");
  const [run, setRun] = useState(1);
  const frame = useRef<HTMLIFrameElement>(null);
  const people = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
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

  // في الجوّال الشاشةُ فوق الأقسام: من اختار شخصًا يُعاد إلى الشاشة ليرى بعينه، ومن طلب التبديل يُنزَل إلى «أنت الآن»
  const narrow = () => typeof window !== "undefined" && window.matchMedia("(max-width: 900px)").matches;
  const become = (id: string) => {
    setWho(id);
    setSt((s) => play(s, id));
    if (narrow()) stage.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const toPeople = () => people.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const next = () => setSt((s) => play(advance(s), live.current.who));
  const restart = () => {
    setSt(applyScene(initialState(), scene));
    setRun((r) => r + 1);
  };

  const evaluated = Object.keys(st.crowd);
  const closed = st.stage === 4;
  const nextLabel = closed ? "انتهى التقييم" : `إلى ${STAGES[st.stage + 1].label}`;
  const stages: AdStage[] = STAGES.map((s, i) => ({
    key: s.label, icon: STAGE_ICONS[i], label: s.hint, date: s.date,
    state: i < st.stage ? "past" : i === st.stage ? "now" : "next",
  }));
  const me = person(st, who);

  return (
    <div className="evsim">
      <AdRoom label="لوحة التجربة">
        <div className="evsim-panel">
          <RoomPlate title="جرّب تقييم القيادات" crumb={[{ label: "نادي أدِيب" }]} />

          {/* **دليلُ من يجرّب** (محمد ٢٠٢٦-١١-٢٠: المحاكي يُرسَل للمجلس الإداريّ ليجرّبوا النظام): ثلاثُ خطوات، لا شرحٌ للنظام */}
          <AdSection icon={<HandPointing />} title="كيف تجرّب" sub="تقييمُ شهرٍ كامل على أدِيبٍ صغير: الشاشاتُ والحسابُ ونصوصُ الإشعارات حقيقيّة، والأسماءُ والأرقامُ متخيَّلة، ولا شيء يُكتب أو يُرسَل.">
            <AdLine icon={<UserSwitch />} k="أوّلًا" v="اختر من تكون" sub="من الإدارة أو المقيَّمين أو الأعضاء أدناه: الرئيس، أو قائدٌ يُقيَّم، أو عضوٌ يقيّم قائده." />
            <AdLine icon={<CalendarBlank />} k="ثانيًا" v="حرّك الزمن" sub={`«إلى ${STAGES[1].label}» يفتح التقييم، ثمّ يومًا بعد يوم حتى يُغلق ويصدر الحكم.`} />
            <AdLine icon={<CursorClick />} k="ثالثًا" v="جرّب وشاهد" sub="قيّم، وافتح الجرس، وبدّل الشخص لترى ما رآه غيرُك. و«من البداية» يعيد كلَّ شيء." />
          </AdSection>

          <AdSection icon={<CalendarBlank />} title="الزمن" sub={STAGES[st.stage].hint}
            media={<AdStages stages={stages} label="أيّام التقييم" />}
            foot={
              <div className="evsim-acts">
                <AdButton variant="fill" size="sm" icon={closed ? undefined : <ArrowLeft />} iconEnd disabled={closed} onClick={next}>{nextLabel}</AdButton>
                <AdButton variant="line" size="sm" icon={<ArrowCounterClockwise />} onClick={restart}>من البداية</AdButton>
              </div>
            } />

          <div className="evsim-people" ref={people}>
            {GROUPS.map((g) => (
              <AdSection key={g.key} icon={g.icon} title={g.key} sub={g.sub}>
                {PERSONAS.filter((p) => p.group === g.key).map((p) => {
                  const pp = person(st, p.id);
                  const v = viewFor(st, p.id);
                  const unread = v.notes.filter((n) => n.unread).length;
                  const state = [v.pending ? `بقي ${v.pending} للتقييم` : "", unread ? `${unread === 1 ? "إشعارٌ جديد" : `${unread} إشعارات جديدة`}` : ""].filter(Boolean).join("، ");
                  return (
                    <AdLine key={p.id} icon={seatIcon(v.seatLine)} v={pp.name} k={state || undefined}
                      sub={`${v.seatLine}، ${p.why}`} onClick={() => become(p.id)} current={who === p.id}
                      act={who === p.id ? { icon: <UserCircle />, text: pp.gender === "female" ? "أنتِ" : "أنت", label: "أنت الآن" } : { icon: <UserSwitch />, text: pp.gender === "female" ? "كوني هي" : "كن هو", label: "تقمّص" }} />
                  );
                })}
              </AdSection>
            ))}
          </div>

          <AdSection icon={<Smiley />} title="ما يفعله الآخرون"
            sub="من لم تتقمّصه يقيّم وحده بهذا الضبط، وتزداد تقييماتُهم يومًا بعد يوم. ومن تقمّصته أثناء أيّام التقييم صارت تقييماتُه بيدك."
            media={
              <div className="evsim-crowd">
                <AdSwitch label="حالُ التقييم" positions={SCENES.map((s) => ({ key: s.key, label: s.label }))} position={scene}
                  onPosition={(k) => { setScene(k); if (!closed) setSt((s) => applyScene(s, k)); }} />
                <ol className="evsim-crowd-list">
                  {evaluated.map((id) => {
                    const p = person(st, id);
                    const c = st.crowd[id];
                    const t = st.targets.find((x) => x.userId === id);
                    const f = t ? forecast(st, t.id) : null;
                    return (
                      <li key={id} className="evsim-crowd-i">
                        <div className="evsim-crowd-t">
                          <b>{p.name}</b>
                          {t?.excluded ? <AdBadge>مستثنى</AdBadge> : null}
                          {f ? (
                            <span className="evsim-fc" data-out={f.verdict === "removed" || undefined}>
                              <ChartBar aria-hidden />
                              {/* الحكمُ ثمّ نسبتُه معزولةً بلا فاصلة: الفاصلةُ بجانب الرقم اللاتينيّ يقلبها اتّجاهُ النصّ */}
                              {closed ? "" : "لو أُغلق الآن: "}
                              <b>{verdictWord(f.verdict, p.gender)}</b>
                              {f.final ? <bdi dir="ltr" className="lat">{percentText({ num: f.final[0], den: f.final[1] })}%</bdi> : null}
                            </span>
                          ) : null}
                        </div>
                        <div className="evsim-crowd-f">
                          <Select label="رضاهم" icon={<Smiley />} options={MOODS.map((m) => ({ value: m.value, label: m.label }))} value={c.mood} disabled={closed}
                            onValueChange={(m) => setSt((s) => setCrowd(s, id, { mood: m as Mood }))} />
                          <Select label="الأعضاء" icon={<UsersThree />} options={TURNOUTS.map((x) => ({ ...x }))} value={String(c.members)} disabled={closed}
                            onValueChange={(m) => setSt((s) => setCrowd(s, id, { members: Number(m) }))} />
                          <Select label="المجلس" icon={<Briefcase />} options={TURNOUTS.map((x) => ({ ...x }))} value={String(c.council)} disabled={closed}
                            onValueChange={(m) => setSt((s) => setCrowd(s, id, { council: Number(m) }))} />
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            } />

          <AdSection icon={<ClockCounterClockwise />} title="ما جرى"
            sub={st.log.length === 0 ? `لم يحدث شيءٌ بعد. التقييمُ يُفتح يوم ${STAGES[1].label}.` : st.notes.some((n) => n.email) ? "البريدُ في الواقع يصل مع الجرس للاستبعاد والتصحيح وحدهما، ولا يُرسَل هنا." : undefined}>
            {st.log.length ? st.log.map((h) => (
              <AdLine key={h.id} icon={h.detail?.includes("بريد") ? <EnvelopeSimple /> : STAGE_ICONS[h.stage]} k={STAGES[h.stage].label} v={h.text} sub={h.detail ?? undefined} />
            )) : null}
          </AdSection>
        </div>
      </AdRoom>

      <div className="evsim-stage" ref={stage}>
        {/* في الجوّال: الشاشةُ أوّلًا، وفوقها ما يُحتاج في كلّ لحظة — الزمنُ والطريقُ إلى «أنت الآن» */}
        <div className="evsim-dock">
          <AdButton variant="fill" size="sm" icon={closed ? undefined : <ArrowLeft />} iconEnd disabled={closed} onClick={next}>{nextLabel}</AdButton>
          <AdButton variant="line" size="sm" icon={<SlidersHorizontal />} onClick={toPeople}>غيّر الشخص</AdButton>
        </div>
        <div className="evsim-stage-h">
          <span>ترى بعين <b>{me.name}</b></span>
          <div className="evsim-size"><AdSwitch label="مقاس الشاشة" positions={SIZES} position={size} onPosition={setSize} /></div>
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
