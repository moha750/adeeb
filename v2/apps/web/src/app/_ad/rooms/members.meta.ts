import type { RoomMeta } from "./meta";

/**
 * غرفةُ «أعضاء أدِيب» على قالب «قائمة السجلّات» بكرت الشخص (٢٠٢٦-١١-٠٣). مفتاحُ العرض مفتاحُ `MembersView` القديم
 * (`members-view`)، فيُنقل اختيارُ العضو بين الكروت والجدول، والعرضُ الأوّل كروتٌ كما كان. وعمودُ الجدول الواحد: الانضمام —
 * والكعبُ وجهُ العضو (`face`)، والموقعُ شارةٌ، والجوّالُ والبريدُ (أو الإنهاءُ للسابق) سطورٌ تحت الاسم.
 */
export const MEMBERS_ROOM: RoomMeta = {
  title: "أعضاء أدِيب", navPath: "/dashboard/members/active", viewKey: "members-view", cols: 1, stub: true, what: "الأعضاء",
};
