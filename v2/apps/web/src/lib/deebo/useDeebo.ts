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

import { useCallback, useRef, useState } from "react";
import { GREETING } from "./persona";

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
  greeting: string;
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
  reset: () => void;
};

/** كم رسالةً سابقةً تُرسل مع السؤال. يطابق سقف المِنفذ، وهو يقصّ ثانيةً احتياطًا. */
const HISTORY = 6;

export function useDeebo(turnstileToken: string | null): DeeboState {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const convId = useRef<string | null>(null);
  // حالةٌ لا مرجعٌ وحده: الشاشةُ تبني عليها بقاءَ الدرع، والمرجعُ لا يُعيد رسمًا.
  const [shielded, setShielded] = useState(true);
  const [failures, setFailures] = useState(0);

  /**
   * مرآةٌ مرجعيّة للرسائل.
   *
   * ليست ترفًا: قراءةُ التاريخ من داخل مُحدِّث `setState` تُغري بوضع نداء الشبكة
   * هناك، ومُحدِّثُ الحالة **يُنادى مرّتين** في وضع React الصارم — فيُرسل سؤالان
   * ويُحاسَب الرصيدُ مرّتين. فالمرآةُ تُقرأ خارج الرسم، والأثرُ يبقى حيث يجب.
   */
  const ref = useRef<Turn[]>([]);
  const apply = useCallback((f: (prev: Turn[]) => Turn[]) => {
    ref.current = f(ref.current);
    setTurns(ref.current);
  }, []);

  // قفلٌ فوريّ: `busy` حالةٌ لا تُحدَّث إلّا في الرسم التالي، فضغطتان متلاحقتان
  // تمرّان كلتاهما. والمرجعُ يُكتب في اللحظة.
  const sending = useRef(false);

  const reset = useCallback(() => {
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

      void (async () => {
        try {
          const resp = await fetch("/api/deebo", {
            method: "POST",
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
          sending.current = false;
          setBusy(false);
        }
      })();
    },
    [apply, turnstileToken],
  );

  return { turns, busy, error, greeting: GREETING, shielded, failures, send, reset };
}
