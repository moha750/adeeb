/**
 * نظام إدارة الانتخابات — نادي أدِيب
 * Manager بأوضاع متعددة:
 *   admin-manage   : Kanban + إنشاء/تحكم/إعلان/أرشفة
 *   admin-review   : مراجعة المرشحين
 *   viewer         : قراءة فقط (مستشار/عضو HR)
 *   member-run     : قائمة الانتخابات المفتوحة للترشح + نموذج ترشح
 *   member-profile : ترشحاتي — انسحاب/تعديل
 *   member-vote    : اقتراع مجهّل
 *
 * UI: يعتمد فقط على ملفات admin/css/ (unified-cards / buttons-system /
 *     modals / inputs-system / filters / stats-cards) + inline styles.
 */

(function() {
    const sb = window.sbClient;

    const ROLE_LABELS = {
        department_head:          'رئيس',
        committee_leader:         'قائد',
        deputy_committee_leader:  'نائب'
    };

    const STATUS_LABELS = {
        candidacy_open:    'ترشح مفتوح',
        candidacy_closed:  'ترشح مغلق',
        voting_open:       'تصويت مفتوح',
        voting_closed:     'تصويت مغلق',
        completed:         'مكتمل',
        cancelled:         'ملغى'
    };

    const CANDIDATE_STATUS_LABELS = {
        pending:    'قيد المراجعة',
        approved:   'مقبول',
        rejected:   'مرفوض',
        needs_edit: 'بحاجة للتعديل',
        withdrawn:  'منسحب'
    };

    const MIME_LABELS = {
        'application/pdf': 'PDF',
        'application/msword': 'Word',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
        'text/plain': 'Text',
        'image/png': 'PNG',
        'image/jpeg': 'JPEG'
    };

    const ALLOWED_MIMES = Object.keys(MIME_LABELS);
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    const STORAGE_BUCKET = 'election-files';

    /* ─── ربط الحالات ↔ ألوان النظام الموحّد ─── */
    const STATUS_BADGE = {
        candidacy_open:    'primary',
        candidacy_closed:  'purple',
        voting_open:       'success',
        voting_closed:     'warning',
        completed:         'primary',
        cancelled:         'danger'
    };

    const STATUS_CARD = {
        candidacy_open:    'primary',
        candidacy_closed:  'purple',
        voting_open:       'success',
        voting_closed:     'warning',
        completed:         'info',
        cancelled:         'danger'
    };

    const STATUS_ICON = {
        candidacy_open:    'bullhorn',
        candidacy_closed:  'hourglass-end',
        voting_open:       'check-to-slot',
        voting_closed:     'flag-checkered',
        completed:         'trophy',
        cancelled:         'ban'
    };

    const CANDIDATE_BADGE = {
        pending:    'warning',
        approved:   'success',
        rejected:   'danger',
        needs_edit: 'info',
        withdrawn:  'secondary'
    };

    const CAND_STATUS_ICON = {
        pending:    'hourglass-half',
        approved:   'circle-check',
        rejected:   'circle-xmark',
        needs_edit: 'pen-to-square',
        withdrawn:  'right-from-bracket'
    };

    /* variants المتوفّرة في .empty-state: success / warning / danger / purple / teal / gray
       (اللون الافتراضي أزرق = info) */
    const STATUS_EMPTY = {
        candidacy_open:    '',
        candidacy_closed:  'purple',
        voting_open:       'success',
        voting_closed:     'warning',
        completed:         'gray',
        cancelled:         'danger'
    };

    function esc(text) {
        if (text == null) return '';
        return String(text).replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    function fmtDate(iso) {
        if (!iso) return '—';
        try {
            return new Date(iso).toLocaleString('ar-SA', {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch (_) { return iso; }
    }

    /* تنسيق موعد نهاية الترشح: "DD/MM/YYYY الساعة HH:MM" بأرقام إنجليزية */
    function fmtDeadline(iso) {
        if (!iso) return '—';
        try {
            const d = new Date(iso);
            const date = d.toLocaleDateString('en-GB'); // 24/04/2026
            const time = d.toLocaleTimeString('en-GB', {
                hour: '2-digit', minute: '2-digit', hour12: false
            });                                         // 22:14
            return `${date} الساعة ${time}`;
        } catch (_) { return iso; }
    }

    /* تنسيق الوقت المتبقي — لحظي */
    function fmtRemaining(ms) {
        if (!isFinite(ms) || ms <= 0) return 'انتهى';
        const s    = Math.floor(ms / 1000);
        const days = Math.floor(s / 86400);
        const hrs  = Math.floor((s % 86400) / 3600);
        const mns  = Math.floor((s % 3600) / 60);
        const scs  = s % 60;
        if (days) return `متبقٍ ${days}ي ${hrs}س`;
        if (hrs)  return `متبقٍ ${hrs}س ${mns}د`;
        if (mns)  return `متبقٍ ${mns}د ${scs}ث`;
        return `متبقٍ ${scs}ث`;
    }

    function toLocalDatetimeValue(iso) {
        if (!iso) return '';
        const d = new Date(iso);
        const pad = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    function toast(msg, type = 'info') {
        if (window.Toast && typeof window.Toast[type] === 'function') {
            return window.Toast[type](msg);
        }
        if (window.showToast) return window.showToast(msg, type);
        if (window.toast) return window.toast[type]?.(msg) || window.toast(msg);
        if (window.toastNotifications) return window.toastNotifications.show(msg, type);
        console.log(`[${type}] ${msg}`);
    }

    function confirmDialog(message, { icon = 'question', confirmText = 'تأكيد', cancelText = 'إلغاء' } = {}) {
        if (window.Swal && window.Swal.fire) {
            return window.Swal.fire({
                text: message,
                icon,
                showCancelButton: true,
                confirmButtonText: confirmText,
                cancelButtonText: cancelText
            }).then(r => r.isConfirmed);
        }
        return Promise.resolve(window.confirm(message));
    }

    /* ─── Helpers مشتركة (شارات / حالات فارغة / تبويبات فرعية) ─── */
    function statusBadge(status) {
        const icon = STATUS_ICON[status] || 'circle';
        return `<span class="uc-card__badge"><i class="fa-solid fa-${icon}"></i> ${esc(STATUS_LABELS[status] || status)}</span>`;
    }

    function candidateBadge(status) {
        const color = CANDIDATE_BADGE[status] || 'secondary';
        return `<span class="uc-badge uc-badge--${color}">${esc(CANDIDATE_STATUS_LABELS[status] || status)}</span>`;
    }

    function emptyState(icon, title, desc = '', variant = '') {
        const v = variant ? ` empty-state--${variant}` : '';
        return `<div class="empty-state${v}">
            <div class="empty-state__icon"><i class="fa-solid fa-${icon}"></i></div>
            <h3 class="empty-state__title">${esc(title)}</h3>
            ${desc ? `<p class="empty-state__message">${esc(desc)}</p>` : ''}
        </div>`;
    }

    function loadingState() {
        return `<div class="empty-state">
            <div class="empty-state__icon"><i class="fa-solid fa-spinner fa-spin"></i></div>
            <h3 class="empty-state__title">جارٍ التحميل…</h3>
        </div>`;
    }

    function errorState(msg) {
        return `<div class="empty-state empty-state--danger">
            <div class="empty-state__icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
            <h3 class="empty-state__title">تعذّر التحميل</h3>
            <p class="empty-state__message">${esc(msg)}</p>
        </div>`;
    }

    /* ─── خطاطة بطاقة انتخاب موحَّدة (uc-card) ─── */
    function targetLabelOf(e, targetCommitteeAr, targetDeptAr) {
        if (e.target_role_name === 'department_head') {
            return `${ROLE_LABELS[e.target_role_name]} ${esc(targetDeptAr || '')}`.trim();
        }
        return `${ROLE_LABELS[e.target_role_name]} ${esc(targetCommitteeAr || '')}`.trim();
    }

    function ucElectionCard({ id, status, target, infoItems = [], footer = '' }) {
        const color = STATUS_CARD[status] || 'neutral';
        const icon  = STATUS_ICON[status] || 'circle';
        return `
            <div class="uc-card uc-card--${color}" data-election-id="${esc(id)}">
                <div class="uc-card__header uc-card__header--${color}">
                    <div class="uc-card__header-inner">
                        <div class="uc-card__icon"><i class="fa-solid fa-${icon}"></i></div>
                        <div class="uc-card__header-info">
                            <h4 class="uc-card__title uc-card__title--wrap">${target}</h4>
                            ${statusBadge(status)}
                        </div>
                    </div>
                </div>
                <div class="uc-card__body">
                    ${infoItems.join('')}
                </div>
                ${footer ? `<div class="uc-card__footer">${footer}</div>` : ''}
            </div>
        `;
    }

    function infoItem(icon, label, value) {
        return `
            <div class="uc-card__info-item">
                <div class="uc-card__info-icon"><i class="fa-solid fa-${icon}"></i></div>
                <div class="uc-card__info-content">
                    <span class="uc-card__info-label">${esc(label)}</span>
                    <span class="uc-card__info-value">${value}</span>
                </div>
            </div>
        `;
    }

    /* تبويبات فرعية باستخدام btn-group */
    function subtabs(items, activeKey, idAttr = '') {
        return `<div class="btn-group" ${idAttr ? `id="${idAttr}"` : ''} style="margin-bottom:1rem;">${
            items.map(it => {
                const active = it.key === activeKey;
                const cls = active ? 'btn btn-slate btn-sm' : 'btn btn-slate btn-sm btn-outline';
                const count = (it.count != null)
                    ? ` <span class="uc-badge uc-badge--${active ? 'primary' : 'secondary'}" style="margin-inline-start:0.4rem;">${it.count}</span>`
                    : '';
                const ic = it.icon ? `<i class="fa-solid fa-${it.icon}"></i> ` : '';
                return `<button class="${cls}" data-tab="${esc(it.key)}">${ic}${esc(it.label)}${count}</button>`;
            }).join('')
        }</div>`;
    }

    /* ترتيب عرض المرشحين: قيد المراجعة أولاً ثم بقية الحالات */
    const CAND_STATUS_ORDER = { pending: 0, needs_edit: 1, approved: 2, rejected: 3, withdrawn: 4 };
    function sortCandidates(rows) {
        return [...rows].sort((a, b) => {
            const pa = CAND_STATUS_ORDER[a.status] ?? 99;
            const pb = CAND_STATUS_ORDER[b.status] ?? 99;
            if (pa !== pb) return pa - pb;
            return (a.candidate_number || 0) - (b.candidate_number || 0);
        });
    }

    function impersonationBanner() {
        return `<div style="display:flex;align-items:center;gap:0.6rem;padding:0.75rem 1rem;background:#fef3c7;border:1px solid #fde68a;border-radius:10px;color:#92400e;margin-bottom:1rem;font-size:0.88rem;">
            <i class="fa-solid fa-circle-info"></i>
            <span>أنت في وضع العرض كمستخدم — لا يمكن التصويت أو الترشح من هذه الجلسة.</span>
        </div>`;
    }

    /* صف نتيجة (مع شريط تقدم) */
    function resultRow({ name, votesText, pct, isWinner, isSelected, candidateId, withRadio }) {
        const wrap = withRadio ? 'label' : 'div';
        const borderColor = isSelected ? '#10b981' : (isWinner ? '#f59e0b' : '#e2e8f0');
        const bg = isSelected ? '#ecfdf5' : (isWinner ? '#fffbeb' : '#fff');
        const radio = withRadio
            ? `<input type="radio" name="winnerPick" value="${esc(candidateId)}" ${isSelected ? 'checked' : ''} style="margin-inline-start:0.5rem;flex-shrink:0;" />`
            : '';
        const winnerBadge = isWinner
            ? '<span class="uc-badge uc-badge--warning" style="margin-inline-start:0.5rem;"><i class="fa-solid fa-crown"></i> الفائز</span>'
            : '';
        return `
            <${wrap} ${withRadio ? `data-candidate-id="${esc(candidateId)}"` : ''} style="display:flex;flex-direction:column;gap:0.5rem;padding:0.75rem 0.9rem;border:1.5px solid ${borderColor};background:${bg};border-radius:12px;${withRadio ? 'cursor:pointer;' : ''}">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:0.75rem;">
                    <div style="display:flex;align-items:center;gap:0.5rem;flex:1;min-width:0;">
                        ${radio}
                        <span style="font-weight:600;color:#1e293b;">${name}${winnerBadge}</span>
                    </div>
                    <span style="font-size:0.85rem;color:#64748b;font-weight:500;white-space:nowrap;">${votesText}</span>
                </div>
                <div style="height:8px;background:#e2e8f0;border-radius:99px;overflow:hidden;">
                    <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#3b82f6,#10b981);transition:width 0.3s;"></div>
                </div>
            </${wrap}>
        `;
    }

    class ElectionsManager {
        constructor() {
            this.mode = null;
            this.user = null;
            this.tabState = null;
            this.committees = [];
            this.departments = [];
        }

        async init(user, mode) {
            this.user = user;
            this.mode = mode;
            this._renderImpersonationNoticeIfNeeded();

            switch (mode) {
                case 'admin-manage':   return this.renderAdminManage();
                case 'admin-review':   return this.renderAdminReview();
                case 'admin-archive':  return this.renderAdminArchive();
                case 'viewer':         return this.renderViewer();
                case 'member-run':     return this.renderMemberRun();
                case 'member-profile': return this.renderMemberProfile();
                case 'member-vote':    return this.renderMemberVote();
                default:
                    console.warn('[ElectionsManager] unknown mode', mode);
            }
        }

        _renderImpersonationNoticeIfNeeded() {
            const isImp = this.user?._isImpersonating === true;
            document.querySelectorAll('.elections-impersonation-slot').forEach(el => {
                el.innerHTML = isImp ? impersonationBanner() : '';
            });
        }

        async _loadCommitteesDepartments() {
            if (this.committees.length && this.departments.length) return;
            const [cRes, dRes] = await Promise.all([
                sb.from('committees').select('id, committee_name_ar, department_id').eq('is_active', true).order('committee_name_ar'),
                sb.from('departments').select('id, name_ar').order('name_ar')
            ]);
            this.committees = cRes.data || [];
            this.departments = dRes.data || [];
        }

        async _loadOccupiedPositions() {
            const { data, error } = await sb.rpc('get_occupied_positions');
            if (error) {
                console.warn('[ElectionsManager] get_occupied_positions failed', error);
                return { committeeLeaders: new Set(), committeeDeputies: new Set(), departmentHeads: new Set() };
            }
            const committeeLeaders  = new Set();
            const committeeDeputies = new Set();
            const departmentHeads   = new Set();
            for (const r of (data || [])) {
                if (r.role_name === 'committee_leader' && r.committee_id) committeeLeaders.add(r.committee_id);
                else if (r.role_name === 'deputy_committee_leader' && r.committee_id) committeeDeputies.add(r.committee_id);
                else if (r.role_name === 'department_head' && r.department_id) departmentHeads.add(r.department_id);
            }
            return { committeeLeaders, committeeDeputies, departmentHeads };
        }

        async _attachCandidatesForOpen(elections) {
            const openIds = elections.filter(e => e.status === 'candidacy_open').map(e => e.id);
            if (openIds.length === 0) return;
            const { data, error } = await sb.from('election_candidates')
                .select('election_id, candidate_number, status, user:profiles!election_candidates_user_id_fkey(full_name)')
                .in('election_id', openIds)
                .neq('status', 'withdrawn')
                .order('candidate_number', { ascending: true });
            if (error) {
                console.warn('[ElectionsManager] load open-election candidates failed', error);
                return;
            }
            const byElection = new Map();
            for (const c of (data || [])) {
                if (!byElection.has(c.election_id)) byElection.set(c.election_id, []);
                byElection.get(c.election_id).push(c);
            }
            for (const e of elections) {
                if (e.status === 'candidacy_open') e._candidates = byElection.get(e.id) || [];
            }
        }

        async _loadActiveElectionScopes() {
            const empty = { committees: new Set(), departmentHeads: new Set() };
            const { data, error } = await sb.from('elections')
                .select('target_role_name, target_committee_id, target_department_id')
                .is('archived_at', null)
                .not('status', 'in', '(completed,cancelled)');
            if (error) {
                console.warn('[ElectionsManager] active election scopes fetch failed', error);
                return empty;
            }
            // لجنة واحدة = انتخاب نشط واحد (أي دور) — قيد DB elections_active_committee_uniq
            const committees      = new Set();
            const departmentHeads = new Set();
            for (const r of (data || [])) {
                if (r.target_committee_id)                   committees.add(r.target_committee_id);
                else if (r.target_role_name === 'department_head' && r.target_department_id) departmentHeads.add(r.target_department_id);
            }
            return { committees, departmentHeads };
        }

        /* ============================================================
           Mode: admin-manage — Kanban + إنشاء/تحكم
           ============================================================ */
        async renderAdminManage() {
            const container = document.getElementById('electionsManageContainer');
            if (!container) return;

            container.innerHTML = `
                <div class="elections-impersonation-slot"></div>
                <div id="electionsKanbanHost"></div>
                <div class="form-actions-sticky">
                    <div class="form-actions-bar">
                        <button class="btn btn-primary" id="electionsCreateBtn">
                            <i class="fa-solid fa-plus"></i> انتخاب جديد
                        </button>
                    </div>
                </div>
            `;

            this._renderImpersonationNoticeIfNeeded();

            container.querySelector('#electionsCreateBtn').addEventListener('click', () => this.openCreateElectionModal());

            await this._loadKanban();
        }

        async _loadKanban() {
            const host = document.getElementById('electionsKanbanHost');
            if (!host) return;
            host.innerHTML = loadingState();

            const { data, error } = await sb.from('elections').select(`
                *,
                committee:committees(committee_name_ar),
                department:departments(name_ar),
                creator:profiles!elections_created_by_fkey(full_name)
            `)
                .is('archived_at', null)
                .order('created_at', { ascending: false });

            if (error) {
                console.error(error);
                host.innerHTML = errorState(error.message);
                return;
            }

            await this._attachCandidatesForOpen(data || []);

            const groups = ['candidacy_open', 'candidacy_closed', 'voting_open', 'voting_closed'];
            const byStatus = Object.fromEntries(groups.map(s => [s, []]));
            (data || []).forEach(e => {
                (byStatus[e.status] || (byStatus[e.status] = [])).push(e);
            });

            host.innerHTML =
                this._renderStatsGrid(groups, byStatus) +
                groups.map(s => this._renderStatusSection(s, byStatus[s])).join('');

            this._bindCardActions(host);
            this._bindSectionRefreshButtons(host);
            this._startCountdownTicker();
        }

        _bindSectionRefreshButtons(host) {
            host.querySelectorAll('[data-action="refresh-section"]').forEach(btn => {
                btn.addEventListener('click', async (ev) => {
                    ev.preventDefault();
                    const status = btn.dataset.status;
                    if (!status) return;
                    btn.disabled = true;
                    btn.classList.add('is-spinning');
                    try { await this._refreshSection(status); }
                    finally {
                        btn.disabled = false;
                        btn.classList.remove('is-spinning');
                    }
                });
            });
        }

        async _refreshSection(status) {
            const { data, error } = await sb.from('elections').select(`
                *,
                committee:committees(committee_name_ar),
                department:departments(name_ar),
                creator:profiles!elections_created_by_fkey(full_name)
            `)
                .is('archived_at', null)
                .eq('status', status)
                .order('created_at', { ascending: false });

            if (error) {
                console.error(error);
                toast(error.message || 'تعذر التحديث', 'error');
                return;
            }

            const items = data || [];
            if (status === 'candidacy_open') await this._attachCandidatesForOpen(items);
            const icon = STATUS_ICON[status] || 'circle';
            const bodyHtml = items.length === 0
                ? emptyState(icon, 'لا يوجد انتخابات في هذه المرحلة', '', STATUS_EMPTY[status] || '')
                : `<div class="uc-grid">${items.map(e => this._renderAdminFullCard(e)).join('')}</div>`;

            const section = document.querySelector(`[data-section-status="${status}"]`);
            if (section) {
                const body = section.querySelector('.card-body');
                if (body) {
                    body.innerHTML = bodyHtml;
                    this._bindCardActions(body);
                }
            }

            const statValue = document.querySelector(`[data-stat-status="${status}"] .stat-value`);
            if (statValue) statValue.textContent = items.length;

            if (status === 'candidacy_open') this._startCountdownTicker();
        }

        _startCountdownTicker() {
            this._stopCountdownTicker();
            this._tickCountdowns();
            this._countdownInterval = setInterval(() => this._tickCountdowns(), 1000);
        }

        _stopCountdownTicker() {
            if (this._countdownInterval) {
                clearInterval(this._countdownInterval);
                this._countdownInterval = null;
            }
        }

        _tickCountdowns() {
            const all = document.querySelectorAll('[data-countdown]');
            if (all.length === 0) { this._stopCountdownTicker(); return; }
            const now = Date.now();
            all.forEach(el => {
                const t = new Date(el.dataset.countdown).getTime();
                if (!isFinite(t)) return;
                el.textContent = '(' + fmtRemaining(t - now) + ')';
            });
        }

        _renderStatsGrid(groups, byStatus) {
            const STAT_COLOR = {
                candidacy_open:    '#3b82f6',
                candidacy_closed:  '#8b5cf6',
                voting_open:       '#10b981',
                voting_closed:     '#f59e0b'
            };
            const cards = groups.map(s => `
                <div class="stat-card" data-stat-status="${s}" style="--stat-color: ${STAT_COLOR[s]};">
                    <div class="stat-card-wrapper">
                        <div class="stat-icon">
                            <i class="fa-solid fa-${STATUS_ICON[s] || 'circle'}"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value">${(byStatus[s] || []).length}</div>
                            <div class="stat-label">${esc(STATUS_LABELS[s] || s)}</div>
                        </div>
                    </div>
                </div>
            `).join('');
            return `<div class="stats-grid elections-stats-grid" style="margin-bottom:1.5rem;">${cards}</div>`;
        }

        _renderStatusSection(status, items, overrideLabel = null) {
            const color = STATUS_CARD[status] || 'neutral';
            const icon  = STATUS_ICON[status]  || 'circle';
            const label = overrideLabel || STATUS_LABELS[status] || status;

            const bodyHtml = items.length === 0
                ? emptyState(icon, 'لا يوجد انتخابات في هذه المرحلة', '', STATUS_EMPTY[status] || '')
                : `<div class="uc-grid">${items.map(e => this._renderAdminFullCard(e)).join('')}</div>`;

            return `
                <div class="card card--${color}" data-section-status="${status}" style="margin-bottom:1.25rem;">
                    <div class="card-header">
                        <h3><i class="fa-solid fa-${icon}"></i> ${esc(label)}</h3>
                        <button class="btn btn-icon btn-sm btn-card-color" data-action="refresh-section" data-status="${status}" title="تحديث هذا القسم" aria-label="تحديث هذا القسم">
                            <i class="fa-solid fa-rotate"></i>
                        </button>
                    </div>
                    <div class="card-body">
                        ${bodyHtml}
                    </div>
                </div>
            `;
        }

        _renderArchiveList(list) {
            if (list.length === 0) {
                return emptyState('box-archive', 'الأرشيف فارغ', 'لا توجد انتخابات مؤرشفة.');
            }
            return `<div class="uc-grid">
                ${list.map(e => this._renderAdminFullCard(e, true)).join('')}
            </div>`;
        }

        /* ============================================================
           Mode: admin-archive — الانتخابات المؤرشفة (تبويب مستقل)
           ============================================================ */
        async renderAdminArchive() {
            const container = document.getElementById('electionsArchiveContainer');
            if (!container) return;

            container.innerHTML = `
                <div class="elections-impersonation-slot"></div>
                <div class="d-flex justify-between align-items-center flex-wrap" style="gap:0.75rem; margin-bottom:1rem;">
                    <h2 style="margin:0;">الانتخابات المؤرشفة</h2>
                    <button class="btn btn-slate btn-outline" id="electionsArchiveRefreshBtn">
                        <i class="fa-solid fa-rotate"></i> تحديث
                    </button>
                </div>
                <div id="electionsArchiveHost"></div>
            `;

            this._renderImpersonationNoticeIfNeeded();

            container.querySelector('#electionsArchiveRefreshBtn')
                .addEventListener('click', () => this.renderAdminArchive());

            const host = container.querySelector('#electionsArchiveHost');
            host.innerHTML = loadingState();

            const { data, error } = await sb.from('elections').select(`
                *,
                committee:committees(committee_name_ar),
                department:departments(name_ar),
                creator:profiles!elections_created_by_fkey(full_name)
            `)
                .not('archived_at', 'is', null)
                .order('archived_at', { ascending: false });

            if (error) {
                console.error(error);
                host.innerHTML = errorState(error.message);
                return;
            }

            host.innerHTML = this._renderArchiveList(data || []);
            this._bindCardActions(host);
        }

        _renderCandidatesItem(list) {
            let body;
            if (!Array.isArray(list)) {
                body = '<div style="opacity:0.65>جارٍ التحميل…</div>';
            } else if (list.length === 0) {
                body = '<div style="opacity:0.65">لا يوجد مرشحون بعد</div>';
            } else {
                const rows = list.map(c => {
                    const badgeColor = CANDIDATE_BADGE[c.status] || 'secondary';
                    const statusLabel = CANDIDATE_STATUS_LABELS[c.status] || c.status;
                    const name = esc(c.user?.full_name || '—');
                    return `
                        <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;font-size:0.83rem;">
                            <span style="font-weight:700;opacity:0.7;">#${c.candidate_number}</span>
                            <span style="font-weight:600;color:#1e293b;">${name}</span>
                            <span class="uc-badge uc-badge--${badgeColor}">${esc(statusLabel)}</span>
                        </div>
                    `;
                }).join('');
                body = `<div style="display:flex;flex-direction:column;gap:0.35rem;">${rows}</div>`;
            }
            const count = Array.isArray(list) && list.length ? ` (${list.length})` : '';
            return `
                <div class="uc-card__info-item uc-card__info-item--full uc-card__info-item--list">
                    <div class="uc-card__info-icon"><i class="fa-solid fa-user-group"></i></div>
                    <div class="uc-card__info-content">
                        <span class="uc-card__info-label">المرشحون${count}</span>
                        <span class="uc-card__info-value">${body}</span>
                    </div>
                </div>
            `;
        }

        _renderAdminFullCard(e, isArchive = false) {
            const target = targetLabelOf(e, e.committee?.committee_name_ar, e.department?.name_ar);
            const items = [];
            if (e.status === 'candidacy_open') {
                let endValue;
                if (e.candidacy_end) {
                    const remainMs = new Date(e.candidacy_end).getTime() - Date.now();
                    endValue = `${esc(fmtDeadline(e.candidacy_end))} <span class="countdown-tag" data-countdown="${esc(e.candidacy_end)}">(${esc(fmtRemaining(remainMs))})</span>`;
                } else {
                    endValue = '<span style="opacity:0.65;">لم يُحدَّد</span>';
                }
                items.push(infoItem('calendar', 'نهاية الترشح', endValue));
                items.push(this._renderCandidatesItem(e._candidates));
            } else if (e.candidacy_end) {
                items.push(infoItem('calendar', 'نهاية الترشح', fmtDate(e.candidacy_end)));
            }
            if (e.voting_end)               items.push(infoItem('clock',       'نهاية التصويت', fmtDate(e.voting_end)));
            if (e.creator)                  items.push(infoItem('user',        'أُنشئ بواسطة', esc(e.creator.full_name)));
            if (isArchive && e.archived_at) items.push(infoItem('box-archive', 'تاريخ الأرشفة', fmtDate(e.archived_at)));

            const footer = isArchive
                ? this._archiveCardActionsButtons(e)
                : this._adminCardActionsButtons(e);

            return ucElectionCard({
                id: e.id,
                status: e.status,
                target,
                infoItems: items,
                footer
            });
        }

        /* أزرار البطاقة المؤرشفة — قراءة فقط */
        _archiveCardActionsButtons(e) {
            const btns = [
                `<button class="btn btn-primary btn-outline" data-action="review-readonly"><i class="fa-solid fa-clipboard-check"></i> المرشحون</button>`,
                `<button class="btn btn-primary btn-outline" data-action="results"><i class="fa-solid fa-chart-simple"></i> النتائج</button>`
            ];
            return btns.join('');
        }

        /* أزرار الإجراءات للأدمن (داخل تذييل uc-card) */
        _adminCardActionsButtons(e) {
            const btns = [];
            if (e.status !== 'candidacy_open') {
                btns.push(`<button class="btn btn-primary btn-outline" data-action="review"><i class="fa-solid fa-clipboard-check"></i> المرشحون</button>`);
            }

            if (e.status === 'candidacy_open') {
                const hasEnd = !!e.candidacy_end;
                btns.push(`<button class="btn btn-primary" data-action="set-candidacy-end" data-current="${e.candidacy_end || ''}"><i class="fa-regular fa-calendar-check"></i> ${hasEnd ? 'تعديل موعد الإغلاق' : 'تحديد موعد الإغلاق'}</button>`);
                btns.push(`<button class="btn btn-warning" data-action="transition" data-target="candidacy_closed"><i class="fa-solid fa-door-closed"></i> إغلاق الترشح</button>`);
            }
            if (e.status === 'candidacy_closed') {
                btns.push(`<button class="btn btn-success" data-action="transition" data-target="voting_open"><i class="fa-solid fa-check-to-slot"></i> فتح التصويت</button>`);
            }
            if (e.status === 'voting_open') {
                btns.push(`<button class="btn btn-warning" data-action="transition" data-target="voting_closed"><i class="fa-solid fa-stop"></i> إغلاق التصويت</button>`);
            }
            if (e.status === 'voting_closed') {
                btns.push(`<button class="btn btn-success" data-action="declare-winner"><i class="fa-solid fa-trophy"></i> إعلان الفائز</button>`);
            }
            if (['candidacy_open', 'candidacy_closed'].includes(e.status)) {
                btns.push(`<button class="btn btn-danger" data-action="cancel"><i class="fa-solid fa-ban"></i> إلغاء</button>`);
            }
            return btns.join('');
        }

        _bindCardActions(host) {
            host.querySelectorAll('[data-action]').forEach(btn => {
                btn.addEventListener('click', async (ev) => {
                    ev.preventDefault();
                    const card = btn.closest('[data-election-id]');
                    const id = card?.dataset?.electionId;
                    const action = btn.dataset.action;
                    if (!id) return;

                    try {
                        btn.disabled = true;
                        if (action === 'transition')      await this._transitionElection(id, btn.dataset.target);
                        else if (action === 'cancel')     await this._cancelElection(id);
                        else if (action === 'review')     await this.openCandidatesModal(id, 'admin');
                        else if (action === 'review-readonly') await this.openCandidatesModal(id, 'viewer');
                        else if (action === 'declare-winner') await this.openDeclareWinnerModal(id);
                        else if (action === 'results')    await this.openResultsModal(id);
                        else if (action === 'set-candidacy-end') await this._setCandidacyEnd(id, btn.dataset.current || null);
                    } catch (err) {
                        console.error(err);
                        toast(err.message || String(err), 'error');
                    } finally {
                        btn.disabled = false;
                    }
                });
            });
        }

        /* ─── create election modal (الانتخاب يُنشأ مباشرة بحالة candidacy_open) ─── */
        async openCreateElectionModal() {
            await this._loadCommitteesDepartments();
            const [occupied, ongoing] = await Promise.all([
                this._loadOccupiedPositions(),
                this._loadActiveElectionScopes()
            ]);

            const { modal, close } = this._openModal({
                title: 'انتخاب جديد',
                icon: 'fa-poll-h',
                size: 'md',
                color: 'primary',
                body: `
                    <form id="electionForm" class="modal-form-grid">
                        <div class="form-group full-width">
                            <label class="form-label" for="elTargetRole">
                                <span class="label-icon"><i class="fa-solid fa-user-tie"></i></span>
                                المنصب المُنتخَب
                                <span class="required-dot">*</span>
                            </label>
                            <select class="form-select" id="elTargetRole" required>
                                <option value="">اختر المنصب</option>
                                <option value="department_head">${ROLE_LABELS.department_head}</option>
                                <option value="committee_leader">${ROLE_LABELS.committee_leader}</option>
                                <option value="deputy_committee_leader">${ROLE_LABELS.deputy_committee_leader}</option>
                            </select>
                        </div>
                        <div class="form-group full-width" id="elScopeDeptWrap" style="display:none;">
                            <label class="form-label" for="elDepartmentId">
                                <span class="label-icon"><i class="fa-solid fa-sitemap"></i></span>
                                القسم
                                <span class="required-dot">*</span>
                            </label>
                            <select class="form-select" id="elDepartmentId">
                                <option value="">اختر القسم</option>
                            </select>
                            <small><i class="fa-solid fa-circle-info"></i>يُعطَّل القسم إن كان عليه رئيس نشِط، أو انتخاب رئيس قسم جارٍ، أو أي انتخاب نشط في لجانه.</small>
                        </div>
                        <div class="form-group full-width" id="elScopeCommWrap" style="display:none;">
                            <label class="form-label" for="elCommitteeId">
                                <span class="label-icon"><i class="fa-solid fa-users"></i></span>
                                اللجنة
                                <span class="required-dot">*</span>
                            </label>
                            <select class="form-select" id="elCommitteeId">
                                <option value="">اختر اللجنة</option>
                            </select>
                            <small><i class="fa-solid fa-circle-info"></i>لكل لجنة انتخاب نشط واحد فقط. وإن كان لقسمها انتخاب رئيس قسم نشط، تُعطَّل اللجنة.</small>
                        </div>
                        <div class="form-group full-width">
                            <label class="form-label" for="elCandidacyEnd">
                                <span class="label-icon"><i class="fa-regular fa-calendar"></i></span>
                                نهاية الترشح
                            </label>
                            <input type="datetime-local" class="form-input" id="elCandidacyEnd" />
                            <small><i class="fa-solid fa-circle-info"></i>يُغلق الترشح تلقائياً عند هذا الوقت. اترك الحقل فارغاً للإغلاق اليدوي فقط.</small>
                        </div>
                    </form>
                `,
                footer: `
                    <button class="btn btn-slate btn-outline" data-dismiss="modal">إلغاء</button>
                    <button class="btn btn-primary" id="elSubmitBtn">
                        <i class="fa-solid fa-floppy-disk"></i> إنشاء الانتخاب
                    </button>
                `
            });

            const roleSel = modal.querySelector('#elTargetRole');
            const deptWrap = modal.querySelector('#elScopeDeptWrap');
            const commWrap = modal.querySelector('#elScopeCommWrap');
            const deptSel = modal.querySelector('#elDepartmentId');
            const commSel = modal.querySelector('#elCommitteeId');

            // الأقسام التي تحت لجنتها/لجانها انتخاب نشط — لمنع فتح رئيس قسم عليها
            const deptsWithActiveChildElection = new Set();
            for (const c of this.committees) {
                if (ongoing.committees.has(c.id) && c.department_id) {
                    deptsWithActiveChildElection.add(c.department_id);
                }
            }

            const rebuildScopeOptions = () => {
                const v = roleSel.value;
                const keepDeptVal = deptSel.value;
                const keepCommVal = commSel.value;

                deptSel.innerHTML = '<option value="">اختر القسم</option>' +
                    this.departments.map(d => {
                        const isOngoing        = v === 'department_head' && ongoing.departmentHeads.has(d.id);
                        const isOccupied       = v === 'department_head' && occupied.departmentHeads.has(d.id);
                        const hasChildElection = v === 'department_head' && deptsWithActiveChildElection.has(d.id);
                        const disabled = (isOngoing || isOccupied || hasChildElection) ? 'disabled' : '';
                        const suffix = isOngoing        ? ' — مشغول (انتخاب جارٍ)'
                                     : isOccupied      ? ' — مشغول'
                                     : hasChildElection ? ' — انتخاب نشط في إحدى لجانه'
                                     : '';
                        return `<option value="${d.id}" ${disabled}>${esc(d.name_ar)}${suffix}</option>`;
                    }).join('');

                commSel.innerHTML = '<option value="">اختر اللجنة</option>' +
                    this.committees.map(c => {
                        let isOccupied = false;
                        // أي انتخاب نشط على اللجنة (أيّاً كان الدور) يمنع فتح انتخاب جديد
                        const isOngoing        = ongoing.committees.has(c.id);
                        // انتخاب رئيس قسم الأب نشط → تعطيل اللجان التابعة
                        const parentDeptOngoing = c.department_id && ongoing.departmentHeads.has(c.department_id);
                        if (v === 'committee_leader')             isOccupied = occupied.committeeLeaders.has(c.id);
                        else if (v === 'deputy_committee_leader') isOccupied = occupied.committeeDeputies.has(c.id);
                        const disabled = (isOngoing || isOccupied || parentDeptOngoing) ? 'disabled' : '';
                        const suffix = isOngoing         ? ' — انتخاب جارٍ في اللجنة'
                                     : parentDeptOngoing ? ' — انتخاب رئيس قسم الأب جارٍ'
                                     : isOccupied       ? ' — مشغول'
                                     : '';
                        return `<option value="${c.id}" ${disabled}>${esc(c.committee_name_ar)}${suffix}</option>`;
                    }).join('');

                if (keepDeptVal) deptSel.value = keepDeptVal;
                if (keepCommVal) commSel.value = keepCommVal;
            };

            const updateScope = () => {
                const v = roleSel.value;
                deptWrap.style.display = v === 'department_head' ? '' : 'none';
                commWrap.style.display = (v === 'committee_leader' || v === 'deputy_committee_leader') ? '' : 'none';
                rebuildScopeOptions();
            };
            roleSel.addEventListener('change', updateScope);
            rebuildScopeOptions();

            const candEndInput = modal.querySelector('#elCandidacyEnd');
            const applyMinNow = () => { candEndInput.min = toLocalDatetimeValue(new Date().toISOString()); };
            applyMinNow();
            candEndInput.addEventListener('focus', applyMinNow);

            modal.querySelector('#elSubmitBtn').addEventListener('click', async () => {
                const role = roleSel.value;
                if (!role) return toast('اختر المنصب', 'warning');
                const deptId = parseInt(modal.querySelector('#elDepartmentId').value) || null;
                const commId = parseInt(modal.querySelector('#elCommitteeId').value)  || null;
                if (role === 'department_head' && !deptId) return toast('اختر القسم', 'warning');
                if (role !== 'department_head' && !commId) return toast('اختر اللجنة', 'warning');

                const candEnd = candEndInput.value;
                if (candEnd && new Date(candEnd).getTime() <= Date.now()) {
                    return toast('لا يمكن اختيار وقت/يوم منتهٍ لنهاية الترشح', 'warning');
                }

                const payload = {
                    target_role_name:     role,
                    target_department_id: role === 'department_head' ? deptId : null,
                    target_committee_id:  role === 'department_head' ? null : commId,
                    candidacy_end:        candEnd ? new Date(candEnd).toISOString() : null,
                    created_by:           this.user.id,
                    status:               'candidacy_open'
                };

                try {
                    const { data: inserted, error } = await sb.from('elections')
                        .insert(payload)
                        .select('id')
                        .single();
                    if (error) throw error;
                    toast('تم إنشاء الانتخاب', 'success');
                    close();
                    await this._loadKanban();
                    window.rebuildNavigation?.();

                    // إشعار الحدث 1 — فتح باب الترشح
                    if (inserted?.id) {
                        const label = await this._fetchElectionLabel(inserted.id);
                        const endMsg = candEnd
                            ? ` يمكنك التقدّم حتى ${new Date(candEnd).toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' })}.`
                            : '';
                        this._sendElectionNotification({
                            electionId: inserted.id,
                            audience: 'election_voters',
                            title: 'فُتح باب الترشح',
                            message: `فُتح باب الترشح لـ ${label}.${endMsg}`,
                            type: 'success',
                            priority: 'high',
                            metadata: { event: 'candidacy_opened' }
                        });
                    }
                } catch (err) {
                    console.error(err);
                    if (err?.code === '23505' && /elections_active_committee_uniq/i.test(err?.message || '')) {
                        toast('يوجد انتخاب مفتوح حالياً في هذه اللجنة/القسم. أغلقه أولاً قبل فتح انتخاب جديد.', 'error');
                    } else {
                        toast(err.message || String(err), 'error');
                    }
                }
            });
        }

        async _transitionElection(id, newStatus) {
            let votingEndIso = null;
            if (newStatus === 'voting_open') {
                votingEndIso = await this._promptVotingEnd();
                if (!votingEndIso) return;
            } else {
                if (!await confirmDialog(`تحويل الحالة إلى: ${STATUS_LABELS[newStatus]}؟`, { icon: 'warning' })) return;
            }
            const { error } = await sb.rpc('transition_election', {
                p_election: id,
                p_new_status: newStatus,
                p_voting_end: votingEndIso
            });
            if (error) throw error;
            toast('تم التحديث', 'success');
            await this._loadKanban();
            window.rebuildNavigation?.();

            // إشعار الحدث 6 — إغلاق الترشح يدوياً
            if (newStatus === 'candidacy_closed') {
                const label = await this._fetchElectionLabel(id);
                this._sendElectionNotification({
                    electionId: id,
                    audience: 'election_candidates',
                    title: 'أُغلق باب الترشح',
                    message: `أُغلق باب الترشح لـ ${label}. لن يُقبل مرشحون جدد.`,
                    type: 'purple',
                    priority: 'normal',
                    metadata: { event: 'candidacy_manually_closed' }
                });
            }
        }

        async _setCandidacyEnd(id, currentIso) {
            const hasCurrent = !!currentIso;
            const prefill = hasCurrent ? toLocalDatetimeValue(currentIso) : '';
            const { modal, close } = this._openModal({
                title: hasCurrent ? 'تعديل موعد إغلاق الترشح' : 'تحديد موعد إغلاق الترشح',
                icon: 'fa-regular fa-calendar-check',
                size: 'sm',
                body: `
                    <div class="form-group">
                        <label class="form-label" for="ceEndInput">
                            <span class="label-icon"><i class="fa-regular fa-clock"></i></span>
                            نهاية الترشح
                        </label>
                        <input type="datetime-local" class="form-input" id="ceEndInput" value="${esc(prefill)}" />
                        <small><i class="fa-solid fa-circle-info"></i>يُغلق الترشح تلقائياً عند هذا الوقت. اترك الحقل فارغاً للإغلاق اليدوي فقط.</small>
                    </div>
                `,
                footer: `
                    <button class="btn btn-success" id="ceSaveBtn"><i class="fa-solid fa-floppy-disk"></i> حفظ</button>
                    ${hasCurrent ? '<button class="btn btn-danger" id="ceClearBtn"><i class="fa-solid fa-xmark"></i> إزالة الموعد</button>' : ''}
                    <button class="btn btn-slate btn-outline" data-dismiss="modal">إلغاء</button>
                `
            });

            const update = async (iso) => {
                const { error } = await sb.from('elections').update({ candidacy_end: iso }).eq('id', id);
                if (error) throw error;
                toast('تم الحفظ', 'success');
                close();
                await this._loadKanban();

                // إشعارات الأحداث 2/3/4
                const label = await this._fetchElectionLabel(id);
                if (iso === null) {
                    // (4) إزالة الموعد
                    this._sendElectionNotification({
                        electionId: id,
                        audience: 'election_participants',
                        title: 'أُزيل موعد إغلاق الترشح',
                        message: `أُزيل موعد إغلاق الترشح لـ ${label}. وأصبح مُتاحًا الترشح دون موعد محدد.`,
                        type: 'warning',
                        priority: 'normal',
                        metadata: { event: 'candidacy_end_cleared' }
                    });
                } else {
                    const when = new Date(iso).toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' });
                    if (hasCurrent) {
                        // (3) تعديل الموعد
                        this._sendElectionNotification({
                            electionId: id,
                            audience: 'election_participants',
                            title: 'عُدِّل موعد إغلاق الترشح',
                            message: `عُدِّل موعد إغلاق الترشح لـ ${label} إلى ${when}.`,
                            type: 'info',
                            priority: 'normal',
                            metadata: { event: 'candidacy_end_updated' }
                        });
                    } else {
                        // (2) تحديد موعد لأول مرة
                        this._sendElectionNotification({
                            electionId: id,
                            audience: 'election_participants',
                            title: 'حُدِّد موعد إغلاق الترشح',
                            message: `حُدِّد موعد إغلاق الترشح لـ ${label} في ${when}.`,
                            type: 'info',
                            priority: 'normal',
                            metadata: { event: 'candidacy_end_set' }
                        });
                    }
                }
            };

            modal.querySelector('#ceSaveBtn').addEventListener('click', async () => {
                const raw = modal.querySelector('#ceEndInput').value;
                if (!raw) return toast('حدّد الموعد أو اضغط إزالة الموعد', 'warning');
                const iso = new Date(raw).toISOString();
                if (new Date(iso) <= new Date()) return toast('الوقت يجب أن يكون في المستقبل', 'warning');
                try { await update(iso); } catch (err) { toast(err.message || String(err), 'error'); }
            });

            if (hasCurrent) {
                modal.querySelector('#ceClearBtn').addEventListener('click', async () => {
                    try { await update(null); } catch (err) { toast(err.message || String(err), 'error'); }
                });
            }
        }

        _promptVotingEnd() {
            return new Promise((resolve) => {
                const { modal, close } = this._openModal({
                    title: 'فتح التصويت',
                    icon: 'fa-check-to-slot',
                    size: 'sm',
                    body: `
                        <div class="form-group">
                            <label class="form-label"><i class="fa-regular fa-clock"></i> نهاية التصويت</label>
                            <input type="datetime-local" class="form-input" id="vtEndInput" />
                            <div class="form-hint">سيُغلق التصويت تلقائياً عند هذا الوقت.</div>
                        </div>
                    `,
                    footer: `
                        <button class="btn btn-success" id="vtConfirmBtn"><i class="fa-solid fa-check"></i> فتح التصويت</button>
                        <button class="btn btn-slate btn-outline" id="vtCancelBtn">إلغاء</button>
                    `
                });

                const cleanup = (value) => { close(); resolve(value); };
                modal.querySelector('#vtCancelBtn').addEventListener('click', () => cleanup(null));
                modal.querySelector('#vtConfirmBtn').addEventListener('click', () => {
                    const raw = modal.querySelector('#vtEndInput').value;
                    if (!raw) return toast('حدّد نهاية التصويت', 'warning');
                    const iso = new Date(raw).toISOString();
                    if (new Date(iso) <= new Date()) return toast('الوقت يجب أن يكون في المستقبل', 'warning');
                    cleanup(iso);
                });
            });
        }

        async _cancelElection(id) {
            const reason = await this._openCancelElectionModal();
            if (!reason) return;

            const label = await this._fetchElectionLabel(id);

            const { data: paths, error } = await sb.rpc('cancel_election', { p_election: id, p_reason: reason });
            if (error) throw error;

            if (Array.isArray(paths) && paths.length > 0) {
                const { error: rmErr } = await sb.storage.from(STORAGE_BUCKET).remove(paths);
                if (rmErr) console.warn('[ElectionsManager] فشل حذف ملفات التخزين', rmErr);
            }

            toast('تم الإلغاء والتنظيف والأرشفة', 'success');
            await this._loadKanban();
            window.rebuildNavigation?.();

            // إشعار الحدث 5 — إلغاء الانتخاب
            this._sendElectionNotification({
                electionId: id,
                audience: 'election_participants',
                title: 'أُلغي الانتخاب',
                message: `أُلغي انتخاب ${label}. السبب: ${reason}`,
                type: 'error',
                priority: 'high',
                metadata: { event: 'election_cancelled', reason }
            });
        }

        _openCancelElectionModal() {
            return new Promise((resolve) => {
                const { modal, close } = this._openModal({
                    title: 'إلغاء الانتخاب',
                    icon: 'fa-ban',
                    size: 'md',
                    color: 'danger',
                    body: `
                        <div class="modal-info-box box-danger">
                            <i class="fa-solid fa-triangle-exclamation"></i>
                            <span>سيؤدي الإلغاء إلى <strong>حذف جميع المرشحين والأصوات والملفات</strong> وأرشفة الانتخاب. لا يمكن التراجع عن هذه العملية.</span>
                        </div>
                        <form class="modal-form-grid">
                            <div class="form-group full-width">
                                <label class="form-label" for="elCancelReason">
                                    <span class="label-icon"><i class="fa-regular fa-comment-dots"></i></span>
                                    سبب الإلغاء
                                    <span class="required-dot">*</span>
                                </label>
                                <textarea class="form-textarea" id="elCancelReason" rows="3" placeholder="أدخل سبب الإلغاء…" required></textarea>
                                <small><i class="fa-solid fa-circle-info"></i>سيُحفظ السبب في سجل التدقيق للرجوع إليه لاحقاً.</small>
                            </div>
                        </form>
                    `,
                    footer: `
                        <button class="btn btn-slate btn-outline" data-dismiss="modal" id="elCancelAbortBtn">تراجع</button>
                        <button class="btn btn-danger" id="elCancelConfirmBtn">
                            <i class="fa-solid fa-ban"></i> تأكيد الإلغاء
                        </button>
                    `
                });

                let settled = false;
                const done = (value) => {
                    if (settled) return;
                    settled = true;
                    close();
                    resolve(value);
                };

                const reasonInput = modal.querySelector('#elCancelReason');
                const reasonGroup = reasonInput.closest('.form-group');
                modal.querySelector('#elCancelConfirmBtn').addEventListener('click', () => {
                    const txt = reasonInput.value.trim();
                    if (!txt) {
                        reasonGroup?.classList.add('has-error');
                        reasonInput.focus();
                        toast('سبب الإلغاء مطلوب', 'warning');
                        return;
                    }
                    done(txt);
                });
                reasonInput.addEventListener('input', () => {
                    if (reasonInput.value.trim()) reasonGroup?.classList.remove('has-error');
                });
                modal.querySelector('#elCancelAbortBtn').addEventListener('click', () => done(null));
                modal.querySelector('.modal-close')?.addEventListener('click', () => done(null));
                modal.closest('.elections-modal-host')?.querySelector('.modal-backdrop')
                    ?.addEventListener('click', () => done(null));
            });
        }

        /* ============================================================
           إشعار داخل التطبيق — يُدرج في notifications
           ============================================================ */
        async _sendElectionNotification({ electionId, audience, title, message, type = 'info', priority = 'normal', metadata = {} }) {
            try {
                const { error } = await sb.from('notifications').insert({
                    title,
                    message,
                    type,
                    priority,
                    icon: 'fa-poll-h',
                    target_audience: audience,
                    target_election_id: electionId,
                    sender_id: this.user?.id || null,
                    metadata
                });
                if (error) {
                    console.warn('[ElectionsManager] notification insert failed', error);
                }
            } catch (err) {
                console.warn('[ElectionsManager] notification error', err);
            }
        }

        async _fetchElectionLabel(electionId) {
            const { data } = await sb.from('elections')
                .select('target_role_name, committee:committees(committee_name_ar), department:departments(name_ar)')
                .eq('id', electionId)
                .single();
            if (!data) return '—';
            return targetLabelOf(data, data.committee?.committee_name_ar, data.department?.name_ar);
        }

        /* ─── declare winner modal ─── */
        async openDeclareWinnerModal(electionId) {
            const { data, error } = await sb.rpc('get_candidates_with_identity', { p_election: electionId });
            if (error) throw error;
            const approved = (data || []).filter(c => c.status === 'approved');
            if (approved.length === 0) {
                toast('لا يوجد مرشحون مقبولون', 'warning');
                return;
            }

            const { modal, close } = this._openModal({
                title: 'إعلان الفائز',
                icon: 'fa-trophy',
                size: 'md',
                body: `
                    <div class="modal-info-box box-info">
                        <i class="fa-solid fa-circle-info"></i>
                        <div>اختر الفائز بناءً على نتائج التصويت. ستُحدَّث أدوار العضو الفائز تلقائياً.</div>
                    </div>
                    <div id="winnerResultsList" style="display:flex;flex-direction:column;gap:0.6rem;margin-top:1rem;"></div>
                `,
                footer: `
                    <button class="btn btn-success" id="confirmWinnerBtn" disabled>
                        <i class="fa-solid fa-check"></i> إعلان
                    </button>
                    <button class="btn btn-slate btn-outline" data-dismiss="modal">إلغاء</button>
                `
            });

            const { data: results } = await sb.rpc('get_election_results', { p_election: electionId });
            const sorted = (results || []).slice().sort((a, b) => Number(b.total_weight) - Number(a.total_weight));
            let selectedId = sorted[0]?.candidate_id || null;

            const renderResults = () => {
                const host = modal.querySelector('#winnerResultsList');
                const max = Math.max(1, ...sorted.map(r => Number(r.total_weight)));
                host.innerHTML = sorted.map(r => {
                    const pct = Math.round((Number(r.total_weight) / max) * 100);
                    return resultRow({
                        name: `#${r.candidate_number} — ${esc(r.full_name || '—')}`,
                        votesText: `${Number(r.total_weight).toFixed(1)} نقطة · ${r.total_votes} صوت`,
                        pct,
                        isWinner: false,
                        isSelected: r.candidate_id === selectedId,
                        candidateId: r.candidate_id,
                        withRadio: true
                    });
                }).join('');

                host.querySelectorAll('input[name="winnerPick"]').forEach(r => {
                    r.addEventListener('change', () => {
                        selectedId = r.value;
                        renderResults();
                    });
                });
            };
            renderResults();
            modal.querySelector('#confirmWinnerBtn').disabled = !selectedId;

            modal.querySelector('#confirmWinnerBtn').addEventListener('click', async () => {
                if (!selectedId) return;
                if (!await confirmDialog('تأكيد إعلان هذا الفائز؟ سيُعدَّل دوره فوراً وسيُؤرشف الانتخاب تلقائياً.')) return;
                try {
                    const { error: err } = await sb.rpc('declare_winner', {
                        p_election: electionId, p_candidate: selectedId
                    });
                    if (err) throw err;
                    toast('تم إعلان الفائز وأُرشف الانتخاب', 'success');
                    close();
                    await this._loadKanban();
                    window.rebuildNavigation?.();
                } catch (err) {
                    console.error(err);
                    toast(err.message || String(err), 'error');
                }
            });
        }

        async openResultsModal(electionId) {
            const { data, error } = await sb.rpc('get_election_results', { p_election: electionId });
            if (error) throw error;
            const rows = (data || []).slice().sort((a, b) => Number(b.total_weight) - Number(a.total_weight));
            const max = Math.max(1, ...rows.map(r => Number(r.total_weight)));
            const body = rows.length === 0
                ? emptyState('chart-simple', 'لا توجد نتائج')
                : `<div style="display:flex;flex-direction:column;gap:0.6rem;">${rows.map(r => {
                    const pct = Math.round((Number(r.total_weight) / max) * 100);
                    return resultRow({
                        name: `#${r.candidate_number} — ${esc(r.full_name || '—')}`,
                        votesText: `${Number(r.total_weight).toFixed(1)} نقطة · ${r.total_votes} صوت`,
                        pct,
                        isWinner: !!r.is_winner,
                        isSelected: false,
                        withRadio: false
                    });
                }).join('')}</div>`;

            this._openModal({
                title: 'نتائج الانتخاب',
                icon: 'fa-chart-simple',
                size: 'md',
                body,
                footer: `<button class="btn btn-primary" data-dismiss="modal">حسناً</button>`
            });
        }

        /* ============================================================
           Mode: admin-review  — مراجعة المرشحين (تصميم جديد)
           ============================================================ */
        async renderAdminReview() {
            const container = document.getElementById('electionsReviewContainer');
            if (!container) return;

            container.innerHTML = `
                <div class="er-page">
                    <div class="elections-impersonation-slot"></div>
                    <div id="electionsReviewHost" class="er-skeleton">
                        <i class="fa-solid fa-spinner fa-spin"></i> جارٍ التحميل…
                    </div>
                </div>
            `;
            this._renderImpersonationNoticeIfNeeded();

            const [electionsRes, countsRes] = await Promise.all([
                sb.from('elections')
                    .select('id, target_role_name, target_committee_id, target_department_id, status, committee:committees(committee_name_ar), department:departments(name_ar)')
                    .is('archived_at', null)
                    .in('status', ['candidacy_open', 'candidacy_closed', 'voting_open', 'voting_closed', 'completed'])
                    .order('created_at', { ascending: false }),
                sb.from('election_candidates')
                    .select('election_id, status')
            ]);

            const elections = electionsRes.data || [];
            const allCounts = countsRes.data || [];

            // تجميع عدد المرشحين بحسب الحالة لكل انتخاب
            const countsByElection = new Map();
            for (const r of allCounts) {
                if (!countsByElection.has(r.election_id)) {
                    countsByElection.set(r.election_id, {
                        pending: 0, approved: 0, needs_edit: 0, rejected: 0, withdrawn: 0
                    });
                }
                const m = countsByElection.get(r.election_id);
                if (m[r.status] != null) m[r.status]++;
            }

            const heroHtml = this._renderReviewHero(elections.length);

            let bodyHtml;
            if (electionsRes.error) {
                bodyHtml = errorState(electionsRes.error.message);
            } else if (elections.length === 0) {
                bodyHtml = emptyState('inbox', 'لا توجد انتخابات للمراجعة', 'ستظهر الانتخابات هنا فور فتح باب الترشح.');
            } else {
                bodyHtml = `
                    <div class="uc-grid">
                        ${elections.map(e => this._renderReviewElectionCard(e, countsByElection.get(e.id) || {})).join('')}
                    </div>
                `;
            }

            const host = container.querySelector('#electionsReviewHost');
            host.outerHTML = heroHtml + bodyHtml;

            container.querySelector('#electionsReviewRefresh')?.addEventListener('click', () => this.renderAdminReview());
            container.querySelectorAll('[data-open-candidates]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.closest('[data-election-id]').dataset.electionId;
                    this.renderCandidatesPage(id);
                });
            });
        }

        _renderReviewHero(electionCount) {
            return `
                <div class="er-toolbar">
                    <div class="er-toolbar__title">
                        <i class="fa-solid fa-user-check"></i>
                        <h2>مراجعة المرشحين</h2>
                    </div>
                    <button class="btn btn-slate btn-outline" id="electionsReviewRefresh" type="button">
                        <i class="fa-solid fa-rotate"></i> تحديث
                    </button>
                </div>
                <div class="stats-grid er-review-stats">
                    <div class="stat-card" style="--stat-color:#3d8fd6;--stat-color-rgb:61, 143, 214;--stat-color-dark:#274060;">
                        <div class="stat-card-wrapper">
                            <div class="stat-icon"><i class="fa-solid fa-poll-h"></i></div>
                            <div class="stat-content">
                                <div class="stat-value">${electionCount}</div>
                                <div class="stat-label">انتخابات نشطة</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        _renderReviewElectionCard(e, counts) {
            const target = targetLabelOf(e, e.committee?.committee_name_ar, e.department?.name_ar);

            const chipDefs = [
                { key: 'pending',    label: 'قيد المراجعة', icon: 'hourglass-half',     color: 'warning'   },
                { key: 'approved',   label: 'مقبول',        icon: 'circle-check',       color: 'success'   },
                { key: 'needs_edit', label: 'تعديل',        icon: 'pen-to-square',      color: 'purple'    },
                { key: 'rejected',   label: 'مرفوض',        icon: 'circle-xmark',       color: 'danger'    },
                { key: 'withdrawn',  label: 'منسحب',        icon: 'right-from-bracket', color: 'secondary' }
            ];

            const activeChips = chipDefs.filter(d => (counts[d.key] || 0) > 0);
            const countsHtml = activeChips.length > 0
                ? `<div class="er-counts">${
                    activeChips.map(d => `
                        <span class="uc-badge uc-badge--${d.color}">
                            <i class="fa-solid fa-${d.icon}"></i>
                            ${esc(d.label)}
                            <span class="er-counts__num">${counts[d.key]}</span>
                        </span>
                    `).join('')
                  }</div>`
                : `<div class="er-counts er-counts--empty"><i class="fa-solid fa-user-slash"></i> لا يوجد مرشحون بعد</div>`;

            const pendingBadge = (counts.pending || 0) > 0
                ? `<span class="uc-badge uc-badge--warning" style="margin-inline-start:0.4rem;">${counts.pending} للمراجعة</span>`
                : '';

            const footer = `
                <button class="btn btn-primary" data-open-candidates>
                    <i class="fa-solid fa-users-viewfinder"></i>
                    عرض المرشحين
                    ${pendingBadge}
                </button>
            `;

            return ucElectionCard({
                id: e.id,
                status: e.status,
                target,
                infoItems: [countsHtml],
                footer
            });
        }

        /* ============================================================
           صفحة مرشحي انتخاب واحد (داخل تبويب المراجعة)
           ============================================================ */
        async renderCandidatesPage(electionId) {
            const container = document.getElementById('electionsReviewContainer');
            if (!container) return;

            container.innerHTML = `
                <div class="er-page">
                    <div class="elections-impersonation-slot"></div>
                    <div id="candPageHost" class="er-skeleton">
                        <i class="fa-solid fa-spinner fa-spin"></i> جارٍ التحميل…
                    </div>
                </div>
            `;
            this._renderImpersonationNoticeIfNeeded();

            const host = container.querySelector('#candPageHost');

            const [electionRes, candsRes] = await Promise.all([
                sb.from('elections')
                    .select('id, target_role_name, status, committee:committees(committee_name_ar), department:departments(name_ar)')
                    .eq('id', electionId)
                    .maybeSingle(),
                sb.rpc('get_candidates_with_identity', { p_election: electionId })
            ]);

            const breadcrumb = (currentLabel) => `
                <nav class="page-breadcrumb" aria-label="مسار التنقل">
                    <ol>
                        <li>
                            <button type="button" class="breadcrumb-link" data-cand-back>
                                <i class="fa-solid fa-user-check"></i>
                                مراجعة المرشحين
                            </button>
                        </li>
                        <li class="breadcrumb-sep" aria-hidden="true">
                            <i class="fa-solid fa-chevron-left"></i>
                        </li>
                        <li class="breadcrumb-current" aria-current="page">${currentLabel}</li>
                    </ol>
                </nav>
            `;

            const bindNav = () => {
                container.querySelector('[data-cand-back]')?.addEventListener('click', () => this.renderAdminReview());
            };

            if (electionRes.error || candsRes.error) {
                host.outerHTML = breadcrumb('خطأ') + errorState((electionRes.error || candsRes.error).message);
                bindNav();
                return;
            }
            if (!electionRes.data) {
                host.outerHTML = breadcrumb('—') + emptyState('triangle-exclamation', 'الانتخاب غير موجود');
                bindNav();
                return;
            }

            const e = electionRes.data;
            const target = targetLabelOf(e, e.committee?.committee_name_ar, e.department?.name_ar);
            const phaseLabel = STATUS_LABELS[e.status] || e.status;
            const phaseIcon  = STATUS_ICON[e.status]   || 'circle';
            const phaseColor = STATUS_BADGE[e.status]  || 'secondary';

            const rows = sortCandidates(candsRes.data || []);

            const counts = { pending: 0, approved: 0, needs_edit: 0, rejected: 0, withdrawn: 0 };
            for (const c of rows) { if (counts[c.status] != null) counts[c.status]++; }

            const statCards = [
                { color: '#f59e0b', rgb: '245, 158, 11',  dark: '#b45309', icon: 'hourglass-half',     val: counts.pending,    lbl: 'قيد المراجعة'  },
                { color: '#10b981', rgb: '16, 185, 129',  dark: '#047857', icon: 'circle-check',       val: counts.approved,   lbl: 'مقبولون'       },
                { color: '#8b5cf6', rgb: '139, 92, 246',  dark: '#6d28d9', icon: 'pen-to-square',      val: counts.needs_edit, lbl: 'بحاجة للتعديل' },
                { color: '#ef4444', rgb: '239, 68, 68',   dark: '#b91c1c', icon: 'circle-xmark',       val: counts.rejected,   lbl: 'مرفوضون'       },
                { color: '#94a3b8', rgb: '148, 163, 184', dark: '#475569', icon: 'right-from-bracket', val: counts.withdrawn,  lbl: 'منسحبون'       }
            ];

            const statsHtml = `
                <div class="stats-grid elections-stats-grid">
                    ${statCards.map(c => `
                        <div class="stat-card" style="--stat-color:${c.color};--stat-color-rgb:${c.rgb};--stat-color-dark:${c.dark};">
                            <div class="stat-card-wrapper">
                                <div class="stat-icon"><i class="fa-solid fa-${c.icon}"></i></div>
                                <div class="stat-content">
                                    <div class="stat-value">${c.val}</div>
                                    <div class="stat-label">${c.lbl}</div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;

            const listHtml = rows.length === 0
                ? emptyState('inbox', 'لا يوجد مرشحون لهذا الانتخاب بعد')
                : `<div class="cr-list">${rows.map(c => this._renderCandidateFull(c, 'admin')).join('')}</div>`;

            host.outerHTML = `
                ${breadcrumb(esc(target))}
                <header class="cr-page-header cr-page-header--${phaseColor}">
                    <div class="cr-page-header__icon"><i class="fa-solid fa-${phaseIcon}"></i></div>
                    <div class="cr-page-header__info">
                        <h2 class="cr-page-header__title">${target}</h2>
                        <div class="cr-page-header__meta">
                            <span class="uc-badge uc-badge--${phaseColor}"><i class="fa-solid fa-${phaseIcon}"></i> ${esc(phaseLabel)}</span>
                            <span class="uc-badge uc-badge--info"><i class="fa-solid fa-users"></i> ${rows.length} مرشح</span>
                        </div>
                    </div>
                </header>
                ${statsHtml}
                ${listHtml}
            `;

            bindNav();

            const listHost = container.querySelector('.cr-list');
            if (listHost) {
                this._bindCandidateActions(listHost, electionId, 'admin', () => this.renderCandidatesPage(electionId));
            }
        }

        async openCandidatesModal(electionId, modeTag = 'admin') {
            const { data, error } = await sb.rpc('get_candidates_with_identity', { p_election: electionId });
            if (error) throw error;

            const rows = sortCandidates(data || []);

            const bodyHtml = rows.length === 0
                ? emptyState('inbox', 'لا يوجد مرشحون لهذا الانتخاب بعد')
                : `<div class="cr-list" id="candModalList">${rows.map(c => this._renderCandidateFull(c, modeTag)).join('')}</div>`;

            const { modal } = this._openModal({
                title: 'مراجعة المرشحين',
                icon: 'fa-users-viewfinder',
                size: 'lg',
                color: 'primary',
                body: bodyHtml,
                footer: `<button class="btn btn-slate btn-outline" data-dismiss="modal">إغلاق</button>`
            });

            const listHost = modal.querySelector('#candModalList');
            if (!listHost) return;

            const refreshModal = () => {
                const currentModal = listHost.closest('.elections-modal-host');
                currentModal?.querySelector('[data-dismiss="modal"]')?.click();
                this.openCandidatesModal(electionId, modeTag);
            };

            this._bindCandidateActions(listHost, electionId, modeTag, refreshModal);
        }

        _renderCandidateFull(c, modeTag) {
            const statusKey = c.status || 'pending';
            const statusLabel = CANDIDATE_STATUS_LABELS[statusKey] || statusKey;

            const avatarHtml = c.avatar_url
                ? `<img src="${esc(c.avatar_url)}" alt="${esc(c.full_name || '')}">`
                : `<div class="cr-cand__avatar__placeholder"><i class="fa-solid fa-user"></i></div>`;

            const fileHtml = c.file_url
                ? `<a class="cr-cand__file" href="${esc(c.file_url)}" target="_blank" rel="noopener">
                       <span class="cr-cand__file__icon"><i class="fa-solid fa-paperclip"></i></span>
                       <span class="cr-cand__file__meta">
                           <span class="cr-cand__file__name">${esc(c.file_name || 'ملف المرشح')}</span>
                           <span class="cr-cand__file__size">${this._fmtFileSize(c.file_size_bytes)} ${c.file_mime ? '· ' + esc(MIME_LABELS[c.file_mime] || c.file_mime) : ''}</span>
                       </span>
                   </a>`
                : '';

            const noteHtml = c.review_note_ar
                ? `<div class="cr-cand__note">
                       <span class="cr-cand__note__icon"><i class="fa-solid fa-note-sticky"></i></span>
                       <div class="cr-cand__note__body">
                           <div class="cr-cand__note__lbl">ملاحظة المراجعة</div>
                           <p class="cr-cand__note__text">${esc(c.review_note_ar)}</p>
                       </div>
                   </div>`
                : '';

            // الإجراءات الإدارية بحسب الحالة
            let actionsHtml = '';
            if (modeTag === 'admin') {
                if (statusKey === 'pending') {
                    actionsHtml = `
                        <div class="cr-cand__actions">
                            <button type="button" class="cr-act cr-act--approve"     data-action="approve"     data-candidate="${esc(c.candidate_id)}"><i class="fa-solid fa-check"></i> قبول</button>
                            <button type="button" class="cr-act cr-act--needs_edit"  data-action="needs_edit"  data-candidate="${esc(c.candidate_id)}"><i class="fa-solid fa-pen-to-square"></i> طلب تعديل</button>
                            <button type="button" class="cr-act cr-act--reject"      data-action="reject"      data-candidate="${esc(c.candidate_id)}"><i class="fa-solid fa-xmark"></i> رفض</button>
                        </div>
                    `;
                } else if (statusKey === 'needs_edit') {
                    actionsHtml = `
                        <div class="cr-cand__actions">
                            <button type="button" class="cr-act cr-act--approve" data-action="approve" data-candidate="${esc(c.candidate_id)}"><i class="fa-solid fa-check"></i> قبول</button>
                            <button type="button" class="cr-act cr-act--reject"  data-action="reject"  data-candidate="${esc(c.candidate_id)}"><i class="fa-solid fa-xmark"></i> رفض</button>
                        </div>
                    `;
                }
            }

            const submittedHtml = c.submitted_at
                ? `<span class="cr-cand__meta__item"><i class="fa-solid fa-clock"></i> ${fmtDate(c.submitted_at)}</span>`
                : '';
            const usernameHtml = c.username
                ? `<span class="cr-cand__meta__item"><i class="fa-solid fa-at"></i> ${esc(c.username)}</span>`
                : '';
            const reviewedHtml = c.reviewed_at && statusKey !== 'pending' && statusKey !== 'withdrawn'
                ? `<span class="cr-cand__meta__item"><i class="fa-solid fa-gavel"></i> روجِع: ${fmtDate(c.reviewed_at)}</span>`
                : '';
            const withdrawnHtml = c.withdrawn_at && statusKey === 'withdrawn'
                ? `<span class="cr-cand__meta__item"><i class="fa-solid fa-right-from-bracket"></i> انسحب: ${fmtDate(c.withdrawn_at)}</span>`
                : '';

            return `
                <article class="cr-cand cr-cand--${statusKey}" data-candidate-id="${esc(c.candidate_id)}">
                    <div class="cr-cand__head">
                        <div class="cr-cand__avatar">
                            ${avatarHtml}
                            <span class="cr-cand__num">#${esc(c.candidate_number)}</span>
                        </div>
                        <div class="cr-cand__id">
                            <h4 class="cr-cand__name">
                                ${esc(c.full_name || 'مرشح')}
                                <span class="cr-cand__badge"><i class="fa-solid fa-${CAND_STATUS_ICON[statusKey] || 'circle'}"></i> ${esc(statusLabel)}</span>
                            </h4>
                            <div class="cr-cand__meta">
                                ${usernameHtml}
                                ${submittedHtml}
                                ${reviewedHtml}
                                ${withdrawnHtml}
                            </div>
                        </div>
                    </div>
                    <div class="cr-cand__body">
                        <div class="cr-cand__statement">${esc(c.statement_ar || '—')}</div>
                        ${fileHtml}
                        ${noteHtml}
                    </div>
                    ${actionsHtml}
                </article>
            `;
        }

        _fmtFileSize(bytes) {
            if (!bytes || bytes <= 0) return '';
            if (bytes < 1024) return `${bytes} B`;
            if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
            return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
        }

        async _promptReviewNote({ action }) {
            const isReject = action === 'reject';
            const title    = isReject ? 'سبب الرفض' : 'طلب تعديل الترشح';
            const icon     = isReject ? 'fa-circle-xmark' : 'fa-pen-to-square';
            const color    = isReject ? 'danger' : 'warning';
            const hint     = isReject
                ? 'سيظهر هذا النص للمرشح كسبب رسمي للرفض. اكتبه بوضوح ولباقة.'
                : 'سيظهر هذا النص للمرشح ليعدّل ترشحه بناءً عليه.';
            const confirmLabel = isReject ? 'تأكيد الرفض' : 'إرسال طلب التعديل';
            const confirmCls   = isReject ? 'btn-danger' : 'btn-warning';

            return new Promise((resolve) => {
                const { modal, close } = this._openModal({
                    title,
                    icon,
                    size: 'sm',
                    color,
                    body: `
                        <form class="cr-note-form" id="crNoteForm">
                            <label class="cr-note-form__lbl" for="crNoteText">
                                <i class="fa-solid fa-comment-dots"></i> الملاحظة
                                <span style="color:var(--color-danger-500);">*</span>
                            </label>
                            <textarea id="crNoteText" class="cr-note-form__textarea" required placeholder="اكتب ملاحظتك للمرشح…"></textarea>
                            <p class="cr-note-form__hint">${esc(hint)}</p>
                        </form>
                    `,
                    footer: `
                        <button type="button" class="btn btn-slate btn-outline" data-dismiss="modal">إلغاء</button>
                        <button type="button" class="btn ${confirmCls}" id="crNoteSubmit"><i class="fa-solid fa-check"></i> ${esc(confirmLabel)}</button>
                    `
                });

                const textarea = modal.querySelector('#crNoteText');
                const submit   = modal.querySelector('#crNoteSubmit');
                const form     = modal.querySelector('#crNoteForm');

                setTimeout(() => textarea?.focus(), 50);

                let resolved = false;
                const finish = (val) => {
                    if (resolved) return;
                    resolved = true;
                    close();
                    resolve(val);
                };

                submit.addEventListener('click', () => {
                    const value = (textarea.value || '').trim();
                    if (!value) {
                        textarea.focus();
                        toast('الملاحظة مطلوبة', 'warning');
                        return;
                    }
                    finish(value);
                });

                form.addEventListener('submit', (ev) => {
                    ev.preventDefault();
                    submit.click();
                });

                modal.querySelectorAll('[data-dismiss="modal"]').forEach(btn => {
                    btn.addEventListener('click', () => finish(null));
                });
                modal.querySelector('.modal-close')?.addEventListener('click', () => finish(null));
            });
        }

        _bindCandidateActions(host, electionId, modeTag, refreshCb) {
            const statusMap = { approve: 'approved', reject: 'rejected', needs_edit: 'needs_edit' };
            host.querySelectorAll('[data-action]').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const action = btn.dataset.action;
                    const dbStatus = statusMap[action];
                    if (!dbStatus) return;
                    const candidateId = btn.dataset.candidate;
                    let note = null;
                    if (action === 'reject' || action === 'needs_edit') {
                        note = await this._promptReviewNote({ action });
                        if (note == null) return; // أُلغي
                    }
                    try {
                        btn.disabled = true;
                        const { error } = await sb.rpc('review_candidate', {
                            p_candidate: candidateId, p_new_status: dbStatus, p_note_ar: note
                        });
                        if (error) throw error;
                        toast('تم التحديث', 'success');
                        if (refreshCb) {
                            refreshCb();
                        }
                    } catch (err) {
                        console.error(err);
                        toast(err.message || String(err), 'error');
                    } finally {
                        btn.disabled = false;
                    }
                });
            });
        }

        /* ============================================================
           Mode: viewer — مستشار / عضو HR (قراءة)
           ============================================================ */
        async renderViewer() {
            const container = document.getElementById('electionsViewContainer');
            if (!container) return;

            container.innerHTML = `
                <div class="elections-impersonation-slot"></div>
                <div class="d-flex justify-between align-items-center" style="margin-bottom:1rem;">
                    <h2 style="margin:0;"><i class="fa-solid fa-eye"></i> مرشحو الانتخابات</h2>
                </div>
                <div id="viewerElectionsList">${loadingState()}</div>
            `;

            const { data, error } = await sb.from('elections')
                .select('id, status, target_role_name, committee:committees(committee_name_ar), department:departments(name_ar)')
                .is('archived_at', null)
                .in('status', ['candidacy_open', 'candidacy_closed', 'voting_open', 'voting_closed', 'completed'])
                .order('created_at', { ascending: false });

            const host = container.querySelector('#viewerElectionsList');
            if (error) { host.innerHTML = errorState(error.message); return; }

            const visible = [];
            for (const e of data || []) {
                const { data: ok } = await sb.rpc('has_election_view_permission', { p_user: this.user.id, p_election: e.id });
                if (ok) visible.push(e);
            }

            if (visible.length === 0) {
                host.innerHTML = emptyState('eye-slash', 'لا توجد انتخابات لعرضها');
                return;
            }

            host.innerHTML = `<div class="uc-grid">${visible.map(e => {
                const target = targetLabelOf(e, e.committee?.committee_name_ar, e.department?.name_ar);
                const footer = `
                    <button class="btn btn-primary btn-outline" data-action="view-candidates"><i class="fa-solid fa-users-viewfinder"></i> عرض المرشحين</button>
                    ${e.status === 'completed' ? `<button class="btn btn-warning btn-outline" data-action="view-results"><i class="fa-solid fa-chart-simple"></i> النتائج</button>` : ''}
                `;
                return ucElectionCard({
                    id: e.id, status: e.status, target,
                    infoItems: [],
                    footer
                });
            }).join('')}</div>`;

            host.querySelectorAll('[data-action="view-candidates"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.closest('[data-election-id]').dataset.electionId;
                    this.openCandidatesModal(id, 'viewer');
                });
            });
            host.querySelectorAll('[data-action="view-results"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.closest('[data-election-id]').dataset.electionId;
                    this.openResultsModal(id);
                });
            });
        }

        /* ============================================================
           Mode: member-run — ترشح
           ============================================================ */
        async renderMemberRun() {
            const container = document.getElementById('electionsRunContainer');
            if (!container) return;
            container.innerHTML = `
                <div class="elections-impersonation-slot"></div>
                <div id="runContent">${loadingState()}</div>
            `;
            this._renderImpersonationNoticeIfNeeded();

            const { data, error } = await sb.rpc('get_eligible_elections_for_user', { p_user: this.user.id });
            const host = container.querySelector('#runContent');
            if (error) { host.innerHTML = errorState(error.message); return; }

            const eligible = data || [];
            if (eligible.length === 0) {
                // ربما انسحب المستخدم سابقاً أو رُفض — نستعلم لتمييز السبب
                const priorInfo = await this._fetchPriorCandidacyInOpenElection();
                if (priorInfo) {
                    const targetLabel = targetLabelOf(
                        { target_role_name: priorInfo.target_role_name },
                        priorInfo.committee_name_ar,
                        priorInfo.department_name_ar
                    );
                    const msg = priorInfo.status === 'withdrawn'
                        ? `انسحبت سابقاً من ترشح <strong>${esc(targetLabel)}</strong>. لا يمكن إعادة التقديم لنفس الانتخاب.`
                        : `رُفض ترشحك السابق لـ <strong>${esc(targetLabel)}</strong>. لا يمكن إعادة التقديم لنفس الانتخاب.`;
                    host.innerHTML = `
                        <h2 style="margin:0 0 1rem;"><i class="fa-solid fa-bullhorn"></i> تقديم ترشح</h2>
                        <div class="modal-info-box box-warning">
                            <i class="fa-solid fa-circle-exclamation"></i>
                            <div>${msg} يمكنك متابعة التفاصيل في <strong>ملفي الانتخابي</strong>.</div>
                        </div>
                    `;
                } else {
                    host.innerHTML = `
                        <h2 style="margin:0 0 1rem;"><i class="fa-solid fa-bullhorn"></i> تقديم ترشح</h2>
                        ${emptyState('door-closed', 'لا توجد انتخابات مفتوحة للترشح', 'لم تتطابق أي انتخابات مع معايير أهليتك حالياً.')}
                    `;
                }
                return;
            }

            // الحالة الطبيعية: انتخاب واحد مؤهَّل (بسبب قواعد التفرّد).
            // إن توفّر أكثر من واحد (حالة نادرة) نأخذ أوّلها ونُلمح بالبقية.
            const e = eligible[0];
            this._renderCandidacyInlinePage(host, e, eligible.length);
        }

        _renderPositionInfoCard(host, candidacy) {
            if (!host) return;
            if (!candidacy) {
                host.innerHTML = '';
                return;
            }
            const target = targetLabelOf(
                { target_role_name: candidacy.target_role_name },
                candidacy.target_committee_ar,
                candidacy.target_department_ar
            );
            let endValue;
            if (candidacy.candidacy_end) {
                const remainMs = new Date(candidacy.candidacy_end).getTime() - Date.now();
                const showCountdown = candidacy.election_status === 'candidacy_open';
                endValue = showCountdown
                    ? `${esc(fmtDeadline(candidacy.candidacy_end))} <span class="countdown-tag" data-countdown="${esc(candidacy.candidacy_end)}">(${esc(fmtRemaining(remainMs))})</span>`
                    : esc(fmtDeadline(candidacy.candidacy_end));
            } else {
                endValue = '<span style="opacity:0.65;">لم يُحدَّد</span>';
            }

            host.innerHTML = `
                <div class="card card--primary" style="margin-bottom:1.25rem;">
                    <div class="card-header">
                        <h3><i class="fa-solid fa-id-badge"></i> تفاصيل المنصب</h3>
                    </div>
                    <div class="card-body">
                        <div class="position-info-grid">
                            ${infoItem('user-tie', 'المنصب', esc(target))}
                            ${infoItem('hashtag', 'رقم المرشح', `#${candidacy.candidate_number}`)}
                            ${infoItem('circle-info', 'حالة الطلب', candidateBadge(candidacy.candidate_status))}
                            ${infoItem('calendar', 'نهاية الترشح', endValue)}
                        </div>
                    </div>
                    ${candidacy.can_withdraw ? `
                        <div class="card-footer">
                            <button class="btn btn-danger btn-block" data-action="withdraw-from-info">
                                <i class="fa-solid fa-person-walking-arrow-right"></i> انسحاب
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;

            const withdrawBtn = host.querySelector('[data-action="withdraw-from-info"]');
            if (withdrawBtn) {
                withdrawBtn.addEventListener('click', () => this._handleWithdraw(candidacy.candidate_id));
            }

            this._startCountdownTicker();
        }

        _canSelfEdit(candidacy) {
            // التعديل الذاتي مسموح في pending أو needs_edit، طالما الانتخاب مفتوح للترشح وغير مؤرشف
            if (!candidacy) return false;
            if (!['pending', 'needs_edit'].includes(candidacy.candidate_status)) return false;
            if (candidacy.election_status !== 'candidacy_open') return false;
            if (candidacy.election_archived_at) return false;
            return true;
        }

        async _openCandidacyEditModal(candidacy) {
            try {
                await this.openCandidacyForm(candidacy.election_id, candidacy.candidate_id);
            } catch (err) {
                console.error(err);
                toast(err.message || String(err), 'error');
            }
        }

        async _openStatementOnlyEditModal(candidacy) {
            if (this.user._isImpersonating) {
                toast('لا يمكن التعديل أثناء وضع العرض كمستخدم', 'warning');
                return;
            }
            const { modal, close } = this._openModal({
                title: 'تعديل البيان الانتخابي',
                icon: 'fa-align-right',
                size: 'md',
                color: 'primary',
                body: `
                    <form id="stmtEditForm">
                        <div class="modal-section">
                            <p class="modal-section-title"><i class="fa-solid fa-align-right"></i> البيان <span class="required-dot">*</span></p>
                            <textarea class="form-textarea" id="stmtEditTa" rows="8" required>${esc(candidacy.statement_ar || '')}</textarea>
                        </div>
                    </form>
                `,
                footer: `
                    <button class="btn btn-success" id="stmtEditSubmit">
                        <i class="fa-solid fa-paper-plane"></i> حفظ
                    </button>
                    <button class="btn btn-slate btn-outline" data-dismiss="modal">إلغاء</button>
                `
            });

            const ta = modal.querySelector('#stmtEditTa');

            modal.querySelector('#stmtEditSubmit').addEventListener('click', async (ev) => {
                ev.preventDefault();
                const statement = ta.value.trim();
                if (!statement) {
                    toast('البيان مطلوب', 'warning');
                    return;
                }
                if (statement === (candidacy.statement_ar || '').trim()) {
                    toast('لم تُجرِ أي تعديل على البيان', 'warning');
                    return;
                }
                const btn = modal.querySelector('#stmtEditSubmit');
                btn.disabled = true;
                try {
                    const { error } = await sb.rpc('resubmit_candidacy', {
                        p_candidate:        candidacy.candidate_id,
                        p_statement_ar:     statement,
                        p_file_url:         candidacy.file_url,
                        p_file_name:        candidacy.file_name,
                        p_file_size_bytes:  candidacy.file_size_bytes || null,
                        p_file_mime:        candidacy.file_mime
                    });
                    if (error) throw error;
                    toast('تم تحديث البيان', 'success');
                    close();
                    await this.renderMemberProfile();
                    window.rebuildNavigation?.();
                } catch (err) {
                    console.error(err);
                    toast(err.message || String(err), 'error');
                    btn.disabled = false;
                }
            });
        }

        async _openFileOnlyEditModal(candidacy) {
            if (this.user._isImpersonating) {
                toast('لا يمكن التعديل أثناء وضع العرض كمستخدم', 'warning');
                return;
            }
            const hasExisting = !!candidacy.file_url;
            const { modal, close } = this._openModal({
                title: hasExisting ? 'تعديل الملف الانتخابي' : 'إرفاق ملف انتخابي',
                icon: 'fa-paperclip',
                size: 'md',
                color: 'primary',
                body: `
                    <form id="fileEditForm">
                        <div class="modal-section">
                            <p class="modal-section-title"><i class="fa-solid fa-paperclip"></i> ملف الترشح </p>
                            <div class="form-file">
                                <input type="file" id="fileEditInput" accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg" />
                                <div class="form-dropzone">
                                    <div class="form-dropzone-icon"><i class="fa-solid fa-cloud-arrow-up"></i></div>
                                    <div class="form-dropzone-title">اضغط لاختيار ملف أو اسحبه هنا</div>
                                    <div class="form-dropzone-hint">PDF, Word, نص, صور — حد أقصى 5MB</div>
                                </div>
                            </div>
                            <div class="form-file-list" id="fileEditPreview"></div>
                        </div>
                    </form>
                `,
                footer: `
                    <button class="btn btn-success" id="fileEditSubmit">
                        <i class="fa-solid fa-paper-plane"></i> حفظ
                    </button>
                    ${hasExisting ? `<button class="btn btn-danger" id="fileEditRemove">
                        <i class="fa-solid fa-trash"></i> حذف الملف
                    </button>` : ''}
                    <button class="btn btn-slate btn-outline" data-dismiss="modal">إلغاء</button>
                `
            });

            const fileInput = modal.querySelector('#fileEditInput');
            const preview   = modal.querySelector('#fileEditPreview');
            const dropzone  = modal.querySelector('.form-dropzone');
            let removeFlag  = false;

            const renderPreview = ({ name, sizeBytes, url, removed } = {}) => {
                if (removed) {
                    preview.innerHTML = `
                        <div class="modal-info-box box-danger">
                            <i class="fa-solid fa-trash"></i>
                            <div>سيُحذف الملف الحالي عند الحفظ.</div>
                        </div>
                    `;
                    return;
                }
                if (!name) { preview.innerHTML = ''; return; }
                const sizeKb = sizeBytes ? `${(sizeBytes / 1024).toFixed(1)} KB` : '';
                const openLink = url
                    ? `<a class="btn btn-primary btn-outline btn-icon btn-sm" href="${esc(url)}" target="_blank" rel="noopener" title="فتح الملف" aria-label="فتح الملف"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>`
                    : '';
                preview.innerHTML = `
                    <div class="form-file-item">
                        <div class="form-file-icon"><i class="fa-solid fa-file-lines"></i></div>
                        <div class="form-file-name">${esc(name)}</div>
                        ${sizeKb ? `<span class="form-file-size">${esc(sizeKb)}</span>` : ''}
                        ${openLink}
                    </div>
                `;
            };

            if (hasExisting) {
                renderPreview({
                    name: candidacy.file_name,
                    sizeBytes: candidacy.file_size_bytes,
                    url: candidacy.file_url
                });
            }

            fileInput.addEventListener('change', () => {
                removeFlag = false;
                const f = fileInput.files[0];
                if (f) renderPreview({ name: f.name, sizeBytes: f.size });
                else if (hasExisting) renderPreview({
                    name: candidacy.file_name, sizeBytes: candidacy.file_size_bytes, url: candidacy.file_url
                });
                else renderPreview();
            });

            ['dragenter', 'dragover'].forEach(evName => {
                dropzone.addEventListener(evName, (ev) => {
                    ev.preventDefault();
                    dropzone.classList.add('drag-over');
                });
            });
            ['dragleave', 'drop'].forEach(evName => {
                dropzone.addEventListener(evName, () => dropzone.classList.remove('drag-over'));
            });

            const removeBtn = modal.querySelector('#fileEditRemove');
            if (removeBtn) {
                removeBtn.addEventListener('click', () => {
                    removeFlag = true;
                    fileInput.value = '';
                    renderPreview({ removed: true });
                });
            }

            modal.querySelector('#fileEditSubmit').addEventListener('click', async (ev) => {
                ev.preventDefault();
                const newFile = fileInput.files[0];
                if (!newFile && !removeFlag) {
                    toast(hasExisting ? 'لم تُجرِ أي تعديل على الملف' : 'لم تختر ملفاً للإرفاق', 'warning');
                    return;
                }

                let fileMeta = removeFlag
                    ? { file_url: null, file_name: null, file_size_bytes: null, file_mime: null }
                    : { file_url: candidacy.file_url, file_name: candidacy.file_name, file_size_bytes: candidacy.file_size_bytes || null, file_mime: candidacy.file_mime };

                if (newFile) {
                    if (newFile.size > MAX_FILE_SIZE) { toast('حجم الملف يتجاوز 5MB', 'warning'); return; }
                    if (!ALLOWED_MIMES.includes(newFile.type)) { toast('صيغة الملف غير مدعومة', 'warning'); return; }
                    try {
                        fileMeta = await this._uploadCandidateFile(newFile, candidacy.election_id);
                    } catch (err) {
                        toast('فشل رفع الملف: ' + (err.message || err), 'error');
                        return;
                    }
                }

                const btn = modal.querySelector('#fileEditSubmit');
                btn.disabled = true;
                try {
                    const { error } = await sb.rpc('resubmit_candidacy', {
                        p_candidate:        candidacy.candidate_id,
                        p_statement_ar:     candidacy.statement_ar,
                        p_file_url:         fileMeta.file_url,
                        p_file_name:        fileMeta.file_name,
                        p_file_size_bytes:  fileMeta.file_size_bytes,
                        p_file_mime:        fileMeta.file_mime
                    });
                    if (error) throw error;
                    toast(removeFlag ? 'تم حذف الملف' : 'تم تحديث الملف', 'success');
                    close();
                    await this.renderMemberProfile();
                    window.rebuildNavigation?.();
                } catch (err) {
                    console.error(err);
                    toast(err.message || String(err), 'error');
                    btn.disabled = false;
                }
            });
        }

        async _handleWithdraw(candidateId) {
            try {
                if (!await confirmDialog('تأكيد الانسحاب من هذا الترشح؟', { icon: 'warning' })) return;
                const { error } = await sb.rpc('withdraw_candidacy', { p_candidate: candidateId });
                if (error) throw error;
                toast('تم الانسحاب', 'success');
                await this.renderMemberProfile();
                window.rebuildNavigation?.();
            } catch (err) {
                console.error(err);
                toast(err.message || String(err), 'error');
            }
        }

        _renderReviewNoteCard(host, candidacy) {
            if (!host) return;
            if (!candidacy
                || !['rejected', 'needs_edit'].includes(candidacy.candidate_status)
                || !candidacy.review_note_ar) {
                host.innerHTML = '';
                return;
            }
            const isRejected = candidacy.candidate_status === 'rejected';
            const variant = isRejected ? 'danger'  : 'warning';
            const icon    = isRejected ? 'circle-xmark' : 'pen-to-square';
            const title   = isRejected ? 'سبب رفض الترشح' : 'سبب طلب التعديل';
            const showEditBtn = !isRejected && candidacy.can_edit;
            host.innerHTML = `
                <div class="card card--${variant}" style="margin-bottom:1.25rem;">
                    <div class="card-header">
                        <h3><i class="fa-solid fa-${icon}"></i> ${esc(title)}</h3>
                    </div>
                    <div class="card-body">
                        <div style="font-size:0.92rem;color:#1e293b;white-space:pre-wrap;line-height:1.7;">${esc(candidacy.review_note_ar)}</div>
                    </div>
                    ${showEditBtn ? `
                        <div class="card-footer">
                            <button class="btn btn-warning btn-block" data-action="edit-from-note">
                                <i class="fa-solid fa-pen"></i> تعديل طلبي
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;

            const editBtn = host.querySelector('[data-action="edit-from-note"]');
            if (editBtn) {
                editBtn.addEventListener('click', async () => {
                    try {
                        await this.openCandidacyForm(candidacy.election_id, candidacy.candidate_id);
                    } catch (err) {
                        console.error(err);
                        toast(err.message || String(err), 'error');
                    }
                });
            }
        }

        _renderStatementCard(host, candidacy) {
            if (!host) return;
            if (!candidacy || !candidacy.statement_ar) {
                host.innerHTML = '';
                return;
            }
            const editable    = this._canSelfEdit(candidacy);
            const isNeedsEdit = candidacy.candidate_status === 'needs_edit';
            const showEditBtn = editable || isNeedsEdit;
            const disabled    = isNeedsEdit ? 'disabled aria-disabled="true"' : '';
            host.innerHTML = `
                <div class="card card--primary" style="margin-bottom:1.25rem;">
                    <div class="card-header">
                        <h3><i class="fa-solid fa-align-right"></i> البيان الانتخابي</h3>
                    </div>
                    <div class="card-body">
                        <div style="font-size:0.92rem;color:#1e293b;white-space:pre-wrap;line-height:1.7;">${esc(candidacy.statement_ar)}</div>
                    </div>
                    ${showEditBtn ? `
                        <div class="card-footer">
                            <button class="btn btn-primary btn-block" data-action="edit-from-statement" ${disabled}>
                                <i class="fa-solid fa-pen"></i> تعديل البيان
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
            const btn = host.querySelector('[data-action="edit-from-statement"]');
            if (btn && !btn.disabled) {
                btn.addEventListener('click', () => this._openStatementOnlyEditModal(candidacy));
            }
        }

        _renderFileCard(host, candidacy) {
            if (!host) return;
            if (!candidacy) {
                host.innerHTML = '';
                return;
            }

            const shell = (bodyHtml, footerHtml = '') => `
                <div class="card card--primary" style="margin-bottom:1.25rem;">
                    <div class="card-header">
                        <h3><i class="fa-solid fa-paperclip"></i> الملف الانتخابي</h3>
                    </div>
                    <div class="card-body">${bodyHtml}</div>
                    ${footerHtml ? `<div class="card-footer">${footerHtml}</div>` : ''}
                </div>
            `;

            if (!candidacy.file_url) {
                const editableNoFile = this._canSelfEdit(candidacy);
                const isNeedsEditNoFile = candidacy.candidate_status === 'needs_edit';
                const showEditNoFile = editableNoFile || isNeedsEditNoFile;
                const disabledNoFile = isNeedsEditNoFile ? 'disabled aria-disabled="true"' : '';
                host.innerHTML = shell(
                    emptyState('file-circle-xmark', 'لم يُرفع ملف انتخابي', 'إرفاق الملف اختياري', 'primary'),
                    showEditNoFile ? `
                        <button class="btn btn-primary btn-outline btn-block" data-action="edit-from-file" ${disabledNoFile}>
                            <i class="fa-solid fa-paperclip"></i> إرفاق ملف
                        </button>
                    ` : ''
                );
                const btn0 = host.querySelector('[data-action="edit-from-file"]');
                if (btn0 && !btn0.disabled) {
                    btn0.addEventListener('click', () => this._openFileOnlyEditModal(candidacy));
                }
                return;
            }

            const sizeKb = candidacy.file_size_bytes
                ? `${(candidacy.file_size_bytes / 1024).toFixed(1)} KB`
                : '';
            const mimeLabel = MIME_LABELS[candidacy.file_mime] || '';
            const meta = [mimeLabel, sizeKb].filter(Boolean).join(' · ');

            const editable    = this._canSelfEdit(candidacy);
            const isNeedsEdit = candidacy.candidate_status === 'needs_edit';
            const showEditBtn = editable || isNeedsEdit;
            const disabled    = isNeedsEdit ? 'disabled aria-disabled="true"' : '';
            const editBtn = showEditBtn
                ? `<button class="btn btn-primary btn-block" data-action="edit-from-file" ${disabled}>
                       <i class="fa-solid fa-pen"></i> تعديل الملف
                   </button>`
                : '';

            const footerHtml = `
                <a class="btn btn-primary btn-block" href="${esc(candidacy.file_url)}" target="_blank" rel="noopener">
                    <i class="fa-solid fa-arrow-up-right-from-square"></i> فتح الملف
                </a>
                ${editBtn}
            `;

            host.innerHTML = shell(`
                <div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap;">
                    <div style="width:42px;height:42px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:#eff6ff;color:#1d4ed8;flex-shrink:0;">
                        <i class="fa-solid fa-file-lines" style="font-size:1.1rem;"></i>
                    </div>
                    <div style="flex:1;min-width:0;">
                        <div style="font-weight:600;color:#1e293b;font-size:0.95rem;word-break:break-word;">${esc(candidacy.file_name || 'الملف المرفق')}</div>
                        ${meta ? `<div style="font-size:0.78rem;color:#64748b;margin-top:0.15rem;">${esc(meta)}</div>` : ''}
                    </div>
                </div>
            `, footerHtml);

            const btn = host.querySelector('[data-action="edit-from-file"]');
            if (btn && !btn.disabled) {
                btn.addEventListener('click', () => this._openFileOnlyEditModal(candidacy));
            }
        }

        async _renderRequestPathCard(host, candidacy) {
            if (!host) return;
            if (!candidacy) {
                host.innerHTML = '';
                return;
            }

            const renderShell = (innerHtml) => `
                <div class="card card--primary" style="margin-bottom:1.25rem;">
                    <div class="card-header">
                        <h3><i class="fa-solid fa-route"></i> مسار طلبك</h3>
                    </div>
                    <div class="card-body">
                        <div class="position-info-grid">
                            ${innerHtml}
                        </div>
                    </div>
                </div>
            `;

            host.innerHTML = renderShell('<div style="opacity:0.65;font-size:0.85rem;">جارٍ التحميل…</div>');

            const { data, error } = await sb.rpc('get_candidate_audit_trail', { p_candidate: candidacy.candidate_id });
            if (error) {
                console.warn('[ElectionsManager] audit trail fetch failed', error);
                host.innerHTML = '';
                return;
            }

            const events = data || [];
            if (events.length === 0) {
                host.innerHTML = '';
                return;
            }

            const items = events.map(ev => this._renderAuditEvent(ev)).join('');
            host.innerHTML = renderShell(items);
        }

        _renderAuditEvent(ev) {
            const when = esc(fmtDate(ev.created_at));

            let icon = 'circle';
            let label = ev.event_type;
            let value = when;

            if (ev.event_type === 'candidacy_submitted') {
                icon = 'paper-plane';
                label = 'تم تقديم الطلب';
            } else if (ev.event_type === 'candidate_resubmitted') {
                icon = 'rotate-right';
                label = 'أعدتَ تقديم الطلب بعد التعديل';
            } else if (ev.event_type === 'candidate_updated') {
                icon = 'pen';
                label = 'عدّلتَ طلبك';
            } else if (ev.event_type === 'candidate_withdrawn') {
                icon = 'person-walking-arrow-right';
                label = 'تم الانسحاب';
            } else if (ev.event_type === 'candidate_reviewed') {
                const newStatus = ev.payload?.new_status;
                if (newStatus === 'approved') {
                    icon = 'circle-check';
                    label = 'قُبل الترشح';
                } else if (newStatus === 'rejected') {
                    icon = 'circle-xmark';
                    label = 'رُفض الترشح';
                } else if (newStatus === 'needs_edit') {
                    icon = 'pen-to-square';
                    label = 'طُلب تعديل';
                } else {
                    icon = 'magnifying-glass';
                    label = `مراجعة (${esc(newStatus || '—')})`;
                }
            }

            return infoItem(icon, label, value);
        }

        async _fetchPriorCandidacyInOpenElection() {
            // نبحث عن ترشّح سابق للمستخدم (withdrawn/rejected) في انتخاب
            // لا يزال نشطاً (غير مؤرشف وحالته candidacy_open) لنعرض سبب الحجب.
            const { data, error } = await sb
                .from('election_candidates')
                .select(`
                    status,
                    election:elections!inner (
                        id, target_role_name, status, archived_at,
                        committee:committees(committee_name_ar),
                        department:departments(name_ar)
                    )
                `)
                .eq('user_id', this.user.id)
                .in('status', ['withdrawn', 'rejected'])
                .order('submitted_at', { ascending: false })
                .limit(5);
            if (error || !Array.isArray(data)) return null;
            const match = data.find(r =>
                r.election &&
                r.election.archived_at === null &&
                r.election.status === 'candidacy_open'
            );
            if (!match) return null;
            return {
                status:              match.status,
                target_role_name:    match.election.target_role_name,
                committee_name_ar:   match.election.committee?.committee_name_ar,
                department_name_ar:  match.election.department?.name_ar
            };
        }

        _renderCandidacyInlinePage(host, e, totalCount = 1) {
            const target = targetLabelOf(
                { target_role_name: e.target_role_name },
                e.target_committee_ar,
                e.target_department_ar
            );

            if (e.has_submission) {
                host.innerHTML = `
                    <div class="card card--info" style="margin-bottom:1.25rem;">
                        <div class="card-header">
                            <h3><i class="fa-solid fa-bullhorn"></i> تقديم ترشح</h3>
                        </div>
                        <div class="card-body">
                            <div class="modal-info-box box-info">
                                <i class="fa-solid fa-circle-check"></i>
                                <div>تقدّمت مسبقاً لترشح <strong>${esc(target)}</strong>. تابع حالته وعدِّله من تبويب <strong>ملفي الانتخابي</strong>.</div>
                            </div>
                        </div>
                    </div>
                `;
                return;
            }

            let deadlineValue;
            if (e.candidacy_end) {
                const remainMs = new Date(e.candidacy_end).getTime() - Date.now();
                deadlineValue = `${esc(fmtDeadline(e.candidacy_end))} <span class="countdown-tag" data-countdown="${esc(e.candidacy_end)}">(${esc(fmtRemaining(remainMs))})</span>`;
            } else {
                deadlineValue = '<span style="opacity:0.65;">لم يُحدَّد</span>';
            }

            const moreHint = totalCount > 1
                ? `<div class="modal-info-box box-warning" style="margin:0;"><i class="fa-solid fa-info-circle"></i><div>لديك أكثر من انتخاب مؤهَّل (${totalCount}). هذا أوّل ما يظهر — يمكنك إعادة التحميل بعد إرسال هذا.</div></div>`
                : '';

            host.innerHTML = `
                <div class="candidacy-flow">
                    <div class="card card--primary">
                        <div class="card-header">
                            <h3><i class="fa-solid fa-bullhorn"></i> تفاصيل الانتخاب</h3>
                        </div>
                        <div class="card-body">
                            <div class="position-info-grid">
                                ${infoItem('user-tie', 'المنصب', esc(target))}
                                ${infoItem('calendar', 'نهاية الترشح', deadlineValue)}
                            </div>
                        </div>
                    </div>
                    ${moreHint}

                    <div class="candidacy-stepper" role="list">
                        <div class="candidacy-step" data-step="1" data-state="active" role="listitem">
                            <span class="candidacy-step-num"><span class="candidacy-step-num-text">1</span></span>
                            <span class="candidacy-step-label">التعليمات</span>
                        </div>
                        <div class="candidacy-step-connector"></div>
                        <div class="candidacy-step" data-step="2" role="listitem">
                            <span class="candidacy-step-num"><span class="candidacy-step-num-text">2</span></span>
                            <span class="candidacy-step-label">النموذج</span>
                        </div>
                    </div>

                    <div class="card card--warning" data-panel="1">
                        <div class="card-header">
                            <h3><i class="fa-solid fa-circle-info"></i> اقرأ قبل التقديم</h3>
                        </div>
                        <div class="card-body">
                            <div class="position-info-grid">
                                <div class="uc-card__info-item uc-card__info-item--list">
                                    <div class="uc-card__info-icon"><i class="fa-solid fa-user-slash"></i></div>
                                    <div class="uc-card__info-content">
                                        <span class="uc-card__info-label">لا تذكر اسمك في البيان</span>
                                        <span class="uc-card__info-value">البيان الانتخابي يُعرض للمصوتين دون كشف هويتك، لذلك ذكر أسمك في البيان يعرضك للاستبعاد من الانتخاب</span>
                                    </div>
                                </div>
                                <div class="uc-card__info-item uc-card__info-item--list">
                                    <div class="uc-card__info-icon"><i class="fa-solid fa-bullseye"></i></div>
                                    <div class="uc-card__info-content">
                                        <span class="uc-card__info-label">بيانك خطاب لزملائك</span>
                                        <span class="uc-card__info-value">اكتبه لإقناع أعضاء لجنتك/قسمك بالتصويت لك، ليس لمخاطبة المجلس الإداري أو إدارة الموارد البشرية.</span>
                                    </div>
                                </div>
                                <div class="uc-card__info-item uc-card__info-item--list">
                                    <div class="uc-card__info-icon"><i class="fa-solid fa-pen-ruler"></i></div>
                                    <div class="uc-card__info-content">
                                        <span class="uc-card__info-label">ضمّن في بيانك</span>
                                        <span class="uc-card__info-value">أفكارك، رؤيتك، أهدافك، وخبراتك السابقة — بصياغة واضحة وقابلة للتنفيذ.</span>
                                    </div>
                                </div>
                                <div class="uc-card__info-item uc-card__info-item--list">
                                    <div class="uc-card__info-icon"><i class="fa-solid fa-paperclip"></i></div>
                                    <div class="uc-card__info-content">
                                        <span class="uc-card__info-label">الملف الانتخابي اختياري</span>
                                        <span class="uc-card__info-value">خيار إضافي ليس إجباري لتوضيح رؤيتك، أهدافك، وخبراتك بصريًا لتوضيح تفاصيلها وجذب أصوات أكثر.</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="card-footer candidacy-step-footer">
                            <label class="form-checkbox" for="candidacyGateAccept">
                                <input type="checkbox" id="candidacyGateAccept" />
                                <span class="form-checkbox-label">أقرّ بأنني اطّلعت على التعليمات أعلاه وألتزم بها — بما فيها عدم ذكر اسمي في البيان.</span>
                            </label>
                            <button type="button" class="btn btn-warning btn-block" id="candidacyGateContinue" disabled>
                                متابعة إلى النموذج <i class="fa-solid fa-arrow-left"></i>
                            </button>
                        </div>
                    </div>

                    <div class="card card--primary" data-panel="2" hidden>
                        <div class="card-header">
                            <h3><i class="fa-solid fa-pen-to-square"></i> نموذج الترشح</h3>
                        </div>
                        <form id="inlineCandidacyForm" class="card-body">
                            <div class="modal-section">
                                <label class="modal-section-title" for="candStatement"><i class="fa-solid fa-align-right"></i> بيان الترشح <span class="required-dot">*</span></label>
                                <textarea class="form-textarea" id="candStatement" rows="8" required placeholder="اكتب بيانك الانتخابي بدون ذكر اسمك…"></textarea>
                                <div class="candidacy-field-hint"><i class="fa-solid fa-triangle-exclamation"></i> تذكير: لا تذكر اسمك — البيان يُعرض دون كشف الهوية.</div>
                            </div>
                            <div class="modal-section">
                                <p class="modal-section-title"><i class="fa-solid fa-paperclip"></i> ملف الترشح <span class="candidacy-field-optional">(اختياري — حد أقصى 5MB)</span></p>
                                <div class="form-file">
                                    <input type="file" id="candFile" accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg" />
                                    <div class="form-dropzone">
                                        <div class="form-dropzone-icon"><i class="fa-solid fa-cloud-arrow-up"></i></div>
                                        <div class="form-dropzone-title">اضغط لاختيار ملف أو اسحبه هنا</div>
                                        <div class="form-dropzone-hint">PDF, Word, نص, صور</div>
                                    </div>
                                </div>
                                <div class="form-file-list" id="candFilePreview"></div>
                            </div>
                        </form>
                        <div class="card-footer candidacy-form-footer">
                            <button type="button" class="btn btn-slate btn-outline" id="candidacyBackBtn">
                                <i class="fa-solid fa-arrow-right"></i> رجوع للتعليمات
                            </button>
                            <button type="submit" form="inlineCandidacyForm" class="btn btn-success" id="inlineSubmitBtn">
                                <i class="fa-solid fa-paper-plane"></i> إرسال الترشح
                            </button>
                        </div>
                    </div>
                </div>
            `;

            // تنقّل بين الخطوتين — لا تظهر الثانية إلا بعد الإقرار
            const panel1       = host.querySelector('[data-panel="1"]');
            const panel2       = host.querySelector('[data-panel="2"]');
            const step1Node    = host.querySelector('.candidacy-step[data-step="1"]');
            const step2Node    = host.querySelector('.candidacy-step[data-step="2"]');
            const connector    = host.querySelector('.candidacy-step-connector');
            const gateAccept   = host.querySelector('#candidacyGateAccept');
            const gateContinue = host.querySelector('#candidacyGateContinue');
            const backBtn      = host.querySelector('#candidacyBackBtn');

            const goToStep = (n) => {
                panel1.hidden = n !== 1;
                panel2.hidden = n !== 2;
                step1Node.dataset.state = n === 1 ? 'active' : 'done';
                step2Node.dataset.state = n === 2 ? 'active' : '';
                connector.dataset.state = n === 2 ? 'done' : '';
                if (n === 2) host.querySelector('#candStatement')?.focus({ preventScroll: true });
            };

            gateAccept.addEventListener('change', () => {
                gateContinue.disabled = !gateAccept.checked;
            });
            gateContinue.addEventListener('click', () => {
                if (!gateAccept.checked) return;
                goToStep(2);
            });
            backBtn.addEventListener('click', () => goToStep(1));

            // معاينة الملف عند الاختيار + سلوك السحب
            const fileInput = host.querySelector('#candFile');
            const filePreview = host.querySelector('#candFilePreview');
            const dropzone = host.querySelector('.form-dropzone');
            const renderFilePreview = ({ name, sizeBytes } = {}) => {
                if (!name) { filePreview.innerHTML = ''; return; }
                const sizeKb = sizeBytes ? `${(sizeBytes / 1024).toFixed(1)} KB` : '';
                filePreview.innerHTML = `
                    <div class="form-file-item">
                        <div class="form-file-icon"><i class="fa-solid fa-file-lines"></i></div>
                        <div class="form-file-name">${esc(name)}</div>
                        ${sizeKb ? `<span class="form-file-size">${esc(sizeKb)}</span>` : ''}
                    </div>
                `;
            };
            fileInput.addEventListener('change', () => {
                const f = fileInput.files[0];
                renderFilePreview(f ? { name: f.name, sizeBytes: f.size } : {});
            });
            ['dragenter', 'dragover'].forEach(evName => {
                dropzone.addEventListener(evName, (ev) => {
                    ev.preventDefault();
                    dropzone.classList.add('drag-over');
                });
            });
            ['dragleave', 'drop'].forEach(evName => {
                dropzone.addEventListener(evName, () => dropzone.classList.remove('drag-over'));
            });

            const ta = host.querySelector('#candStatement');

            host.querySelector('#inlineCandidacyForm').addEventListener('submit', async (ev) => {
                ev.preventDefault();
                if (this.user._isImpersonating) {
                    toast('لا يمكن الترشح أثناء وضع العرض كمستخدم', 'warning');
                    return;
                }
                const statement = ta.value.trim();
                if (!statement) {
                    toast('بيان الترشح مطلوب', 'warning');
                    return;
                }

                const fileInput = host.querySelector('#candFile');
                let fileMeta = { file_url: null, file_name: null, file_size_bytes: null, file_mime: null };
                const file = fileInput.files[0];
                if (file) {
                    if (file.size > MAX_FILE_SIZE) { toast('حجم الملف يتجاوز 5MB', 'warning'); return; }
                    if (!ALLOWED_MIMES.includes(file.type)) { toast('صيغة الملف غير مدعومة', 'warning'); return; }
                    try {
                        fileMeta = await this._uploadCandidateFile(file, e.election_id);
                    } catch (err) {
                        toast('فشل رفع الملف: ' + (err.message || err), 'error');
                        return;
                    }
                }

                const submitBtn = host.querySelector('#inlineSubmitBtn');
                submitBtn.disabled = true;
                try {
                    const { error } = await sb.rpc('submit_candidacy', {
                        p_election: e.election_id,
                        p_statement_ar: statement,
                        p_file_url: fileMeta.file_url,
                        p_file_name: fileMeta.file_name,
                        p_file_size_bytes: fileMeta.file_size_bytes,
                        p_file_mime: fileMeta.file_mime
                    });
                    if (error) throw error;
                    toast('تم تقديم الترشح', 'success');
                    window.rebuildNavigation?.();
                    // ننقل المستخدم مباشرة إلى "ملفي الانتخابي" لمتابعة حالة الترشح
                    if (typeof window.navigateToSection === 'function') {
                        window.navigateToSection('elections-my-profile-section');
                    } else {
                        // fallback: إن لم تتوفّر دالة التنقل، نعرض حالة "تقدّمت مسبقاً"
                        this._renderCandidacyInlinePage(host, { ...e, has_submission: true }, totalCount);
                    }
                } catch (err) {
                    console.error(err);
                    toast(err.message || String(err), 'error');
                    submitBtn.disabled = false;
                }
            });

            this._startCountdownTicker();
        }

        async openCandidacyForm(electionId, existingCandidateId = null) {
            if (this.user._isImpersonating) {
                toast('لا يمكن الترشح أثناء وضع العرض كمستخدم', 'warning');
                return;
            }

            let existing = null;
            if (existingCandidateId) {
                const { data } = await sb.from('election_candidates').select('*').eq('id', existingCandidateId).single();
                existing = data;
            }

            const reviewNoteBox = (existing?.review_note_ar)
                ? `
                    <div class="modal-info-box box-warning">
                        <i class="fa-solid fa-note-sticky"></i>
                        <div>
                            <strong>ملاحظة المراجعة:</strong>
                            <div style="margin-top:0.25rem;white-space:pre-wrap;">${esc(existing.review_note_ar)}</div>
                        </div>
                    </div>
                    <hr class="modal-divider">
                `
                : '';

            const { modal, close } = this._openModal({
                title: existing ? 'تعديل الترشح' : 'تقديم ترشح',
                icon: 'fa-pen-to-square',
                size: 'md',
                color: existing ? 'warning' : 'primary',
                body: `
                    <form id="candidacyForm">
                        ${reviewNoteBox}
                        <div class="modal-section">
                            <p class="modal-section-title"><i class="fa-solid fa-align-right"></i> بيان الترشح <span class="required-dot">*</span></p>
                            <textarea class="form-textarea" id="candStatement" rows="7" required>${esc(existing?.statement_ar || '')}</textarea>
                        </div>
                        <hr class="modal-divider">
                        <div class="modal-section">
                            <p class="modal-section-title"><i class="fa-solid fa-paperclip"></i> ملف الترشح </p>
                            <div class="form-file">
                                <input type="file" id="candFile" accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg" />
                                <div class="form-dropzone">
                                    <div class="form-dropzone-icon"><i class="fa-solid fa-cloud-arrow-up"></i></div>
                                    <div class="form-dropzone-title">اضغط لاختيار ملف أو اسحبه هنا</div>
                                    <div class="form-dropzone-hint">PDF, Word, نص, صور — حد أقصى 5MB</div>
                                </div>
                            </div>
                            <div class="form-file-list" id="candFilePreview"></div>
                        </div>
                    </form>
                `,
                footer: `
                    <button class="btn btn-success" id="candSubmitBtn">
                        <i class="fa-solid fa-paper-plane"></i> إرسال
                    </button>
                    <button class="btn btn-slate btn-outline" data-dismiss="modal">إلغاء</button>
                `
            });

            const ta = modal.querySelector('#candStatement');

            const fileInput   = modal.querySelector('#candFile');
            const filePreview = modal.querySelector('#candFilePreview');
            const dropzone    = modal.querySelector('.form-dropzone');

            const modalColor = existing ? 'warning' : 'primary';
            const renderFilePreview = ({ name, sizeBytes, url } = {}) => {
                if (!name) { filePreview.innerHTML = ''; return; }
                const sizeKb = sizeBytes ? `${(sizeBytes / 1024).toFixed(1)} KB` : '';
                const openLink = url
                    ? `<a class="btn btn-${modalColor} btn-outline btn-icon btn-sm" href="${esc(url)}" target="_blank" rel="noopener" title="فتح الملف" aria-label="فتح الملف"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>`
                    : '';
                filePreview.innerHTML = `
                    <div class="form-file-item">
                        <div class="form-file-icon"><i class="fa-solid fa-file-lines"></i></div>
                        <div class="form-file-name">${esc(name)}</div>
                        ${sizeKb ? `<span class="form-file-size">${esc(sizeKb)}</span>` : ''}
                        ${openLink}
                    </div>
                `;
            };

            if (existing?.file_url && existing?.file_name) {
                renderFilePreview({
                    name: existing.file_name,
                    sizeBytes: existing.file_size_bytes,
                    url: existing.file_url
                });
            }

            fileInput.addEventListener('change', () => {
                const f = fileInput.files[0];
                if (f) renderFilePreview({ name: f.name, sizeBytes: f.size });
                else if (existing?.file_url) renderFilePreview({
                    name: existing.file_name, sizeBytes: existing.file_size_bytes, url: existing.file_url
                });
                else renderFilePreview();
            });

            ['dragenter', 'dragover'].forEach(evName => {
                dropzone.addEventListener(evName, (ev) => {
                    ev.preventDefault();
                    dropzone.classList.add('drag-over');
                });
            });
            ['dragleave', 'drop'].forEach(evName => {
                dropzone.addEventListener(evName, () => dropzone.classList.remove('drag-over'));
            });

            modal.querySelector('#candSubmitBtn').addEventListener('click', async (ev) => {
                ev.preventDefault();
                const statement = ta.value.trim();
                if (!statement) {
                    toast('بيان الترشح مطلوب', 'warning');
                    return;
                }

                const fileInput = modal.querySelector('#candFile');
                const file = fileInput.files[0];

                // عند التعديل: لا تقبل الإرسال إن لم يتغيّر شيء فعلاً
                if (existing) {
                    const statementChanged = statement !== (existing.statement_ar || '').trim();
                    const fileChanged = !!file;
                    if (!statementChanged && !fileChanged) {
                        toast('لم تُجرِ أي تعديل. غيّر البيان أو ارفع ملفاً جديداً قبل الإرسال.', 'warning');
                        return;
                    }
                }

                let fileMeta = { file_url: existing?.file_url || null, file_name: existing?.file_name || null, file_size_bytes: existing?.file_size_bytes || null, file_mime: existing?.file_mime || null };
                if (file) {
                    if (file.size > MAX_FILE_SIZE) { toast('حجم الملف يتجاوز 5MB', 'warning'); return; }
                    if (!ALLOWED_MIMES.includes(file.type)) { toast('صيغة الملف غير مدعومة', 'warning'); return; }
                    try {
                        const uploaded = await this._uploadCandidateFile(file, electionId);
                        fileMeta = uploaded;
                    } catch (err) {
                        toast('فشل رفع الملف: ' + (err.message || err), 'error');
                        return;
                    }
                }

                try {
                    modal.querySelector('#candSubmitBtn').disabled = true;
                    if (existing) {
                        const { error } = await sb.rpc('resubmit_candidacy', {
                            p_candidate:        existing.id,
                            p_statement_ar:     statement,
                            p_file_url:         fileMeta.file_url,
                            p_file_name:        fileMeta.file_name,
                            p_file_size_bytes:  fileMeta.file_size_bytes,
                            p_file_mime:        fileMeta.file_mime
                        });
                        if (error) throw error;
                        toast('تم تحديث الترشح وإعادته للمراجعة', 'success');
                    } else {
                        const { error } = await sb.rpc('submit_candidacy', {
                            p_election: electionId,
                            p_statement_ar: statement,
                            p_file_url: fileMeta.file_url,
                            p_file_name: fileMeta.file_name,
                            p_file_size_bytes: fileMeta.file_size_bytes,
                            p_file_mime: fileMeta.file_mime
                        });
                        if (error) throw error;
                        toast('تم تقديم الترشح', 'success');
                    }
                    close();
                    window.rebuildNavigation?.();
                    if (this.mode === 'member-run')     await this.renderMemberRun();
                    if (this.mode === 'member-profile') await this.renderMemberProfile();
                } catch (err) {
                    console.error(err);
                    toast(err.message || String(err), 'error');
                    modal.querySelector('#candSubmitBtn').disabled = false;
                }
            });
        }

        async _uploadCandidateFile(file, electionId) {
            const ext = file.name.split('.').pop();
            const safeName = `${Date.now()}.${ext}`;
            const path = `${this.user.id}/${electionId}/${safeName}`;
            const { error: upErr } = await sb.storage.from(STORAGE_BUCKET).upload(path, file, {
                upsert: false, contentType: file.type
            });
            if (upErr) throw upErr;
            const { data: signed } = await sb.storage.from(STORAGE_BUCKET).createSignedUrl(path, 60 * 60 * 24 * 30);
            return {
                file_url: signed?.signedUrl || path,
                file_name: file.name,
                file_size_bytes: file.size,
                file_mime: file.type
            };
        }

        /* ============================================================
           Mode: member-profile — ترشحاتي
           ============================================================ */
        async renderMemberProfile() {
            const container = document.getElementById('electionsMyProfileContainer');
            if (!container) return;
            container.innerHTML = `
                <div class="elections-impersonation-slot"></div>
                <div id="myProfileTabs"></div>
                <div id="myPositionInfo"></div>
                <div id="myReviewNoteCard"></div>
                <div id="myRequestPath"></div>
                <div id="myStatementCard"></div>
                <div id="myFileCard"></div>
                <div id="myCandidaciesList">${loadingState()}</div>
            `;
            this._renderImpersonationNoticeIfNeeded();

            const { data, error } = await sb.rpc('get_user_candidacies', { p_user: this.user.id });
            const host = container.querySelector('#myCandidaciesList');
            const tabsHost = container.querySelector('#myProfileTabs');
            const infoHost = container.querySelector('#myPositionInfo');
            const pathHost = container.querySelector('#myRequestPath');
            const stmtHost = container.querySelector('#myStatementCard');
            const fileHost = container.querySelector('#myFileCard');
            const noteHost = container.querySelector('#myReviewNoteCard');
            if (error) { host.innerHTML = errorState(error.message); return; }

            const all = data || [];
            const current = all.filter(c => !c.election_archived_at);
            const past    = all.filter(c =>  c.election_archived_at);

            tabsHost.innerHTML = `
                <div class="settings-segmented-nav" role="tablist" style="margin-bottom:1rem;">
                    <button class="settings-seg-btn active" data-profile-tab="current">
                        <span class="settings-seg-btn__icon"><i class="fa-solid fa-bolt"></i></span>
                        <span class="settings-seg-btn__label">
                            ملفي الانتخابي الحالي
                            <span class="settings-seg-btn__count">${current.length}</span>
                        </span>
                    </button>
                    <button class="settings-seg-btn" data-profile-tab="past">
                        <span class="settings-seg-btn__icon"><i class="fa-solid fa-box-archive"></i></span>
                        <span class="settings-seg-btn__label">
                            ملفاتي السابقة
                            <span class="settings-seg-btn__count">${past.length}</span>
                        </span>
                    </button>
                </div>
            `;

            const renderList = (rows, emptyLabel) => {
                if (rows.length === 0) {
                    host.innerHTML = emptyState('inbox', emptyLabel);
                    return;
                }
                host.innerHTML = `<div class="uc-grid uc-grid--wide">${rows.map(c => this._renderMyCandidacyCard(c)).join('')}</div>`;
                this._bindMyCandidacyActions(host);
            };

            const switchTab = (key) => {
                tabsHost.querySelectorAll('[data-profile-tab]').forEach(b => {
                    b.classList.toggle('active', b.dataset.profileTab === key);
                });
                const rows = (key === 'past') ? past : current;
                this._renderPositionInfoCard(infoHost, rows[0] || null);
                this._renderReviewNoteCard(noteHost, rows[0] || null);
                this._renderStatementCard(stmtHost, rows[0] || null);
                this._renderFileCard(fileHost, rows[0] || null);
                this._renderRequestPathCard(pathHost, rows[0] || null);
                if (key === 'past') {
                    renderList(rows, 'لا توجد ترشحات سابقة');
                } else {
                    // التبويب الحالي يعتمد على الكاردات المخصصة (تفاصيل/بيان/مسار)
                    host.innerHTML = rows.length === 0
                        ? emptyState('inbox', 'لا توجد ترشحات حالية')
                        : '';
                }
            };

            tabsHost.querySelectorAll('[data-profile-tab]').forEach(btn => {
                btn.addEventListener('click', () => switchTab(btn.dataset.profileTab));
            });

            switchTab('current');
        }

        _renderMyCandidacyCard(c) {
            const target = targetLabelOf({ target_role_name: c.target_role_name }, c.target_committee_ar, c.target_department_ar);
            const note = c.review_note_ar
                ? `<div class="modal-info-box box-warning" style="margin:0.5rem 0;"><i class="fa-solid fa-note-sticky"></i> <div>${esc(c.review_note_ar)}</div></div>`
                : '';
            const btns = [];
            if (c.can_edit)     btns.push(`<button class="btn btn-warning" data-action="edit"><i class="fa-solid fa-pen"></i> تعديل</button>`);
            if (c.can_withdraw) btns.push(`<button class="btn btn-danger btn-outline" data-action="withdraw"><i class="fa-solid fa-person-walking-arrow-right"></i> انسحاب</button>`);

            const color = STATUS_CARD[c.election_status] || 'neutral';
            const icon  = STATUS_ICON[c.election_status] || 'circle';

            return `
                <div class="uc-card uc-card--${color}" data-candidate-id="${c.candidate_id}" data-election-id="${c.election_id}">
                    <div class="uc-card__header uc-card__header--${color}">
                        <div class="uc-card__header-inner">
                            <div class="uc-card__icon"><i class="fa-solid fa-${icon}"></i></div>
                            <div class="uc-card__header-info">
                                <h4 class="uc-card__title uc-card__title--wrap">المرشح #${c.candidate_number} · ${esc(STATUS_LABELS[c.election_status] || '')}</h4>
                                <div style="display:flex;flex-wrap:wrap;gap:0.4rem;align-items:center;">
                                    ${candidateBadge(c.candidate_status)}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="uc-card__body">
                        ${infoItem('user-tie', 'المنصب', target)}
                        <div style="font-size:0.88rem;color:#334155;white-space:pre-wrap;line-height:1.6;padding:0.5rem 0.25rem;">${esc(c.statement_ar)}</div>
                        ${c.file_url ? `<div style="padding:0 0.25rem;"><a href="${esc(c.file_url)}" target="_blank" style="display:inline-flex;align-items:center;gap:0.4rem;padding:0.35rem 0.7rem;background:#eff6ff;color:#1e40af;border:1px solid #bfdbfe;border-radius:8px;font-size:0.82rem;text-decoration:none;font-weight:500;"><i class="fa-solid fa-paperclip"></i> ${esc(c.file_name || 'الملف')}</a></div>` : ''}
                        ${note}
                        ${infoItem('clock', 'قُدم', fmtDate(c.submitted_at))}
                    </div>
                    ${btns.length ? `<div class="uc-card__footer">${btns.join('')}</div>` : ''}
                </div>
            `;
        }

        _bindMyCandidacyActions(host) {
            host.querySelectorAll('[data-action]').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const card = btn.closest('[data-candidate-id]');
                    const candidateId = card.dataset.candidateId;
                    const electionId  = card.dataset.electionId;
                    const action = btn.dataset.action;
                    if (action === 'edit') {
                        try { await this.openCandidacyForm(electionId, candidateId); }
                        catch (err) { console.error(err); toast(err.message || String(err), 'error'); }
                    } else if (action === 'withdraw') {
                        await this._handleWithdraw(candidateId);
                    }
                });
            });
        }

        /* ============================================================
           Mode: member-vote — اقتراع
           ============================================================ */
        async renderMemberVote() {
            const container = document.getElementById('electionsVoteContainer');
            if (!container) return;
            container.innerHTML = `
                <div class="elections-impersonation-slot"></div>
                <h2 style="margin-bottom:1rem;"><i class="fa-solid fa-check-to-slot"></i> التصويت في الانتخابات</h2>
                <div id="voteElectionsList">${loadingState()}</div>
            `;
            this._renderImpersonationNoticeIfNeeded();

            const { data, error } = await sb.rpc('get_votable_elections_for_user', { p_user: this.user.id });
            const host = container.querySelector('#voteElectionsList');
            if (error) { host.innerHTML = errorState(error.message); return; }

            if ((data || []).length === 0) {
                host.innerHTML = emptyState('inbox', 'لا يوجد انتخابات للتصويت');
                return;
            }

            host.innerHTML = `<div class="uc-grid">${data.map(e => {
                const target = targetLabelOf({ target_role_name: e.target_role_name }, e.target_committee_ar, e.target_department_ar);
                const btn = e.has_voted
                    ? `<button class="btn btn-slate btn-outline" disabled><i class="fa-solid fa-check"></i> صوّتت مسبقاً</button>`
                    : `<button class="btn btn-success" data-action="open-ballot"><i class="fa-solid fa-check-to-slot"></i> فتح الاقتراع</button>`;

                const items = [];
                if (e.voting_end) items.push(infoItem('clock', 'ينتهي التصويت', fmtDate(e.voting_end)));

                return ucElectionCard({
                    id: e.election_id,
                    status: 'voting_open',
                    target,
                    infoItems: items,
                    footer: btn
                });
            }).join('')}</div>`;

            host.querySelectorAll('[data-action="open-ballot"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.closest('[data-election-id]').dataset.electionId;
                    this.openBallot(id);
                });
            });
        }

        async openBallot(electionId) {
            if (this.user._isImpersonating) {
                toast('لا يمكن التصويت أثناء وضع العرض كمستخدم', 'warning');
                return;
            }

            const { data, error } = await sb.rpc('get_anonymized_candidates', { p_election: electionId });
            if (error) { toast(error.message, 'error'); return; }
            const candidates = data || [];
            if (candidates.length === 0) {
                toast('لا يوجد مرشحون في هذا الانتخاب', 'warning');
                return;
            }

            const { modal, close } = this._openModal({
                title: 'اقتراع مجهَّل',
                icon: 'fa-check-to-slot',
                size: 'lg',
                body: `
                    <div class="modal-info-box box-info">
                        <i class="fa-solid fa-user-secret"></i>
                        <div>أسماء المرشحين مخفية عمداً. اختر بناءً على البيان والملف المرفق. صوتك سرّي ونهائي.</div>
                    </div>
                    <div id="ballotOptions" style="display:flex;flex-direction:column;gap:0.75rem;margin-top:1rem;"></div>
                `,
                footer: `
                    <button class="btn btn-success" id="ballotSubmitBtn" disabled>
                        <i class="fa-solid fa-paper-plane"></i> إرسال الصوت
                    </button>
                    <button class="btn btn-slate btn-outline" data-dismiss="modal">إلغاء</button>
                `
            });

            const host = modal.querySelector('#ballotOptions');
            host.innerHTML = candidates.map(c => `
                <label data-candidate-id="${c.candidate_id}" data-candidate-number="${c.candidate_number}" style="display:flex;gap:0.75rem;align-items:flex-start;padding:0.85rem 1rem;background:#fff;border:2px solid #e2e8f0;border-radius:14px;cursor:pointer;transition:all 0.2s;position:relative;">
                    <input type="radio" name="ballotPick" value="${c.candidate_id}" style="margin-top:0.25rem;flex-shrink:0;width:18px;height:18px;accent-color:#10b981;cursor:pointer;">
                    <div style="flex:1;min-width:0;">
                        <div style="display:inline-flex;align-items:center;gap:0.4rem;padding:0.18rem 0.65rem;background:#f1f5f9;color:#475569;border-radius:99px;font-size:0.7rem;font-weight:700;margin-bottom:0.5rem;">
                            <i class="fa-solid fa-hashtag"></i> مرشح ${c.candidate_number}
                        </div>
                        <div style="font-size:0.9rem;color:#334155;white-space:pre-wrap;line-height:1.65;">${esc(c.statement_ar)}</div>
                        ${c.file_url ? `<div style="margin-top:0.6rem;">
                            <a href="${esc(c.file_url)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:0.4rem;padding:0.35rem 0.7rem;background:#eff6ff;color:#1e40af;border:1px solid #bfdbfe;border-radius:8px;font-size:0.82rem;text-decoration:none;font-weight:500;">
                                <i class="fa-solid fa-paperclip"></i> ${esc(c.file_name || 'ملف المرشح')}
                            </a>
                        </div>` : ''}
                    </div>
                </label>
            `).join('');

            const submitBtn = modal.querySelector('#ballotSubmitBtn');
            let selectedId = null;
            host.querySelectorAll('label[data-candidate-id]').forEach(lbl => {
                lbl.addEventListener('click', () => {
                    host.querySelectorAll('label[data-candidate-id]').forEach(l => {
                        l.style.borderColor = '#e2e8f0';
                        l.style.background = '#fff';
                        l.style.boxShadow = '';
                    });
                    lbl.style.borderColor = '#10b981';
                    lbl.style.background = '#ecfdf5';
                    lbl.style.boxShadow = '0 4px 14px rgba(16,185,129,0.18)';
                    selectedId = lbl.dataset.candidateId;
                    lbl.querySelector('input[type="radio"]').checked = true;
                    submitBtn.disabled = false;
                });
            });

            submitBtn.addEventListener('click', async () => {
                if (!selectedId) return;
                if (!await confirmDialog('تأكيد إرسال الصوت؟ لا يمكن التراجع بعد ذلك.')) return;
                try {
                    submitBtn.disabled = true;
                    const { error: err } = await sb.rpc('cast_vote', {
                        p_election: electionId, p_candidate: selectedId
                    });
                    if (err) throw err;
                    toast('تم إرسال صوتك بنجاح', 'success');
                    close();
                    await this.renderMemberVote();
                    window.rebuildNavigation?.();
                } catch (err) {
                    console.error(err);
                    toast(err.message || String(err), 'error');
                    submitBtn.disabled = false;
                }
            });
        }

        /* ============================================================
           Modal helper — يعتمد فقط على modals.css الموجود في admin/css/
           ============================================================ */
        _openModal({ title, icon = 'fa-circle-info', size = 'md', color = '', body = '', footer = '' }) {
            const wrap = document.createElement('div');
            wrap.className = 'elections-modal-host';
            const colorCls = color ? ` modal-${color}` : '';
            wrap.innerHTML = `
                <div class="modal-backdrop"></div>
                <div class="modal modal-${size}${colorCls}" role="dialog" aria-modal="true">
                    <div class="modal-header">
                        <div class="modal-header-content">
                            <div class="modal-icon"><i class="fa-solid ${icon}"></i></div>
                            <div><h3 class="modal-title">${esc(title)}</h3></div>
                        </div>
                        <button class="modal-close" type="button" aria-label="إغلاق"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div class="modal-body">${body}</div>
                    ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
                </div>
            `;
            document.body.appendChild(wrap);
            document.body.style.overflow = 'hidden';

            const backdrop = wrap.querySelector('.modal-backdrop');
            const modalEl  = wrap.querySelector('.modal');

            // تأخير إضافة .active إطاراً لتفعيل انتقالات CSS (fade + scale)
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    backdrop.classList.add('active');
                    modalEl.classList.add('active');
                });
            });

            let closing = false;
            const close = () => {
                if (closing) return;
                closing = true;
                backdrop.classList.remove('active');
                modalEl.classList.remove('active');
                const cleanup = () => {
                    document.body.style.overflow = '';
                    wrap.remove();
                };
                const onEnd = (ev) => {
                    if (ev.target !== modalEl) return;
                    modalEl.removeEventListener('transitionend', onEnd);
                    cleanup();
                };
                modalEl.addEventListener('transitionend', onEnd);
                // شبكة أمان في حال لم تُطلق الحدث (مثلاً عند reduced-motion)
                setTimeout(() => {
                    if (wrap.isConnected) cleanup();
                }, 500);
            };

            wrap.querySelector('.modal-close').addEventListener('click', close);
            backdrop.addEventListener('click', close);
            wrap.querySelectorAll('[data-dismiss="modal"]').forEach(b => b.addEventListener('click', close));

            return { modal: modalEl, close };
        }
    }

    window.ElectionsManager = ElectionsManager;
    if (!window.electionsManagerInstance) {
        window.electionsManagerInstance = new ElectionsManager();
    }
})();
