"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { HEARTBEAT_MS, SESSION_KEY, TRACK_FN, TRACK_MAX_SECONDS, VISITOR_KEY, randomUuid } from "@adeeb/core/tracking";
import { createClient } from "@/lib/supabase/client";

/**
 * **تتبّعُ الزيارات في V2** — كان السكربتُ في V1 وحده (`adeeb/visit-tracker.js`)، فلمّا حلّ V2 محلَّه
 * توقّف التسجيلُ عمليًّا: آخرُ أيّامٍ فيها حركةٌ حقيقيّة كانت نهايةَ يوليو ٢٠٢٦، ثمّ صار اليومُ
 * مشاهدةً أو اثنتين من متصفّحاتٍ قديمةٍ وروبوتات. فتبويبُ الإحصائيّات يعرض تاريخًا لا حاضرًا.
 *
 * **يُخاطب دالّة الحافّة `track-pageview` نفسها** التي كان يخاطبها V1، بالمفاتيح نفسها
 * (`adeeb_visitor_id` في `localStorage` و`adeeb_session_id` في `sessionStorage`) — فمن زار V1
 * وعاد إلى V2 يبقى **الزائرَ نفسَه** لا زائرًا جديدًا. والدالّةُ عامّة (`verify_jwt = false`)
 * فلا تُرسَل معها مفاتيح.
 *
 * **ثلاثةُ قيود مقصودة:**
 * - **لا تُتبَّع غرفُ اللوحة** (`/dashboard/*`): نشاطُ الإدارة ليس زيارةَ موقع، وخلطُه يفسد كلّ
 *   رقمٍ في الصفحة. (ودالّةُ الحافّة تسِم `‎/admin/*‎` وحدها إداريّةً، وهو مسارُ V1 لا V2.)
 * - **لا يُتبَّع التطوير**: العملُ على `localhost` لا يُكتب في إحصاءات الموقع الحيّ. وللاختبار
 *   المقصود: `sessionStorage.setItem("adeeb_track_dev", "1")`.
 * - **الوقتُ يُحسب وهي ظاهرة**: النبضةُ تتوقّف حين يُخفى التبويب، فلا تُحسب ساعاتُ تبويبٍ منسيّ.
 *
 * ومعه ما لم يكن في V1 كاملًا: **هويّةُ العضو** (`user_id` من جلسة Supabase) — فمؤشّر «زيارة عضو»
 * كان صفرًا دائمًا لأنّ أحدًا لم يرسله.
 */

// الوجهةُ والمفاتيحُ والنبضةُ في `@adeeb/core/tracking` — يقرؤها الويبُ والتطبيقُ معًا.

const stored = (store: Storage | undefined, key: string) => {
  try {
    if (!store) return randomUuid();
    const v = store.getItem(key);
    if (v) return v;
    const fresh = randomUuid();
    store.setItem(key, fresh);
    return fresh;
  } catch {
    return randomUuid(); // متصفّحٌ يمنع التخزين: نعدّه زائرًا جديدًا ولا نتعطّل
  }
};

/** أتُتبَّع هذه الصفحة أصلًا؟ */
function shouldTrack(path: string) {
  if (typeof window === "undefined") return false;
  if (path.startsWith("/dashboard")) return false;
  const host = window.location.hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1" || host.endsWith(".local");
  if (isLocal) {
    try {
      return sessionStorage.getItem("adeeb_track_dev") === "1";
    } catch {
      return false;
    }
  }
  return true;
}

