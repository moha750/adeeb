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
                </div>
            </div>
            <div id="archiveAlerts" class="aa-alerts"></div>
            <div id="archiveStats" class="stats-grid"></div>
            <div id="archiveTabs" class="aa-tabs"></div>
            <div id="archivePanel"></div>
        `;
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
                msg: `${s.pending_attendance_count} مسجَّل لم يُسجَّل حضورهم/غيابهم.`
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

        wrap.innerHTML = tabs.map(t => {
            const isActive = this.activeTab === t.id;
            const cls = isActive ? 'btn btn-primary' : 'btn btn-outline';
            const countHtml = t.count !== null ? ` <span class="uc-badge">${t.count}</span>` : '';
            return `<button type="button" class="${cls}" data-aa-tab="${t.id}">
                <i class="fa-solid ${t.icon}"></i>
                ${this.escapeHtml(t.label)}${countHtml}
            </button>`;
        }).join('');

        wrap.querySelectorAll('[data-aa-tab]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.activeTab = btn.dataset.aaTab;
                this.renderTabs();
                this.renderActivePanel();
            });
        });
    }

    renderActivePanel() {
        if (this.activeTab === 'overview') return this.renderOverview();
        if (this.activeTab === 'roster') return this.renderRoster();
        if (this.activeTab === 'certificates') return this.renderCertificates();
    }

    // ============================================
    // 4a) نظرة عامة — bgcard + uc-card__info-item
    // ============================================
    renderOverview() {
        const panel = document.getElementById('archivePanel');
        if (!panel) return;
        const a = this.data.activity || {};
        const s = this.data.stats || {};

        const items = [
            { icon: 'fa-tag',          label: 'النوع',          value: this.formatActivityType(a.activity_type) },
            { icon: 'fa-calendar-plus',label: 'تاريخ الإنشاء',  value: a.created_at ? new Date(a.created_at).toLocaleDateString('ar-SA') : '—' },
            { icon: 'fa-mars',         label: 'مقاعد الرجال',   value: `${this.countByGender('male', 'attended')} حاضر / ${this.countByGender('male', 'confirmed')} مسجَّل / ${a.male_seats || 0} مقعد` },
            { icon: 'fa-venus',        label: 'مقاعد النساء',   value: `${this.countByGender('female', 'attended')} حاضرة / ${this.countByGender('female', 'confirmed')} مسجَّلة / ${a.female_seats || 0} مقعد` },
            { icon: 'fa-ban',          label: 'حجوزات ملغاة',   value: s.cancelled_count | 0 },
            { icon: 'fa-award',        label: 'شهادات صادرة',   value: s.certificates_issued_count | 0 },
        ];

        panel.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3><i class="fa-solid fa-circle-info"></i> نظرة عامة</h3>
                </div>
                <div class="card-body">
                    <div class="uc-card__body" style="padding:0;">
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
                            <div class="uc-card__info-item">
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
        `;
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
        const filters = [
            { id: 'all',       label: 'الكل',       count: counts.all },
            { id: 'attended',  label: 'حاضرون',     count: counts.attended },
            { id: 'no_show',   label: 'غائبون',     count: counts.no_show },
            { id: 'pending',   label: 'لم يُسجَّل', count: counts.pending },
            { id: 'cancelled', label: 'ملغاة',      count: counts.cancelled },
        ];

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
                        <i class="fa-solid fa-file-csv"></i> تصدير CSV
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
        return `<span class="uc-badge"><i class="fa-solid fa-clock"></i> لم يُسجَّل</span>`;
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
                        <i class="fa-solid fa-file-csv"></i> تصدير CSV
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
            r.attendance_status === 'attended' ? 'حاضر' : (r.attendance_status === 'no_show' ? 'لم يحضر' : 'لم يُسجَّل'),
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
        const headers = ['رقم الشهادة', 'الاسم', 'الجوال', 'تاريخ الإصدار', 'رابط التحقق'];
        const lines = certs.map(c => [
            c.certificate_serial,
            c.full_name || '',
            c.phone || '',
            c.attended_at ? new Date(c.attended_at).toLocaleDateString('ar-SA') : '',
            this.buildVerifyUrl(c.certificate_serial),
        ]);
        this.downloadCsv(`certificates_${this.activityId}.csv`, headers, lines);
    }

    downloadCsv(filename, headers, rows) {
        const escape = (v) => {
            const s = String(v ?? '');
            if (s.includes(',') || s.includes('"') || s.includes('\n')) {
                return `"${s.replace(/"/g, '""')}"`;
            }
            return s;
        };
        const csv = [headers, ...rows].map(r => r.map(escape).join(',')).join('\n');
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
    // أدوات مساعدة
    // ============================================
    isActivityPast(a) {
        if (!a || !a.activity_date) return false;
        const endTime = a.end_time || '23:59:59';
        const endIso = `${a.activity_date}T${endTime.length === 5 ? endTime + ':00' : endTime}`;
        return new Date(endIso).getTime() <= Date.now();
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
            NOT_AUTHENTICATED:    'يجب تسجيل الدخول أولًا.',
            NOT_AUTHORIZED:       'لا تملك صلاحية عرض تفاصيل النشاط.',
            ACTIVITY_NOT_FOUND:   'النشاط غير موجود.',
            CLIENT_NOT_READY:     'لم يتم تهيئة الاتصال بقاعدة البيانات.',
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
