"use client";

import { AdRoomError } from "@/app/_ad/states";
import { FRIENDS_ROOM } from "@/app/_ad/rooms/friends.meta";

/** ما انكسر أثناء رسم الغرفة: «القطعة» بإعادة المحاولة، ورمزُ الخطأ لمن يُبلِغ (القالب، ٢٠٢٦-١٠-٣١). */
export default function RoomError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <AdRoomError {...FRIENDS_ROOM} detail={error.digest ? `digest: ${error.digest}` : error.message} retry={reset} />;
}
