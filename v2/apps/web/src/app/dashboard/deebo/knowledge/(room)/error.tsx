"use client";

import { AdRoomError } from "@/app/_ad/states";
import { DEEBO_KNOWLEDGE_ROOM } from "@/app/_ad/rooms/deebo-knowledge.meta";

/** ما انكسر أثناء رسم الغرفة: «القطعة» بإعادة المحاولة، ورمزُ الخطأ لمن يُبلِغ (القالب، ٢٠٢٦-١١-٠٢). */
export default function RoomError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <AdRoomError {...DEEBO_KNOWLEDGE_ROOM} detail={error.digest ? `digest: ${error.digest}` : error.message} retry={reset} />;
}
