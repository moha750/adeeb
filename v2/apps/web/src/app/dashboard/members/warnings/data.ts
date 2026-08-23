// يُستورَد من مكوّنات خادميّة وحدها (page.tsx) — المفتاح بلا بادئة NEXT_PUBLIC فلا يصل المتصفّح.
import { createAdeebServiceClient } from "@adeeb/core";
import { getCurrentAdmin } from "@/lib/auth";
import type { DeliveryStatus } from "@/lib/warnings/delivery";


/** إنذارٌ كما يراه القارئ — مرآة `warnings_for_reader` (الترشيح في القاعدة لا هنا). */
export type WarningRow = {
  id: string;
  userId: string;
  name: string;
  avatar: string | null;
  gender: "male" | "female" | null;
  phone: string | null;
  memberSuspended: boolean;
  /** اللجنة كما في السجلّ — للترشيح في الكشف. أمّا العرض فمن `roleAr` و`scope`. */
  committee: string | null;
  /** اسمُ المنصب: الرتبة + وحدتها الأمّ (`roleTitle`). */
  roleAr: string | null;
  /** وحدةُ الإسناد التي تُقال معه، صامتةً إن كانت الأمّ نفسها (`assignmentScope`). */
  scope: string | null;
  category: string;
  reason: string;
  occurredOn: string | null;
  status: "active" | "cancelled";
  createdAt: string;
  issuer: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  canceller: string | null;
  causedTermination: boolean;
  /** رتبتُه بين سواري صاحبه — null للملغى (خرج من العدّ فلا رتبة له). */
  ordinal: number | null;
  /** عدد سواري صاحبه الآن. */
  activeCount: number;
  /** هل يبلغ القارئُ إصدارَ إنذارٍ على صاحب هذا الصفّ (وإلغاءَه)؟ */
  mayManage: boolean;
  /**
   * **أين بلغ خبرُ هذا الإنذار صاحبَه** عبر واتساب : `null` يعني أنّ صفَّ التسليم لم
   * يُفتَح بعد (إنذارٌ صدر قبل هذه القناة). والواقعةُ منفصلةٌ عن وصولها، فلا يُقرأ من
   * هذا الحقل حكمٌ على الإنذار نفسه.
   */
  delivery: WarningDelivery | null;
};

/** حالُ التسليم كما يقرؤها الصفّ : مرآةُ `notification_deliveries` لقناةِ واتساب. */
export type WarningDelivery = {
  status: DeliveryStatus;
  attemptCount: number;
  errorMessage: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  /** آخرُ لمسةٍ على الصفّ : منها يُعرَف المطالَبُ المتروك (`maySend`). */
  updatedAt: string;
};

/** عضوٌ يبلغه إنذارُ القارئ — بِركةُ اختيار النافذة. */
export type WarningTarget = {
  id: string;
  name: string;
  phone: string | null;
  avatar: string | null;
  gender: "male" | "female" | null;
  committeeId: number | null;
  committee: string | null;
  /** اسمُ المنصب ووحدتُه — كما في `WarningRow`. */
  roleAr: string | null;
  scope: string | null;
  activeCount: number;
  /** يوم صيرورته عضوًا — أدنى ما يُقبل تاريخًا لواقعة (والحدّ محروسٌ في القاعدة). */
  joinedDate: string | null;
};

export type WarningsData = {
  rows: WarningRow[];
  targets: WarningTarget[];
  /** حدّ الإنذارات — من `warning_limit()` في القاعدة، لا رقمٌ محفور في الواجهة. */
  limit: number;
  /** هل يملك القارئ فعلَ الإصدار أصلًا؟ (الرئيسان يريان ولا يُصدران.) */
  mayIssue: boolean;
  error: string | null;
};

const asGender = (g: unknown): "male" | "female" | null => (g === "male" || g === "female" ? g : null);

