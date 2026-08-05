// يُستورَد فقط من مكوّنات خادمية (page.tsx). المفتاح بلا بادئة NEXT_PUBLIC فلا يصل المتصفّح.
import { createAdeebServiceClient } from "@adeeb/core";

/**
 * صفّ ميلاد — بيانات خام لا مشتقّة زمنيًّا: التاريخ نصّه ISO (yyyy-mm-dd)، والعدّ التنازليّ
 * والعمر يُحسبان في العميل بلحظة «الآن» المحلّية (لا في الخادم — منطقته قد تخالف منطقة المستخدم،
 * فيوم الميلاد يزيغ عند حدود اليوم). اللون المفضّل hex خام من member_details.favorite_color.
 */
export type BirthdayRow = {
  id: string;
  name: string;
  avatar: string | null;
  gender: "male" | "female" | null;
  birthDate: string;          // ISO yyyy-mm-dd (member_details.birth_date — NOT NULL)
  favoriteColor: string | null; // hex مثل #3d8fd6، أو null (يرتدّ لتدرّج العلامة)
};

/**
 * جلب مواليد الأعضاء النشطين (خادميّ، عبر مفتاح الخدمة). النطاق: نشط ⟺ سجّل — ومن لا سجلّ
 * تفاصيل له لا ميلاد له.
 *
 * و`only` **قسمةُ أشخاصٍ لا قسمة قدرة**: `null` تعني السجلّ كلّه (لمن يملك `view_members`)،
 * ومجموعةُ معرّفاتٍ تعني هؤلاء وحدهم (نطاق `lib/mySupervision.ts`). فالصفحة تقرّر النطاق،
 * وهذه تطبّقه — وليس في هذا الملفّ اسمُ دورٍ ولا قدرة.
 */
export async function getBirthdays(
  only: ReadonlySet<string> | null = null,
): Promise<{ rows: BirthdayRow[]; error: string | null }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  // تنقية المفتاح من أيّ محرف دخيل من اللصق (مسافات/اقتباس/محارف خفيّة) — JWT لا يحوي إلا هذه المحارف
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) {
    return { rows: [], error: "أضِف SUPABASE_SERVICE_ROLE_KEY إلى apps/web/.env.local ثمّ أعِد تشغيل الخادم." };
  }
  const sb = createAdeebServiceClient(url, key);

  const [pRes, mdRes] = await Promise.all([
    sb.from("members").select("id, full_name, avatar_url, gender").eq("account_status", "active"),
    sb.from("member_details").select("user_id, birth_date, favorite_color"),
  ]);

  const firstErr = pRes.error || mdRes.error;
  if (firstErr) return { rows: [], error: firstErr.message };

  const detailsByUser = new Map((mdRes.data ?? []).map((d) => [d.user_id, d]));

  const rows: BirthdayRow[] = [];
  for (const p of pRes.data ?? []) {
    if (only && !only.has(p.id)) continue; // خارج نطاق الرائي
    const md = detailsByUser.get(p.id);
    if (!md?.birth_date) continue; // نشط بلا سجلّ تفاصيل ⇐ لا ميلاد يُحتفَل به
    rows.push({
      id: p.id,
      name: p.full_name,
      avatar: p.avatar_url ?? null,
      gender: p.gender === "male" || p.gender === "female" ? p.gender : null,
      birthDate: String(md.birth_date).slice(0, 10),
      favoriteColor: md.favorite_color ?? null,
    });
  }

  return { rows, error: null };
}
