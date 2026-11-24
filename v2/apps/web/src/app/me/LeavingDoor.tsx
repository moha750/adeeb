"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SignOut } from "@/app/_components/glyphs";
import { SquaresFour, UserCheck } from "@phosphor-icons/react";
import { DoorShell } from "@/app/_door/DoorShell";
import { Btn, Head, Note } from "@/app/_door/parts";
import { firstNameOf } from "@/lib/personName";
import { setDeeboMood } from "@/lib/deeboMood";
import { createClient } from "@/lib/supabase/client";
import { cancelMyDeletion } from "./actions";

/**
 * **بابُ مهلة الحذف** (`/me`، ١١-٢٤) — من طلب حذفَ حسابه مجمَّدٌ لا مقفَل، فتُحوّله البوّابةُ إلى هنا: خبرُ الطلب ويومُ تنفيذه، وبابُ العدول.
 *
 * **بابٌ من أبواب الحساب** كأخيه «لا صلاحية»: اللوحُ يقول «ننتظر بقاءك» وديبو ينتظر، والورقةُ برأس الخطوة وفعلين — **البقاءُ هو الفعلُ
 * الأساسيّ** (قطعةُ اللوح) والخروجُ الصندوقُ بختمه. ومن عدل احتفل ديبو، وصار الفعلُ «ادخل بوّابتك». (كانت كرتًا من الهويّة القديمة
 * بتنبيهٍ أحمر و«ألغِ الطلب» زرًّا صغيرًا بلون الخطر — والعدولُ ليس خطرًا بل نجاة)
 */
export function LeavingDoor({ name, due, preview }: { name: string | null; due: string | null; preview?: boolean }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [out, setOut] = useState(false);
  const [back, setBack] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const first = name ? firstNameOf(name) : null;

  const stay = () => {
    setErr(null);
    setDeeboMood("busy");
    start(async () => {
      if (preview) { await new Promise((r) => setTimeout(r, 450)); setBack(true); setDeeboMood("success"); return; }
      const res = await cancelMyDeletion();
      if (!res.ok) { setErr(res.message); setDeeboMood("error"); return; }
      setBack(true);
      setDeeboMood("success");
    });
  };
  const signOut = () => {
    if (preview) return;
    setOut(true);
    setDeeboMood("busy");
    start(async () => {
      await createClient().auth.signOut();
      router.replace("/login");
      router.refresh();
    });
  };

  return (
    <DoorShell door="leaving" say={back ? { big: "أهلًا بعودتك", small: "حسابُك في أدِيب كما كان." } : undefined}>
      {back ? (
        <div className="door-step" key="back">
          <Head kicker={first ? `أهلًا ${first}` : undefined} sub="ألغينا طلبَ الحذف، وكلُّ ما لك في أدِيب باقٍ كما كان.">عاد حسابُك</Head>
          <Btn size="lg" icon={<SquaresFour />} onClick={() => router.replace("/dashboard")}>ادخل بوّابتك</Btn>
        </div>
      ) : (
        <div className="door-step" key="pending">
          <Head kicker={first ? `مرحبًا ${first}` : undefined}
            sub={`${due ? `يُحذف في ${due}.` : "يُحذف بعد انقضاء المهلة."} ولك أن تعدل عنه إلى ذلك اليوم، فيعود كما كان.`}>
            حسابُك في طريقه إلى الحذف
          </Head>
          {err ? <Note tone="error" title={err} /> : null}
          <Btn size="lg" icon={<UserCheck />} loading={busy && !out} disabled={out} onClick={stay}>أبقِ حسابي</Btn>
          <Btn variant="ghost" size="lg" icon={<SignOut />} loading={out} disabled={busy && !out} onClick={signOut}>تسجيل الخروج</Btn>
        </div>
      )}
    </DoorShell>
  );
}
