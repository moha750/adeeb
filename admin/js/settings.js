/**
 * نظام إدارة الإعدادات
 * الوضع الليلي/النهاري/التلقائي
 */

(function () {
    'use strict';

    const THEME_KEY = 'adeeb_theme_preference';
    const SOUND_KEY = 'adeeb_sound_notifications';
    const DESKTOP_KEY = 'adeeb_desktop_notifications';

    /**
     * تهيئة الإعدادات
     */
    function init() {
        loadSettings();
        bindEvents();
        applyTheme();
        updateThemeStatus();
        
        // تحديث الوضع كل دقيقة (للوضع التلقائي)
        setInterval(() => {
            const theme = getThemePreference();
            if (theme === 'auto') {
                applyTheme();
                updateThemeStatus();
            }
        }, 60000);
    }

    /**
     * تحميل الإعدادات المحفوظة
     */
    function loadSettings() {
        const theme = getThemePreference();
        const sound = localStorage.getItem(SOUND_KEY) !== 'false';
        const desktop = localStorage.getItem(DESKTOP_KEY) === 'true';

        // تطبيق الإعدادات على الواجهة
        const themeRadio = document.querySelector(`input[name="theme"][value="${theme}"]`);
        if (themeRadio) themeRadio.checked = true;

        const soundCheckbox = document.getElementById('soundNotifications');
        if (soundCheckbox) soundCheckbox.checked = sound;

        const desktopCheckbox = document.getElementById('desktopNotifications');
        if (desktopCheckbox) desktopCheckbox.checked = desktop;
    }

    /**
     * الحصول على تفضيل الوضع
     */
    function getThemePreference() {
        return localStorage.getItem(THEME_KEY) || 'auto';
    }

    /**
     * تطبيق الوضع
     */
    function applyTheme() {
        const preference = getThemePreference();
        let actualTheme;

        if (preference === 'auto') {
            actualTheme = getAutoTheme();
        } else {
            actualTheme = preference;
        }

        document.documentElement.setAttribute('data-theme', actualTheme);
        
        // تحديث meta theme-color
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) {
            metaTheme.content = actualTheme === 'dark' ? '#1e293b' : '#ffffff';
        }
    }

    /**
     * تحديد الوضع التلقائي حسب الوقت
     */
    function getAutoTheme() {
        const hour = new Date().getHours();
        // نهاري من 6 صباحاً إلى 6 مساءً
        return (hour >= 6 && hour < 18) ? 'light' : 'dark';
    }

    /**
     * تحديث حالة الوضع الحالي
     */
    function updateThemeStatus() {
        const statusEl = document.getElementById('currentThemeStatus');
        if (!statusEl) return;

        const preference = getThemePreference();
        const actualTheme = preference === 'auto' ? getAutoTheme() : preference;
        const hour = new Date().getHours();

        let statusText = '';
        if (preference === 'auto') {
            const nextChange = actualTheme === 'light' ? 18 : 6;
            statusText = `الوضع ${actualTheme === 'light' ? 'النهاري' : 'الليلي'} (تلقائي) - سيتغير الساعة ${nextChange}:00`;
        } else {
            statusText = `الوضع ${actualTheme === 'light' ? 'النهاري' : 'الليلي'} (ثابت)`;
        }

        statusEl.textContent = statusText;
    }

    /**
     * حفظ تفضيل الوضع
     */
    function saveThemePreference(theme) {
        localStorage.setItem(THEME_KEY, theme);
        applyTheme();
        updateThemeStatus();
        showNotification(`تم تطبيق الوضع ${theme === 'light' ? 'النهاري' : theme === 'dark' ? 'الليلي' : 'التلقائي'}`, 'success');
    }

    /**
     * حفظ إعدادات الإشعارات
     */
    function saveNotificationSettings() {
        const sound = document.getElementById('soundNotifications')?.checked;
        const desktop = document.getElementById('desktopNotifications')?.checked;

        localStorage.setItem(SOUND_KEY, sound);
        localStorage.setItem(DESKTOP_KEY, desktop);

        if (desktop) {
            requestDesktopPermission();
        }

        showNotification('تم حفظ إعدادات الإشعارات', 'success');
    }

    /**
     * طلب إذن إشعارات سطح المكتب
     */
    async function requestDesktopPermission() {
        if (!('Notification' in window)) {
            showNotification('المتصفح لا يدعم إشعارات سطح المكتب', 'warning');
            return;
        }

        if (Notification.permission === 'granted') {
            return;
        }

        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                showNotification('تم منح إذن إشعارات سطح المكتب', 'success');
            }
        }
    }

    /**
     * ربط الأحداث
     */
    function bindEvents() {
        // تغيير الوضع
        const themeRadios = document.querySelectorAll('input[name="theme"]');
        themeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                saveThemePreference(e.target.value);
                
                // تحديث تنسيق الخيارات
                document.querySelectorAll('.theme-option').forEach(opt => {
                    opt.style.borderColor = '#e2e8f0';
                    opt.style.background = 'transparent';
                });
                e.target.closest('.theme-option').style.borderColor = '#3b82f6';
                e.target.closest('.theme-option').style.background = '#eff6ff';
            });
        });

        // إعدادات الإشعارات
        const soundCheckbox = document.getElementById('soundNotifications');
        const desktopCheckbox = document.getElementById('desktopNotifications');

        if (soundCheckbox) {
            soundCheckbox.addEventListener('change', saveNotificationSettings);
        }

        if (desktopCheckbox) {
            desktopCheckbox.addEventListener('change', saveNotificationSettings);
        }
    }

    /**
     * عرض إشعار
     */
    function showNotification(message, type = 'info') {
        if (window.showNotification) {
            window.showNotification(message, type);
        }
    }

    // تصدير الوظائف
    window.settingsManager = {
        init,
        applyTheme,
        getThemePreference
    };

    // تطبيق الوضع عند تحميل الصفحة
    document.addEventListener('DOMContentLoaded', () => {
        applyTheme();
    });
})();
