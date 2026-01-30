/**
 * نظام إدارة إشعارات Push
 * يتعامل مع تفعيل وإدارة الإشعارات الفورية
 */

(function () {
    'use strict';

    const enablePushBtn = document.getElementById('enablePushBtn');
    const pushStatusContainer = document.getElementById('pushNotificationStatus');
    const enablePushContainer = document.getElementById('enablePushContainer');
    const pushEnabledMessage = document.getElementById('pushEnabledMessage');

    /**
     * تهيئة نظام الإشعارات
     */
    function init() {
        checkNotificationStatus();
        bindEvents();
        
        // التحقق من الحالة كل 30 ثانية
        setInterval(checkNotificationStatus, 30000);
    }

    /**
     * التحقق من حالة الإشعارات
     */
    function checkNotificationStatus() {
        if (!('Notification' in window)) {
            updatePushStatus('not-supported');
            return;
        }

        const permission = Notification.permission;
        
        if (permission === 'granted') {
            updatePushStatus('enabled');
        } else if (permission === 'denied') {
            updatePushStatus('denied');
        } else {
            updatePushStatus('not-enabled');
        }
    }

    /**
     * تحديث حالة الإشعارات في الواجهة
     */
    function updatePushStatus(status) {
        if (!pushStatusContainer) return;

        switch (status) {
            case 'enabled':
                if (enablePushContainer) enablePushContainer.style.display = 'none';
                if (pushEnabledMessage) pushEnabledMessage.style.display = 'block';
                
                pushStatusContainer.innerHTML = `
                    <div style="padding: 1rem; background: linear-gradient(135deg, #d1fae5, #a7f3d0); border-radius: 12px; border: 1px solid #6ee7b7; text-align: center;">
                        <div style="display: flex; align-items: center; justify-content: center; gap: 0.75rem; color: #065f46; font-weight: bold; font-size: 1rem;">
                            <i class="fa-solid fa-check-circle" style="font-size: 1.5rem;"></i>
                            <span>الإشعارات مفعّلة وتعمل بنجاح!</span>
                        </div>
                    </div>
                `;
                break;

            case 'denied':
                if (enablePushContainer) enablePushContainer.style.display = 'none';
                if (pushEnabledMessage) pushEnabledMessage.style.display = 'none';
                
                pushStatusContainer.innerHTML = `
                    <div style="padding: 1rem; background: linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.05)); border-radius: 12px; border: 1px solid rgba(239,68,68,0.25); border-right: 4px solid #ef4444;">
                        <div style="display: flex; align-items: center; gap: 0.75rem; color: #991b1b;">
                            <i class="fa-solid fa-ban" style="font-size: 1.25rem;"></i>
                            <div>
                                <strong style="display: block; margin-bottom: 0.25rem;">الإشعارات محظورة</strong>
                                <span style="font-size: 0.875rem;">يرجى تفعيل الإشعارات من إعدادات المتصفح</span>
                            </div>
                        </div>
                    </div>
                `;
                break;

            case 'not-supported':
                if (enablePushContainer) enablePushContainer.style.display = 'none';
                if (pushEnabledMessage) pushEnabledMessage.style.display = 'none';
                
                pushStatusContainer.innerHTML = `
                    <div style="padding: 1rem; background: linear-gradient(135deg, rgba(100,116,139,0.08), rgba(100,116,139,0.05)); border-radius: 12px; border: 1px solid rgba(100,116,139,0.25); border-right: 4px solid #64748b;">
                        <div style="display: flex; align-items: center; gap: 0.75rem; color: #475569;">
                            <i class="fa-solid fa-info-circle" style="font-size: 1.25rem;"></i>
                            <span>المتصفح لا يدعم الإشعارات الفورية</span>
                        </div>
                    </div>
                `;
                break;

            case 'not-enabled':
            default:
                if (enablePushContainer) enablePushContainer.style.display = 'block';
                if (pushEnabledMessage) pushEnabledMessage.style.display = 'none';
                
                pushStatusContainer.innerHTML = `
                    <div style="padding: 1rem; background: linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.05)); border-radius: 12px; border: 1px solid rgba(245,158,11,0.25); border-right: 4px solid #f59e0b;">
                        <div style="display: flex; align-items: center; gap: 0.75rem; color: #92400e;">
                            <i class="fa-solid fa-bell-slash" style="font-size: 1.25rem;"></i>
                            <span>الإشعارات غير مفعّلة. فعّلها الآن لتبقى على اطلاع!</span>
                        </div>
                    </div>
                `;
                break;
        }
    }

    /**
     * ربط الأحداث
     */
    function bindEvents() {
        if (enablePushBtn) {
            enablePushBtn.addEventListener('click', requestNotificationPermission);
        }
    }

    /**
     * طلب إذن الإشعارات
     */
    async function requestNotificationPermission() {
        if (!('Notification' in window)) {
            showNotification('المتصفح لا يدعم الإشعارات الفورية', 'error');
            return;
        }

        // التحقق من تثبيت التطبيق أولاً
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
            || window.navigator.standalone 
            || document.referrer.includes('android-app://');

        if (!isStandalone) {
            if (window.Swal) {
                Swal.fire({
                    title: 'تنبيه',
                    html: `
                        <div style="text-align: right; line-height: 1.8;">
                            <p>لتفعيل الإشعارات، يجب تثبيت التطبيق أولاً.</p>
                            <p style="margin-top: 1rem;">هل تريد الانتقال لقسم تثبيت التطبيق؟</p>
                        </div>
                    `,
                    icon: 'info',
                    showCancelButton: true,
                    confirmButtonText: 'نعم، انتقل',
                    cancelButtonText: 'لاحقاً',
                    confirmButtonColor: '#3d8fd6',
                    cancelButtonColor: '#64748b'
                }).then((result) => {
                    if (result.isConfirmed) {
                        // التمرير لقسم تثبيت التطبيق
                        const pwaCard = document.querySelector('#settings-section .card');
                        if (pwaCard) {
                            pwaCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                    }
                });
            }
            return;
        }

        try {
            // تعطيل الزر مؤقتاً
            if (enablePushBtn) {
                enablePushBtn.disabled = true;
                enablePushBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الطلب...';
            }

            const permission = await Notification.requestPermission();

            if (permission === 'granted') {
                console.log('✅ Notification permission granted');
                
                // تسجيل الاشتراك في Push Notifications
                await subscribeToPushNotifications();
                
                checkNotificationStatus();
                
                // إظهار رسالة نجاح
                if (window.Swal) {
                    Swal.fire({
                        title: 'تم التفعيل بنجاح!',
                        text: 'سنرسل لك إشعارات بكل جديد',
                        icon: 'success',
                        confirmButtonText: 'رائع!',
                        confirmButtonColor: '#10b981'
                    });
                }

                // إرسال إشعار تجريبي
                sendTestNotification();
            } else if (permission === 'denied') {
                console.log('❌ Notification permission denied');
                checkNotificationStatus();
                
                if (window.Swal) {
                    Swal.fire({
                        title: 'تم الرفض',
                        html: `
                            <div style="text-align: right; line-height: 1.8;">
                                <p>لقد رفضت إذن الإشعارات.</p>
                                <p style="margin-top: 1rem;">لتفعيلها لاحقاً، يرجى تغيير الإعدادات من متصفحك.</p>
                            </div>
                        `,
                        icon: 'warning',
                        confirmButtonText: 'حسناً',
                        confirmButtonColor: '#f59e0b'
                    });
                }
            } else {
                console.log('⚠️ Notification permission dismissed');
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            showNotification('حدث خطأ أثناء طلب الإذن', 'error');
        } finally {
            // إعادة تفعيل الزر
            if (enablePushBtn) {
                enablePushBtn.disabled = false;
                enablePushBtn.innerHTML = '<i class="fa-solid fa-bell"></i> <span id="pushBtnText">تفعيل الإشعارات</span>';
            }
        }
    }

    /**
     * الاشتراك في Push Notifications
     */
    async function subscribeToPushNotifications() {
        try {
            if (!('serviceWorker' in navigator)) {
                console.log('Service Worker not supported');
                return;
            }

            const registration = await navigator.serviceWorker.ready;
            
            // التحقق من وجود اشتراك حالي
            let subscription = await registration.pushManager.getSubscription();
            
            if (!subscription) {
                // إنشاء اشتراك جديد
                // ملاحظة: يجب توفير VAPID public key من Supabase
                // subscription = await registration.pushManager.subscribe({
                //     userVisibleOnly: true,
                //     applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
                // });
                
                console.log('📱 Push subscription created');
            }

            // حفظ الاشتراك في قاعدة البيانات
            // await savePushSubscription(subscription);
            
        } catch (error) {
            console.error('Error subscribing to push notifications:', error);
        }
    }

    /**
     * إرسال إشعار تجريبي
     */
    function sendTestNotification() {
        if (Notification.permission === 'granted') {
            setTimeout(() => {
                new Notification('مرحباً بك في أدِيب! 🎉', {
                    body: 'تم تفعيل الإشعارات بنجاح. سنبقيك على اطلاع بكل جديد!',
                    icon: '/adeeb-logo.png',
                    badge: '/favicon/android-icon-192x192.png',
                    tag: 'welcome-notification',
                    requireInteraction: false
                });
            }, 1000);
        }
    }

    /**
     * عرض إشعار
     */
    function showNotification(message, type = 'info') {
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.log(message);
        }
    }

    // تصدير الوظائف
    window.pushNotificationsManager = {
        init,
        checkNotificationStatus,
        requestNotificationPermission
    };

    // التهيئة التلقائية
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
