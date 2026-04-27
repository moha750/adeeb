/**
 * إدارة تسجيل الحضور (تبويب داخل لوحة التحكم — قسم الأنشطة والبرامج)
 * يعمل ضمن قسم #activities-attendance-section.
 *
 * يعتمد على ثلاث RPCs:
 *   - get_active_attendance_windows()         : قائمة الأنشطة المتاحة الآن
 *   - get_activity_attendance_list(id)        : قائمة المسجّلين لنشاط
 *   - mark_attendance(reservation_id, status) : تسجيل حاضر/لم يحضر
 *
 * الصلاحية: admin (role_level >= 8) أو activity_coordinator.
 */

class AttendanceManager {
    constructor() {
        this.activeWindows = [];
        this.currentActivity = null;
        this.roster = [];
        this.search = '';
        this.coordinators = [];
        this.coordSearch = '';
        this._coordSearchTimer = null;
        console.log('AttendanceManager: Initialized');
    }

    async init(currentUser, currentUserRole) {
        this.currentUser = currentUser;
        this.currentUserRole = currentUserRole || null;
        this.attachListeners();
        await this.checkAdminAndLoadCoordinators();
        await this.loadActivities();
    }

    async checkAdminAndLoadCoordinators() {
        const adminCard = document.getElementById('attendanceCoordinatorAdmin');
        if (!adminCard) return;
        // ابدأ مخفيًا دائمًا — لا نُظهر إلا للأدمن (role_level >= 8)
        adminCard.classList.add('d-none');

        // نعتمد على الدور الذي تراه الواجهة (يحترم Master Access) بدل RPC
        // لأن auth.uid() داخل DB يعيد دومًا هوية الجلسة الفعلية، فيختلف عن الإمولاشن.
        const level = this.currentUserRole?.role_level ?? 0;
        if (level < 8) return; // المنسّق العادي / الأعضاء لا يرون بطاقة الإسناد

        adminCard.classList.remove('d-none');
        try {
            await this.loadCoordinators();
        } catch (err) {
            console.error('AttendanceManager: loadCoordinators error', err);
        }
    }

    attachListeners() {
        if (this._listenersAttached) return;
        this._listenersAttached = true;

        document.getElementById('attendanceRefreshBtn')?.addEventListener('click', () => this.loadActivities());
        document.getElementById('attendanceRefreshBtn2')?.addEventListener('click', () => this.loadActivities());
        document.getElementById('attendanceBackBtn')?.addEventListener('click', () => {
            this.currentActivity = null;
            this.roster = [];
            this.showView('activities');
            this.loadActivities();
        });
        document.getElementById('attendanceRefreshRosterBtn')?.addEventListener('click', () => this.loadRoster());

        const search = document.getElementById('attendanceSearchInput');
        if (search) {
            search.addEventListener('input', (e) => {
                this.search = e.target.value;
                this.renderRoster();
            });
        }

        document.getElementById('attendanceCoordsRefreshBtn')?.addEventListener('click', () => this.loadCoordinators());

        const coordSearch = document.getElementById('attendanceCoordSearch');
        if (coordSearch) {
            coordSearch.addEventListener('input', (e) => {
                this.coordSearch = e.target.value;
                clearTimeout(this._coordSearchTimer);
                this._coordSearchTimer = setTimeout(() => this.runCoordSearch(), 250);
            });
            coordSearch.addEventListener('focus', () => {
                if ((coordSearch.value || '').trim().length >= 2) this.runCoordSearch();
            });
        }

        // إغلاق قائمة الاقتراحات عند النقر خارجها
        document.addEventListener('click', (e) => {
            const results = document.getElementById('attendanceCoordSearchResults');
            if (!results) return;
            if (!results.parentElement?.contains(e.target)) {
                results.classList.remove('show');
            }
        });
    }

    showView(name) {
        const ids = {
            empty:      'attendanceEmptyState',
            activities: 'attendanceActivitiesView',
            roster:     'attendanceRosterView',
        };
        Object.entries(ids).forEach(([key, id]) => {
            const el = document.getElementById(id);
            if (el) el.classList.toggle('d-none', key !== name);
        });
    }

    // ============================================
    // 1. قائمة الأنشطة المتاحة (داخل النافذة الزمنية)
    // ============================================
    async loadActivities() {
        try {
            const sb = window.sbClient;
            const { data, error } = await sb.rpc('get_active_attendance_windows');
            if (error) throw error;
            this.activeWindows = data || [];
            if (this.activeWindows.length === 0) {
                this.showView('empty');
                return;
            }
            this.renderActivities();
            this.showView('activities');
        } catch (err) {
            console.error('AttendanceManager: loadActivities error', err);
            this.notifyError(this.humanizeError(err.message) || 'تعذّر تحميل الأنشطة');
        }
    }

