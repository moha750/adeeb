"use server";

import { createAdeebServiceClient } from "@adeeb/core";
import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/lib/auth";
import { writeMemberData } from "@/lib/memberData";

export type ProfileResult = { ok: boolean; message: string };

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  // تنقية المفتاح من محارف دخيلة قد تلتصق عند اللصق (JWT لا يحوي إلا هذه)
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

const NO_SESSION = "جلستك غير صالحة.";
const NO_KEY = "إعداد الخادم ناقص (مفتاح الخدمة).";

/** الصورة تُعرَض في الشريط الجانبيّ وفي كلّ شاشةٍ تذكر صاحبها، فالإنعاش على اللوحة كلّها. */
const revalidateMe = () => revalidatePath("/dashboard", "layout");

export type MyProfileInput = {
  phone?: string;
  degree?: string;
  college?: string;
  major?: string;
  recordNo?: string;
  twitter?: string;
  instagram?: string;
  tiktok?: string;
  linkedin?: string;
  favoriteColor?: string;
};

/**
 * تحديث بيانات صاحب الجلسة نفسه.
 *
 * **الهدف هو المستدعي**: `p_target = p_actor`، فلا معامل معرّفٍ يُمرَّر من المتصفّح ولا بابَ
 * هنا لتحرير غيره. والحَكَم مع ذلك يُسأل كما يُسأل في مسار الإدارة — بندُ «لكلٍّ بياناتُ نفسه»
 * في `can_edit_member_data` هو ما يُجيز هذه الشاشة أصلًا، فلا يُفترَض بل يُستفتى.
 *
 * والاسم والبريد ورقم الهويّة وتاريخ الميلاد والجنس **ليست هنا**: هويّةٌ تملكها الإدارة
 * (والبريد `credentials/` لأنّه هويّة مصادقة تُزامَن مع auth.users) — تُعرَض في الشاشة ولا تُمرَّر.
 * والكتابة نفسها في `lib/memberData` — مصدرٌ واحد يشاركه مسار الإدارة، فالقيود واحدة.
 */
export async function updateMyProfile(input: MyProfileInput): Promise<ProfileResult> {
  const me = await getCurrentAdmin();
  if (!me) return { ok: false, message: NO_SESSION };

  const sb = service();
  if (!sb) return { ok: false, message: NO_KEY };

  const res = await writeMemberData(sb, me.id, me.id, {
    phone: input.phone ?? "",
    degree: input.degree,
    college: input.college,
    major: input.major,
    recordNo: input.recordNo,
    twitter: input.twitter,
    instagram: input.instagram,
    tiktok: input.tiktok,
    linkedin: input.linkedin,
    favoriteColor: input.favoriteColor ?? "",
  });

  revalidateMe();
  return res.ok ? { ok: true, message: "حُفظت بياناتك." } : res;
}

/* ── الصورة الشخصيّة ───────────────────────────────────────────────────────
 * الدلو `avatars` علنيّ (روابطه تُعرَض في كلّ شاشة)، والرفع خادميّ بمفتاح الخدمة —
 * فالمتصفّح لا يبلغ التخزين مباشرةً، وحدود الحجم والصيغة تُفرَض هنا لا في النموذج وحده.
 */

export type AvatarResult = { ok: boolean; message: string; url?: string };

const BUCKET = "avatars";
/** الوجه المقصوص يخرج WEBP ‎512×512‎ من المتصفّح — نحو ٦٠ ك.ب؛ والحدّ سعةٌ لِما قد يكبر. */
const MAX_BYTES = 2 * 1024 * 1024;
const EXT_BY_MIME: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
};

/** مسار الملفّ داخل الدلو من رابطه العلنيّ — و`null` لكلّ رابطٍ لا يخصّ دلوَنا (فلا نحذف ما ليس لنا). */
function storagePathOf(publicUrl: string | null): string | null {
  if (!publicUrl) return null;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const at = publicUrl.indexOf(marker);
  if (at === -1) return null;
  const path = publicUrl.slice(at + marker.length).split("?")[0];
  return path ? decodeURIComponent(path) : null;
}

/**
 * رفع صورة صاحب الجلسة — تُكتب في الدلو ثمّ يُكتب رابطها في `profiles.avatar_url`،
 * وتُحذف القديمة بعد نجاح الكتابة (لا قبله: لو فشل التحديث لبقي بلا صورةٍ أصلًا).
 *
 * القصّ يقع في المتصفّح (`AvatarEditor`) فيصل الملفّ مربّعًا جاهزًا — والخادم لا يثق بذلك
 * ولا يحتاج إليه: الأفتار يقصّ ما زاد بـ`object-fit`، وهذا يحرس الحجم والصيغة وحدهما.
 */
