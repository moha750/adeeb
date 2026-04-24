/**
 * نظام إدارة الإشعارات داخل التطبيق
 * يدعم Real-time updates عبر Supabase
 */

(function() {
    'use strict';

    const DROPDOWN_VISIBLE = 4;

    let currentUser = null;
    let notificationsChannel = null;
    let allNotifications = [];

    async function init(user) {
        currentUser = user;

        await loadNotifications();
        await updateNotificationsBadge();
        subscribeToNotifications();
        setupEventListeners();

        console.log('✅ Notifications system initialized');
    }

    async function loadNotifications() {
        try {
            const { data, error } = await window.sbClient
                .rpc('get_user_notifications', {
                    p_user_id: currentUser.id,
                    p_limit: 50
                });

            if (error) throw error;

            allNotifications = data || [];
            renderNotifications();
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    }

    function buildNotificationItemHtml(notif) {
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
                ${notif.is_read
                    ? '<span class="read-badge"><i class="fa-solid fa-check"></i> مقروء</span>'
                    : '<div class="unread-dot"></div>'}
            </div>
        `;
    }

    function attachItemListeners(container) {
        container.querySelectorAll('.notification-item.unread').forEach(item => {
            item.addEventListener('click', async (e) => {
                if (!e.target.closest('.notification-action')) {
                    await markAsRead(parseInt(item.dataset.id));
                }
            });
        });

        container.querySelectorAll('.notification-action').forEach(link => {
            link.addEventListener('click', async (e) => {
                const href = link.getAttribute('href') || '';
                const hashIdx = href.indexOf('#');
                const isSamePage = !/^https?:\/\//i.test(href)
                    && (href.startsWith('#')
                        || href.includes('/dashboard.html')
                        || href === ''
                        || href === '#');
                if (hashIdx === -1 || !isSamePage || typeof window.navigateToSection !== 'function') {
                    return;
                }
                const sectionId = href.slice(hashIdx + 1).trim();
                if (!sectionId) return;

                e.preventDefault();

                const item = link.closest('.notification-item');
                const idAttr = item?.dataset?.id;
                if (idAttr && item.classList.contains('unread')) {
                    await markAsRead(parseInt(idAttr));
                }

                document.getElementById('notificationsDropdown')?.classList.remove('active');
                document.getElementById('notificationsBackdrop')?.classList.remove('active');

                window.navigateToSection(sectionId);
            });
        });
    }

    function renderNotifications() {
        const container = document.getElementById('notificationsList');
        if (container) {
            const total = allNotifications.length;

            if (total === 0) {
                container.innerHTML = `
                    <div class="empty-notifications">
                        <i class="fa-solid fa-bell-slash"></i>
                        <p>لا توجد إشعارات</p>
                    </div>
                `;
            } else {
                const visible = allNotifications.slice(0, DROPDOWN_VISIBLE);
                const itemsHtml = visible.map(buildNotificationItemHtml).join('');
                const viewAllHtml = total > DROPDOWN_VISIBLE ? `
                    <button type="button" class="notifications-show-more" id="notificationsViewAllBtn">
                        <i class="fa-solid fa-layer-group"></i>
                        <span>عرض كل الإشعارات</span>
                        <span class="notifications-show-more__count">${total}</span>
                    </button>
                ` : '';

                container.innerHTML = itemsHtml + viewAllHtml;
                attachItemListeners(container);

                const viewAllBtn = document.getElementById('notificationsViewAllBtn');
                if (viewAllBtn) {
                    viewAllBtn.addEventListener('click', () => {
                        document.getElementById('notificationsDropdown')?.classList.remove('active');
                        document.getElementById('notificationsBackdrop')?.classList.remove('active');
                        if (typeof window.navigateToSection === 'function') {
                            window.navigateToSection('my-notifications-section');
                        }
                    });
                }
            }
        }

        renderFullList();
    }

    function renderFullList() {
        const fullContainer = document.getElementById('myNotificationsList');
        if (!fullContainer) return;

        const total = allNotifications.length;
        const unreadCount = allNotifications.filter(n => !n.is_read).length;

        const totalEl = document.getElementById('myNotificationsTotal');
        const unreadEl = document.getElementById('myNotificationsUnread');
        if (totalEl) totalEl.textContent = total;
        if (unreadEl) unreadEl.textContent = unreadCount;

        if (total === 0) {
            fullContainer.innerHTML = `
                <div class="empty-notifications">
                    <i class="fa-solid fa-bell-slash"></i>
                    <p>لا توجد إشعارات</p>
                </div>
            `;
            return;
        }

        fullContainer.innerHTML = allNotifications.map(buildNotificationItemHtml).join('');
        attachItemListeners(fullContainer);
    }

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

    async function markAsRead(notificationId) {
        try {
            const { error } = await window.sbClient
                .from('notification_reads')
                .insert({
                    notification_id: notificationId,
                    user_id: currentUser.id
                });

            if (error && error.code !== '23505') throw error;

            const target = allNotifications.find(n => n.id === notificationId);
            if (target) target.is_read = true;

            document.querySelectorAll(`.notification-item[data-id="${notificationId}"]`).forEach(item => {
                item.classList.remove('unread');
                item.classList.add('read');
                const dot = item.querySelector('.unread-dot');
                if (dot) {
                    const badge = document.createElement('span');
                    badge.className = 'read-badge';
                    badge.innerHTML = '<i class="fa-solid fa-check"></i> مقروء';
                    dot.replaceWith(badge);
                }
            });

            const unreadEl = document.getElementById('myNotificationsUnread');
            if (unreadEl) {
                unreadEl.textContent = allNotifications.filter(n => !n.is_read).length;
            }

            await updateNotificationsBadge();
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    }

    async function markAllAsRead() {
        try {
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
                    const notif = payload.new;
                    const isForUser = await checkIfNotificationIsForUser(notif);

                    if (isForUser) {
                        await loadNotifications();
                        await updateNotificationsBadge();
                    }
                }
            )
            .subscribe();
    }

    async function checkIfNotificationIsForUser(notification) {
        if (notification.target_audience === 'all') return true;

        if (notification.target_audience === 'specific_users') {
            return notification.target_user_ids && notification.target_user_ids.includes(currentUser.id);
        }

        return true;
    }

    function setupEventListeners() {
        const markAllBtn = document.getElementById('markAllReadBtn');
        if (markAllBtn) {
            markAllBtn.addEventListener('click', markAllAsRead);
        }

        const refreshBtn = document.getElementById('refreshNotificationsBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                await loadNotifications();
                await updateNotificationsBadge();
            });
        }

        const fullMarkAllBtn = document.getElementById('myNotificationsMarkAllBtn');
        if (fullMarkAllBtn) {
            fullMarkAllBtn.addEventListener('click', markAllAsRead);
        }

        const fullRefreshBtn = document.getElementById('myNotificationsRefreshBtn');
        if (fullRefreshBtn) {
            fullRefreshBtn.addEventListener('click', async () => {
                await loadNotifications();
                await updateNotificationsBadge();
            });
        }
    }

    async function openFullSection() {
        await loadNotifications();
    }

    function getNotificationIcon(type) {
        const icons = {
            info: 'fa-solid fa-circle-info',
            success: 'fa-solid fa-circle-check',
            warning: 'fa-solid fa-triangle-exclamation',
            error: 'fa-solid fa-circle-exclamation',
            announcement: 'fa-solid fa-bullhorn',
            purple: 'fa-solid fa-door-closed'
        };
        return icons[type] || icons.info;
    }

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

    window.notificationsManager = {
        init,
        loadNotifications,
        updateNotificationsBadge,
        markAsRead,
        markAllAsRead,
        openFullSection
    };
})();