    renderActivities() {
        const container = document.getElementById('attendanceActivitiesList');
        if (!container) return;

        container.innerHTML = `<div class="uc-grid">${this.activeWindows.map(a => this.renderActivityCard(a)).join('')}</div>`;
        container.querySelectorAll('[data-attendance-activity]').forEach(btn => {
            btn.addEventListener('click', () => this.openRoster(btn.dataset.attendanceActivity));
        });
    }

    renderActivityCard(a) {
        const date = a.activity_date ? new Date(a.activity_date).toLocaleDateString('ar-SA', { weekday:'long', day:'numeric', month:'long' }) : '';
        const time = `${this.formatTime(a.start_time)}${a.end_time ? ' — ' + this.formatTime(a.end_time) : ''}`;
        return `
        <div class="uc-card" data-attendance-activity="${this.escapeHtml(a.id)}" style="cursor:pointer;">
            <div class="uc-card__header">
                <div class="uc-card__header-inner">
                    <div class="uc-card__icon"><i class="fa-solid fa-clipboard-check"></i></div>
                    <div class="uc-card__header-info">
                        <h3 class="uc-card__title">${this.escapeHtml(a.name)}</h3>
                        <span class="uc-card__badge"><i class="fa-solid fa-users"></i> ${a.confirmed_count || 0} مسجّل</span>
                    </div>
                </div>
            </div>
            <div class="uc-card__body">
                <div class="uc-card__info-item">
                    <div class="uc-card__info-icon"><i class="fa-regular fa-calendar"></i></div>
                    <div class="uc-card__info-content">
                        <div class="uc-card__info-label">التاريخ</div>
                        <div class="uc-card__info-value">${this.escapeHtml(date)}</div>
                    </div>
                </div>
                <div class="uc-card__info-item">
                    <div class="uc-card__info-icon"><i class="fa-regular fa-clock"></i></div>
                    <div class="uc-card__info-content">
                        <div class="uc-card__info-label">الوقت</div>
                        <div class="uc-card__info-value">${this.escapeHtml(time)}</div>
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
            <div class="uc-card__footer">
                <button class="btn btn-primary" data-attendance-activity="${this.escapeHtml(a.id)}">
                    <i class="fa-solid fa-arrow-left"></i> فتح قائمة المسجّلين
                </button>
            </div>
        </div>`;
    }

    // ============================================
    // 2. قائمة المسجّلين لنشاط محدد
    // ============================================
    async openRoster(activityId) {
        const activity = this.activeWindows.find(a => a.id === activityId);
        if (!activity) return;
        this.currentActivity = activity;
        this.search = '';
        const searchInput = document.getElementById('attendanceSearchInput');
        if (searchInput) searchInput.value = '';

        const titleEl = document.getElementById('attendanceRosterTitle');
        const crumbEl = document.getElementById('attendanceBreadcrumbCurrent');
        if (titleEl) titleEl.textContent = activity.name;
        if (crumbEl) crumbEl.textContent = activity.name;

        this.showView('roster');
        await this.loadRoster();
    }

    async loadRoster() {
        const list = document.getElementById('attendanceRosterList');
        if (!this.currentActivity) return;
        if (list) {
            list.innerHTML = `<div class="empty-state"><div class="empty-state__icon"><i class="fa-solid fa-spinner fa-spin"></i></div><p class="empty-state__title">جاري تحميل القائمة…</p></div>`;
        }
        try {
            const sb = window.sbClient;
            const { data, error } = await sb.rpc('get_activity_attendance_list', { p_activity_id: this.currentActivity.id });
            if (error) throw error;
            this.roster = data || [];
            this.renderRoster();
        } catch (err) {
            console.error('AttendanceManager: loadRoster error', err);
            if (list) list.innerHTML = `<div class="empty-state"><p class="empty-state__title">${this.escapeHtml(this.humanizeError(err.message))}</p></div>`;
        }
    }

    updateStats() {
        let attended = 0, noShow = 0, pending = 0;
        for (const r of this.roster) {
            if (r.attendance_status === 'attended')      attended++;
            else if (r.attendance_status === 'no_show')  noShow++;
            else                                          pending++;
        }
        const set = (id, v) => {
            const el = document.getElementById(id);
            if (el) el.textContent = v;
        };
        set('attendanceStatAttended', attended);
        set('attendanceStatNoShow',   noShow);
        set('attendanceStatPending',  pending);
    }

