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
        loading: document.getElementById('mbLoadingState'),
        auth: document.getElementById('mbAuthState'),
        empty: document.getElementById('mbEmptyState'),
        error: document.getElementById('mbErrorState'),
        errorMsg: document.getElementById('mbErrorMessage'),
        container: document.getElementById('mbBookingsContainer'),
        userArea: document.getElementById('headerUserArea'),
    };

    function showOnly(name) {
        ['loading', 'auth', 'empty', 'error'].forEach(s => {
            if (els[s]) els[s].style.display = 'none';
        });
        if (els.container) els.container.style.display = 'none';
        if (name === 'list' && els.container) {
            els.container.style.display = 'grid';
        } else if (els[name]) {
            els[name].style.display = 'block';
        }
    }

    function escapeHtml(t) {
        const div = document.createElement('div');
        div.textContent = t == null ? '' : String(t);
        return div.innerHTML;
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

    function humanizeError(code) {
        const map = {
            NOT_AUTHENTICATED: 'يجب تسجيل الدخول أولًا.',
            RESERVATION_NOT_FOUND: 'الحجز غير موجود.',
            NOT_OWNER: 'لا يحق لك إلغاء هذا الحجز.',
            ACTIVITY_PAST: 'لا يمكن إلغاء حجز نشاط منقضٍ.',
        };
        for (const key in map) {
            if (code && code.includes(key)) return map[key];
        }
        return code || 'حدث خطأ غير متوقع.';
    }

    let currentUser = null;
    let currentProfile = null;
    let bookings = [];

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
            els.userArea.innerHTML = `
                <span style="font-weight:600;color:var(--ap-blue-dark);font-size:0.92rem;">
                    <i class="fa-solid fa-circle-user"></i>
                    ${escapeHtml(currentProfile.full_name || currentProfile.email)}
                </span>
                <button type="button" class="ap-btn ap-btn--outline" id="logoutBtn">
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
                <a href="../activities.html" class="ap-btn ap-btn--primary">
                    <i class="fa-solid fa-arrow-right-to-bracket"></i>
                    <span>تسجيل الدخول</span>
                </a>
            `;
        }
    }

    async function loadBookings() {
        showOnly('loading');
        try {
            // Join activities to get details
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
                        activity_date, start_time, end_time, is_cancelled
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
            renderBookings();
            showOnly('list');
        } catch (err) {
            console.error('[my-bookings] load error:', err);
            els.errorMsg.textContent = err.message || 'حدث خطأ في تحميل الحجوزات';
            showOnly('error');
        }
    }

    function bookingStatusBadge(b) {
        if (b.status === 'cancelled') {
            return `<span class="ap-status-badge ap-status-badge--cancelled">
                <i class="fa-solid fa-ban"></i> ملغي
            </span>`;
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const actDate = b.activity?.activity_date ? new Date(b.activity.activity_date) : null;
        if (actDate && actDate < today) {
            return `<span class="ap-status-badge ap-status-badge--past">
                <i class="fa-solid fa-clock-rotate-left"></i> منتهٍ
            </span>`;
        }
        return `<span class="ap-status-badge ap-status-badge--confirmed">
            <i class="fa-solid fa-check"></i> مؤكد
        </span>`;
    }

    function canCancel(b) {
        if (b.status !== 'confirmed') return false;
        if (!b.activity) return false;
        if (b.activity.is_cancelled) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const actDate = new Date(b.activity.activity_date);
        return actDate >= today;
    }

    function renderBookings() {
        els.container.innerHTML = bookings.map(b => {
            const a = b.activity;
            if (!a) return '';
            const cancelBtn = canCancel(b)
                ? `<button class="ap-btn ap-btn--danger" data-cancel-reservation="${escapeHtml(b.id)}">
                       <i class="fa-solid fa-xmark"></i> <span>إلغاء الحجز</span>
                   </button>`
                : '';

            return `
            <article class="ap-booking-card" data-reservation-id="${escapeHtml(b.id)}">
                <div class="ap-booking-card__info">
                    <h3 class="ap-booking-card__title">${escapeHtml(a.name)}</h3>
                    <div class="ap-booking-card__meta">
                        <span><i class="fa-solid fa-calendar"></i> ${formatDate(a.activity_date)}</span>
                        <span><i class="fa-solid fa-clock"></i> ${formatTime(a.start_time)}</span>
                        ${a.location ? `<span><i class="fa-solid fa-location-dot"></i> ${escapeHtml(a.location)}</span>` : ''}
                    </div>
                    <div style="margin-top:0.6rem;">${bookingStatusBadge(b)}</div>
                </div>
                ${cancelBtn}
            </article>`;
        }).join('');

        // ربط أزرار الإلغاء
        els.container.querySelectorAll('[data-cancel-reservation]').forEach(btn => {
            btn.addEventListener('click', () => onCancelClick(btn.dataset.cancelReservation, btn));
        });
    }

    async function onCancelClick(reservationId, btn) {
        if (!confirm('هل أنت متأكد من إلغاء هذا الحجز؟')) return;

        btn.disabled = true;
        const original = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>جاري الإلغاء...</span>';

        try {
            const { error } = await sb.rpc('cancel_activity_reservation', { p_reservation_id: reservationId });
            if (error) throw error;
            await loadBookings();
        } catch (err) {
            console.error('[my-bookings] cancel error:', err);
            alert(humanizeError(err.message || String(err)));
            btn.disabled = false;
            btn.innerHTML = original;
        }
    }

    async function init() {
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
