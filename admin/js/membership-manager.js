/**
 * مدير العضوية - إدارة طلبات التسجيل والتحكم في باب التسجيل
 */

(function() {
    'use strict';

    let currentApplications = [];
    let currentSettings = null;
    let currentUser = null;
    let availableCommittees = [];

    // عناصر DOM
    const availableCommitteesTable = document.getElementById('availableCommitteesTable');
    const joinOpenToggle = document.getElementById('joinOpenToggle');
    const countdownToggle = document.getElementById('countdownToggle');
    const scheduleToggle = document.getElementById('scheduleToggle');
    const scheduleSettings = document.getElementById('scheduleSettings');
    const scheduleMode = document.getElementById('scheduleMode');
    const scheduleOpenAt = document.getElementById('scheduleOpenAt');
    const scheduleCloseAt = document.getElementById('scheduleCloseAt');
    const openDateGroup = document.getElementById('openDateGroup');
    const closeDateGroup = document.getElementById('closeDateGroup');
    const saveMembershipSettings = document.getElementById('saveMembershipSettings');
    const resetMembershipSettings = document.getElementById('resetMembershipSettings');

    const applicationSearchInput = document.getElementById('applicationSearchInput');
    const applicationStatusFilter = document.getElementById('applicationStatusFilter');
    const applicationCommitteeFilter = document.getElementById('applicationCommitteeFilter');
    const refreshApplicationsBtn = document.getElementById('refreshApplicationsBtn');
    const exportApplicationsBtn = document.getElementById('exportApplicationsBtn');
    const applicationsTable = document.getElementById('applicationsTable');

    const applicationDetailModal = document.getElementById('applicationDetailModal');
    const closeApplicationDetailModal = document.getElementById('closeApplicationDetailModal');
    const closeApplicationDetailBtn = document.getElementById('closeApplicationDetailBtn');
    const saveApplicationBtn = document.getElementById('saveApplicationBtn');
    const deleteApplicationBtn = document.getElementById('deleteApplicationBtn');

    // عناصر تفاصيل الطلب
    const applicationDetailName = document.getElementById('applicationDetailName');
    const applicationDetailEmail = document.getElementById('applicationDetailEmail');
    const applicationDetailPhone = document.getElementById('applicationDetailPhone');
    const applicationDetailStatus = document.getElementById('applicationDetailStatus');
    const applicationDetailDate = document.getElementById('applicationDetailDate');
    const applicationDetailDegree = document.getElementById('applicationDetailDegree');
    const applicationDetailCommittee = document.getElementById('applicationDetailCommittee');
    const applicationDetailCollege = document.getElementById('applicationDetailCollege');
    const applicationDetailMajor = document.getElementById('applicationDetailMajor');
    const applicationDetailSkills = document.getElementById('applicationDetailSkills');
    const applicationDetailAbout = document.getElementById('applicationDetailAbout');
    const applicationDetailPortfolio = document.getElementById('applicationDetailPortfolio');
    const applicationPortfolioSection = document.getElementById('applicationPortfolioSection');
    const applicationDetailSocial = document.getElementById('applicationDetailSocial');
    const applicationSocialSection = document.getElementById('applicationSocialSection');
    const applicationDetailStatusSelect = document.getElementById('applicationDetailStatusSelect');
    const applicationAdminNotes = document.getElementById('applicationAdminNotes');
    const applicationReviewSection = document.getElementById('applicationReviewSection');
    const applicationReviewedBy = document.getElementById('applicationReviewedBy');
    const applicationReviewedAt = document.getElementById('applicationReviewedAt');

    let selectedApplication = null;

    /**
     * تهيئة مدير العضوية
     */
    async function initMembershipManager(user) {
        currentUser = user;

        // تحميل الإعدادات
        await loadMembershipSettings();

        // تحميل اللجان المتاحة
        await loadAvailableCommittees();

        // ملاحظة: loadApplications تم نقلها إلى loadApplicationsView و loadApplicationsReview
        // كل قسم له دالة تحميل خاصة به

        // ربط الأحداث
        bindEvents();
    }

    /**
     * تحميل إعدادات التسجيل
     */
    async function loadMembershipSettings() {
        try {
            const { data, error } = await window.sbClient
                .from('membership_settings')
                .select('*')
                .eq('id', 'default')
                .single();

            if (error) throw error;

            currentSettings = data || {
                join_open: true,
                join_membership_countdown: false,
                join_schedule_enabled: false,
                join_schedule_mode: 'range',
                join_schedule_open_at: null,
                join_schedule_close_at: null
            };

            // تحديث الواجهة
            updateSettingsUI();
        } catch (error) {
            console.error('خطأ في تحميل الإعدادات:', error);
            showNotification('خطأ في تحميل إعدادات التسجيل', 'error');
        }
    }

    /**
     * تحديث واجهة الإعدادات
     */
    function updateSettingsUI() {
        if (!currentSettings) return;

        joinOpenToggle.checked = currentSettings.join_open;
        countdownToggle.checked = currentSettings.join_membership_countdown;
        scheduleToggle.checked = currentSettings.join_schedule_enabled;
        scheduleMode.value = currentSettings.join_schedule_mode || 'range';

        if (currentSettings.join_schedule_open_at) {
            scheduleOpenAt.value = formatDateTimeLocal(currentSettings.join_schedule_open_at);
        }
        if (currentSettings.join_schedule_close_at) {
            scheduleCloseAt.value = formatDateTimeLocal(currentSettings.join_schedule_close_at);
        }

        updateScheduleVisibility();
    }

    /**
     * تحديث رؤية إعدادات الجدولة
     */
    function updateScheduleVisibility() {
        const enabled = scheduleToggle.checked;
        scheduleSettings.style.display = enabled ? 'block' : 'none';

        const mode = scheduleMode.value;
        openDateGroup.style.display = (mode === 'range' || mode === 'open_only') ? 'block' : 'none';
        closeDateGroup.style.display = (mode === 'range' || mode === 'close_only') ? 'block' : 'none';
    }

    /**
     * حفظ إعدادات التسجيل
     */
    async function saveMembershipSettingsHandler() {
        try {
            // التحقق من إغلاق باب التسجيل
            const wasOpen = currentSettings.join_open;
            const willBeClosed = !joinOpenToggle.checked;
            
            const settings = {
                join_open: joinOpenToggle.checked,
                join_membership_countdown: countdownToggle.checked,
                join_schedule_enabled: scheduleToggle.checked,
                join_schedule_mode: scheduleMode.value,
                join_schedule_open_at: scheduleOpenAt.value ? new Date(scheduleOpenAt.value).toISOString() : null,
                join_schedule_close_at: scheduleCloseAt.value ? new Date(scheduleCloseAt.value).toISOString() : null,
                updated_by: currentUser.id
            };

            // إذا تم إغلاق باب التسجيل، اسأل عن الأرشفة
            if (wasOpen && willBeClosed) {
                const result = await Swal.fire({
                    title: 'إغلاق باب التسجيل',
                    text: 'هل تريد إنشاء أرشيف تلقائي لفترة التسجيل الحالية؟',
                    icon: 'question',
                    showCancelButton: true,
                    showDenyButton: true,
                    confirmButtonText: 'نعم، إنشاء أرشيف',
                    denyButtonText: 'لا، إغلاق فقط',
                    cancelButtonText: 'إلغاء',
                    confirmButtonColor: '#3b82f6',
                    denyButtonColor: '#6b7280'
                });

                if (result.isDismissed) {
                    return; // إلغاء العملية
                }

                // حفظ الإعدادات أولاً
                const { error } = await window.sbClient
                    .from('membership_settings')
                    .update(settings)
                    .eq('id', 'default');

                if (error) throw error;

                // إنشاء الأرشيف إذا وافق المستخدم
                if (result.isConfirmed) {
                    try {
                        const { data: archiveId, error: archiveError } = await window.sbClient.rpc('create_membership_archive');
                        
                        if (archiveError) {
                            console.error('خطأ في إنشاء الأرشيف:', archiveError);
                            showNotification('تم حفظ الإعدادات ولكن فشل إنشاء الأرشيف', 'warning');
                        } else {
                            showNotification('تم حفظ الإعدادات وإنشاء الأرشيف بنجاح', 'success');
                        }
                    } catch (archiveError) {
                        console.error('خطأ في إنشاء الأرشيف:', archiveError);
                        showNotification('تم حفظ الإعدادات ولكن فشل إنشاء الأرشيف', 'warning');
                    }
                } else {
                    showNotification('تم حفظ الإعدادات بنجاح', 'success');
                }
            } else {
                // حفظ عادي بدون أرشفة
                const { error } = await window.sbClient
                    .from('membership_settings')
                    .update(settings)
                    .eq('id', 'default');

                if (error) throw error;

                showNotification('تم حفظ الإعدادات بنجاح', 'success');
            }

            currentSettings = { ...currentSettings, ...settings };
        } catch (error) {
            console.error('خطأ في حفظ الإعدادات:', error);
            showNotification('خطأ في حفظ الإعدادات', 'error');
        }
    }

    /**
     * تحميل طلبات العضوية
     */
    async function loadApplications() {
        try {
            showLoading(applicationsTable);

            const { data, error } = await window.sbClient
                .from('membership_applications')
                .select(`
                    *,
                    reviewed_by_user:profiles!reviewed_by(full_name)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            currentApplications = data || [];
            renderApplicationsTable();
            updateStatistics();
        } catch (error) {
            console.error('خطأ في تحميل الطلبات:', error);
            showNotification('خطأ في تحميل طلبات العضوية', 'error');
            applicationsTable.innerHTML = '<p class="text-center text-muted">حدث خطأ في تحميل البيانات</p>';
        }
    }

    /**
     * عرض جدول الطلبات
     */
    function renderApplicationsTable() {
        const searchTerm = applicationSearchInput.value.toLowerCase();
        const statusFilter = applicationStatusFilter.value;
        const committeeFilter = applicationCommitteeFilter.value;

        let filtered = currentApplications.filter(app => {
            const matchSearch = !searchTerm || 
                app.full_name.toLowerCase().includes(searchTerm) ||
                app.email.toLowerCase().includes(searchTerm) ||
                (app.phone && app.phone.includes(searchTerm));
            
            const matchStatus = !statusFilter || app.status === statusFilter;
            const matchCommittee = !committeeFilter || app.preferred_committee === committeeFilter;

            return matchSearch && matchStatus && matchCommittee;
        });

        if (filtered.length === 0) {
            applicationsTable.innerHTML = '<p class="text-center text-muted">لا توجد طلبات</p>';
            return;
        }

        let html = `
            <table>
                <thead>
                    <tr>
                        <th>الاسم</th>
                        <th>البريد الإلكتروني</th>
                        <th>اللجنة المرغوبة</th>
                        <th>الحالة</th>
                        <th>تاريخ التقديم</th>
                        <th>الإجراءات</th>
                    </tr>
                </thead>
                <tbody>
        `;

        filtered.forEach(app => {
            const statusBadge = getStatusBadge(app.status);
            const date = new Date(app.created_at).toLocaleDateString('ar-SA', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });

            html += `
                <tr>
                    <td>${escapeHtml(app.full_name)}</td>
                    <td>${escapeHtml(app.email)}</td>
                    <td>${escapeHtml(app.preferred_committee || '-')}</td>
                    <td>${statusBadge}</td>
                    <td>${date}</td>
                    <td>
                        <button class="btn-sm btn-primary" onclick="window.membershipManager.viewApplication('${app.id}')">
                            <i class="fa-solid fa-eye"></i>
                            عرض
                        </button>
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        applicationsTable.innerHTML = html;
    }

    /**
     * عرض تفاصيل طلب
     */
    function viewApplication(id) {
        const app = currentApplications.find(a => a.id === id);
        if (!app) return;

        selectedApplication = app;

        // ملء البيانات
        applicationDetailName.textContent = app.full_name;
        applicationDetailEmail.textContent = app.email;
        applicationDetailPhone.textContent = app.phone || '-';
        applicationDetailStatus.textContent = getStatusText(app.status);
        applicationDetailStatus.className = 'badge ' + getStatusClass(app.status);
        
        applicationDetailDate.textContent = new Date(app.created_at).toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        applicationDetailDegree.textContent = app.degree || '-';
        applicationDetailCommittee.textContent = app.preferred_committee || '-';
        applicationDetailCollege.textContent = app.college || '-';
        applicationDetailMajor.textContent = app.major || '-';
        applicationDetailSkills.textContent = app.skills || '-';
        applicationDetailAbout.textContent = app.about || '-';

        // رابط الأعمال
        if (app.portfolio_url) {
            applicationDetailPortfolio.href = app.portfolio_url;
            applicationPortfolioSection.style.display = 'block';
        } else {
            applicationPortfolioSection.style.display = 'none';
        }

        // حسابات التواصل
        const socials = [];
        if (app.social_twitter) socials.push(`<a href="${app.social_twitter}" target="_blank" rel="noopener"><i class="fa-brands fa-twitter"></i> تويتر</a>`);
        if (app.social_instagram) socials.push(`<a href="${app.social_instagram}" target="_blank" rel="noopener"><i class="fa-brands fa-instagram"></i> إنستغرام</a>`);
        if (app.social_linkedin) socials.push(`<a href="${app.social_linkedin}" target="_blank" rel="noopener"><i class="fa-brands fa-tiktok"></i> تيك توك</a>`);
        
        if (socials.length > 0) {
            applicationDetailSocial.innerHTML = socials.join('');
            applicationSocialSection.style.display = 'block';
        } else {
            applicationSocialSection.style.display = 'none';
        }

        // الحالة والملاحظات
        applicationDetailStatusSelect.value = app.status;
        applicationAdminNotes.value = app.admin_notes || '';

        // معلومات المراجعة
        if (app.reviewed_by && app.reviewed_at) {
            applicationReviewedBy.textContent = app.reviewed_by_user?.full_name || 'غير معروف';
            applicationReviewedAt.textContent = new Date(app.reviewed_at).toLocaleDateString('ar-SA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            applicationReviewSection.style.display = 'block';
        } else {
            applicationReviewSection.style.display = 'none';
        }

        // فتح النافذة
        applicationDetailModal.classList.add('active');
        document.getElementById('overlay').classList.add('active');
    }

    /**
     * حفظ تغييرات الطلب
     */
    async function saveApplicationChanges() {
        if (!selectedApplication) return;

        try {
            const updates = {
                status: applicationDetailStatusSelect.value,
                admin_notes: applicationAdminNotes.value,
                reviewed_by: currentUser.id,
                reviewed_at: new Date().toISOString()
            };

            const { error } = await window.sbClient
                .from('membership_applications')
                .update(updates)
                .eq('id', selectedApplication.id);

            if (error) throw error;

            showNotification('تم حفظ التغييرات بنجاح', 'success');
            closeApplicationModal();
            await loadApplications();
        } catch (error) {
            console.error('خطأ في حفظ التغييرات:', error);
            showNotification('خطأ في حفظ التغييرات', 'error');
        }
    }

    /**
     * حذف طلب
     */
    async function deleteApplication() {
        if (!selectedApplication) return;

        const result = await showCustomConfirm({
            title: 'تأكيد الحذف',
            text: 'هل أنت متأكد من حذف هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.',
            showCancelButton: true,
            confirmButtonText: 'نعم، احذف',
            cancelButtonText: 'إلغاء'
        });

        if (!result.isConfirmed) return;

        try {
            const { error } = await window.sbClient
                .from('membership_applications')
                .delete()
                .eq('id', selectedApplication.id);

            if (error) throw error;

            showNotification('تم حذف الطلب بنجاح', 'success');
            closeApplicationModal();
            await loadApplications();
        } catch (error) {
            console.error('خطأ في حذف الطلب:', error);
            showNotification('خطأ في حذف الطلب', 'error');
        }
    }

    /**
     * إغلاق نافذة التفاصيل
     */
    function closeApplicationModal() {
        applicationDetailModal.classList.remove('active');
        document.getElementById('overlay').classList.remove('active');
        selectedApplication = null;
    }

    /**
     * تصدير الطلبات إلى CSV
     */
    function exportApplications() {
        if (currentApplications.length === 0) {
            showNotification('لا توجد بيانات للتصدير', 'warning');
            return;
        }

        const headers = ['الاسم', 'البريد الإلكتروني', 'الهاتف', 'الدرجة', 'الكلية', 'التخصص', 'المهارات', 'اللجنة المرغوبة', 'الحالة', 'تاريخ التقديم'];
        const rows = currentApplications.map(app => [
            app.full_name,
            app.email,
            app.phone || '',
            app.degree || '',
            app.college || '',
            app.major || '',
            app.skills || '',
            app.preferred_committee || '',
            getStatusText(app.status),
            new Date(app.created_at).toLocaleDateString('ar-SA')
        ]);

        const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `membership_applications_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();

        showNotification('تم تصدير البيانات بنجاح', 'success');
    }

    /**
     * تحديث الإحصائيات
     */
    function updateStatistics() {
        const newCount = currentApplications.filter(a => a.status === 'new').length;
        const reviewCount = currentApplications.filter(a => a.status === 'under_review').length;
        const acceptedCount = currentApplications.filter(a => a.status === 'accepted').length;
        const rejectedCount = currentApplications.filter(a => a.status === 'rejected').length;

        document.getElementById('newApplicationsCount').textContent = newCount;
        document.getElementById('reviewApplicationsCount').textContent = reviewCount;
        document.getElementById('acceptedApplicationsCount').textContent = acceptedCount;
        document.getElementById('rejectedApplicationsCount').textContent = rejectedCount;
    }

    /**
     * ربط الأحداث
     */
    function bindEvents() {
        // إعدادات التسجيل
        scheduleToggle.addEventListener('change', updateScheduleVisibility);
        scheduleMode.addEventListener('change', updateScheduleVisibility);
        saveMembershipSettings.addEventListener('click', saveMembershipSettingsHandler);
        resetMembershipSettings.addEventListener('click', () => {
            loadMembershipSettings();
            showNotification('تم إعادة تعيين الإعدادات', 'info');
        });

        // ملاحظة: هذه الأحداث للنموذج القديم فقط (نافذة التفاصيل)
        // أحداث قسم العرض والمراجعة يتم ربطها في دوالها الخاصة

        // نافذة التفاصيل
        closeApplicationDetailModal.addEventListener('click', closeApplicationModal);
        closeApplicationDetailBtn.addEventListener('click', closeApplicationModal);
        saveApplicationBtn.addEventListener('click', saveApplicationChanges);
        deleteApplicationBtn.addEventListener('click', deleteApplication);
    }

    /**
     * دوال مساعدة
     */
    function getStatusBadge(status) {
        const text = getStatusText(status);
        const className = getStatusClass(status);
        return `<span class="badge ${className}">${text}</span>`;
    }

    function getStatusText(status) {
        const statusMap = {
            'new': 'جديد',
            'under_review': 'قيد المراجعة',
            'approved_for_interview': 'مقبول للمقابلة',
            'accepted': 'مقبول',
            'rejected': 'مرفوض',
            'archived': 'مؤرشف'
        };
        return statusMap[status] || status;
    }

    function getStatusClass(status) {
        const classMap = {
            'new': 'badge-info',
            'under_review': 'badge-warning',
            'approved_for_interview': 'badge-success',
            'accepted': 'badge-success',
            'rejected': 'badge-danger',
            'archived': 'badge-secondary'
        };
        return classMap[status] || '';
    }

    function formatDateTimeLocal(isoString) {
        if (!isoString) return '';
        const date = new Date(isoString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function showLoading(element) {
        element.innerHTML = '<div class="text-center"><i class="fa-solid fa-spinner fa-spin"></i> جاري التحميل...</div>';
    }

    function showNotification(message, type = 'info') {
        // إنشاء عنصر الإشعار
        const notification = document.createElement('div');
        notification.className = `custom-notification custom-notification-${type}`;
        
        const icons = {
            success: 'fa-circle-check',
            error: 'fa-circle-xmark',
            warning: 'fa-triangle-exclamation',
            info: 'fa-circle-info'
        };
        
        notification.innerHTML = `
            <i class="fa-solid ${icons[type] || icons.info}"></i>
            <span>${message}</span>
        `;
        
        // إضافة إلى الصفحة
        document.body.appendChild(notification);
        
        // إظهار الإشعار بعد delay صغير للتأثير
        setTimeout(() => notification.classList.add('show'), 10);
        
        // إخفاء وإزالة الإشعار بعد 3 ثواني
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    /**
     * تحميل اللجان المتاحة للتسجيل
     */
    async function loadAvailableCommittees() {
        try {
            const { data, error } = await window.sbClient
                .from('membership_available_committees')
                .select(`
                    *,
                    committee:committees(*)
                `)
                .order('display_order', { ascending: true });

            if (error) throw error;

            availableCommittees = data || [];

            // حساب عدد المتقدمين لكل لجنة من جدول membership_applications
            for (let item of availableCommittees) {
                const { count, error: countError } = await window.sbClient
                    .from('membership_applications')
                    .select('*', { count: 'exact', head: true })
                    .eq('preferred_committee', item.committee.committee_name_ar);

                if (!countError) {
                    item.current_applicants = count || 0;
                }
            }

            renderAvailableCommitteesTable();
        } catch (error) {
            console.error('خطأ في تحميل اللجان المتاحة:', error);
            if (availableCommitteesTable) {
                availableCommitteesTable.innerHTML = '<p class="text-center text-muted">حدث خطأ في تحميل اللجان المتاحة</p>';
            }
        }
    }

    /**
     * عرض جدول اللجان المتاحة
     */
    function renderAvailableCommitteesTable() {
        if (!availableCommitteesTable) return;

        if (availableCommittees.length === 0) {
            availableCommitteesTable.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #64748b;">
                    <i class="fa-solid fa-inbox" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p>لا توجد لجان متاحة</p>
                    <p style="font-size: 0.9rem;">قم بإضافة لجان من قسم إدارة اللجان أولاً</p>
                </div>
            `;
            return;
        }

        let html = `
            <table>
                <thead>
                    <tr>
                        <th style="width: 50px;">الترتيب</th>
                        <th>اسم اللجنة</th>
                        <th>الوصف</th>
                        <th style="width: 100px;">المتقدمين</th>
                        <th style="width: 120px;">الحد الأقصى</th>
                        <th style="width: 100px;">الحالة</th>
                    </tr>
                </thead>
                <tbody>
        `;

        availableCommittees.forEach((item, index) => {
            const committee = item.committee;
            const isAvailable = item.is_available;
            const currentCount = item.current_applicants || 0;
            const maxCount = item.max_applicants || '∞';
            const isFull = item.max_applicants && currentCount >= item.max_applicants;

            html += `
                <tr>
                    <td style="text-align: center;">
                        <div style="display: flex; gap: 4px; justify-content: center;">
                            <button 
                                class="icon-btn" 
                                onclick="window.membershipManager.moveCommittee('${item.id}', 'up')"
                                ${index === 0 ? 'disabled' : ''}
                                title="تحريك لأعلى">
                                <i class="fa-solid fa-arrow-up"></i>
                            </button>
                            <button 
                                class="icon-btn" 
                                onclick="window.membershipManager.moveCommittee('${item.id}', 'down')"
                                ${index === availableCommittees.length - 1 ? 'disabled' : ''}
                                title="تحريك لأسفل">
                                <i class="fa-solid fa-arrow-down"></i>
                            </button>
                        </div>
                    </td>
                    <td>
                        <strong>${committee.committee_name_ar}</strong>
                    </td>
                    <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${committee.description || 'لا يوجد وصف'}
                    </td>
                    <td style="text-align: center;">
                        <span class="badge ${isFull ? 'error' : 'info'}">${currentCount}</span>
                    </td>
                    <td style="text-align: center;">
                        <input 
                            type="number" 
                            value="${item.max_applicants || ''}" 
                            placeholder="∞"
                            style="width: 80px; text-align: center; padding: 4px 8px;"
                            onchange="window.membershipManager.updateMaxApplicants('${item.id}', this.value)"
                        />
                    </td>
                    <td style="text-align: center;">
                        <label class="toggle-switch" style="margin: 0;">
                            <input 
                                type="checkbox" 
                                ${isAvailable ? 'checked' : ''}
                                onchange="window.membershipManager.toggleCommitteeAvailability('${item.id}', this.checked)"
                            />
                            <span class="toggle-slider"></span>
                        </label>
                    </td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;

        availableCommitteesTable.innerHTML = html;
    }

    /**
     * تبديل حالة توفر اللجنة
     */
    async function toggleCommitteeAvailability(committeeId, isAvailable) {
        try {
            const { error } = await window.sbClient
                .from('membership_available_committees')
                .update({ is_available: isAvailable, updated_at: new Date().toISOString() })
                .eq('id', committeeId);

            if (error) throw error;

            await loadAvailableCommittees();
            showNotification(isAvailable ? 'تم تفعيل اللجنة للتسجيل' : 'تم إيقاف اللجنة عن التسجيل', 'success');
        } catch (error) {
            console.error('خطأ في تحديث حالة اللجنة:', error);
            showNotification('خطأ في تحديث حالة اللجنة', 'error');
            await loadAvailableCommittees();
        }
    }

    /**
     * تحديث الحد الأقصى للمتقدمين
     */
    async function updateMaxApplicants(committeeId, maxValue) {
        try {
            const maxApplicants = maxValue && maxValue.trim() !== '' ? parseInt(maxValue) : null;

            const { error } = await window.sbClient
                .from('membership_available_committees')
                .update({ max_applicants: maxApplicants, updated_at: new Date().toISOString() })
                .eq('id', committeeId);

            if (error) throw error;

            await loadAvailableCommittees();
            showNotification('تم تحديث الحد الأقصى للمتقدمين', 'success');
        } catch (error) {
            console.error('خطأ في تحديث الحد الأقصى:', error);
            showNotification('خطأ في تحديث الحد الأقصى', 'error');
            await loadAvailableCommittees();
        }
    }

    /**
     * تحريك اللجنة في الترتيب
     */
    async function moveCommittee(committeeId, direction) {
        try {
            const currentIndex = availableCommittees.findIndex(c => c.id === committeeId);
            if (currentIndex === -1) return;

            const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
            if (targetIndex < 0 || targetIndex >= availableCommittees.length) return;

            const currentCommittee = availableCommittees[currentIndex];
            const targetCommittee = availableCommittees[targetIndex];

            // تبديل الترتيب
            const { error: error1 } = await window.sbClient
                .from('membership_available_committees')
                .update({ display_order: targetCommittee.display_order })
                .eq('id', currentCommittee.id);

            const { error: error2 } = await window.sbClient
                .from('membership_available_committees')
                .update({ display_order: currentCommittee.display_order })
                .eq('id', targetCommittee.id);

            if (error1 || error2) throw error1 || error2;

            await loadAvailableCommittees();
            showNotification('تم تحديث الترتيب', 'success');
        } catch (error) {
            console.error('خطأ في تحديث الترتيب:', error);
            showNotification('خطأ في تحديث الترتيب', 'error');
        }
    }

    /**
     * إزالة لجنة من قائمة المتاحة
     */
    async function removeCommittee(committeeId) {
        const result = await showCustomConfirm({
            title: 'تأكيد الإزالة',
            text: 'هل تريد إزالة هذه اللجنة من قائمة اللجان المتاحة للتسجيل؟',
            showCancelButton: true,
            confirmButtonText: 'نعم، إزالة',
            cancelButtonText: 'إلغاء'
        });

        if (!result.isConfirmed) return;

        try {
            const { error } = await window.sbClient
                .from('membership_available_committees')
                .delete()
                .eq('id', committeeId);

            if (error) throw error;

            await loadAvailableCommittees();
            showNotification('تم إزالة اللجنة من القائمة', 'success');
        } catch (error) {
            console.error('خطأ في إزالة اللجنة:', error);
            showNotification('خطأ في إزالة اللجنة', 'error');
        }
    }

    /**
     * عرض تفاصيل طلب
     */
    async function viewApplication(applicationId) {
        try {
            const { data, error } = await window.sbClient
                .from('membership_applications')
                .select('*')
                .eq('id', applicationId)
                .single();

            if (error) throw error;

            selectedApplication = data;
            
            const createdDate = new Date(data.created_at).toLocaleDateString('ar-SA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const createdTime = new Date(data.created_at).toLocaleTimeString('ar-SA', {
                hour: '2-digit',
                minute: '2-digit'
            });

            const statusBadge = getStatusBadge(data.status);

            // بناء محتوى النافذة المنبثقة
            const contentHtml = `
                <!-- المعلومات الشخصية -->
                <div class="detail-section">
                    <div class="detail-section-header">
                        <i class="fa-solid fa-user"></i>
                        <h3>المعلومات الشخصية</h3>
                    </div>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <div class="detail-label">
                                <i class="fa-solid fa-id-card"></i>
                                الاسم الكامل
                            </div>
                            <div class="detail-value">${escapeHtml(data.full_name)}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">
                                <i class="fa-solid fa-envelope"></i>
                                البريد الإلكتروني
                            </div>
                            <div class="detail-value">${escapeHtml(data.email)}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">
                                <i class="fa-solid fa-phone"></i>
                                رقم الهاتف
                            </div>
                            <div class="detail-value">${escapeHtml(data.phone || 'غير متوفر')}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">
                                <i class="fa-solid fa-calendar-check"></i>
                                تاريخ التقديم
                            </div>
                            <div class="detail-value">${createdDate} - ${createdTime}</div>
                        </div>
                    </div>
                </div>

                <!-- المعلومات الأكاديمية -->
                <div class="detail-section">
                    <div class="detail-section-header">
                        <i class="fa-solid fa-graduation-cap"></i>
                        <h3>المعلومات الأكاديمية</h3>
                    </div>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <div class="detail-label">
                                <i class="fa-solid fa-award"></i>
                                الدرجة العلمية
                            </div>
                            <div class="detail-value">${escapeHtml(data.degree || 'غير محدد')}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">
                                <i class="fa-solid fa-building-columns"></i>
                                الكلية
                            </div>
                            <div class="detail-value">${escapeHtml(data.college || 'غير محدد')}</div>
                        </div>
                        <div class="detail-item full-width">
                            <div class="detail-label">
                                <i class="fa-solid fa-book"></i>
                                التخصص
                            </div>
                            <div class="detail-value">${escapeHtml(data.major || 'غير محدد')}</div>
                        </div>
                    </div>
                </div>

                <!-- معلومات التقديم -->
                <div class="detail-section">
                    <div class="detail-section-header">
                        <i class="fa-solid fa-briefcase"></i>
                        <h3>معلومات التقديم</h3>
                    </div>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <div class="detail-label">
                                <i class="fa-solid fa-users"></i>
                                اللجنة المرغوبة
                            </div>
                            <div class="detail-value">${escapeHtml(data.preferred_committee || 'غير محدد')}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">
                                <i class="fa-solid fa-flag"></i>
                                الحالة
                            </div>
                            <div class="detail-value">${statusBadge}</div>
                        </div>
                        <div class="detail-item full-width">
                            <div class="detail-label">
                                <i class="fa-solid fa-star"></i>
                                المهارات
                            </div>
                            <div class="detail-value">${escapeHtml(data.skills || 'غير محدد')}</div>
                        </div>
                        ${data.portfolio_url ? `
                            <div class="detail-item full-width">
                                <div class="detail-label">
                                    <i class="fa-solid fa-link"></i>
                                    رابط الأعمال
                                </div>
                                <div class="detail-value">
                                    <a href="${escapeHtml(data.portfolio_url)}" target="_blank">${escapeHtml(data.portfolio_url)}</a>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <!-- نبذة عن المتقدم -->
                <div class="detail-section">
                    <div class="detail-section-header">
                        <i class="fa-solid fa-comment-dots"></i>
                        <h3>نبذة عن المتقدم</h3>
                    </div>
                    <div class="detail-value long-text">${escapeHtml(data.about || 'لا توجد نبذة')}</div>
                </div>

                ${data.review_notes || data.admin_notes ? `
                    <div class="detail-section">
                        <div class="detail-section-header">
                            <i class="fa-solid fa-note-sticky"></i>
                            <h3>ملاحظات إدارية</h3>
                        </div>
                        <div class="admin-notes-container">
                            ${data.review_notes ? `
                                <div class="admin-note review-note">
                                    <div class="note-header">
                                        <i class="fa-solid fa-eye"></i>
                                        <strong>ملاحظات قيد المراجعة</strong>
                                    </div>
                                    <div class="note-content">${escapeHtml(data.review_notes)}</div>
                                </div>
                            ` : ''}
                            ${data.admin_notes ? `
                                <div class="admin-note ${data.status === 'approved_for_interview' ? 'accept-note' : data.status === 'rejected' ? 'reject-note' : ''}">
                                    <div class="note-header">
                                        <i class="fa-solid fa-${data.status === 'approved_for_interview' ? 'check-circle' : data.status === 'rejected' ? 'times-circle' : 'note-sticky'}"></i>
                                        <strong>${data.status === 'approved_for_interview' ? 'ملاحظات القبول' : data.status === 'rejected' ? 'سبب الرفض' : 'ملاحظات إدارية'}</strong>
                                    </div>
                                    <div class="note-content">${escapeHtml(data.admin_notes)}</div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                ` : ''}
            `;

            // بناء أزرار الإجراءات - فقط في قسم المراجعة
            let actionsHtml = '';

            // التحقق من القسم الحالي - إذا كان قسم العرض، لا تظهر أزرار الإجراءات
            const isViewSection = document.getElementById('membership-applications-view-section')?.style.display !== 'none';
            const isReviewSection = document.getElementById('membership-applications-review-section')?.style.display !== 'none';

            if (isReviewSection && (data.status === 'new' || data.status === 'under_review')) {
                actionsHtml = `
                    <button class="modal-btn modal-btn-primary" onclick="window.membershipManager.approveForInterview('${data.id}'); window.closeApplicationModal();">
                        <i class="fa-solid fa-calendar-check"></i>
                        قبول للمقابلة
                    </button>
                    <button class="modal-btn modal-btn-warning" onclick="window.membershipManager.markUnderReview('${data.id}'); window.closeApplicationModal();">
                        <i class="fa-solid fa-eye"></i>
                        قيد المراجعة
                    </button>
                    <button class="modal-btn modal-btn-danger" onclick="window.membershipManager.rejectApplication('${data.id}'); window.closeApplicationModal();">
                        <i class="fa-solid fa-times"></i>
                        رفض الطلب
                    </button>
                `;
            }

            // عرض النافذة المنبثقة
            document.getElementById('applicationDetailsContent').innerHTML = contentHtml;
            document.getElementById('applicationDetailsActions').innerHTML = actionsHtml;
            window.setModalTitle('تفاصيل الطلب');
            window.openApplicationModal();

        } catch (error) {
            console.error('خطأ في تحميل تفاصيل الطلب:', error);
            showNotification('خطأ في تحميل تفاصيل الطلب', 'error');
        }
    }

    /**
     * قبول طلب للمقابلة
     */
    async function approveForInterview(applicationId) {
        // طلب ملاحظات اختيارية
        const { value: acceptNotes } = await showCustomInput({
            title: 'قبول للمقابلة',
            input: 'textarea',
            inputLabel: 'ملاحظات القبول (اختياري)',
            inputPlaceholder: 'أضف ملاحظات حول قبول المتقدم للمقابلة...',
            showCancelButton: true,
            confirmButtonText: 'قبول للمقابلة',
            cancelButtonText: 'إلغاء'
        });

        if (acceptNotes === null) return; // ضغط إلغاء

        try {
            // تحديث حالة الطلب
            const updateData = {
                status: 'approved_for_interview',
                approved_for_interview_by: currentUser.id,
                approved_for_interview_at: new Date().toISOString(),
                reviewed_by: currentUser.id,
                reviewed_at: new Date().toISOString()
            };

            // إضافة الملاحظات إذا كانت موجودة
            if (acceptNotes && acceptNotes.trim()) {
                updateData.admin_notes = acceptNotes.trim();
            }

            const { error: updateError } = await window.sbClient
                .from('membership_applications')
                .update(updateData)
                .eq('id', applicationId);

            if (updateError) throw updateError;

            showNotification('تم قبول المتقدم للمقابلة بنجاح', 'success');
            await loadApplicationsReview(currentUser);
        } catch (error) {
            console.error('خطأ في قبول الطلب:', error);
            showNotification('خطأ في قبول الطلب للمقابلة', 'error');
        }
    }

    /**
     * جدولة مقابلة لطلب معين
     */
    async function scheduleInterviewForApplication(applicationId, application) {
        const result = await showCustomConfirm({
            title: 'جدولة المقابلة',
            html: `
                <div style="text-align: right;">
                    <p style="margin-bottom: 1rem;"><strong>المتقدم:</strong> ${escapeHtml(application.full_name)}</p>
                    <p style="margin-bottom: 1rem;"><strong>اللجنة:</strong> ${escapeHtml(application.preferred_committee)}</p>
                    <hr>
                    <div class="form-group">
                        <label>تاريخ ووقت المقابلة</label>
                        <input type="datetime-local" id="swal-date" style="width: 100%; padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 8px;">
                    </div>
                    <div class="form-group">
                        <label>نوع المقابلة</label>
                        <select id="swal-type" style="width: 100%; padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 8px;">
                            <option value="in_person">حضوري</option>
                            <option value="online">أونلاين</option>
                            <option value="phone">هاتفي</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>الموقع/الرابط</label>
                        <input type="text" id="swal-location" placeholder="الموقع أو رابط الاجتماع" style="width: 100%; padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 8px;">
                    </div>
                    <div class="form-group">
                        <label>ملاحظات (اختياري)</label>
                        <textarea id="swal-notes" placeholder="ملاحظات حول المقابلة..." style="width: 100%; height: 80px; padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 8px; resize: vertical;"></textarea>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'جدولة',
            cancelButtonText: 'إلغاء',
            preConfirm: () => {
                const date = document.getElementById('swal-date').value;
                if (!date) {
                    showNotification('يرجى تحديد تاريخ ووقت المقابلة', 'error');
                    return false;
                }
                return true;
            }
        });

        if (!result.isConfirmed) return;

        const date = document.getElementById('swal-date').value;
        const type = document.getElementById('swal-type').value;
        const location = document.getElementById('swal-location').value;
        const notes = document.getElementById('swal-notes').value;
        
        const formValues = { date, type, location, notes };

        try {
            const { error: insertError } = await window.sbClient
                .from('membership_interviews')
                .insert({
                    application_id: applicationId,
                    interview_date: new Date(formValues.date).toISOString(),
                    interview_type: formValues.type,
                    interview_location: formValues.location || null,
                    meeting_link: formValues.type === 'online' ? formValues.location : null,
                    interviewer_notes: formValues.notes || null,
                    created_by: currentUser.id,
                    status: 'scheduled',
                    result: 'pending'
                });

            if (insertError) throw insertError;

            showNotification('تم قبول الطلب وجدولة المقابلة بنجاح', 'success');
        } catch (error) {
            console.error('خطأ في جدولة المقابلة:', error);
            showNotification('تم قبول الطلب ولكن فشلت جدولة المقابلة. يمكنك جدولتها من قسم المقابلات', 'warning');
        }
    }

    /**
     * رفض طلب
     */
    async function rejectApplication(applicationId) {
        const { value: rejectNotes } = await showCustomInput({
            title: 'رفض الطلب',
            input: 'textarea',
            inputLabel: 'سبب الرفض (اختياري)',
            inputPlaceholder: 'أضف سبب الرفض...',
            showCancelButton: true,
            confirmButtonText: 'رفض',
            cancelButtonText: 'إلغاء'
        });

        if (rejectNotes === null) return; // ضغط إلغاء

        try {
            const updateData = {
                status: 'rejected',
                reviewed_by: currentUser.id,
                reviewed_at: new Date().toISOString()
            };

            // إضافة سبب الرفض إذا كان موجوداً
            if (rejectNotes && rejectNotes.trim()) {
                updateData.admin_notes = rejectNotes.trim();
            }

            const { error } = await window.sbClient
                .from('membership_applications')
                .update(updateData)
                .eq('id', applicationId);

            if (error) throw error;

            showNotification('تم رفض الطلب', 'success');
            await loadApplicationsReview(currentUser);
        } catch (error) {
            console.error('خطأ في رفض الطلب:', error);
            showNotification('خطأ في رفض الطلب', 'error');
        }
    }

    /**
     * وضع طلب قيد المراجعة
     */
    async function markUnderReview(applicationId) {
        // طلب ملاحظات اختيارية
        const { value: reviewNotes } = await showCustomInput({
            title: 'قيد المراجعة',
            input: 'textarea',
            inputLabel: 'ملاحظات المراجعة (اختياري)',
            inputPlaceholder: 'أضف ملاحظات حول المراجعة...',
            showCancelButton: true,
            confirmButtonText: 'وضع قيد المراجعة',
            cancelButtonText: 'إلغاء'
        });

        if (reviewNotes === null) return; // ضغط إلغاء

        try {
            const updateData = {
                status: 'under_review',
                reviewed_by: currentUser.id,
                reviewed_at: new Date().toISOString(),
                review_notes: reviewNotes && reviewNotes.trim() ? reviewNotes.trim() : null
            };

            const { error } = await window.sbClient
                .from('membership_applications')
                .update(updateData)
                .eq('id', applicationId);

            if (error) throw error;

            showNotification('تم وضع الطلب قيد المراجعة', 'success');
            await loadApplicationsReview(currentUser);
        } catch (error) {
            console.error('خطأ في تحديث الطلب:', error);
            showNotification('خطأ في تحديث حالة الطلب', 'error');
        }
    }

    /**
     * تحميل قسم طلبات العضوية (عرض فقط)
     */
    async function loadApplicationsView() {
        try {
            showLoading(document.getElementById('applicationsViewTable'));
            
            const { data, error } = await window.sbClient
                .from('membership_applications')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            currentApplications = data || [];
            renderApplicationsViewTable();
            await updateViewStatistics();
            bindViewEvents();
        } catch (error) {
            console.error('خطأ في تحميل الطلبات:', error);
            showNotification('خطأ في تحميل طلبات العضوية', 'error');
        }
    }

    /**
     * ربط أحداث قسم العرض
     */
    function bindViewEvents() {
        const searchInput = document.getElementById('applicationSearchInput');
        const committeeFilter = document.getElementById('applicationCommitteeFilter');
        const refreshBtn = document.getElementById('refreshApplicationsBtn');
        const exportBtn = document.getElementById('exportApplicationsBtn');

        if (searchInput) {
            searchInput.removeEventListener('input', renderApplicationsViewTable);
            searchInput.addEventListener('input', renderApplicationsViewTable);
        }
        if (committeeFilter) {
            committeeFilter.removeEventListener('change', renderApplicationsViewTable);
            committeeFilter.addEventListener('change', renderApplicationsViewTable);
        }
        if (refreshBtn) {
            refreshBtn.removeEventListener('click', loadApplicationsView);
            refreshBtn.addEventListener('click', loadApplicationsView);
        }
        if (exportBtn) {
            exportBtn.removeEventListener('click', exportApplications);
            exportBtn.addEventListener('click', exportApplications);
        }
    }

    /**
     * عرض جدول الطلبات (عرض فقط - بدون أزرار إجراءات)
     */
    function renderApplicationsViewTable() {
        const container = document.getElementById('applicationsViewTable');
        const searchInput = document.getElementById('applicationSearchInput');
        const committeeFilter = document.getElementById('applicationCommitteeFilter');
        
        if (!container) return;

        const searchTerm = searchInput?.value.toLowerCase() || '';
        const committeeValue = committeeFilter?.value || '';

        let filtered = currentApplications.filter(app => {
            const matchSearch = !searchTerm || 
                app.full_name.toLowerCase().includes(searchTerm) ||
                app.email.toLowerCase().includes(searchTerm) ||
                (app.phone && app.phone.includes(searchTerm));
            
            const matchCommittee = !committeeValue || app.preferred_committee === committeeValue;

            return matchSearch && matchCommittee;
        });

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-inbox"></i>
                    <p>لا توجد طلبات</p>
                </div>
            `;
            return;
        }

        let html = '<div class="applications-cards-grid">';

        filtered.forEach(app => {
            const statusBadge = getStatusBadge(app.status);
            const date = new Date(app.created_at).toLocaleDateString('ar-SA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            const time = new Date(app.created_at).toLocaleTimeString('ar-SA', {
                hour: '2-digit',
                minute: '2-digit'
            });

            html += `
                <div class="application-card">
                    <div class="application-card-header">
                        <div class="applicant-info">
                            <div class="applicant-avatar">
                                <i class="fa-solid fa-user"></i>
                            </div>
                            <div class="applicant-details">
                                <h3 class="applicant-name">${escapeHtml(app.full_name)}</h3>
                                ${statusBadge}
                            </div>
                        </div>
                    </div>
                    
                    <div class="application-card-body">
                        <div class="application-info-grid">
                            <div class="info-item">
                                <i class="fa-solid fa-envelope"></i>
                                <div class="info-content">
                                    <span class="info-label">البريد الإلكتروني</span>
                                    <span class="info-value">${escapeHtml(app.email)}</span>
                                </div>
                            </div>
                            
                            <div class="info-item">
                                <i class="fa-solid fa-phone"></i>
                                <div class="info-content">
                                    <span class="info-label">رقم الجوال</span>
                                    <span class="info-value">${escapeHtml(app.phone || 'غير متوفر')}</span>
                                </div>
                            </div>
                            
                            <div class="info-item">
                                <i class="fa-solid fa-calendar"></i>
                                <div class="info-content">
                                    <span class="info-label">تاريخ التقديم</span>
                                    <span class="info-value">${date} - ${time}</span>
                                </div>
                            </div>
                            
                            <div class="info-item">
                                <i class="fa-solid fa-users"></i>
                                <div class="info-content">
                                    <span class="info-label">اللجنة المرغوبة</span>
                                    <span class="info-value">${escapeHtml(app.preferred_committee || 'غير محدد')}</span>
                                </div>
                            </div>
                            
                            <div class="info-item">
                                <i class="fa-solid fa-graduation-cap"></i>
                                <div class="info-content">
                                    <span class="info-label">الدرجة العلمية</span>
                                    <span class="info-value">${escapeHtml(app.degree || 'غير محدد')}</span>
                                </div>
                            </div>
                            
                            <div class="info-item full-width">
                                <i class="fa-solid fa-star"></i>
                                <div class="info-content">
                                    <span class="info-label">المهارات</span>
                                    <span class="info-value">${escapeHtml(app.skills || 'غير محدد')}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="application-card-footer">
                        <button class="btn-view-details" onclick="window.membershipManager.viewApplication('${app.id}')">
                            <i class="fa-solid fa-eye"></i>
                            عرض التفاصيل الكاملة
                        </button>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    /**
     * تحديث إحصائيات قسم العرض - عرض إحصائيات اللجان
     */
    async function updateViewStatistics() {
        const statsContainer = document.getElementById('applicationsCommitteesStats');
        if (!statsContainer) return;

        try {
            // جلب جميع اللجان النشطة من قاعدة البيانات
            const { data: committees, error: committeesError } = await window.sbClient
                .from('committees')
                .select('committee_name_ar')
                .eq('is_active', true)
                .order('committee_name_ar', { ascending: true });

            if (committeesError) throw committeesError;

            // حساب مجموع الطلبات
            const totalCount = currentApplications.length;

            // حساب عدد المتقدمين لكل لجنة
            const committeeStats = {};
            
            // تهيئة جميع اللجان بقيمة 0
            if (committees) {
                committees.forEach(committee => {
                    committeeStats[committee.committee_name_ar] = 0;
                });
            }
            
            // حساب عدد المتقدمين الفعلي
            currentApplications.forEach(app => {
                const committee = app.preferred_committee;
                if (committee && committeeStats.hasOwnProperty(committee)) {
                    committeeStats[committee]++;
                }
            });

            // بناء HTML للإحصائيات
            let html = `
                <div class="stat-card">
                    <i class="fa-solid fa-clipboard-list stat-icon" style="color: #3b82f6;"></i>
                    <div class="stat-info">
                        <h3>مجموع الطلبات</h3>
                        <p class="stat-value">${totalCount}</p>
                    </div>
                </div>
            `;

            // إضافة بطاقة لكل لجنة
            const colors = ['#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899'];
            let colorIndex = 0;

            Object.entries(committeeStats).forEach(([committee, count]) => {
                const color = colors[colorIndex % colors.length];
                colorIndex++;
                
                html += `
                    <div class="stat-card">
                        <i class="fa-solid fa-users stat-icon" style="color: ${color};"></i>
                        <div class="stat-info">
                            <h3>${escapeHtml(committee)}</h3>
                            <p class="stat-value">${count}</p>
                        </div>
                    </div>
                `;
            });

            statsContainer.innerHTML = html;
            
            // تحديث فلتر اللجان
            await updateCommitteeFilter('applicationCommitteeFilter');
        } catch (error) {
            console.error('خطأ في تحديث الإحصائيات:', error);
        }
    }

    /**
     * تحميل قسم مراجعة الطلبات (مع الإجراءات)
     */
    async function loadApplicationsReview(user) {
        currentUser = user;
        
        try {
            showLoading(document.getElementById('applicationsReviewTable'));
            
            const { data, error } = await window.sbClient
                .from('membership_applications')
                .select(`
                    *,
                    reviewed_by_user:profiles!reviewed_by(full_name)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            currentApplications = data || [];
            renderApplicationsReviewTable();
            await updateReviewStatistics();
            bindReviewEvents();
        } catch (error) {
            console.error('خطأ في تحميل الطلبات:', error);
            showNotification('خطأ في تحميل طلبات المراجعة', 'error');
        }
    }

    /**
     * عرض جدول المراجعة (مع أزرار الإجراءات)
     */
    function renderApplicationsReviewTable() {
        const container = document.getElementById('applicationsReviewTable');
        const searchInput = document.getElementById('applicationReviewSearchInput');
        const statusFilter = document.getElementById('applicationReviewStatusFilter');
        const committeeFilter = document.getElementById('applicationReviewCommitteeFilter');
        
        if (!container) return;

        const searchTerm = searchInput?.value.toLowerCase() || '';
        const statusValue = statusFilter?.value || '';
        const committeeValue = committeeFilter?.value || '';

        let filtered = currentApplications.filter(app => {
            const matchSearch = !searchTerm || 
                app.full_name.toLowerCase().includes(searchTerm) ||
                app.email.toLowerCase().includes(searchTerm) ||
                (app.phone && app.phone.includes(searchTerm));
            
            const matchStatus = !statusValue || app.status === statusValue;
            const matchCommittee = !committeeValue || app.preferred_committee === committeeValue;

            return matchSearch && matchStatus && matchCommittee;
        });

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-inbox"></i>
                    <p>لا توجد طلبات</p>
                </div>
            `;
            return;
        }

        let html = '<div class="applications-cards-grid">';

        filtered.forEach(app => {
            const statusBadge = getStatusBadge(app.status);
            const date = new Date(app.created_at).toLocaleDateString('ar-SA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            const time = new Date(app.created_at).toLocaleTimeString('ar-SA', {
                hour: '2-digit',
                minute: '2-digit'
            });

            html += `
                <div class="application-card">
                    <div class="application-card-header">
                        <div class="applicant-info">
                            <div class="applicant-avatar">
                                <i class="fa-solid fa-user"></i>
                            </div>
                            <div class="applicant-details">
                                <h3 class="applicant-name">${escapeHtml(app.full_name)}</h3>
                                ${statusBadge}
                            </div>
                        </div>
                    </div>
                    
                    <div class="application-card-body">
                        <div class="application-info-grid">
                            <div class="info-item">
                                <i class="fa-solid fa-envelope"></i>
                                <div class="info-content">
                                    <span class="info-label">البريد الإلكتروني</span>
                                    <span class="info-value">${escapeHtml(app.email)}</span>
                                </div>
                            </div>
                            
                            <div class="info-item">
                                <i class="fa-solid fa-phone"></i>
                                <div class="info-content">
                                    <span class="info-label">رقم الجوال</span>
                                    <span class="info-value">${escapeHtml(app.phone || 'غير متوفر')}</span>
                                </div>
                            </div>
                            
                            <div class="info-item">
                                <i class="fa-solid fa-calendar"></i>
                                <div class="info-content">
                                    <span class="info-label">تاريخ التقديم</span>
                                    <span class="info-value">${date} - ${time}</span>
                                </div>
                            </div>
                            
                            <div class="info-item">
                                <i class="fa-solid fa-users"></i>
                                <div class="info-content">
                                    <span class="info-label">اللجنة المرغوبة</span>
                                    <span class="info-value">${escapeHtml(app.preferred_committee || 'غير محدد')}</span>
                                </div>
                            </div>
                            
                            <div class="info-item">
                                <i class="fa-solid fa-graduation-cap"></i>
                                <div class="info-content">
                                    <span class="info-label">الدرجة العلمية</span>
                                    <span class="info-value">${escapeHtml(app.degree || 'غير محدد')}</span>
                                </div>
                            </div>
                            
                            <div class="info-item full-width">
                                <i class="fa-solid fa-star"></i>
                                <div class="info-content">
                                    <span class="info-label">المهارات</span>
                                    <span class="info-value">${escapeHtml(app.skills || 'غير محدد')}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="application-card-footer">
                        <div class="card-actions-grid">
                            <button class="btn-action btn-action-primary" onclick="window.membershipManager.viewApplication('${app.id}')">
                                <i class="fa-solid fa-eye"></i>
                                عرض التفاصيل
                            </button>
                            ${app.status === 'new' || app.status === 'under_review' ? `
                                <button class="btn-action btn-action-success" onclick="window.membershipManager.approveForInterview('${app.id}')">
                                    <i class="fa-solid fa-check"></i>
                                    قبول للمقابلة
                                </button>
                                <button class="btn-action btn-action-warning" onclick="window.membershipManager.markUnderReview('${app.id}')">
                                    <i class="fa-solid fa-clock"></i>
                                    قيد المراجعة
                                </button>
                                <button class="btn-action btn-action-danger" onclick="window.membershipManager.rejectApplication('${app.id}')">
                                    <i class="fa-solid fa-times"></i>
                                    رفض
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    /**
     * تحديث إحصائيات قسم المراجعة - عرض 4 كروت فقط
     */
    async function updateReviewStatistics() {
        const statsContainer = document.getElementById('applicationsReviewCommitteesStats');
        if (!statsContainer) return;

        try {
            // حساب الإحصائيات حسب الحالة
            const totalCount = currentApplications.length;
            const approvedForInterviewCount = currentApplications.filter(a => a.status === 'approved_for_interview').length;
            const rejectedCount = currentApplications.filter(a => a.status === 'rejected').length;
            const underReviewCount = currentApplications.filter(a => a.status === 'under_review').length;

            // بناء HTML للإحصائيات
            const html = `
                <div class="stat-card">
                    <i class="fa-solid fa-clipboard-list stat-icon" style="color: #3b82f6;"></i>
                    <div class="stat-info">
                        <h3>إجمالي الطلبات</h3>
                        <p class="stat-value">${totalCount}</p>
                    </div>
                </div>
                <div class="stat-card">
                    <i class="fa-solid fa-check-circle stat-icon" style="color: #10b981;"></i>
                    <div class="stat-info">
                        <h3>المقبولين للمقابلة</h3>
                        <p class="stat-value">${approvedForInterviewCount}</p>
                    </div>
                </div>
                <div class="stat-card">
                    <i class="fa-solid fa-times-circle stat-icon" style="color: #ef4444;"></i>
                    <div class="stat-info">
                        <h3>المرفوضين</h3>
                        <p class="stat-value">${rejectedCount}</p>
                    </div>
                </div>
                <div class="stat-card">
                    <i class="fa-solid fa-clock stat-icon" style="color: #f59e0b;"></i>
                    <div class="stat-info">
                        <h3>قيد المراجعة</h3>
                        <p class="stat-value">${underReviewCount}</p>
                    </div>
                </div>
            `;

            statsContainer.innerHTML = html;
            
            // تحديث فلتر اللجان
            await updateCommitteeFilter('applicationReviewCommitteeFilter');
        } catch (error) {
            console.error('خطأ في تحديث الإحصاإيات:', error);
        }
    }

    /**
     * ربط أحداث قسم المراجعة
     */
    function bindReviewEvents() {
        const searchInput = document.getElementById('applicationReviewSearchInput');
        const statusFilter = document.getElementById('applicationReviewStatusFilter');
        const committeeFilter = document.getElementById('applicationReviewCommitteeFilter');
        const refreshBtn = document.getElementById('refreshApplicationsReviewBtn');
        const exportBtn = document.getElementById('exportApplicationsReviewBtn');

        if (searchInput) {
            searchInput.removeEventListener('input', renderApplicationsReviewTable);
            searchInput.addEventListener('input', renderApplicationsReviewTable);
        }
        if (statusFilter) {
            statusFilter.removeEventListener('change', renderApplicationsReviewTable);
            statusFilter.addEventListener('change', renderApplicationsReviewTable);
        }
        if (committeeFilter) {
            committeeFilter.removeEventListener('change', renderApplicationsReviewTable);
            committeeFilter.addEventListener('change', renderApplicationsReviewTable);
        }
        if (refreshBtn) {
            refreshBtn.removeEventListener('click', loadApplicationsReview);
            refreshBtn.addEventListener('click', () => loadApplicationsReview(currentUser));
        }
        if (exportBtn) {
            exportBtn.removeEventListener('click', exportApplications);
            exportBtn.addEventListener('click', exportApplications);
        }
    }

    /**
     * تحميل قسم الأرشيف
     */
    async function loadArchives() {
        try {
            const container = document.getElementById('archivesContainer');
            if (!container) return;

            showLoading(container);

            const { data, error } = await window.sbClient
                .from('membership_registration_archives')
                .select(`
                    *,
                    created_by_user:profiles!created_by(full_name)
                `)
                .order('closed_at', { ascending: false });

            if (error) throw error;

            renderArchives(data || []);
            updateArchivesStatistics(data || []);
            bindArchivesEvents();
        } catch (error) {
            console.error('خطأ في تحميل الأرشيف:', error);
            showNotification('خطأ في تحميل الأرشيف', 'error');
        }
    }

    /**
     * عرض الأرشيفات
     */
    function renderArchives(archives) {
        const container = document.getElementById('archivesContainer');
        if (!container) return;

        if (archives.length === 0) {
            container.innerHTML = `
                <div class="card">
                    <div class="card-body" style="text-align: center; padding: 3rem; color: #64748b;">
                        <i class="fa-solid fa-box-open" style="font-size: 4rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                        <p style="font-size: 1.1rem; margin-bottom: 0.5rem;">لا توجد أرشيفات</p>
                        <p style="font-size: 0.9rem;">سيتم إنشاء أرشيف تلقائياً عند إغلاق باب التسجيل</p>
                    </div>
                </div>
            `;
            return;
        }

        let html = '';
        archives.forEach(archive => {
            const openedDate = new Date(archive.opened_at).toLocaleDateString('ar-SA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            const closedDate = new Date(archive.closed_at).toLocaleDateString('ar-SA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const acceptanceRate = archive.total_applications > 0 
                ? ((archive.accepted_applications / archive.total_applications) * 100).toFixed(1)
                : 0;

            html += `
                <div class="card" style="margin-bottom: 1.5rem;">
                    <div class="card-header">
                        <h3>
                            <i class="fa-solid fa-folder"></i>
                            ${escapeHtml(archive.archive_name)}
                        </h3>
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="btn-sm btn-primary" onclick="window.membershipManager.viewArchive('${archive.id}')">
                                <i class="fa-solid fa-eye"></i>
                                عرض التفاصيل
                            </button>
                            <button class="btn-sm btn-success" onclick="window.membershipManager.downloadArchive('${archive.id}')">
                                <i class="fa-solid fa-download"></i>
                                تحميل
                            </button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem;">
                            <div>
                                <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 0.25rem;">الفترة</p>
                                <p style="font-weight: 600;">${openedDate} - ${closedDate}</p>
                            </div>
                            <div>
                                <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 0.25rem;">إجمالي الطلبات</p>
                                <p style="font-weight: 600; color: #3b82f6;">${archive.total_applications}</p>
                            </div>
                            <div>
                                <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 0.25rem;">مقبولة</p>
                                <p style="font-weight: 600; color: #10b981;">${archive.accepted_applications}</p>
                            </div>
                            <div>
                                <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 0.25rem;">مرفوضة</p>
                                <p style="font-weight: 600; color: #ef4444;">${archive.rejected_applications}</p>
                            </div>
                            <div>
                                <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 0.25rem;">معدل القبول</p>
                                <p style="font-weight: 600; color: #8b5cf6;">${acceptanceRate}%</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    /**
     * تحديث إحصائيات الأرشيف
     */
    function updateArchivesStatistics(archives) {
        const totalArchives = archives.length;
        const totalApplications = archives.reduce((sum, a) => sum + a.total_applications, 0);
        const totalAccepted = archives.reduce((sum, a) => sum + a.accepted_applications, 0);
        const avgAcceptanceRate = totalApplications > 0 
            ? ((totalAccepted / totalApplications) * 100).toFixed(1)
            : 0;

        const lastArchive = archives[0];
        const lastPeriod = lastArchive 
            ? `${new Date(lastArchive.opened_at).toLocaleDateString('ar-SA', { month: 'short', year: 'numeric' })}`
            : '-';

        const totalEl = document.getElementById('totalArchivesCount');
        const applicationsEl = document.getElementById('totalArchivedApplicationsCount');
        const periodEl = document.getElementById('lastArchivePeriod');
        const rateEl = document.getElementById('averageAcceptanceRate');

        if (totalEl) totalEl.textContent = totalArchives;
        if (applicationsEl) applicationsEl.textContent = totalApplications;
        if (periodEl) periodEl.textContent = lastPeriod;
        if (rateEl) rateEl.textContent = `${avgAcceptanceRate}%`;
    }

    /**
     * عرض تفاصيل أرشيف
     */
    async function viewArchive(archiveId) {
        try {
            const { data, error } = await window.sbClient
                .from('membership_registration_archives')
                .select('*')
                .eq('id', archiveId)
                .single();

            if (error) throw error;

            const openedDate = new Date(data.opened_at).toLocaleDateString('ar-SA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            const closedDate = new Date(data.closed_at).toLocaleDateString('ar-SA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            // بناء قائمة اللجان
            let committeesHtml = '';
            if (data.committees_data && data.committees_data.length > 0) {
                committeesHtml = `
                    <div class="detail-section">
                        <div class="detail-section-header">
                            <i class="fa-solid fa-users"></i>
                            <h3>توزيع الطلبات حسب اللجان</h3>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                `;
                data.committees_data.forEach(committee => {
                    committeesHtml += `
                        <div style="padding: 1rem; background: #f8fafc; border-radius: 8px; border-right: 3px solid var(--accent-blue);">
                            <div style="font-weight: 600; margin-bottom: 0.5rem; color: var(--text-dark);">
                                <i class="fa-solid fa-users" style="color: var(--accent-blue); margin-left: 0.5rem;"></i>
                                ${escapeHtml(committee.committee_name)}
                            </div>
                            <div style="display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.875rem;">
                                <span><i class="fa-solid fa-file" style="color: #64748b;"></i> ${committee.total_applications} طلب</span>
                                <span><i class="fa-solid fa-check" style="color: #10b981;"></i> ${committee.accepted} مقبول</span>
                                <span><i class="fa-solid fa-times" style="color: #ef4444;"></i> ${committee.rejected} مرفوض</span>
                                <span><i class="fa-solid fa-clock" style="color: #f59e0b;"></i> ${committee.pending} معلق</span>
                            </div>
                        </div>
                    `;
                });
                committeesHtml += '</div></div>';
            }

            // بناء محتوى النافذة المنبثقة
            const contentHtml = `
                <!-- معلومات الأرشيف -->
                <div class="detail-section">
                    <div class="detail-section-header">
                        <i class="fa-solid fa-box-archive"></i>
                        <h3>معلومات الأرشيف</h3>
                    </div>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <div class="detail-label">
                                <i class="fa-solid fa-tag"></i>
                                اسم الأرشيف
                            </div>
                            <div class="detail-value"><strong>${escapeHtml(data.archive_name)}</strong></div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">
                                <i class="fa-solid fa-hourglass"></i>
                                المدة
                            </div>
                            <div class="detail-value">${data.statistics?.duration_days || 0} يوم</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">
                                <i class="fa-solid fa-calendar-plus"></i>
                                تاريخ الفتح
                            </div>
                            <div class="detail-value">${openedDate}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">
                                <i class="fa-solid fa-calendar-xmark"></i>
                                تاريخ الإغلاق
                            </div>
                            <div class="detail-value">${closedDate}</div>
                        </div>
                    </div>
                </div>

                <!-- إحصائيات الطلبات -->
                <div class="detail-section">
                    <div class="detail-section-header">
                        <i class="fa-solid fa-chart-pie"></i>
                        <h3>إحصائيات الطلبات</h3>
                    </div>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <div class="detail-label">
                                <i class="fa-solid fa-file-lines"></i>
                                إجمالي الطلبات
                            </div>
                            <div class="detail-value"><strong>${data.total_applications}</strong></div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">
                                <i class="fa-solid fa-file-circle-plus"></i>
                                طلبات جديدة
                            </div>
                            <div class="detail-value">${data.new_applications}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">
                                <i class="fa-solid fa-file-pen"></i>
                                قيد المراجعة
                            </div>
                            <div class="detail-value">${data.under_review_applications}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">
                                <i class="fa-solid fa-file-circle-check"></i>
                                مقبولة
                            </div>
                            <div class="detail-value" style="color: #10b981; font-weight: 600;">${data.accepted_applications}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">
                                <i class="fa-solid fa-file-circle-xmark"></i>
                                مرفوضة
                            </div>
                            <div class="detail-value" style="color: #ef4444; font-weight: 600;">${data.rejected_applications}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">
                                <i class="fa-solid fa-box"></i>
                                مؤرشفة
                            </div>
                            <div class="detail-value">${data.archived_applications}</div>
                        </div>
                    </div>
                </div>

                <!-- المعدلات والمتوسطات -->
                <div class="detail-section">
                    <div class="detail-section-header">
                        <i class="fa-solid fa-chart-line"></i>
                        <h3>المعدلات والمتوسطات</h3>
                    </div>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <div class="detail-label">
                                <i class="fa-solid fa-percent"></i>
                                معدل القبول
                            </div>
                            <div class="detail-value" style="color: #10b981; font-weight: 600;">${data.statistics?.acceptance_rate || 0}%</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">
                                <i class="fa-solid fa-percent"></i>
                                معدل الرفض
                            </div>
                            <div class="detail-value" style="color: #ef4444; font-weight: 600;">${data.statistics?.rejection_rate || 0}%</div>
                        </div>
                        <div class="detail-item full-width">
                            <div class="detail-label">
                                <i class="fa-solid fa-calendar-day"></i>
                                متوسط الطلبات يومياً
                            </div>
                            <div class="detail-value">${data.statistics?.average_applications_per_day || 0}</div>
                        </div>
                    </div>
                </div>

                ${committeesHtml}
            `;

            // عرض النافذة المنبثقة
            document.getElementById('applicationDetailsContent').innerHTML = contentHtml;
            document.getElementById('applicationDetailsActions').innerHTML = '';
            window.setModalTitle(data.archive_name);
            window.openApplicationModal();

        } catch (error) {
            console.error('خطأ في عرض الأرشيف:', error);
            showNotification('خطأ في عرض تفاصيل الأرشيف', 'error');
        }
    }

    /**
     * تحميل أرشيف كملف JSON
     */
    async function downloadArchive(archiveId) {
        try {
            const { data, error } = await window.sbClient
                .from('membership_registration_archives')
                .select('*')
                .eq('id', archiveId)
                .single();

            if (error) throw error;

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `archive_${data.archive_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
            link.click();

            showNotification('تم تحميل الأرشيف بنجاح', 'success');
        } catch (error) {
            console.error('خطأ في تحميل الأرشيف:', error);
            showNotification('خطأ في تحميل الأرشيف', 'error');
        }
    }

    /**
     * إنشاء أرشيف يدوي
     */
    async function createManualArchive() {
        const result = await Swal.fire({
            title: 'إنشاء أرشيف يدوي',
            text: 'سيتم إنشاء أرشيف لجميع الطلبات من آخر أرشيف حتى الآن',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'إنشاء',
            cancelButtonText: 'إلغاء'
        });

        if (!result.isConfirmed) return;

        try {
            const { data, error } = await window.sbClient.rpc('create_membership_archive');

            if (error) throw error;

            showNotification('تم إنشاء الأرشيف بنجاح', 'success');
            await loadArchives();
        } catch (error) {
            console.error('خطأ في إنشاء الأرشيف:', error);
            showNotification('خطأ في إنشاء الأرشيف', 'error');
        }
    }

    /**
     * ربط أحداث قسم الأرشيف
     */
    function bindArchivesEvents() {
        const createBtn = document.getElementById('createManualArchiveBtn');
        const refreshBtn = document.getElementById('refreshArchivesBtn');

        if (createBtn) {
            createBtn.removeEventListener('click', createManualArchive);
            createBtn.addEventListener('click', createManualArchive);
        }
        if (refreshBtn) {
            refreshBtn.removeEventListener('click', loadArchives);
            refreshBtn.addEventListener('click', loadArchives);
        }
    }

    /**
     * تحميل قسم المقابلات
     */
    async function loadInterviews() {
        try {
            const container = document.getElementById('interviewsTable');
            if (!container) return;

            showLoading(container);

            // جلب المقابلات المجدولة فقط (status = 'scheduled')
            const { data: scheduledData, error: scheduledError } = await window.sbClient
                .from('membership_interviews')
                .select(`
                    *,
                    application:membership_applications(id, full_name, email, phone, preferred_committee),
                    interviewer:profiles!interviewer_id(full_name),
                    decided_by_user:profiles!decided_by(full_name)
                `)
                .eq('status', 'scheduled')
                .order('interview_date', { ascending: true });

            if (scheduledError) throw scheduledError;

            // جلب عدد الطلبات المقبولة للمقابلة بدون مقابلات مجدولة (غير مجدولة)
            const { data: approvedApps, error: approvedError } = await window.sbClient
                .from('membership_applications')
                .select('id')
                .eq('status', 'approved_for_interview');

            if (approvedError) throw approvedError;

            const { data: existingInterviews, error: interviewsError } = await window.sbClient
                .from('membership_interviews')
                .select('application_id');

            if (interviewsError) throw interviewsError;

            const existingAppIds = new Set(existingInterviews?.map(i => i.application_id) || []);
            const unscheduledCount = approvedApps?.filter(app => !existingAppIds.has(app.id)).length || 0;

            // حفظ البيانات في cache للاستخدام في الفلترة المحلية
            if (container) {
                container._cachedInterviews = scheduledData || [];
            }
            
            renderInterviewsTable(scheduledData || []);
            updateInterviewsStatistics(scheduledData || [], unscheduledCount);
            bindInterviewsEvents();
        } catch (error) {
            console.error('خطأ في تحميل المقابلات:', error);
            showNotification('خطأ في تحميل المقابلات', 'error');
        }
    }

    /**
     * عرض جدول المقابلات
     */
    function renderInterviewsTable(interviews) {
        const container = document.getElementById('interviewsTable');
        const searchInput = document.getElementById('interviewsSearchInput');
        const sortFilter = document.getElementById('interviewsSortFilter');

        if (!container) return;

        const searchTerm = searchInput?.value.toLowerCase() || '';
        const sortValue = sortFilter?.value || 'nearest';

        // فلترة حسب البحث
        let filtered = interviews.filter(interview => {
            const matchSearch = !searchTerm || 
                interview.application?.full_name.toLowerCase().includes(searchTerm) ||
                interview.application?.email.toLowerCase().includes(searchTerm);
            return matchSearch;
        });

        // ترتيب حسب التاريخ
        filtered.sort((a, b) => {
            const dateA = new Date(a.interview_date);
            const dateB = new Date(b.interview_date);
            return sortValue === 'nearest' ? dateA - dateB : dateB - dateA;
        });

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-inbox"></i>
                    <p>لا توجد مقابلات</p>
                </div>
            `;
            return;
        }

        let html = '<div class="applications-cards-grid">';

        filtered.forEach(interview => {
            const date = new Date(interview.interview_date).toLocaleDateString('ar-SA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const time = new Date(interview.interview_date).toLocaleTimeString('ar-SA', {
                hour: '2-digit',
                minute: '2-digit'
            });

            const statusBadge = getInterviewStatusBadge(interview.status);
            const resultBadge = getInterviewResultBadge(interview.result);
            const typeBadge = getInterviewTypeBadge(interview.interview_type);

            const typeIcons = {
                'online': 'fa-video',
                'in_person': 'fa-building',
                'phone': 'fa-phone'
            };

            html += `
                <div class="application-card">
                    <div class="application-card-header">
                        <div class="applicant-info">
                            <div class="applicant-avatar">
                                <i class="fa-solid ${typeIcons[interview.interview_type] || 'fa-user-tie'}"></i>
                            </div>
                            <div class="applicant-details">
                                <h3 class="applicant-name">${escapeHtml(interview.application?.full_name || 'غير محدد')}</h3>
                                <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                                    ${statusBadge}
                                    ${resultBadge}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="application-card-body">
                        <div class="application-info-grid">
                            <div class="info-item">
                                <i class="fa-solid fa-envelope"></i>
                                <div class="info-content">
                                    <span class="info-label">البريد الإلكتروني</span>
                                    <span class="info-value">${escapeHtml(interview.application?.email || 'غير متوفر')}</span>
                                </div>
                            </div>
                            
                            <div class="info-item">
                                <i class="fa-solid fa-phone"></i>
                                <div class="info-content">
                                    <span class="info-label">رقم الجوال</span>
                                    <span class="info-value">${escapeHtml(interview.application?.phone || 'غير متوفر')}</span>
                                </div>
                            </div>
                            
                            <div class="info-item">
                                <i class="fa-solid fa-users"></i>
                                <div class="info-content">
                                    <span class="info-label">اللجنة المرغوبة</span>
                                    <span class="info-value">${escapeHtml(interview.application?.preferred_committee || 'غير محدد')}</span>
                                </div>
                            </div>
                            
                            <div class="info-item">
                                <i class="fa-solid fa-calendar-day"></i>
                                <div class="info-content">
                                    <span class="info-label">تاريخ المقابلة</span>
                                    <span class="info-value">${date} - ${time}</span>
                                </div>
                            </div>
                            
                            <div class="info-item">
                                <i class="fa-solid ${typeIcons[interview.interview_type] || 'fa-handshake'}"></i>
                                <div class="info-content">
                                    <span class="info-label">نوع المقابلة</span>
                                    <span class="info-value">${typeBadge}</span>
                                </div>
                            </div>
                            
                            ${interview.location ? `
                                <div class="info-item">
                                    <i class="fa-solid fa-location-dot"></i>
                                    <div class="info-content">
                                        <span class="info-label">الموقع</span>
                                        <span class="info-value">${escapeHtml(interview.location)}</span>
                                    </div>
                                </div>
                            ` : ''}
                            
                            ${interview.meeting_link ? `
                                <div class="info-item full-width">
                                    <i class="fa-solid fa-link"></i>
                                    <div class="info-content">
                                        <span class="info-label">رابط المقابلة</span>
                                        <a href="${escapeHtml(interview.meeting_link)}" target="_blank" class="info-value" style="color: var(--accent-blue); text-decoration: underline;">
                                            فتح الرابط
                                        </a>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="application-card-footer">
                        <div class="card-actions-grid">
                            <button class="btn-action btn-action-primary" onclick="window.membershipManager.viewInterview('${interview.id}')">
                                <i class="fa-solid fa-eye"></i>
                                عرض التفاصيل
                            </button>
                            ${interview.result === 'pending' || !interview.result ? `
                                <button class="btn-action btn-action-success" onclick="window.membershipManager.acceptInterview('${interview.id}')">
                                    <i class="fa-solid fa-check"></i>
                                    قبول
                                </button>
                                <button class="btn-action btn-action-danger" onclick="window.membershipManager.rejectInterview('${interview.id}')">
                                    <i class="fa-solid fa-times"></i>
                                    رفض
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    /**
     * تحديث إحصائيات المقابلات
     */
    function updateInterviewsStatistics(interviews, unscheduledCount) {
        const scheduled = interviews.length;

        const scheduledEl = document.getElementById('scheduledInterviewsCount');
        const unscheduledEl = document.getElementById('unscheduledInterviewsCount');

        if (scheduledEl) scheduledEl.textContent = scheduled;
        if (unscheduledEl) unscheduledEl.textContent = unscheduledCount || 0;
    }

    /**
     * عرض تفاصيل مقابلة
     */
    async function viewInterview(interviewId) {
        try {
            const { data, error } = await window.sbClient
                .from('membership_interviews')
                .select(`
                    *,
                    application:membership_applications(*),
                    interviewer:profiles!interviewer_id(full_name),
                    decided_by_user:profiles!decided_by(full_name)
                `)
                .eq('id', interviewId)
                .single();

            if (error) throw error;

            const interviewDate = new Date(data.interview_date).toLocaleDateString('ar-SA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const interviewTime = new Date(data.interview_date).toLocaleTimeString('ar-SA', {
                hour: '2-digit',
                minute: '2-digit'
            });

            const statusBadge = getInterviewStatusBadge(data.status);
            const resultBadge = getInterviewResultBadge(data.result);
            const typeBadge = getInterviewTypeBadge(data.interview_type);

            // بناء محتوى النافذة المنبثقة
            const contentHtml = `
                <!-- معلومات المتقدم -->
                <div class="detail-section">
                    <div class="detail-section-header">
                        <i class="fa-solid fa-user"></i>
                        <h3>معلومات المتقدم</h3>
                    </div>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <div class="detail-label">
                                <i class="fa-solid fa-id-card"></i>
                                الاسم الكامل
                            </div>
                            <div class="detail-value">${escapeHtml(data.application.full_name)}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">
                                <i class="fa-solid fa-envelope"></i>
                                البريد الإلكتروني
                            </div>
                            <div class="detail-value">${escapeHtml(data.application.email)}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">
                                <i class="fa-solid fa-phone"></i>
                                رقم الهاتف
                            </div>
                            <div class="detail-value">${escapeHtml(data.application.phone || 'غير متوفر')}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">
                                <i class="fa-solid fa-users"></i>
                                اللجنة المرغوبة
                            </div>
                            <div class="detail-value">${escapeHtml(data.application.preferred_committee)}</div>
                        </div>
                    </div>
                </div>

                <!-- معلومات المقابلة -->
                <div class="detail-section">
                    <div class="detail-section-header">
                        <i class="fa-solid fa-calendar-days"></i>
                        <h3>معلومات المقابلة</h3>
                    </div>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <div class="detail-label">
                                <i class="fa-solid fa-calendar-check"></i>
                                تاريخ المقابلة
                            </div>
                            <div class="detail-value">${interviewDate}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">
                                <i class="fa-solid fa-clock"></i>
                                وقت المقابلة
                            </div>
                            <div class="detail-value">${interviewTime}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">
                                <i class="fa-solid fa-video"></i>
                                نوع المقابلة
                            </div>
                            <div class="detail-value">${typeBadge}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">
                                <i class="fa-solid fa-location-dot"></i>
                                الموقع
                            </div>
                            <div class="detail-value">${escapeHtml(data.interview_location || 'غير محدد')}</div>
                        </div>
                        ${data.meeting_link ? `
                            <div class="detail-item full-width">
                                <div class="detail-label">
                                    <i class="fa-solid fa-link"></i>
                                    رابط الاجتماع
                                </div>
                                <div class="detail-value">
                                    <a href="${escapeHtml(data.meeting_link)}" target="_blank">${escapeHtml(data.meeting_link)}</a>
                                </div>
                            </div>
                        ` : ''}
                        <div class="detail-item">
                            <div class="detail-label">
                                <i class="fa-solid fa-flag"></i>
                                الحالة
                            </div>
                            <div class="detail-value">${statusBadge}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">
                                <i class="fa-solid fa-check-circle"></i>
                                النتيجة
                            </div>
                            <div class="detail-value">${resultBadge}</div>
                        </div>
                        ${data.interviewer ? `
                            <div class="detail-item full-width">
                                <div class="detail-label">
                                    <i class="fa-solid fa-user-tie"></i>
                                    المقابل
                                </div>
                                <div class="detail-value">${escapeHtml(data.interviewer.full_name)}</div>
                            </div>
                        ` : ''}
                    </div>
                </div>

                ${data.interviewer_notes ? `
                    <div class="detail-section">
                        <div class="detail-section-header">
                            <i class="fa-solid fa-comment-dots"></i>
                            <h3>ملاحظات المقابل</h3>
                        </div>
                        <div class="detail-value long-text">${escapeHtml(data.interviewer_notes)}</div>
                    </div>
                ` : ''}

                ${(data.application.review_notes || data.application.admin_notes) ? `
                    <div class="detail-section">
                        <div class="detail-section-header">
                            <i class="fa-solid fa-clipboard-list"></i>
                            <h3>ملاحظات مرحلة مراجعة الطلبات</h3>
                        </div>
                        <div class="admin-notes-container">
                            ${data.application.review_notes ? `
                                <div class="admin-note review-note">
                                    <div class="note-header">
                                        <i class="fa-solid fa-eye"></i>
                                        <strong>ملاحظات قيد المراجعة</strong>
                                    </div>
                                    <div class="note-content">${escapeHtml(data.application.review_notes)}</div>
                                </div>
                            ` : ''}
                            ${data.application.admin_notes ? `
                                <div class="admin-note ${data.application.status === 'approved_for_interview' ? 'accept-note' : data.application.status === 'rejected' ? 'reject-note' : ''}">
                                    <div class="note-header">
                                        <i class="fa-solid fa-${data.application.status === 'approved_for_interview' ? 'check-circle' : data.application.status === 'rejected' ? 'times-circle' : 'note-sticky'}"></i>
                                        <strong>${data.application.status === 'approved_for_interview' ? 'ملاحظات القبول للمقابلة' : data.application.status === 'rejected' ? 'سبب الرفض' : 'ملاحظات إدارية'}</strong>
                                    </div>
                                    <div class="note-content">${escapeHtml(data.application.admin_notes)}</div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                ` : ''}

                ${data.result_notes ? `
                    <div class="detail-section">
                        <div class="detail-section-header">
                            <i class="fa-solid fa-note-sticky"></i>
                            <h3>ملاحظات نتيجة المقابلة</h3>
                        </div>
                        <div class="admin-notes-container">
                            <div class="admin-note ${data.result === 'accepted' ? 'accept-note' : data.result === 'rejected' ? 'reject-note' : ''}">
                                <div class="note-header">
                                    <i class="fa-solid fa-${data.result === 'accepted' ? 'check-circle' : data.result === 'rejected' ? 'times-circle' : 'note-sticky'}"></i>
                                    <strong>${data.result === 'accepted' ? 'ملاحظات قبول المقابلة' : data.result === 'rejected' ? 'سبب رفض المقابلة' : 'ملاحظات النتيجة'}</strong>
                                </div>
                                <div class="note-content">${escapeHtml(data.result_notes)}</div>
                            </div>
                        </div>
                    </div>
                ` : ''}
            `;

            // بناء أزرار الإجراءات
            let actionsHtml = '';
            if (data.result === 'pending' || data.result === null) {
                actionsHtml = `
                    <button class="modal-btn modal-btn-primary" onclick="window.membershipManager.acceptInterview('${data.id}'); window.closeApplicationModal();">
                        <i class="fa-solid fa-check"></i>
                        قبول المتقدم
                    </button>
                    <button class="modal-btn modal-btn-danger" onclick="window.membershipManager.rejectInterview('${data.id}'); window.closeApplicationModal();">
                        <i class="fa-solid fa-times"></i>
                        رفض المتقدم
                    </button>
                `;
            }

            // عرض النافذة المنبثقة
            document.getElementById('applicationDetailsContent').innerHTML = contentHtml;
            document.getElementById('applicationDetailsActions').innerHTML = actionsHtml;
            window.setModalTitle('تفاصيل المقابلة');
            window.openApplicationModal();

        } catch (error) {
            console.error('خطأ في عرض المقابلة:', error);
            showNotification('خطأ في عرض تفاصيل المقابلة', 'error');
        }
    }

    /**
     * قبول مقابلة
     */
    async function acceptInterview(interviewId) {
        // التأكد من وجود المستخدم الحالي
        if (!currentUser) {
            const { data: { user } } = await window.sbClient.auth.getUser();
            if (!user) {
                showNotification('يجب تسجيل الدخول أولاً', 'error');
                return;
            }
            currentUser = user;
        }

        const { value: notes } = await showCustomInput({
            title: 'قبول المتقدم',
            input: 'textarea',
            inputLabel: 'ملاحظات القبول (اختياري)',
            inputPlaceholder: 'أضف ملاحظات حول قبول المتقدم في المقابلة...',
            showCancelButton: true,
            confirmButtonText: 'قبول',
            cancelButtonText: 'إلغاء'
        });

        if (notes === null) return;

        try {
            // تحديث حالة المقابلة
            const { data: interview, error: interviewError } = await window.sbClient
                .from('membership_interviews')
                .update({
                    result: 'accepted',
                    result_notes: notes || null,
                    decided_by: currentUser.id,
                    decided_at: new Date().toISOString(),
                    status: 'completed'
                })
                .eq('id', interviewId)
                .select('application_id')
                .single();

            if (interviewError) throw interviewError;

            // الحصول على بيانات الطلب
            const { data: application, error: appError } = await window.sbClient
                .from('membership_applications')
                .select('*')
                .eq('id', interview.application_id)
                .single();

            if (appError) throw appError;

            // إضافة إلى جدول المقبولين
            const { error: acceptedError } = await window.sbClient
                .from('membership_accepted_members')
                .insert({
                    application_id: application.id,
                    interview_id: interviewId,
                    full_name: application.full_name,
                    email: application.email,
                    phone: application.phone,
                    assigned_committee: application.preferred_committee,
                    added_by: currentUser.id
                });

            if (acceptedError) throw acceptedError;

            showNotification('تم قبول المتقدم بنجاح', 'success');
            await loadInterviews();
        } catch (error) {
            console.error('خطأ في قبول المقابلة:', error);
            showNotification('خطأ في قبول المتقدم', 'error');
        }
    }

    /**
     * رفض مقابلة
     */
    async function rejectInterview(interviewId) {
        // التأكد من وجود المستخدم الحالي
        if (!currentUser) {
            const { data: { user } } = await window.sbClient.auth.getUser();
            if (!user) {
                showNotification('يجب تسجيل الدخول أولاً', 'error');
                return;
            }
            currentUser = user;
        }

        const { value: notes } = await showCustomInput({
            title: 'رفض المتقدم',
            input: 'textarea',
            inputLabel: 'سبب الرفض (اختياري)',
            inputPlaceholder: 'أضف سبب رفض المتقدم في المقابلة...',
            showCancelButton: true,
            confirmButtonText: 'رفض',
            cancelButtonText: 'إلغاء'
        });

        if (notes === null) return;

        try {
            const updateData = {
                result: 'rejected',
                decided_by: currentUser.id,
                decided_at: new Date().toISOString(),
                status: 'completed'
            };

            // إضافة سبب الرفض إذا كان موجوداً
            if (notes && notes.trim()) {
                updateData.result_notes = notes.trim();
            }

            const { error } = await window.sbClient
                .from('membership_interviews')
                .update(updateData)
                .eq('id', interviewId);

            if (error) throw error;

            showNotification('تم رفض المتقدم', 'success');
            await loadInterviews();
        } catch (error) {
            console.error('خطأ في رفض المقابلة:', error);
            showNotification('خطأ في رفض المتقدم', 'error');
        }
    }

    /**
     * جدولة مقابلة جديدة
     */
    async function scheduleNewInterview() {
        try {
            // التأكد من وجود المستخدم الحالي
            if (!currentUser) {
                const { data: { user } } = await window.sbClient.auth.getUser();
                if (!user) {
                    showNotification('يجب تسجيل الدخول أولاً', 'error');
                    return;
                }
                currentUser = user;
            }

            // الحصول على الطلبات المقبولة للمقابلة
            const { data: applications, error: appsError } = await window.sbClient
                .from('membership_applications')
                .select('id, full_name, email, preferred_committee')
                .eq('status', 'approved_for_interview');

            if (appsError) throw appsError;

            // الحصول على المقابلات الموجودة
            const { data: existingInterviews, error: interviewsError } = await window.sbClient
                .from('membership_interviews')
                .select('application_id');

            if (interviewsError) throw interviewsError;

            // استثناء الطلبات التي لها مقابلات
            const existingAppIds = new Set(existingInterviews?.map(i => i.application_id) || []);
            const availableApps = applications?.filter(app => !existingAppIds.has(app.id)) || [];

            if (availableApps.length === 0) {
                showNotification('لا توجد طلبات مقبولة للمقابلة بدون مقابلات مجدولة', 'info');
                return;
            }

            const applicationsOptions = availableApps.map(app => 
                `<option value="${app.id}">${app.full_name} - ${app.preferred_committee}</option>`
            ).join('');

            const result = await showCustomConfirm({
                title: 'جدولة مقابلة جديدة',
                html: `
                    <div style="text-align: right;">
                        <div class="form-group">
                            <label>المتقدم</label>
                            <select id="swal-application" style="width: 100%; padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 8px;">
                                ${applicationsOptions}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>تاريخ ووقت المقابلة</label>
                            <input type="datetime-local" id="swal-date" style="width: 100%; padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 8px;">
                        </div>
                        <div class="form-group">
                            <label>نوع المقابلة</label>
                            <select id="swal-type" style="width: 100%; padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 8px;">
                                <option value="in_person">حضوري</option>
                                <option value="online">أونلاين</option>
                                <option value="phone">هاتفي</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>الموقع/الرابط</label>
                            <input type="text" id="swal-location" placeholder="الموقع أو رابط الاجتماع" style="width: 100%; padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 8px;">
                        </div>
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: 'جدولة',
                cancelButtonText: 'إلغاء',
                preConfirm: () => {
                    const applicationId = document.getElementById('swal-application').value;
                    const date = document.getElementById('swal-date').value;

                    if (!applicationId || !date) {
                        showNotification('يرجى ملء جميع الحقول المطلوبة', 'error');
                        return false;
                    }
                    return true;
                }
            });

            if (!result.isConfirmed) return;

            const applicationId = document.getElementById('swal-application').value;
            const date = document.getElementById('swal-date').value;
            const type = document.getElementById('swal-type').value;
            const location = document.getElementById('swal-location').value;
            
            const formValues = { applicationId, date, type, location };

            const { error: insertError } = await window.sbClient
                .from('membership_interviews')
                .insert({
                    application_id: formValues.applicationId,
                    interview_date: new Date(formValues.date).toISOString(),
                    interview_type: formValues.type,
                    interview_location: formValues.location || null,
                    meeting_link: formValues.type === 'online' ? formValues.location : null,
                    created_by: currentUser.id,
                    status: 'scheduled',
                    result: 'pending'
                });

            if (insertError) throw insertError;

            showNotification('تم جدولة المقابلة بنجاح', 'success');
            await loadInterviews();
        } catch (error) {
            console.error('خطأ في جدولة المقابلة:', error);
            showNotification('خطأ في جدولة المقابلة', 'error');
        }
    }

    /**
     * ربط أحداث قسم المقابلات
     */
    function bindInterviewsEvents() {
        const scheduleBtn = document.getElementById('scheduleNewInterviewBtn');
        const searchInput = document.getElementById('interviewsSearchInput');
        const sortFilter = document.getElementById('interviewsSortFilter');
        const refreshBtn = document.getElementById('refreshInterviewsBtn');

        if (scheduleBtn) {
            scheduleBtn.removeEventListener('click', scheduleNewInterview);
            scheduleBtn.addEventListener('click', scheduleNewInterview);
        }
        
        // استخدام renderInterviewsTable بدلاً من loadInterviews للفلاتر المحلية
        if (searchInput) {
            searchInput.removeEventListener('input', () => {});
            searchInput.addEventListener('input', () => {
                const container = document.getElementById('interviewsTable');
                if (container && container._cachedInterviews) {
                    renderInterviewsTable(container._cachedInterviews);
                }
            });
        }
        
        if (sortFilter) {
            sortFilter.removeEventListener('change', () => {});
            sortFilter.addEventListener('change', () => {
                const container = document.getElementById('interviewsTable');
                if (container && container._cachedInterviews) {
                    renderInterviewsTable(container._cachedInterviews);
                }
            });
        }
        
        if (refreshBtn) {
            refreshBtn.removeEventListener('click', loadInterviews);
            refreshBtn.addEventListener('click', loadInterviews);
        }
    }

    /**
     * تحميل قسم المقبولين
     */
    async function loadAcceptedMembers() {
        try {
            const container = document.getElementById('acceptedMembersTable');
            if (!container) return;

            showLoading(container);

            const { data, error } = await window.sbClient
                .from('membership_accepted_members')
                .select(`
                    *,
                    application:membership_applications(id),
                    interview:membership_interviews(id, interview_date),
                    added_by_user:profiles!added_by(full_name)
                `)
                .order('join_date', { ascending: false });

            if (error) throw error;

            renderAcceptedMembersTable(data || []);
            updateAcceptedStatistics(data || []);
            bindAcceptedEvents();
        } catch (error) {
            console.error('خطأ في تحميل المقبولين:', error);
            showNotification('خطأ في تحميل المقبولين', 'error');
        }
    }

    /**
     * عرض جدول المقبولين
     */
    function renderAcceptedMembersTable(members) {
        const container = document.getElementById('acceptedMembersTable');
        const searchInput = document.getElementById('acceptedSearchInput');
        const statusFilter = document.getElementById('acceptedStatusFilter');
        const committeeFilter = document.getElementById('acceptedCommitteeFilter');

        if (!container) return;

        const searchTerm = searchInput?.value.toLowerCase() || '';
        const statusValue = statusFilter?.value || '';
        const committeeValue = committeeFilter?.value || '';

        let filtered = members.filter(member => {
            const matchSearch = !searchTerm || 
                member.full_name.toLowerCase().includes(searchTerm) ||
                member.email.toLowerCase().includes(searchTerm) ||
                (member.member_number && member.member_number.toLowerCase().includes(searchTerm));
            
            const matchStatus = !statusValue || member.status === statusValue;
            const matchCommittee = !committeeValue || member.assigned_committee === committeeValue;

            return matchSearch && matchStatus && matchCommittee;
        });

        if (filtered.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">لا يوجد أعضاء مقبولين</p>';
            return;
        }

        let html = `
            <table>
                <thead>
                    <tr>
                        <th>رقم العضوية</th>
                        <th>الاسم</th>
                        <th>البريد الإلكتروني</th>
                        <th>اللجنة</th>
                        <th>تاريخ الانضمام</th>
                        <th>الحالة</th>
                        <th>الإجراءات</th>
                    </tr>
                </thead>
                <tbody>
        `;

        filtered.forEach(member => {
            const joinDate = new Date(member.join_date).toLocaleDateString('ar-SA', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });

            const statusBadge = getMemberStatusBadge(member.status);

            html += `
                <tr>
                    <td><strong>${escapeHtml(member.member_number)}</strong></td>
                    <td>${escapeHtml(member.full_name)}</td>
                    <td>${escapeHtml(member.email)}</td>
                    <td>${escapeHtml(member.assigned_committee)}</td>
                    <td>${joinDate}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <button class="btn-sm btn-primary" onclick="window.membershipManager.viewAcceptedMember('${member.id}')">
                            <i class="fa-solid fa-eye"></i>
                            عرض
                        </button>
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    }

    /**
     * تحديث إحصائيات المقبولين
     */
    function updateAcceptedStatistics(members) {
        const total = members.length;
        const active = members.filter(m => m.status === 'active').length;
        const inactive = members.filter(m => m.status === 'inactive').length;
        
        const thisMonth = members.filter(m => {
            const joinDate = new Date(m.join_date);
            const now = new Date();
            return joinDate.getMonth() === now.getMonth() && 
                   joinDate.getFullYear() === now.getFullYear();
        }).length;

        const totalEl = document.getElementById('totalAcceptedCount');
        const activeEl = document.getElementById('activeAcceptedCount');
        const inactiveEl = document.getElementById('inactiveAcceptedCount');
        const thisMonthEl = document.getElementById('thisMonthAcceptedCount');

        if (totalEl) totalEl.textContent = total;
        if (activeEl) activeEl.textContent = active;
        if (inactiveEl) inactiveEl.textContent = inactive;
        if (thisMonthEl) thisMonthEl.textContent = thisMonth;
    }

    /**
     * عرض تفاصيل عضو مقبول
     */
    async function viewAcceptedMember(memberId) {
        try {
            const { data, error } = await window.sbClient
                .from('membership_accepted_members')
                .select(`
                    *,
                    application:membership_applications(*),
                    interview:membership_interviews(*),
                    added_by_user:profiles!added_by(full_name)
                `)
                .eq('id', memberId)
                .single();

            if (error) throw error;

            const joinDate = new Date(data.join_date).toLocaleDateString('ar-SA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const joinTime = new Date(data.join_date).toLocaleTimeString('ar-SA', {
                hour: '2-digit',
                minute: '2-digit'
            });

            const statusBadge = getMemberStatusBadge(data.status);

            // بناء محتوى النافذة المنبثقة
            const contentHtml = `
                <!-- معلومات العضوية -->
                <div class="detail-section">
                    <div class="detail-section-header">
                        <i class="fa-solid fa-id-badge"></i>
                        <h3>معلومات العضوية</h3>
                    </div>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <div class="detail-label">
                                <i class="fa-solid fa-hashtag"></i>
                                رقم العضوية
                            </div>
                            <div class="detail-value"><strong>${escapeHtml(data.member_number)}</strong></div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">
                                <i class="fa-solid fa-calendar-check"></i>
                                تاريخ الانضمام
                            </div>
                            <div class="detail-value">${joinDate} - ${joinTime}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">
                                <i class="fa-solid fa-users"></i>
                                اللجنة المعينة
                            </div>
                            <div class="detail-value">${escapeHtml(data.assigned_committee)}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">
                                <i class="fa-solid fa-flag"></i>
                                الحالة
                            </div>
                            <div class="detail-value">${statusBadge}</div>
                        </div>
                    </div>
                </div>

                <!-- المعلومات الشخصية -->
                <div class="detail-section">
                    <div class="detail-section-header">
                        <i class="fa-solid fa-user"></i>
                        <h3>المعلومات الشخصية</h3>
                    </div>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <div class="detail-label">
                                <i class="fa-solid fa-id-card"></i>
                                الاسم الكامل
                            </div>
                            <div class="detail-value">${escapeHtml(data.full_name)}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">
                                <i class="fa-solid fa-envelope"></i>
                                البريد الإلكتروني
                            </div>
                            <div class="detail-value">${escapeHtml(data.email)}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">
                                <i class="fa-solid fa-phone"></i>
                                رقم الهاتف
                            </div>
                            <div class="detail-value">${escapeHtml(data.phone || 'غير متوفر')}</div>
                        </div>
                        ${data.added_by_user ? `
                            <div class="detail-item">
                                <div class="detail-label">
                                    <i class="fa-solid fa-user-plus"></i>
                                    أضيف بواسطة
                                </div>
                                <div class="detail-value">${escapeHtml(data.added_by_user.full_name)}</div>
                            </div>
                        ` : ''}
                    </div>
                </div>

                ${data.notes ? `
                    <div class="detail-section">
                        <div class="detail-section-header">
                            <i class="fa-solid fa-note-sticky"></i>
                            <h3>ملاحظات</h3>
                        </div>
                        <div class="detail-value long-text">${escapeHtml(data.notes)}</div>
                    </div>
                ` : ''}
            `;

            // عرض النافذة المنبثقة
            document.getElementById('applicationDetailsContent').innerHTML = contentHtml;
            document.getElementById('applicationDetailsActions').innerHTML = '';
            window.setModalTitle('تفاصيل العضو');
            window.openApplicationModal();

        } catch (error) {
            console.error('خطأ في عرض العضو:', error);
            showNotification('خطأ في عرض تفاصيل العضو', 'error');
        }
    }

    /**
     * ربط أحداث قسم المقبولين
     */
    function bindAcceptedEvents() {
        const searchInput = document.getElementById('acceptedSearchInput');
        const statusFilter = document.getElementById('acceptedStatusFilter');
        const committeeFilter = document.getElementById('acceptedCommitteeFilter');
        const refreshBtn = document.getElementById('refreshAcceptedBtn');
        const exportBtn = document.getElementById('exportAcceptedBtn');

        if (searchInput) searchInput.addEventListener('input', loadAcceptedMembers);
        if (statusFilter) statusFilter.addEventListener('change', loadAcceptedMembers);
        if (committeeFilter) committeeFilter.addEventListener('change', loadAcceptedMembers);
        if (refreshBtn) refreshBtn.addEventListener('click', loadAcceptedMembers);
        if (exportBtn) exportBtn.addEventListener('click', exportAcceptedMembers);
    }

    /**
     * تصدير المقبولين
     */
    function exportAcceptedMembers() {
        // TODO: تطبيق تصدير CSV
        showNotification('جاري تطوير ميزة التصدير', 'info');
    }

    /**
     * دوال مساعدة للحصول على Badges
     */
    function getInterviewStatusBadge(status) {
        const badges = {
            'scheduled': '<span class="badge badge-primary">مجدولة</span>',
            'completed': '<span class="badge badge-success">مكتملة</span>',
            'cancelled': '<span class="badge badge-danger">ملغاة</span>',
            'rescheduled': '<span class="badge badge-warning">معاد جدولتها</span>'
        };
        return badges[status] || '<span class="badge badge-secondary">-</span>';
    }

    function getInterviewResultBadge(result) {
        const badges = {
            'pending': '<span class="badge badge-warning">معلقة</span>',
            'accepted': '<span class="badge badge-success">مقبول</span>',
            'rejected': '<span class="badge badge-danger">مرفوض</span>',
            'no_show': '<span class="badge badge-secondary">لم يحضر</span>'
        };
        return badges[result] || '<span class="badge badge-secondary">-</span>';
    }

    function getInterviewTypeBadge(type) {
        const badges = {
            'in_person': '<span class="badge badge-info">حضوري</span>',
            'online': '<span class="badge badge-primary">أونلاين</span>',
            'phone': '<span class="badge badge-secondary">هاتفي</span>'
        };
        return badges[type] || '<span class="badge badge-secondary">-</span>';
    }

    function getMemberStatusBadge(status) {
        const badges = {
            'active': '<span class="badge badge-success">نشط</span>',
            'inactive': '<span class="badge badge-secondary">غير نشط</span>',
            'suspended': '<span class="badge badge-warning">معلق</span>',
            'terminated': '<span class="badge badge-danger">منتهي</span>'
        };
        return badges[status] || '<span class="badge badge-secondary">-</span>';
    }

    /**
     * تحديث فلتر اللجان ديناميكياً من اللجان الفعلية
     */
    async function updateCommitteeFilter(filterId) {
        const filterElement = document.getElementById(filterId);
        if (!filterElement) return;

        try {
            // جلب اللجان من قاعدة البيانات
            const { data, error } = await window.sbClient
                .from('committees')
                .select('committee_name_ar')
                .eq('is_active', true)
                .order('committee_name_ar', { ascending: true });

            if (error) throw error;

            // الحفاظ على القيمة المحددة حالياً
            const currentValue = filterElement.value;

            // إعادة بناء الخيارات
            let optionsHtml = '<option value="">جميع اللجان</option>';
            
            if (data && data.length > 0) {
                data.forEach(committee => {
                    optionsHtml += `<option value="${escapeHtml(committee.committee_name_ar)}">${escapeHtml(committee.committee_name_ar)}</option>`;
                });
            }

            filterElement.innerHTML = optionsHtml;

            // استعادة القيمة المحددة إذا كانت موجودة
            if (currentValue) {
                filterElement.value = currentValue;
            }
        } catch (error) {
            console.error('خطأ في تحديث فلتر اللجان:', error);
        }
    }

    /**
     * نافذة تأكيد مخصصة (بديل لـ Swal.fire)
     */
    function showCustomConfirm(options) {
        return new Promise((resolve) => {
            const modal = document.getElementById('confirmModal');
            const title = document.getElementById('confirmModalTitle');
            const content = document.getElementById('confirmModalContent');
            const actions = document.getElementById('confirmModalActions');

            title.textContent = options.title || 'تأكيد';
            
            if (options.html) {
                content.innerHTML = options.html;
            } else {
                content.innerHTML = `<p style="text-align: center; margin: 1rem 0;">${options.text || ''}</p>`;
            }

            // بناء الأزرار
            let buttonsHtml = '';
            
            if (options.showCancelButton !== false) {
                buttonsHtml += `
                    <button class="btn-outline" id="customCancelBtn">
                        ${options.cancelButtonText || 'إلغاء'}
                    </button>
                `;
            }

            if (options.showDenyButton) {
                buttonsHtml += `
                    <button class="btn-outline" id="customDenyBtn" style="background: #6b7280; color: white;">
                        ${options.denyButtonText || 'لا'}
                    </button>
                `;
            }

            buttonsHtml += `
                <button class="btn-primary" id="customConfirmBtn">
                    ${options.confirmButtonText || 'تأكيد'}
                </button>
            `;

            actions.innerHTML = buttonsHtml;

            // إظهار النافذة
            modal.classList.add('active');
            document.getElementById('overlay').classList.add('active');

            // ربط الأحداث
            const confirmBtn = document.getElementById('customConfirmBtn');
            const cancelBtn = document.getElementById('customCancelBtn');
            const denyBtn = document.getElementById('customDenyBtn');

            const closeModal = () => {
                modal.classList.remove('active');
                document.getElementById('overlay').classList.remove('active');
            };

            if (confirmBtn) {
                confirmBtn.onclick = () => {
                    if (options.preConfirm) {
                        const result = options.preConfirm();
                        if (result === false) return;
                    }
                    closeModal();
                    resolve({ isConfirmed: true, value: true });
                };
            }

            if (cancelBtn) {
                cancelBtn.onclick = () => {
                    closeModal();
                    resolve({ isDismissed: true });
                };
            }

            if (denyBtn) {
                denyBtn.onclick = () => {
                    closeModal();
                    resolve({ isDenied: true });
                };
            }
        });
    }

    /**
     * نافذة إدخال نص مخصصة (بديل لـ Swal.fire مع input)
     */
    function showCustomInput(options) {
        return new Promise((resolve) => {
            const modal = document.getElementById('confirmModal');
            const title = document.getElementById('confirmModalTitle');
            const content = document.getElementById('confirmModalContent');
            const actions = document.getElementById('confirmModalActions');

            title.textContent = options.title || '';
            
            let inputHtml = '';
            if (options.input === 'textarea') {
                inputHtml = `
                    <div style="text-align: right; margin: 1rem 0;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">
                            ${options.inputLabel || ''}
                        </label>
                        <textarea 
                            id="customInputField" 
                            placeholder="${options.inputPlaceholder || ''}"
                            style="width: 100%; min-height: 100px; padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 8px; font-family: inherit; resize: vertical;"
                        ></textarea>
                    </div>
                `;
            } else {
                inputHtml = `
                    <div style="text-align: right; margin: 1rem 0;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">
                            ${options.inputLabel || ''}
                        </label>
                        <input 
                            type="text" 
                            id="customInputField" 
                            placeholder="${options.inputPlaceholder || ''}"
                            style="width: 100%; padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 8px; font-family: inherit;"
                        />
                    </div>
                `;
            }

            content.innerHTML = inputHtml;

            actions.innerHTML = `
                <button class="btn-outline" id="customCancelBtn">
                    ${options.cancelButtonText || 'إلغاء'}
                </button>
                <button class="btn-primary" id="customConfirmBtn">
                    ${options.confirmButtonText || 'تأكيد'}
                </button>
            `;

            modal.classList.add('active');
            document.getElementById('overlay').classList.add('active');

            const inputField = document.getElementById('customInputField');
            const confirmBtn = document.getElementById('customConfirmBtn');
            const cancelBtn = document.getElementById('customCancelBtn');

            const closeModal = () => {
                modal.classList.remove('active');
                document.getElementById('overlay').classList.remove('active');
            };

            confirmBtn.onclick = () => {
                const value = inputField.value.trim();
                if (options.inputValidator && !value) {
                    showNotification(options.inputValidator(), 'error');
                    return;
                }
                closeModal();
                resolve({ value });
            };

            cancelBtn.onclick = () => {
                closeModal();
                resolve({ value: null });
            };

            // التركيز على حقل الإدخال
            setTimeout(() => inputField.focus(), 100);
        });
    }

    // تصدير الوظائف العامة
    window.membershipManager = {
        init: initMembershipManager,
        viewApplication: viewApplication,
        approveForInterview: approveForInterview,
        rejectApplication: rejectApplication,
        markUnderReview: markUnderReview,
        toggleCommitteeAvailability: toggleCommitteeAvailability,
        updateMaxApplicants: updateMaxApplicants,
        moveCommittee: moveCommittee,
        removeCommittee: removeCommittee,
        loadApplicationsView: loadApplicationsView,
        loadApplicationsReview: loadApplicationsReview,
        loadArchives: loadArchives,
        viewArchive: viewArchive,
        downloadArchive: downloadArchive,
        loadInterviews: loadInterviews,
        viewInterview: viewInterview,
        acceptInterview: acceptInterview,
        rejectInterview: rejectInterview,
        loadAcceptedMembers: loadAcceptedMembers,
        viewAcceptedMember: viewAcceptedMember
    };

})();

// ============================================================================
// دوال التحكم في النافذة المنبثقة المخصصة
// ============================================================================

/**
 * تحديث عنوان النافذة المنبثقة
 */
window.setModalTitle = function(title) {
    const titleElement = document.querySelector('#applicationDetailsModal .custom-modal-title');
    if (titleElement) {
        titleElement.innerHTML = `<i class="fa-solid fa-file-lines"></i>${title}`;
    }
};

/**
 * فتح النافذة المنبثقة لتفاصيل الطلب
 */
window.openApplicationModal = function() {
    const modal = document.getElementById('applicationDetailsModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // إغلاق عند النقر على الخلفية
        const overlay = modal.querySelector('.custom-modal-overlay');
        overlay.onclick = function() {
            window.closeApplicationModal();
        };
        
        // إغلاق عند الضغط على ESC
        document.addEventListener('keydown', handleEscapeKey);
    }
};

/**
 * إغلاق النافذة المنبثقة
 */
window.closeApplicationModal = function() {
    const modal = document.getElementById('applicationDetailsModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleEscapeKey);
    }
};

/**
 * معالج الضغط على زر ESC
 */
function handleEscapeKey(event) {
    if (event.key === 'Escape') {
        window.closeApplicationModal();
    }
}
