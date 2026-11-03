"use client";

import { AdRoomError } from "@/app/_ad/states";
import { REGULATIONS_ROOM } from "@/app/_ad/rooms/regulations.meta";

/** ما انكسر أثناء رسم الغرفة: «القطعة» بإعادة المحاولة، ورمزُ الخطأ لمن يُبلِغ (القالب، ٢٠٢٦-١٠-٣١). */
export default function RoomError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <AdRoomError {...REGULATIONS_ROOM} detail={error.digest ? `digest: ${error.digest}` : error.message} retry={reset} />;
}
