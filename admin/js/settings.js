/**
 * نظام إدارة الإعدادات
 */

(function () {
    'use strict';

    const SOUND_KEY = 'adeeb_sound_notifications';
    const DESKTOP_KEY = 'adeeb_desktop_notifications';

    /**
     * تهيئة الإعدادات
     */
    function init() {
        loadSettings();
        bindEvents();
    }

    /**
     * تحميل الإعدادات المحفوظة
     */
    function loadSettings() {
        const sound = localStorage.getItem(SOUND_KEY) !== 'false';
        const desktop = localStorage.getItem(DESKTOP_KEY) === 'true';

        const soundCheckbox = document.getElementById('soundNotifications');
        if (soundCheckbox) soundCheckbox.checked = sound;

        const desktopCheckbox = document.getElementById('desktopNotifications');
        if (desktopCheckbox) desktopCheckbox.checked = desktop;
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

    window.settingsManager = {
        init
    };

    document.addEventListener('DOMContentLoaded', init);
})();
