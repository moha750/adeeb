/**
 * ترجمةُ أخطاء المصادقة إلى العربيّة — **مصدرٌ واحد** لشاشات الدخول والاستعادة والتعيين.
 * (كانت نسخةً محليّةً في `LoginForm`؛ نُقلت هنا حين احتاجتها ثلاثُ شاشات.)
 *
 * لا تُفشي وجودَ الحساب من عدمه: رسائل الاستعادة محايدةٌ عمدًا، والخطأ العامّ يُرجَع
 * كما هو دون تخمينٍ لسببه.
 */
/**
 * ثوانيُ الانتظار إن كان الخطأ مهلةَ وتيرة، وإلّا `null`.
 * تُستعمل ليُقاد بها **عدّادٌ حيّ** في الواجهة بدل رقمٍ جامدٍ يكذب بعد ثانية.
 */
export function waitSeconds(msg: string): number | null {
  const m = /after (\d+) seconds?/.exec(msg.toLowerCase());
  return m ? Number(m[1]) : null;
}

/**
 * هل ضاعت الجلسة؟ (أُوقفت من نافذةٍ أخرى · انتهت مهلتُها · أُبطل رمزُها)
 * تُميَّز لأنّ علاجها غيرُ علاج سائر الأخطاء: لا إعادةَ محاولةٍ هنا، بل رابطٌ جديد.
 */
export function isSessionGone(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes("session missing") ||
    m.includes("session_not_found") ||
    m.includes("refresh token") ||
    m.includes("jwt expired") ||
    m.includes("invalid claim") ||
    m.includes("user from sub claim") ||
    m.includes("not authenticated") ||
    m.includes("unauthorized")
  );
}

export function toArabicAuthError(msg: string): string {
  const m = msg.toLowerCase();

  if (isSessionGone(msg)) return "انتهت جلسة الاستعادة أو أُوقفت. اطلب رابطًا جديدًا.";

  // الدخول
  if (m.includes("invalid login credentials")) return "البريد الإلكترونيّ أو كلمة المرور غير صحيحة.";
  if (m.includes("email not confirmed")) return "لم يُؤكَّد هذا البريد بعد.";

  // الحدّ والوتيرة
  // مهلةُ الدقيقة بين رسالتين تصل بصيغةٍ لا تذكر «rate limit» أصلًا:
  // «For security purposes, you can only request this after 60 seconds».
  // فتُلتقط بالعدد نفسه ويُقال للعضو كم يبقى، لا «تعذّر إتمام الطلب» غامضةً.
  const wait = /after (\d+) seconds?/.exec(m);
  if (wait) return `انتظر ${wait[1]} ثانية ثمّ أعِد المحاولة.`;
  if (m.includes("too many requests") || m.includes("rate limit") || m.includes("over_email_send_rate_limit"))
    return "محاولات كثيرة. انتظر قليلًا ثمّ أعِد المحاولة.";

  // رابط الاستعادة
  if (m.includes("expired") || m.includes("invalid flow state") || m.includes("code verifier"))
    return "انتهت صلاحية الرابط أو استُعمل من قبل. اطلب رابطًا جديدًا.";
  if (m.includes("token has expired") || m.includes("otp_expired"))
    return "انتهت صلاحية الرابط. اطلب رابطًا جديدًا.";

  // كلمة المرور الجديدة
  if (m.includes("should be different") || m.includes("same_password"))
    return "كلمة المرور الجديدة مطابقةٌ للقديمة. اختر غيرها.";
  if (m.includes("password should be at least") || m.includes("weak password"))
    return "كلمة المرور قصيرة أو ضعيفة. اختر كلمةً أطول.";

  return "تعذّر إتمام الطلب. تحقّق من البيانات وحاول مجدّدًا.";
}
