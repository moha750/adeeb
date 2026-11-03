/**
 * **طريقةُ عرض الغرفة (كروتٌ أو جدول) في كوكي** (المراجعة المستقلّة ٢٠٢٦-١٠-٣١): كانت في `localStorage` وحده، والخادمُ لا يقرؤه،
 * فمن اختار الجدولَ رأى الكروتَ أوّلًا ثمّ تبدّلت — في الرسم الأوّل، وفي هيكل التحميل، وبعد كلّ تنقّل. والكوكي يقرؤه الخادمُ
 * (`roomView` في الصفحة و`loading.tsx`) فيرسم العرضَ المختار من أوّل لحظة. ملفٌّ بلا `"use client"`: يقرؤه الطرفان.
 */
export type RoomView = "cards" | "table";
export const viewCookie = (key: string) => `ad-view-${key}`;
export const asView = (v: string | null | undefined): RoomView | null => (v === "table" || v === "cards" ? v : null);
