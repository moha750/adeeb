/**
 * نظام إدارة الإصدارات - نادي أدِيب
 * يتحقق من وجود تحديثات ويجبر المتصفح على تحديث الملفات
 */

(function() {
    // رقم الإصدار الحالي - قم بتحديثه مع كل تحديث للموقع
    // ⚠️ مهم: يجب أن يتطابق مع أرقام الإصدار في service-worker.js
    const CURRENT_VERSION = '2.2.0';
    const VERSION_KEY = 'adeeb_admin_version';

    // التحقق من الإصدار المخزن
    function checkVersion() {
        try {
            const storedVersion = localStorage.getItem(VERSION_KEY);

            if (!storedVersion || storedVersion !== CURRENT_VERSION) {
                console.log(`🔄 تحديث الإصدار من ${storedVersion || 'غير معروف'} إلى ${CURRENT_VERSION}`);
                clearCacheAndReload();
            }
        } catch (error) {
            console.error('Error checking version:', error);
        }
    }

    // مسح الذاكرة المؤقتة وإعادة التحميل
    function clearCacheAndReload() {
        try {
            // تحديث رقم الإصدار
            localStorage.setItem(VERSION_KEY, CURRENT_VERSION);

            // مسح Service Worker Cache
            if ('caches' in window) {
                caches.keys().then(function(names) {
                    for (let name of names) {
                        caches.delete(name);
                    }
                });
            }

            // تحديث Service Worker
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                    for (let registration of registrations) {
                        registration.update();
                    }
                });
            }

            // إعادة تحميل الصفحة
            setTimeout(() => window.location.reload(), 300);
        } catch (error) {
            console.error('Error clearing cache:', error);
            window.location.reload();
        }
    }

    // تشغيل الفحص عند تحميل الصفحة
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkVersion);
    } else {
        checkVersion();
    }

    // إضافة دالة عامة لمسح الذاكرة المؤقتة يدوياً
    window.clearAdminCache = function() {
        localStorage.removeItem(VERSION_KEY);
        clearCacheAndReload();
    };

    // عرض رقم الإصدار في Console
    console.log(`%c🎯 نادي أدِيب - لوحة التحكم`, 'font-size: 16px; font-weight: bold; color: #3d8fd6;');
    console.log(`%cالإصدار: ${CURRENT_VERSION}`, 'font-size: 12px; color: #666;');
    console.log(`%cللمساعدة: اكتب clearAdminCache() لمسح الذاكرة المؤقتة`, 'font-size: 11px; color: #999;');
})();
