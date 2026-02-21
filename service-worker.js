/**
 * Service Worker لنادي أدِيب
 * يوفر إمكانية العمل بدون إنترنت والتخزين المؤقت
 */

const CACHE_NAME = 'adeeb-v1';
const STATIC_CACHE = 'adeeb-static-v1';
const DYNAMIC_CACHE = 'adeeb-dynamic-v1';

// الملفات الأساسية للتخزين المؤقت
const STATIC_FILES = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/admin/dashboard.html',
    '/admin/dashboard.css',
    '/admin/dashboard.js',
    '/favicon/android-icon-192x192.png',
    '/favicon/apple-icon-180x180.png',
    '/adeeb-logo.png',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// تثبيت Service Worker
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('[SW] Caching static files');
                return cache.addAll(STATIC_FILES.map(url => new Request(url, {cache: 'reload'})));
            })
            .catch((error) => {
                console.error('[SW] Cache failed:', error);
            })
    );
    
    self.skipWaiting();
});

// تفعيل Service Worker
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker...');
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    
    return self.clients.claim();
});

// اعتراض الطلبات
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // تجاهل الطلبات غير HTTP/HTTPS (chrome-extension, data, blob, etc.)
    if (!url.protocol.startsWith('http')) {
        return;
    }
    
    // تجاهل طلبات Supabase والـ API
    if (url.origin.includes('supabase') || url.origin.includes('googleapis')) {
        return;
    }
    
    // استراتيجية Cache First للملفات الثابتة
    if (request.method === 'GET') {
        event.respondWith(
            caches.match(request)
                .then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    
                    return fetch(request)
                        .then((response) => {
                            // لا نخزن الاستجابات غير الناجحة
                            if (!response || response.status !== 200 || response.type === 'error') {
                                return response;
                            }
                            
                            // نسخ الاستجابة للتخزين المؤقت
                            const responseToCache = response.clone();
                            
                            caches.open(DYNAMIC_CACHE)
                                .then((cache) => {
                                    cache.put(request, responseToCache);
                                });
                            
                            return response;
                        })
                        .catch(() => {
                            // إرجاع صفحة offline إذا كانت متاحة
                            if (request.destination === 'document') {
                                return caches.match('/index.html');
                            }
                        });
                })
        );
    }
});

// معالجة الرسائل من التطبيق
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// إشعارات Push
self.addEventListener('push', (event) => {
    console.log('[SW] Push notification received');
    
    let notificationData = {
        title: 'نادي أدِيب',
        body: 'إشعار جديد',
        icon: '/favicon/android-icon-192x192.png',
        badge: '/favicon/android-icon-192x192.png',
        data: { url: '/admin/dashboard.html' }
    };
    
    if (event.data) {
        try {
            const payload = event.data.json();
            console.log('[SW] Parsed payload:', payload);
            
            // التعامل مع الصيغة المتداخلة
            if (payload.notification) {
                notificationData = {
                    title: payload.notification.title || notificationData.title,
                    body: payload.notification.body || notificationData.body,
                    icon: payload.notification.icon || notificationData.icon,
                    badge: payload.notification.badge || notificationData.badge,
                    tag: payload.notification.tag,
                    requireInteraction: payload.notification.requireInteraction || false,
                    vibrate: [200, 100, 200],
                    dir: 'rtl',
                    lang: 'ar',
                    data: payload.notification.data || notificationData.data
                };
            } else {
                // الصيغة المباشرة
                notificationData = {
                    title: payload.title || notificationData.title,
                    body: payload.body || notificationData.body,
                    icon: payload.icon || notificationData.icon,
                    badge: payload.badge || notificationData.badge,
                    tag: payload.tag,
                    requireInteraction: payload.requireInteraction || false,
                    vibrate: [200, 100, 200],
                    dir: 'rtl',
                    lang: 'ar',
                    data: payload.data || notificationData.data
                };
            }
        } catch (error) {
            console.error('[SW] Error parsing notification:', error);
        }
    }
    
    event.waitUntil(
        self.registration.showNotification(notificationData.title, {
            body: notificationData.body,
            icon: notificationData.icon,
            badge: notificationData.badge,
            tag: notificationData.tag,
            requireInteraction: notificationData.requireInteraction,
            vibrate: notificationData.vibrate,
            dir: notificationData.dir,
            lang: notificationData.lang,
            data: notificationData.data
        })
    );
});

// معالجة النقر على الإشعارات
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked');
    event.notification.close();
    
    const urlToOpen = event.notification.data?.url || '/admin/dashboard.html';
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // إذا كان هناك نافذة مفتوحة، ركز عليها
                for (const client of clientList) {
                    if (client.url.includes(urlToOpen) && 'focus' in client) {
                        return client.focus();
                    }
                }
                // وإلا افتح نافذة جديدة
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});
