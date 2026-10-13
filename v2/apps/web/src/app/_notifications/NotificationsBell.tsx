"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { InboxFilter, InboxItem } from "@/lib/notifications/types";
import { loadInboxPage, loadInboxSummary, readAllNotes, readNotes } from "./actions";
import { BellButton } from "./BellButton";
import { InboxDrawer } from "./InboxDrawer";

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

  useEffect(() => {
    if (!userId) return;
    const sb = createClient();
    let alive = true;
    let channel: ReturnType<typeof sb.channel> | null = null;
    // **الرمزُ يُسلَّم صراحةً قبل الاشتراك** (٢٠٢٦-١٠-١١، من التجربة الحيّة): كان الجرسُ يشترك ويقول
    // «SUBSCRIBED» ولا يصله شيء، لأنّ القناةَ انضمّت بمفتاح الزائر قبل أن يُقرأ رمزُ الجلسة من
    // الكوكيز، فحجبت سياسةُ «صاحب الصفّ وحده» كلَّ صفّ. وعميلٌ سلّم رمزَه قبل الانضمام وصله الإدراج
    // فورًا. والتجديدُ بعده تتولّاه المكتبة (`TOKEN_REFRESHED` يسلّم الرمزَ الجديد).
    void sb.auth.getSession().then(async ({ data }) => {
      const token = data.session?.access_token;
      if (!alive || !token) return;
      await sb.realtime.setAuth(token);
      if (!alive) return;
      // موضوعٌ فريدٌ لكلّ تركيب: المكتبةُ تعيد القناةَ نفسَها بموضوعها، فلو رُكّب الجرسُ والقديمةُ لم
      // تُغادَر بعد (تنقّلٌ بين صفحتين عامّتين) لَما اشتركت الجديدة (من المراجعة المستقلّة).
      const topic = `inbox-${userId}-${Math.random().toString(36).slice(2)}`;
      channel = sb
        .channel(topic)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "notification_inbox", filter: `user_id=eq.${userId}` },
          (payload) => onInboxChange(payload.eventType === "INSERT"),
        )
        .subscribe();
    });
    return () => {
      alive = false;
      if (settle.current) clearTimeout(settle.current);
      if (channel) void sb.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    (unread > 0 ? nav.setAppBadge?.(unread) : nav.clearAppBadge?.())?.catch(() => {});
  }, [unread]);

  const close = useCallback(() => setOpen(false), []);

  const show = () => {
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
    </>
  );
}
