/**
 * **منازلُ أدِيب الثلاث وأسماؤها الظاهرة** — المصدرُ الواحد (قرار المالك ٢٠٢٦-١٠-٠٨).
 *
 * ثلاثٌ لا تتداخل، وعلى صيغةٍ واحدة: «عضو أدِيب»، و«متطوّع أدِيب»، و«صديق أدِيب». وكانت
 * الثالثةُ «زائرًا» ثمّ «صاحبَ حساب»، فصار «الزائرُ» لمن يتصفّح بلا حسابٍ وحدَه.
 *
 * والحدُّ من القاعدة لا من هنا: `adeeb_standing` و`is_adeeb_member` في SQL، و`isLiveMembership`
 * في الكود، والتطوّعُ صفٌّ في `volunteers` حالُه `active`. وهذا الملفُّ يسمّي ما قالته فحسب،
 * وهو بلا إطارٍ فيستورده الخادمُ والعميلُ سواءً.
 *
 * والجنسُ يُصرِّف الاسم («صديقة أدِيب»، «متطوّعة أدِيب»)، وحين يُجهَل فالمذكَّرُ أصل. إلّا العضو:
 * «عضو أدِيب» للرجل والمرأة، فهو الأصحّ لغةً (قرار المالك ٢٠٢٦-١٠-٠٨).
 */

export type AdeebStanding = "member" | "volunteer" | "account";

const NAME: Record<AdeebStanding, { male: string; female: string }> = {
  member: { male: "عضو أدِيب", female: "عضو أدِيب" },
  volunteer: { male: "متطوّع أدِيب", female: "متطوّعة أدِيب" },
  account: { male: "صديق أدِيب", female: "صديقة أدِيب" },
};

export function standingName(s: AdeebStanding, gender?: "male" | "female" | null): string {
  return NAME[s][gender === "female" ? "female" : "male"];
}

/** مفتاحُ القاعدة (`account_type`) منزلةً: `visitor` اسمُه القديم لصديق أدِيب، وبقي لئلّا يتبدّل العقد. */
export type AccountType = "member" | "volunteer" | "visitor";

export function standingOfAccountType(t: AccountType): AdeebStanding {
  return t === "visitor" ? "account" : t;
}
