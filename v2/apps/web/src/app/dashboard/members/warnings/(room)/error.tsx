"use client";

import { AdRoomError } from "@/app/_ad/states";
import { WARNINGS_ROOM } from "@/app/_ad/rooms/warnings.meta";

/** ما انكسر أثناء رسم الغرفة: «القطعة» بإعادة المحاولة، ورمزُ الخطأ لمن يُبلِغ (القالب، ٢٠٢٦-١١-٠٢). */
export default function RoomError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <AdRoomError {...WARNINGS_ROOM} detail={error.digest ? `digest: ${error.digest}` : error.message} retry={reset} />;
}
