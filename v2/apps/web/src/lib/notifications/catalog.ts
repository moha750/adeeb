/**
 * **دليلُ الإشعارات — المصدرُ الواحد.** لا يخرج من النظام إشعارٌ ليس فيه (`v2/NOTIFICATIONS-SYSTEM.md` §٣ب).
 *
 * لكلّ نوعٍ مفتاحُه («قسمٌ.حدث»، وصيغتُه محروسةٌ بقيدٍ في القاعدة وباختبار)، وقسمُه، ومتى يقع،
 * وعيّنةُ حقائقٍ يُرسَم بها في `/ui/notifications`، **ومخاطَبون**: لكلّ مخاطَبٍ من هم، ونصُّه بجنس
 * قارئه، ورابطُه، ودرجتُه. فواقعةٌ واحدة تقول لصاحبها شيئًا ولقائد لجنته شيئًا آخر.
 *
 * ## كيف يُضاف إشعار
 * يُناقَش في تبويب **مصدر الواقعة** بخمسة أسئلة (الحدث، المستلم، الدرجة، النصّ، وِجهة النقر)، ثمّ
 * يُكتب مدخلُه ههنا، ويُطلَق من مصدره بسطرٍ واحد (`emit` في الخادم أو `notify_event` في القاعدة).
 *
 * ## ما لا يُبدَّل بعد الإرسال
 * **مفتاحُ النوع ومفتاحُ المخاطَب**: كلاهما محفوظٌ في الصفوف المُرسَلة، والنصُّ يُرسَم منهما عند
 * العرض. فتعديلُ النصّ والرابط والدرجة حرٌّ (ويسري على ما أُرسل)، وتبديلُ المفتاح يُيتّم ما سبقه
 * فيُعرَض بعنوانه الاحتياطيّ. ومن أراد إعدامَ نوعٍ حذفه، وما أُرسل به يبقى بعنوانه الاحتياطيّ.
 *
 * ## ولمَ الدوالُّ بصيغة الطريقة (`to(f)`) لا السهم
 * لأنّ TypeScript يقارن مُعاملاتِ الطرائق في الاتّجاهين، فيدخل نوعٌ بحقائقَ محدّدة في سجلٍّ عامّ
 * (`Kind<unknown>`) بلا `any`، ويبقى كلُّ مدخلٍ مضبوطَ الحقائق عند كتابته وعند إطلاقه.
 */
import type { IconKey } from "@/app/dashboard/_shell/icons";
import type { Address, Gender, Level } from "./types";

/** أقسامُ الإشعار: اسمُها في المعرض، وأيقونتُها من خريطة اللوحة (`ICONS`) لا مخترَعة. */
export const SECTIONS = {
  system: { label: "النظام", icon: "gear" },
  irfan: { label: "عِرفان", icon: "irfan" },
} as const satisfies Record<string, { label: string; icon: IconKey }>;

export type Section = keyof typeof SECTIONS;

/** الدرجةُ وقنواتُها كما تُقال في المعرض. والقنواتُ نفسُها في الموزِّع (`dispatch.ts`). */
export const LEVELS: Record<Level, { label: string; channels: string; tone: "neutral" | "info" | "danger" }> = {
  normal: { label: "عاديّ", channels: "الجرس", tone: "neutral" },
  important: { label: "مهمّ", channels: "الجرس، وشاشة القفل", tone: "info" },
  critical: { label: "حرِج", channels: "الجرس، وشاشة القفل، وواتساب حين تُبنى قناتُه", tone: "danger" },
};

export type NoteText = { title: string; body?: string };

export interface Audience<F> {
  /** مفتاحٌ ثابتٌ يُحفَظ في الصندوق (انظر «ما لا يُبدَّل»). */
  key: string;
  level: Level;
  /** يُشعَر الفاعلُ بفعله؟ الأصلُ لا (§٣ج). */
  includeActor?: boolean;
  to(f: F): Address[];
  text(f: F, g: Gender): NoteText;
  /** مسارٌ داخليٌّ يُفتح بالنقر. */
  href(f: F): string;
  /** أجلٌ يغيب الإشعارُ بعده، لنوعٍ ينقضي سببُه. والأصلُ لا أجل: الإشعارُ باقٍ (قرار محمد). */
  expires?(f: F, at: Date): Date | null;
}

export interface Kind<F> {
  section: Section;
  /** متى تقع الواقعة، بجملة: يُقرأ في المعرض. */
  when: string;
  sample: F;
  audiences: Audience<F>[];
}

/** يكتب المدخلَ بحقائقه المضبوطة: `defineKind<{ opportunity: string }>({...})`. */
export function defineKind<F>(k: Kind<F>): Kind<F> {
  return k;
}

export const CATALOG = {
  /**
   * **وصلك عِرفان** (٢٠٢٦-١٠-١٧) — رسالةُ شكرٍ من عضوٍ إلى قائد. تُطلَق داخل `send_irfan`.
   * - **المستلم**: القائدُ نفسُه. **الدرجة**: مهمّ، فالشكرُ يُفرِح ساعةَ يصل. **الوجهة**: غرفةُ عِرفان.
   */
  "irfan.received": defineKind<{ messageId: number; recipientId: string; senderName: string; season: string }>({
    section: "irfan",
    when: "كتب عضوٌ عِرفانًا لقائد",
    sample: { messageId: 1, recipientId: "00000000-0000-0000-0000-000000000000", senderName: "عبد الرحمن خالد الشيخ", season: "اليوم العالمي للمدير" },
    audiences: [
      {
        key: "recipient",
        level: "important",
        to: (f) => [{ user: f.recipientId }],
        text: (f, g) => ({ title: `${g === "female" ? "وصلكِ" : "وصلك"} عِرفانٌ من ${f.senderName}`, body: `بمناسبة ${f.season}.` }),
        href: (f) => `/dashboard/irfan?m=${f.messageId}`,
      },
    ],
  }),
  /**
   * **بلاغٌ على رسالة عِرفان** — المستلمُ رأى ما لا يليق. تُطلَق داخل `report_irfan`.
   * - **المستلم**: مقعدا الرئيسين (من يشغلهما الآن). **الدرجة**: مهمّ. **الوجهة**: الرسالةُ نفسُها في الغرفة.
   */
  "irfan.reported": defineKind<{ messageId: number }>({
    section: "irfan",
    when: "بلّغ قائدٌ عن رسالة عِرفان",
    sample: { messageId: 1 },
    audiences: [
      {
        key: "presidents",
        level: "important",
        to: () => [{ seat: "club_president" }, { seat: "executive_council_president" }],
        text: () => ({ title: "بلاغٌ على رسالة عِرفان", body: "افتحها لترى ما بُلِّغ عنه." }),
        href: (f) => `/dashboard/irfan?m=${f.messageId}`,
      },
    ],
  }),
} satisfies Record<string, Kind<unknown>>;

export type KindKey = keyof typeof CATALOG;
export type FactsOf<K extends KindKey> = (typeof CATALOG)[K] extends Kind<infer F> ? F : never;

/** قراءةٌ بمفتاحٍ نصّيّ (الموزِّع والصندوق يقرآن ما في القاعدة). */
export function kindOf(key: string): Kind<unknown> | undefined {
  return (CATALOG as Record<string, Kind<unknown>>)[key];
}

export function catalogEntries(): Array<[string, Kind<unknown>]> {
  return Object.entries(CATALOG as Record<string, Kind<unknown>>);
}

/** صيغةُ المفتاح — توأمُ القيد `notification_events_kind_shape` في القاعدة. */
export const KIND_SHAPE = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;
