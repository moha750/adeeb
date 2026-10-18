/**
 * **دليلُ رسائل البريد — المصدرُ الواحد.** لا تخرج من أدِيب رسالةٌ ليس نوعُها هنا.
 *
 * لكلّ نوعٍ مفتاحُه («قسمٌ.نوع»، توأمُ القيد `email_outbox_kind_shape`)، ودالّةٌ ترسم من حقائق الصفّ
 * محتوى الرسالة (`EmailContent`)، وعيّنةٌ يُرسَم بها في المعرض والاختبار. والثوبُ واحدٌ (`layout.ts`).
 *
 * **والرسمُ ساعةَ الإرسال لا ساعةَ الإدراج**: الصفُّ يحفظ الحقائق، والنصُّ يُرسَم حين تخرج الرسالة.
 * فتصحيحُ كلمةٍ هنا يصحّحها في كلّ ما لم يخرج بعد. ونوعٌ حُذف من هنا تموت رسائلُه المنتظرة بخطئها.
 */
import { fmtDate, fmtStamp } from "@/lib/dates";
import { targetHost } from "@/lib/qrLinks";
import type { EmailContent, Fact, MailMood } from "./layout";
import { SITE } from "./layout";

// ══ المصادقة: أدواتُ النصّ ══════════════════════════════════════════════════
/**
 * حقائقُ رسائل المصادقة كما يكتبها خطّافُ `hook_send_email`: الاسمُ والجنسُ من الملفّ، ونوعُ الفعل
 * عند Supabase، والرمزُ وبصمتُه، والوجهةُ بعد التأكيد. وتُمحى من الصادر لحظةَ الإرسال.
 */
type AuthData = {
  name: string | null;
  gender: string | null;
  type: string;
  hash: string | null;
  token: string | null;
  redirect: string | null;
  site: string | null;
  from?: string | null;
  to?: string | null;
};

const AUTH_API = (process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "https://nnlhkfeybyhvlinbqqfa.supabase.co").replace(/\/+$/, "");

/**
 * رابطُ التأكيد — هو نفسُه `{{ .ConfirmationURL }}` الذي كان GoTrue يبنيه: نقطةُ `verify` بالبصمة
 * ونوعِ الفعل، ثمّ يحوّل إلى الوجهة (`/reset-password` مثلًا) بجلسةٍ أو برمز PKCE كما كان تمامًا.
 */
function verifyUrl(d: AuthData): string {
  const u = new URL(`${AUTH_API}/auth/v1/verify`);
  u.searchParams.set("token", d.hash ?? "");
  u.searchParams.set("type", d.type);
  u.searchParams.set("redirect_to", d.redirect || d.site || SITE);
  return u.toString();
}

/** «أدِيبنا محمد،» أو «أدِيبتنا سارة،» — ومن لا اسمَ له «مرحبًا بك،». */
function greet(name: string | null, gender: string | null): string {
  const n = name?.trim();
  if (!n) return "مرحبًا بك،";
  return `${gender === "female" ? "أدِيبتنا" : "أدِيبنا"} ${n}،`;
}
const greeting = (d: AuthData) => greet(d.name, d.gender);

/**
 * **حقائقُ بريد الإشعار** كما يكتبها الموزِّعُ (`lib/notifications/dispatch.ts`): نصُّ الجرس بجنس قارئه،
 * وما يخصّ البريد من مدخل الدليل (`mail`: جملتُه، وبياناتُه سطورًا، ومزاجُ ديبو)، وجهةُ قسمه، واسمُ
 * القارئ للتحيّة.
 */
export type NoteEmail = {
  title: string;
  body: string | null;
  href: string | null;
  unit?: string | null;
  name?: string | null;
  gender?: string | null;
  mood?: MailMood | null;
  lead?: string | null;
  facts?: Fact[] | null;
};

const AUTH_SAMPLE: AuthData = {
  name: "محمد إسماعيل المطر",
  gender: "male",
  type: "recovery",
  hash: "pkce_0123456789abcdef",
  token: "305805",
  redirect: "https://adeeb.club/reset-password",
  site: "https://adeeb.club",
};

