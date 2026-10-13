/** رسائلُ دوالّ التطوّع المفوَّضة بالعربيّة — رموزُ القاعدة كما ترجعها (نُقلت من بوّابة `/me` القديمة). */
const RPC_ERRORS: Record<string, string> = {
  NOT_AUTHENTICATED: "انتهت جلستك. سجّل دخولك من جديد.",
  NOT_VOLUNTEER: "لستَ من المتطوّعين.",
  OPPORTUNITY_CLOSED: "انتهى التقديم على هذه الفرصة.",
  OPPORTUNITY_NOT_FOUND: "لم نجد هذه الفرصة.",
  WRONG_GENDER: "هذه الفرصة موجَّهةٌ لفئةٍ أخرى.",
  ALREADY_APPLIED: "قدّمتَ على هذه الفرصة سلفًا.",
  NOT_WITHDRAWABLE: "لا يُسحَب التقديمُ بعد مراجعته.",
  PERIOD_REQUIRED: "اختر فترتك من فترات الفرصة.",
  NO_PERIOD: "اختر فترةً واحدةً على الأقلّ.",
  BAD_PERIOD: "فترةٌ لا تتبع هذه الفرصة. حدّث الصفحة.",
  PERIOD_PASSED: "انتهت فترةٌ اخترتها، فاختر غيرها.",
  PERIOD_FULL: "اكتمل عددُ فترةٍ اخترتها. اختر غيرها.",
  REASON_REQUIRED: "اكتب سببَ اعتذارك.",
  NOT_EXCUSABLE: "لا يُعتذر عن هذا التقديم. حدّث الصفحة.",
  ALREADY_STARTED: "بدأ موعدُك، فلا يُعتذر عنه الآن. تواصل مع المشرف.",
};

export function rpcError(raw: string | null | undefined): string {
  const code = Object.keys(RPC_ERRORS).find((c) => (raw ?? "").includes(c));
  return code ? RPC_ERRORS[code] : "تعذّر تنفيذ طلبك. حاول مجدّدًا.";
}
