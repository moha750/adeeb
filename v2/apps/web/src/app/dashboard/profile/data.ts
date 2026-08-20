// بيانات **صاحب الجلسة** الشخصيّة — خادميّ حصرًا (مفتاح الخدمة بلا بادئة NEXT_PUBLIC فلا يصل المتصفّح).
//
// لا يقرأ إلّا سجلّ صاحب الجلسة: هويّته من `getCurrentAdmin` (وهي المُعارة إن كانت المعاينة
// قائمة — كسائر اللوحة)، ثمّ استعلامان مقيَّدان بمعرّفه. فليس هنا بابٌ لقراءة ملفّ غيره.
import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";
import { getCurrentAdmin } from "@/lib/auth";
import { fmtDateOnly } from "@/lib/dates";
import type { SocialKey } from "@/lib/membershipFields";

export type MyProfile = {
  /** الاسم المعروض (`profiles.full_name`) — تملكه الإدارة، ويُعرَض هنا ولا يُحرَّر. */
  name: string;
  /** الاسم الثلاثيّ كما كُتب عند إكمال البيانات — قد يغيب لمن سبق النظام. */
  tripleName: string | null;
  email: string;
  avatar: string | null;
  gender: "male" | "female" | null;
  joined: string;
  nationalId: string | null;
  birthDate: string | null;
  /** هل له سجلّ `member_details`؟ الأكاديميّ والتواصل واللون لا تُحفظ لمن لا سجلّ له. */
  hasDetails: boolean;
  phone: string;
  degree: string; // الرمز لا التسمية
  college: string;
  major: string;
  recordNo: string;
  favoriteColor: string | null;
  socials: Record<SocialKey, string>;
  /** عنوانُ صفحته العلنيّة `/m/<slug>` — `null` لمن لم يبلغ حدَّ النشر (لا منصبَ فعّالًا له). */
  publicSlug: string | null;
};

/**
 * ملفّ صاحب الجلسة. `null` إن لم تكن هناك جلسة (التخطيط يحوّل للدخول قبل أن نصل هنا)،
 * و`error` إن غاب مفتاح الخدمة أو ردّت القاعدة بخطأ — يُقال ولا يُبتلَع.
 */
export async function getMyProfile(): Promise<{ profile: MyProfile | null; error: string | null }> {
  const me = await getCurrentAdmin();
  if (!me) return { profile: null, error: null };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) {
    return { profile: null, error: "أضِف SUPABASE_SERVICE_ROLE_KEY إلى apps/web/.env.local ثمّ أعِد تشغيل الخادم." };
  }
  const sb = createAdeebServiceClient(url, key);

  const [pRes, dRes, rRes] = await Promise.all([
    sb.from("profiles").select("full_name, email, phone, avatar_url, gender, joined_date, public_slug").eq("id", me.id).maybeSingle(),
    sb
      .from("member_details")
      .select("full_name_triple, national_id, birth_date, academic_degree, college, major, academic_record_number, favorite_color, twitter_account, instagram_account, tiktok_account, linkedin_account")
      .eq("user_id", me.id)
      .maybeSingle(),
    // حدُّ النشر منصبٌ فعّال، فالعنوانُ وحدَه لا يكفي
    sb.from("user_roles").select("id").eq("user_id", me.id).eq("is_active", true).limit(1),
  ]);

  const firstErr = pRes.error || dRes.error;
  if (firstErr) return { profile: null, error: firstErr.message };
  const p = pRes.data;
  if (!p) return { profile: null, error: "لا سجلّ لحسابك في «الأعضاء». راجِع إدارة الموارد البشريّة." };
  const d = dRes.data;

  return {
    profile: {
      name: p.full_name ?? me.fullName ?? "",
      tripleName: d?.full_name_triple ?? null,
      email: p.email ?? me.email ?? "",
      avatar: p.avatar_url ?? null,
      gender: p.gender === "male" || p.gender === "female" ? p.gender : null,
      joined: fmtDateOnly(p.joined_date),
      nationalId: d?.national_id ?? null,
      birthDate: d?.birth_date ? fmtDateOnly(d.birth_date) : null,
      hasDetails: !!d,
      phone: p.phone ?? "",
      degree: d?.academic_degree ?? "",
      college: d?.college ?? "",
      major: d?.major ?? "",
      recordNo: d?.academic_record_number ?? "",
      favoriteColor: d?.favorite_color ?? null,
      socials: {
        twitter: d?.twitter_account ?? "",
        instagram: d?.instagram_account ?? "",
        tiktok: d?.tiktok_account ?? "",
        linkedin: d?.linkedin_account ?? "",
      },
      publicSlug: (rRes.data?.length ?? 0) > 0 ? (p.public_slug ?? null) : null,
    },
    error: null,
  };
}