/** الجهاتُ كما تُكتب في الرسائل. أسماؤها أسماءُ وحداتها في الهيكلة. */
const IT = "قسم نظم المعلومات";
const HR = "إدارة الموارد البشرية";
const OUTREACH = "قسم التواصل المجتمعي";

const UNASKED = "إن لم تطلب هذا فتجاهل الرسالة، ولن يتغيّر شيء في حسابك.";

export interface EmailKind<D> {
  /** متى تخرج الرسالة، بجملة: يُقرأ في سجلّ البريد والمعرض. */
  when: string;
  sample: D;
  render(d: D): EmailContent;
}

export function defineEmail<D>(k: EmailKind<D>): EmailKind<D> {
  return k;
}

export const EMAIL_KINDS = {
  /**
   * **إشعارٌ بريديّ** — كلُّ مخاطَبٍ في دليل الإشعارات قال `email: true` يصله نصُّ جرسه رسالةً.
   * يرسمه الموزِّعُ بجنس قارئه ساعةَ التوزيع ويحفظه هنا (`lib/notifications/dispatch.ts`).
   */
  "notify.note": defineEmail<NoteEmail>({
    when: "إشعارٌ في النظام مخاطَبُه يتلقّاه بريدًا",
    sample: {
      title: "أُسند إليك منصب «قائد لجنة التأليف»",
      body: "ونُقلتَ إليه من «عضو لجنة التأليف».",
      href: "/dashboard/account",
      unit: HR,
      name: "محمد إسماعيل المطر",
      gender: "male",
      mood: "congratulations",
      lead: "يسرّنا إبلاغك بإسناد منصبٍ جديدٍ إليك في نادي أدِيب، وهذه تفاصيله:",
      facts: [
        { label: "المنصب", value: "قائد لجنة التأليف" },
        { label: "منصبك السابق", value: "عضو لجنة التأليف" },
      ],
    },
    render: (d) => ({
      unit: d.unit ?? null,
      mood: d.mood ?? "announcement",
      facts: d.facts ?? null,
      subject: d.title,
      title: d.title,
      // التحيّةُ أوّلًا ثمّ جملةُ البريد (أو نصُّ الجرس إن لم تكن): رسالةٌ إلى إنسانٍ لا تنبيهُ آلة.
      paragraphs: [greet(d.name ?? null, d.gender ?? null), (d.lead ?? d.body ?? "").trim()].filter(Boolean),
      cta: { label: "افتحه في أدِيب", href: d.href ?? "/dashboard" },
    }),
  }),

  /**
   * **ردُّ نادي أدِيب على رسالة تواصل** — يكتبه صاحبُ `manage_contact` في غرفة التواصل، وتُطلقه
   * `reply_contact_message` في القاعدة مع تسجيل الردّ (معاملةٌ واحدة). و«ردَّ على هذا البريد» يصل
   * الرادَّ نفسَه (`reply_to`). ونصُّ الردّ يبقى بأسطره كما كتبه.
   */
  "contact.reply": defineEmail<{ name: string; reply: string; original: string; subject: string | null; sentAt: string | null; responder: string | null }>({
    when: "ردّ أحدُ أهل اللوحة على رسالةٍ وصلت من نموذج التواصل",
    sample: {
      name: "ريم",
      reply: "أهلًا بكِ، والتسجيلُ مفتوحٌ طوال العام.\nتجدين النموذجَ في صفحة الانضمام.",
      original: "متى يفتح باب التسجيل في النادي؟",
      subject: "التسجيل",
      sentAt: "2026-10-15T09:10:05Z",
      responder: "محمد إسماعيل المطر",
    },
    render: (d) => ({
      unit: OUTREACH,
      mood: "writing",
      subject: d.subject?.trim() ? `ردُّ نادي أدِيب: ${d.subject.trim()}` : "ردُّ نادي أدِيب على رسالتك",
      title: "ردُّنا على رسالتك",
      paragraphs: [`أهلًا ${d.name}،`, "شكرًا لتواصلك مع نادي أدِيب. وهذا ردُّنا على رسالتك:", ...d.reply.split(/\n{2,}/)],
      quote: {
        label: ["رسالتك", d.subject?.trim() ? `«${d.subject.trim()}»` : null, d.sentAt ? fmtDate(d.sentAt) : null]
          .filter(Boolean).join("، "),
        text: d.original,
      },
      note: "إن بقي لديك سؤال فردَّ على هذا البريد مباشرةً، وسيصلنا.",
      signature: `مع التحيّة،\n${d.responder ? `${d.responder}، نادي أدِيب` : "نادي أدِيب"}`,
    }),
  }),

  /**
   * **تبدّلت وجهةُ باركود** — لحاملي قدرة الإشراف (`oversee_qr`)، من صادر تنبيهات الباركود
   * (`qr_alert_outbox` ومنفذُه `api/qr-alerts/drain`)، والإرسالُ مطفأٌ حتى كلمة محمد (`QR_ALERTS_ENABLED`).
   * **ولا يُنقَر رابطُ الوجهة الجديدة**: بريدٌ ينبّه من تصيّدٍ لا يضع رابطَ المُتصيَّد زرًّا.
   */
  "qr.destination_changed": defineEmail<{ linkId: string; title: string; code: string; oldValue: string | null; newValue: string | null; at: string; actor: string | null }>({
    when: "بُدّلت وجهةُ باركودٍ منشور",
    sample: {
      linkId: "sample",
      title: "ملصق الملتقى التعريفيّ",
      code: "majles",
      oldValue: "https://docs.google.com/forms/d/e/1FAIpQLSf/viewform",
      newValue: "https://adeeb-club-login.example.com/verify?u=1",
      at: "2026-09-04T18:41:00Z",
      actor: "محمد إسماعيل المطر",
    },
    render: (d) => ({
      unit: IT,
      mood: "reminder",
      subject: `تبدّلت وجهةُ باركود: ${d.title}`,
      title: "تبدّلت وجهةُ باركود",
      paragraphs: [],
      facts: [
        { label: "الباركود", value: d.title },
        { label: "كانت وجهته", value: d.oldValue ? targetHost(d.oldValue) : "غير معروفة", ltr: !!d.oldValue },
        { label: "صارت", value: d.newValue ? targetHost(d.newValue) : "غير معروفة", ltr: !!d.newValue },
        { label: "بيد", value: d.actor ?? "غير معروف" },
        { label: "الوقت", value: fmtStamp(d.at) },
      ],
      cta: { label: "افتح صفحة الباركود", href: `/dashboard/tools/qr/${encodeURIComponent(d.linkId)}` },
      note: `إن لم تكن تعرف هذا التغيير فأوقِف الباركود من صفحته، ثمّ راجِع صاحبَه. الوجهةُ الجديدة كاملةً: ${d.newValue ?? ""}`,
    }),
  }),

  /**
   * **رمزُ الدخول** — «الدخول بالرمز» في شاشة الدخول وودجةُ الحجز (`magiclink`)، ورمزُ التحقّق
   * (`reauthentication`). الرمزُ ستّةُ أرقام، وعمرُه عشرُ دقائق (`mailer_otp_exp`).
   */
  "auth.code": defineEmail<AuthData>({
    when: "طلب أحدٌ رمزَ دخولٍ أو رمزَ تحقّق",
    sample: { ...AUTH_SAMPLE, type: "magiclink" },
    render: (d) => {
      const verify = d.type === "reauthentication";
      return {
        unit: IT,
        mood: "confident",
        subject: verify ? "رمز التحقّق في نادي أدِيب" : "رمز الدخول إلى نادي أدِيب",
        title: verify ? "رمز التحقّق" : "رمز الدخول",
        paragraphs: [greeting(d), "اكتب هذا الرمز في الصفحة التي طلبتَه منها:"],
        code: d.token,
        facts: [
          { label: "صالحٌ لمدّة", value: "عشر دقائق" },
          { label: "يُستعمل", value: "مرّةً واحدة" },
        ],
        note: `لا تشارك الرمز مع أحد، ولن يطلبه منك أحدٌ من النادي. ${UNASKED}`,
      };
    },
  }),

  /** **استعادةُ كلمة المرور** — من «نسيتُ كلمة المرور». الرابطُ يفتح `/reset-password`. */
  "auth.recovery": defineEmail<AuthData>({
    when: "طلب أحدٌ إعادةَ تعيين كلمة المرور",
    sample: AUTH_SAMPLE,
    render: (d) => ({
      unit: IT,
        mood: "customer-support",
        subject: "إعادة تعيين كلمة المرور في نادي أدِيب",
      title: "إعادة تعيين كلمة المرور",
      paragraphs: [greeting(d), "تلقَّينا طلبًا لإعادة تعيين كلمة المرور لحسابك. اضغط الزرّ لتعيين كلمة مرورٍ جديدة من ثمانية أحرفٍ فأكثر."],
      cta: { label: "عيّن كلمة مرورٍ جديدة", href: verifyUrl(d) },
      facts: [
        { label: "الرابط صالحٌ لمدّة", value: "عشر دقائق" },
        { label: "يُستعمل", value: "مرّةً واحدة" },
      ],
      note: UNASKED,
    }),
  }),

  /**
   * **تغييرُ بريد الدخول: رسالةُ العنوان الحاليّ** — التأكيدُ مزدوج، فصاحبُ العنوان الحاليّ يعلم بما
   * يجري ويؤكّده (فلا يُسلَب حسابٌ من جلسةٍ مسروقةٍ بصمت).
   */
  "auth.email_change_current": defineEmail<AuthData>({
    when: "طلب صاحبُ حسابٍ تغييرَ بريد دخوله: الرسالةُ إلى عنوانه الحاليّ",
    sample: { ...AUTH_SAMPLE, type: "email_change", from: "old@example.com", to: "new@example.com" },
    render: (d) => ({
      unit: IT,
        mood: "explaining",
        subject: "طلب تغيير بريد الدخول في نادي أدِيب",
      title: "تأكيد تغيير بريد الدخول",
      paragraphs: [
        greeting(d),
        "طُلب تغيير بريد الدخول لحسابك.",
        "لا يسري التغيير حتى يُؤكَّد من هذا العنوان ومن العنوان الجديد معًا.",
      ],
      cta: { label: "أؤكّد التغيير", href: verifyUrl(d) },
      facts: [
        { label: "من", value: d.from ?? "عنوانك الحاليّ", ltr: !!d.from },
        { label: "إلى", value: d.to ?? "عنوانٌ جديد", ltr: !!d.to },
      ],
      note: "الرابط صالح عشر دقائق ولمرّةٍ واحدة. إن لم تطلب هذا التغيير فلا تضغط الزرّ، ويبقى دخولك بعنوانك الحاليّ.",
    }),
  }),

  /** **تغييرُ بريد الدخول: رسالةُ العنوان الجديد** — يُثبت بها صاحبُها ملكيّتَه له. */
  "auth.email_change_new": defineEmail<AuthData>({
    when: "طلب صاحبُ حسابٍ تغييرَ بريد دخوله: الرسالةُ إلى العنوان الجديد",
    sample: { ...AUTH_SAMPLE, type: "email_change", from: "old@example.com", to: "new@example.com" },
    render: (d) => ({
      unit: IT,
        mood: "explaining",
        subject: "تأكيد بريد الدخول الجديد في نادي أدِيب",
      title: "تأكيد بريد الدخول الجديد",
      paragraphs: [
        greeting(d),
        "طُلب أن يصير هذا العنوانُ بريدَ الدخول لحسابك في نادي أدِيب. اضغط الزرّ لتُثبت أنّه لك.",
        "بعد التأكيد تدخل بهذا العنوان، وتبقى كلمةُ مرورك كما هي.",
      ],
      cta: { label: "أؤكّد بريدي الجديد", href: verifyUrl(d) },
      facts: [
        { label: "من", value: d.from ?? "عنوانك السابق", ltr: !!d.from },
        { label: "إلى", value: d.to ?? "هذا العنوان", ltr: !!d.to },
      ],
      note: `الرابط صالح عشر دقائق ولمرّةٍ واحدة. ${UNASKED}`,
    }),
  }),

  /**
   * **تأكيدُ البريد** — للتسجيل حين يكون التأكيدُ مطلوبًا، وللدعوة. التأكيدُ التلقائيّ مفعّلٌ اليوم
   * فلا تخرج هذه عادةً، لكنّ الخطّاف لا يترك نوعًا بلا قالب: لو أُطفئ التأكيدُ التلقائيّ يومًا وصلت
   * بعنوانها الصحيح لا بعنوانٍ موروثٍ خاطئ.
   */
  "auth.confirm": defineEmail<AuthData>({
    when: "طُلب تأكيدُ بريد حسابٍ جديد، أو دُعي أحدٌ إلى أدِيب",
    sample: { ...AUTH_SAMPLE, type: "signup" },
    render: (d) => ({
      unit: IT,
        mood: "welcome",
        subject: d.type === "invite" ? "دعوةٌ إلى نادي أدِيب" : "تأكيد بريدك في نادي أدِيب",
      title: d.type === "invite" ? "دعوةٌ إلى نادي أدِيب" : "تأكيد البريد",
      paragraphs: [greeting(d), d.type === "invite" ? "دُعيتَ إلى حسابٍ في نادي أدِيب. اضغط الزرّ لقبول الدعوة." : "اضغط الزرّ لتأكيد بريدك وإتمام حسابك."],
      cta: { label: d.type === "invite" ? "أقبل الدعوة" : "أؤكّد بريدي", href: verifyUrl(d) },
      note: `الرابط صالح عشر دقائق ولمرّةٍ واحدة. ${UNASKED}`,
    }),
  }),

  /** **رسالةُ تجربة** — تُرسَل إلى صاحب النظام ليتحقّق أنّ الطريق كلَّه سليم. */
  "system.test": defineEmail<{ by: string }>({
    when: "طُلبت رسالةُ تجربةٍ للتحقّق من الطريق",
    sample: { by: "محمد" },
    render: (d) => ({
      unit: IT,
        mood: "thumbs-up",
        subject: "رسالةُ تجربة من نادي أدِيب",
      title: "وصلت رسالةُ التجربة",
      paragraphs: [`طلبها ${d.by}. وصولُها يعني أنّ الطريق كلَّه سليم: الصادر، والمُرسِل، والمزوّد.`],
      cta: { label: "افتح أدِيب", href: "/dashboard" },
    }),
  }),


  /**
   * **تجربةُ «الترويجيّة»** (٢٠٢٦-١٠-١٨، مؤقّتة): إشعارُ منصبٍ بعيّنةٍ، برافعةٍ واحدةٍ في كلّ رسالة، يُرسَل إلى
   * محمد ليُعرف ما يُخرجه إلى «الوارد». يُحذف بعد الحكم (انظر `sender` في `layout.ts`).
   */
  "system.trial": defineEmail<{ variant: "sender" | "bare" }>({
    when: "طُلبت رسالةُ تجربةٍ لتبويب Gmail",
    sample: { variant: "sender" },
    render: (d) => {
      const rank = d.variant === "sender" ? "قائد لجنة التصوير" : "نائب لجنة التصوير";
      return {
        subject: `أُسند إليك منصب «${rank}»`,
        title: `أُسند إليك منصب «${rank}»`,
        unit: HR,
        mood: "congratulations",
        paragraphs: ["أدِيبنا محمد إسماعيل المطر،", "يسرّنا إبلاغك بإسناد منصبٍ إليك في نادي أدِيب، وهذه تفاصيله:"],
        facts: [
          { label: "المنصب", value: rank },
          { label: "منصبك السابق", value: "عضو لجنة التصوير" },
        ],
        cta: { label: "افتحه في أدِيب", href: "/dashboard/account" },
        ...(d.variant === "sender" ? { sender: `${HR}، نادي أدِيب`, linkCta: true } : { bare: true }),
      };
    },
  }),
} satisfies Record<string, EmailKind<unknown>>;

export type EmailKindKey = keyof typeof EMAIL_KINDS;
export type EmailDataOf<K extends EmailKindKey> = (typeof EMAIL_KINDS)[K] extends EmailKind<infer D> ? D : never;

export function emailKindOf(key: string): EmailKind<unknown> | undefined {
  return (EMAIL_KINDS as Record<string, EmailKind<unknown>>)[key];
}

export function emailKindEntries(): Array<[string, EmailKind<unknown>]> {
  return Object.entries(EMAIL_KINDS as Record<string, EmailKind<unknown>>);
}

export const EMAIL_KIND_SHAPE = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;
