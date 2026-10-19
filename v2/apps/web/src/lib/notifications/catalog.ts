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
import { fmtDateOnly } from "@/lib/dates";
import { positionLine, rankFor } from "@/lib/positionLabel";
import type { Fact, MailMood } from "@/lib/email/layout";
import type { Address, Gender, Level } from "./types";
import { explainEmailError } from "@/lib/email/errors";

/**
 * أقسامُ الإشعار: اسمُها في المعرض، وأيقونتُها من خريطة اللوحة (`ICONS`) لا مخترَعة.
 * و`unit` **الجهةُ المسؤولة** عن بريد القسم (قرار محمد ٢٠٢٦-١٠-١٧): تُكتب في رأس الرسالة وتوقيعها.
 * وقسمٌ بلا جهةٍ يوقّع بريدَه «نادي أدِيب».
 */
export const SECTIONS = {
  system: { label: "النظام", icon: "gear", unit: "قسم نظم المعلومات" },
  news: { label: "الأخبار", icon: "news", unit: null },
  irfan: { label: "عِرفان", icon: "irfan", unit: null },
  contact: { label: "التواصل", icon: "inbox", unit: "الإدارة التنفيذية" },
  positions: { label: "المناصب", icon: "assign", unit: "إدارة الموارد البشرية" },
} as const satisfies Record<string, { label: string; icon: IconKey; unit: string | null }>;

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
  /**
   * **ويصله بريدًا** (٢٠٢٦-١٠-١٧): قناةٌ تُختار للمخاطَب صراحةً لا بالدرجة، فالبريدُ يبقى في صندوقٍ
   * يُرجَع إليه، وهو لما يُحفَظ لا لكلّ تنبيه. والنصُّ نصُّ الجرس نفسُه بجنس قارئه (`email.ts`).
   */
  email?: boolean;
  /**
   * **ما يزيده البريدُ على نصّ الجرس** (٢٠٢٦-١٠-١٧): جملةٌ تفتح الرسالة، والبياناتُ سطورًا (المنصب،
   * والمدّة)، ومزاجُ ديبو فيها (`lib/email/layout.ts`). وبلاه يصل نصُّ الجرس كما هو بعد التحيّة.
   */
  mail?(f: F, g: Gender): { lead?: string; facts?: Fact[]; mood?: MailMood };
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

// ══ المناصب: أدواتُ النصّ ════════════════════════════════════════════════════
/** حقائقُ المقعد كما تكتبها القاعدة (`_position_facts`): رتبةٌ عاريةٌ ووحدتُها. */
type Seat = { rank: string; unit: string | null };
/** «نائب لجنة التأليف» بجنس القارئ: الرتبةُ تُؤنَّث (`rankFor`) والوحدةُ على حالها. */
const seat = (s: Seat, g: Gender) => positionLine(rankFor(s.rank, g), s.unit) ?? s.rank;
/** صيغةُ المذكّر أو المؤنّث، ومن لا جنسَ في ملفّه يأخذ المذكّر. */
const fm = (g: Gender, m: string, f: string) => (g === "female" ? f : m);
/** غرفةُ «حسابي»: حيث يرى العضوُ منصبَه. */
const ACCOUNT = "/dashboard/account";

const SAMPLE_USER = "00000000-0000-0000-0000-000000000000";

