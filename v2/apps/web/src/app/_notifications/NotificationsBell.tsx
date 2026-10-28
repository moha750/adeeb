"use client";

import { Suspense, lazy, useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loadClient } from "@/lib/supabase/lazy";
import type { InboxFilter, InboxItem } from "@/lib/notifications/types";
import { loadInboxPage, loadInboxSummary, readAllNotes, readNotes } from "./actions";
import { BellButton } from "./BellButton";

/**
 * **اللوحُ يُحمَّل بعد الجرس لا معه** (٢٠٢٦-١٠-٢٧، قياسُ جوّالٍ على 4G). اللوحُ يجرّ خريطةَ أيقونات
 * اللوحة كلّها (`_shell/icons`، ٤٧ أيقونة) ومعها الحوارُ والمقسّم، وكان ذلك يُنزَّل لكلّ زائرٍ في
 * كلّ صفحةٍ عامّة وهو لا يُفتح إلّا لصاحب جلسة. فيُطلب حين يُعرف صاحبُ الجلسة (في وقت فراغ
 * المتصفّح) أو حين يُفتح، أيُّهما سبق.
 */
const loadDrawer = () => import("./InboxDrawer");
const InboxDrawer = lazy(() => loadDrawer().then((m) => ({ default: m.InboxDrawer })));

/**
 * **جرسُ صاحب الجلسة** — في رأس اللوحة (`DashboardShell`) ورأس الموقع (`SiteHeader`)، جرسٌ واحدٌ
 * وصندوقٌ واحدٌ للشخص أيًّا كانت منزلتُه (`v2/NOTIFICATIONS-SYSTEM.md` §٥).
 *
 * - **العددُ** من الخادم عند التحميل، وعند عودة الصفحة إلى الواجهة، وحين يسمع **Realtime** تغيّرًا في
 *   صفوف صاحبه (`notification_inbox`، وسياستُها قراءةُ صاحب الصفّ وحده).
 * - **ونداءاتُ Realtime تُجمَع** (٤٠٠ms) قبل أن تُسأل: «تعليمُ الكلّ مقروءًا» على أربعين يُطلق أربعين
 *   تحديثًا، والأفعالُ الخادميّة في Next تُنفَّذ واحدًا بعد واحد، فلو سُئل لكلٍّ لَوقف كلُّ فعلٍ في
 *   الصفحة خلف ثمانين نداءً (من المراجعة المستقلّة، ٢٠٢٦-١٠-١٠).
 * - **والوصولُ يُضاف ولا يُعيد القائمة**: إشعارٌ يصل واللوحُ مفتوح يُلحَق بأعلاها، فلا يُمحى ما حمّله
 *   صاحبُه من صفحاتٍ أقدم ولا يقفز موضعُه.
 * - **والعددُ على أيقونة التطبيق المثبَّت** (Badging API) يتبعه.
 * - **واللوحُ** يُحمَّل عند فتحه، ثلاثين ثلاثين، و«قُرئ» يُرسَم فورًا ثمّ يُكتب.
 * - **وكلُّ نداءٍ يُمسَك سقوطُه**: نشرٌ جديدٌ (معرّفُ فعلٍ قديم) أو انقطاعٌ لا يترك اللوحَ عالقًا.
 * - ولا جلسةَ ⇒ لا جرس: يختفي بعد أوّل جواب.
 */

const SETTLE_MS = 400;

type Client = Awaited<ReturnType<typeof loadClient>>;

