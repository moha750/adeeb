/**
 * نظام إدارة الإصدارات - نادي أدِيب
 * يتحقق من وجود تحديثات ويجبر المتصفح على تحديث الملفات
 */

(function() {
    // رقم الإصدار الحالي - قم بتحديثه مع كل تحديث للموقع
    // ⚠️ مهم: يجب أن يتطابق مع CACHE_VERSION في service-worker.js
    const CURRENT_VERSION = '2.1.0';
    const VERSION_KEY = 'adeeb_admin_version';
    const LAST_CHECK_KEY = 'adeeb_last_version_check';
    
    // التحقق من الإصدار المخزن
    function checkVersion() {
        try {
            const storedVersion = localStorage.getItem(VERSION_KEY);
            const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
            const now = Date.now();
            
            // إذا كان الإصدار مختلفاً أو مر أكثر من ساعة على آخر فحص
            const oneHour = 60 * 60 * 1000;
            const shouldCheck = !lastCheck || (now - parseInt(lastCheck)) > oneHour;
            
            if (!storedVersion || storedVersion !== CURRENT_VERSION) {
                console.log(`🔄 تحديث الإصدار من ${storedVersion || 'غير معروف'} إلى ${CURRENT_VERSION}`);
                clearCacheAndReload();
            } else if (shouldCheck) {
                // تحديث وقت آخر فحص
                localStorage.setItem(LAST_CHECK_KEY, now.toString());
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
            localStorage.setItem(LAST_CHECK_KEY, Date.now().toString());
            
            // مسح Service Worker Cache إن وجد
            if ('caches' in window) {
                caches.keys().then(function(names) {
                    for (let name of names) {
                        caches.delete(name);
                    }
                });
            }
            
            // إلغاء تسجيل Service Workers القديمة
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                    for(let registration of registrations) {
                        registration.unregister();
                    }
                });
            }
            
            // إعادة تحميل الصفحة مع تجاوز الذاكرة المؤقتة
            window.location.reload(true);
        } catch (error) {
            console.error('Error clearing cache:', error);
            // محاولة إعادة التحميل العادية على الأقل
            window.location.reload();
        }
    }
    
    // إضافة timestamp لجميع الملفات الثابتة
    function addVersionToResources() {
        const version = `v=${CURRENT_VERSION}`;
        
        // إضافة version لجميع ملفات CSS
        document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
            const href = link.getAttribute('href');
            if (href && !href.includes('cdnjs.cloudflare.com') && !href.includes('?v=')) {
                const separator = href.includes('?') ? '&' : '?';
                link.setAttribute('href', `${href}${separator}${version}`);
            }
        });
        
        // إضافة version لجميع ملفات JavaScript
        document.querySelectorAll('script[src]').forEach(script => {
            const src = script.getAttribute('src');
            if (src && !src.includes('cdnjs.cloudflare.com') && !src.includes('supabase') && !src.includes('?v=')) {
                const separator = src.includes('?') ? '&' : '?';
                script.setAttribute('src', `${src}${separator}${version}`);
            }
        });
    }
    
    // عرض إشعار للمستخدم عند توفر تحديث
    function showUpdateNotification() {
        const notification = document.createElement('div');
        notification.id = 'updateNotification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #3d8fd6, #274060);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            z-index: 99999;
            display: flex;
            align-items: center;
            gap: 1rem;
            animation: slideInRight 0.5s ease;
            max-width: 400px;
        `;
        
        notification.innerHTML = `
            <i class="fa-solid fa-sync-alt" style="font-size: 1.5rem;"></i>
            <div style="flex: 1;">
                <strong style="display: block; margin-bottom: 0.25rem;">تحديث متوفر!</strong>
                <small>يوجد إصدار جديد من لوحة التحكم</small>
            </div>
            <button onclick="location.reload(true)" style="
                background: white;
                color: #274060;
                border: none;
                padding: 0.5rem 1rem;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
                transition: transform 0.2s;
            " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                تحديث الآن
            </button>
        `;
        
        // إضافة الأنيميشن
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(notification);
        
        // إخفاء الإشعار بعد 10 ثواني
        setTimeout(() => {
            notification.style.animation = 'slideInRight 0.5s ease reverse';
            setTimeout(() => notification.remove(), 500);
        }, 10000);
    }
    
    // التحقق من التحديثات عبر الشبكة (اختياري)
    async function checkForUpdates() {
        try {
            // يمكنك إضافة endpoint للتحقق من الإصدار الأحدث
            // const response = await fetch('/api/version');
            // const data = await response.json();
            // if (data.version !== CURRENT_VERSION) {
            //     showUpdateNotification();
            // }
        } catch (error) {
            console.error('Error checking for updates:', error);
        }
    }
    
    // تشغيل الفحص عند تحميل الصفحة
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkVersion);
    } else {
        checkVersion();
    }
    
    // التحقق من التحديثات كل 5 دقائق
    setInterval(checkForUpdates, 5 * 60 * 1000);
    
    // إضافة دالة عامة لمسح الذاكرة المؤقتة يدوياً
    window.clearAdminCache = function() {
        if (confirm('هل تريد مسح الذاكرة المؤقتة وإعادة تحميل الصفحة؟')) {
            clearCacheAndReload();
        }
    };
    
    // عرض رقم الإصدار في Console
    console.log(`%c🎯 نادي أدِيب - لوحة التحكم`, 'font-size: 16px; font-weight: bold; color: #3d8fd6;');
    console.log(`%cالإصدار: ${CURRENT_VERSION}`, 'font-size: 12px; color: #666;');
    console.log(`%cللمساعدة: اكتب clearAdminCache() لمسح الذاكرة المؤقتة`, 'font-size: 11px; color: #999;');
})();
