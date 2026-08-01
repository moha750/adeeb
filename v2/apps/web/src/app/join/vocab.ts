// مفردات نموذج التقديم — مخطّط التحقّق (Zod) وقواعد الحقول الخاصّة بطلب العضويّة.
// يعتمد المصدر الواحد lib/membershipFields للقواعد المشتركة (جوّال · درجة · تطبيع التواصل)،
// فلا تفترق طبقتا العرض والتخزين. لا يعتمد على شيء خادميّ (يستورده النموذج العميليّ والفعل الخادميّ معًا).

import { z } from "zod";
import { DEGREE_VALUES, hasAcademicFields, PHONE_RE, PHONE_HINT, socialHandle, type SocialKey } from "@/lib/membershipFields";

/**
 * منصّات التواصل في طلب التقديم (membership_applications) — ثلاثٌ لا أربع (بلا تيك توك)،
 * وأعمدتها social_* (تختلف عن أعمدة member_details التي هي *_account). المفتاح يربطها بمنطق التطبيع المشترك.
 */
export const APPLICATION_SOCIALS: { key: SocialKey; column: "social_twitter" | "social_instagram" | "social_linkedin"; label: string }[] = [
  { key: "twitter", column: "social_twitter", label: "منصّة X" },
  { key: "instagram", column: "social_instagram", label: "إنستغرام" },
  { key: "linkedin", column: "social_linkedin", label: "لينكدإن" },
];

// بريدٌ صالح — نفس نمط ContactForm (بلا اعتمادٍ على z.email المهجورة في zod v4)
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PORTFOLIO_RE = /^https?:\/\/.+/i;

/**
 * مخطّط طلب التقديم — يُفرض في النموذج (RHF) وفي الفعل الخادميّ (دفاعٌ في العمق).
 * الحقول الاختياريّة .optional() (لا .default) لتطابق نوعَي الإدخال/الإخراج، فيقبلها useForm بلا احتكاك.
 */
export const applicationSchema = z
  .object({
    full_name: z.string().trim().min(3, "اكتب اسمك الثلاثيّ كاملًا"),
    phone: z.string().trim().regex(PHONE_RE, PHONE_HINT),
    email: z.string().trim().regex(EMAIL_RE, "بريد إلكترونيّ غير صالح"),
    degree: z.string().refine((v) => DEGREE_VALUES.includes(v), "اختر الدرجة العلميّة"),
    college: z.string().trim().max(120).optional(),
    major: z.string().trim().max(120).optional(),
    preferred_committee: z.string().trim().min(1, "اختر اللجنة التي ترغب الانضمام إليها"),
    skills: z.string().trim().max(1000).optional(),
    about: z.string().trim().max(2000).optional(),
    portfolio_url: z.string().trim().max(500).optional(),
    social_twitter: z.string().trim().max(200).optional(),
    social_instagram: z.string().trim().max(200).optional(),
    social_linkedin: z.string().trim().max(200).optional(),
  })
  .superRefine((v, ctx) => {
    // القاعدة الثنائيّة نفسها: الدرجة الجامعيّة تلزمها كلّية وتخصّص
    if (hasAcademicFields(v.degree)) {
      if (!v.college?.trim()) ctx.addIssue({ code: "custom", path: ["college"], message: "الكلّية مطلوبة لهذه الدرجة" });
      if (!v.major?.trim()) ctx.addIssue({ code: "custom", path: ["major"], message: "التخصّص مطلوب لهذه الدرجة" });
    }
    if (v.portfolio_url?.trim() && !PORTFOLIO_RE.test(v.portfolio_url)) {
      ctx.addIssue({ code: "custom", path: ["portfolio_url"], message: "أدخل رابطًا صحيحًا يبدأ بـ https://" });
    }
    // التواصل: تُفحص الصيغة عبر المصدر الواحد (يقبل الرابط و@معرّف والمجرّد، ويردّ اسم الشخص ورابط منصّة أخرى)
    for (const s of APPLICATION_SOCIALS) {
      const res = socialHandle(s.key, v[s.column]);
      if (!res.ok) ctx.addIssue({ code: "custom", path: [s.column], message: res.reason });
    }
  });

export type ApplicationInput = z.infer<typeof applicationSchema>;

/** قيم النموذج الابتدائيّة — كلّها فارغة (اللجنة تُملأ مسبقًا عند دعوة single). */
export const emptyApplication: ApplicationInput = {
  full_name: "",
  phone: "",
  email: "",
  degree: "",
  college: "",
  major: "",
  preferred_committee: "",
  skills: "",
  about: "",
  portfolio_url: "",
  social_twitter: "",
  social_instagram: "",
  social_linkedin: "",
};
