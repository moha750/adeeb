"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * **جسرُ التطبيق** — بابٌ يعبر منه صاحبُ الجلسة من الجوّال إلى غرف اللوحة بلا دخولٍ ثانٍ.
 *
 * وسببُه أنّ الجلستين لا تلتقيان بطبعهما: في التطبيق رمزٌ في Keychain، وفي الويب كوكيزُ
 * يقرؤها الخادم في التصيير. فيحمل التطبيقُ رمزَه إلى هنا، وتكتبه هذه الصفحةُ **بالعميل
 * الرسميّ** (`setSession`) فتنشأ الكوكيزُ كما تنشأ من نموذج الدخول سواءً بسواء.
 *
 * **والرمزُ يأتي في جزء العنوان (`#`) لا في استعلامه**، وهذا ليس تفصيلًا: ما بعد `#` لا
 * يُرسَل إلى الخادم أصلًا، فلا يقع في سجلّ وصولٍ ولا في مرجعِ صفحة. وهو نفسُه طريقُ
 * Supabase في تدفّقها الضمنيّ.
 *
 * وثلاثةُ قيود:
 *   · يُمحى الجزءُ من شريط العنوان فورَ قراءته، فلا يبقى في تاريخ التصفّح.
 *   · لا يُقبَل مقصدٌ خارج اللوحة، فلا يصير البابُ محوّلًا مفتوحًا إلى أيّ عنوان.
 *   · لا يفعل شيئًا بلا رمز: صفحةٌ صمّاء لمن فتحها بيده.
 */
export default function AppBridgePage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const raw = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
      const params = new URLSearchParams(raw);
      const access = params.get("access_token");
      const refresh = params.get("refresh_token");
      const rawNext = params.get("next") || "/dashboard";

      // مقصدٌ داخل اللوحة وحدَها — لا «//host» ولا مسارٌ آخر
      const next = /^\/dashboard(\/|$)/.test(rawNext) ? rawNext : "/dashboard";

      // يُمحى الرمزُ من العنوان قبل أيّ شيء، وقعت الجلسةُ أم لم تقع
      window.history.replaceState(null, "", window.location.pathname);

      if (!access || !refresh) {
        setError("لا رمزَ في العنوان. هذه الصفحةُ يفتحها التطبيقُ لا اليد.");
        return;
      }

      const { error: err } = await createClient().auth.setSession({
        access_token: access,
        refresh_token: refresh,
      });
      if (err) {
        setError("تعذّر فتحُ جلستك. اخرج من التطبيق وادخل من جديد.");
        return;
      }

      // بديلٌ لا إضافة: لا يعود المستخدِم إلى الجسر بزرّ الرجوع
      window.location.replace(next);
    };
    void run();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <p className="text-center text-content-muted">{error ?? "جارٍ فتح غرفتك"}</p>
    </main>
  );
}
