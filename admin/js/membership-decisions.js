/**
 * وحدة إدارة قرارات العضوية (المقبولين والمرفوضين)
 * هذه الوحدة مسؤولة عن عرض المتقدمين الذين تم اتخاذ قرار بشأنهم (قبول أو رفض)
 */

(function() {
    'use strict';

    let currentDecisions = [];

    /**
     * تحميل قرارات العضوية (المقبولين والمرفوضين فقط)
     */
    async function loadMembershipDecisions() {
        try {
            const container = document.getElementById('decisionsTable');
            if (!container) return;

            showLoading(container);

            // جلب القرارات النهائية من جدول المقابلات (accepted / rejected)
            const { data, error } = await window.sbClient
                .from('membership_interviews')
                .select(`
                    *,
                    application:membership_applications(id, full_name, email, phone, preferred_committee)
                `)
                .in('result', ['accepted', 'rejected'])
                .order('decided_at', { ascending: false });

            if (error) throw error;

            currentDecisions = data || [];
            
            // جلب اللجان المتاحة وتحديث الفلتر
            await updateDecisionsCommitteeFilter();
            
            renderDecisionsTable();
            updateDecisionsStatistics();
            bindDecisionsEvents();
        } catch (error) {
            console.error('خطأ في تحميل قرارات العضوية:', error);
            showNotification('خطأ في تحميل قرارات العضوية', 'error');
        }
    }

    /**
     * تحديث فلتر اللجان ديناميكياً
     */
    async function updateDecisionsCommitteeFilter() {
        try {
            const committeeFilter = document.getElementById('decisionsCommitteeFilter');
            if (!committeeFilter) return;

            // جلب اللجان من قاعدة البيانات
            const { data, error } = await window.sbClient
                .from('committees')
                .select('committee_name_ar')
                .order('committee_name_ar', { ascending: true });

            if (error) throw error;

            // بناء خيارات الفلتر
            let options = '<option value="">جميع اللجان</option>';
            if (data) {
                data.forEach(committee => {
                    options += `<option value="${escapeHtml(committee.committee_name_ar)}">${escapeHtml(committee.committee_name_ar)}</option>`;
                });
            }

            committeeFilter.innerHTML = options;
        } catch (error) {
            console.error('خطأ في تحديث فلتر اللجان:', error);
        }
    }

    /**
     * عرض جدول قرارات العضوية
     */
    function renderDecisionsTable() {
        const container = document.getElementById('decisionsTable');
        const searchInput = document.getElementById('decisionsSearchInput');
        const statusFilter = document.getElementById('decisionsStatusFilter');
        const committeeFilter = document.getElementById('decisionsCommitteeFilter');

        if (!container) return;

        const searchTerm = searchInput?.value.toLowerCase() || '';
        const statusValue = statusFilter?.value || '';
        const committeeValue = committeeFilter?.value || '';

        let filtered = currentDecisions.filter(interview => {
            const matchSearch = !searchTerm || 
                interview.application?.full_name.toLowerCase().includes(searchTerm) ||
                interview.application?.email.toLowerCase().includes(searchTerm) ||
                (interview.application?.phone && interview.application.phone.includes(searchTerm));
            
            const matchStatus = !statusValue || interview.result === statusValue;
            const matchCommittee = !committeeValue || interview.application?.preferred_committee === committeeValue;

            return matchSearch && matchStatus && matchCommittee;
        });

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state__icon"><i class="fa-solid fa-inbox"></i></div>
                    <p class="empty-state__title">لا توجد قرارات</p>
                </div>
            `;
            return;
        }

        let html = '<div class="uc-grid">';

        filtered.forEach(interview => {
            const interviewDate = interview.interview_date ? new Date(interview.interview_date).toLocaleDateString('ar-SA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }) : 'غير محدد';
            
            const interviewTime = interview.interview_date ? new Date(interview.interview_date).toLocaleTimeString('ar-SA', {
                hour: '2-digit',
                minute: '2-digit'
            }) : '';

            const decidedDate = interview.decided_at ? new Date(interview.decided_at).toLocaleDateString('ar-SA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }) : 'غير محدد';

            const statusBadge = interview.result === 'accepted'
                ? '<span class="uc-card__badge"><i class="fa-solid fa-check"></i> مقبول نهائياً</span>'
                : '<span class="uc-card__badge"><i class="fa-solid fa-xmark"></i> مرفوض نهائياً</span>';

            const avatarIcon = interview.result === 'accepted' 
                ? '<i class="fa-solid fa-user-check"></i>'
                : '<i class="fa-solid fa-user-xmark"></i>';

            html += `
                <div class="uc-card ${interview.result === 'accepted' ? 'uc-card--success' : 'uc-card--danger'}">
                    <div class="uc-card__header">
                        <div class="uc-card__header-inner">
                            <div class="uc-card__icon ${interview.result === 'accepted' ? 'avatar-accepted' : 'avatar-rejected'}">
                                ${avatarIcon}
                            </div>
                            <div class="uc-card__header-info">
                                <h3 class="uc-card__title">${escapeHtml(interview.application?.full_name || 'غير محدد')}</h3>
                                ${statusBadge}
                            </div>
                        </div>
                    </div>

                    <div class="uc-card__body">
                            <div class="uc-card__info-item">
                                <div class="uc-card__info-icon"><i class="fa-solid fa-envelope"></i></div>
                                <div class="uc-card__info-content">
                                    <span class="uc-card__info-label">البريد الإلكتروني</span>
                                    <span class="uc-card__info-value">${escapeHtml(interview.application?.email || 'غير محدد')}</span>
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
                                <div class="uc-card__info-icon"><i class="fa-solid fa-calendar-check"></i></div>
                                <div class="uc-card__info-content">
                                    <span class="uc-card__info-label">تاريخ المقابلة</span>
                                    <span class="uc-card__info-value">${interviewDate}${interviewTime ? ' - ' + interviewTime : ''}</span>
                                </div>
                            </div>

                            <div class="uc-card__info-item">
                                <div class="uc-card__info-icon"><i class="fa-solid fa-clipboard-check"></i></div>
                                <div class="uc-card__info-content">
                                    <span class="uc-card__info-label">تاريخ القرار</span>
                                    <span class="uc-card__info-value">${decidedDate}</span>
                                </div>
                            </div>

                            ${interview.notes ? `
                                <div class="uc-card__info-item">
                                    <div class="uc-card__info-icon"><i class="fa-solid fa-note-sticky"></i></div>
                                    <div class="uc-card__info-content">
                                        <span class="uc-card__info-label">ملاحظات</span>
                                        <span class="uc-card__info-value">${escapeHtml(interview.notes)}</span>
                                    </div>
                                </div>
                            ` : ''}
                    </div>

                    <div class="uc-card__footer">
                        <button class="btn ${interview.result === 'accepted' ? 'btn-success' : 'btn-danger'}" onclick="window.membershipManager.viewInterview('${interview.id}')">
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
     * تحديث إحصائيات قرارات العضوية
     */
    function updateDecisionsStatistics() {
        const container = document.getElementById('decisionsStatsGrid');
        if (!container) return;

        const total = currentDecisions.length;
        const accepted = currentDecisions.filter(i => i.result === 'accepted').length;
        const rejected = currentDecisions.filter(i => i.result === 'rejected').length;
        const acceptedPercentage = total > 0 ? Math.round((accepted / total) * 100) : 0;
        const rejectedPercentage = total > 0 ? Math.round((rejected / total) * 100) : 0;

        container.innerHTML = `
            <div class="stat-card" style="--stat-color: #10b981;">
                <div class="stat-badge"><i class="fa-solid fa-check"></i> ${acceptedPercentage}%</div>
                <div class="stat-card-wrapper">
                    <div class="stat-icon">
                        <i class="fa-solid fa-user-check"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${accepted}</div>
                        <div class="stat-label">المقبولين</div>
                    </div>
                </div>
            </div>
            <div class="stat-card" style="--stat-color: #ef4444;">
                <div class="stat-badge"><i class="fa-solid fa-times"></i> ${rejectedPercentage}%</div>
                <div class="stat-card-wrapper">
                    <div class="stat-icon">
                        <i class="fa-solid fa-user-xmark"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${rejected}</div>
                        <div class="stat-label">المرفوضين</div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * ربط أحداث قسم قرارات العضوية
     */
    function bindDecisionsEvents() {
        const searchInput = document.getElementById('decisionsSearchInput');
        const statusFilter = document.getElementById('decisionsStatusFilter');
        const committeeFilter = document.getElementById('decisionsCommitteeFilter');
        // إزالة المستمعات القديمة أولاً
        if (searchInput) {
            const newSearchInput = searchInput.cloneNode(true);
            searchInput.parentNode.replaceChild(newSearchInput, searchInput);
            newSearchInput.addEventListener('input', renderDecisionsTable);
        }

        if (statusFilter) {
            const newStatusFilter = statusFilter.cloneNode(true);
            statusFilter.parentNode.replaceChild(newStatusFilter, statusFilter);
            newStatusFilter.addEventListener('change', renderDecisionsTable);
        }

        if (committeeFilter) {
            const newCommitteeFilter = committeeFilter.cloneNode(true);
            committeeFilter.parentNode.replaceChild(newCommitteeFilter, committeeFilter);
            newCommitteeFilter.addEventListener('change', renderDecisionsTable);
        }

        // زر خيارات قائمة نتائج العضوية
        const decisionsOptionsBtn = document.getElementById('decisionsOptionsBtn');
        if (decisionsOptionsBtn) {
            let decisionsDropdown = document.getElementById('decisionsOptionsDropdown');
            if (decisionsDropdown) decisionsDropdown.remove();
            decisionsDropdown = document.createElement('div');
            decisionsDropdown.id = 'decisionsOptionsDropdown';
            decisionsDropdown.className = 'dropdown-menu';
            decisionsDropdown.innerHTML = `
                <button class="btn btn-slate btn-outline btn-block" data-action="refresh">
                    <i class="fa-solid fa-rotate"></i> تحديث
                </button>
                <button class="btn btn-primary btn-outline btn-block" data-action="export">
                    <i class="fa-solid fa-file-export"></i> تصدير البيانات
                </button>
            `;
            document.body.appendChild(decisionsDropdown);

            decisionsOptionsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = decisionsDropdown.classList.toggle('show');
                if (isOpen) {
                    const rect = decisionsOptionsBtn.getBoundingClientRect();
                    decisionsDropdown.style.top = (rect.bottom + 6) + 'px';
                    decisionsDropdown.style.left = rect.left + 'px';
                }
            });

            decisionsDropdown.addEventListener('click', (e) => {
                const actionBtn = e.target.closest('[data-action]');
                if (!actionBtn) return;
                decisionsDropdown.classList.remove('show');
                if (actionBtn.dataset.action === 'export') {
                    exportDecisions();
                } else if (actionBtn.dataset.action === 'refresh') {
                    loadMembershipDecisions();
                }
            });

            document.addEventListener('click', (e) => {
                if (!e.target.closest('#decisionsOptionsBtn') && !e.target.closest('#decisionsOptionsDropdown')) {
                    decisionsDropdown.classList.remove('show');
                }
            });
        }
    }

    /**
     * تصدير قرارات العضوية
     */
    function exportDecisions() {
        if (currentDecisions.length === 0) {
            showNotification('لا توجد بيانات للتصدير', 'warning');
            return;
        }

        // استخراج اللجان المتوفرة من البيانات الحالية
        const committees = [...new Set(currentDecisions.map(d => d.application?.preferred_committee).filter(Boolean))].sort();

        const committeeCheckboxes = committees.map(c => `
            <label class="form-checkbox">
                <input type="checkbox" value="${escapeHtml(c)}" data-export-committee>
                <span class="form-checkbox-label">${escapeHtml(c)}</span>
            </label>
        `).join('');

        const allColumns = [
            { key: 'full_name', label: 'الاسم', checked: true },
            { key: 'email', label: 'البريد الإلكتروني', checked: true },
            { key: 'phone', label: 'الهاتف', checked: true },
            { key: 'preferred_committee', label: 'اللجنة المفضلة', checked: true },
            { key: 'interview_date', label: 'تاريخ المقابلة', checked: true },
            { key: 'result', label: 'النتيجة', checked: true },
            { key: 'decided_at', label: 'تاريخ القرار', checked: true },
            { key: 'interviewer_notes', label: 'ملاحظات المقابل', checked: false },
            { key: 'result_notes', label: 'ملاحظات النتيجة', checked: false }
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
                    <div class="export-columns-grid" id="exportDecCommitteeCheckboxes">
                        ${committeeCheckboxes}
                    </div>
                </div>
                <hr class="modal-divider">
                <div class="form-group full-width">
                    <label class="form-label"><span class="label-icon"><i class="fa-solid fa-scale-balanced"></i></span> القرار</label>
                    <select id="exportDecResultFilter" class="form-select">
                        <option value="">جميع القرارات</option>
                        <option value="accepted">مقبول نهائياً</option>
                        <option value="rejected">مرفوض نهائياً</option>
                    </select>
                </div>
                <hr class="modal-divider">
                <div class="form-group full-width">
                    <label class="form-label"><span class="label-icon"><i class="fa-solid fa-table-columns"></i></span> الأعمدة المطلوبة</label>
                    <div class="export-columns-grid">
                        ${columnsHtml}
                    </div>
                </div>
                <div class="form-group full-width" id="exportDecPreviewCount">
                    <small><i class="fa-solid fa-circle-info"></i> سيتم تصدير <strong>${currentDecisions.length}</strong> سجل</small>
                </div>
            </div>
        `;

        const footer = `
            <button class="btn btn-outline" onclick="closeModal()">
                <i class="fa-solid fa-times"></i> إلغاء
            </button>
            <button class="btn btn-primary" id="exportDecConfirmBtn">
                <i class="fa-solid fa-file-export"></i> تصدير CSV
            </button>
        `;

        window.openModal('تصدير نتائج المقابلات', formHtml, {
            icon: 'fa-file-export',
            footer: footer,
            size: 'md',
            onOpen: () => {
                const committeeContainer = document.getElementById('exportDecCommitteeCheckboxes');
                const resultEl = document.getElementById('exportDecResultFilter');
                const previewEl = document.getElementById('exportDecPreviewCount');

                function getSelectedCommittees() {
                    return Array.from(committeeContainer.querySelectorAll('input[data-export-committee]:checked')).map(cb => cb.value);
                }

                function getFilteredData() {
                    const selectedCommittees = getSelectedCommittees();
                    const result = resultEl.value;

                    return currentDecisions.filter(item => {
                        if (selectedCommittees.length > 0 && !selectedCommittees.includes(item.application?.preferred_committee)) return false;
                        if (result && item.result !== result) return false;
                        return true;
                    });
                }

                function updatePreview() {
                    const count = getFilteredData().length;
                    previewEl.innerHTML = `<small><i class="fa-solid fa-circle-info"></i> سيتم تصدير <strong>${count}</strong> سجل</small>`;
                }

                committeeContainer.addEventListener('change', updatePreview);
                resultEl.addEventListener('change', updatePreview);

                document.getElementById('exportDecConfirmBtn').addEventListener('click', () => {
                    const filtered = getFilteredData();
                    if (filtered.length === 0) {
                        showNotification('لا توجد بيانات مطابقة للتصدير', 'warning');
                        return;
                    }

                    const checkboxes = document.querySelectorAll('input[data-export-column]:checked');
                    const selectedKeys = Array.from(checkboxes).map(cb => cb.value);

                    if (selectedKeys.length === 0) {
                        showNotification('يرجى اختيار عمود واحد على الأقل', 'warning');
                        return;
                    }

                    const columnMap = {
                        full_name: { header: 'الاسم', get: d => d.application?.full_name || '' },
                        email: { header: 'البريد الإلكتروني', get: d => d.application?.email || '' },
                        phone: { header: 'الهاتف', get: d => d.application?.phone || '' },
                        preferred_committee: { header: 'اللجنة المفضلة', get: d => d.application?.preferred_committee || '' },
                        interview_date: { header: 'تاريخ المقابلة', get: d => d.interview_date ? new Date(d.interview_date).toLocaleDateString('ar-SA') : '-' },
                        result: { header: 'النتيجة', get: d => d.result === 'accepted' ? 'مقبول' : 'مرفوض' },
                        decided_at: { header: 'تاريخ القرار', get: d => d.decided_at ? new Date(d.decided_at).toLocaleDateString('ar-SA') : '-' },
                        interviewer_notes: { header: 'ملاحظات المقابل', get: d => d.interviewer_notes || '' },
                        result_notes: { header: 'ملاحظات النتيجة', get: d => d.result_notes || '' }
                    };

                    const headers = selectedKeys.map(k => columnMap[k].header);
                    const rows = filtered.map(item => selectedKeys.map(k => columnMap[k].get(item)));

                    const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
                    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = `نتائج_المقابلات_${new Date().toISOString().split('T')[0]}.csv`;
                    a.click();

                    closeModal();
                    showNotification(`تم تصدير ${filtered.length} سجل بنجاح`, 'success');
                });
            }
        });
    }

    /**
     * دالة مساعدة لتنظيف النصوص من HTML
     */
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * دالة مساعدة لعرض حالة التحميل
     */
    function showLoading(container) {
        if (container) {
            container.innerHTML = '<p class="text-center text-muted"><i class="fa-solid fa-spinner fa-spin"></i> جاري التحميل...</p>';
        }
    }

    /**
     * دالة مساعدة لعرض الإشعارات
     */
    function showNotification(message, type) {
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.log(`[${type}] ${message}`);
        }
    }

    // تصدير الدوال للاستخدام الخارجي
    window.membershipDecisions = {
        load: loadMembershipDecisions
    };

})();
