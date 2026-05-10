/**
 * صفحة تفاصيل النشاط (drill-down) — أرشيف موحّد لنشاط واحد
 * يعمل ضمن قسم #activities-archive-section في لوحة التحكم.
 *
 * يستخدم أنماط النظام: stats-grid, stat-card, card, data-table,
 * uc-card, uc-grid, uc-badge, filters-bar, empty-state.
 *
 * يعتمد على RPC: get_activity_full_details(p_activity_id) — يرجع {activity, stats, reservations[]}.
 * الصلاحية: admin (role_level >= 8).
 */

class ActivityArchiveManager {
    constructor() {
        this.activityId = null;
        this.data = null;
        this.activeTab = 'overview';
        this.rosterFilter = 'all';
        this.rosterSearch = '';
        this.charts = {};
        console.log('ActivityArchiveManager: Initialized');
    }

    async openArchive(activityId) {
        if (!activityId) return;
        this.activityId = activityId;
        this.data = null;
        this.activeTab = 'overview';
        this.rosterFilter = 'all';
        this.rosterSearch = '';

        if (typeof window.navigateToSection === 'function') {
            window.navigateToSection('activities-archive-section');
        }

        this.attachStaticListeners();
        this.renderLoading();
        await this.loadDetails();
    }

    attachStaticListeners() {
        if (this._staticListenersAttached) return;
        this._staticListenersAttached = true;
        document.getElementById('archiveBackBtn')?.addEventListener('click', () => {
            if (typeof window.navigateToSection === 'function') {
                window.navigateToSection('activities-list-section');
            }
        });
    }

    async loadDetails() {
        try {
            const sb = window.sbClient;
            if (!sb) throw new Error('CLIENT_NOT_READY');

            const { data, error } = await sb.rpc('get_activity_full_details', {
                p_activity_id: this.activityId,
            });
            if (error) throw error;

            this.data = data || null;
            this.render();
        } catch (err) {
            console.error('ActivityArchiveManager: loadDetails error', err);
            this.renderError(this.humanizeError(err.message || String(err)));
        }
    }

    render() {
        if (!this.data) return;
        this.renderHeader();
        this.renderAlerts();
        this.renderStats();
        this.renderTabs();
        this.renderActivePanel();
    }

    renderLoading() {
        const root = document.getElementById('archiveContent');
        if (root) {
            root.innerHTML = `
                <div class="card">
                    <div class="card-body">
                        <div class="empty-state">
                            <div class="empty-state__icon"><i class="fa-solid fa-spinner fa-spin"></i></div>
                            <p class="empty-state__title">جاري تحميل تفاصيل النشاط…</p>
                        </div>
                    </div>
                </div>`;
        }
    }

    renderError(msg) {
        const root = document.getElementById('archiveContent');
        if (root) {
            root.innerHTML = `
                <div class="card">
                    <div class="card-body">
                        <div class="empty-state">
                            <div class="empty-state__icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
                            <p class="empty-state__title">${this.escapeHtml(msg)}</p>
                        </div>
                    </div>
                </div>`;
        }
    }

    // ============================================
    // 1) الشريط العلوي — كرت بنمط uc-card
    // ============================================
    renderHeader() {
        const a = this.data.activity;
        const dateStr = a.activity_date
            ? new Date(a.activity_date).toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
            : '';
        const timeStr = `${this.formatTime(a.start_time)}${a.end_time ? ' — ' + this.formatTime(a.end_time) : ''}`;

        const isPast = this.isActivityPast(a);
        let stateBadge, cardVariant;
        if (a.is_cancelled) {
            stateBadge = `<span class="uc-card__badge"><i class="fa-solid fa-ban"></i> ملغي</span>`;
            cardVariant = 'uc-card--danger';
        } else if (isPast) {
            stateBadge = `<span class="uc-card__badge"><i class="fa-solid fa-clock-rotate-left"></i> مُنتهي</span>`;
            cardVariant = 'uc-card--warning';
        } else if (a.is_published) {
            stateBadge = `<span class="uc-card__badge"><i class="fa-solid fa-circle-check"></i> منشور</span>`;
            cardVariant = 'uc-card--success';
        } else {
            stateBadge = `<span class="uc-card__badge"><i class="fa-solid fa-pen"></i> مسودة</span>`;
            cardVariant = 'uc-card--purple';
        }

        const root = document.getElementById('archiveContent');
        if (!root) return;

        root.innerHTML = `
            <div class="uc-card ${cardVariant}" style="margin-bottom:1.25rem;">
                <div class="uc-card__header">
                    <div class="uc-card__header-inner">
                        <div class="uc-card__icon">
                            ${a.cover_image_url
                                ? `<img src="${this.escapeHtml(a.cover_image_url)}" alt="" />`
                                : `<i class="fa-solid fa-calendar-day"></i>`
                            }
                        </div>
                        <div class="uc-card__header-info">
                            <h3 class="uc-card__title">${this.escapeHtml(a.name || '—')}</h3>
                            ${stateBadge}
                        </div>
                    </div>
                </div>
                <div class="uc-card__body">
                    <div class="uc-card__info-item">
                        <div class="uc-card__info-icon"><i class="fa-regular fa-calendar"></i></div>
                        <div class="uc-card__info-content">
                            <div class="uc-card__info-label">التاريخ</div>
                            <div class="uc-card__info-value">${this.escapeHtml(dateStr)}</div>
                        </div>
                    </div>
                    <div class="uc-card__info-item">
                        <div class="uc-card__info-icon"><i class="fa-regular fa-clock"></i></div>
                        <div class="uc-card__info-content">
                            <div class="uc-card__info-label">الوقت</div>
                            <div class="uc-card__info-value">${this.escapeHtml(timeStr)}</div>
                        </div>
                    </div>
                    ${a.location ? `
                    <div class="uc-card__info-item">
                        <div class="uc-card__info-icon"><i class="fa-solid fa-location-dot"></i></div>
                        <div class="uc-card__info-content">
                            <div class="uc-card__info-label">المكان</div>
                            <div class="uc-card__info-value">${this.escapeHtml(a.location)}</div>
                        </div>
                    </div>` : ''}
                    <div style="margin-top:0.5rem;padding-top:0.75rem;border-top:1px dashed rgba(var(--_uc-color-rgb), 0.18);">
                        <button class="btn btn-warning btn-block" id="archiveExportFullBtn" type="button" title="تنزيل ملف Excel منسَّق يحوي كامل بيانات النشاط بالتفصيل">
                            <i class="fa-solid fa-file-excel"></i>
                            تصدير شامل لبيانات النشاط (Excel)
                        </button>
                    </div>
                </div>
            </div>
            <div id="archiveAlerts" class="aa-alerts"></div>
            <div id="archiveStats" class="stats-grid"></div>
            <div id="archiveTabs" class="settings-segmented-nav"></div>
            <div id="archivePanel"></div>
        `;

        // ربط مستمع زرّ التصدير الشامل (يُعاد إنشاؤه مع كلّ render)
        document.getElementById('archiveExportFullBtn')?.addEventListener('click', () => this.exportFullXlsx());
    }

    // ============================================
    // 2) التنبيهات الذكية
    // ============================================
    renderAlerts() {
        const wrap = document.getElementById('archiveAlerts');
        if (!wrap) return;

        const s = this.data.stats || {};
        const a = this.data.activity || {};
        const alerts = [];

        const orphans = (this.data.reservations || []).filter(r =>
            r.attendance_status === 'attended' && !r.certificate_serial
        );
        if (orphans.length > 0) {
            alerts.push({
                type: 'danger',
                icon: 'fa-circle-exclamation',
                msg: `${orphans.length} شخص مسجَّل كحاضر بدون رقم شهادة (شذوذ في البيانات).`
            });
        }

        const isPast = this.isActivityPast(a);
        if (isPast && (s.pending_attendance_count | 0) > 0) {
            alerts.push({
                type: 'warning',
                icon: 'fa-clock',
                msg: `${s.pending_attendance_count} مسجَّل بانتظار التحضير.`
            });
        }

        const rate = (s.attendance_rate || 0);
        if (isPast && (s.registered_count | 0) > 0 && rate > 0.8) {
            alerts.push({
                type: 'success',
                icon: 'fa-trophy',
                msg: `نشاط ناجح: نسبة الحضور ${Math.round(rate * 100)}%.`
            });
        }

        wrap.innerHTML = alerts.map(al => `
            <div class="aa-alert aa-alert--${al.type}">
                <i class="fa-solid ${al.icon}"></i>
                <span>${this.escapeHtml(al.msg)}</span>
            </div>
        `).join('');
    }

