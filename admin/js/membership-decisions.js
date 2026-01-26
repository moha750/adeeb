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
                    <i class="fa-solid fa-inbox"></i>
                    <p>لا توجد قرارات</p>
                </div>
            `;
            return;
        }

        let html = '<div class="applications-cards-grid">';

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
                ? '<span class="status-badge status-accepted">مقبول نهائياً</span>'
                : '<span class="status-badge status-rejected">مرفوض نهائياً</span>';

            const avatarIcon = interview.result === 'accepted' 
                ? '<i class="fa-solid fa-user-check"></i>'
                : '<i class="fa-solid fa-user-xmark"></i>';

            html += `
                <div class="application-card">
                    <div class="application-card-header">
                        <div class="applicant-info">
                            <div class="applicant-avatar ${interview.result === 'accepted' ? 'avatar-accepted' : 'avatar-rejected'}">
                                ${avatarIcon}
                            </div>
                            <div class="applicant-details">
                                <h3 class="applicant-name">${escapeHtml(interview.application?.full_name || 'غير محدد')}</h3>
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
                                    <span class="info-value">${escapeHtml(interview.application?.email || 'غير محدد')}</span>
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
                                <i class="fa-solid fa-calendar-check"></i>
                                <div class="info-content">
                                    <span class="info-label">تاريخ المقابلة</span>
                                    <span class="info-value">${interviewDate}${interviewTime ? ' - ' + interviewTime : ''}</span>
                                </div>
                            </div>
                            
                            <div class="info-item">
                                <i class="fa-solid fa-clipboard-check"></i>
                                <div class="info-content">
                                    <span class="info-label">تاريخ القرار</span>
                                    <span class="info-value">${decidedDate}</span>
                                </div>
                            </div>
                            
                            ${interview.notes ? `
                                <div class="info-item full-width">
                                    <i class="fa-solid fa-note-sticky"></i>
                                    <div class="info-content">
                                        <span class="info-label">ملاحظات</span>
                                        <span class="info-value">${escapeHtml(interview.notes)}</span>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="application-card-footer">
                        <button class="btn-view-details" onclick="window.membershipManager.viewInterview('${interview.id}')">
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
        const total = currentDecisions.length;
        const accepted = currentDecisions.filter(i => i.result === 'accepted').length;
        const rejected = currentDecisions.filter(i => i.result === 'rejected').length;

        const totalEl = document.getElementById('totalDecisionsCount');
        const acceptedEl = document.getElementById('acceptedDecisionsCount');
        const rejectedEl = document.getElementById('rejectedDecisionsCount');

        if (totalEl) totalEl.textContent = total;
        if (acceptedEl) acceptedEl.textContent = accepted;
        if (rejectedEl) rejectedEl.textContent = rejected;
    }

    /**
     * ربط أحداث قسم قرارات العضوية
     */
    function bindDecisionsEvents() {
        const searchInput = document.getElementById('decisionsSearchInput');
        const statusFilter = document.getElementById('decisionsStatusFilter');
        const committeeFilter = document.getElementById('decisionsCommitteeFilter');
        const refreshBtn = document.getElementById('refreshDecisionsBtn');
        const exportBtn = document.getElementById('exportDecisionsBtn');

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

        if (refreshBtn) {
            refreshBtn.removeEventListener('click', loadMembershipDecisions);
            refreshBtn.addEventListener('click', loadMembershipDecisions);
        }

        if (exportBtn) {
            exportBtn.removeEventListener('click', exportDecisions);
            exportBtn.addEventListener('click', exportDecisions);
        }
    }

    /**
     * تصدير قرارات العضوية
     */
    function exportDecisions() {
        showNotification('جاري تطوير ميزة التصدير', 'info');
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
