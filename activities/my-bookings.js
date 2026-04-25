/**
 * صفحة "حجوزاتي" — يعرض حجوزات الزائر/العضو الحالي
 * يدعم إلغاء الحجوزات القادمة عبر RPC cancel_activity_reservation
 */

(function () {
    'use strict';

    const sb = window.sbClient;
    if (!sb) {
        console.error('[my-bookings] Supabase client not initialized');
        return;
    }

    const els = {
        loading:   document.getElementById('mbLoadingState'),
        auth:      document.getElementById('mbAuthState'),
        empty:     document.getElementById('mbEmptyState'),
        error:     document.getElementById('mbErrorState'),
        errorMsg:  document.getElementById('mbErrorMessage'),
        summary:   document.getElementById('mbSummary'),
        container: document.getElementById('mbBookingsContainer'),
        userArea:  document.getElementById('headerUserArea'),
    };

    function showOnly(name) {
        ['loading', 'auth', 'empty', 'error'].forEach(s => {
            if (els[s]) els[s].style.display = 'none';
        });
        if (els.container) els.container.style.display = 'none';
        if (els.summary)   els.summary.style.display = 'none';
        if (name === 'list') {
            if (els.container) els.container.style.display = 'flex';
            if (els.summary)   els.summary.style.display = 'grid';
        } else if (els[name]) {
            els[name].style.display = 'block';
        }
    }

    function escapeHtml(t) {
        const div = document.createElement('div');
        div.textContent = t == null ? '' : String(t);
        return div.innerHTML;
    }

    function setBoxMessage(box, msg) {
        if (!box) return;
        const span = box.querySelector('span');
        if (span) span.textContent = msg;
        else box.textContent = msg;
    }

    function formatDate(d) {
        if (!d) return '';
        try {
            return new Date(d).toLocaleDateString('ar-SA', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });
        } catch (_) { return d; }
    }

    function formatTime(t) {
        if (!t) return '';
        const [h, m] = t.split(':');
        const d = new Date();
        d.setHours(parseInt(h, 10), parseInt(m, 10), 0);
        return d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: true });
    }

    function activityTypeLabel(type) {
        switch (type) {
            case 'workshop': return 'ورشة';
            case 'program':  return 'برنامج';
            default:         return 'نشاط';
        }
    }

    function activityTypeIcon(type) {
        switch (type) {
            case 'workshop': return 'fa-screwdriver-wrench';
            case 'program':  return 'fa-list-check';
            default:         return 'fa-calendar-day';
        }
    }

    function humanizeError(code) {
        const map = {
            NOT_AUTHENTICATED:    'يجب تسجيل الدخول أولًا.',
            RESERVATION_NOT_FOUND:'الحجز غير موجود.',
            NOT_OWNER:            'لا يحق لك إلغاء هذا الحجز.',
            ACTIVITY_PAST:        'لا يمكن إلغاء حجز نشاط منقضٍ.',
        };
        for (const key in map) {
            if (code && code.includes(key)) return map[key];
        }
        return code || 'حدث خطأ غير متوقع.';
    }

    let currentUser = null;
    let currentProfile = null;
    let bookings = [];
    let pendingCancelId = null;

    async function detectCurrentUser() {
        const { data: { session } } = await sb.auth.getSession();
        if (!session) return null;

        currentUser = session.user;

        const { data: visitorRow } = await sb
            .from('visitors')
            .select('id, full_name, email')
            .eq('id', session.user.id)
            .maybeSingle();

        if (visitorRow) {
            currentProfile = visitorRow;
            return 'visitor';
        }

        const { data: profileRow } = await sb
            .from('profiles')
            .select('id, full_name, email, account_status')
            .eq('id', session.user.id)
            .maybeSingle();

        if (profileRow && profileRow.account_status === 'active') {
            currentProfile = profileRow;
            return 'member';
        }
        return null;
    }

    function renderUserArea() {
        if (!els.userArea) return;
        if (currentProfile) {
            const name = currentProfile.full_name || currentProfile.email || 'حسابي';
            const initial = (name || '?').trim().charAt(0);
            els.userArea.innerHTML = `
                <span class="user-chip">
                    <span class="user-chip__avatar">${escapeHtml(initial)}</span>
                    ${escapeHtml(name)}
                </span>
                <button type="button" class="btn btn--danger-ghost btn--sm" id="logoutBtn">
                    <i class="fa-solid fa-arrow-right-from-bracket"></i>
                    <span>خروج</span>
                </button>
            `;
            document.getElementById('logoutBtn')?.addEventListener('click', async () => {
                await sb.auth.signOut();
                location.replace('../activities.html');
            });
        } else {
            els.userArea.innerHTML = `
                <a href="../activities.html" class="btn btn--primary btn--sm">
                    <i class="fa-solid fa-arrow-right-to-bracket"></i>
                    <span>تسجيل الدخول</span>
                </a>
            `;
        }
    }

    async function loadBookings() {
        showOnly('loading');
        try {
            const { data, error } = await sb
                .from('activity_reservations')
                .select(`
                    id,
                    status,
                    reserved_at,
                    cancelled_at,
                    gender_at_booking,
                    activity:activities (
                        id, name, description, activity_type, location,
                        activity_date, start_time, end_time, is_cancelled,
                        cover_image_url
                    )
                `)
                .or(`visitor_id.eq.${currentUser.id},member_user_id.eq.${currentUser.id}`)
                .order('reserved_at', { ascending: false });

            if (error) throw error;
            bookings = data || [];

            if (bookings.length === 0) {
                showOnly('empty');
                return;
            }
            renderSummary();
            renderBookings();
            showOnly('list');
        } catch (err) {
            console.error('[my-bookings] load error:', err);
            els.errorMsg.textContent = err.message || 'حدث خطأ في تحميل الحجوزات';
            showOnly('error');
        }
    }

    function bookingState(b) {
        if (b.status === 'cancelled') return 'cancelled';
        if (b.activity?.is_cancelled)  return 'event-cancelled';
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const actDate = b.activity?.activity_date ? new Date(b.activity.activity_date) : null;
        if (actDate && actDate < today) return 'past';
        return 'upcoming';
    }

    function renderSummary() {
        const counts = { upcoming: 0, past: 0, cancelled: 0 };
        bookings.forEach(b => {
            const s = bookingState(b);
            if (s === 'upcoming') counts.upcoming++;
            else if (s === 'cancelled' || s === 'event-cancelled') counts.cancelled++;
            else counts.past++;
        });

        els.summary.innerHTML = `
            <div class="summary-stat summary-stat--ok">
                <div class="summary-stat__icon"><i class="fa-solid fa-calendar-check"></i></div>
                <div class="summary-stat__body">
                    <span class="summary-stat__num">${counts.upcoming}</span>
                    <span class="summary-stat__lbl">قادمة</span>
                </div>
            </div>
            <div class="summary-stat summary-stat--mute">
                <div class="summary-stat__icon"><i class="fa-solid fa-clock-rotate-left"></i></div>
                <div class="summary-stat__body">
                    <span class="summary-stat__num">${counts.past}</span>
                    <span class="summary-stat__lbl">منتهية</span>
                </div>
            </div>
            <div class="summary-stat summary-stat--bad">
                <div class="summary-stat__icon"><i class="fa-solid fa-ban"></i></div>
                <div class="summary-stat__body">
                    <span class="summary-stat__num">${counts.cancelled}</span>
                    <span class="summary-stat__lbl">ملغية</span>
                </div>
            </div>
        `;
    }

    function statusBadge(state) {
        switch (state) {
            case 'upcoming':         return `<span class="bk-badge bk-badge--ok"><i class="fa-solid fa-circle"></i> مؤكد</span>`;
            case 'past':             return `<span class="bk-badge bk-badge--mute"><i class="fa-solid fa-clock-rotate-left"></i> منتهٍ</span>`;
            case 'cancelled':        return `<span class="bk-badge bk-badge--bad"><i class="fa-solid fa-ban"></i> ألغيتَ هذا الحجز</span>`;
            case 'event-cancelled':  return `<span class="bk-badge bk-badge--bad"><i class="fa-solid fa-triangle-exclamation"></i> النشاط مُلغى</span>`;
        }
        return '';
    }

    function renderBookings() {
        els.container.innerHTML = bookings.map(b => {
            const a = b.activity;
            if (!a) return '';
            const st = bookingState(b);
            const canCancel = (st === 'upcoming');

            const cancelBtn = canCancel
                ? `<button class="btn btn--danger-ghost btn--sm" data-cancel-reservation="${escapeHtml(b.id)}" data-activity-name="${escapeHtml(a.name)}">
                       <i class="fa-solid fa-xmark"></i>
                       <span>إلغاء الحجز</span>
                   </button>`
                : '';

            const coverHtml = a.cover_image_url
                ? `<img src="${escapeHtml(a.cover_image_url)}" alt="${escapeHtml(a.name)}" />`
                : `<i class="fa-solid ${activityTypeIcon(a.activity_type)}"></i>`;

            return `
            <article class="booking ${st === 'cancelled' || st === 'event-cancelled' || st === 'past' ? 'is-dim' : ''}" data-reservation-id="${escapeHtml(b.id)}">
                <div class="booking__media">
                    ${coverHtml}
                    <span class="booking__type">${activityTypeLabel(a.activity_type)}</span>
                </div>
                <div class="booking__body">
                    <div class="booking__head">
                        <h3 class="booking__title">${escapeHtml(a.name)}</h3>
                        ${statusBadge(st)}
                    </div>
                    <div class="booking__meta">
                        <span><i class="fa-regular fa-calendar"></i> ${formatDate(a.activity_date)}</span>
                        <span><i class="fa-regular fa-clock"></i> ${formatTime(a.start_time)}${a.end_time ? ' — ' + formatTime(a.end_time) : ''}</span>
                        ${a.location ? `<span><i class="fa-solid fa-location-dot"></i> ${escapeHtml(a.location)}</span>` : ''}
                    </div>
                </div>
                ${cancelBtn ? `<div class="booking__action">${cancelBtn}</div>` : ''}
            </article>`;
        }).join('');

        // ربط أزرار الإلغاء
        els.container.querySelectorAll('[data-cancel-reservation]').forEach(btn => {
            btn.addEventListener('click', () => openCancelModal(btn.dataset.cancelReservation, btn.dataset.activityName));
        });
    }

    // ============================================
    // مودال تأكيد الإلغاء
    // ============================================
    function openModal(name) {
        document.getElementById(`${name}Modal`)?.classList.add('active');
        document.getElementById(`${name}Backdrop`)?.classList.add('active');
    }

    function closeModal(name) {
        document.getElementById(`${name}Modal`)?.classList.remove('active');
        document.getElementById(`${name}Backdrop`)?.classList.remove('active');
    }

    function openCancelModal(reservationId, activityName) {
        pendingCancelId = reservationId;
        const titleEl = document.querySelector('#cancelActivityName .confirm__title');
        if (titleEl) titleEl.textContent = activityName || 'النشاط';
        const errBox = document.getElementById('cancelError');
        if (errBox) errBox.style.display = 'none';
        openModal('cancel');
    }

    async function confirmCancel() {
        if (!pendingCancelId) return;
        const btn = document.getElementById('confirmCancelBtn');
        const errBox = document.getElementById('cancelError');
        if (errBox) errBox.style.display = 'none';

        btn.disabled = true;
        btn.classList.add('btn--loading');
        const original = btn.innerHTML;
        btn.innerHTML = '<span>جاري الإلغاء...</span>';

        try {
            const { error } = await sb.rpc('cancel_activity_reservation', { p_reservation_id: pendingCancelId });
            if (error) throw error;
            closeModal('cancel');
            pendingCancelId = null;
            await loadBookings();
        } catch (err) {
            console.error('[my-bookings] cancel error:', err);
            setBoxMessage(errBox, humanizeError(err.message || String(err)));
            errBox.style.display = 'flex';
        } finally {
            btn.disabled = false;
            btn.classList.remove('btn--loading');
            btn.innerHTML = original;
        }
    }

    function bindModalControls() {
        document.querySelectorAll('[data-close-modal]').forEach(btn => {
            btn.addEventListener('click', () => closeModal(btn.dataset.closeModal.replace('Modal', '')));
        });
        document.getElementById('cancelBackdrop')?.addEventListener('click', () => closeModal('cancel'));
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeModal('cancel');
        });
        document.getElementById('confirmCancelBtn')?.addEventListener('click', confirmCancel);
    }

    async function init() {
        bindModalControls();
        const accountType = await detectCurrentUser();
        renderUserArea();
        if (!accountType) {
            showOnly('auth');
            return;
        }
        await loadBookings();
    }

    document.addEventListener('DOMContentLoaded', init);
})();
