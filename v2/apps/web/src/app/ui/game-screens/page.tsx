"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Button, Container, Segmented, WordBoard, type WordBoardState } from "@adeeb/design-system";
import { Pause, Play, Trophy } from "@phosphor-icons/react";
// المستثنَون من الوزن المزدوج يُستوردون من بيتهم الواحد لا من Phosphor (حارسُ الأوزان).
import { ArrowsClockwise } from "@/app/_components/glyphs";
import { BOARD_ICONS } from "../../dashboard/games/boardIcons";

/**
 * **مختبرُ لوح الكلمة.**
 *
 * الهيئةُ أُقِرّت (سطحٌ مؤطَّر) وأُعدمت أختُها، فلم يبقَ للمعرض أن يقارن. صار يفعل ما
 * هو أنفع: **يُشغّل اللوحَ حيًّا** — جولةٌ تجري بعدٍّ حقيقيّ، تُوقَف وتُستأنف وتُعاد،
 * فيُرى تحوّلُ النغمة والأيقونة والمضمار كما يراه الحاضرون في القاعة لا كما يُوصَف.
 *
 * وهو معرضٌ لا شاشةَ إنتاج: العدُّ هنا محلّيٌّ بـ`Date.now`، وفي الإنتاج يُعايَر
 * بساعة الخادم (`useServerClock`) لأنّ ساعةَ الجهاز تفارق ساعةَ العالم.
 */

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-6">
      <h2 className="mb-6 font-display text-2xl font-black text-content">{title}</h2>
      {children}
    </section>
  );
}

