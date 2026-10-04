"use client";

import { useSyncExternalStore } from "react";
import { devicePlatform, isStandalone, pushSupported, sameKey, swRegistration, vapidKey, type DevicePlatform } from "./client";
import { runInstallPrompt, useInstallPrompt } from "./installPrompt";
import { removePushSubscription, savePushSubscription, sendTestPush } from "./actions";

/**
 * **حالُ هذا الجهاز مع أَدِيب** — منطقٌ بلا رسم، والرسمُ في `PwaContent`. (٢٠٢٦-١٠-٠٣)
 *
 * **مخزنٌ واحدٌ للصفحة لا حالٌ لكلّ مكوّن:** البطاقةُ ونافذةُ الاستقبال قد تجتمعان في صفحة،
 * فلو حمل كلٌّ حالَه لَفعّل المرءُ من النافذة وبقيت البطاقةُ تقول «فعّلها». فالحالُ ههنا مرّةً،
 * ويُفحص الجهازُ مرّةً، ويقرؤه كلُّ من شاء.
 *
 * المراحلُ بالترتيب الذي يُسأل به:
 * - `ios-install` آيفون من تبويب: لا إشعارات قبل التثبيت، فالخطواتُ أوّلًا.
 * - `ios-update` آيفون مثبَّت بلا `PushManager`: نظامٌ أقدم من 16.4.
 * - `loading` لم يكتمل الفحص — ولا زرّ قبله: نقرةٌ مبكّرةٌ في آيفون تُهدر سؤالَ الإذن.
 * - `unsupported` متصفّحٌ لا يدعمها (أو تعذّر تسجيلُ العامل).
 * - `denied` رُفض الإذنُ مرّة، والمتصفّحُ لا يسأل ثانيةً من تلقاء نفسه.
 * - `ready` يمكن التفعيلُ الآن · `on` مفعّلةٌ **ومحفوظةٌ على الخادم**.
 */
export type PwaStage = "loading" | "ios-install" | "ios-update" | "unsupported" | "denied" | "ready" | "on";

export type PwaNote = { ok: boolean; text: string };

export type Pwa = {
  stage: PwaStage;
  platform: DevicePlatform | null;
  /** أندرويد/حاسوب أطلق عرضَ التثبيت ولم يُثبَّت بعد. */
  canInstall: boolean;
  busy: null | "enable" | "disable" | "test" | "install";
  note: PwaNote | null;
  enable: () => void;
  disable: () => void;
  test: () => void;
  install: () => void;
};

// ─── هيئةُ الجهاز: تُقرأ مرّةً ولا تتبدّل في الجلسة ───────────────────────────
type Env = { platform: DevicePlatform; standalone: boolean; push: boolean };
let envCache: Env | null = null;
const readEnv = () => (envCache ??= { platform: devicePlatform(), standalone: isStandalone(), push: pushSupported() });
const still = () => () => {};

// ─── المخزن ──────────────────────────────────────────────────────────────────
type State = {
  checked: boolean;
  reg: ServiceWorkerRegistration | null;
  sub: PushSubscription | null;
  perm: NotificationPermission;
  busy: Pwa["busy"];
  note: PwaNote | null;
};
const INITIAL: State = { checked: false, reg: null, sub: null, perm: "default", busy: null, note: null };
let state = INITIAL;
const listeners = new Set<() => void>();
function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

/** الفحصُ الأوّل — مرّةً للصفحة، عند أوّل من يقرأ المخزن. */
let started = false;
function start() {
  if (started) return;
  started = true;
  void (async () => {
    try {
      const r = await swRegistration();
      if (!r) return;
      set({ reg: r });
      if (!pushSupported()) return;
      set({ perm: Notification.permission });
      let s = await r.pushManager.getSubscription();
      // اشتراكٌ وُلد بمفتاحٍ غير مفتاحنا لا يصل إليه شيء ولو بدا قائمًا: يُلغى فيُعرض التفعيلُ من جديد.
      const key = vapidKey();
      if (s && key && !sameKey(s, key)) {
        await s.unsubscribe().catch(() => false);
        s = null;
      }
      if (!s) return;
      // «مفعّلة» تعني محفوظةً على الخادم لا موجودةً في المتصفّح فحسب — فيُعاد الحفظ ويُصدَّق جوابُه.
      const res = await savePushSubscription(s.toJSON());
      if (res.ok) set({ sub: s });
      else set({ note: { ok: false, text: res.message } });
    } catch {
      /* يبقى «غير مدعوم» إن لم يُعرف شيء */
    } finally {
      set({ checked: true });
    }
  })();
}
function subscribe(l: () => void) {
  start();
  listeners.add(l);
  return () => listeners.delete(l);
}

