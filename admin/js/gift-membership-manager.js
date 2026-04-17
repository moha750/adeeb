/**
 * مدير تبويب إهداء العضوية
 * يدعم: المنح الفردي والمنح الجماعي لأكثر من شخص دفعة واحدة
 * يعتمد على: Edge Function "create-member-directly" و "resend-onboarding-email"
 */
(function () {
    'use strict';

    const state = {
        user: null,
        committees: [],
        rows: [],
        rowSeq: 0,
        submitting: false,
        recentLoaded: false,
    };

    // ────────────────────────────────
    // تهيئة التبويب
    // ────────────────────────────────
    async function init(currentUser) {
        state.user = currentUser;
        await loadCommittees();
        await loadStats();
        await loadRecentGifts();
        bindEvents();
    }

    // ────────────────────────────────
    // تحميل اللجان المتاحة
    // ────────────────────────────────
    async function loadCommittees() {
        try {
            const { data, error } = await window.sbClient
                .from('committees')
                .select('id, committee_name_ar, is_active')
                .eq('is_active', true)
                .order('committee_name_ar');
            if (error) throw error;
            state.committees = data || [];
            populateBulkCommitteeSelect();
        } catch (err) {
            console.error('loadCommittees error', err);
            notify('تعذّر تحميل اللجان', 'error');
        }
    }

    function populateBulkCommitteeSelect() {
        const select = document.getElementById('bulkGiftCommitteeSelect');
        if (!select) return;
        select.innerHTML =
            '<option value="">اختر اللجنة</option>' +
            state.committees
                .map(c => `<option value="${c.id}">${escapeHtml(c.committee_name_ar)}</option>`)
                .join('');
    }

    // ────────────────────────────────
    // تحميل الإحصائيات
    // ────────────────────────────────
    async function loadStats() {
        try {
            const { data, error } = await window.sbClient
                .from('member_onboarding_tokens')
                .select('id, user_id, created_at, is_used')
                .is('application_id', null);
            if (error) throw error;

            const tokens = data || [];
            const now = new Date();
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

            const total = tokens.length;
            const thisMonth = tokens.filter(t => new Date(t.created_at) >= monthStart).length;
            const activated = tokens.filter(t => t.is_used === true).length;
            const pending = tokens.filter(t => t.is_used === false).length;

            setText('giftTotalCount', total);
            setText('giftMonthCount', thisMonth);
            setText('giftActivatedCount', activated);
            setText('giftPendingCount', pending);
        } catch (err) {
            console.error('loadStats error', err);
        }
    }

    // ────────────────────────────────
    // آخر الإهداءات
    // ────────────────────────────────
    async function loadRecentGifts() {
        const container = document.getElementById('recentGiftsContainer');
        if (!container) return;

        container.innerHTML = `
            <div style="text-align:center; padding:1.5rem; color:#64748b;">
                <i class="fa-solid fa-spinner fa-spin" style="font-size:1.2rem;"></i>
                <div style="margin-top:0.5rem;">جاري التحميل...</div>
            </div>`;

        try {
            const { data: tokens, error } = await window.sbClient
                .from('member_onboarding_tokens')
                .select('id, user_id, sent_to_email, is_used, created_at, expires_at')
                .is('application_id', null)
                .order('created_at', { ascending: false })
                .limit(20);
            if (error) throw error;

            const rows = tokens || [];
            if (rows.length === 0) {
                container.innerHTML = `
                    <div style="text-align:center; padding:2rem; color:#94a3b8;">
                        <i class="fa-solid fa-gift" style="font-size:2.2rem; opacity:0.45;"></i>
                        <div style="margin-top:0.6rem;">لا توجد إهداءات بعد</div>
                    </div>`;
                return;
            }

            const userIds = [...new Set(rows.map(r => r.user_id).filter(Boolean))];

            const profilesRes = userIds.length
                ? await window.sbClient
                      .from('profiles')
                      .select('id, full_name, email, account_status')
                      .in('id', userIds)
                : { data: [] };
            const profileMap = new Map((profilesRes.data || []).map(p => [p.id, p]));

            const rolesRes = userIds.length
                ? await window.sbClient
                      .from('user_roles')
                      .select('user_id, committee_id, committees(committee_name_ar)')
                      .in('user_id', userIds)
                : { data: [] };
            const roleMap = new Map();
            (rolesRes.data || []).forEach(r => {
                if (!roleMap.has(r.user_id)) roleMap.set(r.user_id, r);
            });

            const tableHtml = `
                <div class="data-table-wrap">
                    <div class="data-table-scroll">
                    <table class="data-table data-table--striped data-table--with-index">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>العضو</th>
                                <th>البريد</th>
                                <th>اللجنة</th>
                                <th>الحالة</th>
                                <th>التاريخ</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows
                                .map((r, i) => {
                                    const prof = profileMap.get(r.user_id) || {};
                                    const role = roleMap.get(r.user_id);
                                    const committeeName =
                                        role?.committees?.committee_name_ar || '—';
                                    const statusBadge = r.is_used
                                        ? '<span class="uc-badge uc-badge--success"><i class="fa-solid fa-circle" style="font-size:0.55rem;"></i>أكمل التسجيل</span>'
                                        : new Date(r.expires_at) < new Date()
                                          ? '<span class="uc-badge uc-badge--danger"><i class="fa-solid fa-circle" style="font-size:0.55rem;"></i>منتهي</span>'
                                          : '<span class="uc-badge uc-badge--warning"><i class="fa-solid fa-circle" style="font-size:0.55rem;"></i>بانتظار الإكمال</span>';
                                    return `
                                        <tr>
                                            <td>${i + 1}</td>
                                            <td>${escapeHtml(prof.full_name || '—')}</td>
                                            <td><span style="direction:ltr; display:inline-block;">${escapeHtml(prof.email || r.sent_to_email || '—')}</span></td>
                                            <td>${escapeHtml(committeeName)}</td>
                                            <td>${statusBadge}</td>
                                            <td>${formatDate(r.created_at)}</td>
                                        </tr>`;
                                })
                                .join('')}
                        </tbody>
                    </table>
                    </div>
                </div>`;
            container.innerHTML = tableHtml;
            state.recentLoaded = true;
        } catch (err) {
            console.error('loadRecentGifts error', err);
            container.innerHTML = `
                <div style="text-align:center; padding:1.5rem; color:#dc2626;">
                    <i class="fa-solid fa-circle-exclamation"></i>
                    تعذّر تحميل الإهداءات
                </div>`;
        }
    }

    // ────────────────────────────────
    // المنح الجماعي - المودال
    // ────────────────────────────────
    function openBulkModal() {
        const modal = document.getElementById('bulkGiftModal');
        const backdrop = document.getElementById('bulkGiftBackdrop');
        if (!modal) return;

        resetBulkModal();

        document.body.classList.add('modal-open');
        setTimeout(() => {
            backdrop?.classList.add('active');
            modal.classList.add('active');
        }, 10);
    }

    function closeBulkModal() {
        if (state.submitting) {
            if (!confirm('العملية قيد التنفيذ. هل تريد الإغلاق؟')) return;
        }
        const modal = document.getElementById('bulkGiftModal');
        const backdrop = document.getElementById('bulkGiftBackdrop');
        modal?.classList.remove('active');
        backdrop?.classList.remove('active');
        document.body.classList.remove('modal-open');
    }

    function resetBulkModal() {
        state.rows = [];
        state.rowSeq = 0;
        state.submitting = false;

        document.getElementById('bulkGiftFormBody').style.display = '';
        document.getElementById('bulkGiftForm').style.display = '';
        document.getElementById('bulkGiftProgressWrap').style.display = 'none';
        document.getElementById('bulkGiftResultsList').innerHTML = '';
        document.getElementById('bulkGiftSummary').style.display = 'none';
        document.getElementById('bulkGiftResetBtn').style.display = 'none';
        document.getElementById('bulkGiftDoneBtn').style.display = 'none';
        document.getElementById('bulkGiftProgressBar').style.width = '0%';

        const form = document.getElementById('bulkGiftForm');
        if (form) form.reset();
        document.getElementById('bulkGiftPasteArea').value = '';
        document.getElementById('bulkGiftRows').innerHTML = '';

        // أضف صفين افتراضياً
        addRow();
        addRow();
        updateRowsCount();
    }

    // ───── إدارة الصفوف ─────
    function addRow(preset = {}) {
        const id = ++state.rowSeq;
        state.rows.push({ id, name: preset.name || '', email: preset.email || '' });
        renderRow(id);
        updateRowsCount();
    }

    function removeRow(id) {
        if (state.rows.length <= 2) {
            notify('الصفّان الأول والثاني إلزاميّان — لا يمكن حذفهما', 'warning');
            return;
        }
        state.rows = state.rows.filter(r => r.id !== id);
        document.querySelector(`[data-bulk-row-id="${id}"]`)?.remove();
        updateRowsCount();
    }

    function renderRow(id) {
        const row = state.rows.find(r => r.id === id);
        if (!row) return;
        const wrap = document.getElementById('bulkGiftRows');
        const el = document.createElement('div');
        el.setAttribute('data-bulk-row-id', id);
        el.className = 'bulk-gift-row';
        el.innerHTML = `
            <div class="bulk-gift-row-index">
                <span data-row-index>—</span>
            </div>
            <input type="text" class="form-input"
                   data-role="name"
                   placeholder="الاسم الثلاثي أو الرباعي"
                   value="${escapeHtml(row.name)}" />
            <input type="email" class="form-input"
                   data-role="email"
                   placeholder="example@email.com"
                   value="${escapeHtml(row.email)}"
                   style="direction:ltr;" />
            <button type="button"
                    class="btn btn-danger btn-outline btn-icon btn-sm"
                    data-role="remove"
                    title="حذف">
                <i class="fa-solid fa-xmark"></i>
            </button>`;
        wrap.appendChild(el);

        el.querySelector('[data-role="name"]').addEventListener('input', e => {
            const r = state.rows.find(x => x.id === id);
            if (r) r.name = e.target.value;
        });
        el.querySelector('[data-role="email"]').addEventListener('input', e => {
            const r = state.rows.find(x => x.id === id);
            if (r) r.email = e.target.value.trim();
        });
        el.querySelector('[data-role="remove"]').addEventListener('click', () => removeRow(id));
        refreshRowIndexes();
    }

    function refreshRowIndexes() {
        const items = document.querySelectorAll('#bulkGiftRows [data-bulk-row-id]');
        const atMinimum = items.length <= 2;
        items.forEach((el, i) => {
            const span = el.querySelector('[data-row-index]');
            if (span) span.textContent = String(i + 1);
            const removeBtn = el.querySelector('[data-role="remove"]');
            if (removeBtn) {
                removeBtn.disabled = atMinimum;
                removeBtn.title = atMinimum
                    ? 'إلزامي — لا يمكن حذفه'
                    : 'حذف';
            }
        });
    }

    function updateRowsCount() {
        refreshRowIndexes();
        const count = state.rows.length;
        setText('bulkGiftRowsCount', `${count} ${count === 1 ? 'عضو' : count === 2 ? 'عضوَيْن' : 'أعضاء'}`);
        setText('bulkGiftSubmitCount', count);
    }

    // ───── اللصق السريع ─────
    function parsePastedList() {
        const raw = document.getElementById('bulkGiftPasteArea').value;
        if (!raw.trim()) {
            notify('الصق القائمة أولاً', 'warning');
            return;
        }

        const lines = raw
            .split('\n')
            .map(l => l.trim())
            .filter(Boolean);
        const parsed = [];
        for (const line of lines) {
            const parts = line.split(/[|\t،,]+/).map(p => p.trim()).filter(Boolean);
            if (parts.length < 2) continue;
            const emailIdx = parts.findIndex(p => /\S+@\S+\.\S+/.test(p));
            if (emailIdx === -1) continue;
            const email = parts[emailIdx];
            const name = parts
                .filter((_, i) => i !== emailIdx)
                .join(' ')
                .trim();
            if (name) parsed.push({ name, email });
        }

        if (parsed.length === 0) {
            notify('تعذّر استخراج أعضاء من القائمة الملصقة', 'error');
            return;
        }

        state.rows = [];
        state.rowSeq = 0;
        document.getElementById('bulkGiftRows').innerHTML = '';
        parsed.forEach(p => addRow(p));

        document.getElementById('bulkGiftPasteArea').value = '';
        notify(`تم استخراج ${parsed.length} عضو`, 'success');
    }

    // ───── التحقق ─────
    function validateFullName(name) {
        const v = name || '';
        if (v !== v.trim()) return 'يوجد فراغات في بداية أو نهاية الاسم';
        if (/\s{2,}/.test(v)) return 'الاسم يحتوي على فراغات متكررة';
        if (!/^[\u0600-\u06FF\s]+$/.test(v)) return 'الاسم يجب أن يكون بأحرف عربية فقط';
        const parts = v.split(' ').filter(p => p.length > 0);
        if (parts.length < 3) return 'الاسم يجب أن يكون ثلاثياً على الأقل';
        if (parts.length > 4) return 'الاسم يجب ألّا يزيد عن 4 كلمات';
        return null;
    }

    function validateEmail(email) {
        const v = (email || '').trim();
        if (!v) return 'البريد مطلوب';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'صيغة البريد غير صحيحة';
        return null;
    }

    // ───── الإرسال الجماعي ─────
    async function handleBulkSubmit(e) {
        e.preventDefault();
        if (state.submitting) return;

        const committeeId = document.getElementById('bulkGiftCommitteeSelect').value;
        if (!committeeId) {
            notify('اختر اللجنة المشتركة أولاً', 'warning');
            return;
        }

        if (state.rows.length === 0) {
            notify('أضف عضواً واحداً على الأقل', 'warning');
            return;
        }

        // تحقّق محلي + اكتشاف البريد المكرّر
        const seenEmails = new Set();
        const validated = state.rows.map((r, idx) => {
            const nameErr = validateFullName(r.name);
            const emailErr = validateEmail(r.email);
            let localErr = nameErr || emailErr || null;
            const emailKey = (r.email || '').trim().toLowerCase();
            if (!localErr && seenEmails.has(emailKey)) {
                localErr = 'بريد مكرّر في القائمة';
            }
            seenEmails.add(emailKey);
            return { ...r, order: idx + 1, localErr };
        });

        const invalid = validated.filter(v => v.localErr);
        if (invalid.length > 0) {
            const first = invalid[0];
            notify(`الصف ${first.order}: ${first.localErr}`, 'error');
            return;
        }

        // جلسة الإدمن
        const {
            data: { session: adminSession },
        } = await window.sbClient.auth.getSession();
        if (!adminSession) {
            notify('يجب تسجيل الدخول كمسؤول', 'error');
            return;
        }

        state.submitting = true;

        // تبديل الواجهة إلى وضع التقدم
        document.getElementById('bulkGiftForm').style.display = 'none';
        const progressWrap = document.getElementById('bulkGiftProgressWrap');
        progressWrap.style.display = '';

        setText('bulkGiftProgressTitle', 'جاري منح العضويات...');
        setText('bulkGiftProgressSubtitle', `العضو 0 من ${validated.length}`);

        const resultsList = document.getElementById('bulkGiftResultsList');
        resultsList.innerHTML = validated
            .map(
                v => `
                <div data-result-order="${v.order}" class="bulk-gift-result-row">
                    <div class="bulk-gift-result-row-icon">
                        <i class="fa-solid fa-clock"></i>
                    </div>
                    <div class="bulk-gift-result-row-body">
                        <div class="bulk-gift-result-row-name">${escapeHtml(v.name)}</div>
                        <div class="bulk-gift-result-row-email">${escapeHtml(v.email)}</div>
                    </div>
                    <span class="uc-badge uc-badge--secondary" data-status>بانتظار</span>
                </div>`,
            )
            .join('');

        let success = 0;
        let failed = 0;

        for (let i = 0; i < validated.length; i++) {
            const item = validated[i];
            const rowEl = resultsList.querySelector(`[data-result-order="${item.order}"]`);
            updateResultRow(rowEl, 'processing');

            setText(
                'bulkGiftProgressSubtitle',
                `العضو ${i + 1} من ${validated.length}: ${item.name}`,
            );

            try {
                const res = await createSingleMembership({
                    name: item.name,
                    email: item.email,
                    committeeId,
                });

                if (res.ok) {
                    success += 1;
                    updateResultRow(rowEl, 'success');
                    // إرسال بريد الترحيب
                    sendOnboardingEmail(res.userId).catch(err =>
                        console.warn('onboarding email failed', err),
                    );
                    // سجل النشاط
                    try {
                        await window.AuthManager?.logActivity(
                            state.user?.id,
                            'create_gift_membership',
                            'user',
                            res.userId,
                            { user_email: item.email, committee_id: committeeId, bulk: true },
                        );
                    } catch (_) {}
                } else {
                    failed += 1;
                    updateResultRow(rowEl, 'error', res.error);
                }
            } catch (err) {
                failed += 1;
                updateResultRow(rowEl, 'error', err?.message || 'خطأ غير معروف');
            }

            // شريط التقدم
            const pct = Math.round(((i + 1) / validated.length) * 100);
            document.getElementById('bulkGiftProgressBar').style.width = `${pct}%`;
        }

        // اكتمال العملية
        state.submitting = false;
        setText('bulkGiftSuccessCount', success);
        setText('bulkGiftFailedCount', failed);
        document.getElementById('bulkGiftSummary').style.display = '';
        document.getElementById('bulkGiftResetBtn').style.display = '';
        document.getElementById('bulkGiftDoneBtn').style.display = '';

        const progressBox = document.getElementById('bulkGiftProgressBox');
        const icon = progressBox.querySelector('i');
        icon.className =
            failed === 0
                ? 'fa-solid fa-circle-check'
                : success === 0
                  ? 'fa-solid fa-circle-xmark'
                  : 'fa-solid fa-circle-exclamation';
        setText(
            'bulkGiftProgressTitle',
            failed === 0
                ? 'اكتمل المنح بنجاح'
                : success === 0
                  ? 'فشل المنح لجميع الأعضاء'
                  : 'اكتمل المنح مع بعض الأخطاء',
        );
        setText(
            'bulkGiftProgressSubtitle',
            `نجح ${success} من ${validated.length} وفشل ${failed}`,
        );

        // حدّث الإحصائيات والقائمة
        loadStats();
        loadRecentGifts();
        notify(
            failed === 0
                ? `تم منح ${success} عضوية بنجاح`
                : `نجح ${success} وفشل ${failed}`,
            failed === 0 ? 'success' : 'warning',
        );
    }

    function updateResultRow(rowEl, status, errorMsg) {
        if (!rowEl) return;
        const iconWrap = rowEl.querySelector('.bulk-gift-result-row-icon i');
        const badge = rowEl.querySelector('[data-status]');
        rowEl.classList.remove(
            'bulk-gift-result-row--success',
            'bulk-gift-result-row--error',
        );
        if (status === 'processing') {
            iconWrap.className = 'fa-solid fa-spinner fa-spin';
            badge.className = 'uc-badge uc-badge--info';
            badge.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> قيد المعالجة';
        } else if (status === 'success') {
            iconWrap.className = 'fa-solid fa-circle-check';
            badge.className = 'uc-badge uc-badge--success';
            badge.innerHTML = '<i class="fa-solid fa-check"></i> تم المنح';
            rowEl.classList.add('bulk-gift-result-row--success');
        } else if (status === 'error') {
            iconWrap.className = 'fa-solid fa-circle-xmark';
            badge.className = 'uc-badge uc-badge--danger';
            badge.innerHTML = '<i class="fa-solid fa-xmark"></i> فشل';
            rowEl.classList.add('bulk-gift-result-row--error');
            if (errorMsg) {
                const errDiv = document.createElement('div');
                errDiv.className = 'bulk-gift-result-row-error';
                errDiv.textContent = errorMsg;
                rowEl.appendChild(errDiv);
            }
        }
    }

    async function createSingleMembership({ name, email, committeeId }) {
        const tempPassword = Math.random().toString(36).slice(-12) + 'Aa1!';
        const res = await window.edgeInvoke('create-member-directly', {
            email,
            password: tempPassword,
            full_name: name,
            committee_id: committeeId,
        });
        if (!res.ok) {
            return { ok: false, error: res.error || `خطأ ${res.status}` };
        }
        return { ok: true, userId: res.data?.user_id };
    }

    async function sendOnboardingEmail(userId) {
        if (!userId) return { ok: false, error: 'missing user_id' };
        return window.edgeInvoke('resend-onboarding-email', { user_id: userId });
    }

    // ────────────────────────────────
    // ربط الأحداث
    // ────────────────────────────────
    let eventsBound = false;
    function bindEvents() {
        if (eventsBound) return;
        eventsBound = true;

        document
            .getElementById('bulkGiftMembershipBtn')
            ?.addEventListener('click', openBulkModal);
        document
            .getElementById('closeBulkGiftModal')
            ?.addEventListener('click', closeBulkModal);
        document
            .getElementById('cancelBulkGiftBtn')
            ?.addEventListener('click', closeBulkModal);
        document.getElementById('bulkGiftBackdrop')?.addEventListener('click', e => {
            if (e.target.id === 'bulkGiftBackdrop') closeBulkModal();
        });

        document.getElementById('bulkGiftAddRowBtn')?.addEventListener('click', () => addRow());
        document
            .getElementById('bulkGiftParseBtn')
            ?.addEventListener('click', parsePastedList);
        document.getElementById('bulkGiftForm')?.addEventListener('submit', handleBulkSubmit);

        document.getElementById('bulkGiftResetBtn')?.addEventListener('click', resetBulkModal);
        document.getElementById('bulkGiftDoneBtn')?.addEventListener('click', closeBulkModal);

        document.getElementById('refreshGiftsBtn')?.addEventListener('click', async () => {
            await Promise.all([loadStats(), loadRecentGifts()]);
        });
    }

    // ────────────────────────────────
    // أدوات مساعدة
    // ────────────────────────────────
    function setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function formatDate(iso) {
        if (!iso) return '—';
        try {
            return new Date(iso).toLocaleString('ar-SA', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return iso;
        }
    }

    function notify(message, type = 'info') {
        if (window.Toast) {
            const fn = window.Toast[type] || window.Toast.show;
            fn.call(window.Toast, message);
            return;
        }
        alert(message);
    }

    // تصدير
    window.giftMembershipManager = {
        init,
        loadStats,
        loadRecentGifts,
    };
})();
