import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";

/**
 * قارئُ بابِ الانضمام — **قِسمان لأنّ للصفحة قارئين**.
 *
 * صارت الصفحةُ عامّةً (٢٠٢٦-٠٩-١٢): القصّةُ تسبق الحساب، فيهبط عليها من لا جلسةَ له ويرى
 * ما هو مُقبِلٌ عليه قبل أن يُسأل بريدَه. فانقسم القارئ:
 *
 * | الدالّة | تحتاج جلسةً؟ | تقرأ |
 * |---|---|---|
 * | {@link getCommittees} | لا | اللجانُ وتعريفاتُها — متنُ الصفحة لكلّ زائر |
 * | {@link getViewerJoinState} | نعم | أينَ صاحبُ الجلسة من الطريق |
 *
 * **وكلتاهما بمفتاح الخدمة وبمعرّف صاحب الجلسة وحده** — عُرفُ V2: البابُ يُحرَس مرّةً في
 * الصفحة، ثمّ يُقرأ بمعرّفه في كلّ استعلام (كما في `me/data.ts`).
 */

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  return url && key ? createAdeebServiceClient(url, key) : null;
}

export type CommitteeOption = { id: number; name: string; description: string };

/**
 * اللجانُ المعروضة: نشطةٌ · تنفيذيّةٌ · لها تعريفٌ مكتوب (المصدرُ الواحد في القاعدة).
 *
 * لا جلسةَ تُشترَط: الدالّةُ في القاعدة `STABLE SECURITY DEFINER` لا تقرأ `auth.uid()`،
 * وهذه اللجانُ هي **إعلانُ النادي عن نفسه** — من رآها عرف أين يعمل، ومن لم يرَها لم يدرِ
 * لِمَ يسجّل. و`null` تعني إعدادَ خادمٍ ناقصًا لا قائمةً فارغة (تُفرَّقان في الشاشة).
 */
export async function getCommittees(): Promise<CommitteeOption[] | null> {
  const sb = service();
  if (!sb) return null;

  const { data } = await sb.rpc("volunteer_committee_options");
  return ((data ?? []) as CommitteeOption[]).map((o) => ({
    id: o.id,
    name: o.name,
    description: o.description,
  }));
}

export type ViewerJoinState = {
  /** له صفٌّ في `profiles`؟ شرطُ التقديم، ومن دخل بقوقل قد لا يكون له. */
  hasProfile: boolean;
  /** له صفٌّ نشطٌ في `volunteers`؟ */
  isVolunteer: boolean;
  /** رغباتُه مرتّبةً (معرّفاتُ اللجان)، فارغةٌ لمن لم يقدّم بعد. */
  prefs: number[];
};

export async function getViewerJoinState(userId: string): Promise<ViewerJoinState | null> {
  const sb = service();
  if (!sb) return null;

  const [{ data: vol }, { data: prefs }, { data: profile }] = await Promise.all([
    sb.from("volunteers").select("status").eq("user_id", userId).maybeSingle(),
    sb.from("volunteer_preferences").select("rank, committee_id").eq("user_id", userId).order("rank"),
    sb.from("profiles").select("id").eq("id", userId).maybeSingle(),
  ]);

  return {
    hasProfile: !!profile,
    isVolunteer: (vol as { status?: string } | null)?.status === "active",
    prefs: ((prefs ?? []) as { committee_id: number }[]).map((p) => p.committee_id),
  };
}