export const CATALOG = {
  /**
   * **البريدُ لا يخرج** (٢٠٢٦-١٠-١٧) — يطلقه حارسُ البريد (`email_watch`، كلَّ دقيقة) إن وقفت رسالةٌ في
   * الصادر أكثرَ من دقيقتين، أو رفض المزوّدُ آخرَ ما أُرسل. إنذارٌ واحدٌ للعطل، لا كلَّ دقيقة.
   * - **المستلم**: من يملك `manage_website`. **الدرجة**: حرِج (الجرسُ وشاشةُ القفل)، فرمزُ الدخول يموت
   *   في عشر دقائق. **ولا بريد**: البريدُ هو المعطّل. **الوجهة**: سجلُّ البريد (٢٠٢٦-١٠-١٨)، وفيه النبضُ وما تعثّر.
   */
  "system.email_down": defineKind<{ reason: "stalled" | "rejected"; pending: number; auth: boolean; error: string | null }>({
    section: "system",
    when: "وقف بريدُ أدِيب: رسالةٌ لم تخرج في دقيقتين، أو رفض المزوّدُ ما أُرسل",
    sample: { reason: "stalled", pending: 3, auth: true, error: "Resend 503: service unavailable" },
    audiences: [
      {
        key: "admin",
        level: "critical",
        to: () => [{ capability: "manage_website" }],
        text: (f) => {
          const what = f.auth ? "رسائلُ الدخول" : "رسائلُ البريد";
          const title = f.reason === "stalled" ? `${what} لا تخرج` : `المزوّدُ يرفض ${what}`;
          const parts = [
            f.reason === "stalled" ? `رسائلُ تنتظر أكثرَ من دقيقتين، وعددُها ${f.pending}.` : "ماتت آخرُ رسالةٍ بردٍّ نهائيّ، ولم تخرج بعدها رسالة.",
            f.auth ? "ورمزُ الدخول يموت في عشر دقائق." : "",
            // السببُ بالعربيّة لا ردُّ المزوّد الخام: الإنذارُ يُقرأ على شاشة القفل، والخامُ في صفحة الرسالة.
            f.error ? `السبب: ${explainEmailError(f.error)}.` : "",
          ];
          return { title, body: parts.filter(Boolean).join(" ") };
        },
        href: () => "/dashboard/system/email",
      },
    ],
  }),
  /** **عاد البريد** — يطلقه الحارسُ حين يسلم الصادرُ بعد إنذار. مهمٌّ لا حرِج: الخبرُ طيّب. */
  "system.email_restored": defineKind<{ since: string }>({
    section: "system",
    when: "عاد بريدُ أدِيب يخرج بعد عطلٍ أنذر به الحارس",
    sample: { since: "2026-10-17T12:00:00Z" },
    audiences: [
      {
        key: "admin",
        level: "important",
        to: () => [{ capability: "manage_website" }],
        text: () => ({ title: "عاد البريدُ يخرج", body: "الصادرُ سليم، والرسائلُ تُرسَل كالمعتاد." }),
        href: () => "/dashboard/system/email",
      },
    ],
  }),

  /**
   * **تعليقٌ جديدٌ على خبر** — أوّلُ مدخلٍ في الدليل (٢٠٢٦-١٠-١٦)، وهو شرطُ النشر المباشر للتعليقات:
   * اختار المالكُ أن يُنشَر كلُّ تعليقٍ لحظتَه، بشرط أن يعلم به رئيسُ التحرير فورًا فيحذف ما لا يليق.
   * - **المستلم**: كلُّ من يملك `manage_news`، فمن مُنحها غدًا يصله بلا تعديل. والكاتبُ لا يُشعَر بتعليقه.
   * - **الدرجة**: مهمّ (الجرسُ وشاشةُ القفل)، فالغرضُ السرعةُ، والعددُ قليل.
   * - **الوجهة**: صفحةُ الخبر عند التعليقات، فيراه في مكانه ويحذفه منه.
   */
  "news.comment_posted": defineKind<{ newsTitle: string; slug: string; who: string; excerpt: string }>({
    section: "news",
    when: "نُشر تعليقٌ على خبر",
    sample: {
      newsTitle: "رحلةٌ في عالم التصميم: ورشةٌ ضمن أسبوع اليوم العالميّ",
      slug: "news-sample",
      who: "سارة",
      excerpt: "ورشةٌ ممتعة، شكرًا لنادي أدِيب على التنظيم.",
    },
    audiences: [
      {
        key: "chief",
        level: "important",
        to: () => [{ capability: "manage_news" }],
        text: (f) => ({ title: `تعليقٌ جديد على «${f.newsTitle}»`, body: `${f.who}: ${f.excerpt}` }),
        href: (f) => `/news/${encodeURIComponent(f.slug)}#art-comments`,
      },
    ],
  }),
  /**
   * **رسالةٌ إلى أدِيب** (٢٠٢٦-١٠-١٩) — كتب زائرٌ في «تواصل معنا»، أو ردَّ مُرسِلٌ على ردّنا (`followUp`).
   * - **المستلم**: كلُّ من يملك `manage_contact`: الإدارةُ التنفيذيّة يدُ الصندوق، وحسابُ أدِيب عنوانُه.
   * - **الدرجة**: مهمّ، فرسالةٌ تنتظر جوابًا. **الوجهة**: غرفةُ رسائل التواصل.
   */
  "contact.received": defineKind<{ name: string; subject: string | null; excerpt: string; followUp: boolean }>({
    section: "contact",
    when: "وصلت رسالةُ تواصل، أو ردَّ مُرسِلٌ على ردّنا",
    sample: { name: "ريم", subject: "التسجيل", excerpt: "شكرًا لكم، وهل يشمل التسجيلُ طلابَ الدراسات العليا؟", followUp: true },
    audiences: [
      {
        key: "inbox",
        level: "important",
        to: () => [{ capability: "manage_contact" }],
        text: (f) => ({
          title: f.followUp ? `ردَّ ${f.name} على ردّنا` : `رسالةٌ جديدة من ${f.name}`,
          body: f.subject?.trim() ? `«${f.subject.trim()}»: ${f.excerpt}` : f.excerpt,
        }),
        href: () => "/dashboard/contact",
      },
    ],
  }),
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
   * **أُسند إليك منصب** (٢٠٢٦-١٠-١٧) — تُطلَق داخل `assign_position`، فتصل من كلّ بابٍ يُسنِد:
   * شاشةُ الهيكلة، والانتخابات، وقبولُ المتطوّع عضوًا. ولا تُطلَق لمن كان في المقعد أصلًا.
   * - **المستلم**: صاحبُ المنصب. **الدرجة**: مهمّ، **وبريد**. **الوجهة**: حسابي.
   */
  "position.assigned": defineKind<Seat & { userId: string; from: Seat | null }>({
    section: "positions",
    when: "أُسند منصبٌ إلى عضو، أو نُقل من منصبٍ إلى آخر",
    sample: { userId: SAMPLE_USER, rank: "نائب", unit: "لجنة التأليف", from: { rank: "عضو", unit: "لجنة التأليف" } },
    audiences: [
      {
        key: "holder",
        level: "important",
        email: true,
        to: (f) => [{ user: f.userId }],
        text: (f, g) => ({
          title: `أُسند ${fm(g, "إليك", "إليكِ")} منصب «${seat(f, g)}»`,
          body: f.from ? `${fm(g, "ونُقلتَ", "ونُقلتِ")} إليه من «${seat(f.from, g)}».` : undefined,
        }),
        mail: (f, g) => ({
          mood: "congratulations",
          lead: `${fm(g, "يسرّنا إبلاغك", "يسرّنا إبلاغكِ")} بإسناد منصبٍ ${fm(g, "إليك", "إليكِ")} في نادي أدِيب، وهذه تفاصيله:`,
          facts: [
            { label: "المنصب", value: seat(f, g) },
            ...(f.from ? [{ label: fm(g, "منصبك السابق", "منصبكِ السابق"), value: seat(f.from, g) }] : []),
          ],
        }),
        href: () => ACCOUNT,
      },
    ],
  }),

  /**
   * **أُزيل عنك منصب** — تُطلَق داخل `revoke_position` (ومعها المقعدُ الذي عاد إليه)، وداخل
   * `assign_position` لمن استُبدل بغيره. ولا تُطلَق بانتهاء العضويّة: ذاك خبرُ العضويّة.
   * - **المستلم**: من أُزيل عنه. **الدرجة**: مهمّ، **وبريد**. **الوجهة**: حسابي.
   */
  "position.removed": defineKind<Seat & { userId: string; how: "removed" | "replaced"; back?: Seat | null }>({
    section: "positions",
    when: "أُزيل منصبُ عضو، أو أُسند مقعدُه إلى غيره",
    sample: { userId: SAMPLE_USER, rank: "نائب", unit: "لجنة التأليف", how: "removed", back: { rank: "عضو", unit: "لجنة التأليف" } },
    audiences: [
      {
        key: "holder",
        level: "important",
        email: true,
        to: (f) => [{ user: f.userId }],
        text: (f, g) => ({
          title: `أُزيل ${fm(g, "عنك", "عنكِ")} منصب «${seat(f, g)}»`,
          body: f.back
            ? `${fm(g, "وعُدتَ", "وعُدتِ")} إلى «${seat(f.back, g)}».`
            : f.how === "replaced" ? "أُسند المقعدُ إلى عضوٍ آخر." : undefined,
        }),
        mail: (f, g) => ({
          mood: "announcement",
          lead: `${fm(g, "نُبلغك", "نُبلغكِ")} بتغيّرٍ في ${fm(g, "منصبك", "منصبكِ")} في نادي أدِيب، وهذه تفاصيله:`,
          facts: [
            { label: "المنصبُ الذي أُزيل", value: seat(f, g) },
            ...(f.back ? [{ label: fm(g, "منصبك الآن", "منصبكِ الآن"), value: seat(f.back, g) }] : []),
            ...(f.how === "replaced" ? [{ label: "السبب", value: "أُسند المقعدُ إلى عضوٍ آخر" }] : []),
          ],
        }),
        href: () => ACCOUNT,
      },
    ],
  }),

  /**
   * **كُلِّفتَ بمنصب** — تُطلَق داخل `assign_acting`. أجلُه تاريخٌ، أو عودةُ صاحب المقعد في التكليف
   * التابع. ومعه منصبُ المكلَّف الأصيل إن جُمِّد.
   * - **المستلم**: المكلَّف. **الدرجة**: مهمّ، **وبريد**. **الوجهة**: حسابي.
   */
  "acting.assigned": defineKind<Seat & { userId: string; until: string | null; owner: string | null; frozen: Seat | null }>({
    section: "positions",
    when: "كُلِّف عضوٌ بمنصبٍ مؤقّتًا",
    sample: { userId: SAMPLE_USER, rank: "قائد", unit: "لجنة التصوير", until: "2026-11-30", owner: null, frozen: { rank: "عضو", unit: "لجنة التصوير" } },
    audiences: [
      {
        key: "holder",
        level: "important",
        email: true,
        to: (f) => [{ user: f.userId }],
        text: (f, g) => {
          const term = f.until
            ? `حتّى ${fmtDateOnly(f.until)}.`
            : f.owner ? `حتّى عودة ${f.owner} إلى المقعد.` : "";
          const frozen = f.frozen
            ? ` ${fm(g, "وجُمِّد منصبك", "وجُمِّد منصبكِ")} «${seat(f.frozen, g)}» حتّى ينتهي التكليف.`
            : "";
          return { title: `${fm(g, "كُلِّفتَ", "كُلِّفتِ")} بمنصب «${seat(f, g)}»`, body: (term + frozen).trim() || undefined };
        },
        mail: (f, g) => ({
          mood: "congratulations",
          lead: `${fm(g, "يسرّنا إبلاغك", "يسرّنا إبلاغكِ")} بتكليفٍ مؤقّتٍ في نادي أدِيب، وهذه تفاصيله:`,
          facts: [
            { label: "المنصب", value: seat(f, g) },
            ...(f.until
              ? [{ label: "ينتهي التكليف", value: fmtDateOnly(f.until) }]
              : f.owner ? [{ label: "ينتهي التكليف", value: `بعودة ${f.owner} إلى المقعد` }] : []),
            ...(f.frozen ? [{ label: fm(g, "منصبك الأصيل", "منصبكِ الأصيل"), value: `${seat(f.frozen, g)}، مجمَّدٌ حتّى ينتهي التكليف` }] : []),
          ],
        }),
        href: () => ACCOUNT,
      },
    ],
  }),

  /**
   * **تغيّر أجلُ تكليفك** — تُطلَق داخل `extend_acting`: مدًّا أو تقديمًا.
   * - **المستلم**: المكلَّف. **الدرجة**: مهمّ، **وبريد**. **الوجهة**: حسابي.
   */
  "acting.extended": defineKind<Seat & { userId: string; until: string; was: string | null }>({
    section: "positions",
    when: "عُدِّل آخرُ يومٍ في تكليف",
    sample: { userId: SAMPLE_USER, rank: "قائد", unit: "لجنة التصوير", until: "2026-12-15", was: "2026-11-30" },
    audiences: [
      {
        key: "holder",
        level: "important",
        email: true,
        to: (f) => [{ user: f.userId }],
        text: (f, g) => {
          const earlier = !!f.was && f.until < f.was;
          return {
            title: `${earlier ? "قُدِّم أجلُ" : "مُدِّد"} ${fm(g, "تكليفك", "تكليفكِ")} بمنصب «${seat(f, g)}»`,
            body: `صار آخرُ يومٍ فيه ${fmtDateOnly(f.until)}.`,
          };
        },
        mail: (f, g) => ({
          mood: "announcement",
          lead: `${fm(g, "نُبلغك", "نُبلغكِ")} بتعديل أجل ${fm(g, "تكليفك", "تكليفكِ")} في نادي أدِيب، وهذه تفاصيله:`,
          facts: [
            { label: "المنصب", value: seat(f, g) },
            { label: "آخرُ يومٍ فيه", value: fmtDateOnly(f.until) },
            ...(f.was ? [{ label: "كان آخرُ يوم", value: fmtDateOnly(f.was) }] : []),
          ],
        }),
        href: () => ACCOUNT,
      },
    ],
  }),

  /**
   * **انتهى تكليفك** — تُطلَق داخل `_end_acting`، فتصل من كلّ بابٍ يُنهيه: يدويًّا، وبانقضاء أجله
   * (الكنّاسُ المجدول)، وباستبدال المكلَّف. ومعها المنصبُ الأصيلُ الذي عاد إليه. وتسكت القاعدةُ عن
   * انتهاء العضويّة، وعمّن أخذ المقعدَ أصيلًا (يصله «أُسند إليك»).
   * - **المستلم**: المكلَّف. **الدرجة**: مهمّ، **وبريد**. **الوجهة**: حسابي.
   */
  "acting.ended": defineKind<Seat & { userId: string; how: string; back: Seat | null }>({
    section: "positions",
    when: "انتهى تكليفُ عضو: بيدٍ، أو بانقضاء أجله، أو باستبداله",
    sample: { userId: SAMPLE_USER, rank: "قائد", unit: "لجنة التصوير", how: "expired", back: { rank: "عضو", unit: "لجنة التصوير" } },
    audiences: [
      {
        key: "holder",
        level: "important",
        email: true,
        to: (f) => [{ user: f.userId }],
        text: (f, g) => ({
          title: `${f.how === "expired" ? "انتهت مدّةُ" : "انتهى"} ${fm(g, "تكليفك", "تكليفكِ")} بمنصب «${seat(f, g)}»`,
          body: f.back ? `${fm(g, "وعُدتَ إلى منصبك", "وعُدتِ إلى منصبكِ")} «${seat(f.back, g)}».` : undefined,
        }),
        mail: (f, g) => ({
          mood: "announcement",
          lead: `${fm(g, "نُبلغك", "نُبلغكِ")} بانتهاء ${fm(g, "تكليفك", "تكليفكِ")} في نادي أدِيب، وشكرًا لما ${fm(g, "قدّمتَ", "قدّمتِ")} فيه:`,
          facts: [
            { label: "المنصب", value: seat(f, g) },
            ...(f.back ? [{ label: fm(g, "منصبك الآن", "منصبكِ الآن"), value: seat(f.back, g) }] : []),
          ],
        }),
        href: () => ACCOUNT,
      },
    ],
  }),

  /**
   * **أُسند إليك الإشراف على لجنة** — تُطلَق داخل `assign_supervision`.
   * - **المشرف**: يصله خبرُ إشرافه. **وقائدُ اللجنة** (أصيلًا أو مكلَّفًا): يصله اسمُ مشرفه
   *   (قرار محمد ٢٠٢٦-١٠-١٧: «هو من سيتعامل معه»). **الدرجة**: مهمّ، **وبريد** للاثنين.
   */
  "supervision.assigned": defineKind<{ userId: string; committeeId: number; committee: string; unit: string; name: string; gender: string | null }>({
    section: "positions",
    when: "أُسند إلى عضوٍ في الموارد أو الضمان الإشرافُ على لجنة",
    sample: { userId: SAMPLE_USER, committeeId: 3, committee: "لجنة التأليف", unit: "إدارة الموارد البشرية", name: "سارة محمد العلي", gender: "female" },
    audiences: [
      {
        key: "supervisor",
        level: "important",
        email: true,
        to: (f) => [{ user: f.userId }],
        text: (f, g) => ({ title: `أُسند ${fm(g, "إليك", "إليكِ")} الإشرافُ على ${f.committee}`, body: `عن ${f.unit}.` }),
        mail: (f, g) => ({
          mood: "congratulations",
          lead: `${fm(g, "يسرّنا إبلاغك", "يسرّنا إبلاغكِ")} بإسناد إشرافٍ ${fm(g, "إليك", "إليكِ")} في نادي أدِيب، وهذه تفاصيله:`,
          facts: [
            { label: "اللجنة", value: f.committee },
            { label: "الإشرافُ عن", value: f.unit },
          ],
        }),
        href: () => ACCOUNT,
      },
      {
        key: "leader",
        level: "important",
        email: true,
        to: (f) => [{ seat: "committee_leader", committee: f.committeeId }],
        text: (f, g) => ({
          title: `${f.gender === "female" ? "صارت" : "صار"} ${f.name} ${f.gender === "female" ? "مشرفةً" : "مشرفًا"} على ${fm(g, "لجنتك", "لجنتكِ")}`,
          body: `عن ${f.unit}.`,
        }),
        mail: (f, g) => ({
          mood: "announcement",
          lead: `${fm(g, "نُبلغك", "نُبلغكِ")} بمشرفٍ جديدٍ على ${fm(g, "لجنتك", "لجنتكِ")} في نادي أدِيب، وهذه تفاصيله:`,
          facts: [
            { label: f.gender === "female" ? "المشرفة" : "المشرف", value: f.name },
            { label: "الإشرافُ عن", value: f.unit },
          ],
        }),
        href: () => "/dashboard/committee",
      },
    ],
  }),

  /**
   * **سُحب منك الإشراف** — تُطلَق داخل `revoke_supervision`، وداخل `assign_supervision` لمن استُبدل.
   * - **المشرف**: يصله السحب. **وقائدُ اللجنة**: يصله إلّا في الاستبدال (`replaced`)، فيكفيه خبرُ الجديد.
   */
  "supervision.removed": defineKind<{ userId: string; committeeId: number; committee: string; unit: string; name: string; gender: string | null; replaced: boolean }>({
    section: "positions",
    when: "سُحب الإشرافُ على لجنةٍ من عضو",
    sample: { userId: SAMPLE_USER, committeeId: 3, committee: "لجنة التأليف", unit: "إدارة الموارد البشرية", name: "سارة محمد العلي", gender: "female", replaced: false },
    audiences: [
      {
        key: "supervisor",
        level: "important",
        email: true,
        to: (f) => [{ user: f.userId }],
        text: (f, g) => ({ title: `سُحب ${fm(g, "منك", "منكِ")} الإشرافُ على ${f.committee}`, body: `عن ${f.unit}.` }),
        mail: (f, g) => ({
          mood: "announcement",
          lead: `${fm(g, "نُبلغك", "نُبلغكِ")} بانتهاء ${fm(g, "إشرافك", "إشرافكِ")} في نادي أدِيب، وشكرًا لما ${fm(g, "قدّمتَ", "قدّمتِ")} فيه:`,
          facts: [
            { label: "اللجنة", value: f.committee },
            { label: "الإشرافُ عن", value: f.unit },
          ],
        }),
        href: () => ACCOUNT,
      },
      {
        key: "leader",
        level: "important",
        email: true,
        to: (f) => (f.replaced ? [] : [{ seat: "committee_leader", committee: f.committeeId }]),
        text: (f, g) => ({
          title: `${f.gender === "female" ? "لم تعد" : "لم يعد"} ${f.name} ${f.gender === "female" ? "مشرفةً" : "مشرفًا"} على ${fm(g, "لجنتك", "لجنتكِ")}`,
          body: `عن ${f.unit}.`,
        }),
        mail: (f, g) => ({
          mood: "announcement",
          lead: `${fm(g, "نُبلغك", "نُبلغكِ")} بتغيّرٍ في الإشراف على ${fm(g, "لجنتك", "لجنتكِ")} في نادي أدِيب، وهذه تفاصيله:`,
          facts: [
            { label: f.gender === "female" ? "المشرفةُ السابقة" : "المشرفُ السابق", value: f.name },
            { label: "الإشرافُ عن", value: f.unit },
          ],
        }),
        href: () => "/dashboard/committee",
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
