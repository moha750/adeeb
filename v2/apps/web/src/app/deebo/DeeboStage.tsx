"use client";

/**
 * **غرفةُ ديبو — بُنيت من جديد** (١١-٢٤؛ محمد: «ضعيفة ولا تُظهر مميّزاته ولا حقيقته، ولو وضعتُه بجانب منافسيه لكان أسوأَهم»).
 *
 * ما يملكه ديبو ولا يملكه ChatGPT وClaude شيئان، فالصفحةُ مبنيّةٌ عليهما:
 * 1. **أنّه شخصيّة:** لا صورةٌ بحجم الإبهام بجانب الجواب، بل حاضرٌ في **لوح الهويّة** بطوله، يعيش المحادثةَ معك — يسمعك وأنت تكتب،
 *    ويفكّر وأنت تنتظر، ويشرح وهو يجيب، ويعتذر حين لا يعرف — كما يعيشها في أبواب الحساب (`DoorShell`). وتحته ما يفعله الآن بكلمة.
 * 2. **أنّه يعرف أدِيب ويعرفك:** الجوابُ نصٌّ منسّقٌ ثمّ **بطاقاتُ الشيء نفسِه** من الموقع (فعاليّةٌ بـ«احجز»، خبر، قائد، كتاب، صفحة)
 *    — `DeeboCards`، على اتّفاق `claude/deebo-answer-contract.md`. والغرفةُ الفارغةُ تقول ما يعرفه قبل أن يُسأل.
 *
 * وما هو عُرفٌ عند المنافسين أخذناه: المحادثاتُ في عمودٍ جانبيّ على الحاسوب (في اللوح تحت ديبو، كشريط البوّابة)، وجوابُ المساعد
 * نصٌّ يُقرأ بعرض العمود لا فقاعة، وسؤالُك فقاعة، و«انسخ» تحت كلّ جواب، والمُنشئُ كبسولةٌ في القاع.
 * وعلى الجوّال يصير اللوحُ رأسًا قصيرًا (ديبو بوجهه الحيّ واسمُه وحالُه)، و«محادثاتي» نافذةٌ تصعد من القاع.
 *
 * وهو عرضٌ محضٌ لا يعرف الشبكة: الحيُّ يمدّه بـ`useDeebo`، والمعاينةُ بحوارٍ مكتوب.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChatCircleText, ChatsCircle, Copy, House, PaperPlaneRight, SignIn, Sparkle, Stop } from "@phosphor-icons/react";
import { CaretDown, Check, Plus, Trash } from "@/app/_components/glyphs";
import { clubDayKey, daysBetweenKeys } from "@/lib/dates";
import { AdButton, AdNote } from "@/app/_ad/primitives";
import type { Greeting } from "@/lib/deebo/greeting";
import { MOOD_ALT, moodFor, moodSrc, type Mood } from "@/lib/deebo/mood";
import type { ConversationRow } from "./actions";
import type { ShownTurn } from "./cards";
import { DeeboCards } from "./DeeboCards";
import { DeeboLog } from "./DeeboLog";
import { DeeboText } from "./DeeboText";

export type DeeboStageProps = {
  turns: ShownTurn[];
  greeting: Greeting;
  busy: boolean;
  error: string | null;
  blocked?: boolean;
  draft: string;
  onDraft: (v: string) => void;
  onSend: (text: string) => void;
  onStop: () => void;
  onReset: () => void;
  shield?: ReactNode;
  conversations?: ConversationRow[] | null;
  openId?: string | null;
  onOpenConversation?: (id: string) => void;
  onDeleteConversation?: (id: string) => void;
  onOpenDrawer?: () => void;
  questions?: readonly string[];
  unknownAnswer?: string;
  /** صاحبُ الجلسة (اسمُه وصورتُه وجنسُه) — محفوظٌ لِما يأتي، والسؤالُ اليومَ فقاعةٌ بلا وجه كعُرف المحادثات */
  me?: { name: string | null; avatar: string | null; gender: string | null } | null;
  /** ⚠️ وسمُ المعاينة أعلى المحادثة (جهازُ التطوير وحده) */
  label?: string | null;
  /**
   * ⚠️ للمقارنة (١١-٢٤، محمد: «كأنّها صفحةٌ داخل صفحة»): `app` غرفةٌ بملء الشاشة على هيئة أبواب الحساب — بلا رأس الموقع، والشعارُ
   * في اللوح بابُ الخروج؛ و`flat` تحت رأس الموقع بلا ورقةٍ حول المحادثة.
   */
  look?: "app" | "flat";
  /** ⚠️ للمقارنة (١١-٢٤): الجوابُ كلامٌ بلا فقاعة (`plain`) أو على قطعةٍ من اللوح (`bubble`) */
  answer?: "plain" | "bubble";
};

