"use client";

/**
 * شاشةُ ديبو — **غرفةُ محادثة**، اعتمدها المالك ٢٠٢٦-٠٨-٢٠.
 *
 * كانت صفحةً تُقرأ (عنوانٌ ثمّ فقاعاتٌ ثمّ حقلٌ في آخر التدفّق)، وعُرضت ثلاثُ هيئاتٍ فاختار
 * الغرفةَ وقال: «المفروض تكون هذه بديهيّات، قدّم لي صفحةً وكأنّي أرى محادثةَ GPT أو
 * Claude». **فأُعدمت أختاها** ولم يبقَ منهما سطر، ولا خاصّيةَ `shape` بلا جلدٍ ثانٍ.
 *
 * والحكمُ الجامع: الوثيقةُ لها آخِرٌ، والمحادثةُ آخرُها دائمًا **الآن** — فالصفحةُ لا تمرّر،
 * ويمرّر المتنُ وحدَه بين شريطٍ ومُنشئٍ لا يتزحزحان. وتفصيلُ الهيئة في `.dchs-*` بالمكتبة.
 *
 * وهو **عرضٌ محضٌ لا يعرف الشبكة**: الحيُّ يمدّه بـ`useDeebo`، والمعرِضُ يمدّه بحوارٍ مكتوب
 * فيرى المالكُ في `/ui/deebo-screen` ما ينزل حيًّا لا محاكاةً تشبهه.
 */

import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Alert, Button } from "@adeeb/design-system";
import { ChatsCircle, PaperPlaneRight, Sparkle, Stop } from "@phosphor-icons/react";
import { CaretDown } from "@/app/_components/glyphs";
import { clubDayKey } from "@/lib/dates";
import type { ConversationRow } from "./actions";
import { DeeboIsle } from "./DeeboIsle";
import type { Greeting } from "@/lib/deebo/greeting";
import { MOOD_ALT, moodFor, moodSrc } from "@/lib/deebo/mood";
import type { Turn } from "@/lib/deebo/useDeebo";

export type DeeboScreenProps = {
  turns: Turn[];
  /** التحيّةُ كما قُرعت: جملتُها ووجهُها معًا (`lib/deebo/greeting`)، لا سطرٌ وحدَه. */
  greeting: Greeting;
  busy: boolean;
  error: string | null;
  /** الإرسالُ ممنوعٌ الآن (الدرعُ لم يُصدر رمزَه بعد). */
  blocked?: boolean;
  draft: string;
  onDraft: (v: string) => void;
  onSend: (text: string) => void;
  onStop: () => void;
  onReset: () => void;
  /** ودجةُ Turnstile — تأتي من الحيّ وحده، فالمعرِضُ لا يستدعي درعًا. */
  shield?: ReactNode;
  /**
   * سِجلُّ محادثاتي — `null` لمن لا حسابَ له: لا بابَ يُفتح على فراغ.
   * (والزائرُ المجهول محادثتُه في جهازه، ولا سِجلَّ له عندنا أصلًا.)
   */
  conversations?: ConversationRow[] | null;
  /** المحادثةُ المفتوحةُ الآن من السِّجلّ — تُعلَّم في الدرج. */
  openId?: string | null;
  onOpenConversation?: (id: string) => void;
  onDeleteConversation?: (id: string) => void;
  /** يُنادى عند فتح الدرج: القائمةُ تُقرأ من الخادم عند القصد لا في كلّ رسم. */
  onOpenDrawer?: () => void;
  /**
   * أسئلةُ الشاشة الفارغة كما هي في القاعدة اليوم (`deebo_persona`)، وقد قُصّت على
   * العدد الذي اختاره المالك. كانت ثابتًا في `persona.ts` حتى ٢٠٢٦-٠٨-٢٢.
   */
  questions?: readonly string[];
  /** جملةُ «لا أعرف» — يقيس بها `moodFor` وجهَ الاعتذار. */
  unknownAnswer?: string;
};

/* سطرُ القاع بنصّ المالك ٢٠٢٦-٠٨-٢٠. وكان قبله إفصاحًا: «محادثتك تُعالَج لدى مزوّدٍ
   خارجيّ، لا تكتب فيها ما لا تحبّ أن يُقرأ» — استبدله بهذا بحروفه. */
const NOTE = "ديبو شخصية ذكية، تم تطويرها وتدريبها بالكامل في نادي أدِيب.";

/** كم بكسلًا يُعدّ «في آخر الكلام»: دونها لا يظهر زرُّ النزول ويتبع المتنُ الجوابَ وحدَه. */
const AT_END = 96;