    // ============================================
    // 3) الإحصائيات بنمط النظام
    // ============================================
    renderStats() {
        const wrap = document.getElementById('archiveStats');
        if (!wrap) return;
        const s = this.data.stats || {};

        const stats = [
            { label: 'مسجّلون',       value: s.registered_count | 0,         icon: 'fa-users',           color: '#3b82f6', rgb: '59, 130, 246' },
            { label: 'مؤكَّدو واتساب', value: s.whatsapp_confirmed_count | 0, icon: 'fa-whatsapp',        color: '#22c55e', rgb: '34, 197, 94', brand: true },
            { label: 'حاضرون',        value: s.attended_count | 0,           icon: 'fa-circle-check',    color: '#10b981', rgb: '16, 185, 129' },
            { label: 'غائبون',        value: s.no_show_count | 0,            icon: 'fa-circle-xmark',    color: '#ef4444', rgb: '239, 68, 68' },
            { label: 'نسبة الحضور',   value: `${Math.round((s.attendance_rate || 0) * 100)}%`, icon: 'fa-chart-pie', color: '#8b5cf6', rgb: '139, 92, 246' },
        ];

        wrap.innerHTML = stats.map(st => `
            <div class="stat-card" style="--stat-color: ${st.color}; --stat-color-rgb: ${st.rgb};">
                <div class="stat-card-wrapper">
                    <div class="stat-icon">
                        <i class="${st.brand ? 'fa-brands' : 'fa-solid'} ${st.icon}"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${this.escapeHtml(String(st.value))}</div>
                        <div class="stat-label">${this.escapeHtml(st.label)}</div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // ============================================
    // 4) التبويبات الداخلية بنمط أزرار النظام
    // ============================================
    renderTabs() {
        const wrap = document.getElementById('archiveTabs');
        if (!wrap) return;
        const s = this.data.stats || {};
        const certCount = s.certificates_issued_count | 0;
        const regCount = s.registered_count | 0;

        const tabs = [
            { id: 'overview',     label: 'نظرة عامة',  icon: 'fa-circle-info', count: null },
            { id: 'roster',       label: 'المسجّلون',  icon: 'fa-users',       count: regCount },
            { id: 'certificates', label: 'الشهادات',   icon: 'fa-award',       count: certCount },
        ];

        // البناء الأول: ننشئ الأزرار مرة واحدة فقط حتى لا تُهدم وتُعاد فيُلغى الـ CSS transition.
        if (!wrap._tabsBuilt) {
            wrap.innerHTML = tabs.map(t => {
                const isActive = this.activeTab === t.id;
                const cls = isActive ? 'settings-seg-btn active' : 'settings-seg-btn';
                const countHtml = t.count !== null
                    ? ` <span class="settings-seg-btn__count" data-count-for="${t.id}">${t.count}</span>`
                    : '';
                return `<button type="button" class="${cls}" data-aa-tab="${t.id}">
                    <span class="settings-seg-btn__icon"><i class="fa-solid ${t.icon}"></i></span>
                    <span class="settings-seg-btn__label">${this.escapeHtml(t.label)}${countHtml}</span>
                </button>`;
            }).join('');

            wrap.querySelectorAll('[data-aa-tab]').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (this.activeTab === btn.dataset.aaTab) return;
                    // تنظيف رسوم نظرة عامة قبل الانتقال لتبويب آخر
                    if (this.activeTab === 'overview') this.destroyOverviewCharts();
                    this.activeTab = btn.dataset.aaTab;
                    wrap.querySelectorAll('.settings-seg-btn').forEach(b => {
                        b.classList.toggle('active', b.dataset.aaTab === this.activeTab);
                    });
                    this.renderActivePanel();
                });
            });

            wrap._tabsBuilt = true;
        }

        // التحديثات اللاحقة: نكتفي بتزامن الحالة النشطة وقيم العدّادات.
        wrap.querySelectorAll('.settings-seg-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.aaTab === this.activeTab);
        });

        tabs.forEach(t => {
            if (t.count === null) return;
            const countEl = wrap.querySelector(`[data-count-for="${t.id}"]`);
            if (countEl) countEl.textContent = String(t.count);
        });
    }

    renderActivePanel() {
        if (this.activeTab === 'overview') return this.renderOverview();
        if (this.activeTab === 'roster') return this.renderRoster();
        if (this.activeTab === 'certificates') return this.renderCertificates();
    }

    // ============================================
    // 4a) نظرة عامة — analytics.css (charts-grid + top-pages-list + Chart.js)
    // ============================================
    renderOverview() {
        const panel = document.getElementById('archivePanel');
        if (!panel) return;

        // تنظيف رسوم سابقة قبل إعادة بناء الـ DOM
        this.destroyOverviewCharts();

        const a = this.data.activity || {};
        const s = this.data.stats || {};

        // حساب المقاييس
        const reservations    = this.data.reservations || [];
        const countNoShow     = (g) => reservations.filter(r => r.gender_at_booking === g && r.attendance_status === 'no_show').length;
        const maleSeats       = a.male_seats || 0;
        const femaleSeats     = a.female_seats || 0;
        const maleConfirmed   = this.countByGender('male', 'confirmed');
        const femaleConfirmed = this.countByGender('female', 'confirmed');
        const maleAttended    = this.countByGender('male', 'attended');
        const femaleAttended  = this.countByGender('female', 'attended');
        const maleNoShow      = countNoShow('male');
        const femaleNoShow    = countNoShow('female');
        const cancelledCount  = s.cancelled_count | 0;
        const certCount       = s.certificates_issued_count | 0;
        const totalConfirmed  = maleConfirmed + femaleConfirmed;
        const totalAttended   = maleAttended + femaleAttended;
        const noShowCount     = maleNoShow + femaleNoShow;
        const totalReservations = totalConfirmed + cancelledCount;

        // معلومات أساسية
        const items = [
            { icon: 'fa-tag',           label: 'النوع',         value: this.formatActivityType(a.activity_type) },
            { icon: 'fa-calendar-plus', label: 'تاريخ الإنشاء', value: a.created_at ? new Date(a.created_at).toLocaleDateString('ar-SA') : '—' },
        ];

        // إحصائيات بنمط top-page-item (مع شريط تقدّم)
        const buildStatRow = (icon, title, current, max, unit, hint) => {
            const pct = max > 0 ? Math.min(100, (current / max) * 100) : 0;
            const safePct = isFinite(pct) ? pct.toFixed(1) : '0.0';
            return `
                <div class="top-page-item">
                    <div class="top-page-rank"><i class="fa-solid ${icon}"></i></div>
                    <div class="top-page-info">
                        <h4 class="top-page-title">${this.escapeHtml(title)}</h4>
                        ${hint ? `<p class="top-page-path">${this.escapeHtml(hint)}</p>` : ''}
                        <div class="top-page-bar">
                            <div class="top-page-bar-fill" style="width:${safePct}%"></div>
                        </div>
                    </div>
                    <div class="top-page-stats">
                        <span class="top-page-visits">${this.escapeHtml(String(current))}${max > 0 ? ` / ${this.escapeHtml(String(max))}` : ''}</span>
                        <span class="top-page-label">${this.escapeHtml(unit)}</span>
                        <span class="top-page-unique">${safePct}%</span>
                    </div>
                </div>
            `;
        };

        const statRows = [
            // — تجميع حسب الرجال —
            buildStatRow('fa-mars',         'مقاعد الرجال',     maleConfirmed,   maleSeats,        'مسجَّل',  maleSeats > 0 ? `${maleConfirmed} من ${maleSeats} مقعد` : 'لا توجد مقاعد محدّدة'),
            buildStatRow('fa-user-check',   'الحاضرون من الرجال', maleAttended,    maleConfirmed,    'حاضر',    maleConfirmed > 0 ? `من ${maleConfirmed} مسجَّل` : ''),
            buildStatRow('fa-user-xmark',   'الغائبون من الرجال', maleNoShow,      maleConfirmed,    'غائب',    maleConfirmed > 0 ? `من ${maleConfirmed} مسجَّل` : ''),
            // — تجميع حسب النساء —
            buildStatRow('fa-venus',        'مقاعد النساء',     femaleConfirmed, femaleSeats,      'مسجَّلة', femaleSeats > 0 ? `${femaleConfirmed} من ${femaleSeats} مقعد` : 'لا توجد مقاعد محدّدة'),
            buildStatRow('fa-user-check',   'الحاضرات من النساء', femaleAttended,  femaleConfirmed,  'حاضرة',   femaleConfirmed > 0 ? `من ${femaleConfirmed} مسجَّلة` : ''),
            buildStatRow('fa-user-xmark',   'الغائبات من النساء', femaleNoShow,    femaleConfirmed,  'غائبة',   femaleConfirmed > 0 ? `من ${femaleConfirmed} مسجَّلة` : ''),
            // — إجمالي —
            buildStatRow('fa-ban',          'حجوزات ملغاة',     cancelledCount,  totalReservations,'حجز',     totalReservations > 0 ? `من إجمالي ${totalReservations} حجز` : ''),
            buildStatRow('fa-award',        'شهادات صادرة',     certCount,       totalAttended,    'شهادة',   totalAttended > 0 ? `من ${totalAttended} حاضراً` : 'لا يوجد حضور بعد'),
        ].join('');

        panel.innerHTML = `
            <div class="charts-grid">
                <!-- بطاقة 1: المعلومات الأساسية -->
                <div class="card">
                    <div class="card-header">
                        <h3><i class="fa-solid fa-circle-info"></i> معلومات النشاط</h3>
                    </div>
                    <div class="card-body">
                        <div class="position-info-grid">
                            ${items.map(it => `
                                <div class="uc-card__info-item">
                                    <div class="uc-card__info-icon"><i class="fa-solid ${it.icon}"></i></div>
                                    <div class="uc-card__info-content">
                                        <div class="uc-card__info-label">${this.escapeHtml(it.label)}</div>
                                        <div class="uc-card__info-value">${this.escapeHtml(String(it.value))}</div>
                                    </div>
                                </div>
                            `).join('')}
                            ${a.description ? `
                                <div class="uc-card__info-item uc-card__info-item--full">
                                    <div class="uc-card__info-icon"><i class="fa-solid fa-align-right"></i></div>
                                    <div class="uc-card__info-content">
                                        <div class="uc-card__info-label">الوصف</div>
                                        <div class="uc-card__info-value" style="white-space:pre-wrap;">${this.escapeHtml(a.description)}</div>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>

                <!-- بطاقة 2: إحصائيات الحجوزات والحضور (top-pages-list) -->
                <div class="card">
                    <div class="card-header">
                        <h3><i class="fa-solid fa-chart-simple"></i> إحصائيات الحجوزات والحضور</h3>
                    </div>
                    <div class="card-body">
                        <div class="top-pages-list top-pages-list--unranked">
                            ${statRows}
                        </div>
                    </div>
                </div>

                <!-- بطاقة 3: حالة الحجوزات (doughnut) -->
                <div class="card">
                    <div class="card-header">
                        <h3><i class="fa-solid fa-chart-pie"></i> حالة الحجوزات</h3>
                    </div>
                    <div class="card-body chart-container">
                        <canvas id="archiveStatusChart"></canvas>
                    </div>
                </div>

                <!-- بطاقة 4: توزيع الحضور حسب الجنس (bar) -->
                <div class="card">
                    <div class="card-header">
                        <h3><i class="fa-solid fa-chart-bar"></i> توزيع الحضور حسب الجنس</h3>
                    </div>
                    <div class="card-body chart-container">
                        <canvas id="archiveGenderChart"></canvas>
                    </div>
                </div>
            </div>
        `;

        // رسم الـ charts بعد بناء الـ DOM
        this.renderOverviewCharts({
            attended:     totalAttended,
            noShow:       noShowCount,
            cancelled:    cancelledCount,
            maleConfirmed, femaleConfirmed,
            maleAttended,  femaleAttended,
            maleNoShow,    femaleNoShow,
        });
    }

    destroyOverviewCharts() {
        ['archiveStatusChart', 'archiveGenderChart'].forEach(id => {
            if (this.charts[id]) {
                this.charts[id].destroy();
                delete this.charts[id];
            }
        });
    }

    renderOverviewCharts(d) {
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js غير محمَّل — تخطّي رسم charts نظرة عامة');
            return;
        }

        // 1) Doughnut: حالة الحجوزات (حاضر / غائب / ملغى)
        const statusCanvas = document.getElementById('archiveStatusChart');
        if (statusCanvas && (d.attended + d.noShow + d.cancelled) > 0) {
            this.charts.archiveStatusChart = new Chart(statusCanvas, {
                type: 'doughnut',
                data: {
                    labels: ['حاضرون', 'غائبون', 'ملغاة'],
                    datasets: [{
                        data: [d.attended, d.noShow, d.cancelled],
                        backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                        borderWidth: 2,
                        borderColor: '#fff',
                    }],
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        legend: { display: true, position: 'bottom', rtl: true,
                                  labels: { font: { family: 'Cairo, sans-serif' } } },
                        tooltip: { rtl: true, textDirection: 'rtl' },
                    },
                },
            });
        } else if (statusCanvas) {
            statusCanvas.parentElement.innerHTML = '<p class="no-data">لا توجد بيانات حجوزات لعرضها</p>';
        }

        // 2) Bar: توزيع الحضور حسب الجنس
        const genderCanvas = document.getElementById('archiveGenderChart');
        if (genderCanvas && (d.maleConfirmed + d.femaleConfirmed) > 0) {
            this.charts.archiveGenderChart = new Chart(genderCanvas, {
                type: 'bar',
                data: {
                    labels: ['الرجال', 'النساء'],
                    datasets: [
                        {
                            label: 'مسجَّلون',
                            data: [d.maleConfirmed, d.femaleConfirmed],
                            backgroundColor: 'rgba(61, 143, 214, 0.7)',
                            borderColor: '#3d8fd6',
                            borderWidth: 1.5,
                            borderRadius: 6,
                        },
                        {
                            label: 'حاضرون',
                            data: [d.maleAttended, d.femaleAttended],
                            backgroundColor: 'rgba(16, 185, 129, 0.75)',
                            borderColor: '#059669',
                            borderWidth: 1.5,
                            borderRadius: 6,
                        },
                        {
                            label: 'غائبون',
                            data: [d.maleNoShow, d.femaleNoShow],
                            backgroundColor: 'rgba(245, 158, 11, 0.75)',
                            borderColor: '#d97706',
                            borderWidth: 1.5,
                            borderRadius: 6,
                        },
                    ],
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        legend: { display: true, position: 'top', rtl: true,
                                  labels: { font: { family: 'Cairo, sans-serif' } } },
                        tooltip: { rtl: true, textDirection: 'rtl' },
                    },
                    scales: {
                        y: { beginAtZero: true, ticks: { font: { family: 'Cairo, sans-serif' }, precision: 0 } },
                        x: { ticks: { font: { family: 'Cairo, sans-serif' } } },
                    },
                },
            });
        } else if (genderCanvas) {
            genderCanvas.parentElement.innerHTML = '<p class="no-data">لا توجد بيانات تسجيل لعرضها</p>';
        }
    }

    countByGender(gender, status) {
        const list = this.data.reservations || [];
        if (status === 'confirmed') {
            return list.filter(r => r.gender_at_booking === gender && r.status === 'confirmed').length;
        }
        if (status === 'attended') {
            return list.filter(r => r.gender_at_booking === gender && r.attendance_status === 'attended').length;
        }
        return 0;
    }

    formatActivityType(t) {
        const map = { workshop: 'ورشة', dialogue: 'جلسة حوارية', activity: 'نشاط', program: 'برنامج' };
        return map[t] || t || '—';
    }

    // ============================================
    // 4b) المسجّلون — filters-bar + data-table
    // ============================================
    renderRoster() {
        const panel = document.getElementById('archivePanel');
        if (!panel) return;

        const counts = this.computeFilterCounts();
        const isWindowClosed = this.isAttendanceWindowClosed(this.data?.activity);

        // "غائبون" و "بانتظار التحضير" حالتان متعاقبتان: قبل انغلاق نافذة الساعة الكلّ
        // "بانتظار التحضير"، وبعدها يتحوّلون تلقائياً إلى "غائبون". لا تتعايشان أبداً.
        const filters = [
            { id: 'all',       label: 'الكل',       count: counts.all },
            { id: 'attended',  label: 'حاضرون',     count: counts.attended },
            isWindowClosed
                ? { id: 'no_show', label: 'غائبون',          count: counts.no_show }
                : { id: 'pending', label: 'بانتظار التحضير', count: counts.pending },
            { id: 'cancelled', label: 'ملغاة',      count: counts.cancelled },
        ];

        // لو الفلتر المختار اختفى من القائمة، رجّعه إلى "الكل"
        if (!filters.some(f => f.id === this.rosterFilter)) {
            this.rosterFilter = 'all';
        }

        panel.innerHTML = `
            <div class="filters-bar">
                <div class="filter-group">
                    <i class="fa-solid fa-search"></i>
                    <input type="search" id="archiveRosterSearch" class="input input-text"
                           placeholder="ابحث بالاسم أو الجوال…" value="${this.escapeHtml(this.rosterSearch)}" />
                </div>
                <select id="archiveRosterFilter" class="filter-select">
                    ${filters.map(f => `
                        <option value="${f.id}" ${this.rosterFilter === f.id ? 'selected' : ''}>${this.escapeHtml(f.label)} (${f.count})</option>
                    `).join('')}
                </select>
            </div>
            <div id="archiveRosterTable">
                ${this.renderRosterTable(this.filteredReservations())}
            </div>
        `;

        this.attachRosterListeners();
    }

    computeFilterCounts() {
        const list = this.data.reservations || [];
        return {
            all:       list.length,
            attended:  list.filter(r => r.attendance_status === 'attended').length,
            no_show:   list.filter(r => r.attendance_status === 'no_show').length,
            pending:   list.filter(r => r.status === 'confirmed' && r.attendance_status === 'registered').length,
            cancelled: list.filter(r => r.status === 'cancelled').length,
        };
    }

    filteredReservations() {
        let list = this.data.reservations || [];
        if (this.rosterFilter === 'attended')       list = list.filter(r => r.attendance_status === 'attended');
        else if (this.rosterFilter === 'no_show')   list = list.filter(r => r.attendance_status === 'no_show');
        else if (this.rosterFilter === 'pending')   list = list.filter(r => r.status === 'confirmed' && r.attendance_status === 'registered');
        else if (this.rosterFilter === 'cancelled') list = list.filter(r => r.status === 'cancelled');

        const q = (this.rosterSearch || '').trim().toLowerCase();
        if (q) {
            list = list.filter(r =>
                (r.full_name || '').toLowerCase().includes(q) ||
                (r.phone || '').toLowerCase().includes(q)
            );
        }
        return list;
    }

    renderRosterTable(rows) {
        if (rows.length === 0) {
            return `
                <div class="card">
                    <div class="card-body">
                        <div class="empty-state">
                            <div class="empty-state__icon"><i class="fa-solid fa-inbox"></i></div>
                            <p class="empty-state__title">لا توجد نتائج مطابقة</p>
                        </div>
                    </div>
                </div>`;
        }

        const trs = rows.map((r, i) => {
            const accountBadge = r.account_type === 'visitor'
                ? `<span class="uc-badge uc-badge--info"><i class="fa-solid fa-user"></i> زائر</span>`
                : `<span class="uc-badge uc-badge--primary"><i class="fa-solid fa-id-badge"></i> عضو</span>`;
            const genderLabel = r.gender_at_booking === 'male' ? 'ذكر' : 'أنثى';

            const statusBadge = r.status === 'cancelled'
                ? `<span class="uc-badge uc-badge--danger"><i class="fa-solid fa-circle" style="font-size:0.55rem;"></i>ملغي</span>`
                : `<span class="uc-badge uc-badge--success"><i class="fa-solid fa-circle" style="font-size:0.55rem;"></i>مؤكد</span>`;

            const wa = this.renderWhatsappCell(r);
            const confirm = this.renderWhatsappConfirmCell(r);
            const att = this.renderAttendanceBadge(r);
            const cert = this.renderCertCell(r);
            const phone = r.phone
                ? `<span dir="ltr">${this.escapeHtml(r.phone)}</span>`
                : `<span class="cell-muted"><i class="fa-solid fa-minus"></i></span>`;

            return `
            <tr>
                <td>${i + 1}</td>
                <td>
                    <div style="font-weight:600;">${this.escapeHtml(r.full_name || '—')}</div>
                    <div style="font-size:0.8rem;margin-top:0.15rem;">${phone}</div>
                </td>
                <td>${genderLabel}</td>
                <td>${accountBadge}</td>
                <td>${statusBadge}</td>
                <td>${confirm}</td>
                <td>${att}</td>
                <td>${cert}</td>
                <td>${wa}</td>
            </tr>`;
        }).join('');

        return `
            <div class="card">
                <div class="card-header">
                    <h3><i class="fa-solid fa-table"></i> قائمة المسجّلين</h3>
                    <button class="btn btn-success btn-sm" id="archiveExportRosterBtn" type="button">
                        <i class="fa-solid fa-file-csv"></i> تصدير البيانات
                    </button>
                </div>
                <div class="card-body">
                    <div class="data-table-wrap">
                        <div class="data-table-scroll">
                            <table class="data-table data-table--striped data-table--with-index">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>الاسم / الجوال</th>
                                        <th>الجنس</th>
                                        <th>نوع الحساب</th>
                                        <th>حالة الحجز</th>
                                        <th>تأكيد واتساب</th>
                                        <th>الحضور</th>
                                        <th>رقم الشهادة</th>
                                        <th>تواصل</th>
                                    </tr>
                                </thead>
                                <tbody>${trs}</tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderAttendanceBadge(r) {
        if (r.status === 'cancelled') {
            return `<span class="uc-badge uc-badge--danger"><i class="fa-solid fa-ban"></i> ملغي</span>`;
        }
        if (r.attendance_status === 'attended') {
            return `<span class="uc-badge uc-badge--success"><i class="fa-solid fa-circle-check"></i> حاضر</span>`;
        }
        if (r.attendance_status === 'no_show') {
            return `<span class="uc-badge uc-badge--danger"><i class="fa-solid fa-circle-xmark"></i> لم يحضر</span>`;
        }
        return `<span class="uc-badge"><i class="fa-solid fa-clock"></i> بانتظار التحضير</span>`;
    }

    renderCertCell(r) {
        if (!r.certificate_serial) return `<span class="cell-muted">—</span>`;
        return `<span class="aa-cert-serial" data-copy-serial="${this.escapeHtml(r.certificate_serial)}" title="نسخ رابط التحقق">
            <i class="fa-solid fa-copy"></i> ${this.escapeHtml(r.certificate_serial)}
        </span>`;
    }

    renderWhatsappCell(r) {
        const phone = this.normalizePhoneForWhatsapp(r.phone);
        if (!phone) {
            return `<button type="button" class="btn btn-outline btn-sm" disabled title="لا يوجد رقم جوال صالح">
                <i class="fa-brands fa-whatsapp"></i>
            </button>`;
        }
        const msg = this.buildWhatsappMessage(r);
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
        return `<a class="btn btn-success btn-sm" href="${this.escapeHtml(url)}" target="_blank" rel="noopener noreferrer" title="فتح واتساب">
            <i class="fa-brands fa-whatsapp"></i>
        </a>`;
    }

    renderWhatsappConfirmCell(r) {
        if (r.status === 'cancelled') return `<span class="cell-muted">—</span>`;
        if (r.whatsapp_confirmed_at) {
            const when = new Date(r.whatsapp_confirmed_at).toLocaleDateString('ar-SA');
            return `<span class="uc-badge uc-badge--success" title="تم التأكيد ${when}">
                <i class="fa-solid fa-check-circle"></i> ${this.escapeHtml(when)}
            </span>`;
        }
        return `<button type="button" class="btn btn-warning btn-sm" data-confirm-whatsapp="${this.escapeHtml(r.id)}">
            <i class="fa-solid fa-check"></i> تأكيد
        </button>`;
    }

    attachRosterListeners() {
        const search = document.getElementById('archiveRosterSearch');
        if (search) {
            search.addEventListener('input', (e) => {
                this.rosterSearch = e.target.value;
                const wrap = document.getElementById('archiveRosterTable');
                if (wrap) wrap.innerHTML = this.renderRosterTable(this.filteredReservations());
                this.attachRowActionListeners();
            });
        }

        const filterSel = document.getElementById('archiveRosterFilter');
        if (filterSel) {
            filterSel.addEventListener('change', (e) => {
                this.rosterFilter = e.target.value;
                this.renderRoster();
            });
        }

        document.getElementById('archiveExportRosterBtn')?.addEventListener('click', () => this.exportRosterCsv());

        this.attachRowActionListeners();
    }

    attachRowActionListeners() {
        document.querySelectorAll('[data-confirm-whatsapp]').forEach(btn => {
            btn.addEventListener('click', () => this.confirmWhatsapp(btn.dataset.confirmWhatsapp, btn));
        });
        document.querySelectorAll('[data-copy-serial]').forEach(el => {
            el.addEventListener('click', () => this.copyVerifyLink(el.dataset.copySerial));
        });
    }

    async confirmWhatsapp(reservationId, btn) {
        if (!reservationId) return;
        const original = btn?.innerHTML;
        try {
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            }
            const sb = window.sbClient;
            const { error } = await sb.rpc('confirm_whatsapp', { p_reservation_id: reservationId });
            if (error) throw error;
            this.notifySuccess('تم تسجيل تأكيد التواصل');
            const r = (this.data.reservations || []).find(x => x.id === reservationId);
            if (r) r.whatsapp_confirmed_at = new Date().toISOString();
            this.recomputeWhatsappStats();
            this.renderStats();
            this.renderRoster();
        } catch (err) {
            console.error('ActivityArchiveManager: confirmWhatsapp error', err);
            this.notifyError(this.humanizeError(err.message || String(err)));
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = original;
            }
        }
    }

    recomputeWhatsappStats() {
        const list = this.data.reservations || [];
        this.data.stats.whatsapp_confirmed_count = list.filter(r => r.status === 'confirmed' && r.whatsapp_confirmed_at).length;
    }

    buildVerifyUrl(serial) {
        const origin = window.location.origin;
        const path = window.location.pathname;
        const base = path.replace(/\/admin\/[^/]*$/, '/');
        return `${origin}${base}activities/verify.html?serial=${encodeURIComponent(serial)}`;
    }

    copyVerifyLink(serial) {
        if (!serial) return;
        const url = this.buildVerifyUrl(serial);
        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(url).then(() => {
                this.notifySuccess('تم نسخ رابط التحقق من الشهادة');
            }).catch(() => this.fallbackCopy(url));
        } else {
            this.fallbackCopy(url);
        }
    }

    fallbackCopy(text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            this.notifySuccess('تم نسخ الرابط');
        } catch (e) {
            this.notifyError('تعذّر نسخ الرابط');
        }
        document.body.removeChild(ta);
    }

    // ============================================
    // 4c) الشهادات — uc-grid + uc-card مصغر
    // ============================================
    renderCertificates() {
        const panel = document.getElementById('archivePanel');
        if (!panel) return;

        const certs = (this.data.reservations || []).filter(r => r.certificate_serial);
        if (certs.length === 0) {
            panel.innerHTML = `
                <div class="card">
                    <div class="card-body">
                        <div class="empty-state">
                            <div class="empty-state__icon"><i class="fa-solid fa-award"></i></div>
                            <p class="empty-state__title">لم تصدر شهادات بعد</p>
                            <p class="empty-state__msg">تُصدر الشهادات تلقائياً عند تسجيل حضور الشخص.</p>
                        </div>
                    </div>
                </div>`;
            return;
        }

        const cards = certs.map(c => `
            <div class="uc-card uc-card--success">
                <div class="uc-card__header">
                    <div class="uc-card__header-inner">
                        <div class="uc-card__icon"><i class="fa-solid fa-award"></i></div>
                        <div class="uc-card__header-info">
                            <h3 class="uc-card__title">${this.escapeHtml(c.full_name || '—')}</h3>
                            <span class="uc-card__badge"><i class="fa-solid fa-hashtag"></i> ${this.escapeHtml(c.certificate_serial)}</span>
                        </div>
                    </div>
                </div>
                <div class="uc-card__body">
                    <div class="uc-card__info-item">
                        <div class="uc-card__info-icon"><i class="fa-regular fa-calendar"></i></div>
                        <div class="uc-card__info-content">
                            <div class="uc-card__info-label">تاريخ الإصدار</div>
                            <div class="uc-card__info-value">${c.attended_at ? new Date(c.attended_at).toLocaleDateString('ar-SA') : '—'}</div>
                        </div>
                    </div>
                </div>
                <div class="uc-card__footer">
                    <button class="btn btn-success" data-copy-serial="${this.escapeHtml(c.certificate_serial)}">
                        <i class="fa-solid fa-link"></i> نسخ رابط التحقق
                    </button>
                    <button class="btn btn-success btn-outline" data-download-cert="${this.escapeHtml(c.certificate_serial)}">
                        <i class="fa-solid fa-download"></i> تحميل الشهادة
                    </button>
                </div>
            </div>
        `).join('');

        panel.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3><i class="fa-solid fa-award"></i> الشهادات الصادرة (${certs.length})</h3>
                    <button class="btn btn-success btn-sm" id="archiveExportCertsBtn" type="button">
                        <i class="fa-solid fa-file-csv"></i> تصدير البيانات
                    </button>
                </div>
                <div class="card-body">
                    <div class="uc-grid">${cards}</div>
                </div>
            </div>
        `;

        document.querySelectorAll('[data-copy-serial]').forEach(el => {
            el.addEventListener('click', () => this.copyVerifyLink(el.dataset.copySerial));
        });
        document.querySelectorAll('[data-download-cert]').forEach(el => {
            el.addEventListener('click', () => {
                const serial = el.dataset.downloadCert;
                const r = (this.data.reservations || []).find(x => x.certificate_serial === serial);
                if (r) this.downloadCertificate(r, el);
            });
        });
        document.getElementById('archiveExportCertsBtn')?.addEventListener('click', () => this.exportCertificatesCsv());
    }

    async _loadCertificateLib() {
        if (window.AdeebCertificate) return;
        return new Promise((resolve, reject) => {
            const origin = window.location.origin;
            const path = window.location.pathname;
            const base = path.replace(/\/admin\/[^/]*$/, '/');
            const src = `${origin}${base}activities/certificate.js`;
            const existing = document.querySelector(`script[src="${src}"]`);
            if (existing) {
                existing.addEventListener('load', resolve, { once: true });
                existing.addEventListener('error', reject, { once: true });
                return;
            }
            const s = document.createElement('script');
            s.src = src;
            s.async = true;
            s.onload = () => resolve();
            s.onerror = () => reject(new Error('فشل تحميل ملف الشهادة'));
            document.head.appendChild(s);
        });
    }

    async downloadCertificate(reservation, btn) {
        if (!reservation || !reservation.certificate_serial) return;
        const original = btn?.innerHTML;
        try {
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري التوليد…';
            }
            await this._loadCertificateLib();
            if (!window.AdeebCertificate?.downloadCertificate) {
                throw new Error('CERT_LIB_MISSING');
            }
            const a = this.data.activity || {};
            await window.AdeebCertificate.downloadCertificate({
                serial:        reservation.certificate_serial,
                holderName:    reservation.full_name,
                activityName:  a.name,
                activityType:  a.activity_type,
                activityDate:  a.activity_date,
                gender:        reservation.gender_at_booking,
            });
            this.notifySuccess('تم تحميل الشهادة');
        } catch (err) {
            console.error('ActivityArchiveManager: downloadCertificate error', err);
            this.notifyError('تعذّر تحميل الشهادة: ' + (err.message || ''));
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = original;
            }
        }
    }

    // ============================================
    // 5) تصدير CSV
    // ============================================
    exportRosterCsv() {
        const rows = this.filteredReservations();
        if (rows.length === 0) {
            this.notifyError('لا توجد بيانات للتصدير');
            return;
        }
        const headers = ['الاسم', 'الجوال', 'البريد', 'الجنس', 'نوع الحساب', 'حالة الحجز', 'تأكيد واتساب', 'حالة الحضور', 'تاريخ الحضور', 'رقم الشهادة', 'تاريخ الحجز'];
        const lines = rows.map(r => [
            r.full_name || '',
            r.phone || '',
            r.email || '',
            r.gender_at_booking === 'male' ? 'ذكر' : 'أنثى',
            r.account_type === 'visitor' ? 'زائر' : 'عضو',
            r.status === 'cancelled' ? 'ملغي' : 'مؤكد',
            r.whatsapp_confirmed_at ? new Date(r.whatsapp_confirmed_at).toLocaleDateString('ar-SA') : '',
            r.attendance_status === 'attended' ? 'حاضر' : (r.attendance_status === 'no_show' ? 'لم يحضر' : 'بانتظار التحضير'),
            r.attended_at ? new Date(r.attended_at).toLocaleDateString('ar-SA') : '',
            r.certificate_serial || '',
            r.reserved_at ? new Date(r.reserved_at).toLocaleDateString('ar-SA') : '',
        ]);
        this.downloadCsv(`roster_${this.activityId}.csv`, headers, lines);
    }

    exportCertificatesCsv() {
        const certs = (this.data.reservations || []).filter(r => r.certificate_serial);
        if (certs.length === 0) {
            this.notifyError('لا توجد شهادات للتصدير');
            return;
        }
        const headers = ['رقم الشهادة', 'الاسم', 'الجوال', 'تاريخ الإصدار', 'تاريخ الإرسال', 'رابط التحقق', 'رابط التحميل'];
        const lines = certs.map(c => [
            c.certificate_serial,
            c.full_name || '',
            c.phone || '',
            c.attended_at ? new Date(c.attended_at).toLocaleDateString('ar-SA') : '',
            c.certificate_sent_at ? new Date(c.certificate_sent_at).toLocaleDateString('ar-SA') : '',
            this.buildVerifyUrl(c.certificate_serial),
            this.buildDownloadUrl(c.certificate_serial),
        ]);
        this.downloadCsv(`certificates_${this.activityId}.csv`, headers, lines);
    }

    downloadCsv(filename, headers, rows) {
        this._writeCsvFile(filename, [headers, ...rows]);
    }

    _writeCsvFile(filename, allRows) {
        const escape = (v) => {
            let s = String(v ?? '');
            // حماية من CSV Formula Injection — تُسبق القيم البادئة بـ = + - @ أو Tab بفاصلة عُليا
            // (Google Sheets/Excel ستعالجها كنصّ ولن تُفسَّر كصيغة)
            if (/^[=+\-@\t]/.test(s)) {
                s = "'" + s;
            }
            if (s.includes(',') || s.includes('"') || s.includes('\n')) {
                return `"${s.replace(/"/g, '""')}"`;
            }
            return s;
        };
        const csv = allRows.map(r => r.map(escape).join(',')).join('\n');
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ============================================
    // 5b) تصدير شامل XLSX — معلومات + إحصائيات + توزيعات + روستر تفصيلي
    //     يستخدم ExcelJS لإنتاج ملف بتنسيق كامل (ألوان · حدود · خلايا مدمجة · RTL)
    // ============================================
    async exportFullXlsx() {
        if (!this.data?.activity) {
            this.notifyError('لا توجد بيانات للتصدير');
            return;
        }
        if (typeof ExcelJS === 'undefined') {
            this.notifyError('مكتبة ExcelJS غير محمَّلة');
            return;
        }

        const btn = document.getElementById('archiveExportFullBtn');
        if (btn) { btn.disabled = true; btn.classList.add('btn-loading'); }

        try {
            const a = this.data.activity;
            const reservations = this.data.reservations || [];
            const s = this.data.stats || {};

            // — حساب كل المقاييس —
            const byG = (g, fn) => reservations.filter(r => r.gender_at_booking === g).filter(fn).length;
            const maleSeats       = a.male_seats || 0;
            const femaleSeats     = a.female_seats || 0;
            const maleConfirmed   = byG('male',   r => r.status === 'confirmed');
            const femaleConfirmed = byG('female', r => r.status === 'confirmed');
            const maleAttended    = byG('male',   r => r.attendance_status === 'attended');
            const femaleAttended  = byG('female', r => r.attendance_status === 'attended');
            const maleNoShow      = byG('male',   r => r.attendance_status === 'no_show');
            const femaleNoShow    = byG('female', r => r.attendance_status === 'no_show');
            const malePending     = byG('male',   r => r.status === 'confirmed' && r.attendance_status === 'registered');
            const femalePending   = byG('female', r => r.status === 'confirmed' && r.attendance_status === 'registered');
            const maleCancelled   = byG('male',   r => r.status === 'cancelled');
            const femaleCancelled = byG('female', r => r.status === 'cancelled');

            const memberConfirmed  = reservations.filter(r => r.account_type !== 'visitor' && r.status === 'confirmed').length;
            const visitorConfirmed = reservations.filter(r => r.account_type === 'visitor' && r.status === 'confirmed').length;
            const memberAttended   = reservations.filter(r => r.account_type !== 'visitor' && r.attendance_status === 'attended').length;
            const visitorAttended  = reservations.filter(r => r.account_type === 'visitor' && r.attendance_status === 'attended').length;
            const memberNoShow     = reservations.filter(r => r.account_type !== 'visitor' && r.attendance_status === 'no_show').length;
            const visitorNoShow    = reservations.filter(r => r.account_type === 'visitor' && r.attendance_status === 'no_show').length;

            const totalSeats     = maleSeats + femaleSeats;
            const totalConfirmed = maleConfirmed + femaleConfirmed;
            const totalAttended  = maleAttended + femaleAttended;
            const totalNoShow    = maleNoShow + femaleNoShow;
            const totalPending   = malePending + femalePending;
            const totalCancelled = maleCancelled + femaleCancelled;
            const totalReservations = totalConfirmed + totalCancelled;
            const certCount      = s.certificates_issued_count | 0;
            const certSentCount  = reservations.filter(r => r.certificate_sent_at).length;

            const pct = (n, total) => total > 0 ? ((n / total) * 100) / 100 : null; // قيمة عشرية للنسبة (0..1) لتنسيق Excel

            // — مُنسِّقات تاريخ/وقت بأرقام إنجليزيّة (Western Arabic numerals) —
            const pad2 = (n) => String(n).padStart(2, '0');
            const fmtDate = (d) => {
                if (!d) return '';
                const dt = new Date(d);
                if (isNaN(dt)) return '';
                return `${pad2(dt.getDate())}/${pad2(dt.getMonth() + 1)}/${dt.getFullYear()}`;
            };
            const fmtDateTime = (d) => {
                if (!d) return '';
                const dt = new Date(d);
                if (isNaN(dt)) return '';
                return `${pad2(dt.getDate())}/${pad2(dt.getMonth() + 1)}/${dt.getFullYear()} ${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;
            };
            const fmtTime = (t) => {
                if (!t) return '';
                const [h, m] = String(t).split(':');
                return `${pad2(parseInt(h, 10) || 0)}:${pad2(parseInt(m, 10) || 0)}`;
            };

            const stateLabel = a.is_cancelled ? 'ملغي'
                             : (this.isActivityPast(a) ? 'منتهي'
                             : (a.is_published ? 'منشور' : 'مسودة'));

            // — لوحة الألوان —
            const C = {
                primary:      'FF274060', // كحلي
                primaryLight: 'FF3D8FD6', // أزرق
                white:        'FFFFFFFF',
                bgLight:      'FFF8FAFC',
                bgAccent:     'FFEFF6FC', // أزرق فاتح جداً
                border:       'FFCBD5E1',
                textDark:     'FF1E293B',
                textMuted:    'FF64748B',
                successBg:    'FFD1FAE5', success:  'FF065F46',
                warningBg:    'FFFEF3C7', warning:  'FF92400E',
                dangerBg:     'FFFEE2E2', danger:   'FF991B1B',
                neutralBg:    'FFF1F5F9', neutral:  'FF475569',
                pinkBg:       'FFFCE7F3', pink:     'FFBE185D',
            };

            const baseFont   = { name: 'Calibri', size: 11, color: { argb: C.textDark } };
            const titleFont  = { name: 'Calibri', size: 18, bold: true, color: { argb: C.white } };
            const headFont   = { name: 'Calibri', size: 12, bold: true, color: { argb: C.white } };
            const sectFont   = { name: 'Calibri', size: 13, bold: true, color: { argb: C.primary } };

            const thinBorder = { style: 'thin', color: { argb: C.border } };
            const allBorders = { top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder };

            const fillSolid = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });

            // ============================================
            // إنشاء الـ Workbook
            // ============================================
            const workbook = new ExcelJS.Workbook();
            workbook.creator  = 'نادي أديب';
            workbook.created  = new Date();
            workbook.views    = [{ rightToLeft: true }];

            // ============================================
            // الورقة 1: ملخّص النشاط
            // ============================================
            const ws = workbook.addWorksheet('الملخّص', {
                views: [{ rightToLeft: true, showGridLines: false }],
                properties: { tabColor: { argb: C.primaryLight }, defaultRowHeight: 20 },
            });

            ws.columns = [
                { width: 30 }, { width: 22 }, { width: 22 }, { width: 22 },
                { width: 22 }, { width: 22 }, { width: 22 }, { width: 22 },
            ];

            let r = 1;

            // عنوان كبير
            ws.mergeCells(r, 1, r, 8);
            const titleCell = ws.getCell(r, 1);
            titleCell.value = `ملخّص النشاط: ${a.name || '—'}`;
            titleCell.font = titleFont;
            titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
            titleCell.fill = fillSolid(C.primary);
            ws.getRow(r).height = 36;
            r++;

            ws.mergeCells(r, 1, r, 8);
            const subCell = ws.getCell(r, 1);
            subCell.value = `${this.formatActivityType(a.activity_type)} | ${fmtDate(a.activity_date)}`;
            subCell.font = { name: 'Calibri', size: 11, italic: true, color: { argb: C.white } };
            subCell.alignment = { vertical: 'middle', horizontal: 'center' };
            subCell.fill = fillSolid(C.primaryLight);
            ws.getRow(r).height = 22;
            r += 2; // فراغ

            // — قسم: معلومات النشاط —
            const addSectionHeader = (title, colSpan) => {
                ws.mergeCells(r, 1, r, colSpan);
                const c = ws.getCell(r, 1);
                c.value = `« ${title} »`;
                c.font = sectFont;
                c.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
                c.fill = fillSolid(C.bgAccent);
                c.border = { bottom: { style: 'medium', color: { argb: C.primaryLight } } };
                ws.getRow(r).height = 26;
                r++;
            };

            const addTableHeader = (cells) => {
                cells.forEach((label, i) => {
                    const c = ws.getCell(r, i + 1);
                    c.value = label;
                    c.font = headFont;
                    c.alignment = { vertical: 'middle', horizontal: 'center' };
                    c.fill = fillSolid(C.primary);
                    c.border = allBorders;
                });
                ws.getRow(r).height = 22;
                r++;
            };

            const addDataRow = (cells, opts = {}) => {
                cells.forEach((val, i) => {
                    const c = ws.getCell(r, i + 1);
                    c.value = val;
                    c.font = baseFont;
                    c.alignment = { vertical: 'middle', horizontal: opts.align?.[i] || 'right', wrapText: !!opts.wrap?.[i] };
                    c.border = allBorders;
                    if (opts.zebra && r % 2 === 0) c.fill = fillSolid(C.bgLight);
                    if (opts.fill?.[i])  c.fill = fillSolid(opts.fill[i]);
                    if (opts.color?.[i]) c.font = { ...baseFont, color: { argb: opts.color[i] }, bold: opts.bold?.[i] };
                    if (typeof val === 'number' && opts.numFmt?.[i]) c.numFmt = opts.numFmt[i];
                });
                r++;
            };

            // (1) معلومات النشاط
            addSectionHeader('معلومات النشاط', 8);
            addTableHeader(['الحقل', 'القيمة', '', '', '', '', '', '']);
            // ندمج عمود القيمة عبر 7 أعمدة لأن المعلومات نصية
            const infoRows = [
                ['الاسم',         a.name || ''],
                ['النوع',         this.formatActivityType(a.activity_type)],
                ['التاريخ',       fmtDate(a.activity_date)],
                ['الوقت',         `${fmtTime(a.start_time)}${a.end_time ? ' — ' + fmtTime(a.end_time) : ''}`],
                ['المكان',        a.location || ''],
                ['الوصف',         a.description || ''],
                ['حالة النشاط',   stateLabel],
                ['تاريخ الإنشاء', fmtDate(a.created_at)],
            ];
            infoRows.forEach(([label, val], idx) => {
                ws.getCell(r, 1).value = label;
                ws.getCell(r, 1).font = { ...baseFont, bold: true };
                ws.getCell(r, 1).alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
                ws.getCell(r, 1).fill = fillSolid(C.neutralBg);
                ws.getCell(r, 1).border = allBorders;

                ws.mergeCells(r, 2, r, 8);
                const valCell = ws.getCell(r, 2);
                valCell.value = val;
                valCell.font = baseFont;
                valCell.alignment = { vertical: 'middle', horizontal: 'right', indent: 1, wrapText: true };
                valCell.border = allBorders;
                if (label === 'الوصف' && val) ws.getRow(r).height = Math.min(80, 18 + Math.ceil(String(val).length / 80) * 18);
                r++;
            });
            r++; // فراغ

            // (2) الإحصائيات الإجمالية
            addSectionHeader('الإحصائيات الإجمالية', 3);
            addTableHeader(['الإحصائية', 'القيمة', 'النسبة']);
            const statsRows = [
                ['إجمالي المقاعد',          totalSeats,        1.0,                             { strong: true }],
                ['  مقاعد الرجال',          maleSeats,         pct(maleSeats, totalSeats),      {}],
                ['  مقاعد النساء',          femaleSeats,       pct(femaleSeats, totalSeats),    {}],
                ['إجمالي الحجوزات',         totalReservations, null,                            { strong: true }],
                ['  المسجَّلون (مؤكَّد)',    totalConfirmed,    pct(totalConfirmed, totalReservations), {}],
                ['  الحجوزات الملغاة',      totalCancelled,    pct(totalCancelled, totalReservations), { fillStatus: C.dangerBg, color: C.danger }],
                ['نسبة إشغال المقاعد',      totalConfirmed,    pct(totalConfirmed, totalSeats), { strong: true }],
                ['الحاضرون',                totalAttended,     pct(totalAttended, totalConfirmed), { fillStatus: C.successBg, color: C.success }],
                ['الغائبون',                totalNoShow,       pct(totalNoShow, totalConfirmed), { fillStatus: C.warningBg, color: C.warning }],
                ['بانتظار التحضير',         totalPending,      pct(totalPending, totalConfirmed), {}],
                ['الشهادات الصادرة',        certCount,         pct(certCount, totalAttended),  {}],
                ['الشهادات المرسَلة',       certSentCount,     pct(certSentCount, certCount),  {}],
            ];
            statsRows.forEach(([label, val, pctVal, opts]) => {
                const labelCell = ws.getCell(r, 1);
                labelCell.value = label;
                labelCell.font = { ...baseFont, bold: !!opts.strong };
                labelCell.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
                labelCell.fill = fillSolid(opts.strong ? C.bgAccent : C.bgLight);
                labelCell.border = allBorders;

                const valCell = ws.getCell(r, 2);
                valCell.value = val;
                valCell.font = { ...baseFont, bold: !!opts.strong, color: { argb: opts.color || C.textDark } };
                valCell.alignment = { vertical: 'middle', horizontal: 'center' };
                valCell.fill = fillSolid(opts.fillStatus || C.white);
                valCell.border = allBorders;

                const pctCell = ws.getCell(r, 3);
                pctCell.value = pctVal;
                pctCell.numFmt = '0.0%';
                pctCell.font = { ...baseFont, color: { argb: opts.color || C.textMuted } };
                pctCell.alignment = { vertical: 'middle', horizontal: 'center' };
                pctCell.border = allBorders;
                if (pctVal === null) pctCell.value = '—';
                r++;
            });
            r++;

            // (3) التوزيع حسب الجنس
            addSectionHeader('التوزيع حسب الجنس', 8);
            addTableHeader(['الجنس', 'مقاعد', 'مسجَّل', 'حاضر', 'غائب', 'بانتظار', 'ملغي', 'نسبة الحضور']);
            const genderRows = [
                ['الرجال',  maleSeats,   maleConfirmed,   maleAttended,   maleNoShow,   malePending,   maleCancelled,   pct(maleAttended,   maleConfirmed),   C.bgAccent],
                ['النساء',  femaleSeats, femaleConfirmed, femaleAttended, femaleNoShow, femalePending, femaleCancelled, pct(femaleAttended, femaleConfirmed), C.pinkBg],
                ['الإجمالي', totalSeats, totalConfirmed,  totalAttended,  totalNoShow,  totalPending,  totalCancelled,  pct(totalAttended,  totalConfirmed),  C.neutralBg],
            ];
            genderRows.forEach(([label, ...vals]) => {
                const fillColor = vals.pop();
                const labelCell = ws.getCell(r, 1);
                labelCell.value = label;
                labelCell.font = { ...baseFont, bold: true };
                labelCell.alignment = { vertical: 'middle', horizontal: 'center' };
                labelCell.fill = fillSolid(fillColor);
                labelCell.border = allBorders;
                vals.forEach((v, i) => {
                    const c = ws.getCell(r, i + 2);
                    c.value = v;
                    if (i === vals.length - 1) c.numFmt = '0.0%';
                    c.font = baseFont;
                    c.alignment = { vertical: 'middle', horizontal: 'center' };
                    c.border = allBorders;
                });
                r++;
            });
            r++;

            // (4) التوزيع حسب نوع الحساب
            addSectionHeader('التوزيع حسب نوع الحساب', 6);
            addTableHeader(['نوع الحساب', 'مسجَّل', 'حاضر', 'غائب', 'نسبة الحضور', 'النسبة من المسجَّل']);
            const acctRows = [
                ['أعضاء', memberConfirmed,  memberAttended,  memberNoShow,  pct(memberAttended,  memberConfirmed),  pct(memberConfirmed,  totalConfirmed),  C.bgAccent],
                ['زوار',  visitorConfirmed, visitorAttended, visitorNoShow, pct(visitorAttended, visitorConfirmed), pct(visitorConfirmed, totalConfirmed), C.warningBg],
            ];
            acctRows.forEach(([label, ...vals]) => {
                const fillColor = vals.pop();
                const labelCell = ws.getCell(r, 1);
                labelCell.value = label;
                labelCell.font = { ...baseFont, bold: true };
                labelCell.alignment = { vertical: 'middle', horizontal: 'center' };
                labelCell.fill = fillSolid(fillColor);
                labelCell.border = allBorders;
                vals.forEach((v, i) => {
                    const c = ws.getCell(r, i + 2);
                    c.value = v;
                    if (i >= vals.length - 2) c.numFmt = '0.0%';
                    c.font = baseFont;
                    c.alignment = { vertical: 'middle', horizontal: 'center' };
                    c.border = allBorders;
                });
                r++;
            });

            // ============================================
            // الورقة 2: تفاصيل المسجَّلين
            // ============================================
            const ws2 = workbook.addWorksheet('المسجَّلون', {
                views: [{ rightToLeft: true, showGridLines: false, state: 'frozen', ySplit: 2 }],
                properties: { tabColor: { argb: C.primaryLight }, defaultRowHeight: 20 },
            });

            ws2.columns = [
                { header: '#',                  key: 'i',     width: 6 },
                { header: 'الاسم',              key: 'name',  width: 28 },
                { header: 'الجوال',             key: 'phone', width: 16 },
                { header: 'البريد',             key: 'email', width: 28 },
                { header: 'الجنس',              key: 'gen',   width: 10 },
                { header: 'نوع الحساب',         key: 'acct',  width: 12 },
                { header: 'حالة الحجز',         key: 'st',    width: 12 },
                { header: 'حالة الحضور',        key: 'att',   width: 18 },
                { header: 'تأكيد واتساب',       key: 'wa',    width: 22 },
                { header: 'تاريخ الحضور',       key: 'attd',  width: 22 },
                { header: 'رقم الشهادة',        key: 'crt',   width: 14 },
                { header: 'تاريخ إصدار الشهادة', key: 'cri',   width: 22 },
                { header: 'تاريخ إرسال الشهادة', key: 'crs',   width: 22 },
                { header: 'تاريخ الحجز',        key: 'res',   width: 22 },
            ];

            // عنوان الورقة 2
            ws2.spliceRows(1, 0, []);
            ws2.mergeCells(1, 1, 1, ws2.columnCount);
            const ws2Title = ws2.getCell(1, 1);
            ws2Title.value = `تفاصيل المسجَّلين  —  ${a.name || ''}  (${reservations.length} حجز)`;
            ws2Title.font = titleFont;
            ws2Title.alignment = { vertical: 'middle', horizontal: 'center' };
            ws2Title.fill = fillSolid(C.primary);
            ws2.getRow(1).height = 32;

            // تنسيق صفّ العناوين (الصف الثاني)
            const hdrRow = ws2.getRow(2);
            hdrRow.font = headFont;
            hdrRow.alignment = { vertical: 'middle', horizontal: 'center' };
            hdrRow.height = 26;
            hdrRow.eachCell(c => {
                c.fill = fillSolid(C.primary);
                c.border = allBorders;
            });

            // تلوين خلايا حالات الحضور والحجز
            const statusFill = (st) => st === 'حاضر'  ? { bg: C.successBg, fg: C.success }
                                     : st === 'غائب'  ? { bg: C.warningBg, fg: C.warning }
                                     : st === 'ملغي'  ? { bg: C.dangerBg,  fg: C.danger  }
                                     : null;
            const attLabel = (st) => st === 'attended' ? 'حاضر'
                                  : st === 'no_show'   ? 'غائب'
                                  : 'بانتظار التحضير';

            reservations.forEach((rv, i) => {
                const row = ws2.addRow({
                    i: i + 1,
                    name:  rv.full_name || '',
                    phone: rv.phone || '',
                    email: rv.email || '',
                    gen:   rv.gender_at_booking === 'male' ? 'ذكر' : (rv.gender_at_booking === 'female' ? 'أنثى' : ''),
                    acct:  rv.account_type === 'visitor' ? 'زائر' : 'عضو',
                    st:    rv.status === 'cancelled' ? 'ملغي' : 'مؤكد',
                    att:   attLabel(rv.attendance_status),
                    wa:    fmtDateTime(rv.whatsapp_confirmed_at),
                    attd:  fmtDateTime(rv.attended_at),
                    crt:   rv.certificate_serial || '',
                    cri:   fmtDate(rv.certificate_issued_at),
                    crs:   fmtDate(rv.certificate_sent_at),
                    res:   fmtDateTime(rv.reserved_at),
                });

                row.font = baseFont;
                row.alignment = { vertical: 'middle', horizontal: 'right', wrapText: false };
                row.eachCell({ includeEmpty: true }, (c) => { c.border = allBorders; });

                // Zebra
                if (i % 2 === 1) {
                    row.eachCell({ includeEmpty: true }, c => {
                        if (!c.fill) c.fill = fillSolid(C.bgLight);
                    });
                }

                // # في الوسط
                row.getCell('i').alignment = { vertical: 'middle', horizontal: 'center' };

                // تلوين خلية الحضور
                const af = statusFill(row.getCell('att').value);
                if (af) {
                    row.getCell('att').fill = fillSolid(af.bg);
                    row.getCell('att').font = { ...baseFont, bold: true, color: { argb: af.fg } };
                    row.getCell('att').alignment = { vertical: 'middle', horizontal: 'center' };
                }
                // تلوين خلية الحجز
                const sf = statusFill(row.getCell('st').value);
                if (sf) {
                    row.getCell('st').fill = fillSolid(sf.bg);
                    row.getCell('st').font = { ...baseFont, bold: true, color: { argb: sf.fg } };
                    row.getCell('st').alignment = { vertical: 'middle', horizontal: 'center' };
                }
                // الجنس / نوع الحساب وسط
                row.getCell('gen').alignment  = { vertical: 'middle', horizontal: 'center' };
                row.getCell('acct').alignment = { vertical: 'middle', horizontal: 'center' };
            });

            // فلترة على صفّ العناوين
            if (reservations.length > 0) {
                ws2.autoFilter = {
                    from: { row: 2, column: 1 },
                    to:   { row: reservations.length + 2, column: ws2.columnCount },
                };
            }

            // ============================================
            // كتابة الملف
            // ============================================
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });
            const safeName = (a.name || 'النشاط').replace(/[\\/:*?"<>|\r\n]+/g, ' ').trim().slice(0, 80);
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `ملخّص النشاط - ${safeName}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('exportFullXlsx error:', err);
            this.notifyError('حدث خطأ أثناء توليد الملف');
        } finally {
            if (btn) { btn.disabled = false; btn.classList.remove('btn-loading'); }
        }
    }

    // ============================================
    // أدوات مساعدة
    // ============================================
    isActivityPast(a) {
        if (!a || !a.activity_date) return false;
        const endTime = a.end_time || '23:59:59';
        const endIso = `${a.activity_date}T${endTime.length === 5 ? endTime + ':00' : endTime}`;
        return new Date(endIso).getTime() <= Date.now();
    }

    // نافذة التحضير: ساعة بعد نهاية النشاط — تطابق منطق الـ DB
    isAttendanceWindowClosed(a) {
        if (!a || !a.activity_date) return false;
        const endTime = a.end_time || '23:59:59';
        const endIso = `${a.activity_date}T${endTime.length === 5 ? endTime + ':00' : endTime}`;
        return new Date(endIso).getTime() + 60 * 60 * 1000 <= Date.now();
    }

    formatTime(t) {
        if (!t) return '';
        const [h, m] = String(t).split(':');
        const d = new Date();
        d.setHours(parseInt(h, 10), parseInt(m, 10), 0);
        return d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: true });
    }

    normalizePhoneForWhatsapp(phone) {
        if (!phone) return null;
        let digits = String(phone).replace(/\D+/g, '');
        if (!digits) return null;
        if (digits.startsWith('00')) digits = digits.slice(2);
        if (digits.startsWith('05') && digits.length === 10) digits = '966' + digits.slice(1);
        else if (digits.startsWith('5') && digits.length === 9) digits = '966' + digits;
        if (digits.length < 8 || digits.length > 15) return null;
        return digits;
    }

    buildWhatsappMessage(r) {
        const a = this.data.activity || {};
        const dateStr = a.activity_date
            ? new Date(a.activity_date).toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
            : '';
        const timeStr = this.formatTime(a.start_time) + (a.end_time ? ' - ' + this.formatTime(a.end_time) : '');
        const lines = [
            'السلام عليكم ' + (r.full_name || '') + '،',
            '',
            'بخصوص نشاط "' + (a.name || '') + '".',
            'التاريخ: ' + dateStr,
            'الوقت: ' + timeStr,
        ];
        if (a.location) lines.push('الموقع: ' + a.location);
        lines.push('', 'مع تحيات نادي أدِيب');
        return lines.join('\n');
    }

    humanizeError(code) {
        const map = {
            NOT_AUTHENTICATED:        'يجب تسجيل الدخول أولًا.',
            NOT_AUTHORIZED:           'لا تملك صلاحية تنفيذ هذا الإجراء.',
            ACTIVITY_NOT_FOUND:       'النشاط غير موجود.',
            RESERVATION_NOT_FOUND:    'الحجز غير موجود.',
            CERTIFICATE_NOT_ISSUED:   'لم تُصدَر الشهادة بعد — سجّل الحضور أولًا.',
            CLIENT_NOT_READY:         'لم يتم تهيئة الاتصال بقاعدة البيانات.',
        };
        for (const k in map) {
            if (code && String(code).includes(k)) return map[k];
        }
        return code || 'حدث خطأ غير متوقع.';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text == null ? '' : String(text);
        return div.innerHTML;
    }

    notifySuccess(msg) {
        if (window.toastSuccess) window.toastSuccess(msg);
        else console.log('[ok]', msg);
    }

    notifyError(msg) {
        if (window.toastError) window.toastError(msg);
        else console.error('[error]', msg);
    }
}

window.ActivityArchiveManager = ActivityArchiveManager;