const NOTE = "ديبو شخصية ذكية، تم تطويرها وتدريبها بالكامل في نادي أدِيب.";
const AT_END = 96;

/** وجهُ ديبو في اللوح وما يقوله عن حاله: حالٌ تُقرأ من الغرفة لا قرعة */
export type Live = { face: string; alt: string; doing: string };
const FACE = (m: Mood): Pick<Live, "face" | "alt"> => ({ face: moodSrc(m), alt: MOOD_ALT[m] });
const LISTEN: Pick<Live, "face" | "alt"> = { face: "/deebo/listening-carefully.webp", alt: "ديبو يُصغي" };

export function liveOf(turns: ShownTurn[], greeting: Greeting, typing: boolean, busy: boolean, error: string | null, unknownAnswer?: string): Live {
  const last = turns[turns.length - 1];
  if (error) return { ...FACE("sorry"), doing: "تعثّر الجواب" };
  if (busy && last?.role === "assistant" && !last.content) return { ...FACE("thinking"), doing: "يفكّر…" };
  if (busy) return { ...FACE("explaining"), doing: "يكتب لك…" };
  if (typing) return { ...LISTEN, doing: "يُصغي إليك…" };
  if (last?.role === "assistant") {
    const m = moodFor(last.content, false, unknownAnswer);
    return { ...FACE(m), doing: m === "sorry" ? "لم يجد جوابًا" : "" };
  }
  return { ...FACE(greeting.mood), doing: "" };
}

const ORDER = ["اليوم", "أمس", "آخر سبعة أيّام", "هذا الشهر", "أقدم"];
function groupByDay(rows: ConversationRow[], todayKey: string): Array<[string, ConversationRow[]]> {
  const buckets = new Map<string, ConversationRow[]>();
  for (const r of rows) {
    const days = todayKey ? daysBetweenKeys(clubDayKey(r.lastAt), todayKey) : 99;
    const label = days <= 0 ? "اليوم" : days === 1 ? "أمس" : days <= 7 ? "آخر سبعة أيّام" : days <= 31 ? "هذا الشهر" : "أقدم";
    buckets.set(label, [...(buckets.get(label) ?? []), r]);
  }
  return ORDER.filter((l) => buckets.has(l)).map((l) => [l, buckets.get(l)!]);
}

/**
 * **أفعالُ الجواب** — قطعةٌ من عائلة ديبو: رموزٌ هادئةٌ تحت الجواب، تظهر حين يكتمل، واسمُها في تلميحها وعند قارئ الشاشة. «انسخ» تقول
 * «نُسخ» لحظةً ثمّ تعود. (و«أعد الجواب» تأتي حين يدعمها عقلُ ديبو)
 */
