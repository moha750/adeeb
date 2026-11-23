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
import { fmtDateOnly, fmtStamp } from "@/lib/dates";
import { positionLine } from "@/lib/positionLabel";
import type { Fact, MailMood } from "@/lib/email/layout";
import type { Address, Gender, Level } from "./types";
import { explainEmailError } from "@/lib/email/errors";
import { percentText } from "@/lib/evaluation/score";
import { STALL, REJECT, ENDED, ENDED_SHORT } from "@/app/dashboard/elections/reasons";

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
  // تقييم القيادات (٢٠٢٦-١٠-٢٠): تتولّى تنفيذَ اللائحة إدارةُ الموارد البشريّة (التمهيد)، فتوقّع بريدَه
  evaluation: { label: "تقييم القيادات", icon: "evaluation", unit: "إدارة الموارد البشرية" },
  // الانتخابات (٢٠٢٦-١١-١٧): يديرها مديرو الانتخابات ومشرفو اللجان من الموارد البشريّة، ولا بريدَ لها بعد
  elections: { label: "الانتخابات", icon: "vote", unit: "إدارة الموارد البشرية" },
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
  /**
   * **ويصل الجرسَ؟** (٢٠٢٦-١١-١٧) الأصلُ نعم. فإن قال لا لواقعةٍ بعينها لم يُكتب لها صفٌّ في الصندوق
   * ولا وصلت شاشةَ القفل، ووصل **بريدُها وحده**: لخبرٍ قاله إشعارٌ آخر في الجرس، وبريدُه سجلٌّ رسميّ
   * (إسنادُ المنصب بالفوز، قرار محمد). ولا يُستعمل إلا مع `email: true`، وإلا لم يصل شيء (الحارس يمنعه).
   */
  bell?(f: F): boolean;
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
/** «نائبة لجنة التأليف» بجنس القارئ، و«مشرفة الموارد البشرية» بلا وحدة: القاعدةُ كلُّها في `positionLine`. */
const seat = (s: Seat, g: Gender) => positionLine(s.rank, s.unit, g) ?? s.rank;
/** صيغةُ المذكّر أو المؤنّث، ومن لا جنسَ في ملفّه يأخذ المذكّر. */
const fm = (g: Gender, m: string, f: string) => (g === "female" ? f : m);
/** غرفةُ «حسابي»: حيث يرى العضوُ منصبَه. */
const ACCOUNT = "/dashboard/account";

const SAMPLE_USER = "00000000-0000-0000-0000-000000000000";

// ══ الانتخابات: أدواتُ النصّ (٢٠٢٦-١١-١٧) ═══════════════════════════════════════════════
/** حقائقُ كلِّ واقعة انتخاب: المقعدُ (`_position_facts`)، ومعرّفُ الانتخاب، ووقتُ السطر في السجلّ. */
type Ballot = Seat & { electionId: string; at: string };
/** صاحبُ الترشّح أو من عُيّن: يُخاطَب بمعرّفه، ويُذكَر لغيره باسمه وبجنسه. */
/** `candidate_id` يبقى في حقائق السطر حين يمسّ الحدثُ ترشّحًا (محفّز `election_audit_notify`)، فيُفتح البلاغُ على صفحة الترشّح */
type Person = { userId: string; name: string; female: boolean; candidate_id?: string };
const BALLOT: Ballot = {
  electionId: "11111111-1111-1111-1111-111111111111",
  at: "2026-11-17T09:00:00Z",
  rank: "نائب",
  unit: "لجنة الرواة",
};
const PERSON: Person = { userId: SAMPLE_USER, name: "ريم الأحمد", female: true };
/** اسمُ المقعد بين قوسين، بصيغة المنصب لا بجنس القارئ: «نائب لجنة الرواة». */
const ballotSeat = (f: Seat) => `«${seat(f, null)}»`;
const ELECTIONS = "/dashboard/elections";
/** أبوابُ الانتخاب: غرفةُ من يديره، وأبوابُ العضو الثلاثة (الترشّح، وسجلّ ترشّحي، والتصويت). */
const MANAGE = (f: { electionId: string }) => `${ELECTIONS}/${f.electionId}`;
/** صفحةُ الترشّح للمراجِع (محمد ٢٠٢٦-١١-١٧: «نختار باء»)، وغرفةُ الانتخاب إن غاب الترشّح من الحقائق */
const CANDIDACY = (f: { electionId: string; candidate_id?: string }) => (f.candidate_id ? `${ELECTIONS}/${f.electionId}/candidates/${f.candidate_id}` : MANAGE(f));
const RUN = (f: { electionId: string }) => `${ELECTIONS}/run/${f.electionId}`;
const MY = (f: { electionId: string }) => `${ELECTIONS}/my/${f.electionId}`;
const VOTE = (f: { electionId: string }) => `${ELECTIONS}/vote/${f.electionId}`;

/** أسبابُ التعثّر والاعتذار والانتهاء: مصدرُها `dashboard/elections/reasons.ts` (يقرؤها العميلُ بلا هذا الدليل)،
 *  وتُعاد هنا بأسمائها فلا ينكسر من يستوردها من الدليل. */
export { STALL, REJECT, ENDED, ENDED_SHORT } from "@/app/dashboard/elections/reasons";

/** كيف حُسم المقعد (`_declare_seat`): بالأعلى، أو بعد المادة ٢٧، أو في التعادل (المادة ٢٦). */
const tieNote = (how: string) =>
  how === "tie_earliest" ? " وحُسم التعادل بالأسبقيّة في الترشّح." : how.startsWith("tie_") ? " وحسم المجلس الإداري التعادل." : "";

/** موعدُ الباب المعاد فتحه: من الانتقال (`candidacy_end`) أو من تعديل الموعد (`new_end`). */
const reopenEnd = (f: { candidacy_end?: string; new_end?: string }) => f.candidacy_end ?? f.new_end ?? "";