/** الترحيبُ يتوسّط الغرفةَ ما دامت فارغة، ثمّ يذهب كلُّه مع أوّل سؤال. */
function Hello({
  greeting,
  disabled,
  onPick,
  questions,
}: {
  greeting: Greeting;
  disabled: boolean;
  onPick: (q: string) => void;
  questions: readonly string[];
}) {
  return (
    <div className="dchs-hello">
      {/* **الوجهُ من التحيّة نفسِها** (أمرُ المالك ٢٠٢٦-٠٨-٢٠): قرعةٌ واحدةٌ أخرجت الجملةَ
          والوجه، فلا تختار الشاشةُ وجهًا ولا تُخمّنه من نصٍّ تقرؤه. */}
      <img
        className="dch-hero"
        src={moodSrc(greeting.mood)}
        alt={MOOD_ALT[greeting.mood]}
        width={132}
        height={132}
      />
      <p className="text-lg text-content">{greeting.text}</p>
      <div className="dchs-asks">
        {questions.map((q) => (
          <Button key={q} size="sm" variant="ghost" onClick={() => onPick(q)} disabled={disabled}>
            {q}
          </Button>
        ))}
      </div>
      {/* **ولا زرَّ سِجلٍّ ههنا** (أمرُ المالك ٢٠٢٦-٠٨-٢٠): كان يقول «لك كذا محادثاتٍ سابقة»
          فأُزيل. وبابُ السِّجلّ في الشريط العلويّ، وبابان لفعلٍ واحدٍ في شاشةٍ واحدةٍ ازدحام. */}
    </div>
  );
}

