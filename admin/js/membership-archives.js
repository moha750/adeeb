// =====================================================
// نظام إدارة أرشيف التسجيل
// =====================================================

let currentUser = null;
let archivedCycles = [];
let currentCycleDetails = null;

// =====================================================
// التهيئة
// =====================================================

async function initArchivesManager(user) {
    currentUser = user;
    await loadArchivedCycles();
    bindArchiveEvents();
}

// =====================================================
// تحميل الدورات المؤرشفة
// =====================================================

async function loadArchivedCycles() {
    try {
        const container = document.getElementById('archivesTable');
        if (!container) return;

        showLoading(container);

        const { data, error } = await window.sbClient
            .from('archived_membership_cycles')
            .select('*')
            .order('archived_at', { ascending: false });

        if (error) throw error;

        archivedCycles = data || [];

        updateArchivesStatistics();
        renderArchivesTable();
    } catch (error) {
        console.error('خطأ في تحميل الأرشيف:', error);
        showNotification('خطأ في تحميل الأرشيف', 'error');
    }
}

// =====================================================
// عرض جدول الأرشيف
// =====================================================

function renderArchivesTable() {
    const container = document.getElementById('archivesTable');
    if (!container) return;

    if (archivedCycles.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-box-archive"></i>
                <h3>لا توجد دورات مؤرشفة</h3>
                <p>لم يتم أرشفة أي دورة تسجيل بعد</p>
            </div>
        `;
        return;
    }

    const html = `
        <div class="applications-cards-grid">
            ${archivedCycles.map(cycle => renderCycleCard(cycle)).join('')}
        </div>
    `;

    container.innerHTML = html;
}

// =====================================================
// عرض بطاقة دورة
// =====================================================

function renderCycleCard(cycle) {
    const stats = cycle.detailed_stats || {};
    const registrationStats = stats.registration || {};
    const reviewStats = stats.review || {};
    const interviewsStats = stats.interviews || {};
    const resultsStats = stats.results || {};

    const seasonNames = {
        spring: 'ربيع',
        summer: 'صيف',
        fall: 'خريف',
        winter: 'شتاء'
    };

    const seasonName = seasonNames[cycle.cycle_season] || cycle.cycle_season;
    const archivedDate = new Date(cycle.archived_at).toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return `
        <div class="archive-card" data-cycle-id="${cycle.id}">
            <div class="archive-card-header">
                <div class="archive-card-title">
                    <i class="fa-solid fa-box-archive"></i>
                    <div>
                        <h3>${cycle.cycle_name}</h3>
                        <p class="archive-card-subtitle">${seasonName} ${cycle.cycle_year}</p>
                    </div>
                </div>
                <div class="archive-card-date">
                    <i class="fa-solid fa-calendar"></i>
                    <span>${archivedDate}</span>
                </div>
            </div>

            ${cycle.description ? `
                <div class="archive-card-description">
                    <p>${cycle.description}</p>
                </div>
            ` : ''}

            <div class="archive-stats-grid">
                <!-- باب التسجيل -->
                <div class="archive-stat-section">
                    <div class="archive-stat-header">
                        <i class="fa-solid fa-door-open"></i>
                        <span>باب التسجيل</span>
                    </div>
                    <div class="archive-stat-items">
                        <div class="archive-stat-item">
                            <span class="stat-label">إجمالي الطلبات</span>
                            <span class="stat-value">${registrationStats.total_applications || 0}</span>
                        </div>
                        <div class="archive-stat-item">
                            <span class="stat-label">قيد المراجعة</span>
                            <span class="stat-value">${registrationStats.pending_review || 0}</span>
                        </div>
                        <div class="archive-stat-item">
                            <span class="stat-label">منسحب</span>
                            <span class="stat-value">${registrationStats.withdrawn || 0}</span>
                        </div>
                    </div>
                </div>

                <!-- الفرز المبدئي -->
                <div class="archive-stat-section">
                    <div class="archive-stat-header">
                        <i class="fa-solid fa-filter"></i>
                        <span>الفرز المبدئي</span>
                    </div>
                    <div class="archive-stat-items">
                        <div class="archive-stat-item">
                            <span class="stat-label">مقبول للمقابلة</span>
                            <span class="stat-value stat-success">${reviewStats.approved_for_interview || 0}</span>
                        </div>
                        <div class="archive-stat-item">
                            <span class="stat-label">مرفوض في المراجعة</span>
                            <span class="stat-value stat-danger">${reviewStats.rejected_in_review || 0}</span>
                        </div>
                    </div>
                </div>

                <!-- المقابلات الشخصية -->
                <div class="archive-stat-section">
                    <div class="archive-stat-header">
                        <i class="fa-solid fa-comments"></i>
                        <span>المقابلات الشخصية</span>
                    </div>
                    <div class="archive-stat-items">
                        <div class="archive-stat-item">
                            <span class="stat-label">إجمالي المقابلات</span>
                            <span class="stat-value">${interviewsStats.total_interviews || 0}</span>
                        </div>
                        <div class="archive-stat-item">
                            <span class="stat-label">مقابلات مكتملة</span>
                            <span class="stat-value">${interviewsStats.completed_interviews || 0}</span>
                        </div>
                        <div class="archive-stat-item">
                            <span class="stat-label">في البرزخ</span>
                            <span class="stat-value">${interviewsStats.in_barzakh || 0}</span>
                        </div>
                        <div class="archive-stat-item">
                            <span class="stat-label">الجلسات</span>
                            <span class="stat-value">${interviewsStats.total_sessions || 0}</span>
                        </div>
                    </div>
                </div>

                <!-- نتائج العضوية -->
                <div class="archive-stat-section">
                    <div class="archive-stat-header">
                        <i class="fa-solid fa-user-check"></i>
                        <span>نتائج العضوية</span>
                    </div>
                    <div class="archive-stat-items">
                        <div class="archive-stat-item">
                            <span class="stat-label">مقبول</span>
                            <span class="stat-value stat-success">${resultsStats.accepted || 0}</span>
                        </div>
                        <div class="archive-stat-item">
                            <span class="stat-label">مرفوض</span>
                            <span class="stat-value stat-danger">${resultsStats.rejected || 0}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="archive-card-actions">
                <button class="btn btn--primary btn--sm" onclick="window.archivesManager.viewCycleDetails('${cycle.id}')">
                    <i class="fa-solid fa-eye"></i>
                    عرض التفاصيل الكاملة
                </button>
                <button class="btn btn--outline btn--outline-primary btn--sm" onclick="window.archivesManager.exportCycle('${cycle.id}')">
                    <i class="fa-solid fa-download"></i>
                    تصدير
                </button>
            </div>
        </div>
    `;
}

// =====================================================
// عرض تفاصيل دورة
// =====================================================

async function viewCycleDetails(cycleId) {
    try {
        showLoading(true);

        const { data, error } = await window.sbClient
            .rpc('get_archived_cycle_details', { p_cycle_id: cycleId });

        if (error) throw error;

        if (!data || data.length === 0) {
            showNotification('لم يتم العثور على تفاصيل الدورة', 'error');
            return;
        }

        currentCycleDetails = data[0];
        showCycleDetailsModal();
    } catch (error) {
        console.error('خطأ في تحميل تفاصيل الدورة:', error);
        showNotification('خطأ في تحميل تفاصيل الدورة', 'error');
    } finally {
        showLoading(false);
    }
}

// =====================================================
// عرض نافذة تفاصيل الدورة
// =====================================================

function showCycleDetailsModal() {
    if (!currentCycleDetails) return;

    const cycle = currentCycleDetails.cycle_info;
    const applications = currentCycleDetails.applications || [];
    const interviews = currentCycleDetails.interviews || [];
    const sessions = currentCycleDetails.sessions || [];

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content modal-large">
            <div class="modal-header">
                <h2>
                    <i class="fa-solid fa-box-archive"></i>
                    ${cycle.cycle_name}
                </h2>
                <button class="btn-icon" onclick="this.closest('.modal-overlay').remove()">
                    <i class="fa-solid fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="tabs-container">
                    <div class="tabs-header">
                        <button class="tab-btn active" data-tab="overview">نظرة عامة</button>
                        <button class="tab-btn" data-tab="applications">الطلبات (${applications.length})</button>
                        <button class="tab-btn" data-tab="interviews">المقابلات (${interviews.length})</button>
                        <button class="tab-btn" data-tab="sessions">الجلسات (${sessions.length})</button>
                    </div>
                    <div class="tabs-content">
                        <div class="tab-pane active" id="tab-overview">
                            ${renderOverviewTab(cycle)}
                        </div>
                        <div class="tab-pane" id="tab-applications">
                            ${renderApplicationsTab(applications)}
                        </div>
                        <div class="tab-pane" id="tab-interviews">
                            ${renderInterviewsTab(interviews)}
                        </div>
                        <div class="tab-pane" id="tab-sessions">
                            ${renderSessionsTab(sessions)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            modal.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            modal.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            modal.querySelector(`#tab-${tabName}`).classList.add('active');
        });
    });
}

