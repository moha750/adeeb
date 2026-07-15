// مفردات الأعضاء — لا تعتمد على شيء خادميّ، فيستوردها الخادم والعميل معًا بأمان.
// (لا تنقلها إلى data.ts: ذاك خادميّ حصرًا — استيراد قيمة منه في مكوّن عميل يسحبه إلى حزمة المتصفّح.)

/**
 * مفردات member_details.academic_degree — مصدر واحد مرتّب.
 * القيمة رمزٌ إنجليزيّ يحرسه القيد member_details_academic_degree_check في القاعدة (والعمود NOT NULL)،
 * والتسمية عربيّة للعرض فقط. لا تُضِف قيمة هنا قبل توسيع القيد، ولا تكتب التسمية في العمود.
 */
export const DEGREES: { value: string; label: string }[] = [
  { value: "high_school", label: "ثانوية عامة" },
  { value: "employee", label: "موظف" },
  { value: "diploma", label: "دبلوم" },
  { value: "bachelor", label: "بكالوريوس" },
  { value: "master", label: "ماجستير" },
  { value: "phd", label: "دكتوراه" },
];

export const DEGREE_VALUES: string[] = DEGREES.map((d) => d.value);

/**
 * هل تصحب الدرجةَ كلّيةٌ وتخصّصٌ ورقمٌ أكاديميّ؟ — مصدر واحد للطبقات الثلاث:
 * النموذج (يُظهر الحقول ويُلزمها) · الفعل الخادميّ (يكتب أو يمحو) · القيد member_details_academic_fields_check.
 *
 * القاعدة ثنائيّة لا ثلاثيّة: من له درجة جامعيّة تلزمه الثلاثة، ومن لا (ثانوية عامة · موظف) يُمنع منها.
 * لا منزلة بين المنزلتين — القيد يرفض الفارغ في الأولى، ويرفض الممتلئ في الثانية.
 */
const ACADEMIC_DEGREES = new Set(["diploma", "bachelor", "master", "phd"]);
export const hasAcademicFields = (degree: string | null | undefined): boolean =>
  !!degree && ACADEMIC_DEGREES.has(degree);

/**
 * صيغة الجوّال السعوديّ — مصدر واحد للطبقات الثلاث: مخطّط النموذج · الفعل الخادميّ · قيد القاعدة
 * (profiles_phone_check و member_details_phone_check). غيّرها هنا ⇐ عدّل القيد بترحيل مقابل.
 */
export const PHONE_RE = /^05[0-9]{8}$/;
export const PHONE_HINT = "رقم جوّال غير صالح — الصيغة: 05xxxxxxxx";

/** الرمز → التسمية؛ يرتدّ إلى الرمز الخام إن ورد ما ليس في المفردات (فلا يختفي الحقل صامتًا). */
export const DEGREE_LABEL: Record<string, string> = Object.fromEntries(DEGREES.map((d) => [d.value, d.label]));
export const formatDegree = (v: string | null | undefined): string | null => (v ? DEGREE_LABEL[v] ?? v : null);
