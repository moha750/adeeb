"use server";

import { createClient } from "@/lib/supabase/server";
import { notificationsDb } from "@/lib/notifications/db";
import { emit } from "@/lib/notifications/emit";
import { ROOMS } from "./rooms/meta";

export type ReportResult = { ok: boolean; message: string };

const FAILED = "تعذّر إرسال البلاغ الآن. انسخ نصّ الخطأ وأرسله لقسم نظم المعلومات.";
const WINDOW = 15 * 60_000;
const PER_MEMBER = 3;

/**
 * نصُّ الخطأ كما يصل القسمَ: بلا محارف تحكّمٍ ولا علامات اتّجاهٍ تقلب ترتيبَ ما يُرى (U+202A–202E، U+2066–2069)، وبلا روابط
 * (البريدُ يجعل كلَّ رابطٍ قابلًا للنقر، والنصُّ من المتصفّح)، وبحدّ.
 */
const clean = (s: unknown): string =>
  typeof s !== "string"
    ? ""
    : s
        .replace(/[\u0000-\u001f\u007f‎‏‪-‮⁦-⁩]/g, " ")
        .replace(/\b[a-z][a-z0-9+.-]*:\/\/\S+/gi, "[رابط]")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 400);

/**
 * **بلاغُ خطأٍ إلى الدعم الفنيّ** (٢٠٢٦-١٠-٣١) — زرُّ «أبلغ الدعم الفني» في حالة خطأ الغرفة. العضوُ لا يعرف قناةَ قسم نظم
 * المعلومات، فيصل البلاغُ إشعارًا وبريدًا لمن يملك `manage_website` بسياقه: الغرفة، والمسار، والوقت، والخطأ، ومن واجهه
 * (`system.error_report` في دليل الإشعارات).
 * - **الهويّةُ من الجلسة لا من المتصفّح**: لا بلاغَ بلا دخول، واسمُ المُبلِغ يُقرأ من ملفّه.
 * - **الغرفةُ من سجلّ الغرف لا من المتصفّح** (`ROOMS`): المسارُ يطابق غرفةً معروفةً حرفًا، واسمُها يُقرأ منها. فلا يصير
 *   الإشعارُ رابطًا إلى حيث يشاء المرسِل (`/dashboard/../s/…`)، ولا عنوانًا يكتبه هو.
 * - **حدّان** (المراجعة المستقلّة): ثلاثةُ بلاغاتٍ للعضو في ربع ساعة أيًّا كانت غرفُها، وبلاغٌ واحدٌ عن الغرفة نفسها من الجميع —
 *   عطلٌ يصيب عشرين عضوًا يصل القسمَ مرّةً لا عشرين.
 */
export async function reportRoomError(input: { path: string; error: string }): Promise<ReportResult> {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return { ok: false, message: "انتهت جلستك. سجّل دخولك ثمّ أعد المحاولة." };

  const room = ROOMS.find((r) => r.navPath === input?.path);
  if (!room) return { ok: false, message: "بلاغٌ عن غرفةٍ غير معروفة." };
  const error = clean(input?.error) || "بلا نصّ";

  const sb = notificationsDb();
  if (!sb) return { ok: false, message: FAILED };

  const since = new Date(Date.now() - WINDOW).toISOString();
  const recent = sb.from("notification_events").select("id", { count: "exact", head: true }).eq("kind", "system.error_report").gte("created_at", since);
  const [mine, here] = await Promise.all([
    recent.eq("actor_id", user.id),
    sb.from("notification_events").select("id", { count: "exact", head: true }).eq("kind", "system.error_report").gte("created_at", since).contains("facts", { path: room.navPath }),
  ]);
  if ((here.count ?? 0) > 0) return { ok: true, message: "وصل بلاغٌ عن هذه الغرفة قبل قليل، ويتابعه قسمُ نظم المعلومات." };
  if ((mine.count ?? 0) >= PER_MEMBER) return { ok: false, message: "أرسلتَ بلاغاتٍ كثيرةً قبل قليل. أعد المحاولة بعد ربع ساعة." };

  const { data: prof } = await sb.from("profiles").select("full_name, gender").eq("id", user.id).maybeSingle();
  const p = prof as { full_name: string | null; gender: string | null } | null;
  const who = p?.full_name?.trim() || user.email || "عضو";

  const id = await emit("system.error_report", { room: room.title, path: room.navPath, error, who, female: p?.gender === "female", at: new Date().toISOString() }, user.id);
  if (!id) return { ok: false, message: FAILED };
  return { ok: true, message: "وصل البلاغ إلى قسم نظم المعلومات، وسيتابعه." };
}
