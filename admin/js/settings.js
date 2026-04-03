/**
 * مدير إعدادات لوحة التحكم — نادي أدِيب
 * يدير تفضيلات المستخدم (مظهر، إشعارات، صفحة افتراضية) عبر localStorage
 */
(function () {
    'use strict';

    const STORAGE_KEYS = {
        notifications: 'adeeb_notification_settings',
        fontSize: 'adeeb_font_size',
        compactMode: 'adeeb_compact_mode',
        sidebarDefault: 'adeeb_sidebar_default',
        defaultLanding: 'adeeb_default_landing'
    };

    // ─── ترحيل المفاتيح القديمة ───
    function migrateOldKeys() {
        const oldNotifPrefs = localStorage.getItem('adeeb_notif_prefs');
        const oldSound = localStorage.getItem('adeeb_sound_notifications');
        const oldDesktop = localStorage.getItem('adeeb_desktop_notifications');

        if (oldNotifPrefs || oldSound !== null || oldDesktop !== null) {
            let existing = {};
            try { existing = JSON.parse(oldNotifPrefs) || {}; } catch { /* ignore */ }

            const merged = {
                membership: existing.membership ?? true,
                messages: existing.messages ?? true,
                activities: existing.activities ?? false,
                sound: oldSound !== null ? oldSound !== 'false' : true,
                desktop: oldDesktop !== null ? oldDesktop === 'true' : false
            };

            localStorage.setItem(STORAGE_KEYS.notifications, JSON.stringify(merged));
            localStorage.removeItem('adeeb_notif_prefs');
            localStorage.removeItem('adeeb_sound_notifications');
            localStorage.removeItem('adeeb_desktop_notifications');
        }
    }

    // ─── المظهر ───
    function applyFontSize() {
        const size = localStorage.getItem(STORAGE_KEYS.fontSize) || 'medium';
        const sizeMap = { small: '14px', medium: '16px', large: '18px' };
        document.documentElement.style.fontSize = sizeMap[size] || '16px';
    }

    function applyCompactMode() {
        const compact = localStorage.getItem(STORAGE_KEYS.compactMode) === 'true';
        if (compact) {
            document.documentElement.style.setProperty('--spacing-md', '0.65rem');
            document.documentElement.style.setProperty('--spacing-lg', '1rem');
            document.documentElement.style.setProperty('--content-padding', '1.25rem');
        } else {
            document.documentElement.style.removeProperty('--spacing-md');
            document.documentElement.style.removeProperty('--spacing-lg');
            document.documentElement.style.removeProperty('--content-padding');
        }
    }

    // ─── الإشعارات ───
    function getNotificationSettings() {
        const defaults = { membership: true, messages: true, activities: false, sound: true, desktop: false };
        try {
            return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEYS.notifications)) };
        } catch { return defaults; }
    }

    function saveNotificationSettings(settings) {
        localStorage.setItem(STORAGE_KEYS.notifications, JSON.stringify(settings));
    }

    // ─── الصفحة الافتراضية ───
    function getDefaultLanding() {
        return localStorage.getItem(STORAGE_KEYS.defaultLanding) || 'membership-card-section';
    }

    function setDefaultLanding(sectionId) {
        localStorage.setItem(STORAGE_KEYS.defaultLanding, sectionId);
    }

    // ─── القائمة الجانبية ───
    function getSidebarDefault() {
        return localStorage.getItem(STORAGE_KEYS.sidebarDefault) || 'expanded';
    }

    // ─── التهيئة عند تحميل الصفحة ───
    function init() {
        migrateOldKeys();
        applyFontSize();
        applyCompactMode();
    }

    window.settingsManager = {
        init,
        applyFontSize,
        applyCompactMode,
        getNotificationSettings,
        saveNotificationSettings,
        getDefaultLanding,
        setDefaultLanding,
        getSidebarDefault,
        STORAGE_KEYS
    };

    // تطبيق فوري عند تحميل السكريبت
    init();
})();
