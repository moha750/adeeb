"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  Container,
  Field,
  WordBoard,
} from "@adeeb/design-system";
import { PaperPlaneTilt, TextAa, Trophy, UserCircle } from "@phosphor-icons/react";
import { Check } from "@/app/_components/glyphs";
import { TurnstileWidget } from "@/app/_components/Turnstile";
import { useGameChannel } from "@/lib/games/useGameChannel";
import { useServerClock } from "@/lib/games/useServerClock";
import { LIMITS, roundRemainingMs, roundState } from "@/app/dashboard/games/vocab";
import { BOARD_ICONS } from "@/app/dashboard/games/boardIcons";
import { getPlayerState, joinRoom, submitAnswer, type PlayerState } from "./actions";

/**
 * **شاشةُ اللاعب** — تُقاس على ٣٧٥px وحدَها: من يفتحها يفتحها من جوّاله في قاعة.
 *
 * وحالتان في مكوّنٍ واحد: نموذجُ الاسم لمن لم ينضمّ بعد، وشاشةُ اللعب لمن انضمّ.
 * والانتقالُ بينهما بلا تنقّل، فلا ومضةَ صفحةٍ بيضاء في منتصف جولة.
 *
 * **ولا يصلها من الغرفة إلّا ما يخصّها:** لا تشترك في `guess_word_answers` ولا تقرؤها،
 * فمن فتح أدوات المتصفّح لم يجد إجابةَ جاره. والكلمةُ التالية لا تُبَثّ أصلًا —
 * `gw_words_select` لا تُخرج إلّا الجاريةَ (وما بعد نهاية اللعبة).
 */
