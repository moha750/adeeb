/**
 * مدير العضوية - إدارة طلبات التسجيل والتحكم في باب التسجيل
 */

(function() {
    'use strict';

    let currentApplications = [];
    let barzakhApplications = [];
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
    const cycleTitleInput = document.getElementById('cycleTitleInput');

    const applicationSearchInput = document.getElementById('applicationSearchInput');
    const applicationStatusFilter = document.getElementById('applicationStatusFilter');
    const applicationCommitteeFilter = document.getElementById('applicationCommitteeFilter');
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
                join_schedule_close_at: null,
                cycle_title: null
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

        if (cycleTitleInput) {
            cycleTitleInput.value = currentSettings.cycle_title || '';
        }

        updateScheduleVisibility();
        updateHeroUI(currentSettings.join_open);
        updateStatCards();
    }

    /**
     * تحديث بطاقات الإحصائيات
     */
    function updateStatCards() {
        const openDateEl = document.getElementById('regStatOpenDate');
        const closeDateEl = document.getElementById('regStatCloseDate');
        if (!currentSettings) return;

        const formatOpts = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };

        if (currentSettings.join_schedule_open_at && openDateEl) {
            openDateEl.textContent = new Date(currentSettings.join_schedule_open_at).toLocaleDateString('ar-SA', formatOpts);
        } else if (openDateEl) {
            openDateEl.textContent = 'غير محدد';
        }

        if (currentSettings.join_schedule_close_at && closeDateEl) {
            closeDateEl.textContent = new Date(currentSettings.join_schedule_close_at).toLocaleDateString('ar-SA', formatOpts);
        } else if (closeDateEl) {
            closeDateEl.textContent = 'غير محدد';
        }
    }

    /**
     * تحديث بطاقة التحكم الرئيسية حسب حالة الباب
     */
    function updateHeroUI(isOpen) {
        const heroCard  = document.getElementById('regDoorHero');
        const header    = document.getElementById('regDoorStatusPill');
        const label     = document.getElementById('regDoorStatusLabel');
        const togLabel  = document.getElementById('regDoorToggleLabel');
        const togText   = document.getElementById('regDoorToggleText');
        const icon      = document.getElementById('regDoorIcon');
        const cycleNameBadge = document.getElementById('regDoorCycleName');
        const cycleNameText  = document.getElementById('regDoorCycleNameText');
        const cycleTitleSection = document.getElementById('cycleTitleSection');

        if (!header || !label) return;

        const cycleTitle = currentSettings?.cycle_title || '';

        if (isOpen) {
            heroCard.className = 'uc-card uc-card--success';
            header.className = 'uc-card__header uc-card__header--success';
            label.textContent = 'باب التسجيل مفتوح حالياً';
            if (icon) icon.className = 'fa-solid fa-door-open';
            if (togLabel) togLabel.innerHTML = '<i class="fa-solid fa-circle" style="color:#34d399;font-size:0.5rem;"></i> الباب مفتوح';
            if (togText) togText.textContent = 'مفتوح';
            // عرض اسم الدورة وإخفاء حقل الإدخال
            if (cycleNameBadge && cycleTitle) {
                cycleNameText.textContent = cycleTitle;
                cycleNameBadge.style.display = 'inline-flex';
            }
            if (cycleTitleSection) cycleTitleSection.style.display = 'none';
        } else {
            heroCard.className = 'uc-card uc-card--danger';
            header.className = 'uc-card__header uc-card__header--danger';
            label.textContent = 'باب التسجيل مغلق حالياً';
            if (icon) icon.className = 'fa-solid fa-door-closed';
            if (togLabel) togLabel.innerHTML = '<i class="fa-solid fa-circle" style="color:#fca5a5;font-size:0.5rem;"></i> الباب مغلق';
            if (togText) togText.textContent = 'مغلق';
            // إخفاء اسم الدورة وإظهار حقل الإدخال
            if (cycleNameBadge) cycleNameBadge.style.display = 'none';
            if (cycleTitleSection) cycleTitleSection.style.display = '';
        }
    }

    /**
     * تحديث رؤية إعدادات الجدولة (دائماً مرئية)
     */
    function updateScheduleVisibility() {
        // الجدولة دائماً مفعّلة ونمطها range
    }

    /**
     * حفظ إعدادات التسجيل
     */
    async function saveMembershipSettingsHandler() {
        try {
            const isOpening = joinOpenToggle.checked;
            const cycleTitle = cycleTitleInput ? cycleTitleInput.value.trim() : '';

            // منع فتح الباب بدون عنوان الدورة
            if (isOpening && !cycleTitle) {
                showNotification('يجب كتابة عنوان الدورة قبل فتح باب التسجيل', 'error');
                joinOpenToggle.checked = false;
                return;
            }

            const settings = {
                join_open: isOpening,
                join_membership_countdown: true,
                join_schedule_enabled: true,
                join_schedule_mode: 'range',
                join_schedule_open_at: scheduleOpenAt.value ? new Date(scheduleOpenAt.value).toISOString() : null,
                join_schedule_close_at: scheduleCloseAt.value ? new Date(scheduleCloseAt.value).toISOString() : null,
                cycle_title: isOpening ? cycleTitle : null,
                updated_by: currentUser.id
            };

            const { error } = await window.sbClient
                .from('membership_settings')
                .update(settings)
                .eq('id', 'default');

            if (error) throw error;

            updateHeroUI(settings.join_open);
            currentSettings = { ...currentSettings, ...settings };
            updateStatCards();
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
                        <button class=" btn-primary" onclick="window.membershipManager.viewApplication('${app.id}')">
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
        applicationDetailStatus.innerHTML = getStatusBadge(app.status);
        
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

        // استخراج القيم المتوفرة من البيانات الحالية
        const committees = [...new Set(currentApplications.map(a => a.preferred_committee).filter(Boolean))].sort();

        const allStatuses = [
            { value: 'new', label: 'جديد' },
            { value: 'approved_for_interview', label: 'مقبول للمقابلة' },
            { value: 'rejected', label: 'مرفوض' }
        ];

        const committeeCheckboxes = committees.map(c => `
            <label class="form-checkbox">
                <input type="checkbox" value="${escapeHtml(c)}" data-export-committee>
                <span class="form-checkbox-label">${escapeHtml(c)}</span>
            </label>
        `).join('');
        const statusOpts = allStatuses.map(s => `<option value="${escapeHtml(s.value)}">${escapeHtml(s.label)}</option>`).join('');

        const allColumns = [
            { key: 'full_name', label: 'الاسم', checked: true },
            { key: 'email', label: 'البريد الإلكتروني', checked: true },
            { key: 'phone', label: 'الهاتف', checked: true },
            { key: 'degree', label: 'الدرجة', checked: false },
            { key: 'college', label: 'الكلية', checked: false },
            { key: 'major', label: 'التخصص', checked: false },
            { key: 'skills', label: 'المهارات', checked: false },
            { key: 'preferred_committee', label: 'اللجنة المرغوبة', checked: true },
            { key: 'status', label: 'الحالة', checked: true },
            { key: 'created_at', label: 'تاريخ التقديم', checked: true }
        ];

        const columnsHtml = allColumns.map(col => `
            <label class="form-checkbox">
                <input type="checkbox" value="${col.key}" data-export-column ${col.checked ? 'checked' : ''}>
                <span class="form-checkbox-label">${col.label}</span>
            </label>
        `).join('');

        const formHtml = `
            <div class="modal-form-grid">
                <div class="form-group full-width">
                    <label class="form-label"><span class="label-icon"><i class="fa-solid fa-users-between-lines"></i></span> اللجان</label>
                    <div class="export-columns-grid" id="exportCommitteeCheckboxes">
                        ${committeeCheckboxes}
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label"><span class="label-icon"><i class="fa-solid fa-filter"></i></span> الحالة</label>
                    <select id="exportStatusFilter" class="form-select">
                        <option value="">جميع الحالات</option>
                        ${statusOpts}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label"><span class="label-icon"><i class="fa-solid fa-calendar-days"></i></span> الفترة الزمنية</label>
                    <select id="exportDateRange" class="form-select">
                        <option value="">الكل</option>
                        <option value="7">آخر 7 أيام</option>
                        <option value="30">آخر 30 يوم</option>
                        <option value="90">آخر 3 أشهر</option>
                    </select>
                </div>
                <div class="form-group full-width">
                    <label class="form-label"><span class="label-icon"><i class="fa-solid fa-table-columns"></i></span> الأعمدة المطلوبة</label>
                    <div class="export-columns-grid">
                        ${columnsHtml}
                    </div>
                </div>
                <div class="form-group full-width" id="exportPreviewCount">
                    <small><i class="fa-solid fa-circle-info"></i> سيتم تصدير <strong>${currentApplications.length}</strong> طلب</small>
                </div>
            </div>
        `;

        const footer = `
            <button class="btn btn-outline" onclick="closeModal()">
                <i class="fa-solid fa-times"></i> إلغاء
            </button>
            <button class="btn btn-primary" id="exportConfirmBtn">
                <i class="fa-solid fa-file-export"></i> تصدير CSV
            </button>
        `;

        openModal('تصدير طلبات العضوية', formHtml, {
            icon: 'fa-file-export',
            footer: footer,
            size: 'md',
            onOpen: () => {
                const committeeContainer = document.getElementById('exportCommitteeCheckboxes');
                const statusEl = document.getElementById('exportStatusFilter');
                const dateEl = document.getElementById('exportDateRange');
                const previewEl = document.getElementById('exportPreviewCount');

                function getSelectedCommittees() {
                    return Array.from(committeeContainer.querySelectorAll('input[data-export-committee]:checked')).map(cb => cb.value);
                }

                function getFilteredData() {
                    const selectedCommittees = getSelectedCommittees();
                    const status = statusEl.value;
                    const days = dateEl.value;

                    return currentApplications.filter(app => {
                        if (selectedCommittees.length > 0 && !selectedCommittees.includes(app.preferred_committee)) return false;
                        if (status && app.status !== status) return false;
                        if (days) {
                            const cutoff = new Date();
                            cutoff.setDate(cutoff.getDate() - parseInt(days));
                            if (new Date(app.created_at) < cutoff) return false;
                        }
                        return true;
                    });
                }

                function updatePreview() {
                    const count = getFilteredData().length;
                    previewEl.innerHTML = `<small><i class="fa-solid fa-circle-info"></i> سيتم تصدير <strong>${count}</strong> طلب</small>`;
                }

                committeeContainer.addEventListener('change', updatePreview);
                [statusEl, dateEl].forEach(el => {
                    el.addEventListener('change', updatePreview);
                });

                document.getElementById('exportConfirmBtn').addEventListener('click', () => {
                    const filtered = getFilteredData();
                    if (filtered.length === 0) {
                        showNotification('لا توجد بيانات مطابقة للتصدير', 'warning');
                        return;
                    }

                    const checkboxes = document.querySelectorAll('.export-columns-grid input[type="checkbox"][data-export-column]:checked');
                    const selectedKeys = Array.from(checkboxes).map(cb => cb.value);

                    if (selectedKeys.length === 0) {
                        showNotification('يرجى اختيار عمود واحد على الأقل', 'warning');
                        return;
                    }

                    const columnMap = {
                        full_name: { header: 'الاسم', get: a => a.full_name },
                        email: { header: 'البريد الإلكتروني', get: a => a.email },
                        phone: { header: 'الهاتف', get: a => a.phone || '' },
                        degree: { header: 'الدرجة', get: a => a.degree || '' },
                        college: { header: 'الكلية', get: a => a.college || '' },
                        major: { header: 'التخصص', get: a => a.major || '' },
                        skills: { header: 'المهارات', get: a => a.skills || '' },
                        preferred_committee: { header: 'اللجنة المرغوبة', get: a => a.preferred_committee || '' },
                        status: { header: 'الحالة', get: a => getStatusText(a.status) },
                        created_at: { header: 'تاريخ التقديم', get: a => new Date(a.created_at).toLocaleDateString('ar-SA') }
                    };

                    const headers = selectedKeys.map(k => columnMap[k].header);
                    const rows = filtered.map(app => selectedKeys.map(k => columnMap[k].get(app)));

                    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
                    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = `membership_applications_${new Date().toISOString().split('T')[0]}.csv`;
                    a.click();

                    closeModal();
                    showNotification(`تم تصدير ${filtered.length} طلب بنجاح`, 'success');
                });
            }
        });
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
        if (joinOpenToggle) joinOpenToggle.addEventListener('change', () => updateHeroUI(joinOpenToggle.checked));
        if (saveMembershipSettings) saveMembershipSettings.addEventListener('click', saveMembershipSettingsHandler);

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
        const statusConfig = {
            'new': { label: 'جديد', icon: 'fa-solid fa-user-plus' },
            'under_review': { label: 'قيد المراجعة', icon: 'fa-hourglass-half' },
            'approved_for_interview': { label: 'مقبول للمقابلة', icon: 'fa-calendar-check' },
            'accepted': { label: 'مقبول', icon: 'fa-circle-check' },
            'rejected': { label: 'مرفوض', icon: 'fa-circle-xmark' },
            'archived': { label: 'مؤرشف', icon: 'fa-box-archive' }
        };
        const cfg = statusConfig[status] || { label: status, icon: 'fa-circle-question' };
        return `<span class="uc-card__badge"><i class="fa-solid ${cfg.icon}"></i> ${cfg.label}</span>`;
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

    function getStatusHeaderClass(status) {
        const headerMap = {
            'new':                    'uc-card__header--purple',
            'under_review':           'uc-card__header--warning',
            'approved_for_interview': 'uc-card__header--success',
            'accepted':               'uc-card__header--success',
            'rejected':               'uc-card__header--danger',
            'archived':               'uc-card__header--neutral'
        };
        return headerMap[status] || '';
    }

    function getStatusCardClass(status) {
        const cardMap = {
            'new':                    'uc-card--purple',
            'under_review':           'uc-card--warning',
            'approved_for_interview': 'uc-card--success',
            'accepted':               'uc-card--success',
            'rejected':               'uc-card--danger',
            'archived':               'uc-card--neutral'
        };
        return cardMap[status] || '';
    }

    function getStatusBtnClass(status) {
        const btnMap = {
            'new':                    'btn-violet',
            'under_review':           'btn-warning',
            'approved_for_interview': 'btn-success',
            'accepted':               'btn-success',
            'rejected':               'btn-danger',
            'archived':               'btn-slate'
        };
        return btnMap[status] || 'btn-primary';
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

        // تحديث عداد اللجان في الهيدر
        const countBadge = document.getElementById('regCommitteesCount');
        if (countBadge) {
            const activeCount = availableCommittees.filter(c => c.is_available).length;
            countBadge.innerHTML = '<i class="fa-solid fa-layer-group"></i> ' + activeCount + ' لجنة مفعّلة من ' + availableCommittees.length;
        }

        if (availableCommittees.length === 0) {
            availableCommitteesTable.innerHTML = `
                <div style="padding: 2.5rem 1.5rem; text-align: center;">
                    <div style="font-size: 2.5rem; color: var(--text-light); margin-bottom: 0.75rem;">
                        <i class="fa-solid fa-inbox"></i>
                    </div>
                    <p style="font-size: 1rem; font-weight: 600; color: var(--text-dark); margin-bottom: 0.35rem;">لا توجد لجان متاحة</p>
                    <p style="font-size: 0.85rem; color: var(--text-muted);">قم بإضافة لجان من قسم إدارة اللجان أولاً</p>
                </div>
            `;
            return;
        }

        let html = `
            <div class="data-table-wrap" style="border:none; box-shadow:none;">
                <div class="data-table-scroll">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>اللجنة</th>
                                <th style="width:100px; text-align:center;">المتقدمين</th>
                                <th style="width:110px; text-align:center;">الحد الأقصى</th>
                                <th style="width:90px; text-align:center;">الحالة</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        availableCommittees.forEach((item) => {
            const committee = item.committee;
            const isAvailable = item.is_available;
            const applicants = item.current_applicants || 0;
            const maxApplicants = item.max_applicants;
            const isFull = maxApplicants && applicants >= maxApplicants;

            let progressHtml = '';
            if (maxApplicants) {
                const pct = Math.min((applicants / maxApplicants) * 100, 100);
                const barColor = pct >= 90 ? 'var(--color-danger)' : pct >= 70 ? 'var(--color-warning)' : 'var(--color-teal)';
                progressHtml = `
                    <div style="display:flex; align-items:center; gap:0.4rem; justify-content:center;">
                        <span style="font-weight:600; font-size:0.85rem; color:${isFull ? 'var(--color-danger)' : 'var(--text-dark)'};">${applicants}</span>
                        <div style="width:40px; height:5px; background:var(--bg-tertiary); border-radius:99px; overflow:hidden;">
                            <div style="width:${pct}%; height:100%; background:${barColor}; border-radius:99px; transition:width 0.3s ease;"></div>
                        </div>
                    </div>
                `;
            } else {
                progressHtml = `<span style="font-weight:600; font-size:0.85rem;">${applicants}</span>`;
            }

            html += `
                <tr>
                    <td>
                        <div style="display:flex; align-items:center; gap:0.5rem;">
                            <div style="width:32px; height:32px; border-radius:10px; background:linear-gradient(135deg, var(--color-teal), var(--color-teal-dark)); display:flex; align-items:center; justify-content:center; color:#fff; font-size:0.75rem; flex-shrink:0;">
                                <i class="fa-solid fa-users"></i>
                            </div>
                            <strong style="font-size:0.88rem;">${escapeHtml(committee.committee_name_ar)}</strong>
                        </div>
                    </td>
                    <td style="text-align:center;">${progressHtml}</td>
                    <td style="text-align:center;">
                        <input
                            type="number"
                            value="${item.max_applicants || ''}"
                            placeholder="∞"
                            class="form-input"
                            style="width:70px; text-align:center; padding:0.35rem 0.4rem; font-size:0.85rem;"
                            onchange="window.membershipManager.updateMaxApplicants('${item.id}', this.value)"
                        />
                    </td>
                    <td style="text-align:center;">
                        <label class="req-toggle" style="cursor:pointer;">
                            <input
                                type="checkbox"
                                ${isAvailable ? 'checked' : ''}
                                onchange="window.membershipManager.toggleCommitteeAvailability('${item.id}', this.checked)"
                            />
                            <span class="req-toggle-pill" style="height:2.2rem; padding:0.2rem 0.6rem; font-size:0.78rem; border-radius:10px; --_card-color-rgb:20,184,166; --_card-color:#14b8a6;">
                                <span class="req-toggle-dot"></span>
                                <span>${isAvailable ? 'مفعّلة' : 'معطّلة'}</span>
                            </span>
                        </label>
                    </td>
                </tr>
            `;
        });

        html += `
                        </tbody>
                    </table>
                </div>
            </div>
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
                .select('*, reviewed_by_user:profiles!reviewed_by(full_name)')
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
                <div class="modal-section">
                    <h3><i class="fa-solid fa-user"></i> المعلومات الشخصية</h3>
                    <div class="modal-detail-grid">
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">الاسم الكامل</span>
                            <span class="modal-detail-value">${escapeHtml(data.full_name)}</span>
                        </div>
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">البريد الإلكتروني</span>
                            <span class="modal-detail-value">${escapeHtml(data.email)}</span>
                        </div>
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">رقم الهاتف</span>
                            <span class="modal-detail-value" style="direction:ltr;text-align:right;">${escapeHtml(data.phone || 'غير متوفر')}</span>
                        </div>
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">تاريخ التقديم</span>
                            <span class="modal-detail-value">${createdDate} - ${createdTime}</span>
                        </div>
                    </div>
                </div>

                <hr class="modal-divider">

                <div class="modal-section">
                    <h3><i class="fa-solid fa-graduation-cap"></i> المعلومات الأكاديمية</h3>
                    <div class="modal-detail-grid">
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">الدرجة العلمية</span>
                            <span class="modal-detail-value">${escapeHtml(data.degree || 'غير محدد')}</span>
                        </div>
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">الكلية</span>
                            <span class="modal-detail-value">${escapeHtml(data.college || 'غير محدد')}</span>
                        </div>
                        <div class="modal-detail-item" style="grid-column: 1 / -1;">
                            <span class="modal-detail-label">التخصص</span>
                            <span class="modal-detail-value">${escapeHtml(data.major || 'غير محدد')}</span>
                        </div>
                    </div>
                </div>

                <hr class="modal-divider">

                <div class="modal-section">
                    <h3><i class="fa-solid fa-briefcase"></i> معلومات التقديم</h3>
                    <div class="modal-detail-grid">
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">اللجنة المرغوبة</span>
                            <span class="modal-detail-value">${escapeHtml(data.preferred_committee || 'غير محدد')}</span>
                        </div>
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">الحالة</span>
                            <span class="modal-detail-value">${getStatusText(data.status)}</span>
                        </div>
                        <div class="modal-detail-item" style="grid-column: 1 / -1;">
                            <span class="modal-detail-label">المهارات</span>
                            <span class="modal-detail-value">${escapeHtml(data.skills || 'غير محدد')}</span>
                        </div>
                        ${data.portfolio_url ? `
                        <div class="modal-detail-item" style="grid-column: 1 / -1;">
                            <span class="modal-detail-label">رابط الأعمال</span>
                            <span class="modal-detail-value"><a href="${escapeHtml(data.portfolio_url)}" target="_blank">${escapeHtml(data.portfolio_url)}</a></span>
                        </div>
                        ` : ''}
                    </div>
                </div>

                <hr class="modal-divider">

                <div class="modal-section">
                    <h3><i class="fa-solid fa-comment-dots"></i> نبذة عن المتقدم</h3>
                    <div class="modal-info-box">
                        <i class="fa-solid fa-quote-right"></i>
                        <div>${escapeHtml(data.about || 'لا توجد نبذة')}</div>
                    </div>
                </div>

                ${data.review_notes || data.admin_notes ? `
                <hr class="modal-divider">
                <div class="modal-section">
                    <h3><i class="fa-solid fa-note-sticky"></i> ملاحظات مرحلة القبول المبدئي</h3>
                    ${data.review_notes ? `
                    <div class="modal-info-box box-warning">
                        <i class="fa-solid fa-eye"></i>
                        <div><strong>ملاحظات قيد المراجعة</strong><br>${escapeHtml(data.review_notes)}</div>
                    </div>
                    ` : ''}
                    ${data.admin_notes ? `
                    <div class="modal-info-box ${data.status === 'rejected' ? 'box-danger' : ''}" style="flex-wrap:wrap;">
                        <i class="fa-solid fa-${data.status === 'rejected' ? 'times-circle' : 'note-sticky'}"></i>
                        <div>${escapeHtml(data.admin_notes)}</div>
                        ${data.reviewed_by_user?.full_name ? `<small style="width:100%;display:flex;align-items:center;gap:0.35rem;opacity:0.65;font-size:0.78rem;margin-top:0.25rem;padding-top:0.5rem;border-top:1px solid rgba(var(--modal-color-rgb,100,116,139),0.12);"><i class="fa-solid fa-pen-nib"></i> بواسطة: ${escapeHtml(data.reviewed_by_user.full_name)}</small>` : ''}
                    </div>
                    ` : ''}
                </div>
                ` : ''}
            `;

            // بناء أزرار الإجراءات - فقط في قسم المراجعة
            let actionsHtml = '';

            // التحقق من القسم الحالي
            const isViewSection = !document.getElementById('membership-applications-view-section')?.classList.contains('d-none');
            const isReviewSection = !document.getElementById('membership-applications-review-section')?.classList.contains('d-none');

            if (isReviewSection && (data.status === 'new' || data.status === 'under_review')) {
                actionsHtml = `
                    <button class="btn btn-success" onclick="window.membershipManager.approveForInterview('${data.id}'); window.closeApplicationModal();">
                        <i class="fa-solid fa-calendar-check"></i>
                        قبول للمقابلة
                    </button>
                    <button class="btn btn-warning" onclick="window.membershipManager.markUnderReview('${data.id}'); window.closeApplicationModal();">
                        <i class="fa-solid fa-eye"></i>
                        قيد المراجعة
                    </button>
                    <button class="btn btn-danger" onclick="window.membershipManager.rejectApplication('${data.id}'); window.closeApplicationModal();">
                        <i class="fa-solid fa-times"></i>
                        رفض الطلب
                    </button>
                `;
            }

            // عرض النافذة المنبثقة
            document.getElementById('applicationDetailsContent').innerHTML = contentHtml;
            document.getElementById('applicationDetailsActions').innerHTML = actionsHtml;
            window.setModalTitle('تفاصيل المتقدم');
            window.setModalVariant('');
            window.openApplicationModal();

        } catch (error) {
            console.error('خطأ في تحميل تفاصيل المتقدم:', error);
            showNotification('خطأ في تحميل تفاصيل المتقدم', 'error');
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
                <div class="text-right">
                    <p class="mb-1rem"><strong>المتقدم:</strong> ${escapeHtml(application.full_name)}</p>
                    <p class="mb-1rem"><strong>اللجنة:</strong> ${escapeHtml(application.preferred_committee)}</p>
                    <hr>
                    <div class="form-group">
                        <label>تاريخ ووقت المقابلة</label>
                        <input type="datetime-local" id="swal-date" class="form-input">
                    </div>
                    <div class="form-group">
                        <label>نوع المقابلة</label>
                        <select id="swal-type" class="form-select">
                            <option value="in_person">حضوري</option>
                            <option value="online">أونلاين</option>
                            <option value="phone">هاتفي</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>الموقع/الرابط</label>
                        <input type="text" id="swal-location" placeholder="الموقع أو رابط الاجتماع" class="form-input">
                    </div>
                    <div class="form-group">
                        <label>ملاحظات (اختياري)</label>
                        <textarea id="swal-notes" placeholder="ملاحظات حول المقابلة..." class="form-textarea form-textarea-sm"></textarea>
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

            const barzakhTable = document.getElementById('barzakhTable');
            if (barzakhTable) {
                await loadBarzakh();
            }
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
        if (searchInput) {
            searchInput.removeEventListener('input', renderApplicationsViewTable);
            searchInput.addEventListener('input', renderApplicationsViewTable);
        }
        if (committeeFilter) {
            committeeFilter.removeEventListener('change', renderApplicationsViewTable);
            committeeFilter.addEventListener('change', renderApplicationsViewTable);
        }

        // زر خيارات قائمة طلبات العضوية (عرض)
        const viewOptionsBtn = document.getElementById('applicationsViewOptionsBtn');
        if (viewOptionsBtn) {
            let viewDropdown = document.getElementById('applicationsViewOptionsDropdown');
            if (viewDropdown) viewDropdown.remove();
            viewDropdown = document.createElement('div');
            viewDropdown.id = 'applicationsViewOptionsDropdown';
            viewDropdown.className = 'dropdown-menu';
            viewDropdown.innerHTML = `
                <button class="btn btn-slate btn-outline btn-block" data-action="refresh">
                    <i class="fa-solid fa-rotate"></i> تحديث
                </button>
                <button class="btn btn-primary btn-outline btn-block" data-action="export">
                    <i class="fa-solid fa-file-export"></i> تصدير البيانات
                </button>
            `;
            document.body.appendChild(viewDropdown);

            viewOptionsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = viewDropdown.classList.toggle('show');
                if (isOpen) {
                    const rect = viewOptionsBtn.getBoundingClientRect();
                    viewDropdown.style.top = (rect.bottom + 6) + 'px';
                    viewDropdown.style.left = rect.left + 'px';
                }
            });

            viewDropdown.addEventListener('click', (e) => {
                const actionBtn = e.target.closest('[data-action]');
                if (!actionBtn) return;
                viewDropdown.classList.remove('show');
                if (actionBtn.dataset.action === 'export') {
                    exportApplications();
                } else if (actionBtn.dataset.action === 'refresh') {
                    loadApplicationsView();
                }
            });

            document.addEventListener('click', (e) => {
                if (!e.target.closest('#applicationsViewOptionsBtn') && !e.target.closest('#applicationsViewOptionsDropdown')) {
                    viewDropdown.classList.remove('show');
                }
            });
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
                    <div class="empty-state__icon"><i class="fa-solid fa-inbox"></i></div>
                    <p class="empty-state__title">لا توجد طلبات</p>
                </div>
            `;
            return;
        }

        let html = '<div class="uc-grid">';

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
                <div class="uc-card ${getStatusCardClass(app.status)}">
                    <div class="uc-card__header ${getStatusHeaderClass(app.status)}">
                        <div class="uc-card__header-inner">
                            <div class="uc-card__icon">
                                <i class="fa-solid fa-user"></i>
                            </div>
                            <div class="uc-card__header-info">
                                <h3 class="uc-card__title">${escapeHtml(app.full_name)}</h3>
                                ${statusBadge}
                            </div>
                        </div>
                    </div>

                    <div class="uc-card__body">
                            <div class="uc-card__info-item">
                                <div class="uc-card__info-icon"><i class="fa-solid fa-envelope"></i></div>
                                <div class="uc-card__info-content">
                                    <span class="uc-card__info-label">البريد الإلكتروني</span>
                                    <span class="uc-card__info-value">${escapeHtml(app.email)}</span>
                                </div>
                            </div>

                            <div class="uc-card__info-item">
                                <div class="uc-card__info-icon"><i class="fa-solid fa-phone"></i></div>
                                <div class="uc-card__info-content">
                                    <span class="uc-card__info-label">رقم الجوال</span>
                                    <span class="uc-card__info-value">${escapeHtml(app.phone || 'غير متوفر')}</span>
                                </div>
                            </div>

                            <div class="uc-card__info-item">
                                <div class="uc-card__info-icon"><i class="fa-solid fa-calendar"></i></div>
                                <div class="uc-card__info-content">
                                    <span class="uc-card__info-label">تاريخ التقديم</span>
                                    <span class="uc-card__info-value">${date} - ${time}</span>
                                </div>
                            </div>

                            <div class="uc-card__info-item">
                                <div class="uc-card__info-icon"><i class="fa-solid fa-users"></i></div>
                                <div class="uc-card__info-content">
                                    <span class="uc-card__info-label">اللجنة المرغوبة</span>
                                    <span class="uc-card__info-value">${escapeHtml(app.preferred_committee || 'غير محدد')}</span>
                                </div>
                            </div>

                            <div class="uc-card__info-item">
                                <div class="uc-card__info-icon"><i class="fa-solid fa-graduation-cap"></i></div>
                                <div class="uc-card__info-content">
                                    <span class="uc-card__info-label">الدرجة العلمية</span>
                                    <span class="uc-card__info-value">${escapeHtml(app.degree || 'غير محدد')}</span>
                                </div>
                            </div>

                            <div class="uc-card__info-item">
                                <div class="uc-card__info-icon"><i class="fa-solid fa-star"></i></div>
                                <div class="uc-card__info-content">
                                    <span class="uc-card__info-label">المهارات</span>
                                    <span class="uc-card__info-value">${escapeHtml(app.skills || 'غير محدد')}</span>
                                </div>
                            </div>
                    </div>

                    <div class="uc-card__footer">
                        <button class="btn ${getStatusBtnClass(app.status)}" onclick="window.membershipManager.viewApplication('${app.id}')">
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
                <div class="stat-card" style="--stat-color: #3b82f6;">
                    <div class="stat-card-wrapper">
                        <div class="stat-icon">
                            <i class="fa-solid fa-clipboard-list"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value">${totalCount}</div>
                            <div class="stat-label">مجموع الطلبات</div>
                        </div>
                    </div>
                </div>
            `;

            // إضافة بطاقة لكل لجنة
            const colors = ['#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#ec4899'];
            let colorIndex = 0;

            Object.entries(committeeStats).forEach(([committee, count]) => {
                const color = colors[colorIndex % colors.length];
                colorIndex++;
                
                html += `
                    <div class="stat-card" style="--stat-color: ${color};">
                        <div class="stat-card-wrapper">
                            <div class="stat-icon">
                                <i class="fa-solid fa-users"></i>
                            </div>
                            <div class="stat-content">
                                <div class="stat-value">${count}</div>
                                <div class="stat-label">${escapeHtml(committee)}</div>
                            </div>
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
                    <div class="empty-state__icon"><i class="fa-solid fa-inbox"></i></div>
                    <p class="empty-state__title">لا توجد طلبات</p>
                </div>
            `;
            return;
        }

        let html = '<div class="uc-grid">';

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
                <div class="uc-card ${getStatusCardClass(app.status)}">
                    <div class="uc-card__header ${getStatusHeaderClass(app.status)}">
                        <div class="uc-card__header-inner">
                            <div class="uc-card__icon">
                                <i class="fa-solid fa-user"></i>
                            </div>
                            <div class="uc-card__header-info">
                                <h3 class="uc-card__title">${escapeHtml(app.full_name)}</h3>
                                ${statusBadge}
                            </div>
                        </div>
                    </div>

                    <div class="uc-card__body">
                            <div class="uc-card__info-item">
                                <div class="uc-card__info-icon"><i class="fa-solid fa-envelope"></i></div>
                                <div class="uc-card__info-content">
                                    <span class="uc-card__info-label">البريد الإلكتروني</span>
                                    <span class="uc-card__info-value">${escapeHtml(app.email)}</span>
                                </div>
                            </div>

                            <div class="uc-card__info-item">
                                <div class="uc-card__info-icon"><i class="fa-solid fa-phone"></i></div>
                                <div class="uc-card__info-content">
                                    <span class="uc-card__info-label">رقم الجوال</span>
                                    <span class="uc-card__info-value">${escapeHtml(app.phone || 'غير متوفر')}</span>
                                </div>
                            </div>

                            <div class="uc-card__info-item">
                                <div class="uc-card__info-icon"><i class="fa-solid fa-calendar"></i></div>
                                <div class="uc-card__info-content">
                                    <span class="uc-card__info-label">تاريخ التقديم</span>
                                    <span class="uc-card__info-value">${date} - ${time}</span>
                                </div>
                            </div>

                            <div class="uc-card__info-item">
                                <div class="uc-card__info-icon"><i class="fa-solid fa-users"></i></div>
                                <div class="uc-card__info-content">
                                    <span class="uc-card__info-label">اللجنة المرغوبة</span>
                                    <span class="uc-card__info-value">${escapeHtml(app.preferred_committee || 'غير محدد')}</span>
                                </div>
                            </div>

                            <div class="uc-card__info-item">
                                <div class="uc-card__info-icon"><i class="fa-solid fa-graduation-cap"></i></div>
                                <div class="uc-card__info-content">
                                    <span class="uc-card__info-label">الدرجة العلمية</span>
                                    <span class="uc-card__info-value">${escapeHtml(app.degree || 'غير محدد')}</span>
                                </div>
                            </div>

                            <div class="uc-card__info-item">
                                <div class="uc-card__info-icon"><i class="fa-solid fa-star"></i></div>
                                <div class="uc-card__info-content">
                                    <span class="uc-card__info-label">المهارات</span>
                                    <span class="uc-card__info-value">${escapeHtml(app.skills || 'غير محدد')}</span>
                                </div>
                            </div>
                    </div>

                    <div class="uc-card__footer">
                        <button class="btn ${getStatusBtnClass(app.status)}" onclick="window.membershipManager.viewApplication('${app.id}')">
                            <i class="fa-solid fa-eye"></i>
                            عرض التفاصيل
                        </button>
                        ${app.status === 'new' || app.status === 'under_review' ? `
                        <button class="btn btn-success" onclick="window.membershipManager.approveForInterview('${app.id}')">
                            <i class="fa-solid fa-check"></i>
                            قبول للمقابلة
                        </button>
                        <button class="btn btn-warning" onclick="window.membershipManager.markUnderReview('${app.id}')">
                            <i class="fa-solid fa-clock"></i>
                            قيد المراجعة
                        </button>
                        <button class="btn btn-danger" onclick="window.membershipManager.rejectApplication('${app.id}')">
                            <i class="fa-solid fa-times"></i>
                            رفض
                        </button>
                        ` : ''}
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

            // حساب النسب المئوية
            const approvedPercentage = totalCount > 0 ? Math.round((approvedForInterviewCount / totalCount) * 100) : 0;
            const rejectedPercentage = totalCount > 0 ? Math.round((rejectedCount / totalCount) * 100) : 0;
            const reviewPercentage = totalCount > 0 ? Math.round((underReviewCount / totalCount) * 100) : 0;

            // بناء HTML للإحصائيات
            const html = `
                <div class="stat-card" style="--stat-color: #3b82f6;">
                    <div class="stat-card-wrapper">
                        <div class="stat-icon">
                            <i class="fa-solid fa-clipboard-list"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value">${totalCount}</div>
                            <div class="stat-label">إجمالي الطلبات</div>
                        </div>
                    </div>
                </div>
                <div class="stat-card" style="--stat-color: #10b981;">
                    <div class="stat-badge"><i class="fa-solid fa-arrow-up"></i> ${approvedPercentage}%</div>
                    <div class="stat-card-wrapper">
                        <div class="stat-icon">
                            <i class="fa-solid fa-check-circle"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value">${approvedForInterviewCount}</div>
                            <div class="stat-label">المقبولين للمقابلة</div>
                        </div>
                    </div>
                </div>
                <div class="stat-card" style="--stat-color: #ef4444;">
                    <div class="stat-badge"><i class="fa-solid fa-times"></i> ${rejectedPercentage}%</div>
                    <div class="stat-card-wrapper">
                        <div class="stat-icon">
                            <i class="fa-solid fa-times-circle"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value">${rejectedCount}</div>
                            <div class="stat-label">المرفوضين</div>
                        </div>
                    </div>
                </div>
                <div class="stat-card" style="--stat-color: #f59e0b;">
                    <div class="stat-badge"><i class="fa-solid fa-clock"></i> ${reviewPercentage}%</div>
                    <div class="stat-card-wrapper">
                        <div class="stat-icon">
                            <i class="fa-solid fa-clock"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value">${underReviewCount}</div>
                            <div class="stat-label">قيد المراجعة</div>
                        </div>
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

        // زر خيارات قائمة طلبات العضوية (مراجعة)
        const reviewOptionsBtn = document.getElementById('applicationsReviewOptionsBtn');
        if (reviewOptionsBtn) {
            let reviewDropdown = document.getElementById('applicationsReviewOptionsDropdown');
            if (reviewDropdown) reviewDropdown.remove();
            reviewDropdown = document.createElement('div');
            reviewDropdown.id = 'applicationsReviewOptionsDropdown';
            reviewDropdown.className = 'dropdown-menu';
            reviewDropdown.innerHTML = `
                <button class="btn btn-slate btn-outline btn-block" data-action="refresh">
                    <i class="fa-solid fa-rotate"></i> تحديث
                </button>
                <button class="btn btn-primary btn-outline btn-block" data-action="export">
                    <i class="fa-solid fa-file-export"></i> تصدير البيانات
                </button>
            `;
            document.body.appendChild(reviewDropdown);

            reviewOptionsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = reviewDropdown.classList.toggle('show');
                if (isOpen) {
                    const rect = reviewOptionsBtn.getBoundingClientRect();
                    reviewDropdown.style.top = (rect.bottom + 6) + 'px';
                    reviewDropdown.style.left = rect.left + 'px';
                }
            });

            reviewDropdown.addEventListener('click', (e) => {
                const actionBtn = e.target.closest('[data-action]');
                if (!actionBtn) return;
                reviewDropdown.classList.remove('show');
                if (actionBtn.dataset.action === 'export') {
                    exportApplications();
                } else if (actionBtn.dataset.action === 'refresh') {
                    loadApplicationsReview(currentUser);
                }
            });

            document.addEventListener('click', (e) => {
                if (!e.target.closest('#applicationsReviewOptionsBtn') && !e.target.closest('#applicationsReviewOptionsDropdown')) {
                    reviewDropdown.classList.remove('show');
                }
            });
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
                    <div class="card-body empty-state">
                        <i class="fa-solid fa-box-open empty-state__icon text-2xl"></i>
                        <p class="text-lg mb-0-5rem">لا توجد أرشيفات</p>
                        <p class="text-base">سيتم إنشاء أرشيف تلقائياً عند إغلاق باب التسجيل</p>
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
                <div class="card">
                    <div class="card-header">
                        <h3>
                            <i class="fa-solid fa-folder"></i>
                            ${escapeHtml(archive.archive_name)}
                        </h3>
                        <div>
                            <button class=" btn-primary" onclick="window.membershipManager.viewArchive('${archive.id}')">
                                <i class="fa-solid fa-eye"></i>
                                عرض التفاصيل
                            </button>
                            <button class=" btn-success" onclick="window.membershipManager.downloadArchive('${archive.id}')">
                                <i class="fa-solid fa-download"></i>
                                تحميل
                            </button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div>
                            <div>
                                <p>الفترة</p>
                                <p>${openedDate} - ${closedDate}</p>
                            </div>
                            <div>
                                <p>إجمالي الطلبات</p>
                                <p>${archive.total_applications}</p>
                            </div>
                            <div>
                                <p>مقبولة</p>
                                <p>${archive.accepted_applications}</p>
                            </div>
                            <div>
                                <p>مرفوضة</p>
                                <p>${archive.rejected_applications}</p>
                            </div>
                            <div>
                                <p>معدل القبول</p>
                                <p>${acceptanceRate}%</p>
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
                        <div>
                `;
                data.committees_data.forEach(committee => {
                    committeesHtml += `
                        <div>
                            <div>
                                <i class="fa-solid fa-users"></i>
                                ${escapeHtml(committee.committee_name)}
                            </div>
                            <div>
                                <span><i class="fa-solid fa-file"></i> ${committee.total_applications} طلب</span>
                                <span><i class="fa-solid fa-check"></i> ${committee.accepted} مقبول</span>
                                <span><i class="fa-solid fa-times"></i> ${committee.rejected} مرفوض</span>
                                <span><i class="fa-solid fa-clock"></i> ${committee.pending} معلق</span>
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
                            <div class="detail-value">${data.accepted_applications}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">
                                <i class="fa-solid fa-file-circle-xmark"></i>
                                مرفوضة
                            </div>
                            <div class="detail-value">${data.rejected_applications}</div>
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
                            <div class="detail-value">${data.statistics?.acceptance_rate || 0}%</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">
                                <i class="fa-solid fa-percent"></i>
                                معدل الرفض
                            </div>
                            <div class="detail-value">${data.statistics?.rejection_rate || 0}%</div>
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
            window.setModalVariant('archived');
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
                    decided_by_user:profiles!decided_by(full_name),
                    slot:interview_slots(id, session_id, interview_sessions(*))
                `)
                .eq('status', 'scheduled')
                .order('interview_date', { ascending: true });

            if (scheduledError) throw scheduledError;

            // فلترة المقابلات الفردية فقط (التي ليس لها slot مرتبط بجلسة جماعية)
            const individualInterviews = (scheduledData || []).filter(interview => {
                return !interview.slot || interview.slot.length === 0;
            });

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
                container._cachedInterviews = individualInterviews;
            }

            renderInterviewsTable(individualInterviews);
            updateInterviewsStatistics(individualInterviews, unscheduledCount);
            bindInterviewsEvents();
        } catch (error) {
            console.error('خطأ في تحميل المقابلات:', error);
            showNotification('خطأ في تحميل المقابلات', 'error');
        }
    }

    async function loadBarzakh() {
        try {
            const container = document.getElementById('barzakhTable');
            if (!container) return;

            showLoading(container);

            await updateCommitteeFilter('barzakhCommitteeFilter');

            const { data: approvedApps, error: appsError } = await window.sbClient
                .from('membership_applications')
                .select('id, full_name, email, phone, preferred_committee, approved_for_interview_at, created_at')
                .eq('status', 'approved_for_interview')
                .order('approved_for_interview_at', { ascending: false });

            if (appsError) throw appsError;

            const appIds = (approvedApps || []).map(a => a.id);

            let interviewsByAppId = new Map();
            if (appIds.length) {
                const { data: interviews, error: interviewsError } = await window.sbClient
                    .from('membership_interviews')
                    .select('application_id, status')
                    .in('application_id', appIds);

                if (interviewsError) throw interviewsError;

                (interviews || []).forEach(i => {
                    const key = i.application_id;
                    const list = interviewsByAppId.get(key) || [];
                    list.push(i);
                    interviewsByAppId.set(key, list);
                });
            }

            const barzakhApplications = (approvedApps || []).filter(app => {
                const appInterviews = interviewsByAppId.get(app.id) || [];
                return !appInterviews.some(i => i.status === 'scheduled' || i.status === 'completed');
            });

            updateBarzakhStatistics(barzakhApplications.length);

            container._cachedBarzakh = barzakhApplications;

            renderBarzakhTable();
            bindBarzakhEvents();
        } catch (error) {
            console.error('خطأ في تحميل البرزخ:', error);
            showNotification('خطأ في تحميل قسم البرزخ', 'error');
        }
    }

    async function scheduleInterviewFromBarzakh(applicationId) {
        const container = document.getElementById('barzakhTable');
        const source = container?._cachedBarzakh || barzakhApplications;
        const application = (source || []).find(a => String(a.id) === String(applicationId));

        if (!application) {
            showNotification('لم يتم العثور على بيانات المتقدم', 'error');
            return;
        }

        await scheduleInterviewForApplication(applicationId, application);
    }

    function bindBarzakhEvents() {
        const searchInput = document.getElementById('barzakhSearchInput');
        const committeeFilter = document.getElementById('barzakhCommitteeFilter');
        if (searchInput) {
            searchInput.removeEventListener('input', renderBarzakhTable);
            searchInput.addEventListener('input', renderBarzakhTable);
        }
        if (committeeFilter) {
            committeeFilter.removeEventListener('change', renderBarzakhTable);
            committeeFilter.addEventListener('change', renderBarzakhTable);
        }

        // زر خيارات قائمة البرزخ
        const barzakhOptionsBtn = document.getElementById('barzakhOptionsBtn');
        if (barzakhOptionsBtn) {
            let barzakhDropdown = document.getElementById('barzakhOptionsDropdown');
            if (barzakhDropdown) barzakhDropdown.remove();
            barzakhDropdown = document.createElement('div');
            barzakhDropdown.id = 'barzakhOptionsDropdown';
            barzakhDropdown.className = 'dropdown-menu';
            barzakhDropdown.innerHTML = `
                <button class="btn btn-slate btn-outline btn-block" data-action="refresh">
                    <i class="fa-solid fa-rotate"></i> تحديث
                </button>
                <button class="btn btn-primary btn-outline btn-block" data-action="export">
                    <i class="fa-solid fa-file-export"></i> تصدير البيانات
                </button>
            `;
            document.body.appendChild(barzakhDropdown);

            barzakhOptionsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = barzakhDropdown.classList.toggle('show');
                if (isOpen) {
                    const rect = barzakhOptionsBtn.getBoundingClientRect();
                    barzakhDropdown.style.top = (rect.bottom + 6) + 'px';
                    barzakhDropdown.style.left = rect.left + 'px';
                }
            });

            barzakhDropdown.addEventListener('click', (e) => {
                const actionBtn = e.target.closest('[data-action]');
                if (!actionBtn) return;
                barzakhDropdown.classList.remove('show');
                if (actionBtn.dataset.action === 'export') {
                    exportBarzakh();
                } else if (actionBtn.dataset.action === 'refresh') {
                    loadBarzakh();
                }
            });

            document.addEventListener('click', (e) => {
                if (!e.target.closest('#barzakhOptionsBtn') && !e.target.closest('#barzakhOptionsDropdown')) {
                    barzakhDropdown.classList.remove('show');
                }
            });
        }
    }

    /**
     * تصدير بيانات البرزخ إلى CSV
     */
    function exportBarzakh() {
        const container = document.getElementById('barzakhTable');
        const source = container?._cachedBarzakh || barzakhApplications;
        
        if (!source || source.length === 0) {
            showNotification('لا توجد بيانات للتصدير', 'warning');
            return;
        }

        const headers = ['الاسم', 'البريد الإلكتروني', 'الهاتف', 'اللجنة المرغوبة', 'تاريخ القبول للمقابلة', 'تاريخ التقديم'];
        const rows = source.map(app => [
            app.full_name || '',
            app.email || '',
            app.phone || '',
            app.preferred_committee || '',
            app.approved_for_interview_at ? new Date(app.approved_for_interview_at).toLocaleDateString('ar-SA') : '',
            app.created_at ? new Date(app.created_at).toLocaleDateString('ar-SA') : ''
        ]);

        const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `barzakh_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();

        showNotification('تم تصدير بيانات البرزخ بنجاح', 'success');
    }

    function renderBarzakhTable() {
        const container = document.getElementById('barzakhTable');
        const searchInput = document.getElementById('barzakhSearchInput');
        const committeeFilter = document.getElementById('barzakhCommitteeFilter');

        if (!container) return;

        const searchTerm = searchInput?.value.toLowerCase() || '';
        const committeeValue = committeeFilter?.value || '';

        const source = container._cachedBarzakh || barzakhApplications;

        const filtered = (source || []).filter(app => {
            const matchSearch = !searchTerm ||
                (app.full_name && app.full_name.toLowerCase().includes(searchTerm)) ||
                (app.email && app.email.toLowerCase().includes(searchTerm)) ||
                (app.phone && app.phone.includes(searchTerm));

            const matchCommittee = !committeeValue || app.preferred_committee === committeeValue;
            return matchSearch && matchCommittee;
        });

        if (!filtered.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state__icon"><i class="fa-solid fa-inbox"></i></div>
                    <p class="empty-state__title">لا يوجد متقدمون في البرزخ</p>
                </div>
            `;
            return;
        }

        let html = '<div class="uc-grid">';

        filtered.forEach(app => {
            const acceptedAt = app.approved_for_interview_at || app.created_at;
            const date = acceptedAt ? new Date(acceptedAt).toLocaleDateString('ar-SA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }) : '-';

            html += `
                <div class="uc-card uc-card--warning">
                    <div class="uc-card__header">
                        <div class="uc-card__header-inner">
                            <div class="uc-card__icon">
                                <i class="fa-solid fa-user-clock"></i>
                            </div>
                            <div class="uc-card__header-info">
                                <h3 class="uc-card__title">${escapeHtml(app.full_name || 'غير محدد')}</h3>
                                <span class="uc-card__badge">بانتظار جدولة المقابلة</span>
                            </div>
                        </div>
                    </div>

                    <div class="uc-card__body">
                            <div class="uc-card__info-item">
                                <div class="uc-card__info-icon"><i class="fa-solid fa-envelope"></i></div>
                                <div class="uc-card__info-content">
                                    <span class="uc-card__info-label">البريد الإلكتروني</span>
                                    <span class="uc-card__info-value">${escapeHtml(app.email || 'غير متوفر')}</span>
                                </div>
                            </div>

                            <div class="uc-card__info-item">
                                <div class="uc-card__info-icon"><i class="fa-solid fa-phone"></i></div>
                                <div class="uc-card__info-content">
                                    <span class="uc-card__info-label">رقم الجوال</span>
                                    <span class="uc-card__info-value">${escapeHtml(app.phone || 'غير متوفر')}</span>
                                </div>
                            </div>

                            <div class="uc-card__info-item">
                                <div class="uc-card__info-icon"><i class="fa-solid fa-users"></i></div>
                                <div class="uc-card__info-content">
                                    <span class="uc-card__info-label">اللجنة</span>
                                    <span class="uc-card__info-value">${escapeHtml(app.preferred_committee || 'غير محدد')}</span>
                                </div>
                            </div>

                            <div class="uc-card__info-item">
                                <div class="uc-card__info-icon"><i class="fa-solid fa-calendar"></i></div>
                                <div class="uc-card__info-content">
                                    <span class="uc-card__info-label">تاريخ القبول للمقابلة</span>
                                    <span class="uc-card__info-value">${date}</span>
                                </div>
                            </div>
                    </div>

                    <div class="uc-card__footer">
                        <button class="btn ${getStatusBtnClass(app.status)}" onclick="window.membershipManager.viewApplication('${app.id}')">
                            <i class="fa-solid fa-eye"></i>
                            عرض التفاصيل
                        </button>
                        <button class="btn btn-success" onclick="window.membershipManager.scheduleInterviewFromBarzakh('${app.id}')">
                            <i class="fa-solid fa-calendar-plus"></i>
                            جدولة مقابلة
                        </button>
                        <button class="btn btn-danger" onclick="window.membershipManager.rejectFromBarzakh('${app.id}', '${escapeHtml(app.full_name || '')}')">
                            <i class="fa-solid fa-user-xmark"></i>
                            حذف/رفض
                        </button>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
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
            return !searchTerm ||
                interview.application?.full_name.toLowerCase().includes(searchTerm) ||
                interview.application?.email.toLowerCase().includes(searchTerm) ||
                (interview.application?.phone && interview.application.phone.includes(searchTerm));
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
                    <div class="empty-state__icon"><i class="fa-solid fa-inbox"></i></div>
                    <p class="empty-state__title">لا توجد مقابلات</p>
                </div>
            `;
            return;
        }

        let html = '<div class="uc-grid">';

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
                <div class="uc-card">
                    <div class="uc-card__header">
                        <div class="uc-card__header-inner">
                            <div class="uc-card__icon">
                                <i class="fa-solid ${typeIcons[interview.interview_type] || 'fa-user-tie'}"></i>
                            </div>
                            <div class="uc-card__header-info">
                                <h3 class="uc-card__title">${escapeHtml(interview.application?.full_name || 'غير محدد')}</h3>
                                <div>
                                    ${statusBadge}
                                    ${resultBadge}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="uc-card__body">
                            <div class="uc-card__info-item">
                                <div class="uc-card__info-icon"><i class="fa-solid fa-envelope"></i></div>
                                <div class="uc-card__info-content">
                                    <span class="uc-card__info-label">البريد الإلكتروني</span>
                                    <span class="uc-card__info-value">${escapeHtml(interview.application?.email || 'غير متوفر')}</span>
                                </div>
                            </div>

                            <div class="uc-card__info-item">
                                <div class="uc-card__info-icon"><i class="fa-solid fa-phone"></i></div>
                                <div class="uc-card__info-content">
                                    <span class="uc-card__info-label">رقم الجوال</span>
                                    <span class="uc-card__info-value">${escapeHtml(interview.application?.phone || 'غير متوفر')}</span>
                                </div>
                            </div>

                            <div class="uc-card__info-item">
                                <div class="uc-card__info-icon"><i class="fa-solid fa-users"></i></div>
                                <div class="uc-card__info-content">
                                    <span class="uc-card__info-label">اللجنة المرغوبة</span>
                                    <span class="uc-card__info-value">${escapeHtml(interview.application?.preferred_committee || 'غير محدد')}</span>
                                </div>
                            </div>

                            <div class="uc-card__info-item">
                                <div class="uc-card__info-icon"><i class="fa-solid fa-calendar-day"></i></div>
                                <div class="uc-card__info-content">
                                    <span class="uc-card__info-label">تاريخ المقابلة</span>
                                    <span class="uc-card__info-value">${date} - ${time}</span>
                                </div>
                            </div>

                            <div class="uc-card__info-item">
                                <div class="uc-card__info-icon"><i class="fa-solid ${typeIcons[interview.interview_type] || 'fa-handshake'}"></i></div>
                                <div class="uc-card__info-content">
                                    <span class="uc-card__info-label">نوع المقابلة</span>
                                    <span class="uc-card__info-value">${typeBadge}</span>
                                </div>
                            </div>

                            ${interview.location ? `
                                <div class="uc-card__info-item">
                                    <div class="uc-card__info-icon"><i class="fa-solid fa-location-dot"></i></div>
                                    <div class="uc-card__info-content">
                                        <span class="uc-card__info-label">الموقع</span>
                                        <span class="uc-card__info-value">${escapeHtml(interview.location)}</span>
                                    </div>
                                </div>
                            ` : ''}

                            ${interview.meeting_link ? `
                                <div class="uc-card__info-item">
                                    <div class="uc-card__info-icon"><i class="fa-solid fa-link"></i></div>
                                    <div class="uc-card__info-content">
                                        <span class="uc-card__info-label">رابط المقابلة</span>
                                        <a href="${escapeHtml(interview.meeting_link)}" target="_blank" class="uc-card__info-value">
                                            فتح الرابط
                                        </a>
                                    </div>
                                </div>
                            ` : ''}
                    </div>

                    <div class="uc-card__footer">
                        <button class="btn btn-primary" onclick="window.membershipManager.viewInterview('${interview.id}')">
                            <i class="fa-solid fa-eye"></i>
                            عرض التفاصيل
                        </button>
                        ${interview.result === 'pending' || !interview.result ? `
                        <button class="btn btn-success" onclick="window.membershipManager.acceptInterview('${interview.id}')">
                            <i class="fa-solid fa-check"></i>
                            قبول
                        </button>
                        <button class="btn btn-danger" onclick="window.membershipManager.rejectInterview('${interview.id}')">
                            <i class="fa-solid fa-times"></i>
                            رفض
                        </button>
                        ` : ''}
                        <button class="btn btn-warning" onclick="window.membershipManager.cancelIndividualInterview('${interview.id}')">
                            <i class="fa-solid fa-trash-alt"></i>
                            حذف الموعد
                        </button>
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
                <div class="modal-section">
                    <h3><i class="fa-solid fa-user"></i> معلومات المتقدم</h3>
                    <div class="modal-detail-grid">
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">الاسم الكامل</span>
                            <span class="modal-detail-value">${escapeHtml(data.application.full_name)}</span>
                        </div>
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">البريد الإلكتروني</span>
                            <span class="modal-detail-value">${escapeHtml(data.application.email)}</span>
                        </div>
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">رقم الهاتف</span>
                            <span class="modal-detail-value">${escapeHtml(data.application.phone || 'غير متوفر')}</span>
                        </div>
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">اللجنة المرغوبة</span>
                            <span class="modal-detail-value">${escapeHtml(data.application.preferred_committee)}</span>
                        </div>
                    </div>
                </div>

                <hr class="modal-divider">

                <div class="modal-section">
                    <h3><i class="fa-solid fa-calendar-days"></i> معلومات المقابلة</h3>
                    <div class="modal-detail-grid">
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">تاريخ المقابلة</span>
                            <span class="modal-detail-value">${interviewDate}</span>
                        </div>
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">وقت المقابلة</span>
                            <span class="modal-detail-value">${interviewTime}</span>
                        </div>
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">نوع المقابلة</span>
                            <span class="modal-detail-value">${typeBadge}</span>
                        </div>
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">النتيجة</span>
                            <span class="modal-detail-value">${resultBadge}</span>
                        </div>
                        ${data.interviewer ? `
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">المقابل</span>
                            <span class="modal-detail-value">${escapeHtml(data.interviewer.full_name)}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>

                ${data.interviewer_notes ? `
                    <hr class="modal-divider">
                    <div class="modal-section">
                        <h3><i class="fa-solid fa-comment-dots"></i> ملاحظات المقابل</h3>
                        <p>${escapeHtml(data.interviewer_notes)}</p>
                    </div>
                ` : ''}

                ${(data.application.review_notes || data.application.admin_notes) ? `
                    <hr class="modal-divider">
                    <div class="modal-section">
                        <h3><i class="fa-solid fa-clipboard-list"></i> ملاحظات مرحلة مراجعة الطلبات</h3>
                        ${data.application.review_notes ? `
                            <div class="modal-info-box box-info">
                                <i class="fa-solid fa-eye"></i>
                                <div><strong>ملاحظات قيد المراجعة</strong><br>${escapeHtml(data.application.review_notes)}</div>
                            </div>
                        ` : ''}
                        ${data.application.admin_notes ? `
                            <div class="modal-info-box ${data.application.status === 'approved_for_interview' ? 'box-success' : data.application.status === 'rejected' ? 'box-danger' : 'box-info'}">
                                <i class="fa-solid fa-${data.application.status === 'approved_for_interview' ? 'circle-check' : data.application.status === 'rejected' ? 'circle-xmark' : 'note-sticky'}"></i>
                                <div><strong>${data.application.status === 'approved_for_interview' ? 'ملاحظات القبول للمقابلة' : data.application.status === 'rejected' ? 'سبب الرفض' : 'ملاحظات إدارية'}</strong><br>${escapeHtml(data.application.admin_notes)}</div>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}

                ${(data.result_notes || data.notes) ? `
                    <hr class="modal-divider">
                    <div class="modal-section">
                        <h3><i class="fa-solid fa-note-sticky"></i> ملاحظات نتيجة المقابلة</h3>
                        ${data.result_notes ? `
                            <div class="modal-info-box ${data.result === 'accepted' ? 'box-success' : data.result === 'rejected' ? 'box-danger' : 'box-warning'}">
                                <i class="fa-solid fa-${data.result === 'accepted' ? 'circle-check' : data.result === 'rejected' ? 'circle-xmark' : 'note-sticky'}"></i>
                                <div><strong>${data.result === 'accepted' ? 'ملاحظات قبول المقابلة' : data.result === 'rejected' ? 'سبب رفض المقابلة' : 'ملاحظات النتيجة'}</strong><br>${escapeHtml(data.result_notes)}</div>
                            </div>
                        ` : ''}
                        ${data.notes ? `
                            <div class="modal-info-box box-danger">
                                <i class="fa-solid fa-user-xmark"></i>
                                <div>
                                    <strong>رفض من البرزخ</strong> ${data.interview_date ? '' : '(رفض مباشر بدون مقابلة)'}
                                    <br>${escapeHtml(data.notes)}
                                    ${data.decided_by_user ? `<br><strong>تم الرفض بواسطة:</strong> ${escapeHtml(data.decided_by_user.full_name)}${data.decided_at ? ` — ${new Date(data.decided_at).toLocaleDateString('ar-SA')}` : ''}` : ''}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}
            `;

            // بناء أزرار الإجراءات
            let actionsHtml = '';
            if (data.result === 'pending' || data.result === null) {
                actionsHtml = `
                    <button class="btn btn-success" onclick="window.membershipManager.acceptInterview('${data.id}'); window.closeApplicationModal();">
                        <i class="fa-solid fa-check"></i>
                        قبول المتقدم
                    </button>
                    <button class="btn btn-danger" onclick="window.membershipManager.rejectInterview('${data.id}'); window.closeApplicationModal();">
                        <i class="fa-solid fa-times"></i>
                        رفض المتقدم
                    </button>
                `;
            }

            // عرض النافذة المنبثقة
            document.getElementById('applicationDetailsContent').innerHTML = contentHtml;
            document.getElementById('applicationDetailsActions').innerHTML = actionsHtml;
            window.setModalTitle('تفاصيل المقابلة');
            window.setModalVariant(data.result === 'accepted' ? 'accepted' : data.result === 'rejected' ? 'rejected' : 'approved_for_interview');
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
            const { data: interview, error: interviewError } = await window.sbClient
                .from('membership_interviews')
                .select('id, application_id, result, status')
                .eq('id', interviewId)
                .single();

            if (interviewError) throw interviewError;

            if (interview.result === 'accepted' && interview.status === 'completed') {
                showNotification('تم قبول هذا المتقدم مسبقاً', 'info');
                await loadInterviews();
                return;
            }

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

            if (acceptedError) {
                const isConflict = acceptedError.code === '23505' || acceptedError.status === 409;
                if (!isConflict) throw acceptedError;
            }

            const { error: updateInterviewError } = await window.sbClient
                .from('membership_interviews')
                .update({
                    result: 'accepted',
                    result_notes: notes || null,
                    decided_by: currentUser.id,
                    decided_at: new Date().toISOString(),
                    status: 'completed'
                })
                .eq('id', interviewId);

            if (updateInterviewError) throw updateInterviewError;

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
                    <div>
                        <div class="form-group">
                            <label>المتقدم</label>
                            <select id="swal-application">
                                ${applicationsOptions}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>تاريخ ووقت المقابلة</label>
                            <input type="datetime-local" id="swal-date">
                        </div>
                        <div class="form-group">
                            <label>نوع المقابلة</label>
                            <select id="swal-type">
                                <option value="in_person">حضوري</option>
                                <option value="online">أونلاين</option>
                                <option value="phone">هاتفي</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>الموقع/الرابط</label>
                            <input type="text" id="swal-location" placeholder="الموقع أو رابط الاجتماع">
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
                        <button class=" btn-primary" onclick="window.membershipManager.viewAcceptedMember('${member.id}')">
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
            window.setModalVariant('accepted');
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
            'completed': '<span class="uc-card__badge">مكتملة</span>',
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
            'active': '<span class="uc-card__badge">نشط</span>',
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
            const bodyHtml = options.html || `<p>${options.text || ''}</p>`;

            const footerBtns = [];

            if (options.showCancelButton !== false) {
                footerBtns.push({
                    text: options.cancelButtonText || 'إلغاء',
                    class: 'btn btn-outline',
                    callback: () => resolve({ isDismissed: true })
                });
            }

            if (options.showDenyButton) {
                footerBtns.push({
                    text: options.denyButtonText || 'لا',
                    class: 'btn btn-outline',
                    callback: () => resolve({ isDenied: true })
                });
            }

            footerBtns.push({
                text: options.confirmButtonText || 'تأكيد',
                class: 'btn btn-primary',
                keepOpen: !!options.preConfirm,
                callback: () => {
                    if (options.preConfirm) {
                        const result = options.preConfirm();
                        if (result === false) return;
                        ModalHelper.closeAll();
                    }
                    resolve({ isConfirmed: true, value: true });
                }
            });

            ModalHelper.show({
                title: options.title || 'تأكيد',
                html: bodyHtml,
                size: 'sm',
                showClose: true,
                showFooter: true,
                footerButtons: footerBtns,
                onClose: () => resolve({ isDismissed: true })
            });
        });
    }

    /**
     * نافذة إدخال نص مخصصة (بديل لـ Swal.fire مع input)
     */
    function showCustomInput(options) {
        return new Promise((resolve) => {
            const isTextarea = options.input === 'textarea';
            const inputHtml = `
                <div class="form-group">
                    ${options.inputLabel ? `<label class="form-label">${options.inputLabel}</label>` : ''}
                    ${isTextarea
                        ? `<textarea id="customInputField" class="form-input form-textarea" placeholder="${options.inputPlaceholder || ''}" rows="3"></textarea>`
                        : `<input type="text" id="customInputField" class="form-input" placeholder="${options.inputPlaceholder || ''}" />`
                    }
                </div>
            `;

            ModalHelper.show({
                title: options.title || '',
                html: inputHtml,
                size: 'sm',
                showClose: true,
                showFooter: true,
                footerButtons: [
                    {
                        text: options.cancelButtonText || 'إلغاء',
                        class: 'btn btn-outline',
                        callback: () => resolve({ value: null })
                    },
                    {
                        text: options.confirmButtonText || 'تأكيد',
                        class: 'btn btn-primary',
                        keepOpen: true,
                        callback: () => {
                            const inputField = document.getElementById('customInputField');
                            const value = inputField ? inputField.value.trim() : '';
                            if (options.inputValidator && !value) {
                                showNotification(options.inputValidator(), 'error');
                                return;
                            }
                            ModalHelper.closeAll();
                            resolve({ value });
                        }
                    }
                ],
                onOpen: () => {
                    const field = document.getElementById('customInputField');
                    if (field) field.focus();
                },
                onClose: () => resolve({ value: null })
            });
        });
    }

    /**
     * حذف موعد المقابلة إدارياً (إجراء قصري)
     */
    async function cancelInterviewAdmin(interviewId, slotId) {
        try {
            // التحقق من وجود slot_id
            if (!slotId || slotId === 'undefined' || slotId === '') {
                showNotification('خطأ: لا يمكن العثور على معرف الفترة الزمنية', 'error');
                return;
            }

            // عرض نافذة تأكيد موحدة
            const contentHtml = `
                <div>
                    <div class="modal-info-box box-warning">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        <p>هل أنت متأكد من حذف هذا الموعد؟</p>
                    </div>
                    <p style="margin: 0.5rem 0 0; font-size: 0.875rem; color: #64748b; line-height: 1.7;">
                        سيتم حذف الموعد والمقابلة المرتبطة به من قاعدة البيانات، وسيُسمح للمتقدم بحجز موعد جديد.
                        <br><strong style="color: #b45309;">هذا الإجراء لا يمكن التراجع عنه.</strong>
                    </p>
                    <input type="hidden" id="delete-interview-id" value="${interviewId}">
                    <input type="hidden" id="delete-slot-id" value="${slotId}">
                </div>
            `;

            const footerHtml = `
                <button class="btn btn-outline" onclick="closeModal()">
                    <i class="fa-solid fa-times"></i>
                    إلغاء
                </button>
                <button class="btn btn-warning" onclick="window.membershipManager.confirmCancelInterview()">
                    <i class="fa-solid fa-trash"></i>
                    نعم، احذف الموعد
                </button>
            `;

            openModal('تأكيد حذف الموعد', contentHtml, {
                icon: 'fa-triangle-exclamation',
                variant: 'warning',
                footer: footerHtml
            });

        } catch (error) {
            console.error('خطأ في عرض نافذة التأكيد:', error);
            showNotification('حدث خطأ أثناء عرض نافذة التأكيد', 'error');
        }
    }

    /**
     * تأكيد حذف الموعد (يتم استدعاؤها من النافذة المنبثقة)
     */
    async function confirmCancelInterview() {
        try {
            const interviewId = document.getElementById('delete-interview-id').value;
            const slotId = document.getElementById('delete-slot-id').value;

            closeModal();

            // استدعاء دالة الحذف الإداري
            const { data, error } = await window.sbClient
                .rpc('cancel_interview_admin', {
                    p_interview_id: interviewId,
                    p_slot_id: slotId
                });

            if (error) throw error;

            const result = data[0];

            if (!result.success) {
                showNotification(result.message, 'error');
                return;
            }

            showNotification('تم حذف الموعد بنجاح. يمكن للمتقدم الآن حجز موعد جديد', 'success');

            // إعادة تحميل المقابلات
            await loadInterviews();

        } catch (error) {
            console.error('خطأ في حذف الموعد:', error);
            showNotification('حدث خطأ أثناء حذف الموعد', 'error');
        }
    }

    /**
     * حذف مقابلة فردية (بدون slot مرتبط)
     */
    async function cancelIndividualInterview(interviewId) {
        try {
            const contentHtml = `
                <div>
                    <p>هل أنت متأكد من حذف هذه المقابلة الفردية؟</p>
                    <div class="modal-info-box box-danger">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        <div><strong>هذا الإجراء لا يمكن التراجع عنه!</strong></div>
                    </div>
                    <input type="hidden" id="delete-individual-interview-id" value="${interviewId}">
                </div>
            `;

            const footerHtml = `
                <button class="btn btn-outline" onclick="closeModal()">
                    <i class="fa-solid fa-times"></i>
                    إلغاء
                </button>
                <button class="btn btn-danger" onclick="window.membershipManager.confirmCancelIndividualInterview()">
                    <i class="fa-solid fa-trash"></i>
                    نعم، احذف المقابلة
                </button>
            `;

            openModal('تأكيد حذف المقابلة', contentHtml, {
                icon: 'fa-triangle-exclamation',
                variant: 'danger',
                footer: footerHtml
            });

        } catch (error) {
            console.error('خطأ في عرض نافذة التأكيد:', error);
            showNotification('حدث خطأ أثناء عرض نافذة التأكيد', 'error');
        }
    }

    /**
     * تأكيد حذف المقابلة الفردية
     */
    async function confirmCancelIndividualInterview() {
        try {
            const interviewId = document.getElementById('delete-individual-interview-id').value;
            closeModal();

            const { error } = await window.sbClient
                .from('membership_interviews')
                .update({ status: 'cancelled' })
                .eq('id', interviewId);

            if (error) throw error;

            showNotification('تم حذف المقابلة بنجاح', 'success');
            await loadInterviews();

        } catch (error) {
            console.error('خطأ في حذف المقابلة:', error);
            showNotification('حدث خطأ أثناء حذف المقابلة', 'error');
        }
    }

    /**
     * رفض متقدم من البرزخ
     */
    async function rejectFromBarzakh(applicationId, applicantName) {
        try {
            const formHtml = `
                <div class="form-group">
                    <label>
                        <i class="fa-solid fa-exclamation-circle"></i>
                        سبب الرفض/الحذف
                    </label>
                    <p>
                        سيتم نقل <strong>${applicantName}</strong> إلى قائمة المرفوضين في نتائج المقابلات
                    </p>
                    
                    <div>
                        <label class="radio-option">
                            <input type="radio" name="rejection-reason" value="withdrawn" id="reason-withdrawn">
                            <div>
                                <div>
                                    <i class="fa-solid fa-person-walking-arrow-right"></i>
                                    منسحب من المقابلة
                                </div>
                                <div>المتقدم قرر الانسحاب وعدم المتابعة</div>
                            </div>
                        </label>
                        
                        <label class="radio-option">
                            <input type="radio" name="rejection-reason" value="no_response" id="reason-no-response">
                            <div>
                                <div>
                                    <i class="fa-solid fa-phone-slash"></i>
                                    لا يرد على التواصل
                                </div>
                                <div>عدم الرد على محاولات التواصل المتكررة</div>
                            </div>
                        </label>
                        
                        <label class="radio-option">
                            <input type="radio" name="rejection-reason" value="other" id="reason-other">
                            <div>
                                <div>
                                    <i class="fa-solid fa-pen"></i>
                                    سبب آخر
                                </div>
                                <div>تحديد سبب مخصص</div>
                            </div>
                        </label>
                    </div>
                </div>
                
                <div class="form-group" id="custom-reason-group">
                    <label>
                        <i class="fa-solid fa-comment-dots"></i>
                        اذكر السبب
                    </label>
                    <textarea id="custom-rejection-reason" class="form-textarea" rows="3" placeholder="اكتب السبب هنا..."></textarea>
                </div>
                
                <input type="hidden" id="reject-application-id" value="${applicationId}">
            `;

            const footerHtml = `
                <button class="btn btn-outline" onclick="closeModal()">
                    <i class="fa-solid fa-times"></i>
                    إلغاء
                </button>
                <button class="btn btn-danger" onclick="window.membershipManager.confirmRejectFromBarzakh()">
                    <i class="fa-solid fa-check"></i>
                    تأكيد الرفض
                </button>
            `;

            openModal('رفض/حذف متقدم من البرزخ', formHtml, {
                icon: 'fa-user-xmark',
                variant: 'danger',
                footer: footerHtml,
                onOpen: () => {
                const radioOptions = document.querySelectorAll('.radio-option');
                const customReasonGroup = document.getElementById('custom-reason-group');
                const otherRadio = document.getElementById('reason-other');

                // تأثيرات بصرية عند التحديد
                radioOptions.forEach(option => {
                    const radio = option.querySelector('input[type="radio"]');
                    radio.addEventListener('change', () => {
                        radioOptions.forEach(opt => {
                            opt.style.borderColor = '#e2e8f0';
                            opt.style.background = 'white';
                        });
                        if (radio.checked) {
                            option.style.borderColor = '#3b82f6';
                            option.style.background = '#eff6ff';
                        }
                    });
                });

                // إظهار حقل السبب المخصص
                document.querySelectorAll('input[name="rejection-reason"]').forEach(radio => {
                    radio.addEventListener('change', () => {
                        if (otherRadio.checked) {
                            customReasonGroup.style.display = 'block';
                        } else {
                            customReasonGroup.style.display = 'none';
                        }
                    });
                });
                }
            });

        } catch (error) {
            console.error('خطأ في عرض نافذة الرفض:', error);
            showNotification('حدث خطأ أثناء عرض نافذة الرفض', 'error');
        }
    }

    /**
     * تأكيد رفض متقدم من البرزخ
     */
    async function confirmRejectFromBarzakh() {
        try {
            const applicationId = document.getElementById('reject-application-id').value;
            const selectedReason = document.querySelector('input[name="rejection-reason"]:checked');

            if (!selectedReason) {
                showNotification('يرجى اختيار سبب الرفض', 'warning');
                return;
            }

            let rejectionNote = '';
            if (selectedReason.value === 'withdrawn') {
                rejectionNote = 'منسحب من المقابلة - المتقدم قرر الانسحاب وعدم المتابعة';
            } else if (selectedReason.value === 'no_response') {
                rejectionNote = 'لا يرد على التواصل - عدم الرد على محاولات التواصل المتكررة';
            } else if (selectedReason.value === 'other') {
                const customReason = document.getElementById('custom-rejection-reason').value.trim();
                if (!customReason) {
                    showNotification('يرجى كتابة السبب', 'warning');
                    return;
                }
                rejectionNote = `سبب آخر: ${customReason}`;
            }

            closeModal();

            // الحصول على معرف المستخدم الحالي
            const { data: { user } } = await window.sbClient.auth.getUser();
            const userId = user?.id || currentUser?.id;

            // إنشاء سجل مقابلة برفض مباشر
            const { data: interviewData, error: interviewError } = await window.sbClient
                .from('membership_interviews')
                .insert({
                    application_id: applicationId,
                    status: 'completed',
                    result: 'rejected',
                    notes: rejectionNote,
                    decided_at: new Date().toISOString(),
                    decided_by: userId
                })
                .select()
                .single();

            if (interviewError) throw interviewError;

            showNotification('تم رفض المتقدم ونقله إلى قائمة المرفوضين', 'success');

            // إعادة تحميل البرزخ
            await loadBarzakh();

        } catch (error) {
            console.error('خطأ في رفض المتقدم:', error);
            showNotification('حدث خطأ أثناء رفض المتقدم', 'error');
        }
    }

    function updateBarzakhStatistics(count) {
        const container = document.getElementById('barzakhStatsGrid');
        if (!container) return;

        container.innerHTML = `
            <div class="stat-card" style="--stat-color: #f59e0b;">
                <div class="stat-card-wrapper">
                    <div class="stat-icon">
                        <i class="fa-solid fa-user-clock"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${count}</div>
                        <div class="stat-label">بانتظار جدولة المقابلة</div>
                    </div>
                </div>
            </div>
        `;
    }

    // تصدير الوظائف العامة
    window.membershipManager = {
        init: initMembershipManager,
        viewApplication: viewApplication,
        approveForInterview: approveForInterview,
        rejectApplication: rejectApplication,
        markUnderReview: markUnderReview,
        scheduleInterviewForApplication: scheduleInterviewForApplication,
        scheduleInterviewFromBarzakh: scheduleInterviewFromBarzakh,
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
        loadBarzakh: loadBarzakh,
        viewInterview: viewInterview,
        acceptInterview: acceptInterview,
        rejectInterview: rejectInterview,
        cancelInterviewAdmin: cancelInterviewAdmin,
        confirmCancelInterview: confirmCancelInterview,
        cancelIndividualInterview: cancelIndividualInterview,
        confirmCancelIndividualInterview: confirmCancelIndividualInterview,
        rejectFromBarzakh: rejectFromBarzakh,
        confirmRejectFromBarzakh: confirmRejectFromBarzakh,
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
    const titleElement = document.getElementById('applicationDetailsTitle');
    if (titleElement) {
        titleElement.textContent = title;
    }
};

/**
 * تعيين لون النافذة حسب الحالة
 */
window.setModalVariant = function(status) {
    const modal = document.getElementById('applicationDetailsModal');
    if (!modal) return;
    modal.classList.remove('modal-success', 'modal-danger', 'modal-warning', 'modal-purple', 'modal-info', 'modal-teal');
    const variantMap = {
        'new': 'modal-purple',
        'under_review': 'modal-warning',
        'approved_for_interview': 'modal-success',
        'accepted': 'modal-success',
        'rejected': 'modal-danger',
        'archived': 'modal-info'
    };
    const variant = variantMap[status];
    if (variant) modal.classList.add(variant);
};

/**
 * فتح النافذة المنبثقة لتفاصيل الطلب
 */
window.openApplicationModal = function() {
    const modal = document.getElementById('applicationDetailsModal');
    const backdrop = document.getElementById('applicationDetailsBackdrop');
    if (modal) {
        modal.classList.add('active');
        if (backdrop) backdrop.classList.add('active');
        document.body.classList.add('modal-open');

        // إغلاق عند النقر على الخلفية
        if (backdrop) {
            backdrop.onclick = function() {
                window.closeApplicationModal();
            };
        }

        // إغلاق عند الضغط على ESC
        document.addEventListener('keydown', handleEscapeKey);
    }
};

/**
 * إغلاق النافذة المنبثقة
 */
window.closeApplicationModal = function() {
    const modal = document.getElementById('applicationDetailsModal');
    const backdrop = document.getElementById('applicationDetailsBackdrop');
    if (modal) {
        modal.classList.remove('active');
        if (backdrop) backdrop.classList.remove('active');
        document.body.classList.remove('modal-open');
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


