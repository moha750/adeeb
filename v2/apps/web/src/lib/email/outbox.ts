import "server-only";
import { notificationsDb } from "@/lib/notifications/db";
import { emailKindOf, type EmailDataOf, type EmailKindKey } from "./kinds";
import { renderLayout, senderName } from "./layout";
import { providerConfigured, sendEmail } from "./provider";

/**
 * **الصادر والمُرسِل** (`v2/EMAIL-SYSTEM.md`) — البابُ الواحدُ لكلّ بريدٍ يخرج من أدِيب.
 *
 * - `enqueueEmail`: يكتب الرسالةَ صفًّا في `email_outbox` (والقاعدةُ تطرق المُرسِلَ فورًا).
 * - `drainEmails`: يطالب بما حان، ويرسم كلَّ رسالةٍ بقالبها، ويرسلها، ويختم الصفّ: `sent`، أو يعيدها
 *   إلى الطابور بمهلةٍ متباعدة، أو يُميتها بسببها. والمهلةُ والموتُ يقرّرهما `mark_email_failed` في القاعدة.
 *
 * **ولا يرمي أبدًا**: البريدُ إضافةٌ على الحدث لا شرطٌ له.
 */

type OutboxRow = {
  id: number;
  kind: string;
  to_email: string;
  data: Record<string, unknown>;
  dedupe_key: string | null;
  reply_to: string | null;
  attempts: number;
};

export async function enqueueEmail<K extends EmailKindKey>(
  kind: K,
  to: string,
  data: EmailDataOf<K>,
  opts: { user?: string | null; dedupe?: string | null; expires?: Date | null; replyTo?: string | null } = {},
): Promise<number | null> {
  const sb = notificationsDb();
  if (!sb) return null;
  const { data: id, error } = await sb.rpc("enqueue_email", {
    p_kind: kind,
    p_to: to,
    p_user: opts.user ?? null,
    p_data: data,
    p_dedupe: opts.dedupe ?? null,
    p_expires: opts.expires?.toISOString() ?? null,
    p_reply_to: opts.replyTo ?? null,
  });
  if (error) {
    console.error("[email] enqueue failed", { kind, error: error.message });
    return null;
  }
  return typeof id === "number" ? id : Number(id) || null;
}

export type DrainOutcome = { configured: boolean; claimed: number; sent: number; retrying: number; dead: number };

export async function drainEmails(limit = 20): Promise<DrainOutcome> {
  const out: DrainOutcome = { configured: providerConfigured(), claimed: 0, sent: 0, retrying: 0, dead: 0 };
  // بلا مفتاحٍ لا يُطالَب بشيء: الرسائلُ تنتظر في الطابور سالمةً حتى يُضبط، ولا تأكل محاولاتِها.
  if (!out.configured) return out;
  const sb = notificationsDb();
  if (!sb) return out;

  const { data, error } = await sb.rpc("claim_emails", { p_limit: limit });
  if (error) {
    console.error("[email] claim failed", { error: error.message });
    return out;
  }
  const rows = (data ?? []) as OutboxRow[];
  out.claimed = rows.length;

  for (const row of rows) {
    const kind = emailKindOf(row.kind);
    let subject: string | null = null;
    try {
      if (!kind) throw Object.assign(new Error(`نوعٌ لا يعرفه الدليل: ${row.kind}`), { final: true });
      const content = kind.render(row.data);
      subject = content.subject;
      const { html, text } = renderLayout(content);
      const res = await sendEmail({
        to: row.to_email,
        subject: content.subject,
        html,
        text,
        replyTo: row.reply_to,
        fromName: senderName(content),
        idempotencyKey: row.dedupe_key ? `e:${row.dedupe_key}` : `e:${row.id}`,
      });
      if (res.ok) {
        await sb.rpc("mark_email_sent", { p_id: row.id, p_subject: subject, p_provider: res.provider, p_provider_id: res.id });
        out.sent++;
        continue;
      }
      const status = await fail(sb, row.id, res.error, res.retryable, subject);
      if (status === "queued") out.retrying++;
      else out.dead++;
    } catch (e) {
      // قالبٌ كسرته حقائقُ ناقصة، أو نوعٌ حُذف: لا تُصلحه الإعادة.
      const final = (e as { final?: boolean }).final ?? true;
      const status = await fail(sb, row.id, `render: ${e instanceof Error ? e.message : String(e)}`, !final, subject);
      if (status === "queued") out.retrying++;
      else out.dead++;
    }
  }
  return out;
}

async function fail(
  sb: NonNullable<ReturnType<typeof notificationsDb>>,
  id: number,
  error: string,
  retryable: boolean,
  subject: string | null,
): Promise<string> {
  const { data, error: err } = await sb.rpc("mark_email_failed", {
    p_id: id, p_error: error, p_retryable: retryable, p_subject: subject,
  });
  if (err) console.error("[email] mark failed", { id, error: err.message });
  console.error("[email] send failed", { id, retryable, error: error.slice(0, 200) });
  return typeof data === "string" ? data : "queued";
}