/** جملةٌ يكتبها المدير بلا نقطة، تُختم قبل أن تتلوها جملة. */
const dot = (t: string) => (/[.!؟]$/.test(t.trim()) ? t.trim() : `${t.trim()}.`);

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
   * **بلاغُ خطأٍ من عضو** (٢٠٢٦-١٠-٣١) — يطلقه زرُّ «أبلغ الدعم الفني» في حالة خطأ الغرفة (`AdRoomError`):
   * العضوُ لا يعرف قناةَ قسم نظم المعلومات، فالموقعُ يوصل البلاغَ بنفسه، بسياقه كاملًا، بضغطةٍ واحدة.
   * - **المستلم**: من يملك `manage_website` — قسمُ نظم المعلومات هو الدعمُ الفنيّ نفسُه (قرار محمد ٢٠٢٦-١٠-٣١).
   *   والمُبلِغُ لا يُشعَر ببلاغه. والغرفةُ ومسارُها من سجلّ الغرف لا من المتصفّح، وبلاغٌ واحدٌ عن الغرفة في ربع ساعة
   *   وثلاثةٌ للعضو (`app/_ad/report.ts`).
   * - **الدرجة**: مهمّ (الجرسُ وشاشةُ القفل): عضوٌ متعطّلٌ الآن. **وبريدًا**: يُحفظ فيُرجَع إليه حين يُتتبَّع.
   * - **الوجهة**: الغرفةُ التي انكسرت، فيراها القسمُ حيث رآها العضو.
   */
  "system.error_report": defineKind<{ room: string; path: string; error: string; who: string; female: boolean; at: string }>({
    section: "system",
    when: "أبلغ عضوٌ الدعمَ الفنيّ عن خطأٍ واجهه في غرفةٍ من اللوحة",
    sample: { room: "غرفة تحرير أدِيب", path: "/dashboard/news", error: "TypeError: fetch failed (getaddrinfo ENOTFOUND db.supabase.co)", who: "محمد إسماعيل المطر", female: false, at: "2026-10-31T19:00:00Z" },
    audiences: [
      {
        key: "support",
        level: "important",
        email: true,
        to: () => [{ capability: "manage_website" }],
        text: (f) => ({
          title: `بلاغُ خطأ: ${f.room}`,
          body: `${f.female ? "أبلغت" : "أبلغ"} ${f.who} أنّ «${f.room}» لم ${f.female ? "تُفتح لها" : "تُفتح له"}. الخطأ: ${f.error}`,
        }),
        mail: (f, g) => ({
          mood: "customer-support",
          lead: `${f.female ? "واجهت" : "واجه"} ${f.who} خطأً في اللوحة ${f.female ? "فأبلغت" : "فأبلغ"} الدعمَ الفنيّ. ${fm(g, "تتبّعه", "تتبّعيه")} بهذه التفاصيل:`,
          facts: [
            { label: "الغرفة", value: f.room },
            { label: "المسار", value: f.path, ltr: true },
            { label: "الوقت", value: fmtStamp(f.at) },
            { label: "الخطأ", value: f.error, ltr: true },
          ],
        }),
        href: (f) => f.path,
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
  "position.assigned": defineKind<Seat & { userId: string; from: Seat | null; down?: boolean; viaElection?: boolean }>({
    section: "positions",
    when: "أُسند منصبٌ إلى عضو، أو نُقل من منصبٍ إلى آخر",
    sample: { userId: SAMPLE_USER, rank: "نائب", unit: "لجنة التأليف", from: { rank: "عضو", unit: "لجنة التأليف" } },
    audiences: [
      {
        key: "holder",
        level: "important",
        email: true,
        // الإسنادُ من الانتخاب (فوزٌ أو تعيينٌ على مقعدٍ متعثّر): خبرُه في الجرس «فزتَ …، وأُسند إليك
        // المنصب» (`election.winner_declared`)، فلا يتكرّر هنا. ويبقى بريدُه سجلًّا رسميًّا (قرار محمد ٢٠٢٦-١١-١٧).
        bell: (f) => !f.viaElection,
        to: (f) => [{ user: f.userId }],
        text: (f, g) => ({
          title: `أُسند ${fm(g, "إليك", "إليكِ")} منصب «${seat(f, g)}»`,
          body: f.from ? `${fm(g, "ونُقلتَ", "ونُقلتِ")} إليه من «${seat(f.from, g)}».` : undefined,
        }),
        // والمقعدُ الأدنى ممّا نُقل منه (`down`، ٢٠٢٦-١٠-٢٣) يُبلَّغ بصيغةٍ محايدة لا تهنئة (قرار محمد)
        mail: (f, g) => ({
          mood: f.down ? "announcement" : "congratulations",
          lead: f.down
            ? `${fm(g, "نُبلغك", "نُبلغكِ")} بتغيّرٍ في ${fm(g, "منصبك", "منصبكِ")} في نادي أدِيب، وهذه تفاصيله:`
            : `${fm(g, "يسرّنا إبلاغك", "يسرّنا إبلاغكِ")} بإسناد منصبٍ ${fm(g, "إليك", "إليكِ")} في نادي أدِيب، وهذه تفاصيله:`,
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
   * **تعذّر تطبيق دفعةٍ مجدولة** (٢٠٢٦-١٠-٢٣) — تُطلَق داخل `run_due_position_batches` حين يحلّ يومُ الدفعة
   * وقد تغيّر الهيكلُ بما يُفسدها، فلا يُطبَّق منها شيء.
   * - **المستلم**: منشئُ الدفعة. **الدرجة**: مهمّ، **وبريد**: قرارٌ لم يسرِ. **الوجهة**: تعيين المناصب.
   */
  "position.batch_failed": defineKind<{ batchId: number; userId: string; effectiveOn: string; failure: string }>({
    section: "positions",
    when: "حلّ يومُ دفعةِ مناصب مجدولة وتعذّر تطبيقها",
    sample: { batchId: 1, userId: SAMPLE_USER, effectiveOn: "2026-11-01", failure: "«منسّق قسم التواصل المجتمعي» يشغله عضوٌ ليس في الدفعة." },
    audiences: [
      {
        key: "creator",
        level: "important",
        email: true,
        to: (f) => [{ user: f.userId }],
        text: () => ({ title: "تعذّر تطبيق تغييرات المناصب المجدولة", body: "تغيّر الهيكلُ قبل يومها، فلم يُطبَّق منها شيء." }),
        mail: (f, g) => ({
          mood: "announcement",
          lead: `حلّ يومُ تغييراتٍ في المناصب ${fm(g, "جدولتَها", "جدولتِها")}، وتعذّر تطبيقُها فلم يُطبَّق منها شيء:`,
          facts: [
            { label: "يومُ السريان", value: fmtDateOnly(f.effectiveOn) },
            { label: "السبب", value: f.failure },
          ],
        }),
        href: () => "/dashboard/members/assignments",
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

  // ══ تقييم القيادات (٢٠٢٦-١٠-٢٠، لائحة تقييم القيادات) ══════════════════════
  // كلُّها تُطلَق من القاعدة (`notify_event`): المؤقّتُ يفتح ويذكّر، ومنفذُ الحكم يستبعد ويُبلغ،
  // ودوالُّ التصحيح تُبلغ. والنسبةُ تُرسم من الكسر نفسِه (`percentText`) لا رقمًا محسوبًا هناك.

  /**
   * **لك تقييمٌ مفتوح** — فتحُ الدورة يومَ 22 من كلّ شهر (م٢/3 بتعديل ٢٠٢٦-١١-٢١). لكلّ من في اللقطة، **وأجلُه الإغلاق**: يغيب بعده.
   * - **الدرجة**: مهمّ (شاشةُ القفل). **الوجهة**: «قيّم القيادات».
   */
  "evaluation.opened": defineKind<{ cycleId: number; closesAt: string; lastDay: string; raters: string[] }>({
    section: "evaluation",
    when: "فُتح التقييمُ الشهريّ للقيادات",
    sample: { cycleId: 1, closesAt: "2026-11-25T21:00:00Z", lastDay: "2026-11-25", raters: [SAMPLE_USER] },
    audiences: [
      {
        key: "rater",
        level: "important",
        to: (f) => f.raters.map((user) => ({ user })),
        // نصُّ «أ» (محمد ٢٠٢٦-١٠-٢٩): الحدثُ باسمه، والمطلوبُ وموعدُه، والطمأنة. كان «لك تقييمٌ مفتوحٌ للقيادات» فلم يُفهم
        text: (f, g) => ({ title: "بدأ التقييم الشهري للقيادات", body: `${fm(g, "قيّم", "قيّمي")} من عليك تقييمهم قبل نهاية ${fmtDateOnly(f.lastDay)}. لا يطّلع على تقييمك إلا الرئيسان.` }),
        href: () => "/dashboard/evaluation/rate",
        expires: (f) => new Date(f.closesAt),
      },
    ],
  }),

  /**
   * **بقي يومٌ على الإغلاق** — قبل الإغلاق بيوم، لمن بقيت له أوراق (المواصفة ٢-٩). وأجلُه الإغلاق.
   */
  "evaluation.reminder": defineKind<{ cycleId: number; closesAt: string; lastDay: string; raters: string[] }>({
    section: "evaluation",
    when: "بقي يومٌ على إغلاق التقييم ولم يُكمل المقيِّمُ تقييماته",
    sample: { cycleId: 1, closesAt: "2026-11-25T21:00:00Z", lastDay: "2026-11-25", raters: [SAMPLE_USER] },
    audiences: [
      {
        key: "rater",
        level: "important",
        to: (f) => f.raters.map((user) => ({ user })),
        text: (f, g) => ({ title: "اليوم آخر أيام التقييم الشهري للقيادات", body: `${fm(g, "بقي لك", "بقي لكِ")} تقييمٌ لم ${fm(g, "تُرسله", "تُرسليه")}، ويُغلق التقييم الليلة. لا يطّلع على تقييمك إلا الرئيسان.` }),
        href: () => "/dashboard/evaluation/rate",
        expires: (f) => new Date(f.closesAt),
      },
    ],
  }),

  /**
   * **حلّ الموعدُ والسابقةُ لم تُنفَّذ** (جدول الحالات الحدّيّة): لا تُفتح الدورة، ويُنبَّه قائدُ الموارد.
   */
  "evaluation.blocked": defineKind<{ cycleId: number; dueOn: string }>({
    section: "evaluation",
    when: "حلّ موعدُ تقييم الشهر وتقييمُ الشهر السابق لم يُنفَّذ",
    sample: { cycleId: 2, dueOn: "2026-12-22" },
    audiences: [
      {
        key: "hr",
        level: "critical",
        to: () => [{ seat: "hr_committee_leader" }],
        text: (f) => ({ title: "لم يُفتح تقييمُ القيادات في موعده", body: `موعدُه ${fmtDateOnly(f.dueOn)}، وتقييمُ الشهر السابق لم يُنفَّذ بعد.` }),
        href: () => "/dashboard/evaluation",
      },
    ],
  }),

  /**
   * **نتيجتك** (م١٠/2) — لكلّ مقيَّمٍ نتيجتُه وحده، باقيًا كان أو بلا نتيجة. والمستبعَدُ خبرُه في الاستبعاد.
   */
  "evaluation.result": defineKind<Seat & { userId: string; targetId: number; cycleId: number; verdict: "kept" | "no_result"; final: [number, number] | null }>({
    section: "evaluation",
    when: "صدرت نتيجةُ مقيَّمٍ وبقي في منصبه، أو لم تُحسب له نتيجة",
    sample: { userId: SAMPLE_USER, targetId: 1, cycleId: 1, rank: "نائب", unit: "لجنة التصوير", verdict: "kept", final: [11, 25] },
    audiences: [
      {
        key: "holder",
        level: "important",
        to: (f) => [{ user: f.userId }],
        text: (f, g) =>
          f.verdict === "kept" && f.final
            ? { title: `${fm(g, "نتيجتك", "نتيجتكِ")} في تقييم القيادات ${percentText({ num: f.final[0], den: f.final[1] })}%`, body: `${fm(g, "وأنت باقٍ", "وأنتِ باقيةٌ")} في منصب «${seat(f, g)}».` }
            : { title: `لا نتيجةَ ${fm(g, "لك", "لكِ")} في تقييم القيادات هذا الشهر`, body: "لم يكتمل ما تُحسب به." },
        href: () => "/dashboard/evaluation/mine",
      },
    ],
  }),

  /**
   * **الاستبعاد** (م٩) — حكمٌ من اللائحة لا بسلطة شخص، فلا فاعلَ له. للمستبعَد (**وبريد**: تغيّرُ منصب)،
   * ولمن يدير التقييم وهم مديرو الانتخابات أنفسُهم (الرئيسان وقائدُ الموارد): خلا المقعد، وفتحُ
   * انتخابه بأيديهم بعد مهلة التصحيح.
   */
  "evaluation.removed": defineKind<Seat & { userId: string; name: string; targetId: number; cycleId: number; final: [number, number]; back: Seat | null; holdUntil: string }>({
    section: "evaluation",
    when: "استُبعد قائدٌ أو نائبٌ أو منسّقٌ بنتيجة 40% أو أقلّ",
    sample: { userId: SAMPLE_USER, name: "سلطان فهد الدوسري", targetId: 6, cycleId: 1, rank: "قائد", unit: "لجنة التنظيم", final: [79, 200], back: { rank: "عضو", unit: "لجنة التنظيم" }, holdUntil: "2026-12-03" },
    audiences: [
      {
        key: "holder",
        level: "important",
        email: true,
        to: (f) => [{ user: f.userId }],
        text: (f, g) => ({
          title: `${fm(g, "استُبعدتَ", "استُبعدتِ")} من منصب «${seat(f, g)}»`,
          body: `${fm(g, "نتيجتك", "نتيجتكِ")} ${percentText({ num: f.final[0], den: f.final[1] })}%${f.back ? `، ${fm(g, "وعُدتَ", "وعُدتِ")} إلى «${seat(f.back, g)}»` : ""}.`,
        }),
        mail: (f, g) => ({
          mood: "announcement",
          lead: `${fm(g, "نُبلغك", "نُبلغكِ")} بنتيجة تقييم القيادات الشهريّ وما ترتّب عليها وفق لائحة تقييم القيادات:`,
          facts: [
            { label: "المنصب", value: seat(f, g) },
            { label: "النتيجة", value: `${percentText({ num: f.final[0], den: f.final[1] })}%` },
            ...(f.back ? [{ label: fm(g, "منصبك الآن", "منصبكِ الآن"), value: seat(f.back, g) }] : []),
          ],
        }),
        href: () => "/dashboard/evaluation/mine",
      },
      {
        key: "managers",
        level: "important",
        to: () => [{ capability: "manage_leader_evaluation" }],
        text: (f) => ({
          title: `استُبعد ${f.name} من «${seat(f, null)}»`,
          body: `خلا المقعد، ولا يُفتح انتخابُه قبل ${fmtDateOnly(f.holdUntil)}.`,
        }),
        href: () => "/dashboard/evaluation",
      },
    ],
  }),

  /** **منسّقٌ مستبعَدٌ ينتظر لجنة** (المسألة ٤): يختار له قائدُ الموارد لجنةً فيُنفَّذ. */
  "evaluation.awaiting_return": defineKind<Seat & { targetId: number; cycleId: number; name: string }>({
    section: "evaluation",
    when: "استُبعد منسّقٌ لا لجنةَ سابقةَ له يعود إليها",
    sample: { targetId: 5, cycleId: 1, name: "فيصل محمد الحمد", rank: "منسّق", unit: "قسم الإنتاج" },
    audiences: [
      {
        key: "managers",
        level: "critical",
        to: () => [{ capability: "manage_leader_evaluation" }],
        text: (f) => ({ title: `استبعادُ ${f.name} ينتظر لجنةً يعود إليها`, body: `من «${seat(f, null)}». اختر اللجنة ليُنفَّذ.` }),
        href: () => "/dashboard/evaluation",
      },
    ],
  }),

  /** **صُحّحت نتيجتك** (م١٠/3) — وما ترتّب: أُعدتَ، أو استُبعدتَ، أو بقي الحكم. **وبريد**: قد يتغيّر المنصب. */
  "evaluation.corrected": defineKind<Seat & { userId: string; name: string; targetId: number; from: string; to: string; outcome: string; final: [number, number] | null }>({
    section: "evaluation",
    when: "صحّحت إدارةُ الموارد نتيجةَ مقيَّم",
    sample: { userId: SAMPLE_USER, name: "سلطان فهد الدوسري", targetId: 6, rank: "قائد", unit: "لجنة التنظيم", from: "removed", to: "kept", outcome: "restored", final: [21, 50] },
    audiences: [
      {
        key: "holder",
        level: "important",
        email: true,
        to: (f) => [{ user: f.userId }],
        text: (f, g) => ({
          title: `صُحّحت ${fm(g, "نتيجتك", "نتيجتكِ")} في تقييم القيادات${f.final ? ` إلى ${percentText({ num: f.final[0], den: f.final[1] })}%` : ""}`,
          body:
            f.outcome === "restored" ? `${fm(g, "وأُعدتَ", "وأُعدتِ")} إلى منصب «${seat(f, g)}».`
            : f.outcome === "removed" ? `${fm(g, "واستُبعدتَ", "واستُبعدتِ")} من منصب «${seat(f, g)}».`
            : f.from === "removed" && f.to !== "removed" ? "وتعذّرت الإعادةُ إلى المنصب." : undefined,
        }),
        href: () => "/dashboard/evaluation/mine",
      },
    ],
  }),

  /** **نصابٌ سقط دورتين** (م٥/4): يُثبته قائدُ الضمان في تقريره إلى المجلس الإداريّ. */
  "evaluation.quorum_missed": defineKind<{ unit: string; cycleId: number; dueOn: string }>({
    section: "evaluation",
    when: "لم يشارك نصفُ الأعضاء في تقييم وحدةٍ شهرين متتاليين",
    sample: { unit: "لجنة الضيافة", cycleId: 2, dueOn: "2026-12-22" },
    audiences: [
      {
        key: "qa",
        level: "important",
        to: () => [{ seat: "qa_committee_leader" }],
        text: (f) => ({ title: `لم يشارك نصفُ الأعضاء في تقييم ${f.unit} شهرين متتاليين`, body: "يُثبَت في تقرير الضمان إلى المجلس الإداري." }),
        href: () => "/dashboard/evaluation",
      },
    ],
  }),

  // ══ الانتخابات (الدفعة الخامسة، ٢٠٢٦-١١-١٧) ════════════════════════════════════════════
  // مصدرُها واحد: كلُّ سطرٍ في سجلّ الانتخاب (`election_audit_log`) يصير واقعةً من هنا، يحوّله محفّزُ
  // `election_audit_notify`. فالحقائقُ حقائقُ السطر، ومعها المقعدُ (رتبةً ووحدة) وصاحبُ الترشّح (اسمُه وجنسُه).
  // والمرجع: نظام الانتخابات، المادة ٧، وقرار محمد: «كلّ من يعنيه الأمر يُبلَّغ بكلّ مرحلة».

  /** **فُتح باب الترشّح** — `open_election`. لناخبي المقعد، ولمن يدير الانتخاب. وأجلُه إغلاقُ الباب. */
  "election.opened": defineKind<Ballot & { candidacy_end: string }>({
    section: "elections",
    when: "فُتح انتخابٌ لمقعدٍ فارغ، وباب الترشّح مفتوح",
    sample: { ...BALLOT, candidacy_end: "2026-11-20T18:00:00Z" },
    audiences: [
      {
        key: "manager",
        level: "normal",
        to: (f) => [{ election_managers: f.electionId }],
        text: (f) => ({ title: `فُتح انتخاب ${ballotSeat(f)}`, body: `يُغلق باب الترشّح ${fmtStamp(f.candidacy_end)}.` }),
        href: (f) => MANAGE(f),
      },
      {
        key: "electorate",
        level: "important",
        to: (f) => [{ electorate: f.electionId }],
        text: (f) => ({ title: `فُتح باب الترشّح لـ${ballotSeat(f)}`, body: `يُغلق ${fmtStamp(f.candidacy_end)}.` }),
        href: (f) => RUN(f),
        expires: (f) => new Date(f.candidacy_end),
      },
    ],
  }),

  /** **تغيّر موعد الإغلاق** — `set_election_deadline`، بسببٍ مكتوب يُبلَّغ به الناخبون (المادة ٢٣). */
  "election.deadline_changed": defineKind<Ballot & { phase: "candidacy" | "voting"; new_end: string; reason: string }>({
    section: "elections",
    when: "عُدّل موعد إغلاق الترشّح أو التصويت",
    sample: { ...BALLOT, phase: "voting", new_end: "2026-11-22T18:00:00Z", reason: "تزامن الموعد مع الاختبارات" },
    audiences: [
      {
        key: "voter",
        level: "important",
        to: (f) => [{ election_candidates: f.electionId }, { electorate: f.electionId }],
        text: (f) => ({
          title: `تغيّر موعد إغلاق ${f.phase === "voting" ? "التصويت" : "الترشّح"} لـ${ballotSeat(f)}`,
          body: `صار ${fmtStamp(f.new_end)}. السبب: ${f.reason}`,
        }),
        href: (f) => (f.phase === "voting" ? VOTE(f) : RUN(f)),
      },
      {
        key: "manager",
        level: "normal",
        to: (f) => [{ election_managers: f.electionId }],
        text: (f) => ({ title: `تغيّر موعد إغلاق ${f.phase === "voting" ? "التصويت" : "الترشّح"} لـ${ballotSeat(f)}`, body: `صار ${fmtStamp(f.new_end)}.` }),
        href: (f) => MANAGE(f),
      },
    ],
  }),

  /** **أُعيد فتح باب الترشّح** — بعد إغلاقه أو تعثّره، بموعدٍ جديد وسبب (المادتان ٢٣ و٢٥). */
  "election.candidacy_reopened": defineKind<Ballot & { candidacy_end?: string; new_end?: string; reason?: string }>({
    section: "elections",
    when: "أُعيد فتح باب الترشّح لمقعد",
    sample: { ...BALLOT, candidacy_end: "2026-11-24T18:00:00Z", reason: "لم يتقدّم أحدٌ في الموعد الأوّل" },
    audiences: [
      {
        key: "electorate",
        level: "important",
        to: (f) => [{ electorate: f.electionId }],
        text: (f) => ({
          title: `أُعيد فتح باب الترشّح لـ${ballotSeat(f)}`,
          body: [reopenEnd(f) ? `يُغلق ${fmtStamp(reopenEnd(f))}.` : "", f.reason ? `السبب: ${f.reason}` : ""].filter(Boolean).join(" ") || undefined,
        }),
        href: (f) => RUN(f),
      },
      {
        key: "manager",
        level: "normal",
        to: (f) => [{ election_managers: f.electionId }],
        text: (f) => ({ title: `أُعيد فتح باب الترشّح لـ${ballotSeat(f)}` }),
        href: (f) => MANAGE(f),
      },
    ],
  }),

  /** **أُغلق باب الترشّح** — بموعده، أو قبله بسبب (المادة ٢٣). المرشّحُ أوّلًا، ثمّ الناخبون. */
  "election.candidacy_closed": defineKind<Ballot & { early?: boolean; reason?: string }>({
    section: "elections",
    when: "أُغلق باب الترشّح لمقعد، بموعده أو قبله",
    sample: { ...BALLOT, early: true, reason: "تقدّم كلّ من أراد الترشّح" },
    audiences: [
      {
        key: "candidate",
        level: "important",
        to: (f) => [{ election_candidates: f.electionId }],
        text: (f, g) => ({
          title: `أُغلق باب الترشّح لـ${ballotSeat(f)}`,
          body: [f.early && f.reason ? `قبل موعده. السبب: ${dot(f.reason)}` : "", `وينتظر ${fm(g, "ترشّحك", "ترشّحكِ")} فتح التصويت.`].filter(Boolean).join(" "),
        }),
        href: (f) => MY(f),
      },
      {
        key: "electorate",
        level: "normal",
        to: (f) => [{ electorate: f.electionId }],
        text: (f) => ({
          title: `أُغلق باب الترشّح لـ${ballotSeat(f)}`,
          body: f.early && f.reason ? `قبل موعده. السبب: ${f.reason}` : undefined,
        }),
        href: (f) => VOTE(f),
      },
    ],
  }),

  /** **التصويت مفتوح** — للناخبين بموعد إغلاقه، وأجلُه إغلاقُه. وللمرشّحين خبرًا. */
  "election.voting_opened": defineKind<Ballot & { votingEnd: string }>({
    section: "elections",
    when: "فُتح التصويت لمقعد",
    sample: { ...BALLOT, votingEnd: "2026-11-22T18:00:00Z" },
    audiences: [
      {
        key: "candidate",
        level: "normal",
        to: (f) => [{ election_candidates: f.electionId }],
        text: (f) => ({ title: `فُتح التصويت لـ${ballotSeat(f)}`, body: `يُغلق ${fmtStamp(f.votingEnd)}.` }),
        href: (f) => MY(f),
      },
      {
        key: "voter",
        level: "important",
        to: (f) => [{ electorate: f.electionId }],
        text: (f, g) => ({ title: `التصويت مفتوح لـ${ballotSeat(f)}`, body: `${fm(g, "صوّت", "صوّتي")} قبل ${fmtStamp(f.votingEnd)}.` }),
        href: (f) => VOTE(f),
        expires: (f) => new Date(f.votingEnd),
      },
    ],
  }),

  /** **أُغلق التصويت قبل موعده** — بيد من يدير الانتخاب، بسببٍ يُبلَّغ به الناخبون (المادة ٢٣). */
  "election.voting_closed_early": defineKind<Ballot & { reason: string }>({
    section: "elections",
    when: "أُغلق التصويت قبل موعده",
    sample: { ...BALLOT, reason: "اكتمل حضور المصوّتين في الاجتماع" },
    audiences: [
      {
        key: "voter",
        level: "normal",
        to: (f) => [{ election_candidates: f.electionId }, { electorate: f.electionId }],
        text: (f) => ({ title: `أُغلق التصويت لـ${ballotSeat(f)} قبل موعده`, body: `السبب: ${f.reason}` }),
        href: (f) => VOTE(f),
      },
    ],
  }),

  /** **أُعلن الفائز** — تعلنه المنصّة لحظة الإغلاق (المادة ٢٨). للفائز تهنئةً، ولغيره خبرًا. */
  "election.winner_declared": defineKind<Ballot & Person & { how: string }>({
    section: "elections",
    when: "أعلنت المنصّة فائز مقعد، وأُسند إليه",
    sample: { ...BALLOT, ...PERSON, how: "top" },
    audiences: [
      {
        key: "winner",
        level: "important",
        to: (f) => [{ user: f.userId }],
        // إشعارٌ جامع (قرار محمد ٢٠٢٦-١١-١٧): الفوزُ والإسنادُ في سطرٍ واحد، و«أُسند إليك منصب» لا يصل الجرس.
        text: (f, g) => ({
          title: `${fm(g, "فزتَ", "فزتِ")} بمقعد ${ballotSeat(f)}، وأُسند ${fm(g, "إليك", "إليكِ")} المنصب`,
          body: tieNote(f.how).trim() || undefined,
        }),
        href: () => ACCOUNT,
      },
      {
        key: "announce",
        level: "normal",
        to: (f) => [{ election_candidates: f.electionId }, { electorate: f.electionId }, { election_managers: f.electionId }],
        text: (f) => ({ title: `${f.female ? "فازت" : "فاز"} ${f.name} بمقعد ${ballotSeat(f)}`, body: tieNote(f.how).trim() || undefined }),
        href: (f) => VOTE(f),
      },
    ],
  }),

  /** **أُلغي الانتخاب** — بقرارٍ مكتوب بسببه (المادة ٢٩). */
  "election.cancelled": defineKind<Ballot & { reason: string }>({
    section: "elections",
    when: "أُلغي انتخاب مقعد",
    sample: { ...BALLOT, reason: "فُتح بالخطأ" },
    audiences: [
      {
        key: "candidate",
        level: "important",
        to: (f) => [{ election_candidates: f.electionId }],
        text: (f) => ({ title: `أُلغي انتخاب ${ballotSeat(f)}`, body: `السبب: ${f.reason}` }),
        href: (f) => MY(f),
      },
      {
        key: "electorate",
        level: "normal",
        to: (f) => [{ electorate: f.electionId }, { election_managers: f.electionId }],
        text: (f) => ({ title: `أُلغي انتخاب ${ballotSeat(f)}`, body: `السبب: ${f.reason}` }),
        href: () => ELECTIONS,
      },
    ],
  }),

  /** **تعثّر الانتخاب** — ينتظر قرار من يديره: إعادة فتح الباب، أو التعيين، أو الإلغاء (المادة ٢٥). */
  "election.stalled": defineKind<Ballot & { reason: string }>({
    section: "elections",
    when: "تعثّر انتخاب مقعد",
    sample: { ...BALLOT, reason: "no_votes" },
    audiences: [
      {
        key: "manager",
        level: "important",
        to: (f) => [{ election_managers: f.electionId }],
        text: (f, g) => ({
          title: `تعثّر انتخاب ${ballotSeat(f)}`,
          body: `${STALL[f.reason] ?? "تعثّر الانتخاب"}. ${fm(g, "اختر", "اختاري")}: إعادة فتح الباب، أو التعيين، أو الإلغاء.`,
        }),
        href: (f) => MANAGE(f),
      },
    ],
  }),

  /** **عُيّن شاغلٌ للمقعد المتعثّر** — بيد مديري الانتخابات الثلاثة وحدهم (المادة ٢٥). */
  "election.appointed": defineKind<Ballot & Person & { reason: string }>({
    section: "elections",
    when: "عُيّن عضوٌ في مقعدٍ تعثّر انتخابه",
    sample: { ...BALLOT, ...PERSON, reason: "لم يتقدّم أحدٌ بعد إعادة فتح الباب" },
    audiences: [
      {
        key: "appointee",
        level: "important",
        to: (f) => [{ user: f.userId }],
        text: (f, g) => ({ title: `${fm(g, "عُيّنتَ", "عُيّنتِ")} في مقعد ${ballotSeat(f)}`, body: `السبب: ${f.reason}` }),
        href: () => ACCOUNT,
      },
      {
        key: "announce",
        level: "normal",
        to: (f) => [{ election_candidates: f.electionId }, { electorate: f.electionId }, { election_managers: f.electionId }],
        text: (f) => ({ title: `${f.female ? "عُيّنت" : "عُيّن"} ${f.name} في مقعد ${ballotSeat(f)}` }),
        href: () => ELECTIONS,
      },
    ],
  }),

  /** **كُلّف عضوٌ بالمقعد والانتخاب قائم** (المادة ٨). وصاحبُ التكليف يصله `acting.assigned`. */
  "election.acting_appointed": defineKind<Ballot & Person>({
    section: "elections",
    when: "كُلّف عضوٌ بمقعدٍ تعثّر انتخابه، والانتخاب قائم",
    sample: { ...BALLOT, ...PERSON },
    audiences: [
      {
        key: "announce",
        level: "normal",
        to: (f) => [{ election_candidates: f.electionId }, { electorate: f.electionId }],
        text: (f) => ({ title: `${f.female ? "كُلّفت" : "كُلّف"} ${f.name} بمقعد ${ballotSeat(f)}`, body: "والانتخاب قائم." }),
        href: () => ELECTIONS,
      },
    ],
  }),

  /** **تعادلٌ ينتظر المجلس** — يقرّره المجلس الإداري خلال ٢٤ ساعة، وإلا فاز الأسبق (المادة ٢٦). */
  "election.tie_opened": defineKind<Ballot & { due_at: string }>({
    section: "elections",
    when: "تعادل المتصدّرون في مقعد، والقرار للمجلس الإداري",
    sample: { ...BALLOT, due_at: "2026-11-23T18:00:00Z" },
    audiences: [
      {
        key: "council",
        level: "important",
        to: () => [{ council: true }],
        text: (f, g) => ({
          title: `تعادلٌ في مقعد ${ballotSeat(f)} ينتظر قرار المجلس`,
          body: `${fm(g, "اختر", "اختاري")} قبل ${fmtStamp(f.due_at)} بسببٍ مكتوب، وإلا فاز أسبقُ المتعادلين ترشّحًا.`,
        }),
        href: (f) => MANAGE(f),
        expires: (f) => new Date(f.due_at),
      },
    ],
  }),

  /**
   * **بطلت الأصوات** — بانتهاء ترشّح من صُوّت له بعد فتح التصويت (المادة ١٦). لأصحابها، يُعرفون لحظة
   * التوزيع من عنوانهم لا من الواقعة. ولمن يدير الانتخاب إن احتاج أن يفتح إعادة التصويت، بلا عدد:
   * المجاميعُ لا تُرى قبل الإغلاق (المادة ٥).
   */
  "election.votes_voided": defineKind<Ballot & { reason: "candidacy_ended" | "single_left" | "reopened"; candidate_id?: string; needsRevote: boolean }>({
    section: "elections",
    when: "بطلت أصواتٌ بانتهاء ترشّح من صُوّت له",
    sample: { ...BALLOT, reason: "candidacy_ended", candidate_id: SAMPLE_USER, needsRevote: true },
    audiences: [
      {
        key: "voter",
        level: "important",
        to: (f) =>
          f.reason === "reopened"
            ? []
            : [{ voided_voters: f.electionId, reason: f.reason, at: f.at, ...(f.candidate_id ? { candidate: f.candidate_id } : {}) }],
        text: (f, g) => ({
          title: `بطل ${fm(g, "صوتك", "صوتكِ")} لـ${ballotSeat(f)}`,
          body:
            f.reason === "single_left"
              ? "لم يبقَ إلا مرشّحٌ واحد، فيُعاد التصويت تصويتَ ثقة بموعدٍ يُعلَن."
              : f.needsRevote
                ? `انتهى ترشّح من ${fm(g, "صوّتَّ", "صوّتِّ")} له، ويُفتح ${fm(g, "لك", "لكِ")} التصويت من جديد بموعدٍ يُعلَن.`
                : `انتهى ترشّح من ${fm(g, "صوّتَّ", "صوّتِّ")} له، ${fm(g, "فصوّت", "فصوّتي")} من جديد قبل إغلاق التصويت.`,
        }),
        href: (f) => VOTE(f),
      },
      {
        key: "manager",
        level: "important",
        to: (f) => (f.needsRevote ? [{ election_managers: f.electionId }] : []),
        text: (f, g) => ({
          title: `${fm(g, "حدّد", "حدّدي")} موعد إعادة التصويت لـ${ballotSeat(f)}`,
          body:
            f.reason === "single_left"
              ? "لم يبقَ إلا مرشّحٌ واحد، فبطلت الأصوات كلّها، ويُعاد التصويت تصويتَ ثقة."
              : "انتهى ترشّحٌ بعد إغلاق التصويت فبطلت أصوات من صوّتوا له، ويُعاد التصويت لهم وحدهم.",
        }),
        href: (f) => MANAGE(f),
      },
    ],
  }),

  /** **أُعيد فتح التصويت** — لمن بطل صوته وحده، أو للناخبين كلّهم إن أُعيد تزكيةً (المادة ١٦). */
  "election.revote_opened": defineKind<Ballot & { kind: "partial" | "full"; voting_end: string; reason: string }>({
    section: "elections",
    when: "أُعيد فتح التصويت بعد بطلان أصوات",
    sample: { ...BALLOT, kind: "partial", voting_end: "2026-11-23T18:00:00Z", reason: "استُبعد مرشّحٌ بعد إغلاق التصويت" },
    audiences: [
      {
        key: "voter",
        level: "important",
        to: (f) => (f.kind === "partial" ? [{ revote_voters: f.electionId }] : [{ electorate: f.electionId }]),
        text: (f, g) => ({
          title: `أُعيد فتح التصويت لـ${ballotSeat(f)}`,
          body: `${fm(g, "صوّت", "صوّتي")} قبل ${fmtStamp(f.voting_end)}. السبب: ${f.reason}`,
        }),
        href: (f) => VOTE(f),
        expires: (f) => new Date(f.voting_end),
      },
    ],
  }),

  /** **ترشّحٌ جديد** — ينتظر مراجعة من يدير الانتخاب. */
  "election.candidacy_submitted": defineKind<Ballot & Person>({
    section: "elections",
    when: "تقدّم عضوٌ بترشّحه",
    sample: { ...BALLOT, ...PERSON },
    audiences: [
      {
        key: "manager",
        level: "normal",
        to: (f) => [{ election_managers: f.electionId }],
        text: (f) => ({ title: `ترشّحٌ جديد لـ${ballotSeat(f)}`, body: `${f.female ? "تقدّمت" : "تقدّم"} ${f.name}، وينتظر المراجعة.` }),
        href: (f) => CANDIDACY(f),
      },
    ],
  }),

  /** **عُدّل ترشّحٌ** — بعد طلب التعديل، فيعود إلى المراجعة (المادة ١٤). */
  "election.candidacy_resubmitted": defineKind<Ballot & Person>({
    section: "elections",
    when: "عدّل مرشّحٌ ترشّحه بعد طلب التعديل",
    sample: { ...BALLOT, ...PERSON },
    audiences: [
      {
        key: "manager",
        level: "normal",
        to: (f) => [{ election_managers: f.electionId }],
        text: (f) => ({ title: `${f.female ? "عدّلت" : "عدّل"} ${f.name} ${f.female ? "ترشّحها" : "ترشّحه"} لـ${ballotSeat(f)}`, body: "وينتظر المراجعة." }),
        href: (f) => CANDIDACY(f),
      },
    ],
  }),

  /** **قرار المراجعة** — اعتماد، أو طلب تعديل بمهلة، أو اعتذار بسببٍ من الثلاثة (المادة ١٤). */
  "election.candidacy_reviewed": defineKind<
    Ballot & Person & { new_status: "approved" | "needs_edit" | "rejected"; note?: string | null; edit_due?: string; reject_reason?: string }
  >({
    section: "elections",
    when: "رُوجع ترشّح: اعتُمد، أو طُلب تعديله، أو اعتُذر عنه",
    sample: { ...BALLOT, ...PERSON, new_status: "needs_edit", note: "أضف خطّتك للّجنة في البيان", edit_due: "2026-11-19T18:00:00Z" },
    audiences: [
      {
        key: "candidate",
        level: "important",
        to: (f) => [{ user: f.userId }],
        text: (f, g) => {
          const yours = fm(g, "ترشّحك", "ترشّحكِ");
          if (f.new_status === "approved") {
            return { title: `اعتُمد ${yours} لـ${ballotSeat(f)}`, body: `${fm(g, "يراك", "يراكِ")} أعضاء اللجنة الآن ${fm(g, "مرشّحًا", "مرشّحةً")}.` };
          }
          if (f.new_status === "needs_edit") {
            return {
              title: `مطلوبٌ تعديل ${yours} لـ${ballotSeat(f)}`,
              body: [f.note ? dot(f.note) : "", f.edit_due ? `${fm(g, "عدّله", "عدّليه")} قبل ${fmtStamp(f.edit_due)}، وإلا انتهى ${yours}.` : ""].filter(Boolean).join(" "),
            };
          }
          return {
            title: `اعتُذر عن ${yours} لـ${ballotSeat(f)}`,
            body: [f.reject_reason ? REJECT(f.reject_reason, g) : "", f.note ?? ""].filter(Boolean).join(". ") || undefined,
          };
        },
        href: (f) => MY(f),
      },
    ],
  }),

  /** **انسحب مرشّح** — والانسحابُ بيده وحده (المادة ١٥). */
  "election.candidacy_withdrawn": defineKind<Ballot & Person>({
    section: "elections",
    when: "انسحب مرشّحٌ من ترشّحه",
    sample: { ...BALLOT, ...PERSON },
    audiences: [
      {
        key: "manager",
        level: "normal",
        to: (f) => [{ election_managers: f.electionId }],
        text: (f) => ({ title: `${f.female ? "انسحبت" : "انسحب"} ${f.name} من الترشّح لـ${ballotSeat(f)}` }),
        href: (f) => MANAGE(f),
      },
    ],
  }),

  /** **أُرجع ترشّح** — بيد من يدير الانتخاب، بسببٍ مكتوب (المادة ١٥). */
  "election.candidacy_restored": defineKind<Ballot & Person & { reason?: string | null }>({
    section: "elections",
    when: "أُرجع ترشّحٌ بعد انسحابٍ أو اعتذار",
    sample: { ...BALLOT, ...PERSON, reason: "كان الانسحاب بالخطأ، وطُلب الإرجاع" },
    audiences: [
      {
        key: "candidate",
        level: "important",
        to: (f) => [{ user: f.userId }],
        text: (f, g) => ({
          title: `أُعيد ${fm(g, "ترشّحك", "ترشّحكِ")} لـ${ballotSeat(f)}`,
          body: ["وهو قيد المراجعة.", f.reason ? `السبب: ${f.reason}` : ""].filter(Boolean).join(" "),
        }),
        href: (f) => MY(f),
      },
    ],
  }),

  /** **انتهى ترشّح** — بسببه من أسبابه (المواد ١١ و١٤ و١٦ و١٧ و٢٥ و٢٧). */
  "election.candidacy_ended": defineKind<Ballot & Person & { reason: string; note?: string }>({
    section: "elections",
    when: "انتهى ترشّحٌ بسببٍ من أسبابه",
    sample: { ...BALLOT, ...PERSON, reason: "excluded", note: "ثبتت الدعوة من قناة أدِيب الرسمية" },
    audiences: [
      {
        key: "candidate",
        level: "important",
        to: (f) => [{ user: f.userId }],
        text: (f, g) => ({
          title: `انتهى ${fm(g, "ترشّحك", "ترشّحكِ")} لـ${ballotSeat(f)}`,
          body: [ENDED(f.reason, g), f.note ?? ""].filter(Boolean).join(". "),
        }),
        href: (f) => MY(f),
      },
      {
        key: "manager",
        level: "normal",
        to: (f) => [{ election_managers: f.electionId }],
        text: (f) => ({ title: `انتهى ترشّح ${f.name} لـ${ballotSeat(f)}`, body: ENDED_SHORT[f.reason] }),
        href: (f) => MANAGE(f),
      },
    ],
  }),

  /** **طلبُ تجميد ينتظر موافقة قائد الموارد** — من عضوٍ في الإدارة (المادة ١٦). ولا يعرف المرشّحُ من طلبه. */
  "election.freeze_requested": defineKind<Ballot & Person & { reason: string }>({
    section: "elections",
    when: "طلب عضوٌ في الموارد البشرية استبعاد ترشّح",
    sample: { ...BALLOT, ...PERSON, reason: "دعا لنفسه من قناة أدِيب الرسمية" },
    audiences: [
      {
        key: "hr_leader",
        level: "important",
        to: () => [{ seat: "hr_committee_leader" }],
        text: (f, g) => ({ title: `طلبُ استبعاد ترشّح ${f.name} ينتظر ${fm(g, "موافقتك", "موافقتكِ")}`, body: `لـ${ballotSeat(f)}. السبب: ${f.reason}` }),
        href: (f) => CANDIDACY(f),
      },
    ],
  }),

  /** **جُمّد ترشّحك** — ويُمهَل ليجيب، فإن لم يجب استُبعد (المادة ١٦). */
  "election.candidacy_frozen": defineKind<Ballot & Person & { reason: string; answer_due: string }>({
    section: "elections",
    when: "أُمهل مرشّحٌ ليُجيب قبل استبعاده لمخالفة ضوابط الدعاية",
    sample: { ...BALLOT, ...PERSON, reason: "دعا لنفسه من قناة أدِيب الرسمية", answer_due: "2026-11-19T12:00:00Z" },
    audiences: [
      {
        key: "candidate",
        level: "critical",
        to: (f) => [{ user: f.userId }],
        text: (f, g) => ({
          title: `طُلب استبعاد ${fm(g, "ترشّحك", "ترشّحكِ")} لـ${ballotSeat(f)}`,
          body: `السبب: ${f.reason}. ${fm(g, "أجب", "أجيبي")} قبل ${fmtStamp(f.answer_due)}، وإلا استُبعد ${fm(g, "ترشّحك", "ترشّحكِ")}.`,
        }),
        href: (f) => MY(f),
        expires: (f) => new Date(f.answer_due),
      },
    ],
  }),

  /** **أجاب المجمَّد** — والقرارُ لقائد الموارد في أجله، وإلا رُفع التجميد (المادة ١٦). */
  "election.freeze_answered": defineKind<Ballot & Person & { decide_due: string }>({
    section: "elections",
    when: "أجاب المرشّح عن طلب استبعاده",
    sample: { ...BALLOT, ...PERSON, decide_due: "2026-11-20T12:00:00Z" },
    audiences: [
      {
        key: "hr_leader",
        level: "important",
        to: () => [{ seat: "hr_committee_leader" }],
        text: (f, g) => ({
          title: `${f.female ? "أجابت" : "أجاب"} ${f.name} عن طلب استبعاد ${f.female ? "ترشّحها" : "ترشّحه"} لـ${ballotSeat(f)}`,
          body: `${fm(g, "قرّر", "قرّري")} قبل ${fmtStamp(f.decide_due)}، وإلا بقي الترشّح.`,
        }),
        href: (f) => CANDIDACY(f),
        expires: (f) => new Date(f.decide_due),
      },
    ],
  }),

  /** **رُفع التجميد** — بقرار الموارد، أو لمضيّ أجل القرار (المادة ١٦). */
  "election.freeze_lifted": defineKind<Ballot & Person & { outcome: string; reason: string }>({
    section: "elections",
    when: "بقي ترشّحٌ بعد طلب استبعاده",
    sample: { ...BALLOT, ...PERSON, outcome: "lifted", reason: "لم تثبت المخالفة بعد التحقّق" },
    audiences: [
      {
        key: "candidate",
        level: "important",
        to: (f) => [{ user: f.userId }],
        text: (f, g) => ({
          title: `بقي ${fm(g, "ترشّحك", "ترشّحكِ")} لـ${ballotSeat(f)}، ولم ${fm(g, "تُستبعد", "تُستبعدي")}`,
          body: f.outcome === "auto_lifted" ? "مضى أجل القرار ولم تقرّر الإدارة." : `السبب: ${f.reason}`,
        }),
        href: (f) => MY(f),
      },
    ],
  }),

  /** **بقي ترشّحك** — نُقل منصبُ المرشّح خارج نطاق المقعد بغير طلبه (المادة ١٧). */
  "election.candidacy_kept": defineKind<Ballot & Person>({
    section: "elections",
    when: "نُقل منصب مرشّحٍ خارج نطاق مقعده بغير طلبه",
    sample: { ...BALLOT, ...PERSON },
    audiences: [
      {
        key: "candidate",
        level: "normal",
        to: (f) => [{ user: f.userId }],
        text: (f, g) => ({
          title: `بقي ${fm(g, "ترشّحك", "ترشّحكِ")} لـ${ballotSeat(f)}`,
          body: `نُقل ${fm(g, "منصبك", "منصبكِ")} خارج نطاقه بغير ${fm(g, "طلبك", "طلبكِ")}، فبقي ${fm(g, "ترشّحك", "ترشّحكِ")} (المادة 17).`,
        }),
        href: (f) => MY(f),
      },
    ],
  }),

  /** **تعذّر الإعلان** — خطأٌ في المنصّة منع إعلان الفائز. لمن يدير الانتخاب ولمن يدير الموقع. */
  "election.resolve_failed": defineKind<Ballot & { error: string }>({
    section: "elections",
    when: "تعذّر على المنصّة إعلان فائز مقعد",
    sample: { ...BALLOT, error: "تعذّر إسناد منصب الفائز" },
    audiences: [
      {
        key: "manager",
        level: "critical",
        to: (f) => [{ election_managers: f.electionId }, { capability: "manage_website" }],
        text: (f) => ({ title: `تعذّر إعلان فائز ${ballotSeat(f)}`, body: "خطأٌ في المنصّة يمنع الإعلان، وأُبلغ به قسم نظم المعلومات." }),
        href: (f) => MANAGE(f),
      },
    ],
  }),

  /** **الحرمان من الترشّح** — قرار رئيس أدِيب بأجلٍ لا يجاوز سنة (المادة ١١). */
  "election.candidacy_banned": defineKind<{ userId: string; until: string; reason: string }>({
    section: "elections",
    when: "حرم رئيس أدِيب عضوًا من الترشّح",
    sample: { userId: SAMPLE_USER, until: "2026-12-17", reason: "خالف ضوابط الدعاية مرّاتٍ متتالية" },
    audiences: [
      {
        key: "member",
        level: "important",
        to: (f) => [{ user: f.userId }],
        text: (f, g) => ({
          title: `${fm(g, "حُرمتَ", "حُرمتِ")} من الترشّح حتى ${fmtDateOnly(f.until)}`,
          body: `بقرار رئيس أدِيب. السبب: ${f.reason}. ${fm(g, "ولك", "ولكِ")} أن ${fm(g, "تتظلّم", "تتظلّمي")} منه كتابةً.`,
        }),
        href: () => ACCOUNT,
      },
    ],
  }),

  /** **رُفع الحرمان** — بقرار رئيس أدِيب بسببٍ مكتوب. */
  "election.candidacy_ban_lifted": defineKind<{ userId: string; reason: string }>({
    section: "elections",
    when: "رفع رئيس أدِيب حرمان عضوٍ من الترشّح",
    sample: { userId: SAMPLE_USER, reason: "ظهر أنّ المنشورات ليست منه" },
    audiences: [
      {
        key: "member",
        level: "important",
        to: (f) => [{ user: f.userId }],
        text: (f, g) => ({ title: `رُفع ${fm(g, "حرمانك", "حرمانكِ")} من الترشّح`, body: `السبب: ${f.reason}` }),
        href: () => ACCOUNT,
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
