import { z } from "zod";
import { PHONE_RE, PHONE_HINT } from "@/lib/membershipFields";
import { ARABIC_NAME_HINT, arabicNameError } from "@/lib/personName";

/**
 * مخطَّطُ بيانات صاحب الحساب — **خارج ملفّ الأفعال عن قصد**.
 *
 * `app/me/actions.ts` ملفُّ `"use server"`، وهو لا يُصدِّر إلّا دوالَّ لا متزامنة. فلمّا صار
 * `AccountExit` يستورد أفعالَه من غرفة الإعدادات أيضًا، دخل الملفُّ في محمّل أفعال تلك
 * الصفحة فصرخ Next: «found object» — والكائنُ هو هذا المخطَّط. فنزل ههنا، ويقرؤه الخادمُ
 * والعميلُ معًا كما تُقرأ مفرداتُ الغرف.
 */
export const myDataSchema = z.object({
  // بالعربيّة وحدها، ومطبَّعًا: ما يُحفظ هو ما يُطبع في ورقةٍ ويُنادى به في كشف.
  fullName: z.string().trim().min(1, "الاسم مطلوب").refine((v) => !arabicNameError(v), ARABIC_NAME_HINT),
  phone: z.string().trim().regex(PHONE_RE, PHONE_HINT),
  city: z.string().trim().max(60, "المدينة أطول من اللازم").optional().or(z.literal("")),
});

export type MyDataInput = z.infer<typeof myDataSchema>;

export type SaveResult = { ok: boolean; message: string; fieldErrors?: Partial<Record<keyof MyDataInput, string>> };
