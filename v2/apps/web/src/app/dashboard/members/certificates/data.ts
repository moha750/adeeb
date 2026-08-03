// يُستورَد من مكوّنات خادميّة وحدها (page.tsx) — المفتاح بلا بادئة NEXT_PUBLIC فلا يصل المتصفّح.
import { createAdeebServiceClient } from "@adeeb/core";
import { getCurrentAdmin } from "@/lib/auth";

/** شهادةٌ كما يراها القارئ — مرآة `certificates_for_reader` (الترشيح في القاعدة لا هنا). */
export type CertificateRow = {
  id: string;
  userId: string;
  /** اسم صاحبها اليوم في الملفّ — قد يخالف `holderName` المرسوم يومَ الإصدار. */
  name: string;
  avatar: string | null;
  gender: "male" | "female" | null;
  phone: string | null;
  memberEnded: boolean;
  serial: string;
  /** اللقطة: ما رُسم على الورقة حرفًا بحرف. */
  holderName: string;
  positionTitle: string;
  periodFrom: string;
  periodTo: string;
  status: "valid" | "revoked";
  createdAt: string;
  issuer: string | null;
  revokedAt: string | null;
  revokeReason: string | null;
  revoker: string | null;
  /** هل يبلغ القارئُ إصدارَ شهادةٍ لصاحب هذا الصفّ (وإبطالَها)؟ */
  mayManage: boolean;
};

/** عضوٌ يبلغه إصدارُ القارئ — بِركةُ اختيار النافذة، ومعها ما تحتاجه الورقة. */
export type CertificateTarget = {
  id: string;
  name: string;
  /** الاسم المقترَح للرسم: الثلاثيّ إن وُجد وإلّا المسجَّل — وللمُصدِر تصحيحُه. */
  suggestedName: string;
  avatar: string | null;
  gender: "male" | "female" | null;
  phone: string | null;
  ended: boolean;
  positionTitle: string | null;
  joinedDate: string | null;
  issuedCount: number;
};

export type CertificatesData = {
  rows: CertificateRow[];
  targets: CertificateTarget[];
  error: string | null;
};

const asGender = (g: unknown): "male" | "female" | null => (g === "male" || g === "female" ? g : null);

/** سجلّ شهادات الخبرة كما يراه صاحب الجلسة — خادميّ بمفتاح الخدمة، والحَكَم في القاعدة. */
export async function getCertificates(): Promise<CertificatesData> {
  const empty = { rows: [], targets: [] };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) {
    return { ...empty, error: "أضِف SUPABASE_SERVICE_ROLE_KEY إلى apps/web/.env.local ثمّ أعِد تشغيل الخادم." };
  }
  const me = await getCurrentAdmin();
  if (!me) return { ...empty, error: "جلستك غير صالحة." };

  const sb = createAdeebServiceClient(url, key);
  const [cRes, tRes] = await Promise.all([
    sb.rpc("certificates_for_reader", { p_actor: me.id }),
    sb.rpc("certificate_targets", { p_actor: me.id }),
  ]);

  const err = cRes.error || tRes.error;
  if (err) return { ...empty, error: err.message };

  type RawRow = {
    id: string; user_id: string; member_name: string; member_avatar: string | null; member_gender: string | null;
    member_status: string; member_phone: string | null; serial: string; holder_name: string; position_title: string;
    period_from: string; period_to: string; status: string; created_at: string; issuer_name: string | null;
    revoked_at: string | null; revoke_reason: string | null; revoker_name: string | null; may_manage: boolean;
  };
  type RawTarget = {
    user_id: string; name: string; suggested_name: string; avatar: string | null; gender: string | null;
    phone: string | null; account_status: string; position_title: string | null; joined_date: string | null;
    issued_count: number;
  };

  const rows: CertificateRow[] = ((cRes.data ?? []) as RawRow[]).map((r) => ({
    id: r.id,
    userId: r.user_id,
    name: r.member_name,
    avatar: r.member_avatar,
    gender: asGender(r.member_gender),
    phone: r.member_phone,
    memberEnded: r.member_status !== "active",
    serial: r.serial,
    holderName: r.holder_name,
    positionTitle: r.position_title,
    periodFrom: r.period_from,
    periodTo: r.period_to,
    status: r.status === "revoked" ? "revoked" : "valid",
    createdAt: r.created_at,
    issuer: r.issuer_name,
    revokedAt: r.revoked_at,
    revokeReason: r.revoke_reason,
    revoker: r.revoker_name,
    mayManage: r.may_manage,
  }));

  const targets: CertificateTarget[] = ((tRes.data ?? []) as RawTarget[]).map((t) => ({
    id: t.user_id,
    name: t.name,
    suggestedName: t.suggested_name,
    avatar: t.avatar,
    gender: asGender(t.gender),
    phone: t.phone,
    ended: t.account_status !== "active",
    positionTitle: t.position_title,
    joinedDate: t.joined_date,
    issuedCount: t.issued_count,
  }));

  return { rows, targets, error: null };
}
