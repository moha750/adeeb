/**
 * صفحة أنشطة وبرامج أديب
 * - يعرض الأنشطة المنشورة من قاعدة Supabase
 * - يدير تسجيل الزوار (حسابات حجز فقط، منفصلة عن أعضاء النادي)
 * - يدير عملية الحجز عبر الـ RPC الذرّية book_activity_seat
 */

(function () {
    'use strict';

    const sb = window.sbClient;
    if (!sb) {
        console.error('[activities] Supabase client not initialized');
        return;
    }

    // ============================================
    // الحالة العامة
    // ============================================
    const state = {
        activities: [],
        currentUser: null,        // جلسة Supabase Auth (إن وُجدت)
        currentProfile: null,     // إما visitors row أو profiles row
        accountType: null,        // 'visitor' | 'member' | null
        selectedActivityId: null,
    };

    // ============================================
    // عناصر الـ DOM
    // ============================================
    const els = {
        loading:        document.getElementById('apLoadingState'),
        empty:          document.getElementById('apEmptyState'),
        error:          document.getElementById('apErrorState'),
        errorMsg:       document.getElementById('apErrorMessage'),
        grid:           document.getElementById('apActivitiesGrid'),
        userArea:       document.getElementById('headerUserArea'),
        openLoginBtn:   document.getElementById('openLoginBtn'),
        openSignupBtn:  document.getElementById('openSignupBtn'),
    };

    // ============================================
    // أدوات مساعدة
    // ============================================
    function normalizePhone(phone) {
        if (!phone) return null;
        phone = String(phone).replace(/[^0-9]/g, '');
        phone = phone.replace(/^0+/, '');
        if (phone.startsWith('966')) phone = phone.substring(3);
        if (!phone.startsWith('0')) phone = '0' + phone;
        if (!phone.startsWith('05') || phone.length !== 10) return null;
        return phone;
    }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        try {
            return new Date(dateStr).toLocaleDateString('ar-SA', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });
        } catch (_) {
            return dateStr;
        }
    }

    function formatTime(timeStr) {
        if (!timeStr) return '';
        // timeStr بصيغة HH:MM:SS
        const [h, m] = timeStr.split(':');
        const d = new Date();
        d.setHours(parseInt(h, 10), parseInt(m, 10), 0);
        return d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: true });
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text == null ? '' : String(text);
        return div.innerHTML;
    }

    // كتابة نص رسالة داخل modal-info-box (يبحث عن span أولاً)
    function setBoxMessage(box, msg) {
        if (!box) return;
        const span = box.querySelector('span');
        if (span) span.textContent = msg;
        else box.textContent = msg;
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

    function showState(stateName) {
        ['loading', 'empty', 'error'].forEach(s => {
            if (els[s]) els[s].style.display = 'none';
        });
        if (els.grid) els.grid.style.display = 'none';
        if (stateName === 'grid' && els.grid) {
            els.grid.style.display = 'grid';
        } else if (els[stateName]) {
            els[stateName].style.display = 'block';
        }
    }

    function showError(msg) {
        if (els.errorMsg) els.errorMsg.textContent = msg;
        showState('error');
    }

    // ============================================
    // إدارة الجلسة
    // ============================================
    async function detectCurrentUser() {
        const { data: { session } } = await sb.auth.getSession();
        if (!session) {
            state.currentUser = null;
            state.currentProfile = null;
            state.accountType = null;
            renderUserArea();
            return;
        }

        state.currentUser = session.user;

        // ابحث في visitors أولًا (الأكثر شيوعًا في هذه الصفحة)
        const { data: visitorRow } = await sb
            .from('visitors')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

        if (visitorRow) {
            state.currentProfile = visitorRow;
            state.accountType = 'visitor';
        } else {
            // جرّب profiles (عضو نادي)
            const { data: profileRow } = await sb
                .from('profiles')
                .select('id, full_name, email, phone, gender, account_status')
                .eq('id', session.user.id)
                .maybeSingle();

            if (profileRow && profileRow.account_status === 'active') {
                state.currentProfile = profileRow;
                state.accountType = 'member';
            } else {
                // حساب auth بدون visitor ولا profile صالح — اخرج
                state.currentProfile = null;
                state.accountType = null;
            }
        }

        renderUserArea();
    }

    function renderUserArea() {
        if (!els.userArea) return;
        if (state.currentProfile) {
            const name = state.currentProfile.full_name || state.currentProfile.email || 'حسابي';
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
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', async () => {
                    await sb.auth.signOut();
                    state.currentUser = null;
                    state.currentProfile = null;
                    state.accountType = null;
                    renderUserArea();
                });
            }
        } else {
            els.userArea.innerHTML = `
                <button type="button" class="btn btn--ghost btn--sm" id="openLoginBtn">
                    <i class="fa-solid fa-arrow-right-to-bracket"></i>
                    <span>دخول</span>
                </button>
                <button type="button" class="btn btn--primary btn--sm" id="openSignupBtn">
                    <i class="fa-solid fa-user-plus"></i>
                    <span>إنشاء حساب</span>
                </button>
            `;
            document.getElementById('openLoginBtn')?.addEventListener('click', () => openModal('login'));
            document.getElementById('openSignupBtn')?.addEventListener('click', () => openModal('signup'));
        }
    }

    // ============================================
    // إدارة المودالات
    // ============================================
    function openModal(name) {
        const modalId = `${name}Modal`;
        const backdropId = `${name}Backdrop`;
        document.getElementById(modalId)?.classList.add('active');
        document.getElementById(backdropId)?.classList.add('active');
    }

    function closeModal(name) {
        const modalId = `${name}Modal`;
        const backdropId = `${name}Backdrop`;
        document.getElementById(modalId)?.classList.remove('active');
        document.getElementById(backdropId)?.classList.remove('active');
    }

    function closeAllModals() {
        ['signup', 'login', 'confirm', 'success'].forEach(closeModal);
    }

    function bindModalControls() {
        // أزرار الإغلاق
        document.querySelectorAll('[data-close-modal]').forEach(btn => {
            btn.addEventListener('click', () => closeModal(btn.dataset.closeModal.replace('Modal', '')));
        });

        // النقر على الـ backdrop يُغلق
        ['signup', 'login', 'confirm', 'success'].forEach(name => {
            const backdrop = document.getElementById(`${name}Backdrop`);
            if (backdrop) backdrop.addEventListener('click', () => closeModal(name));
        });

        // ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeAllModals();
        });

        // التبديل بين تسجيل الدخول وإنشاء الحساب
        document.getElementById('switchToLoginBtn')?.addEventListener('click', () => {
            closeModal('signup');
            openModal('login');
        });
        document.getElementById('switchToSignupBtn')?.addEventListener('click', () => {
            closeModal('login');
            openModal('signup');
        });
    }

    // ============================================
    // تحميل قائمة الأنشطة
    // ============================================
    async function loadActivities() {
        showState('loading');
        try {
            const { data, error } = await sb.rpc('get_published_activities_with_seats');
            if (error) throw error;

            state.activities = data || [];
            if (state.activities.length === 0) {
                showState('empty');
                return;
            }
            renderActivities();
            showState('grid');
            focusActivityFromHash();
        } catch (err) {
            console.error('[activities] loadActivities error:', err);
            showError(err.message || 'حدث خطأ في تحميل الأنشطة');
        }
    }

    function renderActivities() {
        if (!els.grid) return;
        els.grid.innerHTML = state.activities.map(renderActivityCard).join('');

        // ربط أزرار الحجز
        els.grid.querySelectorAll('[data-book-activity]').forEach(btn => {
            btn.addEventListener('click', () => onBookClick(btn.dataset.bookActivity));
        });
    }

    function focusActivityFromHash() {
        const hash = (window.location.hash || '').replace(/^#/, '').trim();
        if (!hash || !els.grid) return;
        const card = els.grid.querySelector(`[data-activity-id="${CSS.escape(hash)}"]`);
        if (!card) return;

        // ننتظر إطارَين حتى يُطبَّق showState('grid') ويصبح العنصر مرئيًا
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                card.classList.add('act-card--highlight');
                setTimeout(() => card.classList.remove('act-card--highlight'), 2400);
            });
        });
    }

    function pct(remaining, total) {
        if (!total || total <= 0) return 0;
        const booked = Math.max(0, total - (remaining || 0));
        return Math.min(100, Math.round((booked / total) * 100));
    }

    function renderActivityCard(act) {
        const totalSeats     = (act.male_seats     || 0) + (act.female_seats     || 0);
        const totalRemaining = (act.male_remaining || 0) + (act.female_remaining || 0);
        const isFull = totalRemaining <= 0;
        const isCancelled = !!act.is_cancelled;

        // غلاف
        const coverHtml = act.cover_image_url
            ? `<img src="${escapeHtml(act.cover_image_url)}" alt="${escapeHtml(act.name)}" />`
            : `<i class="fa-solid ${activityTypeIcon(act.activity_type)}"></i>`;

        // شارة الحالة
        let statusChip;
        if (isCancelled) {
            statusChip = `<span class="chip chip--status is-cancel"><i class="fa-solid fa-ban"></i>ملغي</span>`;
        } else if (isFull) {
            statusChip = `<span class="chip chip--status is-full"><i class="fa-solid fa-users-slash"></i>مكتمل</span>`;
        } else {
            statusChip = `<span class="chip chip--status"><i class="fa-solid fa-circle"></i>متاح</span>`;
        }

        // الزر
        let buttonHtml;
        if (isCancelled) {
            buttonHtml = `<button class="btn btn--ghost" disabled><i class="fa-solid fa-ban"></i><span>تم إلغاء النشاط</span></button>`;
        } else if (isFull) {
            buttonHtml = `<button class="btn btn--ghost" disabled><i class="fa-solid fa-users-slash"></i><span>اكتملت المقاعد</span></button>`;
        } else {
            buttonHtml = `<button class="btn btn--primary" data-book-activity="${escapeHtml(act.id)}"><i class="fa-solid fa-bookmark"></i><span>احجز مقعدك</span></button>`;
        }

        const descHtml = act.description
            ? `<p class="act-card__desc">${escapeHtml(act.description)}</p>`
            : '';

        const locationItem = act.location ? `
                <div class="act-meta__item">
                    <i class="fa-solid fa-location-dot"></i>
                    <span>${escapeHtml(act.location)}</span>
                </div>` : '';

        const seatsPct = pct(totalRemaining, totalSeats);

        return `
        <article class="act-card" data-activity-id="${escapeHtml(act.id)}">
            <div class="act-card__cover">
                ${coverHtml}
                <div class="act-card__chips">
                    <span class="chip chip--type">${activityTypeLabel(act.activity_type)}</span>
                    ${statusChip}
                </div>
            </div>
            <div class="act-card__body">
                <h3 class="act-card__title">${escapeHtml(act.name)}</h3>
                ${descHtml}
                <div class="act-meta">
                    <div class="act-meta__item">
                        <i class="fa-regular fa-calendar"></i>
                        <span>${formatDate(act.activity_date)}</span>
                    </div>
                    <div class="act-meta__item">
                        <i class="fa-regular fa-clock"></i>
                        <span>${formatTime(act.start_time)}${act.end_time ? ' — ' + formatTime(act.end_time) : ''}</span>
                    </div>
                    ${locationItem}
                </div>
                <div class="seats">
                    <div class="seat">
                        <div class="seat__head">
                            <span class="seat__head-l"><i class="fa-solid fa-chair"></i> المقاعد</span>
                            <span class="seat__count"><small>${totalSeats}/</small>${Math.max(0, totalSeats - totalRemaining)}</span>
                        </div>
                        <div class="seat__bar"><span style="width:${seatsPct}%"></span></div>
                    </div>
                </div>
            </div>
            <div class="act-card__foot">
                ${buttonHtml}
            </div>
        </article>`;
    }

    // ============================================
    // تدفق الحجز
    // ============================================
    function onBookClick(activityId) {
        state.selectedActivityId = activityId;
        if (!state.currentProfile) {
            // غير مسجل دخول — اعرض مودال الدخول/التسجيل
            openModal('signup');
            return;
        }
        showConfirmModal(activityId);
    }

    function showConfirmModal(activityId) {
        const act = state.activities.find(a => a.id === activityId);
        if (!act) return;

        const detailsEl = document.getElementById('confirmActivityDetails');
        if (detailsEl) {
            detailsEl.innerHTML = `
            <div class="confirm">
                <div class="confirm__head">
                    <h3 class="confirm__title">${escapeHtml(act.name)}</h3>
                </div>
                <ul class="confirm__list">
                    <li><i class="fa-regular fa-calendar"></i><span>${formatDate(act.activity_date)}</span></li>
                    <li><i class="fa-regular fa-clock"></i><span>${formatTime(act.start_time)}${act.end_time ? ' — ' + formatTime(act.end_time) : ''}</span></li>
                    ${act.location ? `<li><i class="fa-solid fa-location-dot"></i><span>${escapeHtml(act.location)}</span></li>` : ''}
                    <li><i class="fa-regular fa-user"></i><span>الحاجز: <b>${escapeHtml(state.currentProfile.full_name || state.currentProfile.email)}</b></span></li>
                </ul>
            </div>`;
        }

        document.getElementById('confirmError').style.display = 'none';
        openModal('confirm');
    }

    async function submitBooking() {
        const btn = document.getElementById('submitBookingBtn');
        const errBox = document.getElementById('confirmError');
        if (!state.selectedActivityId) return;

        // الأعضاء يجب أن يكون لديهم gender في profiles
        if (state.accountType === 'member' && !state.currentProfile.gender) {
            setBoxMessage(errBox, 'لا يمكن الحجز قبل تحديد الجنس في ملفك الشخصي بلوحة التحكم.');
            errBox.style.display = 'flex';
            return;
        }

        btn.disabled = true;
        btn.classList.add('btn--loading');
        const original = btn.innerHTML;
        btn.innerHTML = '<span>جاري الحجز...</span>';

        try {
            const { data, error } = await sb.rpc('book_activity_seat', { p_activity_id: state.selectedActivityId });
            if (error) throw error;

            closeModal('confirm');
            openModal('success');
            // أعد تحميل القائمة لتحديث المقاعد
            loadActivities();
        } catch (err) {
            console.error('[activities] booking error:', err);
            setBoxMessage(errBox, humanizeError(err.message || String(err)));
            errBox.style.display = 'flex';
        } finally {
            btn.disabled = false;
            btn.classList.remove('btn--loading');
            btn.innerHTML = original;
        }
    }

    function humanizeError(code) {
        const map = {
            NOT_AUTHENTICATED:           'يجب تسجيل الدخول أولًا.',
            ACTIVITY_NOT_FOUND:          'النشاط غير موجود.',
            ACTIVITY_NOT_PUBLISHED:      'النشاط غير منشور حاليًا.',
            ACTIVITY_CANCELLED:          'تم إلغاء هذا النشاط.',
            ACTIVITY_PAST:               'لا يمكن الحجز لنشاط منقضٍ.',
            GENDER_REQUIRED:             'يجب تحديد الجنس في ملفك قبل الحجز.',
            ALREADY_BOOKED:              'لقد حجزت مقعدًا في هذا النشاط مسبقًا.',
            NO_SEATS_AVAILABLE_FOR_GENDER: 'اكتملت المقاعد المخصصة لجنسك في هذا النشاط.',
            NOT_OWNER:                   'لا يحق لك تعديل هذا الحجز.',
            RESERVATION_NOT_FOUND:       'الحجز غير موجود.',
        };
        for (const key in map) {
            if (code && code.includes(key)) return map[key];
        }
        return code || 'حدث خطأ غير متوقع.';
    }

    // ============================================
    // التسجيل (Sign up)
    // ============================================
    async function submitSignup() {
        const btn = document.getElementById('submitSignupBtn');
        const errBox = document.getElementById('signupError');
        errBox.style.display = 'none';
        setBoxMessage(errBox, '');

        const fullName = document.getElementById('signupFullName').value.trim();
        const phoneRaw = document.getElementById('signupPhone').value.trim();
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;
        const city = document.getElementById('signupCity').value.trim();
        const accepts = document.getElementById('signupAcceptsMarketing').checked;
        const genderRadio = document.querySelector('input[name="signupGender"]:checked');

        // تحقق
        if (!fullName) return showSignupError('الرجاء إدخال الاسم الكامل.');
        const arabicNameRe = /^[ء-ي]+(?:\s+[ء-ي]+){2,3}$/;
        if (!arabicNameRe.test(fullName)) {
            return showSignupError('الاسم يجب أن يكون ثلاثيًا أو رباعيًا وبحروف عربية فقط (بدون أرقام أو رموز).');
        }
        const phone = normalizePhone(phoneRaw);
        if (!phone) return showSignupError('رقم الجوال غير صحيح. يجب أن يبدأ بـ 05 ويتكون من 10 أرقام.');
        if (!genderRadio) return showSignupError('الرجاء اختيار الجنس.');
        if (!email || !email.includes('@')) return showSignupError('البريد الإلكتروني غير صحيح.');
        if (!password || password.length < 6) return showSignupError('كلمة المرور يجب أن تكون 6 أحرف فأكثر.');

        btn.disabled = true;
        btn.classList.add('btn--loading');
        const original = btn.innerHTML;
        btn.innerHTML = '<span>جاري إنشاء الحساب...</span>';

        try {
            // 1. أنشئ حساب Supabase Auth
            const { data: signUpData, error: signUpError } = await sb.auth.signUp({
                email,
                password,
            });
            if (signUpError) throw signUpError;

            const userId = signUpData.user?.id;
            if (!userId) throw new Error('فشل إنشاء الحساب.');

            // 2. سجّل الدخول مباشرة (في حال لم يكن confirm-email مفعّلاً سيكون لدينا session)
            if (!signUpData.session) {
                const { error: signInError } = await sb.auth.signInWithPassword({ email, password });
                if (signInError) {
                    // قد يكون الحساب يحتاج تأكيد بريد
                    throw new Error('تم إنشاء الحساب. الرجاء تأكيد البريد ثم تسجيل الدخول.');
                }
            }

            // 3. أدخل صف visitors
            const { error: insertError } = await sb.from('visitors').insert({
                id: userId,
                full_name: fullName,
                email,
                phone,
                gender: genderRadio.value,
                city: city || null,
                accepts_marketing: accepts,
            });
            if (insertError) throw insertError;

            closeModal('signup');
            await detectCurrentUser();

            // إذا كان هناك نشاط مختار، انتقل لمودال التأكيد
            if (state.selectedActivityId) {
                showConfirmModal(state.selectedActivityId);
            }
        } catch (err) {
            console.error('[activities] signup error:', err);
            showSignupError(err.message || 'حدث خطأ أثناء إنشاء الحساب.');
        } finally {
            btn.disabled = false;
            btn.classList.remove('btn--loading');
            btn.innerHTML = original;
        }
    }

    function showSignupError(msg) {
        const errBox = document.getElementById('signupError');
        setBoxMessage(errBox, msg);
        errBox.style.display = 'flex';
    }

    // ============================================
    // تسجيل الدخول
    // ============================================
    async function submitLogin() {
        const btn = document.getElementById('submitLoginBtn');
        const errBox = document.getElementById('loginError');
        errBox.style.display = 'none';

        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            setBoxMessage(errBox, 'الرجاء إدخال البريد وكلمة المرور.');
            errBox.style.display = 'flex';
            return;
        }

        btn.disabled = true;
        btn.classList.add('btn--loading');
        const original = btn.innerHTML;
        btn.innerHTML = '<span>جاري الدخول...</span>';

        try {
            const { error } = await sb.auth.signInWithPassword({ email, password });
            if (error) throw error;

            closeModal('login');
            await detectCurrentUser();

            if (state.selectedActivityId) {
                showConfirmModal(state.selectedActivityId);
            }
        } catch (err) {
            console.error('[activities] login error:', err);
            setBoxMessage(errBox, err.message || 'فشل تسجيل الدخول.');
            errBox.style.display = 'flex';
        } finally {
            btn.disabled = false;
            btn.classList.remove('btn--loading');
            btn.innerHTML = original;
        }
    }

    // ============================================
    // تهيئة عامة
    // ============================================
    function bindGlobalListeners() {
        document.getElementById('submitSignupBtn')?.addEventListener('click', submitSignup);
        document.getElementById('submitLoginBtn')?.addEventListener('click', submitLogin);
        document.getElementById('submitBookingBtn')?.addEventListener('click', submitBooking);

        // الأزرار في الهيدر (بالـ event delegation لأنها قد يُعاد بناؤها)
        document.body.addEventListener('click', (e) => {
            const target = e.target.closest('[id]');
            if (!target) return;
            if (target.id === 'openLoginBtn') openModal('login');
            else if (target.id === 'openSignupBtn') openModal('signup');
        });
    }

    async function init() {
        bindModalControls();
        bindGlobalListeners();
        await detectCurrentUser();
        await loadActivities();
    }

    document.addEventListener('DOMContentLoaded', init);
})();
