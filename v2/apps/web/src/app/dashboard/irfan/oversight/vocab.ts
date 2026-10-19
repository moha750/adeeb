/**
 * مفرداتُ **إشراف عِرفان** — بلا إطار، فيستوردها الخادمُ والعميل.
 *
 * قرارُ المالك ٢٠٢٦-١٠-١٧ («أنا الرئيس، فمن المهمّ أن أعرف لأجل الإحصاء»): صفحةٌ لرئيس أدِيب وحده فيها كلُّ
 * شيء، النصوصُ معها، وما كُتب قبل الصفحة أيضًا («هي في القاعدة أصلًا»)، وبلا سطر إفصاحٍ للعضو («لا داعي»).
 * وكان قرارُه الأوّل أنّ الرسالة لا يقرؤها إلّا مرسلُها ومستلمُها؛ فهذا استثناءٌ للرئيس وحده بقراره.
 * ثمّ انتقلت (٢٠٢٦-١٠-١٨) إلى **حساب أدِيب المؤسسيّ وحده**، مرآةً للعرض، ونُزعت من حساب الرئيس.
 */
import type { IrfanCard, IrfanLook } from "@/lib/irfan/card";

export type OversightRow = {
  id: number;
  at: string;
  from: string;
  to: string;
  seat: string;
  /** جنسُ القائد وصورتُه: أفتارُه في رأس الكرت (`Avatar`). */
  toGender: "male" | "female" | null;
  toAvatar: string | null;
  title: string | null;
  look: IrfanLook;
  /** البطاقةُ للعرض، ونصُّها معها. */
  card: IrfanCard;
  /** صورةُ المعاينة مرفوعة؟ (ما يعرضه واتساب فوق الرابط) */
  pictured: boolean;
  /**
   * مصغّرةُ البطاقة: صورةُ معاينتها المرفوعة (البطاقةُ في وسط لوحٍ عريض، فيقصّها `object-fit: cover` إليها)،
   * فلا تُرسم في المتصفّح عشراتُ البطاقات لقائمةٍ واحدة. `null` إن لم تُرفع.
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
