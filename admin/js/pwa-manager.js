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
        // التحقق من وضع standalone (يعمل على جميع المنصات)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
            || window.matchMedia('(display-mode: window-controls-overlay)').matches // Windows PWA
            || window.matchMedia('(display-mode: minimal-ui)').matches
            || window.matchMedia('(display-mode: fullscreen)').matches
            || window.navigator.standalone // iOS
            || document.referrer.includes('android-app://'); // Android
        
        // التحقق من User Agent للتطبيقات المثبتة
        const userAgent = navigator.userAgent.toLowerCase();
        const isInstalledApp = userAgent.includes('wv') || // WebView
                               userAgent.includes('standalone') ||
                               (window.navigator.standalone !== undefined); // iOS
        
        // التحقق الإضافي للتطبيقات المثبتة من localStorage
        const isPWAInstalled = localStorage.getItem('pwa_installed') === 'true';
        
        // التحقق من تأكيد المستخدم اليدوي
        const userConfirmedInstall = localStorage.getItem('pwa_user_confirmed') === 'true';
        
        console.log('🔍 PWA Installation Check:', {
            isStandalone,
            isInstalledApp,
            isPWAInstalled,
            userConfirmedInstall,
            displayMode: window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 
                        window.matchMedia('(display-mode: window-controls-overlay)').matches ? 'window-controls-overlay' :
                        window.matchMedia('(display-mode: minimal-ui)').matches ? 'minimal-ui' : 'browser'
        });
        
        if (isStandalone || isInstalledApp || isPWAInstalled || userConfirmedInstall) {
            console.log('✅ التطبيق مثبت بالفعل');
            
            // حفظ حالة التثبيت
            localStorage.setItem('pwa_installed', 'true');
            
            updatePWAStatus(true);
            
            return true;
        } else {
            updatePWAStatus(false);
        }
        return false;
    }
    
    /**
     * تأكيد التثبيت يدوياً من قبل المستخدم
     */
    function confirmInstallManually() {
        localStorage.setItem('pwa_installed', 'true');
        localStorage.setItem('pwa_user_confirmed', 'true');
        
        updatePWAStatus(true);
        
        if (window.Swal) {
            Swal.fire({
                title: 'تم التأكيد!',
                text: 'تم تأكيد تثبيت التطبيق بنجاح',
                icon: 'success',
                confirmButtonText: 'رائع!',
                confirmButtonColor: '#10b981'
            });
        }
    }

    /**
     * تحديث حالة PWA في الواجهة
     */
    function updatePWAStatus(isInstalled) {
        const statusContainer = document.getElementById('pwaStatusContainer');
        const installBtnContainer = document.getElementById('pwaInstallBtnContainer');
        const installedMessage = document.getElementById('pwaInstalledMessage');
        
        if (!statusContainer) return;

        if (isInstalled) {
            // إخفاء زر التثبيت
            if (installBtnContainer) installBtnContainer.style.display = 'none';
            
            // إظهار رسالة التثبيت الناجح
            if (installedMessage) installedMessage.style.display = 'block';
            
            // تحديث حالة التثبيت
            statusContainer.innerHTML = `
                <div style="padding: 1rem; background: linear-gradient(135deg, #d1fae5, #a7f3d0); border-radius: 12px; border: 1px solid #6ee7b7; text-align: center;">
                    <div style="display: flex; align-items: center; justify-content: center; gap: 0.75rem; color: #065f46; font-weight: bold; font-size: 1rem;">
                        <i class="fa-solid fa-check-circle" style="font-size: 1.5rem;"></i>
                        <span>التطبيق مثبت ويعمل بنجاح!</span>
                    </div>
                </div>
            `;
        } else {
            // إظهار زر التثبيت
            if (installBtnContainer) installBtnContainer.style.display = 'block';
            
            // إخفاء رسالة التثبيت
            if (installedMessage) installedMessage.style.display = 'none';
            
            // تحديث حالة عدم التثبيت
            statusContainer.innerHTML = `
                <div style="padding: 1rem; background: linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.05)); border-radius: 12px; border: 1px solid rgba(245,158,11,0.25); border-right: 4px solid #f59e0b;">
                    <div style="display: flex; align-items: center; gap: 0.75rem; color: #92400e;">
                        <i class="fa-solid fa-exclamation-triangle" style="font-size: 1.25rem;"></i>
                        <span>التطبيق غير مثبت. ثبّته الآن للحصول على تجربة أفضل!</span>
                    </div>
                </div>
            `;
        }
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
        
        // حفظ حالة التثبيت
        localStorage.setItem('pwa_installed', 'true');
        
        updatePWAStatus(true);
        
        deferredPrompt = null;
        
        // إظهار رسالة نجاح
        if (window.Swal) {
            Swal.fire({
                title: 'تم التثبيت بنجاح!',
                text: 'يمكنك الآن استخدام التطبيق من الشاشة الرئيسية',
                icon: 'success',
                confirmButtonText: 'رائع!',
                confirmButtonColor: '#10b981'
            });
        }
        
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
        
        // ربط زر التأكيد اليدوي
        const confirmBtn = document.getElementById('pwaConfirmInstallBtn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', confirmInstallManually);
        }
        
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
        registerServiceWorker,
        confirmInstallManually
    };
})();