    filteredRoster() {
        const q = (this.search || '').trim().toLowerCase();
        if (!q) return this.roster;
        return this.roster.filter(r =>
            (r.full_name || '').toLowerCase().includes(q) ||
            (r.phone || '').toLowerCase().includes(q)
        );
    }

    renderRoster() {
        const list = document.getElementById('attendanceRosterList');
        if (!list) return;
        this.updateStats();

        const items = this.filteredRoster();
        if (items.length === 0) {
            list.innerHTML = `<div class="empty-state"><div class="empty-state__icon"><i class="fa-solid fa-inbox"></i></div><p class="empty-state__title">لا توجد نتائج مطابقة</p></div>`;
            return;
        }

        const rows = items.map(r => {
            const accountBadge = r.account_type === 'visitor'
                ? `<span class="uc-badge uc-badge--info"><i class="fa-solid fa-user"></i> زائر</span>`
                : `<span class="uc-badge uc-badge--primary"><i class="fa-solid fa-id-badge"></i> عضو</span>`;
            const wa = r.whatsapp_confirmed_at
                ? `<span class="uc-badge uc-badge--success" title="تم تأكيد التواصل عبر واتساب"><i class="fa-brands fa-whatsapp"></i> مؤكد</span>`
                : '';
            const stateBadge = r.attendance_status === 'attended'
                ? `<span class="uc-badge uc-badge--success"><i class="fa-solid fa-circle-check"></i> حاضر</span>`
                : r.attendance_status === 'no_show'
                    ? `<span class="uc-badge uc-badge--danger"><i class="fa-solid fa-circle-xmark"></i> لم يحضر</span>`
                    : `<span class="uc-badge"><i class="fa-solid fa-clock"></i> بانتظار</span>`;
            const phoneCell = r.phone
                ? `<span class="text-muted" dir="ltr">${this.escapeHtml(r.phone)}</span>`
                : '';

            return `
            <tr data-reservation-id="${this.escapeHtml(r.reservation_id)}">
                <td>
                    <div style="font-weight:600;">${this.escapeHtml(r.full_name || '—')}</div>
                    ${phoneCell ? `<div style="font-size:0.85rem;margin-top:0.15rem;">${phoneCell}</div>` : ''}
                </td>
                <td>${accountBadge}</td>
                <td>${wa}</td>
                <td>${stateBadge}</td>
                <td>
                    <div style="display:flex;gap:0.4rem;flex-wrap:wrap;justify-content:flex-end;">
                        <button type="button" class="btn btn-success btn-sm ${r.attendance_status === 'attended' ? 'is-active' : ''}" data-mark="attended">
                            <i class="fa-solid fa-check"></i> حاضر
                        </button>
                        <button type="button" class="btn btn-danger btn-sm ${r.attendance_status === 'no_show' ? 'is-active' : ''}" data-mark="no_show">
                            <i class="fa-solid fa-xmark"></i> لم يحضر
                        </button>
                    </div>
                </td>
            </tr>`;
        }).join('');

        list.innerHTML = `
        <div class="data-table-wrap">
            <div class="data-table-scroll">
                <table class="data-table data-table--striped">
                    <thead>
                        <tr>
                            <th>الاسم</th>
                            <th>نوع الحساب</th>
                            <th>واتساب</th>
                            <th>الحالة</th>
                            <th style="text-align:end;">الإجراء</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>`;

        list.querySelectorAll('tr[data-reservation-id]').forEach(row => {
            row.querySelectorAll('[data-mark]').forEach(btn => {
                btn.addEventListener('click', () => this.markAttendance(row, btn.dataset.mark));
            });
        });
    }

    async markAttendance(rowEl, status) {
        const reservationId = rowEl.dataset.reservationId;
        if (!reservationId) return;
        rowEl.style.opacity = '0.6';
        try {
            const sb = window.sbClient;
            const { data, error } = await sb.rpc('mark_attendance', {
                p_reservation_id: reservationId,
                p_status: status,
            });
            if (error) throw error;
            const r = this.roster.find(x => x.reservation_id === reservationId);
            if (r) {
                r.attendance_status = status;
                r.attended_at = (status === 'attended') ? new Date().toISOString() : null;
                r.certificate_serial = (status === 'attended') ? data : null;
            }
            this.renderRoster();
            const labels = { attended:'حاضر', no_show:'لم يحضر' };
            this.notifySuccess(`تم تحديث الحالة إلى: ${labels[status] || status}`);
        } catch (err) {
            console.error('AttendanceManager: markAttendance error', err);
            this.notifyError(this.humanizeError(err.message || String(err)));
            rowEl.style.opacity = '1';
        }
    }

