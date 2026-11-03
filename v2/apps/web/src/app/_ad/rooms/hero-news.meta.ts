import type { RoomMeta } from "./meta";

/**
 * غرفةُ الأخبار المعروضة — البابُ الثاني في «اللوحة الإعلانية»، ومسارُها مسارُها الفرعيّ لا بندُ الخريطة: بلاغُ الخطأ (`report.ts`)
 * يعرف الغرفةَ بمسارها، فلو شاركت الشريطَ مسارَه لَنُسب خطؤها إليه. ولم يكن للقديمة مفتاحُ عرض (كروتٌ وحدها)، فالمفتاحُ جديد —
 * ولا أثرَ له: مرتّبةٌ يدويًّا فقائمةٌ وحدها.
 */
export const HERO_NEWS_ROOM: RoomMeta = { title: "الأخبار المعروضة", navPath: "/dashboard/website/announcements/news", viewKey: "hero-news-view", cols: 0, stub: true, listOnly: true, what: "الأخبار المعروضة" };
