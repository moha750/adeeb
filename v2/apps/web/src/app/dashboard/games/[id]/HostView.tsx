"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Badge,
  Button,
  IconButton,
  SectionCard,
  Stat,
  WordBoard,
} from "@adeeb/design-system";
import { Copy, Pause, Play, Timer, Trophy, UserMinus, UserPlus, UsersThree } from "@phosphor-icons/react";
import { ArrowClockwise, Check, Eye } from "@/app/_components/glyphs";
import { IconGame } from "../../_shell/icons";
import { BOARD_ICONS } from "../boardIcons";
import { ConfirmDialog } from "../../_components/ConfirmDialog";
import { EmptyState } from "../../_components/EmptyState";
import { useToast } from "../../_components/ToastProvider";
import { PageHeader } from "../../_components/PageHeader";
import { DataTable, type Column } from "../../_components/DataTable";
import { QrPreview } from "../../tools/qr/QrToolView";
import { defaultQrSpec } from "../../tools/qr/defaults";
import { qrSvg } from "@/lib/qr";
import { useGameChannel } from "@/lib/games/useGameChannel";
import { useServerClock } from "@/lib/games/useServerClock";
import {
  ROOM_STATUS_META,
  ROUND_STATE_META,
  roomPath,
  roundRemainingMs,
  roundState,
} from "../vocab";
import type { HostAnswer, HostSnapshot, HostWord } from "../data";
import {
  closeRoom,
  endRound,
  kickPlayer,
  pauseRound,
  pickWinner,
  replayRound,
  restorePlayer,
  resumeRound,
  startRound,
} from "../actions";

/**
 * **مِقوَدُ المضيف** — الشاشةُ التي يقف بها أمام الناس، فتُقاس على ٣٧٥px لا على حاسوب:
 * ٢٣٠ عضوًا من ٢٩١ لم يفتحوا اللوحة من حاسوبٍ قطّ.
 *
 * وترتيبُها ترتيبُ نظره أثناء الحفل: **الجولةُ الجارية أوّلًا** (الكلمةُ والعدُّ
 * والأزرار)، ثمّ **الإجاباتُ الواصلةُ لحظةً بلحظة** وهي موضعُ حكمه، ثمّ ما يُرجَع إليه
 * بين الجولات (الرمزُ · قائمةُ الجولات · اللاعبون). ولا تبويباتٍ تُخفي الإجاباتِ عن
 * عينه وهو يحكم.
 */