/** سجلّ الإنذارات كما يراه صاحب الجلسة — خادميّ عبر مفتاح الخدمة، والحَكَم في القاعدة. */
export async function getWarnings(): Promise<WarningsData> {
  const empty = { rows: [], targets: [], limit: 3, mayIssue: false };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) {
    return { ...empty, error: "أضِف SUPABASE_SERVICE_ROLE_KEY إلى apps/web/.env.local ثمّ أعِد تشغيل الخادم." };
  }
  const me = await getCurrentAdmin();
  if (!me) return { ...empty, error: "جلستك غير صالحة." };

  const sb = createAdeebServiceClient(url, key);
  const [wRes, tRes, lRes, dRes] = await Promise.all([
    sb.rpc("warnings_for_reader", { p_actor: me.id }),
    sb.rpc("members_i_may_warn", { p_actor: me.id }),
    sb.rpc("warning_limit"),
    /* التسليمُ يُقرأ **جدولًا مستقلًّا ويُوصَل هنا**، ولا يُحشَر في `warnings_for_reader`:
       تلك دالّةُ حَكَمٍ ناضجةٌ تقرؤها شاشاتٌ أخرى، وتوسيعُ صفوفها لأجل عمودٍ في شاشةٍ
       واحدة يشدّ خيطًا في غير موضعه. والوصلُ بالمعرّف، والحراسةُ سبقته في الدالّة. */
    sb
      .from("notification_deliveries")
      .select("warning_id, status, attempt_count, error_message, sent_at, delivered_at, read_at, updated_at")
      .eq("channel", "whatsapp"),
  ]);

  const err = wRes.error || tRes.error || lRes.error;
  if (err) return { ...empty, error: err.message };
  // سقوطُ التسليم لا يُعمي الغرفة: السجلُّ يُعرَض، وعمودُ القناة يبقى فارغًا
  if (dRes.error) console.error("[warnings] deliveries read failed", { error: dRes.error.message });

  type RawRow = {
    id: string; user_id: string; member_name: string; member_avatar: string | null; member_gender: string | null;
    member_status: string; member_phone: string | null; committee_id: number | null; committee_name: string | null;
    role_ar: string | null;
    category: string; reason: string; occurred_on: string | null; status: string; created_at: string;
    issuer_name: string | null; cancelled_at: string | null; cancel_reason: string | null; canceller_name: string | null;
    caused_termination: boolean; ordinal: number | null; active_count: number; may_manage: boolean;
  };
  type RawTarget = {
    user_id: string; name: string; phone: string | null; avatar: string | null; gender: string | null;
    committee_id: number | null; committee_name: string | null;
    role_ar: string | null;
    active_count: number; joined_date: string | null;
  };

  /**
   * **شخصٌ لا مقعد**: رتبتُه كما تقولها القاعدة، ووحدتُه من خانة إسناده — والوحدةُ
   * الملازمة لا تدخل هذا الطريق البتّة (20260811)، فلا إسكاتَ ولا استثناء.
   */
  const partsOf = (r: { role_ar: string | null; committee_name: string | null }) => ({
    roleAr: r.role_ar,
    scope: r.committee_name,
  });

  type RawDelivery = {
    warning_id: string; status: string; attempt_count: number; error_message: string | null;
    sent_at: string | null; delivered_at: string | null; read_at: string | null; updated_at: string;
  };
  const deliveries = new Map<string, WarningDelivery>(
    ((dRes.data ?? []) as RawDelivery[]).map((d) => [
      d.warning_id,
      {
        status: d.status as DeliveryStatus,
        attemptCount: d.attempt_count,
        errorMessage: d.error_message,
        sentAt: d.sent_at,
        deliveredAt: d.delivered_at,
        readAt: d.read_at,
        updatedAt: d.updated_at,
      },
    ]),
  );

  const rows: WarningRow[] = ((wRes.data ?? []) as RawRow[]).map((r) => ({
    id: r.id,
    userId: r.user_id,
    name: r.member_name,
    avatar: r.member_avatar,
    gender: asGender(r.member_gender),
    phone: r.member_phone,
    memberSuspended: r.member_status === "suspended",
    committee: r.committee_name,
    ...partsOf(r),
    category: r.category,
    reason: r.reason,
    occurredOn: r.occurred_on,
    status: r.status === "cancelled" ? "cancelled" : "active",
    createdAt: r.created_at,
    issuer: r.issuer_name,
    cancelledAt: r.cancelled_at,
    cancelReason: r.cancel_reason,
    canceller: r.canceller_name,
    causedTermination: r.caused_termination,
    ordinal: r.ordinal,
    activeCount: r.active_count,
    mayManage: r.may_manage,
    delivery: deliveries.get(r.id) ?? null,
  }));

  const targets: WarningTarget[] = ((tRes.data ?? []) as RawTarget[]).map((t) => ({
    id: t.user_id,
    name: t.name,
    phone: t.phone,
    avatar: t.avatar,
    gender: asGender(t.gender),
    committeeId: t.committee_id,
    committee: t.committee_name,
    ...partsOf(t),
    activeCount: t.active_count,
    joinedDate: t.joined_date,
  }));

  return {
    rows,
    targets,
    limit: typeof lRes.data === "number" ? lRes.data : 3,
    // الفعلُ قدرةٌ لا مدًى: الرئيسان يريان السجلّ كلّه ولا يُصدران.
    mayIssue: me.caps.includes("manage_warnings"),
    error: null,
  };
}
