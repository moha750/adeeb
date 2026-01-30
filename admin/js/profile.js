/**
 * نظام إدارة الملف الشخصي
 * عرض وتعديل المعلومات الشخصية، الأمان، النشاط
 */

(function () {
    'use strict';

    let currentUser = null;

    /**
     * تهيئة مدير الملف الشخصي
     */
    async function init(user) {
        currentUser = user;
        await loadProfileData();
        await loadRecentActivity();
        bindEvents();
    }

    /**
     * تحميل بيانات الملف الشخصي
     */
    async function loadProfileData() {
        try {
            if (!currentUser) return;

            // تحديث الصورة الشخصية
            const avatar = document.getElementById('profileAvatar');
            if (avatar) {
                avatar.src = currentUser.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.full_name || 'User')}&background=3d8fd6&color=fff&size=200`;
            }

            // تحديث الاسم
            const fullName = document.getElementById('profileFullName');
            if (fullName) {
                fullName.textContent = currentUser.full_name || currentUser.email;
            }

            // تحديث الدور
            const role = document.getElementById('profileRole');
            if (role) {
                const roleInfo = getRoleInfo(currentUser.role_level);
                role.innerHTML = `<i class="fa-solid fa-shield-halved" style="color: ${roleInfo.color};"></i> <span>${roleInfo.name}</span>`;
            }

            // تحديث البريد الإلكتروني
            const email = document.getElementById('profileEmail');
            if (email) {
                email.textContent = currentUser.email;
            }

            // تحديث رقم الهاتف
            const phone = document.getElementById('profilePhone');
            if (phone) {
                phone.textContent = currentUser.phone || 'غير محدد';
            }

            // تحديث تاريخ الانضمام
            const joinDate = document.getElementById('profileJoinDate');
            if (joinDate) {
                joinDate.textContent = new Date(currentUser.created_at).toLocaleDateString('ar-SA', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            }

            // تحديث آخر تسجيل دخول
            const lastLogin = document.getElementById('profileLastLogin');
            if (lastLogin) {
                lastLogin.textContent = currentUser.last_sign_in_at 
                    ? new Date(currentUser.last_sign_in_at).toLocaleString('ar-SA')
                    : 'غير معروف';
            }

            // تحديث آخر تغيير لكلمة المرور
            const lastPasswordChange = document.getElementById('lastPasswordChange');
            if (lastPasswordChange) {
                lastPasswordChange.textContent = 'غير معروف';
            }

        } catch (error) {
            console.error('خطأ في تحميل بيانات الملف الشخصي:', error);
            showNotification('فشل تحميل بيانات الملف الشخصي', 'error');
        }
    }

    /**
     * الحصول على معلومات الدور
     */
    function getRoleInfo(roleLevel) {
        const levels = {
            10: { name: 'رئيس النادي', color: '#dc2626' },
            9: { name: 'قائد مجلس أعلى', color: '#ea580c' },
            8: { name: 'قائد لجنة', color: '#f59e0b' },
            7: { name: 'نائب قائد لجنة', color: '#eab308' },
            6: { name: 'عضو لجنة', color: '#84cc16' },
            5: { name: 'عضو نادي', color: '#10b981' }
        };
        return levels[roleLevel] || { name: 'عضو', color: '#64748b' };
    }

    /**
     * تحميل النشاط الأخير
     */
    async function loadRecentActivity() {
        try {
            const container = document.getElementById('recentActivityContainer');
            if (!container) return;

            const { data, error } = await window.sbClient
                .from('activity_logs')
                .select('*')
                .eq('user_id', currentUser.id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;

            if (!data || data.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: #64748b; padding: 2rem;">لا يوجد نشاط مسجل</p>';
                return;
            }

            const html = data.map(activity => `
                <div style="padding: 1rem; border-bottom: 1px solid #e2e8f0; display: flex; gap: 1rem; align-items: start;">
                    <div style="width: 40px; height: 40px; border-radius: 50%; background: ${getActivityColor(activity.action_type)}; display: grid; place-items: center; flex-shrink: 0;">
                        <i class="fa-solid ${getActivityIcon(activity.action_type)}" style="color: white; font-size: 1rem;"></i>
                    </div>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: #274060; margin-bottom: 0.25rem;">
                            ${getActivityText(activity)}
                        </div>
                        <div style="font-size: 0.875rem; color: #64748b;">
                            <i class="fa-solid fa-clock"></i>
                            ${new Date(activity.created_at).toLocaleString('ar-SA')}
                        </div>
                    </div>
                </div>
            `).join('');

            container.innerHTML = html;

        } catch (error) {
            console.error('خطأ في تحميل النشاط:', error);
            const container = document.getElementById('recentActivityContainer');
            if (container) {
                container.innerHTML = '<p style="text-align: center; color: #ef4444; padding: 2rem;">فشل تحميل النشاط</p>';
            }
        }
    }

    /**
     * الحصول على لون النشاط
     */
    function getActivityColor(actionType) {
        const colors = {
            'login': '#10b981',
            'logout': '#64748b',
            'create': '#3b82f6',
            'update': '#f59e0b',
            'delete': '#ef4444',
            'approve': '#10b981',
            'reject': '#ef4444'
        };
        return colors[actionType] || '#64748b';
    }

    /**
     * الحصول على أيقونة النشاط
     */
    function getActivityIcon(actionType) {
        const icons = {
            'login': 'fa-right-to-bracket',
            'logout': 'fa-right-from-bracket',
            'create': 'fa-plus',
            'update': 'fa-pen',
            'delete': 'fa-trash',
            'approve': 'fa-check',
            'reject': 'fa-xmark'
        };
        return icons[actionType] || 'fa-circle';
    }

    /**
     * الحصول على نص النشاط
     */
    function getActivityText(activity) {
        const texts = {
            'login': 'تسجيل دخول',
            'logout': 'تسجيل خروج',
            'create': 'إنشاء',
            'update': 'تحديث',
            'delete': 'حذف',
            'approve': 'موافقة',
            'reject': 'رفض'
        };
        const action = texts[activity.action_type] || activity.action_type;
        const module = activity.module || '';
        return `${action} ${module}`;
    }

    /**
     * فتح نافذة تعديل الملف الشخصي
     */
    function openEditProfileModal() {
        const modalHtml = `
            <div class="modal-overlay" id="editProfileModal" onclick="if(event.target === this) this.remove()">
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h2><i class="fa-solid fa-pen"></i> تعديل الملف الشخصي</h2>
                        <button class="modal-close" onclick="document.getElementById('editProfileModal').remove()">
                            <i class="fa-solid fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form id="editProfileForm" style="display: grid; gap: 1rem;">
                            <div class="form-group">
                                <label><strong>الاسم الكامل</strong></label>
                                <input type="text" id="editFullName" value="${currentUser.full_name || ''}" required>
                            </div>
                            <div class="form-group">
                                <label><strong>رقم الهاتف</strong></label>
                                <input type="tel" id="editPhone" value="${currentUser.phone || ''}" placeholder="05XXXXXXXX">
                            </div>
                            <div style="display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1rem;">
                                <button type="button" class="btn-outline" onclick="document.getElementById('editProfileModal').remove()">
                                    إلغاء
                                </button>
                                <button type="submit" class="btn-primary">
                                    <i class="fa-solid fa-save"></i>
                                    حفظ التغييرات
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        document.getElementById('editProfileForm').addEventListener('submit', handleEditProfile);
    }

    /**
     * معالجة تعديل الملف الشخصي
     */
    async function handleEditProfile(e) {
        e.preventDefault();

        const fullName = document.getElementById('editFullName').value.trim();
        const phone = document.getElementById('editPhone').value.trim();

        try {
            const { error } = await window.sbClient
                .from('user_profiles')
                .update({
                    full_name: fullName,
                    phone: phone || null
                })
                .eq('id', currentUser.id);

            if (error) throw error;

            showNotification('تم تحديث الملف الشخصي بنجاح', 'success');
            document.getElementById('editProfileModal').remove();
            
            // تحديث البيانات المحلية
            currentUser.full_name = fullName;
            currentUser.phone = phone;
            await loadProfileData();

        } catch (error) {
            console.error('خطأ في تحديث الملف الشخصي:', error);
            showNotification(`فشل تحديث الملف الشخصي: ${error.message}`, 'error');
        }
    }

    /**
     * فتح نافذة تغيير كلمة المرور
     */
    function openChangePasswordModal() {
        const modalHtml = `
            <div class="modal-overlay" id="changePasswordModal" onclick="if(event.target === this) this.remove()">
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h2><i class="fa-solid fa-key"></i> تغيير كلمة المرور</h2>
                        <button class="modal-close" onclick="document.getElementById('changePasswordModal').remove()">
                            <i class="fa-solid fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form id="changePasswordForm" style="display: grid; gap: 1rem;">
                            <div class="form-group">
                                <label><strong>كلمة المرور الجديدة</strong></label>
                                <input type="password" id="newPassword" required minlength="8" placeholder="8 أحرف على الأقل">
                            </div>
                            <div class="form-group">
                                <label><strong>تأكيد كلمة المرور</strong></label>
                                <input type="password" id="confirmPassword" required minlength="8" placeholder="أعد إدخال كلمة المرور">
                            </div>
                            <div style="padding: 0.75rem; background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; font-size: 0.875rem; color: #92400e;">
                                <i class="fa-solid fa-triangle-exclamation"></i>
                                تأكد من استخدام كلمة مرور قوية تحتوي على أحرف كبيرة وصغيرة وأرقام
                            </div>
                            <div style="display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1rem;">
                                <button type="button" class="btn-outline" onclick="document.getElementById('changePasswordModal').remove()">
                                    إلغاء
                                </button>
                                <button type="submit" class="btn-primary">
                                    <i class="fa-solid fa-check"></i>
                                    تغيير كلمة المرور
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        document.getElementById('changePasswordForm').addEventListener('submit', handleChangePassword);
    }

    /**
     * معالجة تغيير كلمة المرور
     */
    async function handleChangePassword(e) {
        e.preventDefault();

        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword !== confirmPassword) {
            showNotification('كلمتا المرور غير متطابقتين', 'warning');
            return;
        }

        if (newPassword.length < 8) {
            showNotification('كلمة المرور يجب أن تكون 8 أحرف على الأقل', 'warning');
            return;
        }

        try {
            const { error } = await window.sbClient.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            showNotification('تم تغيير كلمة المرور بنجاح', 'success');
            document.getElementById('changePasswordModal').remove();

        } catch (error) {
            console.error('خطأ في تغيير كلمة المرور:', error);
            showNotification(`فشل تغيير كلمة المرور: ${error.message}`, 'error');
        }
    }

    /**
     * عرض الجلسات النشطة
     */
    function viewActiveSessions() {
        showNotification('ميزة عرض الجلسات النشطة قيد التطوير', 'info');
    }

    /**
     * تغيير الصورة الشخصية
     */
    function changeAvatar() {
        showNotification('ميزة تغيير الصورة الشخصية قيد التطوير', 'info');
    }

    /**
     * ربط الأحداث
     */
    function bindEvents() {
        const editProfileBtn = document.getElementById('editProfileBtn');
        const changePasswordBtn = document.getElementById('changePasswordBtn');
        const viewSessionsBtn = document.getElementById('viewSessionsBtn');
        const changeAvatarBtn = document.getElementById('changeAvatarBtn');

        if (editProfileBtn) {
            editProfileBtn.removeEventListener('click', openEditProfileModal);
            editProfileBtn.addEventListener('click', openEditProfileModal);
        }

        if (changePasswordBtn) {
            changePasswordBtn.removeEventListener('click', openChangePasswordModal);
            changePasswordBtn.addEventListener('click', openChangePasswordModal);
        }

        if (viewSessionsBtn) {
            viewSessionsBtn.removeEventListener('click', viewActiveSessions);
            viewSessionsBtn.addEventListener('click', viewActiveSessions);
        }

        if (changeAvatarBtn) {
            changeAvatarBtn.removeEventListener('click', changeAvatar);
            changeAvatarBtn.addEventListener('click', changeAvatar);
        }
    }

    /**
     * عرض إشعار
     */
    function showNotification(message, type = 'info') {
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            alert(message);
        }
    }

    // تصدير الوظائف
    window.profileManager = {
        init
    };
})();
