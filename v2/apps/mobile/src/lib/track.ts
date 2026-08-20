import {
  HEARTBEAT_MS,
  randomUuid,
  TRACK_DEV_KEY,
  TRACK_FN,
  TRACK_MAX_SECONDS,
  VISITOR_KEY,
  type TrackSource,
} from "@adeeb/core/tracking";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { getLocales } from "expo-localization";
import { AppState, Dimensions, Platform } from "react-native";

import { env } from "./env";
import { readPref } from "./prefs";

/**
 * تتبّعُ الشاشات في التطبيق.
 *
 * يخاطب **دالّةَ الحافّة نفسَها** التي يخاطبها الموقع (`track-pageview`) بالحقول نفسِها،
 * فلا ترحيلَ ولا نشرَ دالّةٍ ولا جدولَ ثانٍ. وثلاثةُ قراراتٍ في هذا الملفّ تستحقّ التفسير:
 *
 * **١. الوسمُ `adeeb://`**: الدالّةُ تخزّن `page_url` كما يُرسَل، فيُرسَل عنوانُ الشاشة
 * بمخطَّط التطبيق (`adeeb://news/…`) بينما `page_path` يبقى المسارَ نفسَه. فمن أراد
 * فصلَ جمهور التطبيق عن جمهور الموقع فصله بشرطٍ واحدٍ على `page_url`، ومن أراد جمعَهما
 * جمعهما بالمسار. ولا عمودَ جديدٌ في القاعدة اليوم، وإن أردتَه غدًا فترحيلٌ واحد.
 *
 * **٢. سلسلةُ العميل تُصاغ صياغةً يفهمها المحلّلُ المنشور**: الدالّةُ تشتقّ النظامَ ونوعَ
 * الجهاز من ترويسة `User-Agent`، وترويسةُ React Native الافتراضيّةُ لا يعرفها فتُحسَب
 * الزيارةُ **حاسوبًا مكتبيًّا**. فتُصاغ على صورةٍ يقرؤها: `iPhone OS 26_3` بالشرطة
 * السفليّة كما تكتبها سفاري، و`Android …; Mobile` كما يكتبها كروم.
 *
 * **٣. لا يُتبَّع التطوير** إلّا بإذنٍ صريح: العملُ على جهاز المطوِّر لا يُكتب في إحصاءات
 * الموقع الحيّ، وهو قيدُ الويب نفسُه. وبابُه الخلفيُّ مفتاحُ `TRACK_DEV_KEY` نفسُه الذي
 * يفتحه الويبُ في `sessionStorage`، ويقلبه هنا مبدّلٌ في تبويب «المعرض» (تطويرٌ وحدَه).
 */

/** أيُسجَّل ما يقع على جهاز المطوِّر؟ في الإنتاج السؤالُ لا يُطرَح أصلًا. */
const tracking = () => !__DEV__ || readPref(TRACK_DEV_KEY) === "1";

const url = () => env.supabaseUrl.replace(/\/+$/, "") + TRACK_FN;

/** سلسلةُ عميلٍ يفهمها المحلّلُ المنشور، فيُسجَّل الجهازُ جوّالًا لا مكتبًا. */
function userAgent(): string {
  const version = (Constants.expoConfig?.version as string | undefined) ?? "0";
  if (Platform.OS === "ios") {
    const os = String(Platform.Version).replace(/\./g, "_");
    return `Adeeb/${version} (iPhone; CPU iPhone OS ${os} like Mac OS X)`;
  }
  return `Adeeb/${version} (Linux; Android ${Platform.Version}; Mobile)`;
}

/** الزائرُ يبقى ما بقي التطبيقُ مثبَّتًا؛ يُقرأ مرّةً ويُحفَظ في الذاكرة. */
let visitorId: string | null = null;
async function visitor(): Promise<string> {
  if (visitorId) return visitorId;
  try {
    const saved = await AsyncStorage.getItem(VISITOR_KEY);
    if (saved) {
      visitorId = saved;
      return saved;
    }
  } catch {
    /* تخزينٌ متعذّر: زائرٌ جديدٌ ولا نتعطّل */
  }
  const fresh = randomUuid();
  visitorId = fresh;
  void AsyncStorage.setItem(VISITOR_KEY, fresh).catch(() => {});
  return fresh;
}

