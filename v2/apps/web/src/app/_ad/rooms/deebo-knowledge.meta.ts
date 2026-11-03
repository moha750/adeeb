import type { RoomMeta } from "./meta";

/**
 * معرفةُ ديبو على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠٢). `viewKey` مفتاحُ `usePersistentView` القديم نفسُه، فيبقى اختيارُ العضو
 * بين الكروت والجدول. ولا أعمدةَ في الجدول غيرُ الكعب (الترتيب): الحالُ شارةٌ، ونصُّ الواقعة سطرٌ تحت عنوانها.
 */
export const DEEBO_KNOWLEDGE_ROOM: RoomMeta = { title: "معرفة ديبو", navPath: "/dashboard/deebo/knowledge", viewKey: "deebo-facts-view", cols: 0, stub: true, listOnly: true, what: "الوقائع" };
