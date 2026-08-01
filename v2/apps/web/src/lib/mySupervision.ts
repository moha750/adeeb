import "server-only";
import { cache } from "react";
import { createAdeebServiceClient } from "@adeeb/core";

/**
 * **مَن تحت إشرافي** — مصدرٌ واحد لنطاق الأشخاص، يقرؤه كلّ تبويبٍ يعرض أعيانًا لمن لا يملك
 * سجلّ الأعضاء كلّه.
 *
 * الإشراف يُقرأ من جدوله وحده (`committee_supervision`, 20260731): اللجانُ المُسنَدة إلى
 * صاحب الجلسة، ثمّ **كلّ** شاغلي مقاعدها الحيّة — قائدًا ونائبًا وأعضاءً. فالقيادة داخل
 * إشرافه ولو كانت خارج سلطته (`membership_authority`): يراها ولا يُنهيها.
 *
 * **وصاحبُ الجلسة ليس في نطاقه** — مقعدُه في إدارته لا في اللجان التي يشرف عليها، فلا يقع
 * فيها بنيةً. وهو المقصود لا سهوٌ يُصلَح: النطاق يجيب «من تحت إشرافي» وحدها، ومن قرأه ليعرض
 * فعلًا — كتهنئة ميلاد — فليس المرء ممّن يهنّئ نفسه.
 *
 * وهو **نطاق عرضٍ لا حراسة**: القفلُ يفتح الباب (`SECTION_CAP`)، وهذا يقول ما وراءه؛
 * والقاعدةُ تردّ كلّ كتابةٍ لا تخصّه.
 *
 * ومن يقسم به يسأل أوّلًا: هل يملك `view_members`؟ فمن يرى السجلّ كلّه لا يُقسَم عليه شيء —
 * القسمة لمن لا يراه (كـ`hr_admin_member`)، بلا اسم دورٍ محفورٍ في الكود.
 */
export type SupervisionReach = {
  /** معرّفات من يشرف عليهم — فارغةٌ إن لم يُسنَد إليه شيءٌ بعد. */
  ids: Set<string>;
  /** خللٌ في القراءة — يُقال ولا يُبتلع: الفراغُ الصامت يُقرأ «لا أحد» وهو كذب. */
  error: string | null;
};

const EMPTY: SupervisionReach = { ids: new Set(), error: null };

export const getSupervisedUserIds = cache(async function getSupervisedUserIds(
  actorId: string,
): Promise<SupervisionReach> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) {
    return { ids: new Set(), error: "أضِف SUPABASE_SERVICE_ROLE_KEY إلى apps/web/.env.local ثمّ أعِد تشغيل الخادم." };
  }
  const sb = createAdeebServiceClient(url, key);

  const supRes = await sb.from("committee_supervision").select("committee_id").eq("supervisor_id", actorId);
  if (supRes.error) return { ids: new Set(), error: supRes.error.message };

  const committeeIds = [...new Set((supRes.data ?? []).map((s) => s.committee_id))];
  if (committeeIds.length === 0) return EMPTY; // أُسنِد إليه شيءٌ بعد — لا خطأ، لا أحد

  const seatRes = await sb.from("user_roles").select("user_id").in("committee_id", committeeIds).eq("is_active", true);
  if (seatRes.error) return { ids: new Set(), error: seatRes.error.message };

  return { ids: new Set((seatRes.data ?? []).map((r) => r.user_id)), error: null };
});
