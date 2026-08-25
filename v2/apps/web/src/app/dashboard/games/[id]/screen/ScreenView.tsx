"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Badge, Button, SectionCard, WordBoard } from "@adeeb/design-system";
import { CornersOut, Trophy, UsersThree } from "@phosphor-icons/react";
import { QrPreview } from "../../../tools/qr/QrToolView";
import { defaultQrSpec } from "../../../tools/qr/defaults";
import { qrSvg } from "@/lib/qr";
import { useGameChannel } from "@/lib/games/useGameChannel";
import { useServerClock } from "@/lib/games/useServerClock";
import { PageHeader } from "../../../_components/PageHeader";
import { BOARD_ICONS } from "../../boardIcons";
import { roomPath, roundRemainingMs, roundState } from "../../vocab";
import type { HostSnapshot } from "../../data";

/**
 * **شاشةُ العرض** — ما يراه الحاضرون على البروجكتر.
 *
 * وهي **لا تفعل شيئًا**: لا زرَّ فيها ولا حكمَ ولا إدارة. تعرض ثلاثةً بترتيب الحاجة
 * إليها: بابَ الدخول ما دام الناسُ يدخلون، والكلمةَ ما دامت جولةٌ مفتوحة، ولوحَ
 * النتائج حين تنتهي.
 *
 * **وملءُ الشاشة زرٌّ لا مسارٌ منفصل:** الغرفةُ مقفولةٌ بقدرتها، ومسارٌ خارج اللوحة
 * يعني قفلًا ثانيًا يُصان. والزرُّ يُغطّي هيكلَ اللوحة كلَّه (`requestFullscreen` على
 * الغلاف)، فيبقى القفلُ واحدًا ويختفي ما لا يخصّ القاعة.
 */
export function ScreenView({ initial, origin }: { initial: HostSnapshot; origin: string }) {
  const [snap, setSnap] = useState(initial);
  const stage = useRef<HTMLDivElement>(null);
  const { room, words, players } = snap;

  const refresh = useCallback(async () => {
    const { refreshHostSnapshot } = await import("../../actions");
    const r = await refreshHostSnapshot(room.id);
    if (r.snapshot) setSnap(r.snapshot);
  }, [room.id]);

  const scope = `session_id=eq.${room.id}`;
  useGameChannel({
    name: `gw:screen:${room.id}`,
    live: room.status !== "finished",
    onChange: refresh,
    // الشاشةُ لا تعرض الإجاباتِ أبدًا، فلا تشترك في جدولها: من قرأ سطرَ من سبقه نسخه،
    // وشاشةُ القاعة يراها اللاعبون كلُّهم.
    watch: useMemo(
      () => [
        { table: "guess_word_sessions" as const, event: "UPDATE" as const, filter: `id=eq.${room.id}` },
        { table: "guess_word_words" as const, event: "*" as const, filter: scope },
        { table: "guess_word_players" as const, event: "*" as const, filter: scope },
      ],
      [room.id, scope]
    ),
  });

  const current = words.find((w) => w.id === room.currentWordId) ?? null;
  const state = current ? roundState(current) : "pending";
  const now = useServerClock(snap.serverNow, state === "running");
  const remaining = current ? roundRemainingMs(current, room.secondsPerWord, now) : 0;
  const winnerName = current?.winnerPlayerId
    ? (players.find((p) => p.id === current.winnerPlayerId)?.name ?? null)
    : null;

  const joinUrl = `${origin}${roomPath(room.code)}`;

  const qr = useMemo(() => {
    if (!joinUrl) return null;
    try {
      return qrSvg({ ...defaultQrSpec(joinUrl), size: 640 });
    } catch {
      return null;
    }
  }, [joinUrl]);

  /** المُخرَجون خارج اللوح: أُخرِج فلا يُعرَض اسمُه على الحائط. */
  const board = players
    .filter((p) => !p.isKicked)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "ar"));

  const goFullscreen = () => void stage.current?.requestFullscreen?.().catch(() => {});

  return (
    <>
      <PageHeader
        title="شاشةُ العرض"
        crumbLeaf="شاشةُ العرض"
        parent={{ label: room.title, href: `/dashboard/games/${room.id}` }}
        action={{ label: "ملءُ الشاشة", icon: <CornersOut size={18} />, onClick: goFullscreen }}
      />

      {/* الغلافُ هو ما يملأ الشاشة، فيغيب معه هيكلُ اللوحة كلُّه.
          و`bg-surface` صريحةٌ لأنّ ملءَ الشاشة يرسم أرضًا سوداء تحت ما لا خلفيّةَ له. */}
      <div ref={stage} className="bg-surface">
        <WordBoard
          icons={BOARD_ICONS}
          word={current?.word ?? null}
          meta={current ? `الجولة ${current.position + 1} من ${words.length}` : room.title}
          state={state === "pending" ? "idle" : state}
          remainingMs={remaining}
          totalMs={room.secondsPerWord * 1000}
          winnerName={winnerName}
          idleText={room.status === "finished" ? "انتهت اللعبة" : "استعدّوا"}
        />

        {/* بابُ الدخول يبقى معروضًا ما لم تنتهِ اللعبة: المتأخّرُ في قاعةٍ حقيقيّةٍ يلحق. */}
        {room.status === "finished" ? null : (
          <SectionCard headerVariant="chip" icon={<UsersThree />} title="للانضمام">
            <div className="flex flex-wrap items-center justify-center gap-6">
              {qr ? <QrPreview svg={qr} max={200} /> : null}
              <div className="text-center">
                <p className="gwrd-word lat" dir="ltr" style={{ fontSize: "clamp(2rem, 6vw, 5rem)" }}>
                  {room.code}
                </p>
                <p className="txt lat mt-2" dir="ltr">
                  {joinUrl}
                </p>
              </div>
            </div>
          </SectionCard>
        )}

        <SectionCard
          headerVariant="chip"
          icon={<Trophy />}
          title="لوحُ النتائج"
          actions={<Badge tone="neutral">{board.length}</Badge>}
        >
          {board.length === 0 ? (
            <p className="txt text-content-muted">لم ينضمّ أحدٌ بعد.</p>
          ) : (
            <ol className="flex flex-wrap items-center gap-2">
              {board.map((p, i) => (
                <li key={p.id}>
                  <Badge tone={i === 0 && p.score > 0 ? "success" : "neutral"}>
                    {p.name} <span className="lat" dir="ltr">{p.score}</span>
                  </Badge>
                </li>
              ))}
            </ol>
          )}
        </SectionCard>

        {/* زرٌّ ثانٍ في ذيل الغلاف: في ملء الشاشة يغيب الرأسُ وزرُّه، فيلزم مخرجٌ مرئيّ.
            والخروجُ بـESC قائمٌ دائمًا، وهذا لمن لا يعرفه. */}
        <div className="mt-4 flex justify-center">
          <Button variant="ghost" onClick={() => void document.exitFullscreen?.().catch(() => {})}>
            خروجٌ من ملء الشاشة
          </Button>
        </div>
      </div>
    </>
  );
}
