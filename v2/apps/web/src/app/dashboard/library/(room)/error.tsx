"use client";

import { AdRoomError } from "@/app/_ad/states";
import { LIBRARY_ROOM } from "@/app/_ad/rooms/library.meta";

/** ما انكسر أثناء رسم الغرفة: «القطعة» بإعادة المحاولة، ورمزُ الخطأ لمن يُبلِغ (القالب، ٢٠٢٦-١١-٠١). */
export default function RoomError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <AdRoomError {...LIBRARY_ROOM} detail={error.digest ? `digest: ${error.digest}` : error.message} retry={reset} />;
}