export function NotificationsBell() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [gone, setGone] = useState(false);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<InboxFilter>("unread");
  const [items, setItems] = useState<InboxItem[] | null>(null);
  const [more, setMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  /** رُكِّب اللوحُ؟ مرّةً تكفي: يبقى مركَّبًا مغلقًا كما كان قبل التأجيل، فيفتح بحركته المعتادة. */
  const [armed, setArmed] = useState(false);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshCount = useCallback(() => {
    loadInboxSummary()
      .then((s) => {
        if (!s) return setGone(true);
        setUserId(s.userId);
        setUnread(s.unread);
      })
      .catch(() => {});
  }, []);

  const loadFirst = useCallback((t: InboxFilter) => {
    setItems(null);
    setMore(false);
    loadInboxPage(t)
      .then((p) => {
        setItems(p?.items ?? []);
        setMore(!!p?.more);
      })
      .catch(() => setItems([]));
  }, []);

  useEffect(() => {
    refreshCount();
    const onVisible = () => document.visibilityState === "visible" && refreshCount();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refreshCount]);

  /**
   * تغيّرٌ في صفوف صاحبه: يُجمَع ثمّ يُسأل مرّةً واحدة. وما وصل واللوحُ مفتوح يُلحَق بأعلاه: الأحدثُ
   * ممّا لم يُعرَف بعد.
   */
  const onInboxChange = useEffectEvent((inserted: boolean) => {
    const prepend = inserted && open && items !== null;
    const t = tab;
    if (settle.current) clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      refreshCount();
      if (!prepend) return;
      loadInboxPage(t)
        .then((p) => {
          if (!p) return;
          setItems((xs) => {
            if (!xs) return xs;
            const top = xs[0]?.id ?? 0;
            const fresh = p.items.filter((n) => n.id > top);
            return fresh.length ? [...fresh, ...xs] : xs;
          });
        })
        .catch(() => {});
    }, SETTLE_MS);
  });

  /* صاحبُ الجلسة معروف ⇒ يُجهَّز اللوحُ في وقت الفراغ، فلا ينتظر أوّلُ فتحٍ تنزيلَه. */
  useEffect(() => {
    if (!userId) return;
    const arm = () => {
      loadDrawer()
        .then(() => setArmed(true))
        .catch(() => {});
    };
    if ("requestIdleCallback" in window) {
      const h = window.requestIdleCallback(arm, { timeout: 4000 });
      return () => window.cancelIdleCallback(h);
    }
    const t = setTimeout(arm, 1500);
    return () => clearTimeout(t);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    let sb = null as Client | null;
    let channel = null as ReturnType<Client["channel"]> | null;
    // **الرمزُ يُسلَّم صراحةً قبل الاشتراك** (٢٠٢٦-١٠-١١، من التجربة الحيّة): كان الجرسُ يشترك ويقول
    // «SUBSCRIBED» ولا يصله شيء، لأنّ القناةَ انضمّت بمفتاح الزائر قبل أن يُقرأ رمزُ الجلسة من
    // الكوكيز، فحجبت سياسةُ «صاحب الصفّ وحده» كلَّ صفّ. وعميلٌ سلّم رمزَه قبل الانضمام وصله الإدراج
    // فورًا. والتجديدُ بعده تتولّاه المكتبة (`TOKEN_REFRESHED` يسلّم الرمزَ الجديد).
    // المكتبةُ تُنزَّل هنا أوّلَ مرّة (`lib/supabase/lazy`): الجرسُ لا يُركَّب إلّا لصاحب جلسة.
    void loadClient().then(async (client) => {
      if (!alive) return;
      sb = client;
      const { data } = await client.auth.getSession();
      const token = data.session?.access_token;
      if (!alive || !token) return;
      await client.realtime.setAuth(token);
      if (!alive) return;
      // موضوعٌ فريدٌ لكلّ تركيب: المكتبةُ تعيد القناةَ نفسَها بموضوعها، فلو رُكّب الجرسُ والقديمةُ لم
      // تُغادَر بعد (تنقّلٌ بين صفحتين عامّتين) لَما اشتركت الجديدة (من المراجعة المستقلّة).
      const topic = `inbox-${userId}-${Math.random().toString(36).slice(2)}`;
      channel = client
        .channel(topic)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "notification_inbox", filter: `user_id=eq.${userId}` },
          (payload) => onInboxChange(payload.eventType === "INSERT"),
        )
        .subscribe();
    }).catch(() => {});
    return () => {
      alive = false;
      if (settle.current) clearTimeout(settle.current);
      if (sb && channel) void sb.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    (unread > 0 ? nav.setAppBadge?.(unread) : nav.clearAppBadge?.())?.catch(() => {});
  }, [unread]);

  const close = useCallback(() => setOpen(false), []);

  const show = () => {
    setArmed(true);
    setOpen(true);
    loadFirst(tab);
  };

  const onTab = (t: InboxFilter) => {
    setTab(t);
    loadFirst(t);
  };

  const onMore = useCallback(() => {
    const last = items?.[items.length - 1];
    if (!last || loadingMore) return;
    setLoadingMore(true);
    loadInboxPage(tab, last.id)
      .then((p) => {
        setItems((xs) => [...(xs ?? []), ...(p?.items ?? [])]);
        setMore(!!p?.more);
      })
      .catch(() => setMore(false))
      .finally(() => setLoadingMore(false));
  }, [items, loadingMore, tab]);

  const onOpen = (item: InboxItem) => {
    if (item.unread) {
      setItems((xs) => xs?.map((x) => (x.id === item.id ? { ...x, unread: false } : x)) ?? xs);
      setUnread((n) => Math.max(0, n - 1));
      readNotes([item.id]).catch(() => {});
    }
    if (item.href) {
      setOpen(false);
      router.push(item.href);
    }
  };

  const onReadAll = () => {
    setItems((xs) => xs?.map((x) => ({ ...x, unread: false })) ?? xs);
    setUnread(0);
    readAllNotes().catch(() => {});
  };

  if (gone) return null;

  return (
    <>
      <BellButton count={unread} open={open} onClick={open ? close : show} />
      {armed ? (
        <Suspense fallback={null}>
          <InboxDrawer
            open={open}
            unread={unread}
            tab={tab}
            onTab={onTab}
            items={items}
            more={more}
            loadingMore={loadingMore}
            onMore={onMore}
            onOpen={onOpen}
            onReadAll={onReadAll}
            onClose={close}
          />
        </Suspense>
      ) : null}
    </>
  );
}
