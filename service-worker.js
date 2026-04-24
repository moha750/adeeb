/**
 * Service Worker لنادي أدِيب
 * يوفر إمكانية العمل بدون إنترنت والتخزين المؤقت
 */

const CACHE_NAME = 'adeeb-v31';
const STATIC_CACHE = 'adeeb-static-v31';
const DYNAMIC_CACHE = 'adeeb-dynamic-v31';

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
    
    // استراتيجية Network First — جلب من الشبكة أولاً، والكاش كـ fallback فقط
    if (request.method === 'GET') {
        event.respondWith(
            fetch(request)
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
                    // عند فشل الشبكة — استخدم الكاش
                    return caches.match(request)
                        .then((cachedResponse) => {
                            if (cachedResponse) {
                                return cachedResponse;
                            }
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
