// مفردات نموذج إكمال البيانات — مخطّط التحقّق (Zod) المطابق لقيود القاعدة حرفيًّا:
// member_details (الدرجة · القاعدة الأكاديميّة الثنائيّة · معرّف التواصل) + profiles (الجوّال · الجنس).
// يعتمد المصدر الواحد lib/membershipFields. يستورده النموذج العميليّ والفعل الخادميّ معًا.

import { z } from "zod";
import { DEGREE_VALUES, hasAcademicFields, PHONE_RE, PHONE_HINT, socialHandle, SOCIAL_KEYS } from "@/lib/membershipFields";

const GENDER_VALUES = ["male", "female"];
const NATIONAL_ID_RE = /^[0-9]{10}$/;
const RECORD_RE = /^[0-9]{6,12}$/;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/**
 * مخطّط الإكمال — يُفرض في النموذج والفعل الخادميّ (دفاعٌ في العمق).
 * القاعدة الأكاديميّة ثنائيّة: الجامعيّ يلزمه كلّية+تخصّص+رقم أكاديميّ، وغيره تُفرَّغ الثلاثة (يُنفّذه الفعل).
 */
export const onboardingSchema = z
  .object({
    password: z.string().min(8, "كلمة المرور ٨ أحرف على الأقلّ"),
    confirm: z.string().min(1, "أعد كتابة كلمة المرور"),
    gender: z.string().refine((v) => GENDER_VALUES.includes(v), "اختر الجنس"),
    phone: z.string().trim().regex(PHONE_RE, PHONE_HINT),
    full_name_triple: z.string().trim().min(5, "اكتب اسمك الثلاثيّ كاملًا"),
    national_id: z.string().trim().regex(NATIONAL_ID_RE, "رقم الهويّة ١٠ أرقام"),
    birth_date: z.string().min(1, "تاريخ الميلاد مطلوب"),
    academic_degree: z.string().refine((v) => DEGREE_VALUES.includes(v), "اختر الدرجة العلميّة"),
    college: z.string().trim().max(120).optional(),
    major: z.string().trim().max(120).optional(),
    academic_record_number: z.string().trim().optional(),
    favorite_color: z.string().trim().optional(),
    twitter: z.string().trim().max(200).optional(),
    instagram: z.string().trim().max(200).optional(),
    tiktok: z.string().trim().max(200).optional(),
    linkedin: z.string().trim().max(200).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.confirm !== v.password) {
      ctx.addIssue({ code: "custom", path: ["confirm"], message: "كلمتا المرور غير متطابقتين" });
    }
    // تاريخ ميلاد صالحٌ وغير مستقبليّ
    const d = new Date(v.birth_date);
    if (Number.isNaN(d.getTime()) || d.getTime() > Date.now()) {
      ctx.addIssue({ code: "custom", path: ["birth_date"], message: "تاريخ ميلاد غير صالح" });
    }
    // القاعدة الأكاديميّة الثنائيّة — نفس member_details_academic_fields_check
    if (hasAcademicFields(v.academic_degree)) {
      if (!v.college?.trim()) ctx.addIssue({ code: "custom", path: ["college"], message: "الكلّية مطلوبة لهذه الدرجة" });
      if (!v.major?.trim()) ctx.addIssue({ code: "custom", path: ["major"], message: "التخصّص مطلوب لهذه الدرجة" });
      if (!v.academic_record_number?.trim() || !RECORD_RE.test(v.academic_record_number.trim())) {
        ctx.addIssue({ code: "custom", path: ["academic_record_number"], message: "الرقم الأكاديميّ مطلوب (٦–١٢ رقمًا)" });
      }
    }
    if (v.favorite_color?.trim() && !HEX_RE.test(v.favorite_color.trim())) {
      ctx.addIssue({ code: "custom", path: ["favorite_color"], message: "لونٌ غير صالح — الصيغة #RRGGBB" });
    }
    // معرّفات التواصل — نفس المُطبِّع وقيد member_details_social_handle_check
    for (const k of SOCIAL_KEYS) {
      const res = socialHandle(k, v[k]);
      if (!res.ok) ctx.addIssue({ code: "custom", path: [k], message: res.reason });
    }
  });

export type OnboardingInput = z.infer<typeof onboardingSchema>;

/** قيم النموذج الابتدائيّة (تُدمج مع التعبئة المسبقة من الطلب). */
export const emptyOnboarding: OnboardingInput = {
  password: "",
  confirm: "",
  gender: "",
  phone: "",
  full_name_triple: "",
  national_id: "",
  birth_date: "",
  academic_degree: "",
  college: "",
  major: "",
  academic_record_number: "",
  favorite_color: "",
  twitter: "",
  instagram: "",
  tiktok: "",
  linkedin: "",
};
