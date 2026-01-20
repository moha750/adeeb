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

        // تحميل الطلبات
        await loadApplications();

        // ربط الأحداث
        bindEvents();

        // تحديث الإحصائيات
        updateStatistics();
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
            const settings = {
                join_open: joinOpenToggle.checked,
                join_membership_countdown: countdownToggle.checked,
                join_schedule_enabled: scheduleToggle.checked,
                join_schedule_mode: scheduleMode.value,
                join_schedule_open_at: scheduleOpenAt.value ? new Date(scheduleOpenAt.value).toISOString() : null,
                join_schedule_close_at: scheduleCloseAt.value ? new Date(scheduleCloseAt.value).toISOString() : null,
                updated_by: currentUser.id
            };

            const { error } = await window.sbClient
                .from('membership_settings')
                .update(settings)
                .eq('id', 'default');

            if (error) throw error;

            currentSettings = { ...currentSettings, ...settings };
            showNotification('تم حفظ الإعدادات بنجاح', 'success');
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

        const result = await Swal.fire({
            title: 'تأكيد الحذف',
            text: 'هل أنت متأكد من حذف هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'نعم، احذف',
            cancelButtonText: 'إلغاء',
            confirmButtonColor: '#ef4444'
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

        // البحث والفلترة
        applicationSearchInput.addEventListener('input', renderApplicationsTable);
        applicationStatusFilter.addEventListener('change', renderApplicationsTable);
        applicationCommitteeFilter.addEventListener('change', renderApplicationsTable);
        refreshApplicationsBtn.addEventListener('click', loadApplications);
        exportApplicationsBtn.addEventListener('click', exportApplications);

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
        const icon = type === 'success' ? 'success' : type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'info';
        Swal.fire({
            text: message,
            icon: icon,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true
        });
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
        const result = await Swal.fire({
            title: 'تأكيد الإزالة',
            text: 'هل تريد إزالة هذه اللجنة من قائمة اللجان المتاحة للتسجيل؟',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'نعم، إزالة',
            cancelButtonText: 'إلغاء',
            confirmButtonColor: '#ef4444'
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

    // تصدير الوظائف العامة
    window.membershipManager = {
        init: initMembershipManager,
        viewApplication: viewApplication,
        toggleCommitteeAvailability: toggleCommitteeAvailability,
        updateMaxApplicants: updateMaxApplicants,
        moveCommittee: moveCommittee,
        removeCommittee: removeCommittee
    };

})();
