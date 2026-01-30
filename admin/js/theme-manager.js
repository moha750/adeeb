/**
 * نظام إدارة المظهر (Dark Mode)
 */

(function () {
    'use strict';

    const THEME_KEY = 'adeeb_theme_preference';

    /**
     * تطبيق المظهر - تم تعطيل Dark Mode
     */
    function applyTheme(theme) {
        const root = document.documentElement;
        // فرض الوضع الفاتح دائماً
        root.setAttribute('data-theme', 'light');
    }

    /**
     * حفظ تفضيل المظهر
     */
    function saveThemePreference(theme) {
        localStorage.setItem(THEME_KEY, theme);
    }

    /**
     * تحميل تفضيل المظهر
     */
    function loadThemePreference() {
        return 'light'; // دائماً الوضع الفاتح
    }

    /**
     * تهيئة نظام المظهر
     */
    function init() {
        const savedTheme = loadThemePreference();
        applyTheme(savedTheme);

        // تحديث أزرار المظهر
        const themeButtons = document.querySelectorAll('.theme-option-btn');
        if (themeButtons.length > 0) {
            // تحديد الزر النشط
            themeButtons.forEach(btn => {
                const theme = btn.getAttribute('data-theme');
                if (theme === savedTheme) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }

                // إضافة مستمع للنقر
                btn.addEventListener('click', () => {
                    const newTheme = btn.getAttribute('data-theme');
                    
                    // إزالة active من جميع الأزرار
                    themeButtons.forEach(b => b.classList.remove('active'));
                    
                    // إضافة active للزر المحدد
                    btn.classList.add('active');
                    
                    // حفظ وتطبيق المظهر
                    saveThemePreference(newTheme);
                    applyTheme(newTheme);
                });
            });
        }

        // تحديث المظهر التلقائي كل ساعة
        if (savedTheme === 'auto') {
            setInterval(() => {
                applyTheme('auto');
            }, 3600000); // كل ساعة
        }

        // تهيئة PWA
        initPWA();
    }

    /**
     * تهيئة Progressive Web App
     */
    let deferredPrompt;

    function initPWA() {
        const installBtn = document.getElementById('pwaInstallBtn');
        const installedMessage = document.getElementById('pwaInstalledMessage');

        // التحقق من التثبيت المسبق
        if (window.matchMedia('(display-mode: standalone)').matches) {
            // التطبيق مثبت بالفعل
            if (installedMessage) {
                installedMessage.style.display = 'flex';
            }
            return;
        }

        // الاستماع لحدث beforeinstallprompt
        window.addEventListener('beforeinstallprompt', (e) => {
            // منع عرض النافذة التلقائية
            e.preventDefault();
            
            // حفظ الحدث للاستخدام لاحقاً
            deferredPrompt = e;
            
            // إظهار زر التثبيت
            if (installBtn) {
                installBtn.style.display = 'flex';
            }
        });

        // معالج النقر على زر التثبيت
        if (installBtn) {
            installBtn.addEventListener('click', async () => {
                if (!deferredPrompt) {
                    return;
                }

                // إظهار نافذة التثبيت
                deferredPrompt.prompt();

                // انتظار اختيار المستخدم
                const { outcome } = await deferredPrompt.userChoice;
                
                if (outcome === 'accepted') {
                    console.log('تم قبول تثبيت التطبيق');
                    
                    // إخفاء زر التثبيت وإظهار رسالة النجاح
                    installBtn.style.display = 'none';
                    if (installedMessage) {
                        installedMessage.style.display = 'flex';
                    }
                } else {
                    console.log('تم رفض تثبيت التطبيق');
                }

                // إعادة تعيين المتغير
                deferredPrompt = null;
            });
        }

        // الاستماع لحدث التثبيت الناجح
        window.addEventListener('appinstalled', () => {
            console.log('تم تثبيت التطبيق بنجاح');
            
            if (installBtn) {
                installBtn.style.display = 'none';
            }
            if (installedMessage) {
                installedMessage.style.display = 'flex';
            }
            
            deferredPrompt = null;
        });
    }

    // تطبيق المظهر فوراً قبل تحميل الصفحة
    const savedTheme = loadThemePreference();
    applyTheme(savedTheme);

    // تهيئة عند تحميل DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // تصدير الوظائف
    window.themeManager = {
        applyTheme,
        saveThemePreference,
        loadThemePreference
    };
})();
