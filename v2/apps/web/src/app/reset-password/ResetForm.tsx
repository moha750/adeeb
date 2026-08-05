"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, Field } from "@adeeb/design-system";
import { Key, Lock, LockKey } from "@phosphor-icons/react";
import { CheckCircle } from "@/app/_components/glyphs";
import { createClient } from "@/lib/supabase/client";
import { isSessionGone, toArabicAuthError } from "@/lib/authErrors";
import { RESET_WINDOW_SEC, clearResetSent, resetSecondsLeft } from "@/lib/resetWindow";

/** أقلُّ طولٍ نقبله — أعلى من حدّ Supabase الافتراضيّ (٦)، فالأشدُّ هو الحاكم. */
const MIN = 8;

/** ‏m:ss بأرقامٍ لاتينيّة — خطُّ الهوية اللاتينيّ يقرؤها. */
function clock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

type Phase = "checking" | "ready" | "invalid" | "done";

/**
 * تعيينُ كلمة مرورٍ جديدة بعد رابط الاستعادة.
 *
 * **الرابط هو الجلسة:** ضغطُه يفتح جلسةَ استعادةٍ في المتصفّح (عميلُ `@supabase/ssr`
 * يبدّل الرمزَ الذي في العنوان تلقائيًّا)، فالشاشةُ لا تقرأ رمزًا بنفسها — بل تنتظر
 * الجلسة: `getSession` أوّلًا ثمّ `onAuthStateChange`، وبمهلةٍ تنتهي إلى «رابطٌ منتهٍ».
 * (لو استدعينا `exchangeCodeForSession` يدويًّا لتسابق التبديلَ التلقائيّ وفشل ثانيهما.)
 *
 * وخطأُ الرابط قد يصل في الاستعلام أو في الشُّظيّة (`#`) — فيُقرآن معًا.
 */