    // ============================================
    // إدارة منسّقي الأنشطة (admin فقط)
    // ============================================
    async loadCoordinators() {
        const list = document.getElementById('attendanceCoordList');
        if (!list) return;
        list.innerHTML = `
        <div class="empty-state">
            <div class="empty-state__icon"><i class="fa-solid fa-spinner fa-spin"></i></div>
            <p class="empty-state__title">جاري التحميل…</p>
        </div>`;
        try {
            const sb = window.sbClient;
            const { data, error } = await sb.rpc('list_activity_coordinators');
            if (error) throw error;
            this.coordinators = data || [];
            this.renderCoordinators();
        } catch (err) {
            console.error('AttendanceManager: loadCoordinators error', err);
            list.innerHTML = `<div class="empty-state"><p class="empty-state__title">${this.escapeHtml(this.humanizeError(err.message))}</p></div>`;
        }
    }

    renderCoordinators() {
        const list = document.getElementById('attendanceCoordList');
        if (!list) return;
        const active = this.coordinators.filter(c => c.is_active);
        if (active.length === 0) {
            list.innerHTML = `
            <div class="empty-state">
                <div class="empty-state__icon"><i class="fa-solid fa-user-slash"></i></div>
                <p class="empty-state__title">لا يوجد منسّقون نشطون حاليًا</p>
                <p class="empty-state__msg">ابحث عن عضو في الأعلى وأسند له المهمة.</p>
            </div>`;
            return;
        }

        const rows = active.map(c => `
            <tr>
                <td>
                    <div class="cell-strong">${this.escapeHtml(c.full_name || '—')}</div>
                    <small class="cell-muted" dir="ltr">${this.escapeHtml(c.email || '')}</small>
                </td>
                <td class="cell-nowrap">${c.phone ? `<span dir="ltr">${this.escapeHtml(c.phone)}</span>` : '<span class="cell-muted">—</span>'}</td>
                <td class="cell-nowrap cell-muted">${c.assigned_at ? new Date(c.assigned_at).toLocaleDateString('ar-SA') : '—'}</td>
                <td class="cell-right">
                    <div class="data-table__actions">
                        <button type="button" class="btn btn-danger btn-sm" data-revoke-coord="${this.escapeHtml(c.user_id)}">
                            <i class="fa-solid fa-user-minus"></i> سحب المهمة
                        </button>
                    </div>
                </td>
            </tr>`).join('');

        list.innerHTML = `
        <div class="data-table-wrap">
            <div class="data-table-scroll">
                <table class="data-table data-table--striped">
                    <thead>
                        <tr>
                            <th>المنسّق</th>
                            <th>الجوال</th>
                            <th>أُسندت في</th>
                            <th class="cell-right">الإجراء</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>`;

        list.querySelectorAll('[data-revoke-coord]').forEach(btn => {
            btn.addEventListener('click', () => this.revokeCoordinator(btn.dataset.revokeCoord, btn));
        });
    }

