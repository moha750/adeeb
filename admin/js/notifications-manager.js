/**
 * نظام إدارة الإشعارات الكامل
 * يدعم Push Notifications و Real-time updates
 */

(function() {
    'use strict';

    let currentUser = null;
    let notificationsChannel = null;
    let pushSubscription = null;

    /**
     * تهيئة نظام الإشعارات
     */
    async function init(user) {
        currentUser = user;
        
        // تحميل الإشعارات
        await loadNotifications();
        
        // تحديث عداد الإشعارات
        await updateNotificationsBadge();
        
        // الاشتراك في Real-time updates
        subscribeToNotifications();
        
        // إعداد الأحداث
        setupEventListeners();
        
        // طلب إذن Push Notifications إذا كان التطبيق مثبت
        if (window.pwaManager && window.pwaManager.checkIfInstalled()) {
            await requestPushPermission();
        }
        
        console.log('✅ Notifications system initialized');
    }

    /**
     * تحميل الإشعارات من قاعدة البيانات
     */
    async function loadNotifications() {
        try {
            const { data, error } = await window.sbClient
                .rpc('get_user_notifications', {
                    p_user_id: currentUser.id,
                    p_limit: 50
                });

            if (error) throw error;

            displayNotifications(data || []);
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    }

    /**
     * عرض الإشعارات في القائمة
     */
    function displayNotifications(notifications) {
        const container = document.getElementById('notificationsList');
        if (!container) return;

        if (notifications.length === 0) {
            container.innerHTML = `
                <div class="empty-notifications">
                    <i class="fa-solid fa-bell-slash"></i>
                    <p>لا توجد إشعارات</p>
                </div>
            `;
            return;
        }

        container.innerHTML = notifications.map(notif => {
            const iconClass = getNotificationIcon(notif.type);
            const timeAgo = formatTimeAgo(notif.created_at);
            
            return `
                <div class="notification-item ${notif.is_read ? 'read' : 'unread'}" data-id="${notif.id}">
                    <div class="notification-icon ${notif.type}">
                        <i class="${iconClass}"></i>
                    </div>
                    <div class="notification-content">
                        <h4>${notif.title}</h4>
                        <p>${notif.message}</p>
                        <span class="notification-time">${timeAgo}</span>
                    </div>
                    ${notif.action_url ? `
                        <a href="${notif.action_url}" class="notification-action">
                            ${notif.action_label || 'عرض'}
                            <i class="fa-solid fa-arrow-left"></i>
                        </a>
                    ` : ''}
                    ${!notif.is_read ? '<div class="unread-dot"></div>' : ''}
                </div>
            `;
        }).join('');

        // إضافة حدث النقر لتعليم كمقروء
        container.querySelectorAll('.notification-item.unread').forEach(item => {
            item.addEventListener('click', async (e) => {
                if (!e.target.closest('.notification-action')) {
                    await markAsRead(parseInt(item.dataset.id));
                }
            });
        });
    }

    /**
     * تحديث عداد الإشعارات
     */
    async function updateNotificationsBadge() {
        try {
            const { data, error } = await window.sbClient
                .rpc('get_unread_notifications_count', {
                    p_user_id: currentUser.id
                });

            if (error) throw error;

            const badge = document.getElementById('notificationsBadge');
            if (badge) {
                const count = data || 0;
                badge.textContent = count;
                badge.style.display = count > 0 ? 'flex' : 'none';
            }
        } catch (error) {
            console.error('Error updating badge:', error);
        }
    }

    /**
     * تعليم إشعار كمقروء
     */
    async function markAsRead(notificationId) {
        try {
            const { error } = await window.sbClient
                .from('notification_reads')
                .insert({
                    notification_id: notificationId,
                    user_id: currentUser.id
                });

            if (error && error.code !== '23505') throw error; // تجاهل خطأ التكرار

            // تحديث الواجهة
            const item = document.querySelector(`.notification-item[data-id="${notificationId}"]`);
            if (item) {
                item.classList.remove('unread');
                item.classList.add('read');
                const dot = item.querySelector('.unread-dot');
                if (dot) dot.remove();
            }

            await updateNotificationsBadge();
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    }

    /**
     * تعليم جميع الإشعارات كمقروءة
     */
    async function markAllAsRead() {
        try {
            // جلب جميع الإشعارات غير المقروءة
            const { data: unreadNotifs, error: fetchError } = await window.sbClient
                .rpc('get_user_notifications', {
                    p_user_id: currentUser.id,
                    p_limit: 100
                });

            if (fetchError) throw fetchError;

            const unreadIds = unreadNotifs
                .filter(n => !n.is_read)
                .map(n => ({ notification_id: n.id, user_id: currentUser.id }));

            if (unreadIds.length === 0) return;

            const { error } = await window.sbClient
                .from('notification_reads')
                .insert(unreadIds);

            if (error && error.code !== '23505') throw error;

            // تحديث الواجهة
            await loadNotifications();
            await updateNotificationsBadge();

            Swal.fire({
                icon: 'success',
                title: 'تم بنجاح',
                text: 'تم تعليم جميع الإشعارات كمقروءة',
                timer: 2000,
                showConfirmButton: false
            });
        } catch (error) {
            console.error('Error marking all as read:', error);
            Swal.fire({
                icon: 'error',
                title: 'خطأ',
                text: 'حدث خطأ أثناء تعليم الإشعارات'
            });
        }
    }

    /**
     * الاشتراك في Real-time updates
     */
    function subscribeToNotifications() {
        notificationsChannel = window.sbClient
            .channel('notifications-channel')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications'
                },
                async (payload) => {
                    console.log('New notification received:', payload);
                    
                    // التحقق من أن الإشعار موجه للمستخدم
                    const notif = payload.new;
                    const isForUser = await checkIfNotificationIsForUser(notif);
                    
                    if (isForUser) {
                        // تحديث القائمة
                        await loadNotifications();
                        await updateNotificationsBadge();
                        
                        // عرض إشعار Push إذا كان مفعل
                        if (notif.is_push_enabled && 'Notification' in window && Notification.permission === 'granted') {
                            showPushNotification(notif);
                        }
                    }
                }
            )
            .subscribe();
    }

    /**
     * التحقق من أن الإشعار موجه للمستخدم
     */
    async function checkIfNotificationIsForUser(notification) {
        if (notification.target_audience === 'all') return true;
        
        if (notification.target_audience === 'specific_users') {
            return notification.target_user_ids && notification.target_user_ids.includes(currentUser.id);
        }
        
        // يمكن إضافة فحوصات إضافية هنا
        return true;
    }

    /**
     * تحديث حالة زر تفعيل Push
     */
    function updatePushButtonState() {
        const enablePushBtn = document.getElementById('enablePushBtn');
        if (!enablePushBtn) return;

        if (Notification.permission === 'granted' && pushSubscription) {
            enablePushBtn.innerHTML = '<i class="fa-solid fa-bell"></i>';
            enablePushBtn.title = 'إشعارات الجوال مفعلة';
            enablePushBtn.style.color = '#10b981';
        } else if (Notification.permission === 'denied') {
            enablePushBtn.innerHTML = '<i class="fa-solid fa-bell-slash"></i>';
            enablePushBtn.title = 'تم رفض إذن الإشعارات';
            enablePushBtn.style.color = '#ef4444';
        } else {
            enablePushBtn.innerHTML = '<i class="fa-solid fa-bell-slash"></i>';
            enablePushBtn.title = 'اضغط لتفعيل إشعارات الجوال';
            enablePushBtn.style.color = '#94a3b8';
        }
    }

    /**
     * طلب إذن Push Notifications
     */
    async function requestPushPermission() {
        if (!('Notification' in window)) {
            alert('متصفحك لا يدعم الإشعارات');
            return;
        }

        if (Notification.permission === 'granted') {
            await subscribeToPush();
            return;
        }

        if (Notification.permission === 'denied') {
            alert('تم رفض إذن الإشعارات مسبقاً. يرجى تفعيلها من إعدادات المتصفح.');
            return;
        }

        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            await subscribeToPush();
            alert('✅ تم تفعيل إشعارات الجوال بنجاح!');
        } else {
            alert('❌ تم رفض إذن الإشعارات');
        }
    }

    /**
     * الاشتراك في Push Notifications
     */
    async function subscribeToPush() {
        try {
            const registration = await navigator.serviceWorker.ready;
            
            // مفتاح VAPID عام
            const vapidPublicKey = 'BLZeg372Xih_c0f_RIcXfQbkJ2y_ALIFiZ_583AtDC8CxG1lOPFBcv9XsVFdUT5EKRu0gCZJeddZRJd6GrTDLPc';
            
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
            });

            // حفظ الاشتراك في قاعدة البيانات
            const subscriptionData = subscription.toJSON();
            
            const { error } = await window.sbClient
                .from('push_subscriptions')
                .upsert({
                    user_id: currentUser.id,
                    endpoint: subscriptionData.endpoint,
                    p256dh: subscriptionData.keys.p256dh,
                    auth: subscriptionData.keys.auth,
                    device_type: getDeviceType(),
                    browser: getBrowserName()
                }, {
                    onConflict: 'user_id,endpoint'
                });

            if (error) throw error;

            pushSubscription = subscription;
            console.log('✅ Push subscription saved');
            updatePushButtonState();
        } catch (error) {
            console.error('Error subscribing to push:', error);
            alert('حدث خطأ أثناء تفعيل الإشعارات: ' + error.message);
        }
    }

    /**
     * عرض Push Notification
     */
    function showPushNotification(notification) {
        if ('Notification' in window && Notification.permission === 'granted') {
            const iconClass = getNotificationIcon(notification.type);
            
            new Notification(notification.title, {
                body: notification.message,
                icon: '/favicon/android-icon-192x192.png',
                badge: '/favicon/android-icon-192x192.png',
                tag: `notification-${notification.id}`,
                requireInteraction: notification.priority === 'urgent',
                data: {
                    url: notification.action_url
                }
            }).onclick = function(event) {
                event.preventDefault();
                if (notification.action_url) {
                    window.open(notification.action_url, '_blank');
                }
                this.close();
            };
        }
    }

    /**
     * إعداد مستمعات الأحداث
     */
    function setupEventListeners() {
        // زر تفعيل Push Notifications
        const enablePushBtn = document.getElementById('enablePushBtn');
        if (enablePushBtn) {
            enablePushBtn.addEventListener('click', async () => {
                await requestPushPermission();
                updatePushButtonState();
            });
            updatePushButtonState();
        }

        // زر تعليم الكل كمقروء
        const markAllBtn = document.getElementById('markAllReadBtn');
        if (markAllBtn) {
            markAllBtn.addEventListener('click', markAllAsRead);
        }

        // زر تحديث الإشعارات
        const refreshBtn = document.getElementById('refreshNotificationsBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                await loadNotifications();
                await updateNotificationsBadge();
            });
        }
    }

    /**
     * الحصول على أيقونة الإشعار
     */
    function getNotificationIcon(type) {
        const icons = {
            info: 'fa-solid fa-circle-info',
            success: 'fa-solid fa-circle-check',
            warning: 'fa-solid fa-triangle-exclamation',
            error: 'fa-solid fa-circle-exclamation',
            announcement: 'fa-solid fa-bullhorn'
        };
        return icons[type] || icons.info;
    }

    /**
     * تنسيق الوقت
     */
    function formatTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return 'الآن';
        if (seconds < 3600) return `منذ ${Math.floor(seconds / 60)} دقيقة`;
        if (seconds < 86400) return `منذ ${Math.floor(seconds / 3600)} ساعة`;
        if (seconds < 604800) return `منذ ${Math.floor(seconds / 86400)} يوم`;
        
        return date.toLocaleDateString('ar-SA');
    }

    /**
     * Helper functions
     */
    function urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    function getDeviceType() {
        const ua = navigator.userAgent;
        if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
            return 'tablet';
        }
        if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
            return 'mobile';
        }
        return 'desktop';
    }

    function getBrowserName() {
        const ua = navigator.userAgent;
        if (ua.includes('Firefox')) return 'Firefox';
        if (ua.includes('Chrome')) return 'Chrome';
        if (ua.includes('Safari')) return 'Safari';
        if (ua.includes('Edge')) return 'Edge';
        return 'Unknown';
    }

    // تصدير الوظائف
    window.notificationsManager = {
        init,
        loadNotifications,
        updateNotificationsBadge,
        markAsRead,
        markAllAsRead,
        requestPushPermission
    };
})();
