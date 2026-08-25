/**
 * **بطاقةُ صاحب الجلسة للرأس** — أخفُّ ما يُعرَف به الزائرُ نفسَه: اسمٌ وصورةٌ وجنسٌ ومنزلة.
 *
 * ## لماذا مسارٌ لا قراءةٌ في الصفحة
 * صفحاتُ الموقع العامّة **ساكنةٌ بإعادة تحقّق** (`revalidate = 60`)، فقراءةُ الجلسة فيها
 * تقلبها كلَّها ديناميّةً — نسختانِ مختلفتان لكلّ زائر، وثمنُ ذلك يُدفع على كلّ صفحةٍ في
 * الموقع لأجل زاويةٍ في الرأس. فالصفحةُ تبقى ساكنةً واحدةً للجميع، والرأسُ يسأل هذا المسارَ
 * بعد الترطيب.
 *
 * ## وما لا يُقال هنا
 * لا قدراتٍ ولا أدوار: الرأسُ لا يفتح غرفةً ولا يقرّر شيئًا — يعرض هويّةً ويحوّل إلى بابٍ
 * يحرسه صاحبُه (`denyUnless` في اللوحة، وحارسُ `/me` في بيت الحساب). فلا يُسرَّب من
 * `profiles` إلّا أربعةُ حقولٍ يراها كلُّ من نظر إلى صاحبها.
 */
import { NextResponse } from "next/server";
import { createAdeebServiceClient } from "@adeeb/core";
import { positionLine } from "@/lib/positionLabel";
import { roleRank } from "@/lib/roleOrder";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export type MeBrief = {
  name: string | null;
  avatarUrl: string | null;
  gender: "male" | "female" | null;
  /** عضوٌ في النادي — حدُّه `joined_date` كما في `isAdeebMember` و`is_adeeb_member` سواءً. */
  isMember: boolean;
  /**
   * مسمّى منصبه القائم كما يُقرأ: «قائد لجنة التصميم». يُركَّب في `positionLabel` وحدَه
   * (المصدرُ الواحد)، والقاعدةُ تُخرج القطعتين خامًا. و`null` لمن لا منصبَ له.
   */
  position: string | null;
};

/**
 * منصبُه القائم — رتبتُه ووحدةُ **إسناده** (لا الوحدة الملازمة: تلك لتسمية مقعدٍ بلا شاغل).
 * وثلاثةُ استعلاماتٍ لا انضمامٌ واحد: لا مفتاحَ إسنادٍ بين `user_roles` و`roles` فلا تُضمَّن.
 *
 * وقواعدُ الاختيار منقولةٌ عن بطاقة العضويّة حرفًا (`_membership/data.ts`): **أعلى منصبٍ
 * قائمٍ بالترتيب القياسيّ** (بالاسم لا برقم — `role_level` أُعدم)، و**وحدةً واحدةً لا سردًا**:
 * من امتدّ منصبُه على وحداتٍ عدّة تبقى رتبتُه عاريةً (سطرٌ واحدٌ لا يحتمل تسعةَ أسماء).
 */
async function currentPosition(sb: ReturnType<typeof createAdeebServiceClient>, userId: string) {
  const { data: rows } = await sb
    .from("user_roles")
    .select("role_name, department_id, committee_id")
    .eq("user_id", userId)
    .eq("is_active", true);
  if (!rows?.length) return null;

  type Row = { role_name: string; department_id: number | null; committee_id: number | null };
  const list = rows as Row[];
  const top = list.map((r) => r.role_name).sort((a, b) => roleRank(a) - roleRank(b))[0];
  const mine = list.filter((r) => r.role_name === top);

  const [roleRes, cRes, dRes] = await Promise.all([
    sb.from("roles").select("role_name, role_name_ar").eq("role_name", top).maybeSingle(),
    (async () => {
      const ids = [...new Set(mine.map((r) => r.committee_id).filter((v): v is number => v != null))];
      return ids.length ? sb.from("committees").select("id, committee_name_ar").in("id", ids) : { data: [] };
    })(),
    (async () => {
      const ids = [...new Set(mine.map((r) => r.department_id).filter((v): v is number => v != null))];
      return ids.length ? sb.from("departments").select("id, name_ar").in("id", ids) : { data: [] };
    })(),
  ]);

  const units = [
    ...((cRes.data ?? []) as { committee_name_ar: string | null }[]).map((c) => c.committee_name_ar),
    ...((dRes.data ?? []) as { name_ar: string | null }[]).map((d) => d.name_ar),
  ].filter((v): v is string => !!v);
  const unit = units.length === 1 ? units[0] : null;

  return positionLine((roleRes.data as { role_name_ar: string | null } | null)?.role_name_ar ?? top, unit);
}

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  return url && key ? createAdeebServiceClient(url, key) : null;
}

export async function GET() {
  // `no-store` على الردّ كلِّه: بطاقةُ شخصٍ بعينه لا تُخزَّن في وسيطٍ مشترك.
  const headers = { "Cache-Control": "no-store, private" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ viewer: null }, { headers });

  const sb = service();
  // بلا مفتاح خدمةٍ يبقى الرأسُ على حاله (زائرٌ مجهول) — ولا يُكسَر الموقع لأجل زينة.
  if (!sb) return NextResponse.json({ viewer: null }, { headers });

  const { data, error } = await sb
    .from("profiles")
    .select("full_name, avatar_url, gender, joined_date")
    .eq("id", user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ viewer: null }, { headers });

  const viewer: MeBrief = {
    name: data?.full_name ?? null,
    avatarUrl: data?.avatar_url ?? null,
    gender: data?.gender === "male" || data?.gender === "female" ? data.gender : null,
    isMember: data?.joined_date != null,
    // المنصبُ يُسأل عنه لمن انضمّ وحدَه: لا مناصبَ لصاحب حسابٍ ليس عضوًا، فلا استعلامَ يُهدر.
    position: data?.joined_date != null ? await currentPosition(sb, user.id) : null,
  };
  return NextResponse.json({ viewer }, { headers });
}
