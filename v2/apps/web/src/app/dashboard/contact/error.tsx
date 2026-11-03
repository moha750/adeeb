"use client";

import { AdRoomError } from "@/app/_ad/states";
import { CONTACT_ROOM } from "@/app/_ad/rooms/contact.meta";

/** ما انكسر أثناء رسم الغرفة: «القطعة» بإعادة المحاولة، ورمزُ الخطأ لمن يُبلِغ (القالب، ٢٠٢٦-١٠-٣١). */
export default function RoomError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <AdRoomError {...CONTACT_ROOM} detail={error.digest ? `digest: ${error.digest}` : error.message} retry={reset} />;
}