// =====================================================
// تبويب النظرة العامة
// =====================================================

function renderOverviewTab(cycle) {
    const stats = cycle.detailed_stats || {};
    
    return `
        <div class="overview-content">
            <div class="info-section">
                <h3><i class="fa-solid fa-info-circle"></i> معلومات الدورة</h3>
                <div class="info-grid">
                    <div class="info-item">
                        <span class="info-label">اسم الدورة</span>
                        <span class="info-value">${cycle.cycle_name}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">السنة</span>
                        <span class="info-value">${cycle.cycle_year}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">الموسم</span>
                        <span class="info-value">${cycle.cycle_season}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">تاريخ الأرشفة</span>
                        <span class="info-value">${new Date(cycle.archived_at).toLocaleDateString('ar-SA')}</span>
                    </div>
                </div>
            </div>

            <div class="stats-summary">
                <h3><i class="fa-solid fa-chart-bar"></i> الإحصائيات الشاملة</h3>
                <div class="summary-grid">
                    ${renderStatsSummary(stats)}
                </div>
            </div>
        </div>
    `;
}

function renderStatsSummary(stats) {
    const colors = ['#3d8fd6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#14b8a6'];
    let colorIndex = 0;

    const allStats = [
        { label: 'إجمالي الطلبات', value: stats.registration?.total_applications || 0, icon: 'fa-clipboard-list' },
        { label: 'قيد المراجعة', value: stats.registration?.pending_review || 0, icon: 'fa-hourglass-half' },
        { label: 'مقبول للمقابلة', value: stats.review?.approved_for_interview || 0, icon: 'fa-user-check' },
        { label: 'مرفوض في المراجعة', value: stats.review?.rejected_in_review || 0, icon: 'fa-user-xmark' },
        { label: 'إجمالي المقابلات', value: stats.interviews?.total_interviews || 0, icon: 'fa-comments' },
        { label: 'في البرزخ', value: stats.interviews?.in_barzakh || 0, icon: 'fa-pause-circle' },
        { label: 'مقبول نهائياً', value: stats.results?.accepted || 0, icon: 'fa-circle-check' },
        { label: 'مرفوض نهائياً', value: stats.results?.rejected || 0, icon: 'fa-circle-xmark' }
    ];

    return `<div class="stats-grid">${allStats.map(stat => {
        const color = colors[colorIndex % colors.length];
        colorIndex++;
        return `
            <div class="stat-card" data-color="${color}">
                <div class="stat-card-wrapper">
                    <div class="stat-icon">
                        <i class="fa-solid ${stat.icon}"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${stat.value}</div>
                        <div class="stat-label">${stat.label}</div>
                    </div>
                </div>
            </div>
        `;
    }).join('')}</div>`;
}

