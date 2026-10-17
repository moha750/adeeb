/**
 * مفرداتُ **إشراف عِرفان** — بلا إطار، فيستوردها الخادمُ والعميل.
 *
 * قرارُ المالك ٢٠٢٦-١٠-١٧ («أنا الرئيس، فمن المهمّ أن أعرف لأجل الإحصاء»): صفحةٌ لرئيس أدِيب وحده فيها كلُّ
 * شيء، النصوصُ معها. وكان قرارُه الأوّل أنّ الرسالة لا يقرؤها إلّا مرسلُها ومستلمُها، فعُدّل بإفصاحٍ صريحٍ
 * للعضو في شاشة الكتابة، لا بصمت.
 */
import type { IrfanCard, IrfanLook } from "@/lib/irfan/card";

export type OversightRow = {
  id: number;
  at: string;
  from: string;
  to: string;
  seat: string;
  title: string | null;
  look: IrfanLook;
  /** البطاقةُ للعرض، أو `null` لرسالةٍ نصُّها محجوب (كُتبت قبل الإفصاح). */
  card: IrfanCard | null;
  /** صورةُ المعاينة مرفوعة؟ (ما يعرضه واتساب فوق الرابط) */
  pictured: boolean;
  /**
   * مصغّرةُ البطاقة: صورةُ معاينتها المرفوعة (البطاقةُ في وسط لوحٍ عريض، فيقصّها `object-fit: cover` إليها)،
   * فلا تُرسم في المتصفّح عشراتُ البطاقات لقائمةٍ واحدة. `null` إن لم تُرفع، أو كان النصُّ محجوبًا.
   */
  thumb: string | null;
  read: boolean;
};

export type OversightData = {
  season: { title: string; closesAt: string } | null;
  /** عددُ قادة المجلسين الآن: مقامُ «وصلهم عِرفان». */
  leaders: number;
  rows: OversightRow[];
  error: string | null;
};
