"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * فتحُ ملفِّ المرشّح — **مصدرٌ واحد** لغرفة الإدارة ولبطاقة الاقتراع معًا.
 *
 * المخزَّن في `file_url` مسارٌ في دلو `election-files` لا رابطًا، فيُوقَّع دقيقةً ثمّ يُفتح.
 * والقاعدةُ تعرف مَن يقرأ: المراجعُ بسياسة الأدمن، والناخبُ المؤهَّل بسياسة
 * `election_files_select_voter` — فلا شرطَ في الشاشة يكرّر ما تحكمه القاعدة.
 *
 * **والتبويبُ يُفتح قبل التوقيع لا بعده**: سفاري الجوّال يسمح بـ`window.open` ما دام في
 * إثر لمسةٍ مباشرة، ويحجبه إن جاء بعد انتظارٍ شبكيّ — وثلاثةٌ من كلّ أربعةٍ من أعضائنا لا
 * يفتحون اللوحة إلّا من جوّال. فيُفتح التبويبُ فارغًا في اللمسة، ثمّ يُساق إلى الرابط.
 *
 * **ولا `noopener` في هذا الفتح**: الرايةُ تجعل `window.open` يُرجع **null** بالمواصفة
 * (و`noreferrer` تستلزمها)، فيُفتح التبويبُ ولا يبقى لنا مقبضٌ نسوقه به، فيظلّ الزائرُ أمام
 * `about:blank` أبدًا. فالمقبضُ يُؤخَذ، ثمّ تُقطَع الصلةُ بيدنا (`tab.opener = null`) قبل
 * أن يُساق إلى الرابط: أمانُ الرايةِ يبقى، ويسقط أثرُها الجانبيّ.
 */
export async function openCandidateFile(path: string): Promise<boolean> {
  const tab = window.open("", "_blank");
  if (tab) tab.opener = null;
  try {
    const sb = createClient();
    const { data, error } = await sb.storage.from("election-files").createSignedUrl(path, 60);
    if (error || !data?.signedUrl) throw error ?? new Error("no url");
    if (tab) tab.location.href = data.signedUrl;
    else window.open(data.signedUrl, "_blank", "noopener,noreferrer"); // حُجب الفتحُ المسبق: تُجرَّب المباشرة
    return true;
  } catch {
    tab?.close(); // لا يُترك تبويبٌ فارغٌ شاهدًا على عطل
    return false;
  }
}