// ─── الأفعال ─────────────────────────────────────────────────────────────────

/**
 * **الاشتراكُ أوّلُ ما يُنادى في النقرة** — آيفون لا يسأل عن الإذن إلّا استجابةً لنقرةٍ
 * مباشرة، و`subscribe` نفسُه يُظهر السؤال. فلا انتظارَ قبله (ولهذا يُحضَّر التسجيلُ مسبقًا).
 * وغيرُ آيفون يُسأل بـ`requestPermission` أوّلًا: فايرفوكس لا يسأل من `subscribe`.
 */
function enable() {
  const { reg } = state;
  const key = vapidKey();
  if (!reg || !key) {
    set({ note: { ok: false, text: "الإشعارات غير مهيّأة على الخادم بعد." } });
    return;
  }
  const opts = { userVisibleOnly: true, applicationServerKey: key };
  const go =
    readEnv().platform === "ios"
      ? reg.pushManager.subscribe(opts)
      : (Notification.permission === "default" ? Notification.requestPermission() : Promise.resolve(Notification.permission)).then(
          (p) => {
            if (p !== "granted") throw new Error(p);
            return reg.pushManager.subscribe(opts);
          },
        );
  set({ busy: "enable", note: null });
  go.then(async (s) => {
    const res = await savePushSubscription(s.toJSON());
    set({ sub: res.ok ? s : null, note: { ok: res.ok, text: res.message } });
  })
    .catch(() => {
      set({ perm: Notification.permission });
      if (Notification.permission !== "denied") set({ note: { ok: false, text: "لم يكتمل التفعيل. حاول مجدّدًا." } });
    })
    .finally(() => set({ busy: null }));
}

/** الإيقافُ يحذف الصفَّ ثمّ يُلغي اشتراكَ المتصفّح — فلا يبقى طرفٌ يظنّ الآخرَ قائمًا. */
function disable() {
  const { reg } = state;
  if (!reg) return;
  set({ busy: "disable", note: null });
  void (async () => {
    try {
      const s = state.sub ?? (await reg.pushManager.getSubscription());
      if (s) {
        const res = await removePushSubscription(s.endpoint);
        if (!res.ok) {
          set({ note: { ok: false, text: res.message } });
          return;
        }
        await s.unsubscribe().catch(() => false);
      }
      set({ sub: null, note: { ok: true, text: "أُوقفت الإشعارات على هذا الجهاز." } });
    } catch {
      set({ note: { ok: false, text: "تعذّر إيقاف الإشعارات. حاول مجدّدًا." } });
    } finally {
      set({ busy: null });
    }
  })();
}

/** الخادمُ يجيب فورًا ثمّ يرسل بعد ثوانٍ — فيُقال للمستخدم أن يقفل شاشته الآن. */
function test() {
  const { sub } = state;
  if (!sub) return;
  set({ busy: "test", note: null });
  sendTestPush(sub.endpoint)
    .then((res) => set({ note: { ok: res.ok, text: res.message } }))
    .catch(() => set({ note: { ok: false, text: "تعذّر الوصول إلى الخادم. حاول مجدّدًا." } }))
    .finally(() => set({ busy: null }));
}

// ─── الخطّاف ─────────────────────────────────────────────────────────────────
export function usePwa(): Pwa {
  const env = useSyncExternalStore(still, readEnv, () => null);
  const s = useSyncExternalStore(subscribe, () => state, () => INITIAL);
  const prompt = useInstallPrompt();

  let stage: PwaStage = "loading";
  if (env) {
    if (env.platform === "ios" && !env.standalone) stage = "ios-install";
    else if (!env.push) stage = env.platform === "ios" ? "ios-update" : "unsupported";
    else if (!s.checked) stage = "loading";
    else if (!s.reg) stage = "unsupported";
    else if (s.perm === "denied") stage = "denied";
    else stage = s.sub ? "on" : "ready";
  }

  return {
    stage,
    platform: env?.platform ?? null,
    canInstall: Boolean(prompt) && env?.standalone === false,
    busy: s.busy,
    note: s.note,
    enable,
    disable,
    test,
    install: () => {
      if (!prompt) return;
      set({ busy: "install" });
      runInstallPrompt(prompt)
        .catch(() => false)
        .finally(() => set({ busy: null }));
    },
  };
}
