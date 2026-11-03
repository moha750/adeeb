"use client";

import { AdRoomError } from "@/app/_ad/states";
import { IRFAN_OVERSIGHT_ROOM } from "@/app/_ad/rooms/irfan-oversight.meta";

/** ما انكسر أثناء رسم الغرفة: «القطعة» بإعادة المحاولة، ورمزُ الخطأ لمن يُبلِغ (القالب، ٢٠٢٦-١١-٠٢). */
export default function RoomError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <AdRoomError {...IRFAN_OVERSIGHT_ROOM} detail={error.digest ? `digest: ${error.digest}` : error.message} retry={reset} />;
}