/**
 * الجلسةُ في المتصفّح تنتهي بإغلاق التبويب، وليس للتطبيق تبويبٌ يُغلق. فتُعدّ الجلسةُ
 * منتهيةً إن غاب صاحبُها عن التطبيق نصفَ ساعة، وهو ما تفعله أدواتُ القياس المعروفة.
 */
const SESSION_GAP_MS = 30 * 60_000;
let sessionId: string | null = null;
let leftAt = 0;

function session(): string {
  const now = Date.now();
  if (!sessionId || (leftAt && now - leftAt > SESSION_GAP_MS)) sessionId = randomUuid();
  leftAt = 0;
  return sessionId;
}

AppState.addEventListener("change", (state) => {
  if (state !== "active") leftAt = Date.now();
});

/** مقاسُ الشاشة بالنقاط كما يرسله المتصفّح، مقصورًا على ما يسع العمود. */
function screen(): { width: number; height: number } {
  const { width, height } = Dimensions.get("window");
  const cap = (n: number) => Math.min(32767, Math.max(0, Math.round(n)));
  return { width: cap(width), height: cap(height) };
}

export type View = { id: string | null; started: number; stopped: boolean; timer?: ReturnType<typeof setInterval> };

const seconds = (v: View) => Math.min(TRACK_MAX_SECONDS, Math.floor((Date.now() - v.started) / 1000));

async function post(path: string, body: unknown): Promise<Response | null> {
  try {
    return await fetch(url() + path, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": userAgent() },
      body: JSON.stringify(body),
    });
  } catch {
    return null; // التتبّعُ لا يُعطّل شاشةً: كلُّ فشلٍ يُبتلع صامتًا
  }
}

/**
 * تبدأ زيارةُ شاشة. الرجوعُ مرجعٌ يُغلَق بـ`endView`.
 *
 * **والهويّةُ تُمرَّر ولا تُسأل.** جُرّب السؤالُ على الجهاز مرّتين فكذب مرّتين: `getUser`
 * تسأل الشبكةَ فتردّ «لا أحد» قبل أن تُقرأ الجلسة، و`getSession` تسأل المخزنَ فتردّ مثلها
 * في الفجوة نفسِها (٢٠٢٦-٠٨-٢٠). والتطبيقُ يملك الجلسةَ أصلًا في `AuthProvider`، فمنه
 * تؤخذ: لا سؤالَ في لحظةٍ خطأ، ولا مصدرَ ثانٍ للهويّة.
 */
export function startView(path: string, title: string | null, userId: string | null): View {
  const view: View = { id: null, started: Date.now(), stopped: false };
  if (!tracking()) return view;

  void (async () => {
    const visitorValue = await visitor();
    if (view.stopped) return;

    const size = screen();
    const res = await post("", {
      visitor_id: visitorValue,
      session_id: session(),
      page_path: path,
      page_url: `adeeb:/${path}`,
      page_title: title,
      referrer: null,
      screen_width: size.width,
      screen_height: size.height,
      language: (getLocales()[0]?.languageTag ?? "").slice(0, 20) || null,
      user_id: userId,
      source: "app" satisfies TrackSource,
    });
    if (!res?.ok || view.stopped) return;

    const json = (await res.json().catch(() => null)) as { pageview_id?: string } | null;
    if (!json?.pageview_id || view.stopped) return;
    view.id = json.pageview_id;

    // النبضةُ تكفّ والتطبيقُ في الخلفيّة، فلا تُحسب دقائقُ جيبٍ منسيّ
    view.timer = setInterval(() => {
      if (!view.id || view.stopped || AppState.currentState !== "active") return;
      void post("/heartbeat", { pageview_id: view.id, total_seconds: seconds(view) });
    }, HEARTBEAT_MS);
  })();

  return view;
}

/** تُختم الزيارةُ بمدّتها. ولا `sendBeacon` هنا: لا وثيقةَ تُهدَم، والطلبُ يكتمل. */
export function endView(view: View): void {
  if (view.stopped) return;
  view.stopped = true;
  if (view.timer) clearInterval(view.timer);
  if (!view.id) return;
  void post("/end", { pageview_id: view.id, total_seconds: seconds(view) });
}
