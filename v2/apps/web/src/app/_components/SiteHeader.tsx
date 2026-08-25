"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@adeeb/design-system";
import { Avatar } from "@/app/dashboard/_components/Avatar";
import { createClient } from "@/lib/supabase/client";
import type { MeBrief } from "@/app/api/me/brief/route";

/**
 * رأسُ الموقع كما يلبسه أدِيب — `Header` المكتبة، وقد صار **يعرف صاحبَه**.
 *
 * ولمَ لفافةٌ ولم تُمرَّر الوِجهةُ في كلّ صفحة؟ لأنّ ما يفعله زرُّ «انضمّ إلينا» قرارٌ واحدٌ
 * للموقع كلِّه — فلو مُرِّر في عشر صفحاتٍ لَتخلّفت واحدةٌ يومَ يتبدّل. وههنا يُبدَّل مرّةً.
 *
 * وكان يفتح نافذة «التسجيل مغلق» منذ نُحر نظامُ التسجيل، فصار يقصد `/join` بقرار المجلس
 * (١٥ أغسطس ٢٠٢٦): بابُ العضويّة عاد، ومحطّتُه الأولى التطوّع.
 *
 * ## ولمَ تُقرأ الجلسةُ في المتصفّح لا في الخادم (٢٠٢٦-٠٨-٢٥)
 * صفحاتُ الموقع العامّة ساكنةٌ بإعادة تحقّق (`revalidate = 60`) — نسخةٌ واحدةٌ تُخدَم
 * للجميع. فلو سأل الرأسُ عن الجلسة في الخادم لَصارت **كلُّ صفحةٍ عامّةٍ ديناميّة**، وثمنُه
 * يُدفع على الموقع كلِّه لأجل زاويةٍ فيه. فالصفحةُ تبقى ساكنةً، والرأسُ يسأل `/api/me/brief`
 * بعد الترطيب.
 *
 * ## والقفزةُ تُمنَع بحدسٍ متزامنٍ قبل الرسم
 * الردُّ يتأخّر جزءًا من الثانية، فلو انتظرناه لَرأى صاحبُ الجلسة زرَّي المجهول ثمّ رآهما
 * يُستبدلان. فيُقرأ **وجودُ كوكي الجلسة** بـ`useSyncExternalStore`: لقطةُ الخادم `false` فيُرطَّب
 * الرأسُ مطابقًا لما أُرسل، ثمّ يبدّله React إلى لقطة المتصفّح قبل الرسم. ولمَ لا
 * `useLayoutEffect`؟ لأنّ ضبطَ الحالة داخل أثرٍ يجرّ رسمةً تابعة (وقاعدةُ ESLint تردّه)،
 * وهذه قراءةُ مصدرٍ خارجيٍّ لا أثرٌ جانبيّ، فلها أداتُها. فتظهر الكبسولةُ فارغةً ثمّ يملؤها
 * الاسمُ حين تصل البطاقة. والكوكي **حدسٌ لا إذن**:
 * لا يفتح شيئًا ولا يُقرأ منه شيء، وكلُّ ما يفعله أنّه يحجز موضعًا. وإن كذب (كوكي منتهٍ)
 * ردّ المسارُ `null` فعاد الرأسُ إلى المجهول.
 */
export function SiteHeader(props: Omit<React.ComponentProps<typeof Header>, "ctaHref" | "onCta" | "viewer" | "onSignOut">) {
  const router = useRouter();
  const [viewer, setViewer] = useState<MeBrief | null>(null);
  /** هل وصلت البطاقةُ (أو سقطت)؟ بعدها لا حاجةَ للحدس: الجوابُ نفسُه هو الحقّ. */
  const [settled, setSettled] = useState(false);
  /** الحدسُ: كوكيٌّ في الخادم لا وجودَ له، وفي المتصفّح يُقرأ قبل الرسم بلا مسِّ حالة. */
  const cookieHint = useSyncExternalStore(subscribeNothing, hasSessionCookie, () => false);
  /** كوكيٌّ يقول «ثمّة جلسة» والبطاقةُ لم تصل بعد — كبسولةٌ تحجز موضعَها بلا أن تدّعي اسمًا. */
  const pending = cookieHint && !settled;

  useEffect(() => {
    let alive = true;
    fetch("/api/me/brief", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { viewer: null }))
      .then((d: { viewer: MeBrief | null }) => {
        if (!alive) return;
        setViewer(d.viewer);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setSettled(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const signOut = async () => {
    await createClient().auth.signOut();
    setViewer(null);
    // تحديثُ الخادم بعده: صفحاتٌ ساكنةٌ لا تتبدّل بالخروج، لكنّ اللوحةَ لو كان تحتها تُردّ.
    router.refresh();
  };

  return (
    <Header
      {...props}
      ctaHref="/join"
      viewer={
        viewer
          ? {
              name: viewer.name ?? "",
              isMember: viewer.isMember,
              standing: viewer.position,
              gender: viewer.gender,
              avatar: (
                <Avatar name={viewer.name ?? undefined} src={viewer.avatarUrl ?? undefined} gender={viewer.gender} />
              ),
            }
          : pending
            ? // أفتارٌ صامتٌ لا حرفَ فيه: علامةُ الاستفهام (بديلُ `Avatar` حين لا اسم) تُقرأ
              // عطبًا لا انتظارًا، والفراغُ يقول «يُحمَّل» ولا يدّعي شيئًا.
              { name: "", isMember: false, avatar: <span className="av" aria-hidden /> }
            : undefined
      }
      onSignOut={signOut}
    />
  );
}

/**
 * أثرُ جلسةٍ في الكوكيز — `sb-<ref>-auth-token` (وقد تُشظّى إلى `.0`/`.1` حين تطول).
 * ولا يُقرأ محتواها ولا يُصدَّق: وجودُ الاسم وحدَه هو الحدس.
 */
function hasSessionCookie() {
  if (typeof document === "undefined") return false;
  return /(?:^|;\s*)sb-[^=;]+-auth-token/.test(document.cookie);
}

/** لا حدثَ للكوكيز يُشترَك فيه: اللقطةُ تُقرأ مرّةً عند الترطيب ولا تتبدّل بعدها. */
function subscribeNothing() {
  return () => {};
}
