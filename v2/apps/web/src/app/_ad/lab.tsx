"use client";

import { createContext, useContext } from "react";

/**
 * أعلامُ المختبر — مؤقّتة، تُحذف مع `/dashboard/ad` (٢٠٢٦-١٠-٣٠).
 * `filterPanelAt`: يخفض عتبةَ «التصفية» لمعاينة اللوحة في غرفةٍ مرشّحاتُها أقلّ من ثلاثة
 * (`?f=panel`)، فتُرى شكلُها ببياناتٍ حقيقيّة قبل أن تنتقل غرفةُ الأعضاء.
 * `allStates`: كلُّ حالات كرت الفعاليّة في موضعٍ واحد (`?f=states`) — نسخٌ مصطنعةٌ من فعاليّاتٍ حقيقيّة بحالاتٍ لا توجد
 *   في البيانات اليوم (قادمةٌ تمتلئ، ومكتملة، وبلا حدّ، ومسودّة، وملغاة)، وأفعالُها معطّلة فلا تمسّ الحقيقيّة.
 * `asRole`: غرفةُ الاستبيانات كما يراها صاحبُ دورٍ بعينه (`?as=owner|edit|read|steward`) — كلُّ استبيانٍ بهذا الدور.
 * `pageSize`: صفحةٌ من ثلاثة سجلّاتٍ لا خمسين (`?f=page`)، فيظهر الترقيمُ في غرفٍ أقلَّ من خمسين.
 * `select`: التحديدُ الجماعيّ بأفعالٍ تجريبيّةٍ لا تمسّ البيانات (`?f=select`) — الغرفُ الثلاث لا تحديدَ فيها اليوم.
 * ولا قيمةَ لها خارج المختبر.
 */
export type AdAsRole = "owner" | "edit" | "read" | "steward";
export const AdLab = createContext<{ filterPanelAt?: number; allStates?: boolean; asRole?: AdAsRole; pageSize?: number; select?: boolean }>({});
export const useAdLab = () => useContext(AdLab);
