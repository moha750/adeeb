// يُستورَد من مكوّنات خادميّة وحدها (page.tsx): مفتاحُ الخدمة لا يصل المتصفّح.
import "server-only";
import { notificationsDb } from "@/lib/notifications/db";
import { emailKindOf } from "@/lib/email/kinds";
import { explainEmailError } from "@/lib/email/errors";
import { asSeenIn, renderLayout } from "@/lib/email/layout";

/**
 * **سجلُّ البريد: ما يُقرأ** (٢٠٢٦-١٠-١٨). `email_outbox` طابورٌ وسجلٌّ معًا (`v2/EMAIL-SYSTEM.md`)، فهذه
 * الغرفةُ نافذتُه: نبضُ البريد، وما تعثّر، وكلُّ رسالةٍ في ثلاثين يومًا.
 *
 * **ولا تخرج حقائقُ الرسالة (`data`) من الخادم أبدًا**: فيها رمزُ الدخول ورابطُه (`token`، `hash`)، ومن
 * قرأهما دخل حسابَ صاحبهما. فيُرسَم منها هنا موضوعُ الرسالة وجهتُها فقط، ويُرمى الباقي.
 */

export type MailStatus = "queued" | "sending" | "sent" | "dead" | "cancelled";

export type MailRow = {
  id: number;
  kind: string;
  subject: string;
  /** اسمُ المستلم إن عُرف (حسابُه أو اسمُه في الرسالة)، وإلّا فعنوانُه. */
  to: string;
  email: string;
  unit: string | null;
  status: MailStatus;
  attempts: number;
  /** سببُ التعثّر بالعربيّة (`explainEmailError`)، حاضرٌ للمتعثّرة وللمنتظرة بعد محاولة. */
  why: string | null;
  createdAt: string;
  sentAt: string | null;
  /** رسالةُ مصادقة: لا تُعرَض ولا تُعاد. */
  auth: boolean;
};

export type MailHealth = {
  /** آخرُ واقعتَي الحارس (`email_watch`): «متعطّل» حتى يقول «عاد». */
  down: boolean;
  lastSentAt: string | null;
  queued: number;
};

export type MailLog = { rows: MailRow[]; health: MailHealth; error: string | null };

const KEY_HINT = "أضِف SUPABASE_SERVICE_ROLE_KEY إلى apps/web/.env.local ثمّ أعِد تشغيل الخادم.";
const WINDOW_DAYS = 30;

type Raw = {
  id: number; kind: string; to_email: string; to_user: string | null; data: Record<string, unknown>;
  status: MailStatus; attempts: number; subject: string | null; last_error: string | null;
  created_at: string; sent_at: string | null;
};

/** موضوعُ الرسالة وجهتُها من قالبها، بلا شيءٍ آخر. ونوعٌ حُذف قالبُه يقع على ما خُزّن ساعةَ الإرسال. */
function face(r: Raw): { subject: string; unit: string | null; name: string | null } {
  const name = typeof r.data?.name === "string" && r.data.name.trim() ? r.data.name.trim() : null;
  try {
    const c = emailKindOf(r.kind)?.render(r.data);
    if (c) return { subject: r.subject ?? c.subject, unit: c.unit ?? null, name };
  } catch { /* حقائقُ ناقصة: يكفي ما خُزّن */ }
  return { subject: r.subject ?? r.kind, unit: null, name };
}

