// يُستورَد من مكوّنات خادميّة وحدها (page.tsx) — المفتاح بلا بادئة NEXT_PUBLIC فلا يصل المتصفّح.
import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";
import { asStatus, type ContactStatus } from "@/lib/contact/vocab";

/**
 * **دورٌ في المحادثة** (٢٠٢٦-١٠-١٩) — ردٌّ منّا (`out`) أو ردٌّ من المُرسِل على ردّنا (`in`)، من `contact_turns`.
 * ورسالتُه الأولى ليست دورًا: هي `message` في الصفّ نفسه.
 */
export type ContactTurn = {
  id: string;
  direction: "in" | "out";
  body: string;
  at: string;
  /** اسمُ من ردَّ منّا — أثرٌ داخليّ يُرى هنا ولا يخرج في البريد. */
  by: string | null;
  /** عنوانُ المُرسِل إن ردَّ من بريدٍ غير بريد رسالته الأولى. */
  otherEmail: string | null;
};

/** رسالةُ زائرٍ كما تُقرأ في اللوحة — صفٌّ من `contact_messages` ومحادثتُه بعدها. */
export type ContactRow = {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  status: ContactStatus;
  notes: string | null;
  createdAt: string;
  /** الأدوارُ بعد الرسالة الأولى، الأقدمُ أوّلًا. */
  turns: ContactTurn[];
};

export type ContactData = { rows: ContactRow[]; error: string | null };

const KEY_HINT = "أضِف SUPABASE_SERVICE_ROLE_KEY إلى apps/web/.env.local ثمّ أعِد تشغيل الخادم.";

/** صندوقُ رسائل الموقع كاملًا — الأحدث أوّلًا. الحراسةُ في الصفحة (`manage_contact`). */
export async function getContactMessages(): Promise<ContactData> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return { rows: [], error: KEY_HINT };

  const sb = createAdeebServiceClient(url, key);
  const { data, error } = await sb
    .from("contact_messages")
    .select("id, name, email, subject, message, status, notes, created_at")
    .order("created_at", { ascending: false });
  if (error) return { rows: [], error: error.message };

  type Raw = {
    id: string; name: string; email: string; subject: string | null; message: string;
    status: string | null; notes: string | null; created_at: string;
  };
  const raw = (data ?? []) as Raw[];

  // المحادثاتُ كلُّها في نداءٍ واحد — لا صفٌّ يجرّ نداءَه.
  type RawTurn = { id: string; message_id: string; direction: "in" | "out"; body: string; actor: string | null; from_email: string | null; created_at: string };
  const { data: turnRows, error: turnsError } = raw.length
    ? await sb.from("contact_turns").select("id, message_id, direction, body, actor, from_email, created_at").order("created_at", { ascending: true })
    : { data: [], error: null };
  if (turnsError) return { rows: [], error: turnsError.message };
  const turns = (turnRows ?? []) as RawTurn[];

  // أسماءُ الرادّين — تُقرأ من `profiles` لأنّ `actor` يشير إلى `auth.users` لا إليها.
  const ids = [...new Set(turns.map((t) => t.actor).filter((v): v is string => !!v))];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: profiles } = await sb.from("profiles").select("id, full_name").in("id", ids);
    for (const p of (profiles ?? []) as { id: string; full_name: string | null }[]) {
      if (p.full_name) names.set(p.id, p.full_name);
    }
  }

  const byMessage = new Map<string, ContactTurn[]>();
  for (const r of raw) byMessage.set(r.id, []);
  for (const t of turns) {
    const owner = raw.find((r) => r.id === t.message_id);
    byMessage.get(t.message_id)?.push({
      id: t.id,
      direction: t.direction,
      body: t.body,
      at: t.created_at,
      by: t.actor ? names.get(t.actor) ?? null : null,
      otherEmail: t.direction === "in" && t.from_email && owner && t.from_email !== owner.email.trim().toLowerCase() ? t.from_email : null,
    });
  }

  return {
    rows: raw.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      subject: r.subject,
      message: r.message,
      status: asStatus(r.status),
      notes: r.notes,
      createdAt: r.created_at,
      turns: byMessage.get(r.id) ?? [],
    })),
    error: null,
  };
}
