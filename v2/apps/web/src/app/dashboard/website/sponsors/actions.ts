"use server";

import { createAdeebServiceClient } from "@adeeb/core";
import { revalidatePath } from "next/cache";
import { getWebsiteManager } from "@/lib/website/authz";
import { UPLOAD_RULES, checkFile } from "@/lib/upload";

export type SponsorResult = { ok: boolean; message: string; id?: string };

/** يحوّل الفارغ إلى null ويقلّم المسافات ومحارف الاتّجاه الخفيّة اللاصقة من اللصق العربيّ. */
const clean = (v: string | null | undefined): string | null => {
  const t = v?.replace(/[‎‏‪-‮]/g, "").trim();
  return t ? t : null;
};

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

const NO_KEY = "إعداد الخادم ناقص (مفتاح الخدمة).";
const NO_PERM = "لا تملك صلاحية إدارة الرعاة.";

/** ينعش لوحة الرعاة (لا قسم علنيّ للرعاة بعد؛ يُضاف الإنعاش العلنيّ يوم يُبنى القسم). */
function revalidateSponsors() {
  revalidatePath("/dashboard/website/sponsors");
}

/* ── الإنشاء والتحرير ── */

export type SponsorInput = {
  name: string;
  badge?: string | null;
  logoUrl: string;      // مطلوب (العمود NOT NULL في القاعدة)
  linkUrl?: string | null;
  description?: string | null;
};

/** التحقّق المشترك — نفس قيود القاعدة برسائل عربيّة (لا نثق بالعميل). */
function validate(input: SponsorInput): string | null {
  if (!clean(input.name)) return "اسم الراعي مطلوب.";
  if (!clean(input.logoUrl)) return "شعار الراعي مطلوب. ارفع صورةً أوّلًا.";
  return null;
}

/** أعمدة sponsors من مُدخَل النموذج (الترتيب لا يُدخَل هنا؛ يُدار بأزرار التحريك). */
function columns(input: SponsorInput) {
  return {
    name: clean(input.name),
    badge: clean(input.badge),
    logo_url: clean(input.logoUrl),
    link_url: clean(input.linkUrl),
    description: clean(input.description),
  };
}

export async function createSponsor(input: SponsorInput): Promise<SponsorResult> {
  const mgr = await getWebsiteManager("sponsors");
  if (!mgr) return { ok: false, message: NO_PERM };
  const sb = service();
  if (!sb) return { ok: false, message: NO_KEY };

  const invalid = validate(input);
  if (invalid) return { ok: false, message: invalid };

  const { data: last } = await sb.from("sponsors").select("order").order("order", { ascending: false }).limit(1).maybeSingle();
  const nextOrder = (last?.order ?? -1) + 1;

  const { data: created, error } = await sb
    .from("sponsors")
    .insert({ ...columns(input), order: nextOrder, created_by: mgr.userId })
    .select("id")
    .single();
  if (error || !created) return { ok: false, message: `تعذّر إضافة الراعي: ${error?.message ?? "بلا تفاصيل"}` };

  revalidateSponsors();
  return { ok: true, message: "أُضيف الراعي.", id: created.id };
}

export async function updateSponsor(id: string, input: SponsorInput): Promise<SponsorResult> {
  const mgr = await getWebsiteManager("sponsors");
  if (!mgr) return { ok: false, message: NO_PERM };
  const sb = service();
  if (!sb) return { ok: false, message: NO_KEY };

  const invalid = validate(input);
  if (invalid) return { ok: false, message: invalid };

  const { error } = await sb.from("sponsors").update(columns(input)).eq("id", id);
  if (error) return { ok: false, message: error.message };

  revalidateSponsors();
  return { ok: true, message: "حُفظت التغييرات.", id };
}

export async function deleteSponsor(id: string): Promise<SponsorResult> {
  const mgr = await getWebsiteManager("sponsors");
  if (!mgr) return { ok: false, message: NO_PERM };
  const sb = service();
  if (!sb) return { ok: false, message: NO_KEY };

  const { data: s, error } = await sb.from("sponsors").select("id, name").eq("id", id).maybeSingle();
  if (error) return { ok: false, message: `تعذّر قراءة الراعي: ${error.message}` };
  if (!s) return { ok: false, message: "لا وجود لهذا الراعي." };

  const { error: dErr } = await sb.from("sponsors").delete().eq("id", id);
  if (dErr) return { ok: false, message: `تعذّر الحذف: ${dErr.message}` };

  revalidateSponsors();
  return { ok: true, message: `حُذف «${s.name}».` };
}

/** تحريك راعٍ خطوةً — يبادل قيمة `order` مع جاره في الاتّجاه المطلوب. */
export async function moveSponsor(id: string, dir: "up" | "down"): Promise<SponsorResult> {
  const mgr = await getWebsiteManager("sponsors");
  if (!mgr) return { ok: false, message: NO_PERM };
  const sb = service();
  if (!sb) return { ok: false, message: NO_KEY };

  const { data: rows, error } = await sb.from("sponsors").select("id, order").order("order", { ascending: true }).order("created_at", { ascending: false });
  if (error) return { ok: false, message: error.message };
  const list = rows ?? [];
  const i = list.findIndex((r) => r.id === id);
  if (i === -1) return { ok: false, message: "لا وجود لهذا الراعي." };

  const j = dir === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= list.length) return { ok: false, message: "الراعي في الطرف بالفعل." };

  const a = list[i], b = list[j];
  const aOrder = a.order === b.order ? (dir === "up" ? b.order + 1 : b.order - 1) : b.order;
  const [r1, r2] = await Promise.all([
    sb.from("sponsors").update({ order: aOrder }).eq("id", a.id),
    sb.from("sponsors").update({ order: a.order }).eq("id", b.id),
  ]);
  if (r1.error || r2.error) return { ok: false, message: (r1.error ?? r2.error)!.message };

  revalidateSponsors();
  return { ok: true, message: dir === "up" ? "حُرّك لأعلى." : "حُرّك لأسفل." };
}

/* ── رفع شعار الراعي إلى دلو images تحت بادئة sponsors/ ── */

export type UploadResult = { ok: boolean; message?: string; url?: string };

const BUCKET = "images";
const PREFIX = "sponsors";
const RULE = UPLOAD_RULES.siteImage; // حدّ الدلو نفسه
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
};

export async function uploadSponsorLogo(formData: FormData): Promise<UploadResult> {
  const mgr = await getWebsiteManager("sponsors");
  if (!mgr) return { ok: false, message: NO_PERM };
  const sb = service();
  if (!sb) return { ok: false, message: NO_KEY };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "لم يُرفَق شعار." };
  // الحدُّ والجملةُ من قانون المرفقات (`lib/upload`) — ظهيرُ الخادم يقول ما قاله العميل
  const why = checkFile(file, RULE);
  if (why) return { ok: false, message: why };
  const ext = EXT_BY_MIME[file.type];
  if (!ext) return { ok: false, message: `الصيغةُ غير مدعومة، المدعوم ${RULE.formats}` };

  const path = `${PREFIX}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const { error } = await sb.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { ok: false, message: `تعذّر رفع الشعار: ${error.message}` };

  const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}