// =====================================================
// تبويب الطلبات
// =====================================================

function renderApplicationsTab(applications) {
    if (applications.length === 0) {
        return '<div class="empty-state"><p>لا توجد طلبات</p></div>';
    }

    return `
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>الاسم</th>
                        <th>البريد الإلكتروني</th>
                        <th>الهاتف</th>
                        <th>الحالة</th>
                        <th>تاريخ التقديم</th>
                    </tr>
                </thead>
                <tbody>
                    ${applications.map(app => `
                        <tr>
                            <td>${app.full_name}</td>
                            <td>${app.email}</td>
                            <td>${app.phone}</td>
                            <td><span class="badge badge-${getStatusColor(app.status)}">${getStatusLabel(app.status)}</span></td>
                            <td>${new Date(app.created_at).toLocaleDateString('ar-SA')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// =====================================================
// تبويب المقابلات
// =====================================================

function renderInterviewsTab(interviews) {
    if (interviews.length === 0) {
        return '<div class="empty-state"><p>لا توجد مقابلات</p></div>';
    }

    return `
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>المقابل</th>
                        <th>تاريخ المقابلة</th>
                        <th>الحالة</th>
                        <th>النتيجة</th>
                        <th>التقييم</th>
                    </tr>
                </thead>
                <tbody>
                    ${interviews.map(interview => `
                        <tr>
                            <td>${interview.interviewer_name || 'غير محدد'}</td>
                            <td>${interview.interview_date ? new Date(interview.interview_date).toLocaleDateString('ar-SA') : 'غير محدد'}</td>
                            <td><span class="badge badge-${getStatusColor(interview.status)}">${getStatusLabel(interview.status)}</span></td>
                            <td>${interview.result ? `<span class="badge badge-${getResultColor(interview.result)}">${getResultLabel(interview.result)}</span>` : '-'}</td>
                            <td>${interview.rating ? '⭐'.repeat(interview.rating) : '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// =====================================================
// تبويب الجلسات
// =====================================================

function renderSessionsTab(sessions) {
    if (sessions.length === 0) {
        return '<div class="empty-state"><p>لا توجد جلسات</p></div>';
    }

    return `
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>اسم الجلسة</th>
                        <th>التاريخ</th>
                        <th>الموقع</th>
                        <th>الفترات</th>
                        <th>المحجوزة</th>
                        <th>المكتملة</th>
                    </tr>
                </thead>
                <tbody>
                    ${sessions.map(session => `
                        <tr>
                            <td>${session.session_name}</td>
                            <td>${new Date(session.session_date).toLocaleDateString('ar-SA')}</td>
                            <td>${session.location || '-'}</td>
                            <td>${session.total_slots || 0}</td>
                            <td>${session.booked_slots || 0}</td>
                            <td>${session.completed_interviews || 0}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// =====================================================
// تصدير دورة
// =====================================================

async function exportCycle(cycleId) {
    try {
        showLoading(true);

        const { data, error } = await window.sbClient
            .rpc('get_archived_cycle_details', { p_cycle_id: cycleId });

        if (error) throw error;

        const cycleData = data[0];
        const cycle = cycleData.cycle_info;

        const exportData = {
            cycle_info: cycle,
            applications: cycleData.applications || [],
            interviews: cycleData.interviews || [],
            sessions: cycleData.sessions || []
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${cycle.cycle_name.replace(/\s+/g, '_')}_${new Date().getTime()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        showNotification('تم تصدير الدورة بنجاح', 'success');
    } catch (error) {
        console.error('خطأ في تصدير الدورة:', error);
        showNotification('خطأ في تصدير الدورة', 'error');
    } finally {
        showLoading(false);
    }
}

// =====================================================
// دوال مساعدة
// =====================================================

function getStatusColor(status) {
    const colors = {
        'pending': 'warning',
        'approved_for_interview': 'info',
        'rejected': 'danger',
        'withdrawn': 'secondary',
        'scheduled': 'info',
        'completed': 'success'
    };
    return colors[status] || 'secondary';
}

function getStatusLabel(status) {
    const labels = {
        'pending': 'قيد المراجعة',
        'approved_for_interview': 'مقبول للمقابلة',
        'rejected': 'مرفوض',
        'withdrawn': 'منسحب',
        'scheduled': 'مجدولة',
        'completed': 'مكتملة'
    };
    return labels[status] || status;
}

function getResultColor(result) {
    const colors = {
        'accepted': 'success',
        'rejected': 'danger',
        'pending': 'warning'
    };
    return colors[result] || 'secondary';
}

function getResultLabel(result) {
    const labels = {
        'accepted': 'مقبول',
        'rejected': 'مرفوض',
        'pending': 'قيد الانتظار'
    };
    return labels[result] || result;
}

function showLoading(show) {
    const loadingBar = document.getElementById('loadingBar');
    if (loadingBar) {
        loadingBar.style.display = show ? 'block' : 'none';
    }
}

function showNotification(message, type = 'info') {
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
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function bindArchiveEvents() {
    // يمكن إضافة مستمعات أحداث إضافية هنا
}

// =====================================================
// تحديث إحصائيات الأرشيف
// =====================================================

function updateArchivesStatistics() {
    const container = document.getElementById('archivesStatsGrid');
    if (!container) return;

    const totalArchives = archivedCycles.length;
    let totalApplications = 0;
    let totalAccepted = 0;
    let totalRejected = 0;

    archivedCycles.forEach(cycle => {
        const stats = cycle.detailed_stats || {};
        totalApplications += (stats.registration?.total_applications || 0);
        totalAccepted += (stats.results?.accepted || 0);
        totalRejected += (stats.results?.rejected || 0);
    });

    const acceptanceRate = totalApplications > 0 
        ? Math.round((totalAccepted / totalApplications) * 100) 
        : 0;

    container.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card stat-card--blue">
                <div class="stat-card-wrapper">
                    <div class="stat-icon">
                        <i class="fa-solid fa-folder-open"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${totalArchives}</div>
                        <div class="stat-label">الدورات المؤرشفة</div>
                    </div>
                </div>
            </div>
            <div class="stat-card stat-card--green">
                <div class="stat-card-wrapper">
                    <div class="stat-icon">
                        <i class="fa-solid fa-users"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${totalApplications}</div>
                        <div class="stat-label">إجمالي الطلبات</div>
                    </div>
                </div>
            </div>
            <div class="stat-card stat-card--purple">
                <div class="stat-card-wrapper">
                    <div class="stat-icon">
                        <i class="fa-solid fa-user-check"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${totalAccepted}</div>
                        <div class="stat-label">إجمالي المقبولين</div>
                    </div>
                </div>
            </div>
            <div class="stat-card stat-card--yellow">
                <div class="stat-badge"><i class="fa-solid fa-percentage"></i> ${acceptanceRate}%</div>
                <div class="stat-card-wrapper">
                    <div class="stat-icon">
                        <i class="fa-solid fa-chart-line"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${acceptanceRate}%</div>
                        <div class="stat-label">معدل القبول</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// =====================================================
// تصدير الوحدة
// =====================================================

window.archivesManager = {
    init: initArchivesManager,
    loadArchivedCycles,
    viewCycleDetails,
    exportCycle
};
