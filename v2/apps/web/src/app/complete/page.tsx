import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createAdeebServiceClient } from "@adeeb/core";
import { awayIfNoSession, getSessionAdmin } from "@/lib/auth";
import { hasMemberRecord, isAdeebMember } from "@/lib/memberRecord";
import { DoorShell } from "@/app/_door/DoorShell";
import { Head, Note } from "@/app/_door/parts";
import { clubDayKey } from "@/lib/dates";
import { CompleteFlow } from "./CompleteFlow";

export const metadata: Metadata = { title: "أكمل سجلّك، نادي أدِيب" };
export const dynamic = "force-dynamic";

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

/**
 * إكمال سجلّ العضو — بديلُ `/onboarding` بعد نحر نظام التسجيل.
 *
 * الفرق جوهريّ لا اسميّ: ذاك كان بابَ دخولٍ إلى النادي يفتحه توكنٌ في بريد، وهذا بابُ استيفاءِ
 * سجلٍّ يفتحه أن تكون عضوًا داخلًا. فلا يُفعّل حسابًا ولا يمنح عضويّة — يسدّ نقصًا لا غير.
 *
 * ومن بلغها ولا سجلَّ له سِيق إليها من تخطيط اللوحة (`dashboard/layout.tsx`)، فهي آخرُ ما يراه
 * حتّى يُكمل. ومن أكمل صُرف عنها — فلا يعود إليها بالرابط.
 *
 * **وصارت بابًا من أبواب الحساب** (`CompleteFlow`، اعتمده محمد ١١-٢٤): خطوتان بلا رأس الموقع (كانت بلا رأسٍ أصلًا: شاشةُ خطوةٍ واحدة)،
 * ومخرجُها «تسجيل الخروج».
 */
export default async function CompletePage() {
  const me = await getSessionAdmin();
  if (!me) redirect((await awayIfNoSession("/complete")) ?? "/login");

  const sb = service();
  if (!sb) {
    return (
      <DoorShell door="record">
        <div className="door-step">
          <Head>أكمل سجلّك</Head>
          <Note tone="error" title="تعذّر تحميل الصفحة">إعداد الخادم ناقص. أبلغ الإدارة.</Note>
        </div>
      </DoorShell>
    );
  }

  // ومن ليس عضوًا لا سجلَّ عضويّةٍ يُكمله — بيتُه بوّابةُ أدِيب (بعد توحيد الهويّة في م١)
  if (!(await isAdeebMember(me.id))) redirect("/dashboard");
  // من له سجلٌّ فلا شأن له بهذه الشاشة — وتحريرُ سجلّه في «حسابي» لا ههنا
  if (await hasMemberRecord(me.id)) redirect("/dashboard");

  const { data: profile } = await sb.from("profiles").select("full_name, phone, gender").eq("id", me.id).maybeSingle();

  return (
    <CompleteFlow
      // لا ميلادَ بعد اليوم (بتوقيت النادي): التقويمُ يحجب ما بعده
      today={clubDayKey(new Date().toISOString())}
      prefill={{
        fullName: profile?.full_name ?? me.fullName ?? "",
        phone: profile?.phone ?? "",
        gender: profile?.gender ?? "",
      }}
    />
  );
}
