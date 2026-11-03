"use client";

import { AdRoomError } from "@/app/_ad/states";
import { SUPERVISED_ROOM } from "@/app/_ad/rooms/supervised.meta";

/** ما انكسر أثناء رسم الغرفة: «القطعة» بإعادة المحاولة، ورمزُ الخطأ لمن يُبلِغ (القالب، ٢٠٢٦-١١-٠٣). */
export default function RoomError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <AdRoomError {...SUPERVISED_ROOM} detail={error.digest ? `digest: ${error.digest}` : error.message} retry={reset} />;
}
