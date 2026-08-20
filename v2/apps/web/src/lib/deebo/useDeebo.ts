"use client";

/**
 * خطّافُ محادثة ديبو — يملك الرسائل والبثّ والأخطاء.
 *
 * مفصولٌ عن الشاشة عمدًا: **موضعان يستعملانه** (صفحة `/deebo` وفقاعةُ الصفحات)،
 * ولو سكن أحدَهما لنُسخ في الآخر فافترقا. الشاشةُ ترسم، والخطّافُ يتكلّم.
 *
 * ويقرأ NDJSON لا SSE: سطرٌ واحدٌ لكلّ حدث، فالتحليلُ `JSON.parse` على السطر
 * ولا حاجة لمواصفة `event:`/`data:` كاملة. والمِنفذ يكتب بالصيغة نفسِها.
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

export type Turn = {
  role: "user" | "assistant";
  content: string;
  /** يبثّ الآن، فالشاشة تُظهر مؤشّر الكتابة ولا تعامله جوابًا تامًّا. */
  streaming?: boolean;
};

export type DeeboState = {
  turns: Turn[];
  busy: boolean;
  error: string | null;
  /**
   * هل ما زال الدرعُ مطلوبًا؟
   *
   * المِنفذُ يطلب رمزَ Turnstile **ما لم يكن للطلب معرّفُ محادثة** (والرمزُ يُستهلك مرّةً،
   * ومطالبةُ الزائر بحلّ اللغز عند كلّ سؤالٍ تقتل المحادثة). فما دام الخادمُ لم يعطنا
   * معرّفًا فالرمزُ لازم، وهذا ما تقوله هذه الرايةُ للشاشة.
   *
   * **ولا تُشتقّ من `turns.length`** — وهذا كان جذرَ عطبِ ٢٠٢٦-٠٨-٢٠: الشاشةُ كانت تنزع
   * الودجةَ أوّلَ ما يُضاف دورُ الزائر، والمعرّفُ لم يصل بعد. فإذا سقطت المحاولةُ الأولى
   * لم يبقَ في الصفحة ما يُصدر رمزًا جديدًا، فلا سبيلَ إلّا إعادةُ تحميل الصفحة.
   */
  shielded: boolean;
  /**
   * عدّادُ السقطات — يزيد مع كلّ محاولةٍ فاشلة.
   *
   * تقرؤه الشاشةُ إشارةَ إعادة ضبطٍ للدرع (`resetSignal`) مباشرةً: رمزُ Turnstile يُستهلك
   * مرّةً، والمحاولةُ الفاشلة تحرقه أو تكشف أنّ أجلَه انقضى. **وعدّادٌ يُقرأ خيرٌ من أثرٍ
   * يراقب `error`** — ضبطُ الحالة داخل الأثر يُسلسل رسمًا على رسم، ويردّه المُدقّق.
   */
  failures: number;
  send: (text: string) => void;
  /**
   * إيقافُ الجواب وهو يُكتب.
   *
   * **إلغاءٌ حقيقيٌّ لا رسمٌ يُطفأ** (ق٧: «إلغاءٌ لا يَعِد بما لا يملك»): البثُّ اتّصالٌ
   * مفتوحٌ فقطعُه يقطعه فعلًا، خلافًا لطلبٍ بلغ الخادمَ ومضى. وما وصل من الجواب يبقى
   * في مكانه دورًا تامًّا — الزائرُ أوقفه ولم يُخطئ فيه شيء.
   */
  stop: () => void;
  reset: () => void;
  /**
   * يتبنّى محادثةً محفوظةً (من سِجلّ صاحب الحساب): أدوارُها تحلّ محلّ ما في الشاشة،
   * ومعرّفُها يصير معرّفَ المحادثة الجارية — فالسؤالُ التالي يلحق بها في القاعدة
   * ولا يفتح صفًّا ثانيًا. والدرعُ يُطوى معه: محادثةٌ قائمةٌ لا تُدرَع.
   */
  adopt: (conversationId: string, turns: Turn[]) => void;
};

/**
 * **ذاكرةُ الزائر المجهول في جهازه** (قرارُ المالك ٢٠٢٦-٠٨-٢٠).
 *
 * من لا حسابَ له لا سِجلَّ له عندنا يُفتح — بصمتُه تدور كلَّ يومٍ عمدًا، فلا سبيل إلى
 * نسبة محادثةٍ إليه أصلًا. فتبقى محادثتُه في متصفّحه: تحديثُ الصفحة لا يمحوها، وهي
 * لا تغادر جهازَه. ومن دخل بحسابه لا يُستعمل له هذا: القاعدةُ سِجلُّه.
 */
