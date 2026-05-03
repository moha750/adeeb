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
        this.filters = {
            search: '',
            status: '',
            activityFilter: '',
            whatsappStatus: '',
            reservationsPeriod: this._loadReservationsPeriod(),
        };
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
        if (this._listListenersAttached) return;
        this._listListenersAttached = true;
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

    isActivityPast(a) {
        const now = new Date();
        const datePart = a.activity_date;
        if (!datePart) return false;
        const endTime = a.end_time || '23:59:59';
        // ملاحظة: يفترض أن activity_date و end_time بتوقيت محلي (السعودية)
        const endIso = `${datePart}T${endTime.length === 5 ? endTime + ':00' : endTime}`;
        const endDt = new Date(endIso);
        return endDt.getTime() <= now.getTime();
    }

    updateStatistics() {
        const total = this.activities.length;
        const published = this.activities.filter(a => a.is_published && !a.is_cancelled).length;
        const upcoming = this.activities.filter(a => {
            return !this.isActivityPast(a) && a.is_published && !a.is_cancelled;
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

            const isPast = this.isActivityPast(a);

            let statusMatch = true;
            if (this.filters.status === 'draft') statusMatch = !a.is_published && !a.is_cancelled;
            else if (this.filters.status === 'published') statusMatch = a.is_published && !a.is_cancelled && !isPast;
            else if (this.filters.status === 'past') statusMatch = isPast;
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
                <div class="empty-state">
                    <div class="empty-state__icon"><i class="fa-solid fa-calendar-xmark"></i></div>
                    <p class="empty-state__title">لا توجد أنشطة مطابقة</p>
                </div>`;
            return;
        }

        container.innerHTML = `<div class="uc-grid">${filtered.map(a => this.renderActivityCard(a)).join('')}</div>`;
        this.attachCardListeners();
    }

    renderActivityCard(a) {
        const isPast = this.isActivityPast(a);

        let statusBadge;
        let cardVariant;
        if (a.is_cancelled) {
            statusBadge = `<span class="uc-card__badge"><i class="fa-solid fa-ban"></i> ملغي</span>`;
            cardVariant = 'uc-card--danger';
        } else if (isPast) {
            statusBadge = `<span class="uc-card__badge"><i class="fa-solid fa-clock-rotate-left"></i> مُنتهي</span>`;
            cardVariant = 'uc-card--warning';
        } else if (a.is_published) {
            statusBadge = `<span class="uc-card__badge"><i class="fa-solid fa-circle-check"></i> منشور</span>`;
            cardVariant = 'uc-card--success';
        } else {
            statusBadge = `<span class="uc-card__badge"><i class="fa-solid fa-pen"></i> مسودة</span>`;
            cardVariant = 'uc-card--purple';
        }

        return `
        <div class="uc-card ${cardVariant}" data-activity-id="${this.escapeHtml(a.id)}">
            <div class="uc-card__header">
                <div class="uc-card__header-inner">
                    <div class="uc-card__icon">
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
            <div class="uc-card__footer">
                <button class="btn ${isPast ? 'btn-primary' : 'btn-outline'}" data-view-archive="${this.escapeHtml(a.id)}">
                    <i class="fa-solid fa-circle-info"></i> عرض التفاصيل
                </button>
                ${!isPast ? `<button class="btn btn-violet" data-edit-activity="${this.escapeHtml(a.id)}">
                    <i class="fa-solid fa-pen"></i> تعديل
                </button>` : ''}
                ${!isPast ? `<button class="btn ${a.is_published ? 'btn-slate' : 'btn-success'}" data-toggle-publish="${this.escapeHtml(a.id)}">
                    <i class="fa-solid fa-${a.is_published ? 'eye-slash' : 'eye'}"></i>
                    ${a.is_published ? 'إلغاء النشر' : 'نشر'}
                </button>` : ''}
                ${(a.is_published && !a.is_cancelled && !isPast) ? `<button class="btn btn-success" data-copy-booking-link="${this.escapeHtml(a.id)}">
                    <i class="fa-solid fa-link"></i> نسخ رابط الحجز
                </button>` : ''}
                ${(!a.is_cancelled && !isPast) ? `<button class="btn btn-warning" data-cancel-activity="${this.escapeHtml(a.id)}">
                    <i class="fa-solid fa-ban"></i> إلغاء
                </button>` : ''}
                <button class="btn btn-danger" data-delete-activity="${this.escapeHtml(a.id)}">
                    <i class="fa-solid fa-trash"></i> حذف
                </button>
            </div>
        </div>`;
    }

    attachCardListeners() {
        const container = document.getElementById('activitiesListContainer');
        if (!container) return;

        container.querySelectorAll('[data-view-archive]').forEach(b => {
            b.addEventListener('click', () => this.openArchive(b.dataset.viewArchive));
        });
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
        container.querySelectorAll('[data-copy-booking-link]').forEach(b => {
            b.addEventListener('click', () => this.copyBookingLink(b.dataset.copyBookingLink));
        });
    }

    openArchive(activityId) {
        if (!activityId) return;
        if (!window.ActivityArchiveManager) {
            this.notifyError('لم يتم تحميل وحدة تفاصيل النشاط');
            return;
        }
        if (!window.activityArchiveManagerInstance) {
            window.activityArchiveManagerInstance = new window.ActivityArchiveManager();
        }
        window.activityArchiveManagerInstance.openArchive(activityId);
    }

    buildBookingUrl(activityId) {
        const origin = window.location.origin;
        const path = window.location.pathname;
        // /admin/dashboard.html → /activities.html
        const base = path.replace(/\/admin\/[^/]*$/, '/');
        return `${origin}${base}activities.html#${activityId}`;
    }

    async copyBookingLink(activityId) {
        const url = this.buildBookingUrl(activityId);
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(url);
            } else {
                const ta = document.createElement('textarea');
                ta.value = url;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
            }
            this.notifySuccess('تم نسخ رابط الحجز');
        } catch (err) {
            console.error('ActivitiesManager: copyBookingLink error', err);
            this.notifyError('تعذّر نسخ الرابط: ' + (err.message || ''));
        }
    }

    // ============================================
    // 2. نموذج الإنشاء/التعديل
    // ============================================
    attachCreateFormListeners() {
        if (this._createFormListenersAttached) return;
        this._createFormListenersAttached = true;
        const saveBtn = document.getElementById('saveActivityBtn');
        const saveDraftBtn = document.getElementById('saveActivityDraftBtn');
        const maleInput = document.getElementById('actMaleSeats');
        const femaleInput = document.getElementById('actFemaleSeats');

        if (saveBtn) saveBtn.addEventListener('click', () => this.saveActivity({ publish: true }));
        if (saveDraftBtn) saveDraftBtn.addEventListener('click', () => this.saveActivity({ publish: false }));

        const recalc = () => {
            const male = parseInt(maleInput?.value || '0', 10) || 0;
            const female = parseInt(femaleInput?.value || '0', 10) || 0;
            const preview = document.getElementById('seatsPreview');
            if (preview) {
                const total = male + female;
                preview.textContent = total > 0
                    ? `${total} مقعد (رجال: ${male} — نساء: ${female})`
                    : '—';
            }
        };
        if (maleInput) maleInput.addEventListener('input', recalc);
        if (femaleInput) femaleInput.addEventListener('input', recalc);

        this.renderCoverUploader(null);
    }

    resetCreateForm() {
        const ids = ['actName', 'actDescription', 'actLocation', 'actLocationUrl', 'actDate', 'actStartTime', 'actEndTime', 'actMaleSeats', 'actFemaleSeats'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        const typeEl = document.getElementById('actType');
        if (typeEl) typeEl.value = 'activity';
        const preview = document.getElementById('seatsPreview');
        if (preview) preview.textContent = '—';
        this.renderCoverUploader(null);
        const titleEl = document.getElementById('createActivityFormTitle');
        if (titleEl) titleEl.textContent = this.currentEditingId ? 'تعديل النشاط' : 'إنشاء نشاط جديد';
        this.updateSaveButtonsState(null);
    }

    renderCoverUploader(currentImageUrl) {
        const mount = document.getElementById('actCoverImageMount');
        if (!mount || !window.ImageUploadHelper) return;
        mount.innerHTML = window.ImageUploadHelper.createCoverImageUploader({
            inputId: 'actCoverImage',
            currentImageUrl: currentImageUrl || null,
            folder: 'activities',
            required: false,
            aspectRatio: 16 / 9,
        });
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
        set('actLocationUrl', a.location_url);
        set('actDate', a.activity_date);
        set('actStartTime', a.start_time);
        set('actEndTime', a.end_time);
        set('actMaleSeats', a.male_seats);
        set('actFemaleSeats', a.female_seats);
        this.renderCoverUploader(a.cover_image_url);

        const preview = document.getElementById('seatsPreview');
        if (preview) preview.textContent = `${a.total_seats} مقعد (رجال: ${a.male_seats} — نساء: ${a.female_seats})`;

        const titleEl = document.getElementById('createActivityFormTitle');
        if (titleEl) titleEl.textContent = 'تعديل النشاط';

        this.updateSaveButtonsState(a);

        if (window.navigateToSection) window.navigateToSection('activities-create-section');
    }

    updateSaveButtonsState(activity) {
        const saveDraftBtn = document.getElementById('saveActivityDraftBtn');
        const saveBtn = document.getElementById('saveActivityBtn');
        const isPublished = !!(activity && activity.is_published && !activity.is_cancelled);
        if (saveDraftBtn) {
            saveDraftBtn.style.display = isPublished ? 'none' : '';
            saveDraftBtn.disabled = false;
            saveDraftBtn.title = '';
        }
        if (saveBtn) {
            saveBtn.innerHTML = isPublished
                ? '<i class="fa-solid fa-floppy-disk"></i> حفظ التعديلات'
                : '<i class="fa-solid fa-circle-check"></i> نشر النشاط';
        }
    }

    async saveActivity({ publish = true } = {}) {
        if (this._isSaving) return;
        const sb = window.sbClient;
        const saveBtn = document.getElementById('saveActivityBtn');
        const saveDraftBtn = document.getElementById('saveActivityDraftBtn');
        const name = document.getElementById('actName')?.value.trim();
        const description = document.getElementById('actDescription')?.value.trim();
        const activityType = document.getElementById('actType')?.value || '';
        const location = document.getElementById('actLocation')?.value.trim();
        const locationUrl = document.getElementById('actLocationUrl')?.value.trim();
        const activityDate = document.getElementById('actDate')?.value;
        const startTime = document.getElementById('actStartTime')?.value;
        const endTime = document.getElementById('actEndTime')?.value;
        const maleSeatsRaw = document.getElementById('actMaleSeats')?.value;
        const femaleSeatsRaw = document.getElementById('actFemaleSeats')?.value;
        const maleSeats = parseInt(maleSeatsRaw || '', 10);
        const femaleSeats = parseInt(femaleSeatsRaw || '', 10);
        const coverImageUrl = (window.ImageUploadHelper
            ? window.ImageUploadHelper.getCoverImageUrl('actCoverImage')
            : document.getElementById('actCoverImage_url')?.value) || null;
        const publishImmediately = !!publish;

        if (!name) return this.notifyError('الرجاء إدخال اسم النشاط');
        if (!activityType) return this.notifyError('الرجاء تحديد نوع النشاط');
        if (!location) return this.notifyError('الرجاء تحديد مكان النشاط');
        if (!locationUrl) return this.notifyError('الرجاء إدخال رابط الموقع على خرائط قوقل');
        if (!/^https?:\/\//i.test(locationUrl)) {
            return this.notifyError('رابط الموقع يجب أن يبدأ بـ http:// أو https://');
        }
        if (!activityDate) return this.notifyError('الرجاء تحديد تاريخ النشاط');
        if (!startTime) return this.notifyError('الرجاء تحديد وقت البدء');
        if (!endTime) return this.notifyError('الرجاء تحديد وقت الانتهاء');
        if (Number.isNaN(maleSeats) || maleSeats < 0) return this.notifyError('الرجاء إدخال عدد صحيح غير سالب لمقاعد الرجال');
        if (Number.isNaN(femaleSeats) || femaleSeats < 0) return this.notifyError('الرجاء إدخال عدد صحيح غير سالب لمقاعد النساء');

        const totalSeats = maleSeats + femaleSeats;
        if (totalSeats <= 0) return this.notifyError('إجمالي المقاعد يجب أن يكون أكبر من صفر');

        // التحقق من تسلسل الوقت
        if (endTime <= startTime) {
            return this.notifyError('وقت الانتهاء يجب أن يكون بعد وقت البدء');
        }

        // منع نشر نشاط في تاريخ ماضٍ
        if (publishImmediately) {
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const selected = new Date(activityDate);
            if (selected < today) {
                return this.notifyError('لا يمكن نشر نشاط في تاريخ ماضٍ');
            }
        }

        // male_percentage محسوب للحفاظ على توافق الحقل في DB (تقريب لأقرب صحيح)
        const malePct = Math.round((maleSeats * 100) / totalSeats);

        // عند التعديل: تحقق من عدم نزول المقاعد تحت الحجوزات المؤكدة الحالية
        if (this.currentEditingId) {
            const current = this.activities.find(x => x.id === this.currentEditingId);
            if (current) {
                const maleBooked = current.male_booked || 0;
                const femaleBooked = current.female_booked || 0;
                const totalBooked = maleBooked + femaleBooked;

                if (totalSeats < totalBooked) {
                    return this.notifyError(
                        `لا يمكن تخفيض إجمالي المقاعد إلى ${totalSeats} لأن هناك ${totalBooked} حجزًا مؤكدًا فعلًا. الحد الأدنى المسموح: ${totalBooked}`
                    );
                }
                if (maleSeats < maleBooked) {
                    return this.notifyError(
                        `كوتا الرجال (${maleSeats}) أقل من الحجوزات المؤكدة للرجال (${maleBooked}). عدّل النسبة أو زد إجمالي المقاعد`
                    );
                }
                if (femaleSeats < femaleBooked) {
                    return this.notifyError(
                        `كوتا النساء (${femaleSeats}) أقل من الحجوزات المؤكدة للنساء (${femaleBooked}). عدّل النسبة أو زد إجمالي المقاعد`
                    );
                }
            }
        }

        const payload = {
            name, description: description || null, activity_type: activityType,
            location, location_url: locationUrl,
            activity_date: activityDate,
            start_time: startTime, end_time: endTime,
            total_seats: totalSeats, male_percentage: malePct,
            male_seats: maleSeats, female_seats: femaleSeats,
            cover_image_url: coverImageUrl,
            is_published: !!publishImmediately,
        };

        // عند نشر نشاط ملغي مسبقًا: ارفع علامة الإلغاء حتى لا تتعارض الحالتان
        if (publishImmediately && this.currentEditingId) {
            const current = this.activities.find(x => x.id === this.currentEditingId);
            if (current?.is_cancelled) {
                const ok = await this.confirmAction(
                    'إعادة تفعيل نشاط ملغي',
                    'هذا النشاط معلَّم كـ "ملغي". هل تريد إزالة علامة الإلغاء ونشره من جديد؟'
                );
                if (!ok) return;
                payload.is_cancelled = false;
            }
        }

        this._isSaving = true;
        const activeBtn = publishImmediately ? saveBtn : saveDraftBtn;
        const otherBtn = publishImmediately ? saveDraftBtn : saveBtn;
        if (activeBtn) {
            activeBtn.disabled = true;
            activeBtn.classList.add('btn--loading');
        }
        if (otherBtn) otherBtn.disabled = true;
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
        } finally {
            this._isSaving = false;
            if (activeBtn) {
                activeBtn.disabled = false;
                activeBtn.classList.remove('btn--loading');
            }
            if (otherBtn) otherBtn.disabled = false;
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
        if (this._reservationsListenersAttached) return;
        this._reservationsListenersAttached = true;
        const periodFilter = document.getElementById('reservationsPeriodFilter');
        const filter = document.getElementById('reservationsActivityFilter');
        const whatsappFilter = document.getElementById('reservationsWhatsappFilter');
        if (periodFilter) {
            periodFilter.value = this.filters.reservationsPeriod;
            periodFilter.addEventListener('change', (e) => {
                this.filters.reservationsPeriod = e.target.value;
                this._saveReservationsPeriod(e.target.value);
                this.renderReservationsTable();
            });
        }
        if (filter) {
            filter.addEventListener('change', (e) => {
                this.filters.activityFilter = e.target.value;
                this.renderReservationsTable();
            });
        }
        if (whatsappFilter) {
            whatsappFilter.addEventListener('change', (e) => {
                this.filters.whatsappStatus = e.target.value;
                this.renderReservationsTable();
            });
        }
    }

    _loadReservationsPeriod() {
        try {
            const v = localStorage.getItem('admin.reservations.period');
            if (v === 'active' || v === 'past' || v === 'all') return v;
        } catch (e) { /* localStorage unavailable */ }
        return 'active';
    }

    _saveReservationsPeriod(value) {
        try { localStorage.setItem('admin.reservations.period', value); } catch (e) { /* ignore */ }
    }

    _updateReservationsStats(scopedList) {
        const total     = scopedList.length;
        const confirmed = scopedList.filter(r => r.status === 'confirmed').length;
        const cancelled = scopedList.filter(r => r.status === 'cancelled').length;
        const pending   = scopedList.filter(r => r.status === 'confirmed' && !r.whatsapp_confirmed_at).length;
        const male      = scopedList.filter(r => r.gender_at_booking === 'male').length;
        const female    = scopedList.filter(r => r.gender_at_booking === 'female').length;
        const members   = scopedList.filter(r => !!r.member).length;
        const visitors  = scopedList.filter(r => !!r.visitor).length;

        const set = (id, v) => {
            const el = document.getElementById(id);
            if (el) el.textContent = v;
        };
        set('resStatTotal', total);
        set('resStatConfirmed', confirmed);
        set('resStatPending', pending);
        set('resStatCancelled', cancelled);
        set('resStatMale', male);
        set('resStatFemale', female);
        set('resStatMembers', members);
        set('resStatVisitors', visitors);
    }

    _refreshPeriodFilterCounts(activeCount, pastCount) {
        const sel = document.getElementById('reservationsPeriodFilter');
        if (!sel) return;
        const labels = {
            active: `النشطة والقادمة (${activeCount})`,
            past:   `المنتهية (${pastCount})`,
            all:    `الكل (${activeCount + pastCount})`,
        };
        Array.from(sel.options).forEach(opt => {
            if (labels[opt.value]) opt.textContent = labels[opt.value];
        });
    }

    _isReservationActivityPast(r) {
        const a = r.activity;
        if (!a || !a.activity_date) return false;
        const endTime = a.end_time || '23:59:59';
        const endIso = `${a.activity_date}T${endTime.length === 5 ? endTime + ':00' : endTime}`;
        return new Date(endIso).getTime() <= Date.now();
    }

    async loadReservations() {
        try {
            const sb = window.sbClient;
            const { data, error } = await sb
                .from('activity_reservations')
                .select(`
                    id, status, gender_at_booking, reserved_at, cancelled_at,
                    whatsapp_confirmed_at, attendance_status, attended_at, certificate_serial,
                    activity:activities (id, name, activity_date, start_time, location, end_time),
                    visitor:visitors (id, full_name, email, phone),
                    member:profiles!member_user_id (id, full_name, email, phone)
                `)
                .order('reserved_at', { ascending: false });

            if (error) throw error;
            this.reservations = data || [];

            // أعضاء أديب: قد لا يكون رقم الجوال محفوظًا في profiles بل في member_details
            const memberIdsMissingPhone = Array.from(new Set(
                this.reservations
                    .filter(r => r.member && !r.member.phone && r.member.id)
                    .map(r => r.member.id)
            ));
            if (memberIdsMissingPhone.length > 0) {
                const { data: details, error: detErr } = await sb
                    .from('member_details')
                    .select('user_id, phone')
                    .in('user_id', memberIdsMissingPhone);
                if (!detErr && details) {
                    const phoneMap = {};
                    details.forEach(d => { if (d.phone) phoneMap[d.user_id] = d.phone; });
                    this.reservations.forEach(r => {
                        if (r.member && !r.member.phone && phoneMap[r.member.id]) {
                            r.member.phone = phoneMap[r.member.id];
                        }
                    });
                }
            }

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

        // عدّادات الفترات (تُحدَّث في الـ dropdown قبل تطبيق فلتر الفترة نفسه)
        const activeCount = this.reservations.filter(r => !this._isReservationActivityPast(r)).length;
        const pastCount = this.reservations.length - activeCount;
        this._refreshPeriodFilterCounts(activeCount, pastCount);

        let filtered = this.reservations;

        // فلتر الفترة (افتراضي: النشطة والقادمة)
        if (this.filters.reservationsPeriod === 'active') {
            filtered = filtered.filter(r => !this._isReservationActivityPast(r));
        } else if (this.filters.reservationsPeriod === 'past') {
            filtered = filtered.filter(r => this._isReservationActivityPast(r));
        }

        // الإحصائيات تُحسب على نطاق الفترة المختارة (قبل فلاتر النشاط/واتساب)
        this._updateReservationsStats(filtered);

        if (this.filters.activityFilter) {
            filtered = filtered.filter(r => r.activity?.id === this.filters.activityFilter);
        }

        if (this.filters.whatsappStatus === 'pending') {
            filtered = filtered.filter(r => r.status === 'confirmed' && !r.whatsapp_confirmed_at);
        } else if (this.filters.whatsappStatus === 'confirmed') {
            filtered = filtered.filter(r => !!r.whatsapp_confirmed_at);
        }

        if (filtered.length === 0) {
            container.innerHTML = `<div class="empty-state">
                <div class="empty-state__icon"><i class="fa-solid fa-inbox"></i></div>
                <p class="empty-state__title">لا توجد حجوزات بعد</p>
            </div>`;
            return;
        }

        const rows = filtered.map((r, i) => {
            const guest = r.visitor || r.member || {};
            const accountBadge = r.visitor
                ? `<span class="uc-badge uc-badge--info"><i class="fa-solid fa-user"></i> زائر</span>`
                : `<span class="uc-badge uc-badge--primary"><i class="fa-solid fa-id-badge"></i> عضو</span>`;
            const genderLabel = r.gender_at_booking === 'male' ? 'ذكر' : 'أنثى';
            const statusBadge = r.status === 'confirmed'
                ? `<span class="uc-badge uc-badge--success"><i class="fa-solid fa-circle" style="font-size:0.55rem;"></i>مؤكد</span>`
                : `<span class="uc-badge uc-badge--danger"><i class="fa-solid fa-circle" style="font-size:0.55rem;"></i>ملغي</span>`;

            const waCell = this.renderWhatsappCell(r, guest);
            const confirmCell = this.renderWhatsappConfirmCell(r);
            const phoneCell = guest.phone
                ? `<span dir="ltr">${this.escapeHtml(guest.phone)}</span>`
                : `<span class="cell-muted"><i class="fa-solid fa-minus"></i></span>`;

            return `
            <tr>
                <td>${i + 1}</td>
                <td>${this.escapeHtml(r.activity?.name || '—')}</td>
                <td>${this.escapeHtml(guest.full_name || '—')}</td>
                <td>${phoneCell}</td>
                <td>${genderLabel}</td>
                <td>${accountBadge}</td>
                <td>${statusBadge}</td>
                <td>${waCell}</td>
                <td>${confirmCell}</td>
                <td>${new Date(r.reserved_at).toLocaleDateString('ar-SA')}</td>
            </tr>`;
        }).join('');

        container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3><i class="fa-solid fa-table"></i> جدول الحجوزات</h3>
                <button class="btn btn-primary btn-icon btn-outline" id="refreshReservationsBtn" type="button" title="تحديث">
                    <i class="fa-solid fa-rotate"></i>
                </button>
            </div>
            <div class="card-body">
                <div class="data-table-wrap">
                    <div class="data-table-scroll">
                        <table class="data-table data-table--striped data-table--with-index">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>النشاط</th>
                                    <th>الاسم</th>
                                    <th>الجوال</th>
                                    <th>الجنس</th>
                                    <th>نوع الحساب</th>
                                    <th>الحالة</th>
                                    <th>واتساب</th>
                                    <th>تأكيد التواصل</th>
                                    <th>تاريخ الحجز</th>
                                </tr>
                            </thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>`;

        this.attachReservationRowListeners();
    }

    // ============================================
    // واتساب: بناء الزر والقالب
    // ============================================
    normalizePhoneForWhatsapp(phone) {
        if (!phone) return null;
        // إزالة كل ما ليس رقمًا (بما في ذلك +، مسافات، شرطات، أقواس)
        let digits = String(phone).replace(/\D+/g, '');
        if (!digits) return null;
        // أرقام السعودية: 05XXXXXXXX → 9665XXXXXXXX، 5XXXXXXXX → 9665XXXXXXXX
        if (digits.startsWith('00')) digits = digits.slice(2);
        if (digits.startsWith('05') && digits.length === 10) digits = '966' + digits.slice(1);
        else if (digits.startsWith('5') && digits.length === 9) digits = '966' + digits;
        // التحقق من طول معقول لرقم دولي (8-15 رقمًا)
        if (digits.length < 8 || digits.length > 15) return null;
        return digits;
    }

    buildWhatsappMessage(r, guest) {
        const a = r.activity || {};
        const dateStr = a.activity_date
            ? new Date(a.activity_date).toLocaleDateString('ar-SA', { weekday:'long', year:'numeric', month:'long', day:'numeric' })
            : '';
        const timeStr = this.formatTime(a.start_time) + (a.end_time ? ' - ' + this.formatTime(a.end_time) : '');
        const lines = [
            'السلام عليكم ' + (guest.full_name || '') + '،',
            '',
            'نؤكد حجزك في جلسة "' + (a.name || '') + '".', '',
            'التاريخ: ' + dateStr, '',
            'الوقت: ' + timeStr, '',
            'ملحوظة: ' + "يُرجى الحضور قبل الموعد المحدد بـ10 دقايق على الأقل لضمان سلاسة الدخول", '',
        ];
        if (a.location) {
            lines.push('الموقع: ' + a.location);
            lines.push('https://maps.app.goo.gl/tK5Z1vLVmMCz2CkH7?g_st=ic');
        }
        lines.push('', 'نسعد بحضورك.', 'مع تحيات نادي أدِيب');
        return lines.join('\n');
    }

    renderWhatsappCell(r, guest) {
        const phone = this.normalizePhoneForWhatsapp(guest.phone);
        if (!phone) {
            return `<button type="button" class="btn btn-outline btn-sm" disabled title="لا يوجد رقم جوال صالح">
                <i class="fa-brands fa-whatsapp"></i> غير متاح
            </button>`;
        }
        const msg = this.buildWhatsappMessage(r, guest);
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
        return `<a class="btn btn-success btn-sm" href="${this.escapeHtml(url)}" target="_blank" rel="noopener noreferrer">
            <i class="fa-brands fa-whatsapp"></i> تواصل
        </a>`;
    }

    renderWhatsappConfirmCell(r) {
        if (r.status === 'cancelled') {
            return '<span class="cell-muted">—</span>';
        }
        if (r.whatsapp_confirmed_at) {
            const when = new Date(r.whatsapp_confirmed_at).toLocaleDateString('ar-SA');
            return `<span class="uc-badge uc-badge--success" title="تم التأكيد">
                <i class="fa-solid fa-check-circle"></i> ${this.escapeHtml(when)}
            </span>`;
        }
        return `<button type="button" class="btn btn-warning btn-sm" data-confirm-whatsapp="${this.escapeHtml(r.id)}">
            <i class="fa-solid fa-check"></i> تم التأكيد
        </button>`;
    }

    attachReservationRowListeners() {
        const container = document.getElementById('reservationsTableContainer');
        if (!container) return;
        container.querySelectorAll('[data-confirm-whatsapp]').forEach(btn => {
            btn.addEventListener('click', () => this.confirmWhatsapp(btn.dataset.confirmWhatsapp, btn));
        });
        const refreshBtn = container.querySelector('#refreshReservationsBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadReservations());
        }
    }

    async confirmWhatsapp(reservationId, btn) {
        if (!reservationId) return;
        const original = btn?.innerHTML;
        try {
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري…';
            }
            const sb = window.sbClient;
            const { error } = await sb.rpc('confirm_whatsapp', { p_reservation_id: reservationId });
            if (error) throw error;
            this.notifySuccess('تم تسجيل تأكيد التواصل عبر واتساب');
            const row = this.reservations.find(r => r.id === reservationId);
            if (row) row.whatsapp_confirmed_at = new Date().toISOString();
            this.renderReservationsTable();
        } catch (err) {
            console.error('ActivitiesManager: confirmWhatsapp error', err);
            const msg = (err.message || '').includes('NOT_AUTHORIZED')
                ? 'لا تملك صلاحية تأكيد الواتساب'
                : 'فشل تسجيل التأكيد: ' + (err.message || '');
            this.notifyError(msg);
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = original;
            }
        }
    }

    // ============================================
    // 4. بيانات الزوار
    // ============================================
    attachVisitorsListeners() {
        if (this._visitorsListenersAttached) return;
        this._visitorsListenersAttached = true;
        // الأزرار تُربط داخل renderVisitorsTable لأنها أصبحت في card-header المُعاد بناؤه
    }

    _updateVisitorsStats() {
        const total  = this.visitors.length;
        const male   = this.visitors.filter(v => v.gender === 'male').length;
        const female = this.visitors.filter(v => v.gender === 'female').length;
        const set = (id, v) => {
            const el = document.getElementById(id);
            if (el) el.textContent = v;
        };
        set('visitorsCount', total);
        set('visitorsMaleCount', male);
        set('visitorsFemaleCount', female);
    }

    attachVisitorsRowListeners() {
        const container = document.getElementById('visitorsTableContainer');
        if (!container) return;

        const optionsBtn = container.querySelector('#visitorsListOptionsBtn');
        if (!optionsBtn) return;

        // أنشئ القائمة المنسدلة في body مرة واحدة فقط
        let dropdown = document.getElementById('visitorsListOptionsDropdown');
        if (!dropdown) {
            dropdown = document.createElement('div');
            dropdown.id = 'visitorsListOptionsDropdown';
            dropdown.className = 'dropdown-menu';
            dropdown.innerHTML = `
                <button class="btn btn-slate btn-outline btn-block" data-action="refresh">
                    <i class="fa-solid fa-rotate"></i> تحديث
                </button>
                <button class="btn btn-primary btn-outline btn-block" data-action="export">
                    <i class="fa-solid fa-file-export"></i> تصدير البيانات
                </button>
            `;
            document.body.appendChild(dropdown);

            dropdown.addEventListener('click', (e) => {
                const actionBtn = e.target.closest('[data-action]');
                if (!actionBtn) return;
                dropdown.classList.remove('show');
                if (actionBtn.dataset.action === 'export') this.exportVisitorsCsv();
                else if (actionBtn.dataset.action === 'refresh') this.loadVisitors();
            });

            document.addEventListener('click', (e) => {
                if (!e.target.closest('#visitorsListOptionsBtn')
                    && !e.target.closest('#visitorsListOptionsDropdown')) {
                    dropdown.classList.remove('show');
                }
            });
        }

        // اربط زر التبديل من جديد بعد كل re-render
        optionsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = dropdown.classList.toggle('show');
            if (isOpen) {
                const rect = optionsBtn.getBoundingClientRect();
                dropdown.style.top = (rect.bottom + 6) + 'px';
                dropdown.style.left = rect.left + 'px';
            }
        });
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
            this._updateVisitorsStats();
        } catch (err) {
            console.error('ActivitiesManager: loadVisitors error', err);
            this.notifyError('حدث خطأ في تحميل الزوار: ' + (err.message || ''));
        }
    }

    renderVisitorsTable() {
        const container = document.getElementById('visitorsTableContainer');
        if (!container) return;

        if (this.visitors.length === 0) {
            container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3><i class="fa-solid fa-table"></i> جدول الزوار</h3>
                    <div class="va-menu" id="visitorsActionsMenu">
                        <button class="btn btn-primary btn-icon btn-outline" type="button" data-va-toggle title="خيارات" aria-haspopup="true" aria-expanded="false">
                            <i class="fa-solid fa-ellipsis-vertical"></i>
                        </button>
                        <div class="va-menu__list" role="menu">
                            <button class="va-menu__item" id="exportVisitorsCsvBtn" type="button" role="menuitem">
                                <i class="fa-solid fa-file-csv"></i> تصدير CSV
                            </button>
                            <button class="va-menu__item" id="refreshVisitorsBtn" type="button" role="menuitem">
                                <i class="fa-solid fa-rotate"></i> تحديث
                            </button>
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    <div class="empty-state">
                        <div class="empty-state__icon"><i class="fa-solid fa-users-slash"></i></div>
                        <p class="empty-state__title">لا يوجد زوار مسجلون بعد</p>
                    </div>
                </div>
            </div>`;
            this.attachVisitorsRowListeners();
            return;
        }

        const rows = this.visitors.map((v, i) => {
            const genderLabel = v.gender === 'male' ? 'ذكر' : 'أنثى';
            const marketingBadge = v.accepts_marketing
                ? `<span class="uc-badge uc-badge--success"><i class="fa-solid fa-circle" style="font-size:0.55rem;"></i>نعم</span>`
                : `<span class="uc-badge uc-badge--danger"><i class="fa-solid fa-circle" style="font-size:0.55rem;"></i>لا</span>`;
            const phoneCell = v.phone
                ? `<span dir="ltr">${this.escapeHtml(v.phone)}</span>`
                : `<span class="cell-muted"><i class="fa-solid fa-minus"></i></span>`;
            const emailCell = v.email
                ? `<span dir="ltr">${this.escapeHtml(v.email)}</span>`
                : `<span class="cell-muted"><i class="fa-solid fa-minus"></i></span>`;

            return `
            <tr>
                <td>${i + 1}</td>
                <td>${this.escapeHtml(v.full_name || '—')}</td>
                <td>${phoneCell}</td>
                <td>${emailCell}</td>
                <td>${genderLabel}</td>
                <td>${this.escapeHtml(v.city || '—')}</td>
                <td>${marketingBadge}</td>
                <td>${new Date(v.created_at).toLocaleDateString('ar-SA')}</td>
            </tr>`;
        }).join('');

        container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3><i class="fa-solid fa-table"></i> جدول الزوار</h3>
                <button class="btn btn-primary btn-outline btn-icon" id="visitorsListOptionsBtn" type="button" title="خيارات">
                    <i class="fa-solid fa-ellipsis-vertical" style="pointer-events:none;"></i>
                </button>
            </div>
            <div class="card-body">
                <div class="data-table-wrap">
                    <div class="data-table-scroll">
                        <table class="data-table data-table--striped data-table--with-index">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>الاسم</th>
                                    <th>الجوال</th>
                                    <th>البريد</th>
                                    <th>الجنس</th>
                                    <th>المدينة</th>
                                    <th>يقبل الترويج</th>
                                    <th>تاريخ التسجيل</th>
                                </tr>
                            </thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>`;

        this.attachVisitorsRowListeners();
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
