/**
 * عاملُ خدمة أدِيب — **للإشعارات وحدها** (٢٠٢٦-١٠-٠٣).
 *
 * لا يعترض طلبًا ولا يخزّن صفحة: لا `fetch` ههنا عمدًا. فالموقعُ حيٌّ يتبدّل كلَّ ساعة
 * (لوحةٌ وحجوزٌ وانتخابات)، وصفحةٌ مخبوءةٌ قديمةٌ أخطرُ من صفحةٍ لا تُفتح بلا شبكة.
 * والتثبيتُ لا يشترطه: كروم أسقط شرطَ العمل بلا اتّصال، وآيفون لم يشترطه قطّ.
 *
 * والحمولةُ يصوغها `lib/push/send.ts`: { title, body, url, tag }.
 */

self.addEventListener("install", () => self.skipWaiting());

/**
 * عند النشاط: يمحو كلَّ ذاكرةٍ مخبوءة ويتسلّم الصفحات المفتوحة. وما في الذاكرة ليس لنا —
 * هذا العاملُ لا يخبّئ شيئًا — بل إرثُ عامل النسخة الأولى (`/service-worker.js`) الذي كان
 * يخبّئ كلَّ طلبٍ بلا حدّ، وهذا العاملُ يحلّ محلَّه على النطاق نفسِه.
 */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

/**
 * **كلُّ دفعةٍ تُرى** — آيفون يعدّ الدفعةَ التي لا يتبعها إشعارٌ ظاهرٌ «دفعةً صامتة»
 * فيُلغي الاشتراك. فحتّى الحمولةُ التالفة تُظهر شيئًا.
 */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : "" };
  }
  // حمولةٌ ليست كائنًا (`null` أو رقم) تُرمى قبل `waitUntil` فلا يظهر شيء — فتُستبدل.
  if (!data || typeof data !== "object") data = {};
  const tag = typeof data.tag === "string" && data.tag ? data.tag : undefined;
  event.waitUntil(
    self.registration.showNotification(data.title || "أَدِيب", {
      body: data.body || "",
      icon: "/pwa/icon-192.png",
      badge: "/pwa/badge-96.png",
      dir: "rtl",
      lang: "ar",
      tag,
      // إعادةُ التنبيه تشترط وسمًا، وبدونه يرمي كروم خطأً فلا يظهر شيء.
      renotify: Boolean(tag),
      data: { url: typeof data.url === "string" ? data.url : "/" },
    }),
  );
});

/**
 * النقرُ يفتح المسار في نافذة أدِيب القائمة إن وُجدت، وإلّا في نافذةٍ جديدة.
 *
 * **الانتقالُ قبل التركيز**: المتصفّحُ يأذن للعامل بفتح نافذةٍ أو تركيزها مرّةً واحدةً بعد
 * النقر، فلو رُكِّزت النافذةُ أوّلًا ثمّ تعذّر انتقالُها لَرُدّ `openWindow` البديل وبقي
 * صاحبُ النقرة على صفحته القديمة. والنوافذُ المقصودة **التي يتسلّمها هذا العامل** وحدها،
 * إذ لا يقود `navigate` سواها.
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const origin = self.location.origin;
  let target = new URL("/", origin);
  try {
    const u = new URL((event.notification.data && event.notification.data.url) || "/", origin);
    if (u.origin === origin) target = u;
  } catch (e) {
    /* مسارٌ لا يُقرأ: الرئيسيّة */
  }
  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: "window" });
      const win = wins.find((c) => new URL(c.url).origin === origin);
      if (win) {
        try {
          const moved = new URL(win.url).href === target.href ? win : await win.navigate(target.href);
          if (moved) {
            await moved.focus();
            return;
          }
        } catch (e) {
          /* نافذةٌ لا تُقاد: تُفتح أخرى */
        }
      }
      await self.clients.openWindow(target.href);
    })(),
  );
});
