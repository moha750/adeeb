/**
 * نظام إدارة PWA
 * يتعامل مع تثبيت التطبيق وتسجيل Service Worker
 */

(function () {
    'use strict';

    let deferredPrompt;
    const installBtn = document.getElementById('pwaInstallBtn');
    const installedMessage = document.getElementById('pwaInstalledMessage');

    /**
     * تسجيل Service Worker
     */
    async function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/service-worker.js', {
                    scope: '/'
                });
                
                console.log('✅ Service Worker registered successfully:', registration.scope);
                
                // التحقق من التحديثات
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('🔄 Service Worker update found');
                    
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('✨ New Service Worker available');
                            // يمكن إضافة إشعار للمستخدم هنا
                        }
                    });
                });
            } catch (error) {
                console.error('❌ Service Worker registration failed:', error);
            }
        }
    }

    /**
     * التحقق من التثبيت المسبق
     */
    function checkIfInstalled() {
        // التحقق من وضع standalone
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
            || window.navigator.standalone 
            || document.referrer.includes('android-app://');
        
        if (isStandalone) {
            console.log('✅ التطبيق مثبت بالفعل');
            if (installedMessage) {
                installedMessage.style.display = 'flex';
            }
            if (installBtn) {
                installBtn.style.display = 'none';
            }
            return true;
        }
        return false;
    }

    /**
     * معالجة حدث beforeinstallprompt
     */
    window.addEventListener('beforeinstallprompt', (e) => {
        console.log('📱 PWA install prompt available');
        
        // منع عرض النافذة التلقائية
        e.preventDefault();
        
        // حفظ الحدث للاستخدام لاحقاً
        deferredPrompt = e;
        
        // إظهار زر التثبيت
        if (installBtn && !checkIfInstalled()) {
            installBtn.style.display = 'flex';
        }
    });

    /**
     * معالجة النقر على زر التثبيت
     */
    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            if (!deferredPrompt) {
                console.log('⚠️ No install prompt available');
                
                // إظهار تعليمات التثبيت اليدوي
                Swal.fire({
                    title: 'تثبيت التطبيق',
                    html: `
                        <div style="text-align: right; line-height: 1.8;">
                            <p><strong>للتثبيت على iOS:</strong></p>
                            <ol style="text-align: right;">
                                <li>اضغط على زر المشاركة <i class="fa-solid fa-share"></i></li>
                                <li>اختر "إضافة إلى الشاشة الرئيسية"</li>
                            </ol>
                            <br>
                            <p><strong>للتثبيت على Android:</strong></p>
                            <ol style="text-align: right;">
                                <li>افتح قائمة المتصفح (⋮)</li>
                                <li>اختر "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية"</li>
                            </ol>
                        </div>
                    `,
                    icon: 'info',
                    confirmButtonText: 'حسناً',
                    confirmButtonColor: '#3b82f6'
                });
                return;
            }

            // إظهار نافذة التثبيت
            deferredPrompt.prompt();

            // انتظار اختيار المستخدم
            const { outcome } = await deferredPrompt.userChoice;
            
            console.log(`👤 User choice: ${outcome}`);
            
            if (outcome === 'accepted') {
                console.log('✅ PWA installed successfully');
                
                // إخفاء زر التثبيت وإظهار رسالة النجاح
                installBtn.style.display = 'none';
                if (installedMessage) {
                    installedMessage.style.display = 'flex';
                }
                
                // إظهار رسالة نجاح
                Swal.fire({
                    title: 'تم التثبيت بنجاح!',
                    text: 'يمكنك الآن استخدام التطبيق من الشاشة الرئيسية',
                    icon: 'success',
                    confirmButtonText: 'رائع!',
                    confirmButtonColor: '#10b981'
                });
            } else {
                console.log('❌ PWA installation declined');
            }

            // إعادة تعيين المتغير
            deferredPrompt = null;
        });
    }

    /**
     * معالجة حدث التثبيت الناجح
     */
    window.addEventListener('appinstalled', () => {
        console.log('🎉 PWA was installed successfully');
        
        if (installBtn) {
            installBtn.style.display = 'none';
        }
        if (installedMessage) {
            installedMessage.style.display = 'flex';
        }
        
        deferredPrompt = null;
        
        // تتبع التثبيت (يمكن إضافة Analytics هنا)
        console.log('📊 PWA install tracked');
    });

    /**
     * تهيئة PWA عند تحميل الصفحة
     */
    function init() {
        // تسجيل Service Worker
        registerServiceWorker();
        
        // التحقق من التثبيت المسبق
        checkIfInstalled();
        
        console.log('🚀 PWA Manager initialized');
    }

    // تهيئة عند تحميل DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // تصدير الوظائف
    window.pwaManager = {
        checkIfInstalled,
        registerServiceWorker
    };
})();