export function HostView({ initial, origin }: { initial: HostSnapshot; origin: string }) {
  const toast = useToast();
  const router = useRouter();
  const [snap, setSnap] = useState(initial);
  const [pending, startPending] = useTransition();
  const [confirmReplay, setConfirmReplay] = useState<HostWord | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [copied, setCopied] = useState(false);

  const { room, words, players, answers } = snap;

  /* ── القراءةُ الحيّة ─────────────────────────────────────────────────────── */

  const refresh = useCallback(async () => {
    const { refreshHostSnapshot } = await import("../actions");
    const r = await refreshHostSnapshot(room.id);
    if (r.snapshot) setSnap(r.snapshot);
  }, [room.id]);

  const scope = `session_id=eq.${room.id}`;
  useGameChannel({
    name: `gw:host:${room.id}`,
    live: room.status !== "finished",
    onChange: refresh,
    watch: useMemo(
      () => [
        { table: "guess_word_sessions" as const, event: "UPDATE" as const, filter: `id=eq.${room.id}` },
        { table: "guess_word_words" as const, event: "*" as const, filter: scope },
        { table: "guess_word_players" as const, event: "*" as const, filter: scope },
        // الإجاباتُ لا تحمل `session_id` فلا مرشِّحَ خادميّ لها؛ يصل حدثُها ثمّ تُقرأ
        // اللقطةُ المحصورةُ بالغرفة، فما لغرفةٍ أخرى لا يُرى ولا يُخزَّن.
        { table: "guess_word_answers" as const, event: "INSERT" as const },
      ],
      [room.id, scope]
    ),
  });

  /* ── الجولةُ الجارية ─────────────────────────────────────────────────────── */

  const current = words.find((w) => w.id === room.currentWordId) ?? null;
  const state = current ? roundState(current) : "pending";
  const ticking = state === "running";
  const now = useServerClock(snap.serverNow, ticking);
  const remaining = current ? roundRemainingMs(current, room.secondsPerWord, now) : 0;

  /** أوّلُ جولةٍ لم تُلعَب — زرُّ «ابدأ» يعرف بنفسه أيَّها التالية. */
  const nextWord = words.find((w) => !w.startedAt && !w.endedAt) ?? null;
  const playedCount = words.filter((w) => w.endedAt).length;

  const winnerName = current?.winnerPlayerId
    ? (players.find((p) => p.id === current.winnerPlayerId)?.name ?? null)
    : null;

  const run = (fn: () => Promise<{ ok: boolean; message: string }>) =>
    startPending(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(r.message);
        await refresh();
      } else toast.error(r.message);
    });

  /* ── رابطُ الانضمام ورمزُه ───────────────────────────────────────────────── */

  // الأصلُ يصل من الخادم مقروءًا من ترويسة الطلب (`lib/games/origin`): لا حالةَ
  // تُضبَط في أثر، ولا رمزٌ يُرسَم فارغًا ثمّ يظهر.
  const joinUrl = `${origin}${roomPath(room.code)}`;

  const qr = useMemo(() => {
    if (!joinUrl) return null;
    try {
      return qrSvg({ ...defaultQrSpec(joinUrl), size: 640 });
    } catch {
      return null;
    }
  }, [joinUrl]);

  const copy = () => {
    if (!joinUrl) return;
    void navigator.clipboard.writeText(joinUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };

  /* ── جداولُ الشاشة ───────────────────────────────────────────────────────── */

  const answerColumns: Column<HostAnswer>[] = [
    {
      key: "rank",
      header: "#",
      width: "44px",
      align: "center",
      render: (_a, i) => <span className="txt num">{i + 1}</span>,
    },
    {
      key: "player",
      header: "اللاعب",
      width: "minmax(120px, 1.2fr)",
      render: (a) => <span className="txt">{a.playerName}</span>,
    },
    {
      // نصٌّ حرُّ الطول: `auto` + `wrap` وإلّا دفع الشبكةَ إلى أطول جملةٍ فجرّ الجدولَ
      // أفقيًّا على ٣٧٥px (درسُ سجلّ ديبو ٢٠٢٦-٠٨-٢٢).
      key: "answer",
      header: "الإجابة",
      width: "auto",
      wrap: true,
      render: (a) => <span className="txt">{a.answer}</span>,
    },
    {
      key: "ms",
      header: "الزمن",
      width: "92px",
      render: (a) => (
        <span className="txt lat" dir="ltr">
          {(a.responseMs / 1000).toFixed(1)}s
        </span>
      ),
    },
    {
      key: "pick",
      header: "الحكم",
      width: "132px",
      render: (a) =>
        current?.winnerPlayerId === a.playerId ? (
          <Badge tone="success" dot>
            الفائز
          </Badge>
        ) : (
          <Button
            size="sm"
            variant="ghost-success"
            disabled={pending || !current}
            onClick={() => current && run(() => pickWinner(current.id, a.playerId))}
          >
            <Trophy size={16} />
            فائز
          </Button>
        ),
    },
  ];

  const roundColumns: Column<HostWord>[] = [
    {
      key: "pos",
      header: "#",
      width: "44px",
      align: "center",
      render: (w) => <span className="txt num">{w.position + 1}</span>,
    },
    {
      key: "word",
      header: "الكلمة",
      width: "auto",
      wrap: true,
      render: (w) => <span className="txt">{w.word}</span>,
    },
    {
      key: "state",
      header: "الحال",
      width: "112px",
      render: (w) => {
        const s = w.id === room.currentWordId ? roundState(w) : w.endedAt ? "ended" : "pending";
        return (
          <Badge tone={ROUND_STATE_META[s].tone} dot>
            {ROUND_STATE_META[s].label}
          </Badge>
        );
      },
    },
    {
      key: "winner",
      header: "الفائز",
      width: "minmax(110px, 1fr)",
      render: (w) => {
        const name = players.find((p) => p.id === w.winnerPlayerId)?.name;
        return name ? <span className="txt">{name}</span> : null;
      },
    },
    {
      key: "act",
      header: "الفعل",
      width: "132px",
      render: (w) =>
        w.startedAt || w.endedAt ? (
          <Button
            size="sm"
            variant="ghost-warning"
            disabled={pending || w.id === room.currentWordId}
            onClick={() => setConfirmReplay(w)}
          >
            <ArrowClockwise size={16} />
            أعِد
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            disabled={pending || room.status === "finished"}
            onClick={() => run(() => startRound(room.id, w.id))}
          >
            <Play size={16} />
            ابدأ
          </Button>
        ),
    },
  ];

  const playerColumns: Column<(typeof players)[number]>[] = [
    {
      key: "name",
      header: "اللاعب",
      width: "auto",
      wrap: true,
      render: (p) => (
        <span className="txt">
          {p.name}
          {p.isKicked ? (
            <span className="mr-2">
              <Badge tone="danger" dot>
                مُخرَج
              </Badge>
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: "score",
      header: "النقاط",
      width: "92px",
      icon: <Trophy />,
      render: (p) => <span className="txt num">{p.score}</span>,
    },
    {
      key: "act",
      header: "الفعل",
      width: "132px",
      render: (p) =>
        p.isKicked ? (
          <Button
            size="sm"
            variant="ghost-success"
            disabled={pending}
            onClick={() => run(() => restorePlayer(p.id))}
          >
            <UserPlus size={16} />
            أرجِعه
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost-danger"
            disabled={pending}
            onClick={() => run(() => kickPlayer(p.id))}
          >
            <UserMinus size={16} />
            أخرِجه
          </Button>
        ),
    },
  ];

  const inRoom = players.filter((p) => !p.isKicked);

  return (
    <>
      <PageHeader
        title={room.title}
        crumbLeaf={room.title}
        status={{
          label: ROOM_STATUS_META[room.status].label,
          tone: room.status === "active" ? "success" : room.status === "waiting" ? "warning" : "neutral",
          live: room.status === "active",
        }}
        action={{
          label: "شاشةُ العرض",
          icon: <Eye size={18} />,
          href: `/dashboard/games/${room.id}/screen`,
        }}
        menu={
          room.status === "finished"
            ? undefined
            : [
                {
                  header: "الختام",
                  items: [
                    { label: "إنهاءُ اللعبة", icon: <Timer />, onSelect: () => setConfirmClose(true) },
                  ],
                },
              ]
        }
      />

      {/* ── الجولةُ الجارية: الكلمةُ والعدُّ والأزرار ── */}
      <SectionCard
        headerVariant="chip"
        icon={<IconGame />}
        title="الجولة"
        actions={
          <Badge tone="neutral">
            <span className="lat" dir="ltr">
              {playedCount}/{words.length}
            </span>
          </Badge>
        }
      >
        <WordBoard
          icons={BOARD_ICONS}
          word={current?.word ?? null}
          meta={current ? `الجولة ${current.position + 1} من ${words.length}` : undefined}
          state={state === "pending" ? "idle" : state}
          remainingMs={remaining}
          totalMs={room.secondsPerWord * 1000}
          winnerName={winnerName}
          idleText={
            room.status === "finished"
              ? "انتهت اللعبة"
              : nextWord
                ? "اضغط «ابدأ الجولة»"
                : "لم تبقَ جولة"
          }
        />

        {/* المعنى للمضيف وحدَه: مرجعُه وهو يحكم على جوابٍ أصاب المعنى وأخطأ الحرف.
            ولا يُعرَض إلّا وجولةٌ مفتوحة، فلا يُقرأ من فوق كتفه قبل أوانه. */}
        {current?.hint ? (
          <Alert className="mt-4" tone="neutral" title="المعنى (لك وحدك)" compact>
            {current.hint}
          </Alert>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {!current ? (
            <Button
              disabled={pending || !nextWord || room.status === "finished"}
              loading={pending}
              onClick={() => nextWord && run(() => startRound(room.id, nextWord.id))}
            >
              <Play size={18} />
              ابدأ الجولة
            </Button>
          ) : (
            <>
              {state === "paused" ? (
                <Button disabled={pending} onClick={() => run(() => resumeRound(room.id))}>
                  <Play size={18} />
                  استأنف
                </Button>
              ) : (
                <Button variant="warning" disabled={pending} onClick={() => run(() => pauseRound(room.id))}>
                  <Pause size={18} />
                  أوقِف
                </Button>
              )}
              <Button variant="neutral" disabled={pending} onClick={() => run(() => endRound(room.id))}>
                <Check size={18} />
                أنهِ الجولة
              </Button>
              <Button
                variant="ghost-warning"
                disabled={pending}
                onClick={() => setConfirmReplay(current)}
              >
                <ArrowClockwise size={18} />
                أعِد الجولة
              </Button>
              <Button
                variant="ghost"
                disabled={pending || !current.winnerPlayerId}
                onClick={() => run(() => pickWinner(current.id, null))}
              >
                بلا فائز
              </Button>
            </>
          )}
        </div>
      </SectionCard>

      {/* ── الإجاباتُ الواصلة ── */}
      <SectionCard
        headerVariant="chip"
        icon={<Trophy />}
        title="الإجابات"
        actions={<Badge tone="neutral">{answers.length}</Badge>}
      >
        {current ? (
          <DataTable
            columns={answerColumns}
            rows={answers}
            getRowId={(a) => a.id}
            emptyState={
              <EmptyState
                icon={<Trophy />}
                title="لا إجابةَ بعد"
                description="ستظهر هنا لحظةَ إرسالها، مرتَّبةً بالأسرع."
              />
            }
          />
        ) : (
          <Alert tone="info" title="لا جولةَ مفتوحة">
            ابدأ جولةً ليُفتَح حقلُ الإجابة عند اللاعبين.
          </Alert>
        )}
      </SectionCard>

      {/* ── الرمزُ والباركود ── */}
      {room.status === "finished" ? null : (
        <SectionCard headerVariant="chip" icon={<IconGame />} title="بابُ الدخول">
          <div className="flex flex-wrap items-center gap-4">
            {qr ? <QrPreview svg={qr} max={220} /> : null}
            <div>
              <p className="text-sm text-content-muted">امسح الرمز أو اكتبه في الموقع</p>
              <p className="gwrd-clock lat" dir="ltr">
                {room.code}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="txt lat" dir="ltr">
                  {joinUrl}
                </span>
                <IconButton aria-label="نسخُ الرابط" onClick={copy}>
                  {copied ? <Check /> : <Copy />}
                </IconButton>
              </div>
            </div>
          </div>
        </SectionCard>
      )}

      {/* ── اللاعبون ── */}
      <SectionCard
        headerVariant="chip"
        icon={<UsersThree />}
        title="اللاعبون"
        actions={<Badge tone="neutral">{inRoom.length}</Badge>}
      >
        <div className="stat-grid" style={{ marginBottom: 14 }}>
          <Stat icon={<UsersThree />} value={inRoom.length} label="في الغرفة" />
          <Stat icon={<UserMinus />} value={players.length - inRoom.length} label="مُخرَجون" />
        </div>
        <DataTable
          columns={playerColumns}
          rows={players}
          getRowId={(p) => p.id}
          rowTone={(p) => (p.isKicked ? "danger" : undefined)}
          emptyState={
            <EmptyState
              icon={<UsersThree />}
              title="لم ينضمّ أحدٌ بعد"
              description="اعرض الرمزَ على الحاضرين، فمن مسحه ظهر هنا في لحظته."
            />
          }
        />
      </SectionCard>

      {/* ── قائمةُ الجولات ── */}
      <SectionCard headerVariant="chip" icon={<Timer />} title="الجولات">
        <DataTable columns={roundColumns} rows={words} getRowId={(w) => w.id} />
      </SectionCard>

      <ConfirmDialog
        open={confirmReplay !== null}
        onClose={() => setConfirmReplay(null)}
        tone="warning"
        icon={<ArrowClockwise />}
        title="إعادةُ الجولة؟"
        text={
          confirmReplay
            ? `ستُحذف إجاباتُ «${confirmReplay.word}» كلُّها${
                confirmReplay.winnerPlayerId ? " وتُنقَض نقطةُ فائزها" : ""
              }، وتعود كأن لم تبدأ.`
            : undefined
        }
        confirmLabel="أعِد"
        loading={pending}
        onConfirm={() => {
          if (!confirmReplay) return;
          const w = confirmReplay;
          startPending(async () => {
            const r = await replayRound(w.id);
            if (r.ok) {
              toast.success(r.message);
              setConfirmReplay(null);
              await refresh();
            } else toast.error(r.message);
          });
        }}
      />

      <ConfirmDialog
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        tone="warning"
        icon={<Timer />}
        title="إنهاءُ اللعبة؟"
        text="ستُغلَق الغرفةُ فلا ينضمّ إليها أحدٌ ولا تُفتَح جولةٌ فيها، ويُكشَف للجميع ما لُعِب."
        confirmLabel="إنهاء"
        loading={pending}
        onConfirm={() =>
          startPending(async () => {
            const r = await closeRoom(room.id);
            if (r.ok) {
              toast.success(r.message);
              setConfirmClose(false);
              router.refresh();
              await refresh();
            } else toast.error(r.message);
          })
        }
      />
    </>
  );
}