export async function uploadMyAvatar(formData: FormData): Promise<AvatarResult> {
  const me = await getCurrentAdmin();
  if (!me) return { ok: false, message: NO_SESSION };

  const sb = service();
  if (!sb) return { ok: false, message: NO_KEY };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "لم تُرفَق صورة." };
  if (file.size > MAX_BYTES) return { ok: false, message: "حجم الصورة يتجاوز ٢ ميغابايت." };
  const ext = EXT_BY_MIME[file.type];
  if (!ext) return { ok: false, message: "صيغة غير مدعومة. استخدم WEBP أو JPG أو PNG." };

  // العضويّة المنتهية سجلٌّ مغلق لا يُحرَّر — الحكم نفسه الذي يحرس بقيّة الحقول (`lib/memberData`)
  const { data: target, error: tErr } = await sb.from("profiles").select("account_status, avatar_url").eq("id", me.id).maybeSingle();
  if (tErr) return { ok: false, message: `تعذّر التحقّق من حسابك: ${tErr.message}` };
  if (!target) return { ok: false, message: "لا سجلّ لحسابك في «الأعضاء»." };
  if (target.account_status === "suspended") return { ok: false, message: "عضويّة منتهية: لا تُعدَّل بياناتها." };

  // الاسم بمعرّف صاحبه وطابعٍ زمنيّ — فلا يتصادم ملفّان، ولا يُظلَّل المرفوع بنسخة الوسيط المخبّأة
  const path = `${me.id}-${Date.now()}.${ext}`;
  const { error: upErr } = await sb.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) return { ok: false, message: `تعذّر رفع الصورة: ${upErr.message}` };

  const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(path);
  const { error: wErr } = await sb.from("profiles").update({ avatar_url: pub.publicUrl }).eq("id", me.id);
  if (wErr) {
    // الرابط لم يُكتب، فالملفّ المرفوع يتيمٌ لا يشير إليه شيء — يُنظَّف فورًا
    await sb.storage.from(BUCKET).remove([path]);
    return { ok: false, message: `رُفعت الصورة ولم تُربَط بحسابك: ${wErr.message}` };
  }

  const old = storagePathOf(target.avatar_url);
  if (old && old !== path) await sb.storage.from(BUCKET).remove([old]);

  revalidateMe();
  return { ok: true, message: "حُدِّثت صورتك.", url: pub.publicUrl };
}

/**
 * حذف صورة صاحب الجلسة — يعود إلى أيقونة جنسه (`Avatar` يرتدّ إليها بلا صورة).
 *
 * والحذف **صُلبٌ لا تعطيل**: يُمحى الرابط ثمّ يُمحى الملفّ من الدلو. ولا نسخة نحتفظ بها —
 * فالنافذة تقول ذلك قبل الضغط لا بعده. والترتيب مقصود عكسَ الرفع: الرابط أوّلًا (فلو فشل
 * محوُ الملفّ بقي يتيمًا لا يؤذي)، إذ العكس يترك رابطًا يشير إلى ملفٍّ محذوف — أفتارٌ مكسور.
 */
export async function removeMyAvatar(): Promise<ProfileResult> {
  const me = await getCurrentAdmin();
  if (!me) return { ok: false, message: NO_SESSION };

  const sb = service();
  if (!sb) return { ok: false, message: NO_KEY };

  const { data: target, error: tErr } = await sb.from("profiles").select("account_status, avatar_url").eq("id", me.id).maybeSingle();
  if (tErr) return { ok: false, message: `تعذّر التحقّق من حسابك: ${tErr.message}` };
  if (!target) return { ok: false, message: "لا سجلّ لحسابك في «الأعضاء»." };
  if (target.account_status === "suspended") return { ok: false, message: "عضويّة منتهية: لا تُعدَّل بياناتها." };
  if (!target.avatar_url) return { ok: false, message: "لا صورة لحسابك أصلًا." };

  const { error: wErr } = await sb.from("profiles").update({ avatar_url: null }).eq("id", me.id);
  if (wErr) return { ok: false, message: `تعذّر حذف الصورة: ${wErr.message}` };

  const old = storagePathOf(target.avatar_url);
  if (old) await sb.storage.from(BUCKET).remove([old]);

  revalidateMe();
  return { ok: true, message: "حُذفت صورتك." };
}