export function CopyAnswer({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  const label = done ? "نُسخ" : "انسخ الجواب";
  return (
    <button type="button" className="ad-dc-act" aria-label={label} title={label} data-done={done || undefined}
      onClick={() => navigator.clipboard?.writeText(text).then(() => { setDone(true); window.setTimeout(() => setDone(false), 1800); }, () => {})}>
      {done ? <Check /> : <Copy />}
    </button>
  );
}

export function DeeboStage({
  turns, greeting, busy, error, blocked = false, draft, onDraft, onSend, onStop, onReset, shield,
  conversations = null, openId = null, onOpenConversation, onDeleteConversation, onOpenDrawer, questions = [], unknownAnswer, me: _me = null, label = null, look = "app", answer = "bubble",
}: DeeboStageProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [atEnd, setAtEnd] = useState(true);
  const [typing, setTyping] = useState(false);
  const [log, setLog] = useState(false);
  const [todayKey, setTodayKey] = useState("");
  const started = turns.length > 0;
  const signedIn = conversations !== null;
  const live = liveOf(turns, greeting, typing && !!draft.trim(), busy, error, unknownAnswer);

  // اليومُ بعد التركيب: الخادمُ والمتصفّحُ يرسمان سواءً، ثمّ تُرتَّب المحادثاتُ بأزمانها
  // eslint-disable-next-line react-hooks/set-state-in-effect -- ساعةُ القارئ بعد الترطيب
  useEffect(() => setTodayKey(clubDayKey(new Date().toISOString())), []);

  const toEnd = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);
  useEffect(() => {
    if (atEnd) toEnd(turns.length > 1 ? "smooth" : "auto");
  }, [turns, atEnd, toEnd]);
  const onScroll = () => {
    const el = scrollRef.current;
    if (el) setAtEnd(el.scrollHeight - el.scrollTop - el.clientHeight < AT_END);
  };
  const submit = () => {
    const q = draft.trim();
    if (!q || busy || blocked) return;
    onSend(q);
    onDraft("");
    taRef.current?.focus();
    setAtEnd(true);
  };
  const fresh = () => { onReset(); onDraft(""); taRef.current?.focus(); };

  const groups = signedIn && conversations?.length ? groupByDay(conversations, todayKey) : [];

  return (
    <div className="ad-db" data-look={look} data-answer={answer}>
      {/* ── اللوح: ديبو بطوله يعيش المحادثة، ثمّ أفعالُه، ثمّ محادثاتُك ── */}
      <aside className="ad-plate ad-db-side" aria-label="ديبو">
        {look === "app" ? (
          <Link href="/" className="ad-db-logo" aria-label="نادي أدِيب، الرئيسية">
            {/* eslint-disable-next-line @next/next/no-img-element -- شعارٌ متّجه */}
            <img src="/brand/logo-horizontal-white.svg" alt="" />
          </Link>
        ) : null}
        <div className="ad-db-who">
          <span className="ad-db-figure">
            {/* المفتاحُ يُعيد رسمَ الوجه فيظهر بحركته، ولا يتبدّل وجهٌ بلا سبب */}
            <img key={live.face} src={live.face} alt={live.alt} width={320} height={320} />
          </span>
          <span className="ad-db-id">
            <b className="ad-db-name">ديبو</b>
            <span className="ad-db-role">مساعدُ نادي أدِيب</span>
            <span className="ad-db-doing" aria-live="polite">{live.doing}</span>
          </span>
        </div>

        <div className="ad-db-side-acts">
          {started ? <AdButton variant="inverse" icon={<Plus />} onClick={fresh}><span className="ad-db-lbl">محادثة جديدة</span></AdButton> : null}
          {signedIn && conversations?.length ? (
            <span className="ad-db-only-narrow">
              <AdButton variant="inverse-quiet" icon={<ChatsCircle />} onClick={() => { onOpenDrawer?.(); setLog(true); }}>
                <span className="ad-db-lbl">محادثاتي</span><span className="ad-db-num">{conversations.length}</span>
              </AdButton>
            </span>
          ) : null}
          {!signedIn ? <AdButton variant="inverse-quiet" icon={<SignIn />} href="/login?next=/deebo"><span className="ad-db-lbl">ادخل لتُحفظ محادثاتك</span></AdButton> : null}
        </div>

        {groups.length ? (
          <nav className="ad-db-hist" aria-label="محادثاتي">
            <p className="ad-db-hist-t">محادثاتي</p>
            {groups.map(([when, list]) => (
              <div key={when} className="ad-db-hist-g">
                <p className="ad-db-hist-when">{when}</p>
                <ul>
                  {list.map((c) => (
                    <li key={c.id} data-on={c.id === openId || undefined}>
                      <button type="button" className="ad-db-hist-open" onClick={() => onOpenConversation?.(c.id)} aria-current={c.id === openId || undefined}>
                        <ChatCircleText aria-hidden /><span>{c.title || "محادثة"}</span>
                      </button>
                      {onDeleteConversation ? (
                        <button type="button" className="ad-db-hist-x" aria-label={`احذف: ${c.title || "محادثة"}`} onClick={() => onDeleteConversation(c.id)}>
                          <Trash />
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <p className="ad-db-hist-note">حذفُك محادثةً يحذفها من كلّ مكان.</p>
          </nav>
        ) : null}
        {look === "app" ? (
          <div className="ad-db-out">
            <AdButton variant="inverse-quiet" size="sm" icon={<House />} href="/"><span className="ad-db-lbl">العودة إلى الموقع</span></AdButton>
          </div>
        ) : null}
      </aside>

      {/* ── الورقة: المحادثة ── */}
      <section className="ad-db-main" aria-label="المحادثة">
        <div className="ad-db-scroll" ref={scrollRef} onScroll={onScroll}>
          <div className="ad-db-col">
            {label ? <p className="ad-alt">{label}</p> : null}
            {started ? (
              /* **السؤالُ والجواب** — قطعتان من عائلة ديبو: سؤالُك فقاعةٌ من ورقٍ في جهة النهاية (عُرفُ المحادثات)، وجوابُه كلامٌ يُقرأ بعرض
                 العمود وفي صدره وجهُه بحال ذلك الجواب. (`data-answer="bubble"` للمقارنة: الجوابُ نفسُه على قطعةٍ من اللوح) */
              <ol className="ad-dc-thread" role="list">
                {turns.map((t, i) => t.role === "user" ? (
                  <li key={i} className="ad-dc-q"><p>{t.content}</p></li>
                ) : (
                  <li key={i} className="ad-dc-a">
                    <img className="ad-dc-a-face" src={moodSrc(moodFor(t.content, t.streaming, unknownAnswer))} alt="" width={40} height={40} aria-hidden />
                    <div className="ad-dc-a-body">
                      <b className="ad-dc-a-who">ديبو</b>
                      <div className="ad-dc-a-say">
                        {t.content ? <DeeboText text={t.content} /> : t.streaming ? (
                          <span className="ad-dc-wait" role="status" aria-label="ديبو يكتب"><i /><i /><i /></span>
                        ) : null}
                      </div>
                      {!t.streaming && t.cards?.length ? <DeeboCards cards={t.cards} /> : null}
                      {!t.streaming && t.content ? <div className="ad-dc-acts"><CopyAnswer text={t.content} /></div> : null}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="ad-db-hello">
                <h1 className="ad-db-greet">{greeting.text}</h1>
                <p className="ad-db-lede">
                  أعرف أدِيب: فعاليّاتِه وقادتَه وأخبارَه ومكتبتَه{signedIn ? "، وأعرفك فيه." : "."} اسألني بلهجتك، وأجيبك بما في الموقع نفسِه.
                </p>
                {questions.length ? (
                  <div className="ad-db-asks" role="list" aria-label="أسئلةٌ تبدأ بها">
                    {questions.map((q) => (
                      <button key={q} type="button" role="listitem" className="ad-db-ask" onClick={() => onSend(q)} disabled={busy || blocked}>
                        <ChatCircleText aria-hidden /><span>{q}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
            {error ? <AdNote tone="bad" title="تعذّر الجواب">{error}</AdNote> : null}
          </div>
        </div>

        <div className="ad-db-dock">
          {started && !atEnd ? (
            <button type="button" className="ad-btn ad-btn-fill ad-btn-sm ad-db-down" onClick={() => toEnd()} aria-label="انزل إلى آخر الكلام"><CaretDown /></button>
          ) : null}
          <div className="ad-db-col">
            <div className="ad-db-comp">
              <div className="ad-db-well" data-val={draft + "\n"}>
                <span className="ad-db-spark" aria-hidden><Sparkle /></span>
                <textarea ref={taRef} className="ad-db-ta" rows={1} value={draft} maxLength={600}
                  aria-label="اسأل ديبو" placeholder="اسأل ديبو عن أدِيب"
                  onFocus={() => setTyping(true)} onBlur={() => setTyping(false)}
                  onChange={(e) => onDraft(e.currentTarget.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }} />
                {busy ? (
                  <button type="button" className="ad-btn ad-btn-fill ad-db-send" onClick={onStop} aria-label="أوقف الجواب"><Stop /></button>
                ) : (
                  <button type="button" className="ad-btn ad-btn-fill ad-db-send" onClick={submit} disabled={!draft.trim() || blocked} aria-label="أرسل"><PaperPlaneRight /></button>
                )}
              </div>
            </div>
            {shield}
            <p className="ad-db-note" role={blocked ? "status" : undefined}>{blocked ? "لحظة، نتحقّق أنّك لست روبوتًا." : NOTE}</p>
          </div>
        </div>
      </section>

      {signedIn && conversations ? (
        <DeeboLog rows={conversations} open={log} todayKey={todayKey} openId={openId} onClose={() => setLog(false)}
          onOpen={(id) => onOpenConversation?.(id)} onNew={fresh} onDelete={onDeleteConversation} />
      ) : null}
    </div>
  );
}