export async function getMailLog(): Promise<MailLog> {
  const empty: MailHealth = { down: false, lastSentAt: null, queued: 0 };
  const sb = notificationsDb();
  if (!sb) return { rows: [], health: empty, error: KEY_HINT };

  const since = new Date(Date.now() - WINDOW_DAYS * 864e5).toISOString();
  const [log, last, queue, watch] = await Promise.all([
    sb.from("email_outbox")
      .select("id, kind, to_email, to_user, data, status, attempts, subject, last_error, created_at, sent_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500),
    // آخرُ ما خرج ولو قبل النافذة: هدوءُ شهرٍ لا يعني أنّ البريد لم يعمل قطّ.
    sb.from("email_outbox").select("sent_at").eq("status", "sent").order("sent_at", { ascending: false }).limit(1),
    sb.from("email_outbox").select("id", { count: "exact", head: true }).in("status", ["queued", "sending"]),
    sb.from("notification_events").select("kind")
      .in("kind", ["system.email_down", "system.email_restored"])
      .order("id", { ascending: false }).limit(1),
  ]);
  if (log.error) return { rows: [], health: empty, error: log.error.message };

  const raw = (log.data ?? []) as Raw[];

  // أسماءُ أصحاب الحسابات من `profiles` لا من الرسالة: من غيّر اسمَه غيّره هنا معه.
  const ids = [...new Set(raw.map((r) => r.to_user).filter((v): v is string => !!v))];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data } = await sb.from("profiles").select("id, full_name").in("id", ids);
    for (const p of (data ?? []) as Array<{ id: string; full_name: string | null }>) {
      if (p.full_name) names.set(p.id, p.full_name);
    }
  }

  const rows: MailRow[] = raw.map((r) => {
    const f = face(r);
    return {
      id: r.id,
      kind: r.kind,
      subject: f.subject,
      to: (r.to_user && names.get(r.to_user)) || f.name || r.to_email,
      email: r.to_email,
      unit: f.unit,
      status: r.status,
      attempts: r.attempts,
      why: r.status === "sent" || r.status === "cancelled" ? null : explainEmailError(r.last_error),
      createdAt: r.created_at,
      sentAt: r.sent_at,
      auth: r.kind.startsWith("auth."),
    };
  });

  const lastSent = (last.data?.[0] as { sent_at: string | null } | undefined)?.sent_at ?? null;
  const watchKind = (watch.data?.[0] as { kind: string } | undefined)?.kind;
  return {
    rows,
    health: { down: watchKind === "system.email_down", lastSentAt: lastSent, queued: queue.count ?? 0 },
    error: null,
  };
}

export type MailDetail = MailRow & {
  /** الخطأُ كما ردّه المزوّد، لمن يلاحقه عند Resend. */
  rawError: string | null;
  provider: string | null;
  providerId: string | null;
  /**
   * الرسالةُ مرسومةً بقالبها اليومَ كما يراها Gmail على الجوّال. و`null` لرسالة المصادقة (فيها رمزُها)، ولردّ
   * التواصل عند من لا يملك `manage_contact` (فيه رسالةُ الزائر، وقفلُ هذه الغرفة غيرُ قفل صندوقها).
   */
  html: string | null;
};

/**
 * رسالةٌ بعينها. **والرسمُ رسمُ اليوم لا نسخةُ يوم الإرسال**: الصادرُ يحفظ الحقائقَ لا الـHTML، فإن تبدّل
 * القالبُ بعدها رُسمت به. وهذا يُقال في الصفحة كي لا يُظنّ أنّها صورةُ ما وصل حرفًا بحرف.
 */
export async function getMail(
  id: number,
  /** قدراتُ القارئ: متنُ ردّ التواصل فيه رسالةُ الزائر، فلا يُرسَم إلّا لمن يقرأ صندوقَ التواصل نفسَه. */
  caps: readonly string[],
): Promise<{ mail: MailDetail | null; error: string | null }> {
  const sb = notificationsDb();
  if (!sb) return { mail: null, error: KEY_HINT };
  const { data, error } = await sb
    .from("email_outbox")
    .select("id, kind, to_email, to_user, data, status, attempts, subject, last_error, created_at, sent_at, provider, provider_id")
    .eq("id", id)
    .maybeSingle();
  if (error) return { mail: null, error: error.message };
  if (!data) return { mail: null, error: null };
  const r = data as Raw & { provider: string | null; provider_id: string | null };

  let name: string | null = null;
  if (r.to_user) {
    const { data: p } = await sb.from("profiles").select("full_name").eq("id", r.to_user).maybeSingle();
    name = (p as { full_name: string | null } | null)?.full_name ?? null;
  }
  const f = face(r);
  const auth = r.kind.startsWith("auth.");

  let html: string | null = null;
  const hidden = auth || (r.kind.startsWith("contact.") && !caps.includes("manage_contact"));
  if (!hidden) {
    try {
      const c = emailKindOf(r.kind)?.render(r.data);
      if (c) html = asSeenIn(renderLayout(c).html, "phone");
    } catch { /* قالبٌ لا يُرسَم بحقائقه: تبقى الحقائقُ وحدَها */ }
  }

  return {
    mail: {
      id: r.id,
      kind: r.kind,
      subject: f.subject,
      to: name || f.name || r.to_email,
      email: r.to_email,
      unit: f.unit,
      status: r.status,
      attempts: r.attempts,
      why: r.status === "sent" || r.status === "cancelled" ? null : explainEmailError(r.last_error),
      createdAt: r.created_at,
      sentAt: r.sent_at,
      auth,
      rawError: r.last_error,
      provider: r.provider,
      providerId: r.provider_id,
      html,
    },
    error: null,
  };
}