export function PlayView({
  code,
  roomId,
  title,
  status,
  secondsPerWord,
  initial,
  siteKey,
}: {
  code: string;
  roomId: string;
  title: string;
  status: "waiting" | "active" | "finished";
  secondsPerWord: number;
  initial: PlayerState | null;
  siteKey: string | null;
}) {
  const [state, setState] = useState<PlayerState | null>(initial);
  const [joining, startJoin] = useTransition();
  const [sending, startSend] = useTransition();

  const [name, setName] = useState("");
  /**
   * **مسوّدةُ الإجابة موسومةٌ بجولتها** بدل أن تُمحى في أثر.
   *
   * الحقلُ يجب أن يُفرَّغ مع كلّ جولةٍ جديدة، وإلّا أرسل من ضغط «إرسال» مسرعًا كلامًا
   * عن كلمةٍ مضت. ومحوُها في `useEffect` ضبطُ حالةٍ يُطلق رسمًا ثانيًا بعد كلّ نبضة
   * (يمسكه `react-hooks`)؛ فتُشتقّ اشتقاقًا: ما لم تكن المسوّدةُ لهذه الجولة فهي فارغة.
   */
  const [draft, setDraft] = useState<{ wordId: string | null; text: string }>({
    wordId: null,
    text: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [tsToken, setTsToken] = useState<string | null>(null);
  const [tsReset, setTsReset] = useState(0);

  const refresh = useCallback(async () => {
    const next = await getPlayerState(code);
    if (next) setState(next);
  }, [code]);

  const roomStatus = state?.sessionStatus ?? status;

  useGameChannel({
    name: `gw:room:${roomId}`,
    live: roomStatus !== "finished",
    onChange: refresh,
    watch: useMemo(
      () => [
        { table: "guess_word_sessions" as const, event: "UPDATE" as const, filter: `id=eq.${roomId}` },
        { table: "guess_word_words" as const, event: "*" as const, filter: `session_id=eq.${roomId}` },
        { table: "guess_word_players" as const, event: "*" as const, filter: `session_id=eq.${roomId}` },
      ],
      [roomId]
    ),
  });

  const answer = draft.wordId === (state?.wordId ?? null) ? draft.text : "";
  const setAnswer = (text: string) => setDraft({ wordId: state?.wordId ?? null, text });

  const timing = state
    ? {
        startedAt: state.startedAt,
        endedAt: state.endedAt,
        pausedAt: state.pausedAt,
        pausedMs: state.pausedMs,
      }
    : null;
  const rstate = timing ? roundState(timing) : "pending";
  const now = useServerClock(state?.serverNow ?? null, rstate === "running");
  const remaining = timing ? roundRemainingMs(timing, state?.secondsPerWord ?? secondsPerWord, now) : 0;

  const join = () => {
    setError(null);
    startJoin(async () => {
      const r = await joinRoom(code, name, tsToken ?? undefined);
      if (r.ok) await refresh();
      else {
        setError(r.message);
        // الرمزُ يُستهلك مرّةً، فيُعاد ضبطُ الودجة كي تُتاح محاولةٌ ثانية.
        setTsToken(null);
        setTsReset((n) => n + 1);
      }
    });
  };

  const send = () => {
    setError(null);
    startSend(async () => {
      const r = await submitAnswer(code, answer);
      if (r.ok) await refresh();
      else setError(r.message);
    });
  };

  /* ── لم ينضمّ بعد ───────────────────────────────────────────────────────── */

  if (!state) {
    return (
      <Container className="py-10">
        <Card>
          <CardBody>
            <div className="form-grid">
              <h1 className="form-full">{title}</h1>
              {status === "finished" ? (
                <Alert className="form-full" tone="neutral" title="انتهت هذه اللعبة">
                  لم يعد بالإمكان الانضمام إليها.
                </Alert>
              ) : (
                <>
                  <p className="form-full text-content-muted">
                    اكتب اسمَك كما يعرفك به الحاضرون، فيراه المضيفُ حين تجيب.
                  </p>
                  <Field
                    className="form-full"
                    label="اسمُك"
                    icon={<UserCircle />}
                    innerIcon={<TextAa />}
                    placeholder="مثال: محمّد"
                    maxLength={LIMITS.nameMax}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && name.trim().length >= LIMITS.nameMin) join();
                    }}
                    error={error ?? undefined}
                    required
                    autoFocus
                  />
                  {siteKey ? (
                    <div className="form-full">
                      <TurnstileWidget siteKey={siteKey} onToken={setTsToken} resetSignal={tsReset} />
                    </div>
                  ) : null}
                  <div className="form-full">
                    <Button
                      onClick={join}
                      loading={joining}
                      disabled={name.trim().length < LIMITS.nameMin}
                    >
                      ادخل الغرفة
                    </Button>
                  </div>
                </>
              )}
            </div>
          </CardBody>
        </Card>
      </Container>
    );
  }

  /* ── أُخرِج من الغرفة ───────────────────────────────────────────────────── */

  if (state.kicked) {
    return (
      <Container className="py-10">
        <Alert tone="danger" title="أُخرِجتَ من هذه الغرفة">
          إن كان خطأً فأخبِر المضيف، فبإمكانه إرجاعُك بنقاطك كما كانت.
        </Alert>
      </Container>
    );
  }

  /* ── يلعب ───────────────────────────────────────────────────────────────── */

  const open =
    state.sessionStatus === "active" && rstate === "running" && !state.alreadyAnswered;

  return (
    <Container className="py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1>{title}</h1>
        <Badge tone="neutral">
          <Trophy size={14} /> {state.playerName} <span className="lat" dir="ltr">{state.playerScore}</span>
        </Badge>
      </div>

      <WordBoard
        icons={BOARD_ICONS}
        word={state.word}
        state={rstate === "pending" ? "idle" : rstate}
        remainingMs={remaining}
        totalMs={(state.secondsPerWord || secondsPerWord) * 1000}
        winnerName={state.winnerName}
        idleText={
          state.sessionStatus === "finished"
            ? "انتهت اللعبة"
            : state.sessionStatus === "waiting"
              ? "انتظر بدءَ اللعبة"
              : "انتظر الجولةَ القادمة"
        }
      />

      <div className="mt-4">
        {state.alreadyAnswered ? (
          <Alert tone="success" title="وصلت إجابتُك" icon={<Check />}>
            انتظر حكمَ المضيف. ولا تُرسَل إجابةٌ ثانيةٌ في الجولة نفسِها.
          </Alert>
        ) : rstate === "paused" ? (
          <Alert tone="warning" title="الجولةُ موقوفة">
            أوقفها المضيفُ مؤقّتًا، ويُفتح الحقلُ حين يستأنف.
          </Alert>
        ) : open ? (
          <div className="form-grid">
            <Field
              className="form-full"
              label="معنى الكلمة"
              icon={<TextAa />}
              innerIcon={<PaperPlaneTilt />}
              placeholder="اكتب المعنى كما تعرفه"
              maxLength={LIMITS.answerMax}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && answer.trim()) send();
              }}
              error={error ?? undefined}
              required
              autoFocus
            />
            <div className="form-full">
              <Button onClick={send} loading={sending} disabled={!answer.trim()}>
                <PaperPlaneTilt size={18} />
                إرسال
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </Container>
  );
}
