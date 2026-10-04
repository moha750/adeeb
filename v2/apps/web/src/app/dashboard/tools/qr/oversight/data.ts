import "server-only";
import { createClient } from "@/lib/supabase/server";
import { QR_LINK_COLS, shapeQrLink } from "../data";
import type { QrLinkRaw, QrLinkRow } from "../data";

/**
 * **عينُ النادي على ملصقاته.**
 *
 * الغرفةُ الأمّ تقرأ «باركوداتي» بسياسة own-row؛ وهذه تقرأ **الكلّ** بسياسةٍ ثانيةٍ تشترط
 * قدرةَ `oversee_qr` (ترحيل ٢٠٢٦-٠٩-٠٥). والقراءةُ بعميل الجلسة كأختها: مفتاحُ الخدمة
 * يتجاوز السياسةَ فيصير الحارسُ سطرًا في التطبيق، وسطرٌ يُنسى مرّةً يكشف كلَّ شيء.
 *
 * **ولا كتابةَ هنا.** الإشرافُ رؤيةٌ لا سلطةٌ على صفّ غيرِه — لا سياسةَ تعديلٍ تسمح بها
 * أصلًا، فلو نبت في الشاشة زرٌّ لردّته القاعدة.
 */

export type QrOwnerBrief = { id: string; name: string };

export type QrOversightRow = QrLinkRow & { owner: QrOwnerBrief | null };

/** واقعةٌ جرت على باركود: من فعلها، ومتى، وما كانت القيمة قبلها. */
export type QrEvent = {
  id: number;
  linkId: string;
  linkTitle: string | null;
  actor: string | null;
  /**
   * **أنواعُ الواقعة كما يقبلها قيدُ القاعدة حرفًا** (`qr_link_events_kind_check`).
   * كان الاتّحادُ ستّةً والقيدُ ثمانيةً منذ م٧ وم٨، فواقعةُ «موعد» كانت تُرسَم بشارةٍ
   * بلا تسميةٍ ولا نغمة (خانةٌ فارغة). صُحّح مع م١٨ يوم وُلدت «الحملة».
   */
  kind: "target" | "title" | "active" | "spec" | "delete" | "owner" | "schedule" | "tags" | "campaign";
  oldValue: string | null;
  newValue: string | null;
  at: string;
};

/** حالُ تنبيه تبديل وجهة: أُرسل، أم مُطفأ الإرسال، أم في الطريق، أم تعثّر. */
export type QrAlertState = "pending" | "sent" | "failed" | "off";

export type QrOversightData = {
  rows: QrOversightRow[];
  events: QrEvent[];
  /** من يصلح مالكًا: حاملُ قدرة المولّد. النقلُ إلى غيره يُيتّم الباركود (يملكه ولا يرى غرفتَه). */
  candidates: QrOwnerBrief[];
  /** حالُ التنبيه لكلّ واقعةِ تبديلِ وجهة، ليُعرَف: هل نُبِّهنا أصلًا؟ */
  alerts: Record<number, QrAlertState>;
  error: string | null;
};

/** آخرُ مئةِ واقعة: السجلُّ يُقرأ ليُسأل «ما الذي تغيّر هذا الأسبوع؟» لا ليُؤرَّخ به عامٌ كامل. */
const EVENT_LIMIT = 100;