const LOCAL_KEY = "deebo-talk";
/** ما يُحفظ محليًّا: أدوارُ المحادثة ومعرّفُها كي يلحق بها السؤالُ التالي. */
type LocalTalk = { conversationId: string | null; turns: Turn[] };

function readLocal(): LocalTalk | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalTalk;
    if (!Array.isArray(parsed?.turns)) return null;
    // البثُّ المقطوع لا يُستأنف بعد إعادة التحميل: يُقرأ ما وصل دورًا تامًّا.
    return { conversationId: parsed.conversationId ?? null, turns: parsed.turns.map((t) => ({ ...t, streaming: false })) };
  } catch {
    return null;
  }
}

/* **المخزَّنُ نظامٌ خارجيٌّ يُشترَك فيه، لا حالةٌ تُنسَخ إليه.**

   جُرّب أوّلًا استرجاعُه في أثرٍ يضبط الحالة (`useEffect` → `setTurns`)، فردّه المُدقّق:
   ضبطُ حالةٍ داخل أثرٍ يُسلسِل رسمًا على رسم. والجوابُ الصحيحُ لا الالتفاف:
   `useSyncExternalStore` — لقطةٌ على الخادم (`null`، فيرسم الترحيبَ كما يرسمه العميل
   أوّلَ لحظة فلا فجوةَ ترطيب)، ولقطةٌ في المتصفّح تُقرأ مرّةً وتُحفظ في `cache` كي تبقى
   **ثابتةَ المرجع** — ولو قرأناها من `localStorage` في كلّ نداءٍ لأعاد React الرسمَ بلا
   نهاية (كائنٌ جديدٌ في كلّ لقطة).

   والكتابةُ تمرّ من ههنا كذلك، فمصدرُ الحقيقة واحدٌ لا اثنان يفترقان. */
let cached: LocalTalk | null | undefined; // undefined = لم تُقرأ بعد
const watchers = new Set<() => void>();

function localSnapshot(): LocalTalk | null {
  if (cached === undefined) cached = readLocal();
  return cached;
}
/** لقطةُ الخادم: لا `localStorage` هناك، والغرفةُ تُرسم فارغةً كما تُرسم أوّلَ لحظةٍ هنا. */
function serverSnapshot(): LocalTalk | null {
  return null;
}
function watchLocal(onChange: () => void): () => void {
  watchers.add(onChange);
  return () => watchers.delete(onChange);
}
/**
 * يكتب المخزَّن. و`notify` **قرارٌ لا سهو**: أثناء المحادثة الشاشةُ ترسم من حالتها
 * فإخبارُ المشتركين رسمٌ زائدٌ لا يغيّر حرفًا؛ أمّا المسحُ (بدايةٌ من جديد) فيجب أن
 * يُخبَر به، وإلّا بقيت اللقطةُ القديمةُ تُرجع المحادثةَ التي مُحيت.
 */
function writeLocal(next: LocalTalk | null, notify: boolean): void {
  cached = next;
  try {
    if (next) localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
    else localStorage.removeItem(LOCAL_KEY);
  } catch {
    // ممتلئٌ أو محجوب: الذاكرةُ ترفٌ، والمحادثةُ في الشاشة قائمةٌ على كلّ حال
  }
  if (notify) for (const w of watchers) w();
}

/** كم رسالةً سابقةً تُرسل مع السؤال. يطابق سقف المِنفذ، وهو يقصّ ثانيةً احتياطًا. */
const HISTORY = 6;

