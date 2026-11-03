"use client";

import { AdRoomError } from "@/app/_ad/states";
import { MEMBERS_ROOM } from "@/app/_ad/rooms/members.meta";

/** ما انكسر أثناء رسم الغرفة: «القطعة» بإعادة المحاولة، ورمزُ الخطأ لمن يُبلِغ (القالب، ٢٠٢٦-١١-٠٣). */
export default function RoomError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <AdRoomError {...MEMBERS_ROOM} detail={error.digest ? `digest: ${error.digest}` : error.message} retry={reset} />;
}
