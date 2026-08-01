import type { Position } from "../structure/model";

// أسماء المجالس (roles.council_type → عربيّ) — مصدرٌ واحد لكرت المنصب ونافذة الإسناد.
export const COUNCIL_AR: Record<Position["council"], string> = {
  executive: "المجلس التنفيذي",
  administrative: "المجلس الإداري",
};

// المجلس والعضويّة في نصٍّ واحد: «عضو المجلس …» (يجلس ويقرّر) · «تابع للمجلس …» (تحت فرعه).
// «لـ» تُدغَم في «ال» فتصير «لل»، فتُبنى من اسم المجلس منزوعَ الألف («المجلس» ← «لمجلس» ← «للمجلس»).
export const membershipLabel = (p: Position) =>
  p.councilMember ? `عضو ${COUNCIL_AR[p.council]}` : `تابع ل${COUNCIL_AR[p.council].slice(1)}`;
