"use client";

import { AdRoomError } from "@/app/_ad/states";
import { EMAIL_LOG_ROOM } from "@/app/_ad/rooms/email-log.meta";

/** ما انكسر أثناء رسم السجلّ: «القطعة» بإعادة المحاولة، ورمزُ الخطأ لمن يُبلِغ (القالب، ٢٠٢٦-١١-٠٢). */
export default function RoomError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <AdRoomError {...EMAIL_LOG_ROOM} detail={error.digest ? `digest: ${error.digest}` : error.message} retry={reset} />;
}
