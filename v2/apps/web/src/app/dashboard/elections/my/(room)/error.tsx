"use client";

import { AdRoomError } from "@/app/_ad/states";
import { MY_CANDIDACIES_ROOM } from "@/app/_ad/rooms/member-elections.meta";

/** ما انكسر أثناء رسم الغرفة: «القطعة» بإعادة المحاولة، ورمزُ الخطأ لمن يُبلِغ (القالب، ٢٠٢٦-١٠-٣١). */
export default function RoomError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <AdRoomError {...MY_CANDIDACIES_ROOM} detail={error.digest ? `digest: ${error.digest}` : error.message} retry={reset} />;
}