export function ResetForm() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("checking");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  /** خطأُ **الرابط** (لا يُعرَض إلّا في حالة «منتهٍ») منفصلٌ عن خطأ **الحفظ** — وإلّا تسرّب أحدهما إلى شاشة الآخر. */
  const [linkErr, setLinkErr] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  /** رابطٌ مستهلَك فوق جلسةٍ قائمة — يُقال هادئًا بدل أن يُقرأ خطأً. */
  const [spent, setSpent] = useState(false);
  /**
   * ثوانٍ باقيةٌ من **نافذة الإرسال** لا من فتح الشاشة: مهلةٌ واحدةٌ لا اثنتان.
   * (‏`RESET_WINDOW_SEC` ابتداءً، ثمّ تُصحَّح من ختم الطلب حين تجهز الشاشة.)
   */
  const [left, setLeft] = useState(RESET_WINDOW_SEC);
  const [pending, start] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    let settled = false;

    /**
     * الجلسةُ تغلب خطأَ الرابط دائمًا — الرابطُ وسيلةٌ إليها لا غاية، فمن ملكها لا يعنيه استهلاكُها.
     * ومعها **يُنظَّف العنوان** من `?error=…`: تركُه يجعل الشريط يقول «منتهٍ» والشاشةَ تعمل — وهو
     * الارتباك نفسُه من بابٍ آخر. (`replaceState` لا يُعيد التحميل ولا يُضيف خطوةً للرجوع.)
     */
    let decided = false;
    const ready = (wasSpent: boolean) => {
      settled = true;
      setLinkErr(null);
      setLeft(resetSecondsLeft()); // ما تبقّى من نافذة الإرسال
      setPhase("ready");
      // **حكمُ «مستهلَك» يُتّخذ مرّةً واحدة**: `onAuthStateChange` يُطلَق ثانيةً عند العودة
      // إلى التبويب (تجديد الرمز)، والعنوانُ حينها منظَّفٌ من `?error=` — فإعادةُ السؤال
      // تُلغي التحذير بلا سبب. (ظهر فعلًا: يغيب المستخدم لحظةً فيعود والتحذير اختفى.)
      if (decided) return;
      decided = true;
      setSpent(wasSpent);
      if (wasSpent) window.history.replaceState(null, "", window.location.pathname);
    };

    const hasLinkError = () => {
      const q = new URLSearchParams(window.location.search);
      const h = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      return Boolean(q.get("error") ?? h.get("error") ?? q.get("error_description") ?? h.get("error_description"));
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) ready(hasLinkError());
    });

    const timer = setTimeout(() => { if (!settled) setPhase("invalid"); }, 5000);

    (async () => {
      const q = new URLSearchParams(window.location.search);
      const h = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const raw = q.get("error_description") ?? h.get("error_description") ?? q.get("error") ?? h.get("error");
      // لا نحسمها بالخطأ فورًا: قد تكون جلسةٌ قائمةٌ من فتحٍ سابق، فتُبطِل معنى الخطأ.
      if (raw) setLinkErr(toArabicAuthError(raw));

      const { data } = await supabase.auth.getSession();
      if (data.session) { ready(Boolean(raw)); return; }
      if (raw) { settled = true; setPhase("invalid"); }
    })();

    return () => { clearTimeout(timer); sub.subscription.unsubscribe(); };
  }, []);

  /**
   * نافذةٌ واحدةٌ عاملة لا نافذتان: شاشتان مفتوحتان على التعيين تتنازعان جلسةً واحدة،
   * فمن يحفظ أوّلًا يُبطل عمل الأخرى بلا أن يدري صاحبُها.
   *
   * **والحَكَم آخرُ من طلبها**: كلّ نافذةٍ تُعلن ملكيّتها عند فتحها وعند أوّل لمسةٍ من
   * المستخدم فيها (تركيزٌ أو كتابة)، فتنسحب الأخريات إلى شاشة «تُكمِل في نافذةٍ أخرى»
   * — وتبقى فيها عودةٌ بضغطة، فلا تُسجَن نافذةٌ أرادها صاحبُها.
   *
   * ولا `window.close()`: المتصفّح لا يسمح بإغلاق ما لم يفتحه سكربت، فالانسحابُ ظاهرٌ لا صامت.
   */
  const [stale, setStale] = useState(false);
  /** حُفظت الكلمة في نافذةٍ أخرى — هذه النافذة تُقفَل عن الكتابة ولا تُستأنف. */
  const [saved, setSaved] = useState(false);
  const chan = useRef<BroadcastChannel | null>(null);
  const tabId = useRef("");

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return; // متصفّحٌ قديم: تبقى النوافذ كما كانت
    tabId.current = Math.random().toString(36).slice(2);
    const ch = new BroadcastChannel("adeeb:reset-password");
    chan.current = ch;
    ch.onmessage = (e: MessageEvent<{ id?: string; saved?: boolean }>) => {
      if (!e.data?.id || e.data.id === tabId.current) return;
      // «حُفظت» تحسم الأمر ولا تُستأنَف: الكتابةُ فوق كلمةٍ حُفظت للتوّ من نافذةٍ أخرى
      // تنجح صامتةً (لكلّ نافذةٍ جلستُها) فتُبطل عمل صاحبها وهو لا يدري.
      if (e.data.saved) { setSaved(true); return; }
      setStale(true);
    };
    ch.postMessage({ id: tabId.current });
    return () => { ch.close(); chan.current = null; };
  }, []);

  const claim = () => {
    setStale(false);
    chan.current?.postMessage({ id: tabId.current });
  };

  /** العدّاد لا يعمل إلّا والشاشة جاهزة؛ وعند الصفر تُغلق الجلسة فتصير المهلة حقيقيّة. */
  useEffect(() => {
    if (phase !== "ready") return;
    if (left <= 0) {
      void (async () => {
        await createClient().auth.signOut();
        clearResetSent();
        setLinkErr("انتهت المهلة قبل أن تُعيَّن كلمة المرور. اطلب رابطًا جديدًا.");
        setPhase("invalid");
      })();
      return;
    }
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, left]);

  /**
   * «لست أنا، أوقِف» يفي بما تَعِد به الجملة: خروجٌ **شاملٌ** (`scope: "global"`) يُبطل
   * جلسات الحساب كلَّها في كلّ جهاز ومتصفّح، لا هذه النافذة وحدها. فالرابط المسروق
   * لا يبقى بيد من فتحه.
   */
  const [stopping, setStopping] = useState(false);
  const stopAll = () => {
    setStopping(true);
    void (async () => {
      await createClient().auth.signOut({ scope: "global" });
      router.replace("/login");
      router.refresh();
    })();
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    start(async () => {
      const { error } = await createClient().auth.updateUser({ password: pw });
      if (error) {
        // ضياعُ الجلسة ليس خطأَ إدخالٍ يُعاد: الشاشةُ نفسُها لم تعد صالحة، فتُقلَب
        // إلى «رابطٌ منتهٍ» بزرّها الوحيد المفيد — طلبُ رابطٍ جديد.
        if (isSessionGone(error.message)) {
          setLinkErr(toArabicAuthError(error.message));
          setPhase("invalid");
          return;
        }
        setErr(toArabicAuthError(error.message));
        return;
      }
      clearResetSent();
      chan.current?.postMessage({ id: tabId.current, saved: true }); // تُقفَل النوافذ الأخرى فورًا
      // **الشاشة تُغلق بعد أن تؤدّي غرضها:** الجلسة تُنهى فورَ الحفظ، فإعادةُ تحميل
      // الصفحة لا تفتح نموذجًا جديدًا ولا عدّادًا جديدًا — الرابط أدّى مهمّته ومات.
      // ودخولُه بالكلمة الجديدة تأكيدٌ عمليٌّ أنّها حُفظت.
      await createClient().auth.signOut();
      setPhase("done");
    });
  };

  if (phase === "checking") {
    return (
      <div className="aauth-form">
        <Alert tone="neutral" title="جارٍ التحقّق من الرابط">لحظة…</Alert>
      </div>
    );
  }

  if (phase === "invalid") {
    return (
      <div className="aauth-form">
        <Alert tone="danger" title="رابطٌ منتهٍ أو غير صالح">
          {linkErr ?? "انتهت صلاحية الرابط أو استُعمل من قبل. اطلب رابطًا جديدًا."}
        </Alert>
        <Link href="/forgot-password" className="abtn abtn-ghost abtn-md aauth-back">اطلب رابطًا جديدًا</Link>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="aauth-form">
        <Alert tone="success" title="تغيّرت كلمة المرور">ادخل الآن بكلمتك الجديدة.</Alert>
        <Button variant="primary" size="lg" className="aauth-submit" onClick={() => { router.replace("/login"); router.refresh(); }}>
          تسجيل الدخول
        </Button>
      </div>
    );
  }

  if (saved) {
    return (
      <div className="aauth-form">
        <Alert tone="success" title="تغيّرت كلمة المرور في نافذةٍ أخرى">
          أُتِمّ التعيين في نافذةٍ أخرى من هذا المتصفّح، فلا حاجة لإعادته هنا.
        </Alert>
        <Link href="/login" className="abtn abtn-ghost abtn-md aauth-back">تسجيل الدخول</Link>
      </div>
    );
  }

  if (stale) {
    return (
      <div className="aauth-form">
        <Alert tone="warning" title="الشاشة مفتوحةٌ في نافذةٍ أخرى">
          فُتحت شاشة التعيين في نافذةٍ أحدث، وأكملُها هناك. أغلق هذه النافذة، أو أعِد العمل فيها.
        </Alert>
        <Button variant="ghost" size="md" className="aauth-back" onClick={claim}>
          أكمِل في هذه النافذة
        </Button>
      </div>
    );
  }

  const tooShort = pw !== "" && pw.length < MIN;
  const mismatch = pw2 !== "" && pw !== pw2;
  const canSubmit = pw.length >= MIN && pw === pw2;

  return (
    <form className="aauth-form" onSubmit={submit} onFocusCapture={claim} onInput={claim} noValidate>
      {err ? <Alert tone="danger" onClose={() => setErr(null)}>{err}</Alert> : null}
      <Alert tone="info" compact>
        أمامك <b className="font-latin">{clock(left)}</b> لإتمام التعيين قبل أن تنتهي المهلة.
      </Alert>
      {spent ? (
        <Alert
          tone="warning"
          compact
          actions={
            <Button variant="ghost-warning" size="sm" loading={stopping} onClick={stopAll}>
              لست أنا، أوقِف
            </Button>
          }
        >
          الرابط فُتِح من قبلُ من هذا المتصفّح. إن لم تكن أنت فأوقِف الآن، وإن كنتَ أنت فتستطيع تغيير كلمة المرور.
        </Alert>
      ) : null}

      <Field
        label="كلمة المرور الجديدة"
        type="password"
        dir="ltr"
        icon={<Lock />}
        innerIcon={<Key />}
        placeholder="••••••••"
        autoComplete="new-password"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        error={tooShort ? `الحدّ الأدنى ${MIN} محارف.` : undefined}
        required
      />
      <Field
        label="تأكيد كلمة المرور"
        type="password"
        dir="ltr"
        icon={<LockKey />}
        innerIcon={<CheckCircle />}
        placeholder="••••••••"
        autoComplete="new-password"
        value={pw2}
        onChange={(e) => setPw2(e.target.value)}
        error={mismatch ? "الكلمتان غير متطابقتين." : undefined}
        required
      />

      <Button type="submit" variant="primary" size="lg" loading={pending} disabled={!canSubmit} className="aauth-submit">
        حفظ كلمة المرور
      </Button>
    </form>
  );
}
