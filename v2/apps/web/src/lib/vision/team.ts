import "server-only";
import type { PubPerson } from "@/app/structure/data";
import type { PublicTeamSeat, PublicVision } from "./types";

/**
 * **فريقُ الرؤية** — هو الذي ينفّذ ويؤكّد (محمد ٢٠٢٦-١١-٢٢): سقط «خطُّ المتابعة» الذي كان تحته (التنفيذيّةُ تنفّذ، والضمانُ
 * يتابع، والمجلسُ يطّلع)، فالفريقُ متكاملٌ بنفسه، والصفحةُ العلنيّةُ نفسُها اطّلاعُ المجلس والأعضاء.
 */

/** فريقُ الرؤية الخاصّ مرسومًا: المشرفُ العامّ والقائدُ وقائدُ كلّ مسارٍ بترتيب المسارات، و`null` مقعدٌ شاغر */
export type CoreTeam = { supervisor: PubPerson | null; leader: PubPerson | null; trackLeads: (PubPerson | null)[] };

/**
 * **فريقُ الرؤية الخاصّ** (محمد ٢٠٢٦-١١-٠٣: «لكلّ رؤيةٍ فريقُها»): مشرفٌ عامّ، وقائدٌ للرؤية، وقائدٌ لكلّ مسار.
 * من القاعدة (`vision_team`)، ويُدار من تبويب «متابعة الرؤية» (محمد ٢٠٢٦-١١-٢٢). ومن لا حساب له اسمٌ مكتوبٌ بلا صفحة.
 */
export function coreTeam(v: PublicVision): CoreTeam {
  const asPerson = (s: PublicTeamSeat | undefined): PubPerson | null =>
    s ? { id: `seat-${s.id}`, name: s.name, avatar: s.avatar, gender: s.gender, title: null, slug: s.slug } : null;
  return {
    supervisor: asPerson((v.team ?? []).find((s) => s.role === "supervisor")),
    leader: asPerson((v.team ?? []).find((s) => s.role === "leader")),
    trackLeads: v.tracks.map((t) => asPerson((v.team ?? []).find((s) => s.role === "track" && s.track === t.position))),
  };
}