export function useDeebo(
  turnstileToken: string | null,
  remember = false,
  /** يُنادى متى استقرّ جوابٌ في القاعدة — به يُنعَش سِجلُّ المحادثات بلا مؤقّتٍ يُخمَّن. */
  onFinish?: () => void,
  /**
   * محادثةٌ محفوظةٌ يبدأ بها (يقرؤها **الخادمُ** من `?c=` ويمرّرها): بدايةٌ لا أثرٌ يضبط
   * حالةً بعد أوّل رسم — فلا رسمَ يتسلسل ولا ومضةَ شاشةٍ فارغةٍ قبل أن تظهر.
   */
  initial?: { id: string; turns: Turn[] } | null,
): DeeboState {
  const [turns, setTurns] = useState<Turn[]>(initial?.turns ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const convId = useRef<string | null>(initial?.id ?? null);
  // حالةٌ لا مرجعٌ وحده: الشاشةُ تبني عليها بقاءَ الدرع، والمرجعُ لا يُعيد رسمًا.
  // ومحادثةٌ قائمةٌ لا تُدرَع: المِنفذُ لا يطلب رمزًا لمن معه معرّفُها.
  const [shielded, setShielded] = useState(!initial?.id);
  const [failures, setFailures] = useState(0);

  /**
   * مرآةٌ مرجعيّة للرسائل.
   *
   * ليست ترفًا: قراءةُ التاريخ من داخل مُحدِّث `setState` تُغري بوضع نداء الشبكة
   * هناك، ومُحدِّثُ الحالة **يُنادى مرّتين** في وضع React الصارم — فيُرسل سؤالان
   * ويُحاسَب الرصيدُ مرّتين. فالمرآةُ تُقرأ خارج الرسم، والأثرُ يبقى حيث يجب.
   */
  const ref = useRef<Turn[]>(initial?.turns ?? []);
  const apply = useCallback((f: (prev: Turn[]) => Turn[]) => {
    ref.current = f(ref.current);
    setTurns(ref.current);
  }, []);

  // قفلٌ فوريّ: `busy` حالةٌ لا تُحدَّث إلّا في الرسم التالي، فضغطتان متلاحقتان
  // تمرّان كلتاهما. والمرجعُ يُكتب في اللحظة.
  const sending = useRef(false);
  /** حاكمُ البثّ الجاري — به يُقطع الاتّصال، وبه يُعرَف أنّ القطعَ كان بيد الزائر. */
  const abort = useRef<AbortController | null>(null);
  /* النداءُ في مرجعٍ لا في تبعيّة: `send` تُبنى مرّةً، ولو دخل النداءُ تبعيّاتِها لأُعيد
     بناؤها كلَّما أعاد المستدعي تعريفَه (وهو دالّةٌ تُكتب في الرسم). */
  const finish = useRef(onFinish);
  finish.current = onFinish;

  const adopt = useCallback(
    (id: string, next: Turn[]) => {
      abort.current?.abort();
      abort.current = null;
      writeLocal(null, true);
      sending.current = false;
      convId.current = id;
      setShielded(false);
      setError(null);
      setBusy(false);
      ref.current = next;
      setTurns(next);
    },
    [],
  );

  /* المخزَّنُ يُقرأ اشتراكًا لا نسخًا: ما دامت الشاشةُ لم يُكتب فيها شيءٌ بعدُ فالمعروضُ
     محادثةُ الأمس من الجهاز، فإذا تكلّم صاحبُها حلّت حالتُها محلَّها. ولا حالةَ تُضبط
     في أثرٍ، فلا رسمَ يتسلسل. */
  const stored = useSyncExternalStore(watchLocal, localSnapshot, serverSnapshot);
  const restored = remember && turns.length === 0 ? (stored?.turns ?? []) : turns;

  /* والحفظُ عند كلّ استقرار: الأدوارُ تتبدّل مع كلّ حزمةٍ من البثّ، فيُكتب المخزَّنُ
     كثيرًا — وهو كتابةُ سطرٍ صغيرٍ متزامنة، أرخصُ من مؤقّتٍ يُدار ويُنظَّف. */
  useEffect(() => {
    if (!remember || turns.length === 0) return;
    writeLocal({ conversationId: convId.current, turns }, false);
  }, [turns, remember]);

  const stop = useCallback(() => {
    abort.current?.abort();
    abort.current = null;
  }, []);

  const reset = useCallback(() => {
    // محادثةٌ جديدةٌ تبدأ بقطع القديمة: جوابٌ يُكتب في متنٍ ذهب يكتب في العدم.
    abort.current?.abort();
    abort.current = null;
    // ومحادثةُ الجهاز تُمحى معها ويُخبَر المشتركون، وإلّا أعادتها اللقطةُ القديمة.
    writeLocal(null, true);
    convId.current = null;
    setShielded(true);
    sending.current = false;
    ref.current = [];
    setTurns([]);
    setError(null);
    setBusy(false);
  }, []);

  const send = useCallback(
    (text: string) => {
      const question = text.trim();
      if (!question || sending.current) return;
      /* أوّلُ سؤالٍ بعد استئنافِ محادثةِ الجهاز: تُنقل أدوارُها ومعرّفُها إلى الحالة قبل
         أن يُبنى التاريخ — وإلّا مضى السؤالُ كأنّه أوّلُ الكلام، وفتح صفًّا ثانيًا. */
      if (remember && ref.current.length === 0) {
        const saved = localSnapshot();
        if (saved && saved.turns.length > 0) {
          ref.current = saved.turns;
          convId.current = saved.conversationId;
          if (saved.conversationId) setShielded(false);
        }
      }
      sending.current = true;
      setError(null);
      setBusy(true);

      // يُلتقط قبل الإضافة كي لا يحوي السؤالَ الجاري (المِنفذ يضيفه بنفسه)
      const history = ref.current
        .slice(-HISTORY)
        .map((t) => ({ role: t.role, content: t.content }));

      apply((prev) => [
        ...prev,
        { role: "user", content: question },
        { role: "assistant", content: "", streaming: true },
      ]);

      const ac = new AbortController();
      abort.current = ac;

      void (async () => {
        try {
          const resp = await fetch("/api/deebo", {
            method: "POST",
            signal: ac.signal,
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              message: question,
              history,
              conversationId: convId.current,
              turnstileToken,
              path: window.location.pathname,
            }),
          });

          if (!resp.ok || !resp.body) {
            const j = (await resp.json().catch(() => null)) as { message?: string } | null;
            throw new Error(j?.message ?? "تعذّر الوصول إلى ديبو الآن.");
          }

          const reader = resp.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let got = false;

          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let nl: number;
            // السطرُ المكتمل وحده يُحلَّل: الحزمةُ قد تنقطع في منتصف JSON
            while ((nl = buffer.indexOf("\n")) !== -1) {
              const raw = buffer.slice(0, nl).trim();
              buffer = buffer.slice(nl + 1);
              if (!raw) continue;
              let ev: { type: string; text?: string; message?: string; conversationId?: string };
              try {
                ev = JSON.parse(raw);
              } catch {
                continue;
              }
              if (ev.type === "meta" && ev.conversationId) {
                convId.current = ev.conversationId;
                // من هنا فصاعدًا يمرّ الطلبُ بلا رمز، فيُطوى الدرعُ ويُرفع القيدُ عن الإرسال.
                setShielded(false);
              } else if (ev.type === "text" && ev.text) {
                got = true;
                const piece = ev.text;
                apply((prev) => {
                  const next = [...prev];
                  const last = next[next.length - 1];
                  if (last?.role === "assistant") {
                    next[next.length - 1] = { ...last, content: last.content + piece };
                  }
                  return next;
                });
              } else if (ev.type === "error") {
                throw new Error(ev.message ?? "تعذّر الجواب.");
              }
            }
          }

          // بثٌّ انتهى بلا حرف: عطبٌ صامتٌ لا يُترك فقاعةً فارغة
          if (!got) throw new Error("لم يصل جواب. أعد المحاولة.");
          apply((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.role === "assistant") next[next.length - 1] = { ...last, streaming: false };
            return next;
          });
        } catch (e) {
          // **القطعُ بيد الزائر ليس عطبًا**: لا رسالةَ تُقال، ولا سقطةَ تُحسَب فيُعاد ضبطُ
          // الدرع، وما وصل من الجواب يبقى دورًا تامًّا. وإنّما تُنزَع الفقاعةُ إن كانت خواءً.
          if (ac.signal.aborted) {
            apply((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last?.role === "assistant") {
                if (last.content) next[next.length - 1] = { ...last, streaming: false };
                else next.pop();
              }
              return next;
            });
            return;
          }
          setError(e instanceof Error ? e.message : "تعذّر الجواب.");
          setFailures((n) => n + 1);
          // تُزال الفقاعةُ الفارغة: الخطأُ يُقال في موضعه ولا يُترك خواءٌ مكانَ الجواب
          apply((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.role === "assistant" && !last.content) next.pop();
            return next;
          });
        } finally {
          // لا يُمحى حاكمٌ غيرُ حاكمِنا: إرسالٌ تالٍ قد يكون بدأ بعد قطعِ هذا.
          if (abort.current === ac) abort.current = null;
          sending.current = false;
          setBusy(false);
          finish.current?.();
        }
      })();
    },
    [apply, turnstileToken],
  );

  return { turns: restored, busy, error, shielded, failures, send, stop, reset, adopt };
}
