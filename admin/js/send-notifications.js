/**
 * نظام إرسال الإشعارات - لرئيس النادي فقط
 */

(function() {
    'use strict';

    let currentUser = null;
    let committees = [];

    /**
     * تهيئة نظام إرسال الإشعارات
     */
    async function init(user) {
        currentUser = user;
        
        // تحميل اللجان
        await loadCommittees();
        
        // إعداد الأحداث
        setupEventListeners();
        
        // تحميل سجل الإشعارات
        await loadNotificationsHistory();
        
        console.log('✅ Send notifications system initialized');
    }

    /**
     * تحميل اللجان
     */
    async function loadCommittees() {
        try {
            const { data, error } = await window.sbClient
                .from('committees')
                .select('id, committee_name_ar')
                .order('committee_name_ar');

            if (error) throw error;

            committees = data || [];
            
            // ملء قائمة اللجان
            const select = document.getElementById('targetCommittee');
            if (select) {
                select.innerHTML = '<option value="">اختر اللجنة</option>' +
                    committees.map(c => `<option value="${c.id}">${c.committee_name_ar}</option>`).join('');
            }
        } catch (error) {
            console.error('Error loading committees:', error);
        }
    }

    /**
     * تحميل سجل الإشعارات
     */
    async function loadNotificationsHistory() {
        try {
            const { data, error } = await window.sbClient
                .from('notifications')
                .select(`
                    id,
                    title,
                    message,
                    type,
                    priority,
                    target_audience,
                    created_at,
                    sender_id
                `)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;

            displayNotificationsHistory(data || []);
        } catch (error) {
            console.error('Error loading history:', error);
        }
    }

    /**
     * عرض سجل الإشعارات
     */
    function displayNotificationsHistory(notifications) {
        const container = document.getElementById('notificationsHistoryList');
        if (!container) return;

        if (notifications.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #64748b;">
                    <i class="fa-solid fa-inbox" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p>لم يتم إرسال أي إشعارات بعد</p>
                </div>
            `;
            return;
        }

        container.innerHTML = notifications.map(notif => {
            const audienceLabel = getAudienceLabel(notif.target_audience);
            const typeClass = notif.type;
            const priorityLabel = getPriorityLabel(notif.priority);
            const date = new Date(notif.created_at).toLocaleString('ar-SA');

            return `
                <div class="history-item">
                    <div class="history-header">
                        <div>
                            <h4>${notif.title}</h4>
                            <span class="badge badge-${typeClass}">${getTypeLabel(notif.type)}</span>
                            <span class="badge badge-priority-${notif.priority}">${priorityLabel}</span>
                        </div>
                        <button class="btn-icon" onclick="window.sendNotifications.deleteNotification(${notif.id})" title="حذف">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                    <p class="history-message">${notif.message}</p>
                    <div class="history-meta">
                        <span><i class="fa-solid fa-users"></i> ${audienceLabel}</span>
                        <span><i class="fa-solid fa-clock"></i> ${date}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * إرسال إشعار جديد
     */
    async function sendNotification() {
        const form = document.getElementById('sendNotificationForm');
        const formData = new FormData(form);

        const notification = {
            title: formData.get('title'),
            message: formData.get('message'),
            type: formData.get('type'),
            priority: formData.get('priority'),
            target_audience: formData.get('targetAudience'),
            action_url: formData.get('actionUrl') || null,
            action_label: formData.get('actionLabel') || null,
            sender_id: currentUser.id,
            is_push_enabled: formData.get('enablePush') === 'on',
            icon: getIconForType(formData.get('type'))
        };

        // إضافة معلومات إضافية حسب الجمهور المستهدف
        if (notification.target_audience === 'specific_committee') {
            notification.target_committee_id = parseInt(formData.get('targetCommittee'));
            if (!notification.target_committee_id) {
                Swal.fire({
                    icon: 'error',
                    title: 'خطأ',
                    text: 'يرجى اختيار اللجنة المستهدفة'
                });
                return;
            }
        }

        // تأكيد الإرسال
        const result = await Swal.fire({
            title: 'تأكيد الإرسال',
            html: `
                <div style="text-align: right; line-height: 1.8;">
                    <p><strong>العنوان:</strong> ${notification.title}</p>
                    <p><strong>الرسالة:</strong> ${notification.message}</p>
                    <p><strong>الجمهور:</strong> ${getAudienceLabel(notification.target_audience)}</p>
                    <p><strong>الأولوية:</strong> ${getPriorityLabel(notification.priority)}</p>
                    ${notification.is_push_enabled ? '<p style="color: #10b981;"><i class="fa-solid fa-bell"></i> سيتم إرسال إشعار Push</p>' : ''}
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'إرسال',
            cancelButtonText: 'إلغاء',
            confirmButtonColor: '#3b82f6'
        });

        if (!result.isConfirmed) return;

        try {
            // إرسال الإشعار
            const { data, error } = await window.sbClient
                .from('notifications')
                .insert(notification)
                .select()
                .single();

            if (error) throw error;

            // إذا كان Push مفعل، إرسال Push Notifications
            if (notification.is_push_enabled) {
                await sendPushNotifications(data);
            }

            Swal.fire({
                icon: 'success',
                title: 'تم الإرسال بنجاح!',
                text: 'تم إرسال الإشعار لجميع المستخدمين المستهدفين',
                timer: 3000,
                showConfirmButton: false
            });

            // إعادة تعيين النموذج
            form.reset();
            
            // تحديث السجل
            await loadNotificationsHistory();

        } catch (error) {
            console.error('Error sending notification:', error);
            Swal.fire({
                icon: 'error',
                title: 'خطأ',
                text: 'حدث خطأ أثناء إرسال الإشعار'
            });
        }
    }

    /**
     * إرسال Push Notifications للمستخدمين عبر Edge Function
     */
    async function sendPushNotifications(notification) {
        try {
            console.log(`📱 Sending push notifications for notification ID: ${notification.id}`);

            // استدعاء Edge Function لإرسال الإشعارات
            const { data, error } = await window.sbClient.functions.invoke(
                'send-push-notification',
                {
                    body: { notification_id: notification.id }
                }
            );

            if (error) {
                console.error('❌ Error from Edge Function:', error);
                throw error;
            }

            console.log('✅ Push notifications sent:', data);
            
            // عرض نتيجة الإرسال
            if (data.successful > 0) {
                console.log(`✅ Successfully sent to ${data.successful} devices`);
            }
            if (data.failed > 0) {
                console.warn(`⚠️ Failed to send to ${data.failed} devices`);
            }

            return data;

        } catch (error) {
            console.error('❌ Error sending push notifications:', error);
            // لا نفشل العملية كاملة إذا فشل Push
            // الإشعار موجود في قاعدة البيانات على أي حال
        }
    }

    /**
     * حذف إشعار
     */
    async function deleteNotification(id) {
        const result = await Swal.fire({
            title: 'تأكيد الحذف',
            text: 'هل أنت متأكد من حذف هذا الإشعار؟',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'حذف',
            cancelButtonText: 'إلغاء',
            confirmButtonColor: '#ef4444'
        });

        if (!result.isConfirmed) return;

        try {
            const { error } = await window.sbClient
                .from('notifications')
                .delete()
                .eq('id', id);

            if (error) throw error;

            Swal.fire({
                icon: 'success',
                title: 'تم الحذف',
                timer: 2000,
                showConfirmButton: false
            });

            await loadNotificationsHistory();
        } catch (error) {
            console.error('Error deleting notification:', error);
            Swal.fire({
                icon: 'error',
                title: 'خطأ',
                text: 'حدث خطأ أثناء حذف الإشعار'
            });
        }
    }

    /**
     * إعداد مستمعات الأحداث
     */
    function setupEventListeners() {
        // تغيير الجمهور المستهدف
        const audienceSelect = document.getElementById('targetAudience');
        const committeeGroup = document.getElementById('committeeSelectGroup');
        
        if (audienceSelect && committeeGroup) {
            audienceSelect.addEventListener('change', (e) => {
                committeeGroup.style.display = e.target.value === 'specific_committee' ? 'block' : 'none';
            });
        }

        // زر الإرسال
        const sendBtn = document.getElementById('sendNotificationBtn');
        if (sendBtn) {
            sendBtn.addEventListener('click', (e) => {
                e.preventDefault();
                sendNotification();
            });
        }

        // زر تحديث السجل
        const refreshBtn = document.getElementById('refreshHistoryBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', loadNotificationsHistory);
        }
    }

    /**
     * Helper functions
     */
    function getAudienceLabel(audience) {
        const labels = {
            all: 'جميع المستخدمين',
            members: 'الأعضاء فقط',
            committee_leaders: 'قادة اللجان',
            admins: 'المسؤولون',
            specific_committee: 'لجنة محددة',
            specific_users: 'مستخدمون محددون'
        };
        return labels[audience] || audience;
    }

    function getTypeLabel(type) {
        const labels = {
            info: 'معلومة',
            success: 'نجاح',
            warning: 'تحذير',
            error: 'خطأ',
            announcement: 'إعلان'
        };
        return labels[type] || type;
    }

    function getPriorityLabel(priority) {
        const labels = {
            low: 'منخفضة',
            normal: 'عادية',
            high: 'عالية',
            urgent: 'عاجلة'
        };
        return labels[priority] || priority;
    }

    function getIconForType(type) {
        const icons = {
            info: 'fa-circle-info',
            success: 'fa-circle-check',
            warning: 'fa-triangle-exclamation',
            error: 'fa-circle-exclamation',
            announcement: 'fa-bullhorn'
        };
        return icons[type] || icons.info;
    }

    // تصدير الوظائف
    window.sendNotifications = {
        init,
        sendNotification,
        deleteNotification,
        loadNotificationsHistory
    };
})();
