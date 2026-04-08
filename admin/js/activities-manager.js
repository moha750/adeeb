/**
 * إدارة الأنشطة والبرامج - نادي أدِيب
 * يعالج 4 أقسام:
 *   1. activities-list-section          : قائمة الأنشطة + الإحصائيات + النشر/الإلغاء/الحذف
 *   2. activities-create-section        : نموذج إنشاء/تعديل نشاط
 *   3. activities-reservations-section  : عرض جميع الحجوزات لكل نشاط
 *   4. activities-visitors-section      : قائمة الزوار المسجلين + تصدير CSV
 */

class ActivitiesManager {
    constructor() {
        this.activities = [];
        this.reservations = [];
        this.visitors = [];
        this.currentEditingId = null;
        this.filters = { search: '', status: '', activityFilter: '' };
        console.log('ActivitiesManager: Initialized');
    }

    // ============================================
    // التهيئة
    // ============================================
    async init(currentUser) {
        this.currentUser = currentUser;
        this.attachListListeners();
        this.attachCreateFormListeners();
        this.attachReservationsListeners();
        this.attachVisitorsListeners();
    }

    // ============================================
    // 1. قائمة الأنشطة
    // ============================================
    attachListListeners() {
        const searchInput = document.getElementById('activitiesSearchInput');
        const statusFilter = document.getElementById('activitiesStatusFilter');
        const refreshBtn = document.getElementById('refreshActivitiesBtn');
        const goCreateBtn = document.getElementById('goToCreateActivityBtn');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filters.search = e.target.value;
                this.renderActivitiesList();
            });
        }
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filters.status = e.target.value;
                this.renderActivitiesList();
            });
        }
        if (refreshBtn) refreshBtn.addEventListener('click', () => this.loadActivitiesList());
        if (goCreateBtn) {
            goCreateBtn.addEventListener('click', () => {
                this.currentEditingId = null;
                this.resetCreateForm();
                if (window.navigateToSection) window.navigateToSection('activities-create-section');
            });
        }
    }

    async loadActivitiesList() {
        try {
            const sb = window.sbClient;
            if (!sb) {
                this.notifyError('لم يتم تهيئة الاتصال بقاعدة البيانات');
                return;
            }

            const { data, error } = await sb
                .from('activities')
                .select('*')
                .order('activity_date', { ascending: false });

            if (error) throw error;

            // اجلب أعداد الحجوزات لكل نشاط
            const { data: counts, error: countsErr } = await sb
                .from('activity_reservations')
                .select('activity_id, gender_at_booking, status');

            if (countsErr) throw countsErr;

            const countsMap = {};
            (counts || []).forEach(r => {
                if (r.status !== 'confirmed') return;
                if (!countsMap[r.activity_id]) countsMap[r.activity_id] = { male: 0, female: 0 };
                countsMap[r.activity_id][r.gender_at_booking] = (countsMap[r.activity_id][r.gender_at_booking] || 0) + 1;
            });

            this.activities = (data || []).map(a => ({
                ...a,
                male_booked: countsMap[a.id]?.male || 0,
                female_booked: countsMap[a.id]?.female || 0,
            }));

            this.updateStatistics();
            this.renderActivitiesList();
        } catch (err) {
            console.error('ActivitiesManager: loadActivitiesList error', err);
            this.notifyError('حدث خطأ في تحميل الأنشطة: ' + (err.message || ''));
        }
    }

    updateStatistics() {
        const total = this.activities.length;
        const published = this.activities.filter(a => a.is_published && !a.is_cancelled).length;
        const upcoming = this.activities.filter(a => {
            const d = new Date(a.activity_date);
            const today = new Date(); today.setHours(0, 0, 0, 0);
            return d >= today && a.is_published && !a.is_cancelled;
        }).length;
        const totalBookings = this.activities.reduce((s, a) => s + (a.male_booked + a.female_booked), 0);

        const set = (id, v) => {
            const el = document.getElementById(id);
            if (el) el.textContent = v;
        };
        set('totalActivitiesCount', total);
        set('publishedActivitiesCount', published);
        set('upcomingActivitiesCount', upcoming);
        set('totalActivityBookingsCount', totalBookings);
    }

    filterActivities() {
        return this.activities.filter(a => {
            const matchSearch = !this.filters.search ||
                a.name.toLowerCase().includes(this.filters.search.toLowerCase()) ||
                (a.description && a.description.toLowerCase().includes(this.filters.search.toLowerCase()));

            const today = new Date(); today.setHours(0, 0, 0, 0);
            const actDate = new Date(a.activity_date);

            let statusMatch = true;
            if (this.filters.status === 'draft') statusMatch = !a.is_published && !a.is_cancelled;
            else if (this.filters.status === 'published') statusMatch = a.is_published && !a.is_cancelled && actDate >= today;
            else if (this.filters.status === 'past') statusMatch = actDate < today;
            else if (this.filters.status === 'cancelled') statusMatch = a.is_cancelled;

            return matchSearch && statusMatch;
        });
    }

    renderActivitiesList() {
        const container = document.getElementById('activitiesListContainer');
        if (!container) return;

        const filtered = this.filterActivities();
        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="text-align:center;padding:3rem 1rem;color:#64748b;">
                    <i class="fa-solid fa-calendar-xmark" style="font-size:2.5rem;display:block;margin-bottom:0.75rem;"></i>
                    <p>لا توجد أنشطة مطابقة.</p>
                </div>`;
            return;
        }

        container.innerHTML = `<div class="uc-grid">${filtered.map(a => this.renderActivityCard(a)).join('')}</div>`;
        this.attachCardListeners();
    }

    renderActivityCard(a) {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const actDate = new Date(a.activity_date);
        const isPast = actDate < today;

        let statusBadge;
        if (a.is_cancelled) {
            statusBadge = `<span class="uc-card__badge" style="background:rgba(239,68,68,0.1);color:#dc2626;"><i class="fa-solid fa-ban"></i> ملغي</span>`;
        } else if (isPast) {
            statusBadge = `<span class="uc-card__badge" style="background:rgba(100,116,139,0.15);color:#475569;"><i class="fa-solid fa-clock-rotate-left"></i> منتهٍ</span>`;
        } else if (a.is_published) {
            statusBadge = `<span class="uc-card__badge" style="background:rgba(16,185,129,0.12);color:#047857;"><i class="fa-solid fa-circle-check"></i> منشور</span>`;
        } else {
            statusBadge = `<span class="uc-card__badge" style="background:rgba(245,158,11,0.12);color:#b45309;"><i class="fa-solid fa-pen"></i> مسودة</span>`;
        }

        return `
        <div class="uc-card" data-activity-id="${this.escapeHtml(a.id)}">
            <div class="uc-card__header">
                <div class="uc-card__header-inner">
                    <div class="uc-card__icon" style="background:linear-gradient(135deg,#274060,#3d8fd6);color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.4rem;">
                        <i class="fa-solid fa-calendar-day"></i>
                    </div>
                    <div class="uc-card__header-info">
                        <h3 class="uc-card__title">${this.escapeHtml(a.name)}</h3>
                        ${statusBadge}
                    </div>
                </div>
            </div>
            <div class="uc-card__body">
                ${a.description ? `<div class="uc-card__info-item">
                    <div class="uc-card__info-icon"><i class="fa-solid fa-align-right"></i></div>
                    <div class="uc-card__info-content">
                        <div class="uc-card__info-label">الوصف</div>
                        <div class="uc-card__info-value">${this.escapeHtml(a.description.substring(0, 100))}${a.description.length > 100 ? '...' : ''}</div>
                    </div>
                </div>` : ''}
                <div class="uc-card__info-item">
                    <div class="uc-card__info-icon"><i class="fa-solid fa-calendar"></i></div>
                    <div class="uc-card__info-content">
                        <div class="uc-card__info-label">التاريخ والوقت</div>
                        <div class="uc-card__info-value">${new Date(a.activity_date).toLocaleDateString('ar-SA')} — ${this.formatTime(a.start_time)}</div>
                    </div>
                </div>
                ${a.location ? `<div class="uc-card__info-item">
                    <div class="uc-card__info-icon"><i class="fa-solid fa-location-dot"></i></div>
                    <div class="uc-card__info-content">
                        <div class="uc-card__info-label">المكان</div>
                        <div class="uc-card__info-value">${this.escapeHtml(a.location)}</div>
                    </div>
                </div>` : ''}
                <div class="uc-card__info-item">
                    <div class="uc-card__info-icon"><i class="fa-solid fa-mars"></i></div>
                    <div class="uc-card__info-content">
                        <div class="uc-card__info-label">رجال (محجوز/الكوتا)</div>
                        <div class="uc-card__info-value">${a.male_booked} / ${a.male_seats}</div>
                    </div>
                </div>
                <div class="uc-card__info-item">
                    <div class="uc-card__info-icon"><i class="fa-solid fa-venus"></i></div>
                    <div class="uc-card__info-content">
                        <div class="uc-card__info-label">نساء (محجوز/الكوتا)</div>
                        <div class="uc-card__info-value">${a.female_booked} / ${a.female_seats}</div>
                    </div>
                </div>
            </div>
            <div class="uc-card__footer" style="display:flex;flex-wrap:wrap;gap:0.4rem;">
                <button class="btn btn-outline btn-sm" data-edit-activity="${this.escapeHtml(a.id)}">
                    <i class="fa-solid fa-pen"></i> تعديل
                </button>
                <button class="btn ${a.is_published ? 'btn-slate' : 'btn-success'} btn-sm" data-toggle-publish="${this.escapeHtml(a.id)}">
                    <i class="fa-solid fa-${a.is_published ? 'eye-slash' : 'eye'}"></i>
                    ${a.is_published ? 'إلغاء النشر' : 'نشر'}
                </button>
                ${!a.is_cancelled ? `<button class="btn btn-warning btn-sm" data-cancel-activity="${this.escapeHtml(a.id)}">
                    <i class="fa-solid fa-ban"></i> إلغاء
                </button>` : ''}
                <button class="btn btn-danger btn-sm" data-delete-activity="${this.escapeHtml(a.id)}">
                    <i class="fa-solid fa-trash"></i> حذف
                </button>
            </div>
        </div>`;
    }

    attachCardListeners() {
        const container = document.getElementById('activitiesListContainer');
        if (!container) return;

        container.querySelectorAll('[data-edit-activity]').forEach(b => {
            b.addEventListener('click', () => this.editActivity(b.dataset.editActivity));
        });
        container.querySelectorAll('[data-toggle-publish]').forEach(b => {
            b.addEventListener('click', () => this.togglePublish(b.dataset.togglePublish));
        });
        container.querySelectorAll('[data-cancel-activity]').forEach(b => {
            b.addEventListener('click', () => this.cancelActivity(b.dataset.cancelActivity));
        });
        container.querySelectorAll('[data-delete-activity]').forEach(b => {
            b.addEventListener('click', () => this.deleteActivity(b.dataset.deleteActivity));
        });
    }

    // ============================================
    // 2. نموذج الإنشاء/التعديل
    // ============================================
    attachCreateFormListeners() {
        const saveBtn = document.getElementById('saveActivityBtn');
        const resetBtn = document.getElementById('resetActivityFormBtn');
        const totalInput = document.getElementById('actTotalSeats');
        const pctInput = document.getElementById('actMalePercentage');

        if (saveBtn) saveBtn.addEventListener('click', () => this.saveActivity());
        if (resetBtn) resetBtn.addEventListener('click', () => this.resetCreateForm());

        const recalc = () => {
            const total = parseInt(totalInput?.value || '0', 10);
            const pct = parseInt(pctInput?.value || '0', 10);
            if (total > 0 && pct >= 0 && pct <= 100) {
                const male = Math.floor(total * pct / 100);
                const female = total - male;
                const preview = document.getElementById('seatsPreview');
                if (preview) preview.textContent = `رجال: ${male} مقعد — نساء: ${female} مقعد`;
            }
        };
        if (totalInput) totalInput.addEventListener('input', recalc);
        if (pctInput) pctInput.addEventListener('input', recalc);
    }

    resetCreateForm() {
        const ids = ['actName', 'actDescription', 'actLocation', 'actDate', 'actStartTime', 'actEndTime', 'actTotalSeats', 'actMalePercentage', 'actCoverImageUrl'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        const typeEl = document.getElementById('actType');
        if (typeEl) typeEl.value = 'activity';
        const publishEl = document.getElementById('actPublishImmediately');
        if (publishEl) publishEl.checked = false;
        const preview = document.getElementById('seatsPreview');
        if (preview) preview.textContent = '—';
        const titleEl = document.getElementById('createActivityFormTitle');
        if (titleEl) titleEl.textContent = this.currentEditingId ? 'تعديل النشاط' : 'إنشاء نشاط جديد';
    }

    async editActivity(id) {
        const a = this.activities.find(x => x.id === id);
        if (!a) return;
        this.currentEditingId = id;

        const set = (elId, v) => {
            const el = document.getElementById(elId);
            if (el) el.value = v == null ? '' : v;
        };
        set('actName', a.name);
        set('actDescription', a.description);
        set('actType', a.activity_type);
        set('actLocation', a.location);
        set('actDate', a.activity_date);
        set('actStartTime', a.start_time);
        set('actEndTime', a.end_time);
        set('actTotalSeats', a.total_seats);
        set('actMalePercentage', a.male_percentage);
        set('actCoverImageUrl', a.cover_image_url);

        const publishEl = document.getElementById('actPublishImmediately');
        if (publishEl) publishEl.checked = a.is_published;

        const preview = document.getElementById('seatsPreview');
        if (preview) preview.textContent = `رجال: ${a.male_seats} مقعد — نساء: ${a.female_seats} مقعد`;

        const titleEl = document.getElementById('createActivityFormTitle');
        if (titleEl) titleEl.textContent = 'تعديل النشاط';

        if (window.navigateToSection) window.navigateToSection('activities-create-section');
    }

    async saveActivity() {
        const sb = window.sbClient;
        const name = document.getElementById('actName')?.value.trim();
        const description = document.getElementById('actDescription')?.value.trim();
        const activityType = document.getElementById('actType')?.value || 'activity';
        const location = document.getElementById('actLocation')?.value.trim();
        const activityDate = document.getElementById('actDate')?.value;
        const startTime = document.getElementById('actStartTime')?.value;
        const endTime = document.getElementById('actEndTime')?.value || null;
        const totalSeats = parseInt(document.getElementById('actTotalSeats')?.value || '0', 10);
        const malePct = parseInt(document.getElementById('actMalePercentage')?.value || '0', 10);
        const coverImageUrl = document.getElementById('actCoverImageUrl')?.value.trim() || null;
        const publishImmediately = document.getElementById('actPublishImmediately')?.checked;

        if (!name) return this.notifyError('الرجاء إدخال اسم النشاط');
        if (!activityDate) return this.notifyError('الرجاء تحديد تاريخ النشاط');
        if (!startTime) return this.notifyError('الرجاء تحديد وقت البدء');
        if (totalSeats <= 0) return this.notifyError('عدد المقاعد يجب أن يكون أكبر من صفر');
        if (malePct < 0 || malePct > 100) return this.notifyError('نسبة الرجال يجب أن تكون بين 0 و 100');

        const maleSeats = Math.floor(totalSeats * malePct / 100);
        const femaleSeats = totalSeats - maleSeats;

        const payload = {
            name, description: description || null, activity_type: activityType,
            location: location || null, activity_date: activityDate,
            start_time: startTime, end_time: endTime,
            total_seats: totalSeats, male_percentage: malePct,
            male_seats: maleSeats, female_seats: femaleSeats,
            cover_image_url: coverImageUrl,
            is_published: !!publishImmediately,
        };

        try {
            if (this.currentEditingId) {
                const { error } = await sb.from('activities').update(payload).eq('id', this.currentEditingId);
                if (error) throw error;
                this.notifySuccess('تم تحديث النشاط بنجاح');
            } else {
                payload.created_by = this.currentUser?.id || null;
                const { error } = await sb.from('activities').insert(payload);
                if (error) throw error;
                this.notifySuccess('تم إنشاء النشاط بنجاح');
            }
            this.currentEditingId = null;
            this.resetCreateForm();
            await this.loadActivitiesList();
            if (window.navigateToSection) window.navigateToSection('activities-list-section');
        } catch (err) {
            console.error('ActivitiesManager: saveActivity error', err);
            this.notifyError('حدث خطأ في حفظ النشاط: ' + (err.message || ''));
        }
    }

    async togglePublish(id) {
        const a = this.activities.find(x => x.id === id);
        if (!a) return;
        try {
            const sb = window.sbClient;
            const { error } = await sb.from('activities')
                .update({ is_published: !a.is_published })
                .eq('id', id);
            if (error) throw error;
            this.notifySuccess(a.is_published ? 'تم إلغاء نشر النشاط' : 'تم نشر النشاط');
            await this.loadActivitiesList();
        } catch (err) {
            console.error('ActivitiesManager: togglePublish error', err);
            this.notifyError('فشل تحديث حالة النشر: ' + (err.message || ''));
        }
    }

    async cancelActivity(id) {
        const ok = await this.confirmAction('إلغاء النشاط', 'سيتم تعليم النشاط كملغي. لن يظهر للزوار وستظل الحجوزات الحالية في سجل الإدارة.');
        if (!ok) return;
        try {
            const sb = window.sbClient;
            const { error } = await sb.from('activities')
                .update({ is_cancelled: true, is_published: false })
                .eq('id', id);
            if (error) throw error;
            this.notifySuccess('تم إلغاء النشاط');
            await this.loadActivitiesList();
        } catch (err) {
            console.error('ActivitiesManager: cancelActivity error', err);
            this.notifyError('فشل إلغاء النشاط: ' + (err.message || ''));
        }
    }

    async deleteActivity(id) {
        const ok = await this.confirmAction('حذف النشاط نهائيًا', 'سيتم حذف النشاط وجميع حجوزاته نهائيًا. لا يمكن التراجع.');
        if (!ok) return;
        try {
            const sb = window.sbClient;
            const { error } = await sb.from('activities').delete().eq('id', id);
            if (error) throw error;
            this.notifySuccess('تم حذف النشاط');
            await this.loadActivitiesList();
        } catch (err) {
            console.error('ActivitiesManager: deleteActivity error', err);
            this.notifyError('فشل حذف النشاط: ' + (err.message || ''));
        }
    }

    // ============================================
    // 3. الحجوزات
    // ============================================
    attachReservationsListeners() {
        const filter = document.getElementById('reservationsActivityFilter');
        const refresh = document.getElementById('refreshReservationsBtn');
        if (filter) {
            filter.addEventListener('change', (e) => {
                this.filters.activityFilter = e.target.value;
                this.renderReservationsTable();
            });
        }
        if (refresh) refresh.addEventListener('click', () => this.loadReservations());
    }

    async loadReservations() {
        try {
            const sb = window.sbClient;
            const { data, error } = await sb
                .from('activity_reservations')
                .select(`
                    id, status, gender_at_booking, reserved_at, cancelled_at,
                    activity:activities (id, name, activity_date, start_time),
                    visitor:visitors (id, full_name, email, phone),
                    member:profiles!member_user_id (id, full_name, email, phone)
                `)
                .order('reserved_at', { ascending: false });

            if (error) throw error;
            this.reservations = data || [];

            // املأ فلتر الأنشطة
            const filter = document.getElementById('reservationsActivityFilter');
            if (filter) {
                const seen = new Set();
                const opts = [`<option value="">جميع الأنشطة</option>`];
                this.reservations.forEach(r => {
                    if (r.activity && !seen.has(r.activity.id)) {
                        seen.add(r.activity.id);
                        opts.push(`<option value="${this.escapeHtml(r.activity.id)}">${this.escapeHtml(r.activity.name)}</option>`);
                    }
                });
                filter.innerHTML = opts.join('');
                filter.value = this.filters.activityFilter || '';
            }

            this.renderReservationsTable();
        } catch (err) {
            console.error('ActivitiesManager: loadReservations error', err);
            this.notifyError('حدث خطأ في تحميل الحجوزات: ' + (err.message || ''));
        }
    }

    renderReservationsTable() {
        const container = document.getElementById('reservationsTableContainer');
        if (!container) return;

        const filtered = this.filters.activityFilter
            ? this.reservations.filter(r => r.activity?.id === this.filters.activityFilter)
            : this.reservations;

        if (filtered.length === 0) {
            container.innerHTML = `<div class="empty-state" style="text-align:center;padding:3rem 1rem;color:#64748b;">
                <i class="fa-solid fa-inbox" style="font-size:2.5rem;display:block;margin-bottom:0.75rem;"></i>
                <p>لا توجد حجوزات بعد.</p>
            </div>`;
            return;
        }

        const rows = filtered.map(r => {
            const guest = r.visitor || r.member || {};
            const accountType = r.visitor ? '<span style="color:#3d8fd6;font-weight:600;">زائر</span>' : '<span style="color:#274060;font-weight:600;">عضو</span>';
            const genderLabel = r.gender_at_booking === 'male' ? 'ذكر' : 'أنثى';
            const statusLabel = r.status === 'confirmed'
                ? '<span style="color:#10b981;font-weight:600;">مؤكد</span>'
                : '<span style="color:#ef4444;font-weight:600;">ملغي</span>';

            return `
            <tr>
                <td>${this.escapeHtml(r.activity?.name || '—')}</td>
                <td>${this.escapeHtml(guest.full_name || '—')}</td>
                <td dir="ltr">${this.escapeHtml(guest.phone || '—')}</td>
                <td dir="ltr">${this.escapeHtml(guest.email || '—')}</td>
                <td>${genderLabel}</td>
                <td>${accountType}</td>
                <td>${statusLabel}</td>
                <td>${new Date(r.reserved_at).toLocaleString('ar-SA')}</td>
            </tr>`;
        }).join('');

        container.innerHTML = `
        <div class="table-wrapper" style="overflow-x:auto;background:#fff;border-radius:12px;border:1px solid #e2e8f0;">
            <table style="width:100%;border-collapse:collapse;">
                <thead style="background:#f4f7fb;">
                    <tr>
                        <th style="padding:0.85rem;text-align:right;border-bottom:1px solid #e2e8f0;">النشاط</th>
                        <th style="padding:0.85rem;text-align:right;border-bottom:1px solid #e2e8f0;">الاسم</th>
                        <th style="padding:0.85rem;text-align:right;border-bottom:1px solid #e2e8f0;">الجوال</th>
                        <th style="padding:0.85rem;text-align:right;border-bottom:1px solid #e2e8f0;">البريد</th>
                        <th style="padding:0.85rem;text-align:right;border-bottom:1px solid #e2e8f0;">الجنس</th>
                        <th style="padding:0.85rem;text-align:right;border-bottom:1px solid #e2e8f0;">نوع الحساب</th>
                        <th style="padding:0.85rem;text-align:right;border-bottom:1px solid #e2e8f0;">الحالة</th>
                        <th style="padding:0.85rem;text-align:right;border-bottom:1px solid #e2e8f0;">تاريخ الحجز</th>
                    </tr>
                </thead>
                <tbody>${rows.replace(/<tr>/g, '<tr style="border-bottom:1px solid #f1f5f9;">').replace(/<td>/g, '<td style="padding:0.75rem;">')}</tbody>
            </table>
        </div>`;
    }

    // ============================================
    // 4. بيانات الزوار
    // ============================================
    attachVisitorsListeners() {
        const refresh = document.getElementById('refreshVisitorsBtn');
        const exportBtn = document.getElementById('exportVisitorsCsvBtn');
        if (refresh) refresh.addEventListener('click', () => this.loadVisitors());
        if (exportBtn) exportBtn.addEventListener('click', () => this.exportVisitorsCsv());
    }

    async loadVisitors() {
        try {
            const sb = window.sbClient;
            const { data, error } = await sb
                .from('visitors')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            this.visitors = data || [];
            this.renderVisitorsTable();
            const countEl = document.getElementById('visitorsCount');
            if (countEl) countEl.textContent = this.visitors.length;
        } catch (err) {
            console.error('ActivitiesManager: loadVisitors error', err);
            this.notifyError('حدث خطأ في تحميل الزوار: ' + (err.message || ''));
        }
    }

    renderVisitorsTable() {
        const container = document.getElementById('visitorsTableContainer');
        if (!container) return;

        if (this.visitors.length === 0) {
            container.innerHTML = `<div class="empty-state" style="text-align:center;padding:3rem 1rem;color:#64748b;">
                <i class="fa-solid fa-users-slash" style="font-size:2.5rem;display:block;margin-bottom:0.75rem;"></i>
                <p>لا يوجد زوار مسجلون بعد.</p>
            </div>`;
            return;
        }

        const rows = this.visitors.map(v => `
            <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:0.75rem;">${this.escapeHtml(v.full_name)}</td>
                <td style="padding:0.75rem;" dir="ltr">${this.escapeHtml(v.phone)}</td>
                <td style="padding:0.75rem;" dir="ltr">${this.escapeHtml(v.email)}</td>
                <td style="padding:0.75rem;">${v.gender === 'male' ? 'ذكر' : 'أنثى'}</td>
                <td style="padding:0.75rem;">${this.escapeHtml(v.city || '—')}</td>
                <td style="padding:0.75rem;">${v.accepts_marketing ? '<i class="fa-solid fa-check" style="color:#10b981;"></i>' : '<i class="fa-solid fa-xmark" style="color:#ef4444;"></i>'}</td>
                <td style="padding:0.75rem;">${new Date(v.created_at).toLocaleDateString('ar-SA')}</td>
            </tr>`).join('');

        container.innerHTML = `
        <div class="table-wrapper" style="overflow-x:auto;background:#fff;border-radius:12px;border:1px solid #e2e8f0;">
            <table style="width:100%;border-collapse:collapse;">
                <thead style="background:#f4f7fb;">
                    <tr>
                        <th style="padding:0.85rem;text-align:right;border-bottom:1px solid #e2e8f0;">الاسم</th>
                        <th style="padding:0.85rem;text-align:right;border-bottom:1px solid #e2e8f0;">الجوال</th>
                        <th style="padding:0.85rem;text-align:right;border-bottom:1px solid #e2e8f0;">البريد</th>
                        <th style="padding:0.85rem;text-align:right;border-bottom:1px solid #e2e8f0;">الجنس</th>
                        <th style="padding:0.85rem;text-align:right;border-bottom:1px solid #e2e8f0;">المدينة</th>
                        <th style="padding:0.85rem;text-align:right;border-bottom:1px solid #e2e8f0;">يقبل الترويج</th>
                        <th style="padding:0.85rem;text-align:right;border-bottom:1px solid #e2e8f0;">تاريخ التسجيل</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
    }

    exportVisitorsCsv() {
        if (this.visitors.length === 0) {
            this.notifyError('لا توجد بيانات للتصدير');
            return;
        }
        const headers = ['الاسم', 'الجوال', 'البريد', 'الجنس', 'المدينة', 'يقبل الترويج', 'تاريخ التسجيل'];
        const rows = this.visitors.map(v => [
            v.full_name,
            v.phone,
            v.email,
            v.gender === 'male' ? 'ذكر' : 'أنثى',
            v.city || '',
            v.accepts_marketing ? 'نعم' : 'لا',
            new Date(v.created_at).toLocaleDateString('ar-SA'),
        ]);
        const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
        // BOM for Excel UTF-8 support
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `visitors_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.notifySuccess('تم تصدير الملف بنجاح');
    }

    // ============================================
    // أدوات مساعدة
    // ============================================
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

    async confirmAction(title, message) {
        if (window.Swal) {
            const r = await window.Swal.fire({
                title, text: message, icon: 'warning',
                showCancelButton: true, confirmButtonText: 'تأكيد', cancelButtonText: 'إلغاء',
            });
            return !!r.isConfirmed;
        }
        return confirm(`${title}\n\n${message}`);
    }
}

window.ActivitiesManager = ActivitiesManager;
