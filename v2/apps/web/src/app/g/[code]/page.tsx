import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdeebServiceClient } from "@adeeb/core";
import { isRoomCode } from "@/app/dashboard/games/vocab";
import { getPlayerState } from "./actions";
import { PlayView } from "./PlayView";

/**
 * **بابُ اللاعب.** مسارٌ واحدٌ بحالتين: من لا كوكيزَ له يرى نموذجَ الاسم، ومن انضمّ
 * يرى شاشةَ اللعب. وفصلُهما مسارين يعني رابطًا ثانيًا في الباركود ومسارًا يُخمَّن.
 *
 * ولا فهرسةَ له: غرفةُ لعبٍ عابرةٌ لا صفحةٌ تُبحَث، ورمزُها في نتائج البحث دعوةٌ لمن
 * لم يُدعَ. (وليس هذا حراسةً — الحراسةُ في الرمز نفسِه — بل نظافةُ فهرس.)
 */
export const metadata: Metadata = {
  title: "خمّن الكلمة",
  robots: { index: false, follow: false },
};

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

export default async function PlayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  // شكلُ الرمز يُفحَص قبل أيّ استعلام: الخُردةُ تُردّ بلا أن تلمس القاعدة (درسُ `/q`).
  if (!isRoomCode(code)) notFound();

  const sb = service();
  if (!sb) notFound();

  const { data } = await sb
    .from("guess_word_sessions")
    .select("id, code, title, status, time_per_word")
    .eq("code", code.toUpperCase())
    .maybeSingle();

  const room = data as {
    id: string;
    code: string;
    title: string;
    status: "waiting" | "active" | "finished";
    time_per_word: number;
  } | null;

  if (!room) notFound();

  // الحالُ الأولى تُقرأ في الخادم كي تُرسَم الشاشةُ صحيحةً من أوّل بايت: من مسح الرمزَ
  // في قاعةٍ لا ينتظر ومضةً بيضاء ثمّ محتوى.
  const state = await getPlayerState(code);

  return (
    <PlayView
      code={room.code}
      roomId={room.id}
      title={room.title}
      status={room.status}
      secondsPerWord={room.time_per_word}
      initial={state}
      siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null}
    />
  );
}