function Lab({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 font-latin text-xs font-bold text-content-muted">{children}</p>;
}

const WORDS = ["سَحاب", "استقلاليّة", "الاستشراقُ المعاصر"];
const TOTAL = 30_000;

export default function GameScreensPage() {
  /* ── جولةٌ تجري حقًّا ─────────────────────────────────────────────────────── */
  const [state, setState] = useState<WordBoardState>("idle");
  const [wordIndex, setWordIndex] = useState(0);
  const [remaining, setRemaining] = useState(TOTAL);
  const endsAt = useRef(0);

  // النبضةُ في المؤقّت لا في جسم الأثر: ضبطُ حالةٍ مباشرةً في الأثر يُطلق رسمًا متتاليًا.
  useEffect(() => {
    if (state !== "running") return;
    const id = setInterval(() => {
      const left = endsAt.current - Date.now();
      setRemaining(left > 0 ? left : 0);
      if (left <= 0) setState("ended");
    }, 200);
    return () => clearInterval(id);
  }, [state]);

  const start = () => {
    endsAt.current = Date.now() + TOTAL;
    setRemaining(TOTAL);
    setState("running");
  };
  const pause = () => {
    setRemaining(Math.max(0, endsAt.current - Date.now()));
    setState("paused");
  };
  const resume = () => {
    endsAt.current = Date.now() + remaining;
    setState("running");
  };
  const replay = () => {
    setWordIndex((i) => (i + 1) % WORDS.length);
    setRemaining(TOTAL);
    setState("idle");
  };
  /** يقفز إلى آخر عشرِ ثوانٍ — الحالُ الحمراءُ لا تُنتظَر عشرين ثانيةً لتُرى. */
  const rush = () => {
    endsAt.current = Date.now() + 9_000;
    setRemaining(9_000);
    setState("running");
  };

  const live = {
    word: state === "idle" ? null : WORDS[wordIndex],
    meta: state === "idle" ? undefined : `الجولة ${wordIndex + 1} من ${WORDS.length}`,
    state,
    remainingMs: remaining,
    totalMs: TOTAL,
    winnerName: state === "ended" ? "محمّد" : null,
  };

  /* ── الحالاتُ الأربع ساكنةً، للمقارنة جنبًا إلى جنب ──────────────────────── */
  const [frozen, setFrozen] = useState<WordBoardState>("running");
  const frozenProps = {
    word: frozen === "idle" ? null : "سَحاب",
    meta: frozen === "idle" ? undefined : "الجولة ٣ من ١٠",
    state: frozen,
    remainingMs: frozen === "paused" ? 21_000 : 24_000,
    totalMs: 60_000,
    winnerName: frozen === "ended" ? "محمّد" : null,
  };

  return (
    <Container className="py-10">
      <h1 className="font-display text-3xl font-black text-content">لوحُ الكلمة</h1>
      <p className="mt-2 text-content-muted">
        هيئةٌ واحدة مُقَرّة. شغّلها وانظر كيف تتحوّل.
      </p>

      <Alert className="mt-6" tone="info" title="الحالُ تُقال بثلاثةٍ لا بلونٍ وحده">
        نغمةُ السطح والحدّ، وأيقونةٌ تسمّي الحال، ونصٌّ يقولها لقارئ الشاشة. فمن لا يميّز
        الأحمرَ من الأصفر يقرأ الأيقونةَ والرقم. وفي آخر عشرِ ثوانٍ تحمرّ اللوحةُ وتنبض
        أيقونةُ الساعة وحدها: الرقمُ يُقرأ، والنبضُ يُرى.
      </Alert>

      <div className="mt-12 space-y-14">
        <Sec title="جولةٌ حيّة">
          <Lab>ثلاثون ثانية، والعدُّ محلّيٌّ في المعرض وبساعة الخادم في الإنتاج</Lab>

          <div className="flex flex-wrap items-center gap-2">
            {state === "running" ? (
              <Button variant="warning" onClick={pause}>
                <Pause size={18} />
                أوقِف
              </Button>
            ) : state === "paused" ? (
              <Button onClick={resume}>
                <Play size={18} />
                استأنف
              </Button>
            ) : (
              <Button onClick={start}>
                <Play size={18} />
                ابدأ الجولة
              </Button>
            )}
            <Button variant="ghost-danger" onClick={rush} disabled={state === "ended"}>
              اقفز لآخر عشرِ ثوانٍ
            </Button>
            <Button variant="ghost-success" onClick={() => setState("ended")} disabled={state === "idle"}>
              <Trophy size={18} />
              أعلِن الفائز
            </Button>
            <Button variant="ghost" onClick={replay}>
              <ArrowsClockwise size={18} />
              أعِد بكلمةٍ أخرى
            </Button>
          </div>

          <div className="mt-6">
            <WordBoard {...live} icons={BOARD_ICONS} idleText="اضغط «ابدأ الجولة»" />
          </div>
        </Sec>

        <Sec title="الحالاتُ الأربع">
          <Lab>ساكنةً، للنظر في الفروق</Lab>
          <Segmented
            aria-label="حالُ الجولة"
            value={frozen}
            onValueChange={(v) => setFrozen(v as WordBoardState)}
            items={[
              { value: "idle", label: "لا جولة" },
              { value: "running", label: "جارية" },
              { value: "paused", label: "موقوفة" },
              { value: "ended", label: "انتهت" },
            ]}
          />
          <div className="mt-4">
            <WordBoard {...frozenProps} icons={BOARD_ICONS} />
          </div>
        </Sec>

        <Sec title="المقاس يتبع الحاوية لا الشاشة">
          <Lab>القياسُ بـcontainer-type، فالمعاينةُ هنا صادقة</Lab>
          <div className="flex flex-wrap items-start gap-6">
            <div style={{ width: 375, maxWidth: "100%" }}>
              <Lab>٣٧٥px — كفّ اللاعب</Lab>
              <WordBoard {...frozenProps} icons={BOARD_ICONS} />
            </div>
            <div className="min-w-0 flex-1" style={{ minWidth: 280 }}>
              <Lab>ما اتّسع — بروجكتر القاعة</Lab>
              <WordBoard {...frozenProps} icons={BOARD_ICONS} />
            </div>
          </div>
        </Sec>

        <Sec title="الكلمةُ الطويلة تلتفّ ولا تفيض">
          <div className="grid gap-6 md:grid-cols-3">
            {WORDS.map((w) => (
              <WordBoard key={w} icons={BOARD_ICONS} word={w} meta="الجولة ١ من ٣" state="running" remainingMs={24_000} totalMs={60_000} />
            ))}
          </div>
        </Sec>
      </div>
    </Container>
  );
}
