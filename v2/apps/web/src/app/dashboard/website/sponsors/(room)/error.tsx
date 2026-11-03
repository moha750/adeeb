"use client";

import { AdRoomError } from "@/app/_ad/states";
import { SPONSORS_ROOM } from "@/app/_ad/rooms/sponsors.meta";

/** ما انكسر أثناء رسم الغرفة: «القطعة» بإعادة المحاولة، ورمزُ الخطأ لمن يُبلِغ (القالب، ٢٠٢٦-١٠-٣١). */
export default function RoomError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <AdRoomError {...SPONSORS_ROOM} detail={error.digest ? `digest: ${error.digest}` : error.message} retry={reset} />;
}
