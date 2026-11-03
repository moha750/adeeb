import type { Metadata } from "next";
import type { RoomMeta } from "./rooms/meta";

/**
 * **عنوانُ تبويب المتصفّح اسمُ الغرفة** (محمد ٢٠٢٦-١١-٠٣: «مهمّة جدًّا»): «أعياد الميلاد، بوّابة أدِيب» — من ميتا الغرفة نفسِها، فلا
 * يختلف اسمُ التبويب عن اسم اللوح (كان بعضُها «بوّابة أدِيب» وحدها، وبعضُها اسمًا قديمًا كـ«باركوداتي» واللوحُ «باركودات مفردة»).
 */
export const roomMetadata = (room: Pick<RoomMeta, "title">): Metadata => ({ title: `${room.title}، بوّابة أدِيب` });