export async function getQrOversight(): Promise<QrOversightData> {
  const sb = await createClient();

  const { data: candidates } = await sb.rpc("qr_owner_candidates");

  const { data: links, error: linkErr } = await sb
    .from("qr_links")
    .select(QR_LINK_COLS)
    .order("created_at", { ascending: false });
  /** من يصلح مالكًا — يُقرأ قبل الجدول فيبقى متاحًا حتّى لو تعذّرت قراءتُه. */
  const heirs = ((candidates ?? []) as { id: string; full_name: string }[]).map((c) => ({ id: c.id, name: c.full_name }));
  if (linkErr) return { rows: [], events: [], candidates: heirs, alerts: {}, error: linkErr.message };

  const raw = (links ?? []) as QrLinkRaw[];
  const ownerIds = [...new Set(raw.map((r) => r.owner_id))];

  // الأسماءُ في نداءٍ واحد: صفٌّ لكلّ مالكٍ لا نداءٌ لكلّ باركود.
  const { data: people } = ownerIds.length
    ? await sb.from("profiles").select("id, full_name").in("id", ownerIds)
    : { data: [] as { id: string; full_name: string }[] };
  const byId = new Map((people ?? []).map((p) => [p.id, p.full_name as string]));

  // **الصائغُ واحدٌ ويُزاد عليه المالك**: الصفُّ يُشكَّل في `../data` لا ههنا، فخانةٌ
  // تُضاف إليه تصل هذه الغرفةَ بلا لمسة.
  // **والحاويةُ معرّفًا بلا اسم**: الصائغُ يترك الاسمَ فارغًا ويُلصَق بنداءٍ ثانٍ، وغرفةُ
  // الإشراف لا تُلصقه: حملاتُ الناس لا تُقرأ لها أسماءٌ إلّا بسياسةِ إشرافٍ ثانيةٍ لا
  // داعيَ لها اليوم (لا عمودَ يعرضها).
  // **ولا يُقال «محذوف» لما لم يُقرأ**: قد يغيب اسمُ المالك لأنّ الصفَّ ذهب، وقد يغيب لأنّ
  // سياسةَ القراءة لم تسمح (وقع ذلك أوّلَ يومٍ لحساب النادي). والذي نعرفه يقينًا أنّنا لا نعرفه.
  const rows: QrOversightRow[] = raw.map((r) => ({
    ...shapeQrLink(r),
    owner: { id: r.owner_id, name: byId.get(r.owner_id) ?? "غيرُ معروف" },
  }));

  const { data: alerts } = await sb.from("qr_alert_outbox").select("event_id, status").limit(500);
  const alertBy: Record<number, QrAlertState> = {};
  for (const a of (alerts ?? []) as { event_id: number; status: QrAlertState }[]) alertBy[a.event_id] = a.status;

  const { data: evts, error: evtErr } = await sb
    .from("qr_link_events")
    .select("id, link_id, actor_id, kind, old_value, new_value, at")
    .order("at", { ascending: false })
    .limit(EVENT_LIMIT);
  if (evtErr) return { rows, events: [], candidates: heirs, alerts: alertBy, error: evtErr.message };

  type RawEvt = {
    id: number; link_id: string; actor_id: string | null;
    kind: QrEvent["kind"]; old_value: string | null; new_value: string | null; at: string;
  };
  const rawEvts = (evts ?? []) as RawEvt[];

  // أسماءُ الفاعلين: قد يكون فيهم من ليس مالكَ باركودٍ اليوم (سُحب منه، أو حُذف باركودُه).
  const actorIds = [...new Set(rawEvts.map((e) => e.actor_id).filter((v): v is string => !!v))];
  const missing = actorIds.filter((id) => !byId.has(id));
  if (missing.length) {
    const { data: more } = await sb.from("profiles").select("id, full_name").in("id", missing);
    for (const p of more ?? []) byId.set(p.id as string, p.full_name as string);
  }

  const titleOf = new Map(rows.map((r) => [r.id, r.title]));

  return {
    rows,
    candidates: heirs,
    alerts: alertBy,
    events: rawEvts.map((e) => ({
      id: e.id,
      linkId: e.link_id,
      // باركودٌ حُذف لا عنوانَ له اليوم: تبقى واقعتُه في السجلّ ويُقال «باركود محذوف».
      linkTitle: titleOf.get(e.link_id) ?? null,
      actor: e.actor_id ? byId.get(e.actor_id) ?? "غيرُ معروف" : null,
      kind: e.kind,
      oldValue: e.old_value,
      newValue: e.new_value,
      at: e.at,
    })),
    error: null,
  };
}