    async runCoordSearch() {
        const results = document.getElementById('attendanceCoordSearchResults');
        if (!results) return;
        const q = (this.coordSearch || '').trim();
        if (q.length < 2) {
            results.classList.remove('show');
            results.innerHTML = '';
            return;
        }
        results.innerHTML = `
        <div class="empty-state">
            <div class="empty-state__icon"><i class="fa-solid fa-spinner fa-spin"></i></div>
            <p class="empty-state__title">جاري البحث…</p>
        </div>`;
        results.classList.add('show');
        try {
            const sb = window.sbClient;
            const { data, error } = await sb.rpc('search_members_for_coordinator', { p_query: q });
            if (error) throw error;
            const items = data || [];
            if (items.length === 0) {
                results.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state__icon"><i class="fa-solid fa-user-slash"></i></div>
                    <p class="empty-state__title">لا توجد نتائج مطابقة</p>
                    <p class="empty-state__msg">جرّب اسمًا مختلفًا أو جزءًا من البريد/الجوال.</p>
                </div>`;
                return;
            }
            const itemsHtml = items.map(m => {
                const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(m.full_name || 'User')}&background=3d8fd6&color=fff`;
                return `
                <button type="button" class="autocomplete-item" data-assign-coord="${this.escapeHtml(m.user_id)}">
                    <span class="autocomplete-item__avatar-wrap">
                        <img class="autocomplete-item__avatar" src="${this.escapeHtml(avatar)}" alt="${this.escapeHtml(m.full_name || '')}" />
                    </span>
                    <div class="autocomplete-item__info">
                        <div class="autocomplete-item__name">${this.escapeHtml(m.full_name || '—')}</div>
                        <div class="autocomplete-item__email">${this.escapeHtml(m.email || '')}</div>
                    </div>
                    <span class="btn btn-icon btn-success btn-outline btn-sm" aria-hidden="true">
                        <i class="fa-solid fa-user-plus"></i>
                    </span>
                </button>`;
            }).join('');
            results.innerHTML = `
            <div class="autocomplete-menu__header">
                <span><i class="fa-solid fa-magnifying-glass"></i> نتائج البحث</span>
                <span class="autocomplete-menu__count">${items.length}</span>
            </div>
            <div class="autocomplete-menu__list">${itemsHtml}</div>`;
            results.querySelectorAll('[data-assign-coord]').forEach(btn => {
                btn.addEventListener('click', () => this.assignCoordinator(btn.dataset.assignCoord, btn));
            });
        } catch (err) {
            console.error('AttendanceManager: searchMembers error', err);
            results.innerHTML = `
            <div class="empty-state">
                <div class="empty-state__icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
                <p class="empty-state__title">${this.escapeHtml(this.humanizeError(err.message))}</p>
            </div>`;
        }
    }

    async assignCoordinator(userId, btn) {
        if (!userId) return;
        const original = btn?.innerHTML;
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري…';
        }
        try {
            const sb = window.sbClient;
            const { error } = await sb.rpc('assign_activity_coordinator', { p_user_id: userId });
            if (error) throw error;
            this.notifySuccess('تم إسداء مهمة تسجيل الحضور للعضو');
            // أعد تحميل القائمتين وامسح صندوق البحث وأخفِ قائمة الاقتراحات
            const searchInput = document.getElementById('attendanceCoordSearch');
            if (searchInput) searchInput.value = '';
            this.coordSearch = '';
            const results = document.getElementById('attendanceCoordSearchResults');
            if (results) {
                results.classList.remove('show');
                results.innerHTML = '';
            }
            await this.loadCoordinators();
        } catch (err) {
            console.error('AttendanceManager: assignCoordinator error', err);
            this.notifyError(this.humanizeError(err.message || String(err)));
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = original;
            }
        }
    }

    async revokeCoordinator(userId, btn) {
        if (!userId) return;
        const ok = confirm('هل تريد سحب مهمة تسجيل الحضور من هذا العضو؟');
        if (!ok) return;
        const original = btn?.innerHTML;
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري…';
        }
        try {
            const sb = window.sbClient;
            const { error } = await sb.rpc('revoke_activity_coordinator', { p_user_id: userId });
            if (error) throw error;
            this.notifySuccess('تم سحب المهمة');
            await this.loadCoordinators();
        } catch (err) {
            console.error('AttendanceManager: revokeCoordinator error', err);
            this.notifyError(this.humanizeError(err.message || String(err)));
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = original;
            }
        }
    }

    // ============================================
    // أدوات مساعدة
    // ============================================
    humanizeError(code) {
        const map = {
            NOT_AUTHENTICATED:        'يجب تسجيل الدخول أولًا.',
            NOT_AUTHORIZED:           'لا تملك صلاحية تسجيل الحضور.',
            RESERVATION_NOT_FOUND:    'الحجز غير موجود.',
            RESERVATION_CANCELLED:    'هذا الحجز ملغى.',
            ACTIVITY_CANCELLED:       'النشاط ملغى.',
            OUTSIDE_ATTENDANCE_WINDOW:'تسجيل الحضور متاح فقط من ساعة قبل بدء النشاط حتى ساعة بعد انتهائه.',
            INVALID_STATUS:           'حالة غير صالحة.',
            MEMBER_NOT_FOUND:         'العضو غير موجود أو غير نشط.',
            COORDINATOR_NOT_FOUND:    'لا يوجد دور منسّق نشط لهذا الحساب.',
            ROLE_NOT_FOUND:           'دور "منسّق نشاط" غير موجود في النظام.',
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

    formatTime(t) {
        if (!t) return '';
        const [h, m] = t.split(':');
        const d = new Date();
        d.setHours(parseInt(h, 10), parseInt(m, 10), 0);
        return d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: true });
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

window.AttendanceManager = AttendanceManager;
