/* Admin PWA Service Worker */
const CACHE_VERSION = 'v2';
const STATIC_CACHE = `admin-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `admin-runtime-${CACHE_VERSION}`;

const PRECACHE_ASSETS = [
  './admin.html',
  './admin.css',
  './admin.js',
  '../style.css',
  '../supabase-config.js',
  '../LOGO.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => {
        if (![STATIC_CACHE, RUNTIME_CACHE].includes(key)) {
          return caches.delete(key);
        }
      })
    )).then(() => self.clients.claim())
  );
});

function isSupabaseRequest(url) {
  return /\.supabase\.(co|in)\b/.test(url.hostname);
}

function cacheFirst(request) {
  return caches.match(request).then((cached) => {
    if (cached) return cached;
    return fetch(request).then((response) => {
      const copy = response.clone();
      caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy)).catch(()=>{});
      return response;
    }).catch(() => caches.match('./admin.html'));
  });
}

function networkFirst(request) {
  return fetch(request).then((response) => {
    const copy = response.clone();
    caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy)).catch(()=>{});
    return response;
  }).catch(() => caches.match(request).then((cached) => cached || caches.match('./admin.html')));
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return; // ignore non-GET

  const url = new URL(request.url);

  // Never hijack Supabase API/Realtime/Storage requests
  if (isSupabaseRequest(url)) return; // let the network handle it directly

  // For navigation requests, try network first, then fall back to cached shell
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  const isSameOrigin = url.origin === self.location.origin;
  const isJS = /\.js$/i.test(url.pathname);
  const isCSS = /\.css$/i.test(url.pathname);
  const isImageOrFont = /\.(?:png|jpg|jpeg|webp|svg|gif|ico|ttf|otf|woff2?)$/i.test(url.pathname);

  if (isSameOrigin && (isJS || isCSS)) {
    event.respondWith(networkFirst(request));
    return;
  }
  if (isSameOrigin && isImageOrFont) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (isSameOrigin) {
    event.respondWith(networkFirst(request));
  }
});

// Push notification event listener
self.addEventListener('push', (event) => {
  let data = {
    title: 'إشعار جديد',
    body: 'لديك إشعار جديد من نادي أدِيب',
    icon: '../LOGO.png',
    badge: '../admin/icons/icon-72x72.png',
    tag: 'adeeb-notification',
    data: {}
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = { ...data, ...payload };
    }
  } catch (e) {
    console.error('Error parsing push data:', e);
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: data.data || {},
    dir: 'rtl',
    lang: 'ar',
    vibrate: [200, 100, 200],
    requireInteraction: false,
    actions: data.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event listener
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || './admin.html';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Check if there's already a window/tab open
        for (const client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // If not, open a new window/tab
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Background sync for failed notification sends (optional)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

async function syncNotifications() {
  // Implement retry logic for failed notifications if needed
  console.log('Syncing notifications...');
}