/** المتنُ: أدوارٌ بفقاعات المكتبة نفسِها، والوجهُ يقوله `mood` لا مَن يرسم. */
function Thread({ turns, unknownAnswer }: { turns: Turn[]; unknownAnswer?: string }) {
  return (
    <ul className="dch">
      {turns.map((t, i) => (
        <li key={i} className="dch-turn" data-who={t.role}>
          {t.role === "assistant"
            ? (() => {
                const mood = moodFor(t.content, t.streaming, unknownAnswer);
                return <img className="dch-av" src={moodSrc(mood)} alt={MOOD_ALT[mood]} width={40} height={40} />;
              })()
            : null}
          <span className="dch-who">
            <b>{t.role === "user" ? "أنت" : "ديبو"}</b>
          </span>
          {/* الانتظارُ نبضةٌ **داخل** الفقاعة: تقع الفقاعةُ في موضعها من أوّل لحظة، فلا
              يقفز المتنُ حين يصل أوّلُ حرف. */}
          <p className="dch-say">
            {t.content ||
              (t.streaming ? (
                <span className="dch-wait" role="status" aria-label="ديبو يكتب">
                  <i />
                  <i />
                  <i />
                </span>
              ) : null)}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function DeeboScreen({
  turns,
  greeting,
  busy,
  error,
  blocked = false,
  draft,
  onDraft,
  onSend,
  onStop,
  onReset,
  shield,
  conversations = null,
  openId = null,
  onOpenConversation,
  onDeleteConversation,
  onOpenDrawer,
  questions = [],
  unknownAnswer,
}: DeeboScreenProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  /** هل القارئُ في آخر الكلام؟ عليها يقوم أمران: زرُّ النزول، وهل يتبع المتنُ الجواب. */
  const [atEnd, setAtEnd] = useState(true);
  const [sheet, setSheet] = useState(false);
  /* مفتاحُ اليوم يُلتقط عند الفتح لا في كلّ رسم: الخادمُ والمتصفّحُ يرسمان سواءً. */
  const [todayKey, setTodayKey] = useState("");
  const started = turns.length > 0;

  const toEnd = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  /* **لا يُجرُّ القارئُ من مكانه**: الجوابُ يُتبَع ما دام في آخر الكلام، فإن صعد ليقرأ
     ما مضى بقي حيث هو وقال له زرُّ النزول إنّ ثمّة جديدًا. وهو عُرفُ كلّ محادثةٍ يعرفها. */
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
    // المؤشّرُ يبقى في الكبسولة: سؤالٌ يتبع سؤالًا، فلا يُطلَب نقرٌ بينهما.
    taRef.current?.focus();
    setAtEnd(true);
  };

  return (
    <div className="dchs">
      {/* الشريطُ العلويّ: مَن تكلّم، وبابُ السِّجلّ **بكلمته**، وبابُ البداية من جديد */}
      <div className="dchs-col dchs-top">
        {/* وجهُ الشريط `chatting` باختيار المالك ٢٠٢٦-٠٨-٢٠: هو وجهُ الاسم لا وجهُ جوابٍ بعينه. */}
        <img className="dchs-face" src={moodSrc("chatting")} alt="" width={30} height={30} aria-hidden="true" />
        <b>ديبو</b>

        {/* **البابُ يرفع ورقةَ اللوحة المُقرّة**: ثلاثُ هيئاتٍ رُفضت قبلها، وهذه لا تخترع
            أثاثًا — ورقةٌ مذهّبةٌ تصعد من القاع كورقة التنقّل بعينها. ولا يُرسَم لمن لا
            محادثةَ له: بابٌ على فراغٍ أسوأُ من لا باب. */}
        {conversations && conversations.length > 0 ? (
          <button
            type="button"
            className="dchs-log"
            onClick={() => {
              onOpenDrawer?.();
              setTodayKey(clubDayKey(new Date().toISOString()));
              setSheet(true);
            }}
            aria-expanded={sheet}
          >
            <ChatsCircle />
            مُحادثاتي
            <span className="num">{conversations.length}</span>
          </button>
        ) : null}

        {/* **ولا «محادثة جديدة» في الشريط** (أمرُ المالك ٢٠٢٦-٠٨-٢٠): بابُها صفُّها الأوّل
            في جزيرة المحادثات، فزرّان لفعلٍ واحدٍ في شاشةٍ واحدةٍ ازدحامٌ لا اختيار. */}
      </div>

      <div className="dchs-scroll" ref={scrollRef} onScroll={onScroll}>
        <div className="dchs-col">
          {started ? (
            <Thread turns={turns} unknownAnswer={unknownAnswer} />
          ) : (
            <Hello greeting={greeting} disabled={busy || blocked} onPick={onSend} questions={questions} />
          )}
          {error ? (
            <Alert tone="danger" title="تعذّر">
              {error}
            </Alert>
          ) : null}
        </div>
      </div>

      {conversations ? (
        <DeeboIsle
          rows={conversations}
          open={sheet}
          todayKey={todayKey}
          openId={openId}
          onClose={() => setSheet(false)}
          onOpen={(id) => onOpenConversation?.(id)}
          onNew={() => {
            onReset();
            setSheet(false);
          }}
          onDelete={onDeleteConversation}
        />
      ) : null}

      <div className="dchs-dock">
        {started && !atEnd ? (
          <button type="button" className="dchs-down" onClick={() => toEnd()} aria-label="انزل إلى آخر الكلام">
            <CaretDown />
          </button>
        ) : null}

        <div className="dchs-col">
          <div className="dchs-comp">
            {/* بئرُ الحقل بلا تسمية (ق٣) والمرآةُ في الورقة ترسم ارتفاعَه: `data-val`
                نصُّ المسوّدة نفسُه، ومحرفُ سطرٍ في آخره كي يتّسع للسطر الجديد قبل كتابته. */}
            <div className="fld-wrap dchs-well" data-val={draft + "\n"}>
              <span className="fld-iic" aria-hidden="true">
                <Sparkle />
              </span>
              <textarea
                ref={taRef}
                className="fld-in fld-area dchs-ta"
                rows={1}
                value={draft}
                maxLength={600}
                aria-label="اسأل ديبو"
                placeholder="اكتب سؤالك عن النادي"
                onChange={(e) => onDraft(e.currentTarget.value)}
                onKeyDown={(e) => {
                  // Enter يرسل، وShift+Enter سطرٌ جديد — عُرفُ المحادثات، لا عُرفُ النماذج.
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
              />
              {/* **الإيقافُ يحلّ محلّ الإرسال ولا يقف بجانبه**: الفعلُ الممكنُ في اللحظة
                  واحد. وهو إلغاءٌ حقيقيّ (ق٧): يقطع البثّ فعلًا ويُبقي ما وصل. */}
              {busy ? (
                <button type="button" className="abtn abtn-neutral abtn-md dchs-send" onClick={onStop} aria-label="أوقف الجواب">
                  <Stop />
                </button>
              ) : (
                <button
                  type="button"
                  className="abtn abtn-primary abtn-md dchs-send"
                  onClick={submit}
                  disabled={!draft.trim() || blocked}
                  aria-label="أرسل"
                >
                  <PaperPlaneRight />
                </button>
              )}
            </div>
          </div>

          {shield}

          {/* الزرُّ الرماديُّ بلا سببٍ يُقرأ عطبًا. والحالُ لحظةٌ في العادة: الدرعُ خفيٌّ
              ورمزُه يجري بلا أن يُرى، فالسطرُ يظهر ويذهب. */}
          <p className="dchs-note" role={blocked ? "status" : undefined}>
            {blocked ? "لحظة، نتحقّق أنّك لست روبوتًا." : NOTE}
          </p>
        </div>
      </div>
    </div>
  );
}