export function VisitTracker() {
  const path = usePathname();
  // مرجعٌ واحدٌ للزيارة الجارية: يُغلق عند التنقّل فلا تتراكب نبضتان.
  const live = useRef<{ id: string | null; started: number; stopped: boolean }>({ id: null, started: 0, stopped: false });

  useEffect(() => {
    if (!path || !shouldTrack(path)) return;

    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!base) return;
    const url = base.replace(/\/+$/, "") + TRACK_FN;

    const view = { id: null as string | null, started: Date.now(), stopped: false };
    live.current = view;

    const seconds = () => Math.min(TRACK_MAX_SECONDS, Math.floor((Date.now() - view.started) / 1000));
    let timer: ReturnType<typeof setInterval> | undefined;

    const begin = async () => {
      let userId: string | null = null;
      try {
        const { data } = await createClient().auth.getUser();
        userId = data.user?.id ?? null;
      } catch {
        userId = null;
      }
      if (view.stopped) return;

      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "omit",
          mode: "cors",
          keepalive: true,
          body: JSON.stringify({
            visitor_id: stored(window.localStorage, VISITOR_KEY),
            session_id: stored(window.sessionStorage, SESSION_KEY),
            page_path: path,
            page_url: window.location.href,
            page_title: document.title || null,
            referrer: document.referrer || null,
            screen_width: window.screen?.width ?? null,
            screen_height: window.screen?.height ?? null,
            language: (navigator.language || "").slice(0, 20) || null,
            user_id: userId,
          }),
        });
        if (!res.ok || view.stopped) return;
        const data = (await res.json()) as { pageview_id?: string };
        if (!data?.pageview_id || view.stopped) return;
        view.id = data.pageview_id;

        timer = setInterval(() => {
          if (!view.id || view.stopped || document.visibilityState === "hidden") return;
          void fetch(`${url}/heartbeat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "omit",
            mode: "cors",
            keepalive: true,
            body: JSON.stringify({ pageview_id: view.id, total_seconds: seconds() }),
          }).catch(() => {});
        }, HEARTBEAT_MS);
      } catch {
        // التتبّعُ لا يُعطّل صفحةً: كلُّ فشلٍ يُبتلع صامتًا
      }
    };

    // **تأخيرٌ قصيرٌ قبل التسجيل**: في تنقّل العميل يتغيّر المسارُ قبل أن يضع Next عنوانَ الصفحة،
    // فتُسجَّل الزيارةُ بعنوان الصفحة السابقة (رأيتُها في الاختبار). ويُلغي هذا التأخيرُ أيضًا
    // تسجيلَ صفحةٍ عبَرها الزائرُ في أقلّ من جزءٍ من الثانية.
    const starter = setTimeout(() => { void begin(); }, 400);

    /**
     * الخاتمة — تُرسَل **منارةً** (`sendBeacon`): هي الوسيلةُ المصمَّمة للنجاة من هدم الصفحة، وتصلح
     * كذلك للتنقّل داخل الموقع (الهدمُ هناك هدمُ مكوّنٍ لا وثيقة). و`fetch` بديلٌ إن غابت.
     *
     * وإن ضاعت الخاتمةُ رغم ذلك فالمدّةُ **ليست صفرًا**: النبضةُ كتبتها كلّ خمس عشرة ثانية، فأسوأُ
     * ما يقع نقصٌ دون ذلك. (وهذا مقيسٌ لا مفترَض: زيارةٌ في الاختبار سجّلت ٣١ ثانيةً بنبضتها.)
     */
    const end = () => {
      if (!view.id || view.stopped) return;
      view.stopped = true;
      const body = JSON.stringify({ pageview_id: view.id, total_seconds: seconds() });
      try {
        if (navigator.sendBeacon && navigator.sendBeacon(`${url}/end`, new Blob([body], { type: "application/json" }))) return;
      } catch {
        /* يسقط إلى fetch */
      }
      void fetch(`${url}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        mode: "cors",
        keepalive: true,
        body,
      }).catch(() => {});
    };
    const endOnUnload = () => end();

    /** إخفاءُ التبويب: نُثبّت المدّةَ نبضةً — الخاتمةُ عند الإغلاق قد لا تصل (جرّبتُها فلم تصل). */
    const onHide = () => {
      if (!view.id || view.stopped || document.visibilityState !== "hidden") return;
      const body = JSON.stringify({ pageview_id: view.id, total_seconds: seconds() });
      try {
        if (navigator.sendBeacon) {
          navigator.sendBeacon(`${url}/heartbeat`, new Blob([body], { type: "application/json" }));
          return;
        }
      } catch {
        /* يسقط إلى fetch */
      }
      void fetch(`${url}/heartbeat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "omit", mode: "cors", keepalive: true, body,
      }).catch(() => {});
    };

    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", endOnUnload);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", endOnUnload);
      clearTimeout(starter);
      if (timer) clearInterval(timer);
      end(); // التنقّل داخل الموقع خاتمةٌ كإغلاق التبويب
    };
  }, [path]);

  return null;
}
