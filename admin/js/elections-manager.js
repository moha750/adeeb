/**
 * مدير نظام الانتخابات - نادي أدِيب
 */

class ElectionsManager {
    constructor() {
        this.supabase = window.sbClient;
        this.elections = [];
        this.currentElection = null;
        this.currentUser = null;
        this.currentUserRole = null;
        this.voteWeights = [];
        this.roles = [];
        this.committees = [];
        this.departments = [];
        this.initialized = false;
        this.openSectionListenersSet = false;
    }

    // المناصب المؤهلة للانتخاب فقط
    static ELIGIBLE_ROLES = ['department_head', 'committee_leader', 'deputy_committee_leader'];

    // الأدوار المرتبطة بالأقسام (department_id) وليس اللجان
    static DEPARTMENT_BASED_ROLES = ['department_head'];

    static STATUS_LABELS = {
        'candidacy_open': 'باب الترشح مفتوح',
        'candidacy_closed': 'الترشح مغلق',
        'voting_open': 'التصويت مفتوح',
        'voting_closed': 'التصويت مغلق',
        'completed': 'مكتمل',
        'cancelled': 'ملغي'
    };

    static STATUS_COLORS = {
        'candidacy_open': '#f59e0b',
        'candidacy_closed': '#d97706',
        'voting_open': '#10b981',
        'voting_closed': '#8b5cf6',
        'completed': '#059669',
        'cancelled': '#ef4444'
    };

    static CANDIDATE_STATUS_LABELS = {
        'pending': 'قيد المراجعة',
        'approved': 'مقبول',
        'rejected': 'مرفوض',
        'withdrawn': 'منسحب',
        'needs_edit': 'بانتظار التعديل'
    };

    static CANDIDATE_STATUS_VARIANT = {
        'pending':   { color: '#f59e0b', uc: 'uc-card--warning', icon: 'fa-clock',              btnClass: 'btn-warning' },
        'approved':  { color: '#10b981', uc: 'uc-card--success', icon: 'fa-circle-check',       btnClass: 'btn-success' },
        'rejected':  { color: '#ef4444', uc: 'uc-card--danger',  icon: 'fa-circle-xmark',       btnClass: 'btn-danger' },
        'withdrawn': { color: '#64748b', uc: 'uc-card--neutral', icon: 'fa-arrow-rotate-left',  btnClass: 'btn-slate' },
        'needs_edit':{ color: '#3b82f6', uc: 'uc-card--info',    icon: 'fa-pen-to-square',      btnClass: 'btn-primary' }
    };

    static CANDIDACY_FILE_MAX_BYTES = 5 * 1024 * 1024;
    static CANDIDACY_FILE_MAX_LABEL = '5 ميغابايت';

    // =============================================
    // التهيئة
    // =============================================

    async init() {
        if (this.initialized) {
            await this.loadElections();
            this.renderElectionsList();
            return;
        }
        try {
            this.currentUser = window.currentUser || (await this.supabase.auth.getUser()).data?.user;
            await this.loadCurrentUserRole();
            await Promise.all([
                this.loadVoteWeights(),
                this.loadRoles(),
                this.loadCommittees(),
                this.loadDepartments()
            ]);
            await this.loadElections();
            this.renderElectionsList();
            this.setupEventListeners();
            this.initialized = true;
        } catch (error) {
            console.error('Error initializing elections manager:', error);
            this.showError('حدث خطأ أثناء تهيئة صفحة الانتخابات');
        }
    }

    async loadCurrentUserRole() {
        try {
            const { data } = await this.supabase
                .from('user_roles')
                .select('*, role:roles(*)')
                .eq('user_id', this.currentUser.id)
                .eq('is_active', true);
            const sorted = (data || []).sort((a, b) =>
                (b.role?.role_level || 0) - (a.role?.role_level || 0)
            );
            this.currentUserRole = sorted[0] || null;
        } catch (e) {
            console.error('Error loading current user role:', e);
        }
    }

    async loadVoteWeights() {
        const { data } = await this.supabase
            .from('election_vote_weights')
            .select('*');
        this.voteWeights = data || [];
    }

    async loadRoles() {
        const { data } = await this.supabase
            .from('roles')
            .select('*')
            .order('role_level', { ascending: false });
        this.roles = data || [];
    }

    async loadCommittees() {
        const { data } = await this.supabase
            .from('committees')
            .select('*')
            .eq('is_active', true)
            .order('committee_name_ar');
        this.committees = data || [];
    }

    async loadDepartments() {
        const { data } = await this.supabase
            .from('departments')
            .select('*')
            .eq('is_active', true)
            .order('display_order', { ascending: true });
        this.departments = data || [];
    }

    async loadElections() {
        try {
            const { data, error } = await this.supabase
                .from('elections')
                .select(`
                    *,
                    target_role:target_role_id(id, role_name, role_name_ar, role_level),
                    target_committee:target_committee_id(id, committee_name_ar),
                    target_department:target_department_id(id, name_ar),
                    creator:created_by(id, full_name, avatar_url),
                    winner:winner_user_id(id, full_name, avatar_url),
                    candidates_count:election_candidates(count)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            this.elections = data || [];
        } catch (error) {
            console.error('Error loading elections:', error);
            this.showError('حدث خطأ أثناء تحميل الانتخابات');
        }
    }

    // =============================================
    // Event Listeners
    // =============================================

    setupEventListeners() {
        const container = document.getElementById('elections-section');
        if (!container) return;

        // زر إنشاء انتخاب
        container.querySelector('#createElectionBtn')?.addEventListener('click', () => this.showCreateModal());

        // زر تحديث
        container.querySelector('#refreshElectionsBtn')?.addEventListener('click', async () => {
            await this.loadElections();
            this.renderElectionsList();
        });

        // فلتر البحث
        container.querySelector('#electionsSearchInput')?.addEventListener('input', () => this.filterElections());
        container.querySelector('#electionsStatusFilter')?.addEventListener('change', () => this.filterElections());
    }

    // =============================================
    // عرض قائمة الانتخابات
    // =============================================

    showListView() {
        const container = document.getElementById('elections-section');
        container.querySelector('#elections-list-view').classList.remove('d-none');
        container.querySelector('#elections-detail-view').classList.add('d-none');
        this.currentElection = null;
    }

    renderElectionsList() {
        this.renderStats();
        this.renderElectionsGrid(this.elections);
    }

    renderStats() {
        const stats = {
            active: 0, candidacy: 0, voting: 0, completed: 0
        };
        this.elections.forEach(e => {
            if (['candidacy_open', 'candidacy_closed', 'voting_open', 'voting_closed'].includes(e.status)) stats.active++;
            if (['candidacy_open', 'candidacy_closed'].includes(e.status)) stats.candidacy++;
            if (['voting_open', 'voting_closed'].includes(e.status)) stats.voting++;
            if (e.status === 'completed') stats.completed++;
        });

        const set = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };
        set('electionsActiveCount', stats.active);
        set('electionsCandidacyCount', stats.candidacy);
        set('electionsVotingCount', stats.voting);
        set('electionsCompletedCount', stats.completed);
    }

    renderElectionsGrid(elections) {
        const grid = document.getElementById('electionsGrid');
        if (!grid) return;

        if (!elections.length) {
            grid.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                    <i class="fa-solid fa-check-to-slot fa-3x" style="margin-bottom: 1rem; opacity: 0.3;"></i>
                    <p>لا توجد انتخابات حالياً</p>
                </div>`;
            return;
        }

        grid.innerHTML = elections.map(election => this.renderElectionCard(election)).join('');

        // ربط أحداث النقر
        grid.querySelectorAll('.uc-card[data-election-id]').forEach(card => {
            card.style.cursor = 'pointer';
            card.addEventListener('click', () => {
                this.showElectionDetail(card.dataset.electionId);
            });
        });
    }

    renderElectionCard(election) {
        const statusLabel = ElectionsManager.STATUS_LABELS[election.status];
        const statusColor = ElectionsManager.STATUS_COLORS[election.status];
        const roleName    = election.target_role?.role_name_ar || '';
        const unitLabel   = election.target_department_id ? 'القسم' : 'اللجنة';
        const unitName    = election.target_committee?.committee_name_ar
                         || election.target_department?.name_ar || '';
        const createdDate = new Date(election.created_at).toLocaleDateString('ar-SA');

        return `
            <div class="uc-card" data-election-id="${election.id}">
                <div class="uc-card__header">
                    <div class="uc-card__icon" style="background: ${statusColor}20; color: ${statusColor};">
                        <i class="fa-solid fa-check-to-slot"></i>
                    </div>
                    <div>
                        <h3 class="uc-card__title">${this.getElectionName(election)}</h3>
                        <span style="display: inline-block; padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.75rem; background: ${statusColor}15; color: ${statusColor}; font-weight: 600;">
                            ${statusLabel}
                        </span>
                    </div>
                </div>
                <div class="uc-card__body">
                    <div class="uc-card__info-item">
                        <span class="uc-card__info-label">المنصب</span>
                        <span class="uc-card__info-value">${roleName}</span>
                    </div>
                    ${unitName ? `
                    <div class="uc-card__info-item">
                        <span class="uc-card__info-label">${unitLabel}</span>
                        <span class="uc-card__info-value">${unitName}</span>
                    </div>` : ''}
                    <div class="uc-card__info-item">
                        <span class="uc-card__info-label">تاريخ الإنشاء</span>
                        <span class="uc-card__info-value">${createdDate}</span>
                    </div>
                </div>
                <div class="uc-card__footer">
                    <button class="btn  btn-outline">
                        <i class="fa-solid fa-eye"></i> عرض التفاصيل
                    </button>
                </div>
            </div>`;
    }

    filterElections() {
        const search = document.getElementById('electionsSearchInput')?.value?.toLowerCase() || '';
        const statusFilter = document.getElementById('electionsStatusFilter')?.value || '';

        const filtered = this.elections.filter(e => {
            const matchSearch = !search ||
                (e.target_role?.role_name_ar || '').toLowerCase().includes(search) ||
                (e.target_committee?.committee_name_ar || '').toLowerCase().includes(search);
            const matchStatus = !statusFilter || e.status === statusFilter;
            return matchSearch && matchStatus;
        });

        this.renderElectionsGrid(filtered);
    }

    // =============================================
    // قسم فتح باب الترشح (elections-open-section)
    // =============================================

    async initOpenSection() {
        try {
            if (!this.initialized) {
                this.currentUser = window.currentUser || (await this.supabase.auth.getUser()).data?.user;
                await this.loadCurrentUserRole();
                await Promise.all([
                    this.loadVoteWeights(),
                    this.loadRoles(),
                    this.loadCommittees(),
                    this.loadDepartments()
                ]);
                this.initialized = true;
            }
            await this.loadElections();
            this.renderOpenSection();
            this.setupOpenSectionListeners();
        } catch (error) {
            console.error('Error initializing open section:', error);
            this.showError('حدث خطأ أثناء تحميل قسم فتح باب الترشح');
        }
    }

    setupOpenSectionListeners() {
        if (this.openSectionListenersSet) return;
        const section = document.getElementById('elections-open-section');
        if (!section) return;

        section.querySelector('#openSectionCreateBtn')?.addEventListener('click', () => {
            this.showCreateModal();
        });
        section.querySelector('#openSectionRefreshBtn')?.addEventListener('click', async () => {
            await this.loadElections();
            this.renderOpenSection();
        });

        this.openSectionListenersSet = true;
    }

    static OPEN_SECTION_STATUSES = ['candidacy_open', 'candidacy_closed', 'voting_open', 'voting_closed'];

    static OPEN_SECTION_VARIANTS = {
        'candidacy_open': {
            uc: 'uc-card--success',
            headerClass: 'uc-card__header--success',
            btnClass: 'btn-success',
            color: '#10b981',
            icon: 'fa-door-open',
            badgeIcon: 'fa-circle-dot',
            label: 'باب الترشح مفتوح',
            statLabel: 'باب الترشح مفتوح',
            parentCard: 'card--success',
            groupTitle: 'الانتخابات المفتوحة للترشح',
            groupIcon: 'fa-door-open'
        },
        'candidacy_closed': {
            uc: 'uc-card--warning',
            headerClass: 'uc-card__header--warning',
            btnClass: 'btn-warning',
            color: '#f59e0b',
            icon: 'fa-hourglass-half',
            badgeIcon: 'fa-hourglass-half',
            label: 'الترشح مغلق — بانتظار فتح التصويت',
            statLabel: 'بانتظار فتح التصويت',
            parentCard: 'card--warning',
            groupTitle: 'الانتخابات بانتظار فتح التصويت',
            groupIcon: 'fa-hourglass-half'
        },
        'voting_open': {
            uc: 'uc-card--primary',
            headerClass: 'uc-card__header--info',
            btnClass: 'btn-primary',
            color: '#3d8fd6',
            icon: 'fa-check-to-slot',
            badgeIcon: 'fa-circle-dot',
            label: 'باب التصويت مفتوح',
            statLabel: 'التصويت مفتوح',
            parentCard: 'card--info',
            groupTitle: 'الانتخابات المفتوحة للتصويت',
            groupIcon: 'fa-check-to-slot'
        },
        'voting_closed': {
            uc: 'uc-card--purple',
            headerClass: 'uc-card__header--purple',
            btnClass: 'btn-violet',
            color: '#8b5cf6',
            icon: 'fa-flag-checkered',
            badgeIcon: 'fa-trophy',
            label: 'منتهي — بانتظار إعلان النتائج',
            statLabel: 'بانتظار إعلان النتائج',
            parentCard: 'card--purple',
            groupTitle: 'الانتخابات المنتهية — بانتظار إعلان النتائج',
            groupIcon: 'fa-flag-checkered'
        }
    };

    renderOpenSection() {
        const grid = document.getElementById('openSectionGrid');
        const statsEl = document.getElementById('openSectionStats');
        if (!grid) return;

        const statuses = ElectionsManager.OPEN_SECTION_STATUSES;
        const variants = ElectionsManager.OPEN_SECTION_VARIANTS;
        const openElections = this.elections.filter(e => statuses.includes(e.status));

        // إحصائية سريعة لكل حالة
        if (statsEl) {
            const cards = statuses.map(st => {
                const v = variants[st];
                const count = this.elections.filter(e => e.status === st).length;
                return `
                    <div class="stat-card" style="--stat-color: ${v.color};">
                        <div class="stat-card-wrapper">
                            <div class="stat-icon"><i class="fa-solid ${v.icon}"></i></div>
                            <div class="stat-content">
                                <div class="stat-value">${count}</div>
                                <div class="stat-label">${v.statLabel}</div>
                            </div>
                        </div>
                    </div>`;
            }).join('');
            statsEl.innerHTML = `<div class="stats-grid" style="--stats-cols: 4;">${cards}</div>`;
        }

        if (!openElections.length) {
            grid.innerHTML = `
                <div class="card">
                    <div class="card-body">
                        <div class="empty-state">
                            <div class="empty-state__icon"><i class="fa-solid fa-inbox"></i></div>
                            <p class="empty-state__title">لا توجد انتخابات نشطة حالياً</p>
                            <p class="empty-state__message">أنشئ انتخاباً جديداً لفتح باب الترشح</p>
                        </div>
                    </div>
                </div>`;
            return;
        }

        // تجميع الانتخابات بحسب الحالة مع الحفاظ على ترتيب التسلسل الطبيعي
        const groupsHtml = statuses.map(status => {
            const group = openElections
                .filter(e => e.status === status)
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            if (!group.length) return '';

            const v = variants[status];
            const cards = group.map(e => this.renderOpenSectionCard(e)).join('');

            return `
                <div class="elections-group" style="margin-bottom: 1.5rem;">
                    <div class="card ${v.parentCard}">
                        <div class="card-header">
                            <h3><i class="fa-solid ${v.groupIcon}"></i> ${v.groupTitle} (${group.length})</h3>
                            <button class="btn ${v.btnClass} btn-icon btn-outline" title="تحديث" data-group-refresh="${status}">
                                <i class="fa-solid fa-rotate"></i>
                            </button>
                        </div>
                        <div class="card-body">
                            <div class="uc-grid">
                                ${cards}
                            </div>
                        </div>
                    </div>
                </div>`;
        }).filter(Boolean).join('');

        grid.innerHTML = groupsHtml;

        // ربط زر التحديث لكل مجموعة
        grid.querySelectorAll('[data-group-refresh]').forEach(btn => {
            btn.addEventListener('click', async (ev) => {
                ev.stopPropagation();
                await this.loadElections();
                this.renderOpenSection();
            });
        });

        // ربط أحداث الأزرار
        grid.querySelectorAll('.view-candidates-btn').forEach(btn => {
            btn.addEventListener('click', (ev) => {
                ev.stopPropagation();
                this.showElectionDetail(btn.dataset.electionId);
            });
        });

        grid.querySelectorAll('.set-end-date-btn').forEach(btn => {
            btn.addEventListener('click', (ev) => {
                ev.stopPropagation();
                this.showSetEndDateModal(btn.dataset.electionId);
            });
        });

        grid.querySelectorAll('.cancel-election-btn').forEach(btn => {
            btn.addEventListener('click', (ev) => {
                ev.stopPropagation();
                this.updateElectionStatus(btn.dataset.electionId, 'cancelled');
            });
        });

        grid.querySelectorAll('.advance-status-btn').forEach(btn => {
            btn.addEventListener('click', (ev) => {
                ev.stopPropagation();
                const next = btn.dataset.nextStatus;
                if (next) this.updateElectionStatus(btn.dataset.electionId, next);
            });
        });

        grid.querySelectorAll('.announce-winner-btn').forEach(btn => {
            btn.addEventListener('click', (ev) => {
                ev.stopPropagation();
                this.showElectionDetail(btn.dataset.electionId);
            });
        });
    }

    renderOpenSectionCard(election) {
        const variant = ElectionsManager.OPEN_SECTION_VARIANTS[election.status]
            || ElectionsManager.OPEN_SECTION_VARIANTS['candidacy_open'];
        const candidatesCount = Array.isArray(election.candidates_count)
            ? (election.candidates_count[0]?.count ?? 0)
            : 0;

        const fmt = (iso) => new Date(iso).toLocaleString('ar-SA', {
            calendar: 'gregory',
            numberingSystem: 'latn',
            dateStyle: 'medium',
            timeStyle: 'short'
        }).replace(/،\s*/, ' الساعة ');
        const end     = election.candidacy_end   ? fmt(election.candidacy_end)   : null;
        const vStart  = election.voting_start    ? fmt(election.voting_start)    : null;
        const vEnd    = election.voting_end      ? fmt(election.voting_end)      : null;
        const created = election.created_at      ? fmt(election.created_at)      : null;

        // الوقت المتبقي حسب الحالة
        const calcRemaining = (isoEnd) => {
            if (!isoEnd) return null;
            const diff = new Date(isoEnd).getTime() - Date.now();
            if (diff <= 0) return 'انتهى الموعد';
            const days = Math.floor(diff / 86400000);
            const hours = Math.floor((diff % 86400000) / 3600000);
            return days > 0 ? `متبقي ${days} يوم` : `متبقي ${hours} ساعة`;
        };
        const candidacyRemaining = calcRemaining(election.candidacy_end);
        const votingRemaining    = calcRemaining(election.voting_end);

        const unset = '<span style="opacity: 0.55;">لم يُحدَّد</span>';

        // حقول التواريخ حسب الحالة
        let dateFields = '';
        if (election.status === 'candidacy_open' || election.status === 'candidacy_closed') {
            dateFields = `
                <div class="uc-card__info-item">
                    <div class="uc-card__info-icon"><i class="fa-solid fa-hourglass-end"></i></div>
                    <div class="uc-card__info-content">
                        <span class="uc-card__info-label">نهاية الترشح</span>
                        <span class="uc-card__info-value">
                            ${end || unset}${election.status === 'candidacy_open' && candidacyRemaining ? ` <small style="opacity: 0.7;">· ${candidacyRemaining}</small>` : ''}
                        </span>
                    </div>
                </div>`;
        } else if (election.status === 'voting_open' || election.status === 'voting_closed') {
            dateFields = `
                <div class="uc-card__info-item">
                    <div class="uc-card__info-icon"><i class="fa-solid fa-play"></i></div>
                    <div class="uc-card__info-content">
                        <span class="uc-card__info-label">بداية التصويت</span>
                        <span class="uc-card__info-value">${vStart || unset}</span>
                    </div>
                </div>

                <div class="uc-card__info-item">
                    <div class="uc-card__info-icon"><i class="fa-solid fa-stop"></i></div>
                    <div class="uc-card__info-content">
                        <span class="uc-card__info-label">نهاية التصويت</span>
                        <span class="uc-card__info-value">
                            ${vEnd || unset}${election.status === 'voting_open' && votingRemaining ? ` <small style="opacity: 0.7;">· ${votingRemaining}</small>` : ''}
                        </span>
                    </div>
                </div>`;
        }

        // أزرار الفوتر حسب الحالة
        let footerButtons = '';
        if (election.status === 'candidacy_open') {
            footerButtons = `
                <button class="btn ${variant.btnClass} view-candidates-btn" data-election-id="${election.id}">
                    <i class="fa-solid fa-users"></i> عرض المرشحين
                </button>
                ${!election.candidacy_end ? `
                <button class="btn btn-primary set-end-date-btn" data-election-id="${election.id}">
                    <i class="fa-regular fa-calendar-plus"></i> تحديد موعد الإغلاق
                </button>` : ''}
                <button class="btn btn-warning advance-status-btn" data-election-id="${election.id}" data-next-status="candidacy_closed">
                    <i class="fa-solid fa-lock"></i> إغلاق باب الترشح
                </button>
                <button class="btn btn-danger cancel-election-btn" data-election-id="${election.id}">
                    <i class="fa-solid fa-ban"></i> إلغاء الانتخاب
                </button>`;
        } else if (election.status === 'candidacy_closed') {
            footerButtons = `
                <button class="btn ${variant.btnClass} view-candidates-btn" data-election-id="${election.id}">
                    <i class="fa-solid fa-users"></i> عرض المرشحين
                </button>
                <button class="btn btn-primary advance-status-btn" data-election-id="${election.id}" data-next-status="voting_open">
                    <i class="fa-solid fa-check-to-slot"></i> فتح باب التصويت
                </button>
                <button class="btn btn-success advance-status-btn" data-election-id="${election.id}" data-next-status="candidacy_open">
                    <i class="fa-solid fa-door-open"></i> إعادة فتح باب الترشح
                </button>
                <button class="btn btn-danger cancel-election-btn" data-election-id="${election.id}">
                    <i class="fa-solid fa-ban"></i> إلغاء الانتخاب
                </button>`;
        } else if (election.status === 'voting_open') {
            footerButtons = `
                <button class="btn ${variant.btnClass} view-candidates-btn" data-election-id="${election.id}">
                    <i class="fa-solid fa-chart-column"></i> متابعة التصويت
                </button>
                <button class="btn btn-violet btn-outline advance-status-btn" data-election-id="${election.id}" data-next-status="voting_closed">
                    <i class="fa-solid fa-flag-checkered"></i> إغلاق التصويت
                </button>
                <button class="btn btn-danger btn-outline cancel-election-btn" data-election-id="${election.id}">
                    <i class="fa-solid fa-ban"></i> إلغاء الانتخاب
                </button>`;
        } else if (election.status === 'voting_closed') {
            footerButtons = `
                <button class="btn ${variant.btnClass} announce-winner-btn" data-election-id="${election.id}">
                    <i class="fa-solid fa-trophy"></i> إعلان النتائج
                </button>
                <button class="btn btn-violet btn-outline view-candidates-btn" data-election-id="${election.id}">
                    <i class="fa-solid fa-chart-pie"></i> عرض التفاصيل
                </button>`;
        }

        return `
            <div class="uc-card ${variant.uc}" data-election-id="${election.id}" data-election-status="${election.status}">
                <div class="uc-card__header ${variant.headerClass}">
                    <div class="uc-card__header-inner">
                        <div class="uc-card__icon">
                            <i class="fa-solid ${variant.icon}"></i>
                        </div>
                        <div class="uc-card__header-info">
                            <h3 class="uc-card__title uc-card__title--wrap">${this.getElectionName(election)}</h3>
                            <span class="uc-card__badge">
                                <i class="fa-solid ${variant.badgeIcon}"></i>
                                ${variant.label}
                            </span>
                        </div>
                    </div>
                </div>

                <div class="uc-card__body">
                    <div class="uc-card__info-item">
                        <div class="uc-card__info-icon"><i class="fa-solid fa-users"></i></div>
                        <div class="uc-card__info-content">
                            <span class="uc-card__info-label">عدد المرشحين</span>
                            <span class="uc-card__info-value">${candidatesCount}</span>
                        </div>
                    </div>

                    <div class="uc-card__info-item">
                        <div class="uc-card__info-icon"><i class="fa-regular fa-calendar-plus"></i></div>
                        <div class="uc-card__info-content">
                            <span class="uc-card__info-label">تاريخ إنشاء الانتخاب</span>
                            <span class="uc-card__info-value">${created || unset}</span>
                        </div>
                    </div>

                    ${dateFields}
                </div>

                <div class="uc-card__footer">
                    ${footerButtons}
                </div>
            </div>`;
    }

    // =============================================
    // قسم "الترشح" — للأعضاء المستهدفين (candidacy-section)
    // =============================================

    async initCandidacySection() {
        try {
            if (!this.initialized) {
                this.currentUser = window.currentUser || (await this.supabase.auth.getUser()).data?.user;
                await this.loadCurrentUserRole();
                await Promise.all([
                    this.loadRoles(),
                    this.loadCommittees(),
                    this.loadDepartments()
                ]);
                this.initialized = true;
            }
            await this.loadEligibleElections();
            await this.loadMyCandidacies();
            this.setupCandidacySectionListeners();

            const active = this.getActiveCandidacy();
            if (active) {
                const election = await this.getCandidacyElection(active.election_id);
                if (election) {
                    this.showMyCandidacyFile(election, active);
                    return;
                }
            }
            this.backToCandidacyList();
            this.renderCandidacySection();
        } catch (error) {
            console.error('Error initializing candidacy section:', error);
            this.showError('حدث خطأ أثناء تحميل قسم الترشح');
        }
    }

    async loadEligibleElections() {
        const cId = this.currentUserRole?.committee_id || null;
        const dId = this.currentUserRole?.department_id || null;
        if (!cId && !dId) { this.eligibleElections = []; return; }

        const orFilters = [];
        if (cId) orFilters.push(`target_committee_id.eq.${cId}`);
        if (dId) orFilters.push(`target_department_id.eq.${dId}`);

        const { data, error } = await this.supabase
            .from('elections')
            .select(`
                *,
                target_role:target_role_id(id, role_name, role_name_ar, role_level),
                target_committee:target_committee_id(id, committee_name_ar, department_id),
                target_department:target_department_id(id, name_ar)
            `)
            .eq('status', 'candidacy_open')
            .or(orFilters.join(','))
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error loading eligible elections:', error);
            this.eligibleElections = [];
            return;
        }
        this.eligibleElections = (data || []).filter(e => this.isEligibleForElection(e));
    }

    isEligibleForElection(election) {
        return !this.getIneligibilityReason(election);
    }

    getIneligibilityReason(election) {
        const userRoleName      = this.currentUserRole?.role?.role_name;
        const userCommitteeId   = this.currentUserRole?.committee_id;
        const userDepartmentId  = this.currentUserRole?.department_id;
        const targetRoleName    = election?.target_role?.role_name;
        const targetCommitteeId = election?.target_committee_id;
        const targetDepartmentId = election?.target_department_id;
        const targetCommitteeDepartmentId = election?.target_committee?.department_id;

        // (1) عضوية الوحدة المستهدفة
        if (targetCommitteeId && userCommitteeId !== targetCommitteeId) {
            return 'لا يحق لك الترشح لهذه اللجنة لأنك لست عضواً فيها';
        }
        if (targetDepartmentId && !targetCommitteeId && userDepartmentId !== targetDepartmentId) {
            return 'لا يحق لك الترشح لهذا القسم لأنك لست عضواً فيه';
        }

        // (2) أصحاب المناصب العليا ممنوعون
        const BLOCKED_ROLES = [
            'club_president',
            'president_advisor',
            'executive_council_president',
            'hr_committee_leader',
            'qa_committee_leader',
            'hr_admin_member',
            'qa_admin_member'
        ];
        if (BLOCKED_ROLES.includes(userRoleName)) {
            return 'لا يحق لك الترشح لأنك تشغل منصباً قيادياً يمنع الترشح — يجب التنازل عنه أولاً';
        }

        // (3) قائد اللجنة → نائب نفس اللجنة
        if (userRoleName === 'committee_leader'
            && targetRoleName === 'deputy_committee_leader'
            && userCommitteeId
            && userCommitteeId === targetCommitteeId) {
            return 'لا يحق لك الترشح لمنصب نائب القائد لأنك تشغل منصب القائد في نفس اللجنة';
        }

        // (4) رئيس القسم → منصب في لجنة تتبع قسمه
        if (userRoleName === 'department_head'
            && ['committee_leader', 'deputy_committee_leader'].includes(targetRoleName)
            && targetCommitteeDepartmentId
            && userDepartmentId === targetCommitteeDepartmentId) {
            return 'لا يحق لك الترشح لمنصب في لجنة تتبع قسماً ترأسه';
        }

        // (5) طلب ترشح نشط واحد فقط في أي وقت
        const hasOtherActive = (this.myCandidacies || []).some(c =>
            c.election_id !== election?.id
            && ['pending', 'needs_edit', 'approved'].includes(c.status)
        );
        if (hasOtherActive) {
            return 'لديك طلب ترشح نشط حالياً — لا يمكن تقديم طلب جديد حتى يُحسم السابق';
        }

        return null;
    }

    async loadMyCandidacies() {
        if (!this.currentUser) { this.myCandidacies = []; return; }
        const { data } = await this.supabase
            .from('election_candidates')
            .select('*')
            .eq('user_id', this.currentUser.id);
        this.myCandidacies = data || [];
    }

    getActiveCandidacy() {
        return (this.myCandidacies || []).find(c =>
            ['pending', 'needs_edit', 'approved'].includes(c.status)
        ) || null;
    }

    async getCandidacyElection(electionId) {
        const cached = (this.eligibleElections || []).find(e => e.id === electionId);
        if (cached) return cached;
        const { data, error } = await this.supabase
            .from('elections')
            .select(`
                *,
                target_role:target_role_id(id, role_name, role_name_ar, role_level),
                target_committee:target_committee_id(id, committee_name_ar, department_id),
                target_department:target_department_id(id, name_ar)
            `)
            .eq('id', electionId)
            .maybeSingle();
        if (error) {
            console.error('Error fetching candidacy election:', error);
            return null;
        }
        return data || null;
    }

    setupCandidacySectionListeners() {
        if (this.candidacySectionListenersSet) return;
        const section = document.getElementById('candidacy-section');
        if (!section) return;

        section.querySelector('#candidacyRefreshBtn')?.addEventListener('click', async () => {
            await this.loadEligibleElections();
            await this.loadMyCandidacies();
            this.renderCandidacySection();
        });

        this.candidacySectionListenersSet = true;
    }

    renderCandidacySection() {
        const grid = document.getElementById('candidacyGrid');
        const statsEl = document.getElementById('candidacyStats');
        if (!grid) return;

        const eligible = this.eligibleElections || [];

        if (statsEl) {
            statsEl.innerHTML = `
                <div class="stats-grid" style="--stats-cols: 1;">
                    <div class="stat-card" style="--stat-color: #10b981;">
                        <div class="stat-card-wrapper">
                            <div class="stat-icon"><i class="fa-solid fa-door-open"></i></div>
                            <div class="stat-content">
                                <div class="stat-value">${eligible.length}</div>
                                <div class="stat-label">أبواب ترشح متاحة لك</div>
                            </div>
                        </div>
                    </div>
                </div>`;
        }

        if (!eligible.length) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <div class="empty-state__icon"><i class="fa-solid fa-inbox"></i></div>
                    <p class="empty-state__title">لا توجد أبواب ترشح مفتوحة لك حالياً</p>
                    <p class="empty-state__message">ستظهر هنا الانتخابات التي تستطيع التقدم للترشح لها</p>
                </div>`;
            return;
        }

        grid.innerHTML = eligible.map(e => this.renderCandidacyCard(e)).join('');

        grid.querySelectorAll('.candidacy-view-detail-btn').forEach(btn => {
            btn.addEventListener('click', (ev) => {
                ev.stopPropagation();
                this.showCandidacyDetail(btn.dataset.electionId);
            });
        });

        grid.querySelectorAll('.apply-candidacy-btn').forEach(btn => {
            btn.addEventListener('click', (ev) => {
                ev.stopPropagation();
                this.showCandidacyModal(btn.dataset.electionId);
            });
        });

        grid.querySelectorAll('.candidacy-edit-btn').forEach(btn => {
            btn.addEventListener('click', (ev) => {
                ev.stopPropagation();
                this.showEditMyCandidacyModal(btn.dataset.candidateId, btn.dataset.electionId);
            });
        });

        grid.querySelectorAll('.candidacy-withdraw-btn').forEach(btn => {
            btn.addEventListener('click', (ev) => {
                ev.stopPropagation();
                this.withdrawMyCandidacy(btn.dataset.candidateId);
            });
        });
    }

    showCandidacyDetail(electionId) {
        const election = (this.eligibleElections || []).find(e => e.id === electionId);
        const myCandidacy = (this.myCandidacies || []).find(c => c.election_id === electionId);
        if (!election || !myCandidacy) return;

        this.currentCandidacyElectionId = electionId;
        this._candidacyStandalone = false;

        const section = document.getElementById('candidacy-section');
        if (!section) return;
        section.querySelector('#candidacy-list-view')?.classList.add('d-none');
        section.querySelector('#candidacy-detail-view')?.classList.remove('d-none');

        this.renderCandidacyDetail(election, myCandidacy);

        if (!this._candidacyEscHandler) {
            this._candidacyEscHandler = (e) => {
                if (e.key !== 'Escape') return;
                if (document.querySelector('.modal.show, .modal.is-open')) return;
                if (!this.currentCandidacyElectionId) return;
                if (this._candidacyStandalone) return;
                this.backToCandidacyList();
            };
            document.addEventListener('keydown', this._candidacyEscHandler);
        }
    }

    // وضع "ملفي الانتخابي" — يدخل المستخدم مباشرةً على ملفه دون قائمة الأبواب
    showMyCandidacyFile(election, myCandidacy) {
        this.currentCandidacyElectionId = election.id;
        this._candidacyStandalone = true;

        const section = document.getElementById('candidacy-section');
        if (!section) return;
        section.querySelector('#candidacy-list-view')?.classList.add('d-none');
        section.querySelector('#candidacy-detail-view')?.classList.remove('d-none');

        this.renderCandidacyDetail(election, myCandidacy);
    }

    backToCandidacyList() {
        this.currentCandidacyElectionId = null;
        this._candidacyStandalone = false;
        const section = document.getElementById('candidacy-section');
        if (!section) return;
        section.querySelector('#candidacy-detail-view')?.classList.add('d-none');
        section.querySelector('#candidacy-list-view')?.classList.remove('d-none');
    }

    renderCandidacyDetail(election, myCandidacy) {
        const container = document.getElementById('candidacyDetailContent');
        if (!container) return;

        const fmt = (iso) => iso ? new Date(iso).toLocaleString('ar-SA', {
            calendar: 'gregory',
            numberingSystem: 'latn',
            dateStyle: 'medium',
            timeStyle: 'short'
        }).replace(/،\s*/, ' الساعة ') : '—';

        const variant = ElectionsManager.CANDIDATE_STATUS_VARIANT[myCandidacy.status]
                     || ElectionsManager.CANDIDATE_STATUS_VARIANT.pending;
        const statusLabel = ElectionsManager.CANDIDATE_STATUS_LABELS[myCandidacy.status] || myCandidacy.status;

        const positionName = this.getElectionName(election);
        const roleName = election.target_role?.role_name_ar || '—';
        const isDept   = !!election.target_department_id;
        const unitName = election.target_committee?.committee_name_ar
                      || election.target_department?.name_ar || '';
        const unitLabel = isDept ? 'القسم' : 'اللجنة';
        const unitIcon  = isDept ? 'fa-sitemap' : 'fa-people-group';

        const candidacyEnd = election.candidacy_end ? fmt(election.candidacy_end) : null;
        let remaining = null;
        if (election.candidacy_end) {
            const diff = new Date(election.candidacy_end).getTime() - Date.now();
            if (diff > 0) {
                const days = Math.floor(diff / 86400000);
                const hours = Math.floor((diff % 86400000) / 3600000);
                remaining = days > 0 ? `متبقي ${days} يوم` : `متبقي ${hours} ساعة`;
            } else {
                remaining = 'انتهى الموعد';
            }
        }
        const votingStart = election.voting_start ? fmt(election.voting_start) : null;
        const votingEnd   = election.voting_end ? fmt(election.voting_end) : null;

        const editLog = Array.isArray(myCandidacy.edit_requests_log) ? myCandidacy.edit_requests_log : [];
        const latestEditAt = editLog.length
            ? editLog[editLog.length - 1].at
            : myCandidacy.edit_requested_at;
        const resubmittedAfterEdit = latestEditAt
            && myCandidacy.status === 'pending'
            && myCandidacy.updated_at
            && new Date(myCandidacy.updated_at) > new Date(latestEditAt);

        const editLogSteps = editLog.length
            ? editLog.map((entry, i) => ({
                key: `edit_requested_${i}`,
                label: editLog.length > 1 ? `طُلب تعديل (${i + 1})` : 'طُلب تعديل',
                icon: 'fa-pen-to-square',
                at: entry.at,
                done: true
            }))
            : (myCandidacy.edit_requested_at
                ? [{ key: 'edit_requested', label: 'طُلب تعديل', icon: 'fa-pen-to-square', at: myCandidacy.edit_requested_at, done: true }]
                : []);

        const timeline = [
            { key: 'submitted', label: 'قُدِّم الطلب', icon: 'fa-paper-plane', at: myCandidacy.created_at, done: true, atPrefix: 'تاريخ ' },
            ...editLogSteps,
            myCandidacy.status === 'needs_edit'
                ? { key: 'awaiting_edit', label: 'بانتظار تعديلك', icon: 'fa-hourglass-half', done: false, active: true }
                : null,
            resubmittedAfterEdit
                ? { key: 'resubmitted', label: 'أعدت إرسال الطلب', icon: 'fa-paper-plane', at: myCandidacy.updated_at, done: true }
                : null,
            myCandidacy.reviewed_at && myCandidacy.status === 'approved'
                ? { key: 'approved', label: 'تمت الموافقة', icon: 'fa-circle-check', at: myCandidacy.reviewed_at, done: true }
                : null,
            myCandidacy.reviewed_at && myCandidacy.status === 'rejected'
                ? { key: 'rejected', label: 'رُفض الطلب', icon: 'fa-circle-xmark', at: myCandidacy.reviewed_at, done: true }
                : null,
            myCandidacy.status === 'withdrawn'
                ? { key: 'withdrawn', label: 'انسحبت من الترشح', icon: 'fa-arrow-rotate-left', at: myCandidacy.updated_at, done: true }
                : null
        ].filter(Boolean);

        const fileUrl = myCandidacy.election_file_url;
        const fileExt = fileUrl ? fileUrl.split('.').pop().toLowerCase().split('?')[0] : '';
        const isImage = ['png', 'jpg', 'jpeg', 'webp'].includes(fileExt);
        const isPdf = fileExt === 'pdf';

        const canEdit     = myCandidacy.status === 'needs_edit';
        const canEditContent = myCandidacy.status === 'pending';
        const canWithdraw = ['pending', 'needs_edit', 'approved'].includes(myCandidacy.status);

        const standalone = !!this._candidacyStandalone;
        container.innerHTML = `
            ${standalone ? '' : `
            <nav class="page-breadcrumb" aria-label="مسار التنقل">
                <ol>
                    <li>
                        <button type="button" class="breadcrumb-link" id="candidacyBackBtn">
                            <i class="fa-solid fa-person-arrow-up-from-line"></i>
                            أبواب الترشح
                        </button>
                    </li>
                    <li class="breadcrumb-sep" aria-hidden="true">
                        <i class="fa-solid fa-chevron-left"></i>
                    </li>
                    <li class="breadcrumb-current" aria-current="page">ملفي الانتخابي</li>
                </ol>
            </nav>`}

            <div class="card" style="margin-bottom: 1.25rem;">
                <div class="card-header">
                    <h3><i class="fa-solid fa-circle-info"></i> تفاصيل المنصب</h3>
                </div>
                <div class="card-body">
                    <div class="uc-grid uc-card--primary" style="--uc-grid-min: 240px; gap: 0.75rem;">
                        <div class="uc-card__info-item">
                            <div class="uc-card__info-icon"><i class="fa-solid fa-briefcase"></i></div>
                            <div class="uc-card__info-content">
                                <span class="uc-card__info-label">المنصب</span>
                                <span class="uc-card__info-value">${this.escapeHtml(positionName)}</span>
                            </div>
                        </div>
                        <div class="uc-card__info-item">
                            <div class="uc-card__info-icon"><i class="fa-solid fa-user-tie"></i></div>
                            <div class="uc-card__info-content">
                                <span class="uc-card__info-label">الدور</span>
                                <span class="uc-card__info-value">${this.escapeHtml(roleName)}</span>
                            </div>
                        </div>
                        ${unitName ? `
                        <div class="uc-card__info-item">
                            <div class="uc-card__info-icon"><i class="fa-solid ${unitIcon}"></i></div>
                            <div class="uc-card__info-content">
                                <span class="uc-card__info-label">${unitLabel}</span>
                                <span class="uc-card__info-value">${this.escapeHtml(unitName)}</span>
                            </div>
                        </div>` : ''}
                        <div class="uc-card__info-item">
                            <div class="uc-card__info-icon"><i class="fa-solid fa-hourglass-end"></i></div>
                            <div class="uc-card__info-content">
                                <span class="uc-card__info-label">نهاية الترشح</span>
                                <span class="uc-card__info-value">
                                    ${candidacyEnd || '<span style="opacity: 0.55;">لم يُحدَّد</span>'}
                                    ${remaining ? ` <small style="opacity: 0.7;">· ${remaining}</small>` : ''}
                                </span>
                            </div>
                        </div>
                        ${votingStart ? `
                        <div class="uc-card__info-item">
                            <div class="uc-card__info-icon"><i class="fa-solid fa-check-to-slot"></i></div>
                            <div class="uc-card__info-content">
                                <span class="uc-card__info-label">بداية التصويت</span>
                                <span class="uc-card__info-value">${votingStart}</span>
                            </div>
                        </div>` : ''}
                        ${votingEnd ? `
                        <div class="uc-card__info-item">
                            <div class="uc-card__info-icon"><i class="fa-solid fa-flag-checkered"></i></div>
                            <div class="uc-card__info-content">
                                <span class="uc-card__info-label">نهاية التصويت</span>
                                <span class="uc-card__info-value">${votingEnd}</span>
                            </div>
                        </div>` : ''}
                    </div>
                </div>
                ${canWithdraw ? `
                <div class="card-footer">
                    <button class="btn btn-danger btn-block candidacy-detail-withdraw-btn"
                            data-candidate-id="${myCandidacy.id}">
                        <i class="fa-solid fa-arrow-rotate-left"></i> انسحاب من الترشح
                    </button>
                </div>` : ''}
            </div>

            ${myCandidacy.status === 'needs_edit' && myCandidacy.edit_request_note ? `
            <div class="card" style="margin-bottom: 1.25rem;">
                <div class="card-header">
                    <h3><i class="fa-solid fa-comment-dots"></i> ملاحظات الإدارة للتعديل</h3>
                </div>
                <div class="card-body">
                    <p style="white-space: pre-wrap; margin: 0; line-height: 1.8;">${this.escapeHtml(myCandidacy.edit_request_note)}</p>
                </div>
                ${canEdit ? `
                <div class="card-footer">
                    <button class="btn btn-primary btn-block candidacy-detail-edit-btn"
                            data-candidate-id="${myCandidacy.id}"
                            data-election-id="${election.id}">
                        <i class="fa-solid fa-pen"></i> تعديل طلبي
                    </button>
                </div>` : ''}
            </div>` : ''}

            ${myCandidacy.status === 'rejected' && myCandidacy.review_note ? `
            <div class="card" style="margin-bottom: 1.25rem;">
                <div class="card-header">
                    <h3><i class="fa-solid fa-circle-xmark"></i> سبب الرفض</h3>
                </div>
                <div class="card-body">
                    <p style="white-space: pre-wrap; margin: 0; line-height: 1.8;">${this.escapeHtml(myCandidacy.review_note)}</p>
                </div>
            </div>` : ''}

            <div class="card" style="margin-bottom: 1.25rem;">
                <div class="card-header">
                    <h3><i class="fa-solid fa-clock-rotate-left"></i> مسار طلبك — ${statusLabel}</h3>
                </div>
                <div class="card-body">
                    <div class="uc-grid uc-card--primary" style="--uc-grid-min: 240px; gap: 0.75rem;">
                        ${timeline.map(step => `
                            <div class="uc-card__info-item" style="${step.active ? '' : (step.done ? '' : 'opacity: 0.55;')}">
                                <div class="uc-card__info-icon"><i class="fa-solid ${step.icon}"></i></div>
                                <div class="uc-card__info-content">
                                    <span class="uc-card__info-label">${step.label}</span>
                                    <span class="uc-card__info-value">${step.at ? `${step.atPrefix || ''}${fmt(step.at)}` : (step.active ? 'الآن' : '—')}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <div class="card" style="margin-bottom: 1.25rem;">
                <div class="card-header">
                    <h3><i class="fa-solid fa-align-right"></i> بياني الانتخابي</h3>
                </div>
                <div class="card-body">
                    ${myCandidacy.candidacy_statement ? `
                        <p style="white-space: pre-wrap; margin: 0; line-height: 1.9;">${this.escapeHtml(myCandidacy.candidacy_statement)}</p>
                    ` : `
                        <p style="opacity: 0.6; margin: 0;">لم تُضف بياناً انتخابياً.</p>
                    `}
                </div>
                ${canEditContent ? `
                <div class="card-footer">
                    <button class="btn btn-primary btn-block candidacy-detail-edit-btn"
                            data-candidate-id="${myCandidacy.id}"
                            data-election-id="${election.id}"
                            data-scope="statement">
                        <i class="fa-solid fa-pen"></i> تعديل البيان
                    </button>
                </div>` : ''}
            </div>

            <div class="card" style="margin-bottom: 1.25rem;">
                <div class="card-header">
                    <h3><i class="fa-solid fa-paperclip"></i> الملف المرفق</h3>
                </div>
                <div class="card-body">
                    ${fileUrl ? `
                        ${isImage ? `
                            <div style="text-align: center;">
                                <img src="${fileUrl}" alt="الملف الانتخابي"
                                     style="max-width: 100%; max-height: 480px; border-radius: 8px; border: 1px solid rgba(0,0,0,0.08);">
                            </div>
                        ` : isPdf ? `
                            <embed src="${fileUrl}" type="application/pdf"
                                   style="width: 100%; height: 600px; border: 1px solid rgba(0,0,0,0.08); border-radius: 8px;">
                        ` : `
                            <p style="opacity: 0.7; margin: 0;">ملف مرفق — استخدم الأزرار أدناه للفتح أو التحميل.</p>
                        `}
                    ` : `
                        <div class="empty-state">
                            <div class="empty-state__icon"><i class="fa-solid fa-file-circle-xmark"></i></div>
                            <p class="empty-state__title">لم تُرفق أي ملف</p>
                        </div>
                    `}
                </div>
                ${(fileUrl || canEditContent) ? `
                <div class="uc-card__footer" style="--_uc-color-rgb: 61, 143, 214;">
                    ${fileUrl ? `
                    <a href="${fileUrl}" target="_blank" rel="noopener" class="btn btn-slate">
                        <i class="fa-solid fa-up-right-from-square"></i> فتح في نافذة جديدة
                    </a>
                    <a href="${fileUrl}" download class="btn btn-slate">
                        <i class="fa-solid fa-download"></i> تحميل
                    </a>` : ''}
                    ${canEditContent ? `
                    <button class="btn btn-primary candidacy-detail-edit-btn"
                            data-candidate-id="${myCandidacy.id}"
                            data-election-id="${election.id}"
                            data-scope="file">
                        <i class="fa-solid fa-pen"></i> تعديل الملف
                    </button>` : ''}
                </div>` : ''}
            </div>

        `;

        container.querySelector('#candidacyBackBtn')?.addEventListener('click', () => this.backToCandidacyList());
        container.querySelectorAll('.candidacy-detail-edit-btn').forEach(btn => {
            btn.addEventListener('click', (ev) => {
                const t = ev.currentTarget;
                this.showEditMyCandidacyModal(t.dataset.candidateId, t.dataset.electionId, t.dataset.scope || 'all');
            });
        });
        container.querySelector('.candidacy-detail-withdraw-btn')?.addEventListener('click', (ev) => {
            this.withdrawMyCandidacy(ev.currentTarget.dataset.candidateId);
        });
    }

    renderCandidacyCard(election) {
        const roleName = election.target_role?.role_name_ar || '—';
        const isDept   = !!election.target_department_id;
        const unitName = election.target_committee?.committee_name_ar
                      || election.target_department?.name_ar || '';
        const unitLabel = isDept ? 'القسم' : 'اللجنة';
        const unitIcon  = isDept ? 'fa-sitemap' : 'fa-people-group';

        const fmt = (iso) => new Date(iso).toLocaleString('ar-SA', {
            calendar: 'gregory',
            numberingSystem: 'latn',
            dateStyle: 'medium',
            timeStyle: 'short'
        }).replace(/،\s*/, ' الساعة ');
        const end   = election.candidacy_end   ? fmt(election.candidacy_end)   : null;

        let remaining = null;
        if (election.candidacy_end) {
            const diff = new Date(election.candidacy_end).getTime() - Date.now();
            if (diff > 0) {
                const days = Math.floor(diff / 86400000);
                const hours = Math.floor((diff % 86400000) / 3600000);
                remaining = days > 0 ? `متبقي ${days} يوم` : `متبقي ${hours} ساعة`;
            } else {
                remaining = 'انتهى الموعد';
            }
        }

        const unset = '<span style="opacity: 0.55;">لم يُحدَّد</span>';
        const myCandidacy = this.myCandidacies?.find(c => c.election_id === election.id);
        const variant = myCandidacy
            ? (ElectionsManager.CANDIDATE_STATUS_VARIANT[myCandidacy.status] || ElectionsManager.CANDIDATE_STATUS_VARIANT.pending)
            : { color: '#10b981', uc: 'uc-card--success', icon: 'fa-door-open' };
        const statusLabel = myCandidacy ? ElectionsManager.CANDIDATE_STATUS_LABELS[myCandidacy.status] : 'باب الترشح مفتوح';
        const needsEdit = myCandidacy?.status === 'needs_edit';

        return `
            <div class="uc-card ${variant.uc}" data-election-id="${election.id}">
                <div class="uc-card__header">
                    <div class="uc-card__header-inner">
                        <div class="uc-card__icon">
                            <i class="fa-solid ${variant.icon}"></i>
                        </div>
                        <div class="uc-card__header-info">
                            <h3 class="uc-card__title uc-card__title--wrap">${this.getElectionName(election)}</h3>
                            <span class="uc-card__badge">
                                <i class="fa-solid fa-circle-dot"></i>
                                ${statusLabel}
                            </span>
                        </div>
                    </div>
                </div>

                <div class="uc-card__body">
                    <div class="uc-card__info-item">
                        <div class="uc-card__info-icon"><i class="fa-solid fa-user-tie"></i></div>
                        <div class="uc-card__info-content">
                            <span class="uc-card__info-label">الدور</span>
                            <span class="uc-card__info-value">${roleName}</span>
                        </div>
                    </div>

                    ${unitName ? `
                    <div class="uc-card__info-item">
                        <div class="uc-card__info-icon"><i class="fa-solid ${unitIcon}"></i></div>
                        <div class="uc-card__info-content">
                            <span class="uc-card__info-label">${unitLabel}</span>
                            <span class="uc-card__info-value">${unitName}</span>
                        </div>
                    </div>` : ''}

                    <div class="uc-card__info-item">
                        <div class="uc-card__info-icon"><i class="fa-solid fa-hourglass-end"></i></div>
                        <div class="uc-card__info-content">
                            <span class="uc-card__info-label">نهاية الترشح</span>
                            <span class="uc-card__info-value">
                                ${end || unset}${remaining ? ` <small style="opacity: 0.7;">· ${remaining}</small>` : ''}
                            </span>
                        </div>
                    </div>

                    ${needsEdit && myCandidacy.edit_request_note ? `
                    <div class="uc-card__info-item">
                        <div class="uc-card__info-icon"><i class="fa-solid fa-comment-dots"></i></div>
                        <div class="uc-card__info-content">
                            <span class="uc-card__info-label">ملاحظات الإدارة للتعديل</span>
                            <span class="uc-card__info-value" style="white-space: pre-wrap;">${this.escapeHtml(myCandidacy.edit_request_note)}</span>
                        </div>
                    </div>` : ''}

                    ${myCandidacy?.status === 'rejected' && myCandidacy.review_note ? `
                    <div class="uc-card__info-item">
                        <div class="uc-card__info-icon"><i class="fa-solid fa-comment-dots"></i></div>
                        <div class="uc-card__info-content">
                            <span class="uc-card__info-label">سبب الرفض</span>
                            <span class="uc-card__info-value" style="white-space: pre-wrap;">${this.escapeHtml(myCandidacy.review_note)}</span>
                        </div>
                    </div>` : ''}
                </div>

                <div class="uc-card__footer">
                    ${!myCandidacy ? `
                        <button class="btn btn-success apply-candidacy-btn" data-election-id="${election.id}">
                            <i class="fa-solid fa-user-plus"></i> تقدم للترشح
                        </button>
                    ` : `
                        <button class="btn ${variant.btnClass || 'btn-primary'} candidacy-view-detail-btn" data-election-id="${election.id}">
                            <i class="fa-solid fa-file-signature"></i> ملفي الانتخابي
                        </button>
                    `}
                </div>
            </div>`;
    }

    async showSetEndDateModal(electionId) {
        const election = this.elections.find(e => e.id === electionId);
        if (!election) return;

        let modalRef = null;
        modalRef = await window.ModalHelper.show({
            title: 'تحديد موعد إغلاق الترشح',
            iconClass: 'fa-calendar-xmark',
            size: 'sm',
            type: 'primary',
            html: `
                <div class="form-group">
                    <label class="form-label">
                        <i class="label-icon fa-solid fa-hourglass-end"></i> تاريخ ووقت إغلاق باب الترشح <span class="required-dot">*</span>
                    </label>
                    <input type="datetime-local" id="candidacyEndInput" class="form-input">
                </div>`,
            showFooter: true,
            footerButtons: [
                { text: 'إلغاء', class: 'btn btn-outline' },
                {
                    text: '<i class="fa-solid fa-check"></i> حفظ',
                    class: 'btn btn-primary',
                    keepOpen: true,
                    callback: async () => {
                        const val = document.getElementById('candidacyEndInput')?.value;
                        if (!val) {
                            const input = document.getElementById('candidacyEndInput');
                            if (input) input.style.borderColor = 'var(--color-danger)';
                            this.showError('يرجى تحديد الموعد');
                            return;
                        }
                        try {
                            const { error } = await this.supabase
                                .from('elections')
                                .update({ candidacy_end: new Date(val).toISOString(), updated_at: new Date().toISOString() })
                                .eq('id', electionId);
                            if (error) throw error;
                            modalRef?.close?.();
                            this.showSuccess('تم تحديد موعد إغلاق الترشح');
                            await this.loadElections();
                            this.renderOpenSection();
                        } catch (err) {
                            console.error(err);
                            this.showError('حدث خطأ أثناء الحفظ');
                        }
                    }
                }
            ]
        });
    }

    // =============================================
    // إنشاء انتخاب جديد
    // =============================================

    async showCreateModal() {
        // تحديث بيانات الانتخابات لضمان عدم استخدام بيانات قديمة
        await this.loadElections();

        const eligibleRoles = this.roles.filter(r => ElectionsManager.ELIGIBLE_ROLES.includes(r.role_name));
        const eligibleRoleIds = eligibleRoles.map(r => r.id);

        // جلب المناصب المشغولة (role_id + committee_id أو department_id)
        const { data: occupiedData } = await this.supabase
            .from('user_roles')
            .select('role_id, committee_id, department_id')
            .in('role_id', eligibleRoleIds)
            .eq('is_active', true);
        const occupied = occupiedData || [];

        // مفاتيح الانتخابات النشطة (role-committee أو role-department)
        // المسودات والملغاة والمكتملة لا تمنع إنشاء انتخاب جديد
        const activeElectionKeys = new Set(
            this.elections
                .filter(e => !['draft', 'completed', 'cancelled'].includes(e.status))
                .map(e => e.target_department_id
                    ? `${e.target_role_id}-dept-${e.target_department_id}`
                    : `${e.target_role_id}-com-${e.target_committee_id}`)
        );

        const rolesOptions = eligibleRoles.map(r =>
            `<option value="${r.id}" data-role-name="${r.role_name}">${r.role_name_ar}</option>`
        ).join('');

        let modalRef = null;
        modalRef = await window.ModalHelper.show({
            title: 'إنشاء انتخاب جديد',
            iconClass: 'fa-door-open',
            size: 'lg',
            html: `
                <form id="createElectionForm" class="form-stack">
                    <div class="form-group">
                        <label class="form-label">
                            <i class="label-icon fa-solid fa-user-tie"></i> المنصب المستهدف <span class="required-dot">*</span>
                        </label>
                        <select id="electionTargetRole" class="form-select" required>
                            <option value="">اختر المنصب</option>
                            ${rolesOptions}
                        </select>
                    </div>
                    <div class="form-group d-none" id="entityGroup">
                        <label class="form-label" id="entityLabel">
                            <i class="label-icon fa-solid fa-sitemap"></i> — <span class="required-dot">*</span>
                        </label>
                        <select id="electionTargetEntity" class="form-select" data-entity-type="">
                            <option value="">اختر...</option>
                        </select>
                        <span id="noVacancyMsg" class="form-error d-none">
                            <i class="fa-solid fa-circle-exclamation"></i> لا توجد مناصب شاغرة لهذا الدور
                        </span>
                    </div>
                    <div class="form-group">
                        <label class="form-label">
                            <i class="label-icon fa-solid fa-hourglass-end"></i> نهاية الترشح
                        </label>
                        <input type="datetime-local" id="electionCandidacyEnd" class="form-input">
                        <small>
                            <i class="fa-solid fa-circle-info"></i>
                            <span>سيُفتح باب الترشح فور الإنشاء. <strong>تحديد موعد النهاية اختياري</strong> — يمكنك ضبطه لاحقًا.</span>
                        </small>
                    </div>
                </form>`,
            showFooter: true,
            footerButtons: [
                { text: 'إلغاء', class: 'btn btn-outline' },
                {
                    text: '<i class="fa-solid fa-plus"></i> إنشاء',
                    class: 'btn btn-primary',
                    keepOpen: true,
                    callback: () => this.createElection(modalRef)
                }
            ]
        });

        // ربط حدث تغيير المنصب
        const roleSelect    = document.getElementById('electionTargetRole');
        const entityGroup   = document.getElementById('entityGroup');
        const entityLabel   = document.getElementById('entityLabel');
        const entitySelect  = document.getElementById('electionTargetEntity');
        const noVacancyMsg  = document.getElementById('noVacancyMsg');

        roleSelect?.addEventListener('change', () => {
            const selectedOption = roleSelect.options[roleSelect.selectedIndex];
            const selectedRoleId = Number(roleSelect.value);
            const roleName = selectedOption?.dataset.roleName || '';
            entitySelect.value = '';

            if (!selectedRoleId) {
                entityGroup.classList.add('d-none');
                return;
            }

            const isDeptRole = ElectionsManager.DEPARTMENT_BASED_ROLES.includes(roleName);

            if (isDeptRole) {
                // عرض الأقسام الشاغرة
                entityLabel.innerHTML = '<i class="label-icon fa-solid fa-sitemap"></i> القسم المستهدف <span class="required-dot">*</span>';
                entitySelect.dataset.entityType = 'department';

                const vacantDepts = this.departments.filter(d => {
                    const isOccupied = occupied.some(o =>
                        Number(o.role_id) === selectedRoleId && Number(o.department_id) === d.id
                    );
                    const hasActiveElection = activeElectionKeys.has(`${selectedRoleId}-dept-${d.id}`);
                    return !isOccupied && !hasActiveElection;
                });

                entitySelect.innerHTML = '<option value="">اختر القسم</option>' +
                    vacantDepts.map(d => `<option value="${d.id}">${d.name_ar}</option>`).join('');

                noVacancyMsg.classList.toggle('d-none', vacantDepts.length > 0);
            } else {
                // عرض اللجان الشاغرة (غير مشغولة وبدون انتخاب نشط)
                entityLabel.innerHTML = '<i class="label-icon fa-solid fa-people-group"></i> اللجنة المستهدفة <span class="required-dot">*</span>';
                entitySelect.dataset.entityType = 'committee';

                const vacantCommittees = this.committees.filter(c => {
                    const isOccupied = occupied.some(o =>
                        Number(o.role_id) === selectedRoleId && Number(o.committee_id) === c.id
                    );
                    const hasActiveElection = activeElectionKeys.has(`${selectedRoleId}-com-${c.id}`);
                    return !isOccupied && !hasActiveElection;
                });

                entitySelect.innerHTML = '<option value="">اختر اللجنة</option>' +
                    vacantCommittees.map(c => `<option value="${c.id}">${c.committee_name_ar}</option>`).join('');

                noVacancyMsg.classList.toggle('d-none', vacantCommittees.length > 0);
            }

            entityGroup.classList.remove('d-none');
        });
    }

    async createElection(modalRef) {
        const roleSelect    = document.getElementById('electionTargetRole');
        const entitySelect  = document.getElementById('electionTargetEntity');
        const entityGroup   = document.getElementById('entityGroup');
        const targetRoleId  = roleSelect?.value || '';
        const entityType    = entitySelect?.dataset.entityType || '';
        const entityId      = entitySelect?.value || '';
        const candidacyEndRaw   = document.getElementById('electionCandidacyEnd')?.value;
        const candidacyEnd   = candidacyEndRaw ? new Date(candidacyEndRaw).toISOString() : null;

        // تحقق مرئي: أحمر على الحقل الفارغ
        const markInvalid = (el) => {
            if (!el) return;
            el.style.borderColor = 'var(--color-danger)';
            el.addEventListener('change', () => el.style.borderColor = '', { once: true });
        };

        if (!targetRoleId) {
            markInvalid(roleSelect);
            this.showError('يرجى اختيار المنصب أولاً');
            return;
        }
        if (!entityGroup?.classList.contains('d-none') && !entityId) {
            markInvalid(entitySelect);
            this.showError(entityType === 'department' ? 'يرجى اختيار القسم' : 'يرجى اختيار اللجنة');
            return;
        }

        const insertData = {
            target_role_id: targetRoleId,
            target_committee_id: entityType === 'committee' ? entityId : null,
            target_department_id: entityType === 'department' ? entityId : null,
        };

        try {
            const { error } = await this.supabase
                .from('elections')
                .insert({
                    ...insertData,
                    candidacy_end: candidacyEnd || null,
                    status: 'candidacy_open',
                    created_by: this.currentUser.id
                });

            if (error) throw error;

            modalRef?.close?.();
            this.showSuccess('تم إنشاء الانتخاب بنجاح');
            await this.loadElections();
            // تحديث القسم المناسب بحسب الواجهة النشطة
            if (document.getElementById('elections-open-section')?.classList.contains('d-none') === false) {
                this.renderOpenSection();
            } else {
                this.renderElectionsList();
            }
        } catch (error) {
            console.error('Error creating election:', error);
            this.showError('حدث خطأ أثناء إنشاء الانتخاب');
        }
    }

    // =============================================
    // عرض تفاصيل الانتخاب
    // =============================================

    async showElectionDetail(electionId) {
        const election = this.elections.find(e => e.id === electionId);
        if (!election) return;

        this.currentElection = election;

        // تحميل المرشحين والأصوات
        const [candidates, myVote, results] = await Promise.all([
            this.loadCandidates(electionId),
            this.loadMyVote(electionId),
            this.loadResults(electionId)
        ]);

        const container = document.getElementById('elections-section');
        // إذا كان المستخدم في قسم آخر (مثل elections-open-section)، انقله للقسم الرئيسي
        if (container?.classList.contains('d-none') && typeof window.navigateToSection === 'function') {
            window.navigateToSection('elections-section');
        }
        container.querySelector('#elections-list-view').classList.add('d-none');
        container.querySelector('#elections-detail-view').classList.remove('d-none');

        this.renderElectionDetail(election, candidates, myVote, results);

        if (!this._electionEscHandler) {
            this._electionEscHandler = (e) => {
                if (e.key !== 'Escape') return;
                if (document.querySelector('.modal.show, .modal.is-open')) return;
                if (!this.currentElection) return;
                this.showListView();
            };
            document.addEventListener('keydown', this._electionEscHandler);
        }
    }

    async loadCandidates(electionId) {
        const { data } = await this.supabase
            .from('election_candidates')
            .select(`
                *,
                user:user_id(id, full_name, email, avatar_url),
                reviewer:reviewed_by(id, full_name)
            `)
            .eq('election_id', electionId)
            .order('created_at', { ascending: true });
        return data || [];
    }

    async loadMyVote(electionId) {
        if (!this.currentUser) return null;
        const { data } = await this.supabase
            .from('election_votes')
            .select('*, candidate:candidate_id(user_id)')
            .eq('election_id', electionId)
            .eq('voter_id', this.currentUser.id)
            .maybeSingle();
        return data;
    }

    async loadResults(electionId) {
        const { data } = await this.supabase.rpc('get_election_results', {
            p_election_id: electionId
        });
        return data || [];
    }

    renderElectionDetail(election, candidates, myVote, results) {
        const detailContainer = document.getElementById('election-detail-content');
        if (!detailContainer) return;

        const canApprove = this.canApproveCandidates();
        const isInTargetCommittee = this.isUserInCommittee(election.target_committee_id);

        this.renderAdminDetail(detailContainer, election, candidates, myVote, results, canApprove, isInTargetCommittee);

        this.bindDetailEvents(detailContainer, election, candidates);
    }

    // عرض تفاصيل الإدارة (العرض الكامل)
    renderAdminDetail(detailContainer, election, candidates, myVote, results, canApprove, isInTargetCommittee) {
        const electionName = this.getElectionName(election);
        let html = `
            <nav class="page-breadcrumb" aria-label="مسار التنقل">
                <ol>
                    <li>
                        <button type="button" class="breadcrumb-link" id="backToElectionsListBtn">
                            <i class="fa-solid fa-list-check"></i>
                            الانتخابات
                        </button>
                    </li>
                    <li class="breadcrumb-sep" aria-hidden="true">
                        <i class="fa-solid fa-chevron-left"></i>
                    </li>
                    <li class="breadcrumb-current" aria-current="page">${this.escapeHtml(electionName)}</li>
                </ol>
            </nav>`;

        html += `
            <div style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
                <button class="btn btn-outline election-tab active" data-tab="candidates">
                    <i class="fa-solid fa-users"></i> المرشحون (${candidates.length})
                </button>
                <button class="btn btn-outline election-tab" data-tab="voting">
                    <i class="fa-solid fa-check-to-slot"></i> التصويت
                </button>
                <button class="btn btn-outline election-tab" data-tab="results">
                    <i class="fa-solid fa-chart-bar"></i> النتائج
                </button>
            </div>`;

        html += `<div id="election-tab-candidates">${this.renderCandidatesTab(election, candidates, canApprove, isInTargetCommittee)}</div>`;
        html += `<div id="election-tab-voting" class="d-none">${this.renderVotingTab(election, candidates, myVote)}</div>`;
        html += `<div id="election-tab-results" class="d-none">${this.renderResultsTab(election, results, true)}</div>`;

        detailContainer.innerHTML = html;

        // ربط أحداث التبويبات
        detailContainer.querySelectorAll('.election-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                detailContainer.querySelectorAll('.election-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                ['candidates', 'voting', 'results'].forEach(name => {
                    const el = document.getElementById(`election-tab-${name}`);
                    if (el) el.classList.toggle('d-none', name !== tab.dataset.tab);
                });
            });
        });
    }

    // =============================================
    // تبويب المرشحين
    // =============================================

    renderCandidatesTab(election, candidates, canApprove, isInTargetCommittee) {
        // حفظ المرشحين الحاليين للوصول من الـ handlers
        this._currentCandidates = candidates;
        this._currentFilter = this._currentFilter || 'all';
        this._currentSearch = this._currentSearch || '';

        let html = '';

        // بانر تقديم ترشح للعضو المؤهّل
        const canSubmitCandidacy = ['candidacy_open'].includes(election.status) && isInTargetCommittee;
        const myCandidacy = candidates.find(c => c.user_id === this.currentUser?.id);

        if (canSubmitCandidacy && !myCandidacy) {
            html += `
                <div class="card" style="margin-bottom: 1.5rem; border: 2px dashed var(--color-primary-light);">
                    <div class="card-body" style="text-align: center; padding: 2rem;">
                        <i class="fa-solid fa-hand-point-up fa-2x" style="color: var(--color-primary); margin-bottom: 0.5rem;"></i>
                        <p style="margin-bottom: 1rem;">هل ترغب بالتقدم للترشح لهذا المنصب؟</p>
                        <button class="btn btn-primary" id="submitCandidacyBtn">
                            <i class="fa-solid fa-user-plus"></i> تقدم للترشح
                        </button>
                    </div>
                </div>`;
        }

        // بطاقة حالة المرشح نفسه إذا قدّم بالفعل
        if (myCandidacy) {
            html += this.renderMyCandidacyBanner(myCandidacy);
        }

        // إحصائيات
        const counts = {
            total: candidates.length,
            pending: candidates.filter(c => c.status === 'pending').length,
            approved: candidates.filter(c => c.status === 'approved').length,
            rejected: candidates.filter(c => c.status === 'rejected').length,
            needs_edit: candidates.filter(c => c.status === 'needs_edit').length,
            withdrawn: candidates.filter(c => c.status === 'withdrawn').length
        };

        html += `
            <div class="stats-grid" style="margin-bottom: 1.25rem; --stats-cols: 5;">
                <div class="stat-card" style="--stat-color: #6366f1;">
                    <div class="stat-card-wrapper">
                        <div class="stat-icon"><i class="fa-solid fa-users"></i></div>
                        <div class="stat-content">
                            <div class="stat-value">${counts.total}</div>
                            <div class="stat-label">إجمالي الطلبات</div>
                        </div>
                    </div>
                </div>
                <div class="stat-card" style="--stat-color: #f59e0b;">
                    <div class="stat-card-wrapper">
                        <div class="stat-icon"><i class="fa-solid fa-clock"></i></div>
                        <div class="stat-content">
                            <div class="stat-value">${counts.pending}</div>
                            <div class="stat-label">قيد المراجعة</div>
                        </div>
                    </div>
                </div>
                <div class="stat-card" style="--stat-color: #10b981;">
                    <div class="stat-card-wrapper">
                        <div class="stat-icon"><i class="fa-solid fa-circle-check"></i></div>
                        <div class="stat-content">
                            <div class="stat-value">${counts.approved}</div>
                            <div class="stat-label">مقبول</div>
                        </div>
                    </div>
                </div>
                <div class="stat-card" style="--stat-color: #3b82f6;">
                    <div class="stat-card-wrapper">
                        <div class="stat-icon"><i class="fa-solid fa-pen-to-square"></i></div>
                        <div class="stat-content">
                            <div class="stat-value">${counts.needs_edit}</div>
                            <div class="stat-label">بانتظار التعديل</div>
                        </div>
                    </div>
                </div>
                <div class="stat-card" style="--stat-color: #ef4444;">
                    <div class="stat-card-wrapper">
                        <div class="stat-icon"><i class="fa-solid fa-circle-xmark"></i></div>
                        <div class="stat-content">
                            <div class="stat-value">${counts.rejected}</div>
                            <div class="stat-label">مرفوض</div>
                        </div>
                    </div>
                </div>
            </div>`;

        // شريط الفلاتر (بحث + شرائح)
        const chip = (key, label, count) => `
            <button class="filter-chip ${this._currentFilter === key ? 'filter-chip--active' : ''}"
                    data-candidate-filter="${key}">
                ${label} <span style="opacity: 0.7;">(${count})</span>
            </button>`;

        html += `
            <div class="filters-bar filters-bar--wrap" style="margin-bottom: 1rem;">
                <div class="filter-group" style="flex: 1; min-width: 220px;">
                    <i class="fa-solid fa-search"></i>
                    <input type="text" id="candidateSearchInput" class="form-input"
                           placeholder="ابحث باسم المرشح..." value="${this._currentSearch}">
                </div>
            </div>
            <div class="filter-chips-container" style="margin-bottom: 1.25rem;">
                ${chip('all',       'الكل',           counts.total)}
                ${chip('pending',   'قيد المراجعة',   counts.pending)}
                ${chip('approved',  'مقبول',          counts.approved)}
                ${chip('needs_edit','بانتظار التعديل',counts.needs_edit)}
                ${chip('rejected',  'مرفوض',          counts.rejected)}
                ${chip('withdrawn', 'منسحب',          counts.withdrawn)}
            </div>`;

        // تصفية بالبحث فقط (فلتر الحالة يُطبَّق لاحقاً على مستوى المجموعات)
        const searched = candidates.filter(c => {
            if (!this._currentSearch) return true;
            const q = this._currentSearch.toLowerCase();
            return (c.user?.full_name || '').toLowerCase().includes(q);
        });

        // مجموعات مرتّبة: قيد المراجعة ← بانتظار التعديل ← مقبول ← مرفوض ← منسحب
        const GROUP_ORDER = [
            { key: 'pending',    label: 'قيد المراجعة',    variant: 'warning', icon: 'fa-clock' },
            { key: 'needs_edit', label: 'بانتظار التعديل', variant: 'info',    icon: 'fa-pen-to-square' },
            { key: 'approved',   label: 'المقبولين',           variant: 'success', icon: 'fa-circle-check' },
            { key: 'rejected',   label: 'المرفوضين',           variant: 'danger',  icon: 'fa-circle-xmark' },
            { key: 'withdrawn',  label: 'المنسحبون',           variant: 'neutral', icon: 'fa-arrow-rotate-left' }
        ];

        const visibleGroups = GROUP_ORDER
            .filter(g => this._currentFilter === 'all' || this._currentFilter === g.key)
            .map(g => ({ ...g, items: searched.filter(c => c.status === g.key) }))
            .filter(g => g.items.length);

        if (!visibleGroups.length) {
            html += `
                <div class="empty-state" style="padding: 3rem 1rem; text-align: center;">
                    <div class="empty-state__icon" style="font-size: 2.5rem; opacity: 0.4;"><i class="fa-solid fa-inbox"></i></div>
                    <p class="empty-state__title" style="margin-top: 0.5rem;">${candidates.length ? 'لا نتائج مطابقة للتصفية الحالية' : 'لا يوجد مرشحون بعد'}</p>
                </div>`;
            return html;
        }

        visibleGroups.forEach(group => {
            const cards = group.items
                .map(c => this.renderCandidateCard(c, election, canApprove))
                .join('');
            html += `
                <div class="card card--${group.variant}" style="margin-bottom: 1.25rem;">
                    <div class="card-header">
                        <h3><i class="fa-solid ${group.icon}"></i> ${group.label} (${group.items.length})</h3>
                    </div>
                    <div class="card-body">
                        <div class="uc-grid">${cards}</div>
                    </div>
                </div>`;
        });

        return html;
    }

    renderMyCandidacyBanner(candidate) {
        const variant = ElectionsManager.CANDIDATE_STATUS_VARIANT[candidate.status] || ElectionsManager.CANDIDATE_STATUS_VARIANT.pending;
        const statusLabel = ElectionsManager.CANDIDATE_STATUS_LABELS[candidate.status];
        const needsEdit = candidate.status === 'needs_edit';
        const note = needsEdit ? candidate.edit_request_note
                               : (candidate.status === 'rejected' ? candidate.review_note : null);

        return `
            <div class="uc-card ${variant.uc}" style="margin-bottom: 1.25rem;">
                <div class="uc-card__header">
                    <div class="uc-card__header-inner">
                        <div class="uc-card__icon"><i class="fa-solid ${variant.icon}"></i></div>
                        <div class="uc-card__header-info">
                            <h3 class="uc-card__title">طلب ترشحك</h3>
                            <span class="uc-card__badge"><i class="fa-solid fa-circle-dot"></i> ${statusLabel}</span>
                        </div>
                    </div>
                </div>
                <div class="uc-card__body">
                    ${note ? `
                    <div class="uc-card__info-item">
                        <div class="uc-card__info-icon"><i class="fa-solid fa-comment-dots"></i></div>
                        <div class="uc-card__info-content">
                            <span class="uc-card__info-label">${needsEdit ? 'ملاحظات الإدارة للتعديل' : 'سبب الرفض'}</span>
                            <span class="uc-card__info-value" style="white-space: pre-wrap;">${this.escapeHtml(note)}</span>
                        </div>
                    </div>` : ''}
                </div>
                ${needsEdit ? `
                <div class="uc-card__footer">
                    <button class="btn btn-primary edit-my-candidacy-btn" data-candidate-id="${candidate.id}" data-election-id="${candidate.election_id}">
                        <i class="fa-solid fa-pen"></i> تعديل طلبي
                    </button>
                    <button class="btn btn-danger btn-outline withdraw-my-candidacy-btn" data-candidate-id="${candidate.id}">
                        <i class="fa-solid fa-arrow-rotate-left"></i> انسحاب
                    </button>
                </div>` : (candidate.status === 'pending' ? `
                <div class="uc-card__footer">
                    <button class="btn btn-danger btn-outline withdraw-my-candidacy-btn" data-candidate-id="${candidate.id}">
                        <i class="fa-solid fa-arrow-rotate-left"></i> انسحاب
                    </button>
                </div>` : '')}
            </div>`;
    }

    renderCandidateCard(candidate, election, canApprove) {
        const user    = candidate.user;
        const avatar  = user?.avatar_url || '../assets/default-avatar.png';
        const variant = ElectionsManager.CANDIDATE_STATUS_VARIANT[candidate.status] || ElectionsManager.CANDIDATE_STATUS_VARIANT.pending;
        const statusLabel = ElectionsManager.CANDIDATE_STATUS_LABELS[candidate.status];

        const fmt = (iso) => iso ? new Date(iso).toLocaleString('ar-SA', {
            calendar: 'gregory', numberingSystem: 'latn',
            dateStyle: 'medium', timeStyle: 'short'
        }).replace(/،\s*/, ' الساعة ') : null;

        const submittedAt = fmt(candidate.created_at);
        const reviewedAt  = fmt(candidate.reviewed_at);

        const statement = candidate.candidacy_statement
            ? (candidate.candidacy_statement.length > 180
                ? candidate.candidacy_statement.slice(0, 180) + '…'
                : candidate.candidacy_statement)
            : null;

        const canReview  = canApprove && ['pending', 'needs_edit'].includes(candidate.status);
        const canRequestEdit = canApprove && candidate.status === 'pending';
        const canRevert  = canApprove && ['approved', 'rejected'].includes(candidate.status);
        const canResetFromEdit = canApprove && candidate.status === 'needs_edit';

        return `
            <div class="uc-card ${variant.uc}" data-candidate-id="${candidate.id}">
                <div class="uc-card__header">
                    <div class="uc-card__header-inner">
                        <img class="uc-card__icon" src="${avatar}" alt="${this.escapeHtml(user?.full_name || '')}"
                             style="border-radius: 50%; object-fit: cover;">
                        <div class="uc-card__header-info">
                            <h3 class="uc-card__title uc-card__title--wrap">${this.escapeHtml(user?.full_name || 'غير معروف')}</h3>
                            <span class="uc-card__badge"><i class="fa-solid ${variant.icon}"></i> ${statusLabel}</span>
                        </div>
                    </div>
                </div>

                <div class="uc-card__body">
                    ${statement ? `
                    <div class="uc-card__info-item">
                        <div class="uc-card__info-icon"><i class="fa-solid fa-align-right"></i></div>
                        <div class="uc-card__info-content">
                            <span class="uc-card__info-label">بيان الترشح</span>
                            <span class="uc-card__info-value" style="white-space: pre-wrap;">${this.escapeHtml(statement)}</span>
                        </div>
                    </div>` : ''}

                    ${submittedAt ? `
                    <div class="uc-card__info-item">
                        <div class="uc-card__info-icon"><i class="fa-regular fa-paper-plane"></i></div>
                        <div class="uc-card__info-content">
                            <span class="uc-card__info-label">تاريخ التقديم</span>
                            <span class="uc-card__info-value">${submittedAt}</span>
                        </div>
                    </div>` : ''}

                    ${reviewedAt && ['approved', 'rejected'].includes(candidate.status) ? `
                    <div class="uc-card__info-item">
                        <div class="uc-card__info-icon"><i class="fa-solid fa-user-check"></i></div>
                        <div class="uc-card__info-content">
                            <span class="uc-card__info-label">تاريخ المراجعة</span>
                            <span class="uc-card__info-value">${reviewedAt}</span>
                        </div>
                    </div>` : ''}

                    ${candidate.status === 'rejected' && candidate.review_note ? `
                    <div class="uc-card__info-item">
                        <div class="uc-card__info-icon"><i class="fa-solid fa-comment-dots"></i></div>
                        <div class="uc-card__info-content">
                            <span class="uc-card__info-label">سبب الرفض</span>
                            <span class="uc-card__info-value" style="white-space: pre-wrap;">${this.escapeHtml(candidate.review_note)}</span>
                        </div>
                    </div>` : ''}

                    ${candidate.status === 'needs_edit' && candidate.edit_request_note ? `
                    <div class="uc-card__info-item">
                        <div class="uc-card__info-icon"><i class="fa-solid fa-comment-dots"></i></div>
                        <div class="uc-card__info-content">
                            <span class="uc-card__info-label">ملاحظات التعديل</span>
                            <span class="uc-card__info-value" style="white-space: pre-wrap;">${this.escapeHtml(candidate.edit_request_note)}</span>
                        </div>
                    </div>` : ''}

                    ${candidate.status === 'withdrawn' && candidate.withdrawal_reason ? `
                    <div class="uc-card__info-item">
                        <div class="uc-card__info-icon"><i class="fa-solid fa-comment-dots"></i></div>
                        <div class="uc-card__info-content">
                            <span class="uc-card__info-label">سبب الانسحاب</span>
                            <span class="uc-card__info-value" style="white-space: pre-wrap;">${this.escapeHtml(candidate.withdrawal_reason)}</span>
                        </div>
                    </div>` : ''}

                    <div class="uc-card__info-item uc-card__info-item--link">
                        ${candidate.election_file_url ? `
                            <a class="uc-card__link-btn" href="${candidate.election_file_url}" target="_blank" rel="noopener" title="فتح الملف">
                                <i class="fa-solid fa-file-arrow-down"></i>
                            </a>
                        ` : ''}
                        <div class="uc-card__info-icon"><i class="fa-solid fa-paperclip"></i></div>
                        <div class="uc-card__info-content">
                            <span class="uc-card__info-label">الملف الانتخابي</span>
                            <span class="uc-card__info-value">
                                ${candidate.election_file_url
                                    ? 'متوفّر — اضغط للتحميل'
                                    : '<span style="opacity: 0.55;">لم يُرفع ملف</span>'
                                }
                            </span>
                        </div>
                    </div>
                </div>

                <div class="uc-card__footer" style="flex-wrap: wrap; gap: 0.5rem;">
                    <button class="btn ${variant.btnClass} view-candidate-btn" data-candidate-id="${candidate.id}">
                        <i class="fa-solid fa-eye"></i> عرض التفاصيل
                    </button>
                    ${canReview ? `
                        <button class="btn btn-success approve-candidate-btn" data-candidate-id="${candidate.id}">
                            <i class="fa-solid fa-check"></i> قبول
                        </button>
                        <button class="btn btn-danger reject-candidate-btn" data-candidate-id="${candidate.id}">
                            <i class="fa-solid fa-xmark"></i> رفض
                        </button>
                    ` : ''}
                    ${canRequestEdit ? `
                        <button class="btn btn-primary request-edit-btn" data-candidate-id="${candidate.id}">
                            <i class="fa-solid fa-pen-to-square"></i> طلب تعديل
                        </button>` : ''}
                    ${canResetFromEdit ? `
                        <button class="btn btn-slate reset-to-pending-btn" data-candidate-id="${candidate.id}">
                            <i class="fa-solid fa-rotate-left"></i> التراجع عن طلب التعديل
                        </button>` : ''}
                    ${canRevert ? `
                        <button class="btn btn-warning btn-outline btn-sm reset-to-pending-btn" data-candidate-id="${candidate.id}">
                            <i class="fa-solid fa-rotate-left"></i> إرجاع للمراجعة
                        </button>` : ''}
                </div>
            </div>`;
    }

    escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // =============================================
    // تبويب التصويت
    // =============================================

    renderVotingTab(election, candidates, myVote) {
        if (election.status !== 'voting_open') {
            const msg = ['candidacy_open', 'candidacy_closed'].includes(election.status)
                ? 'التصويت لم يبدأ بعد' : 'التصويت منتهي';
            return `<div style="text-align: center; padding: 2rem; color: var(--text-secondary);"><i class="fa-solid fa-clock fa-2x" style="margin-bottom: 0.5rem; opacity: 0.3;"></i><p>${msg}</p></div>`;
        }

        const approvedCandidates = candidates.filter(c => c.status === 'approved');
        if (!approvedCandidates.length) {
            return `<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">لا يوجد مرشحون معتمدون</div>`;
        }

        // وزن صوت المستخدم الحالي
        const userWeight = this.getUserVoteWeight();

        let html = `
            <div class="card" style="margin-bottom: 1.5rem; background: var(--bg-secondary);">
                <div class="card-body" style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
                    <div>
                        <span style="color: var(--text-secondary); font-size: 0.85rem;">وزن صوتك:</span>
                        <strong style="font-size: 1.2rem; color: var(--color-primary); margin-right: 0.3rem;">${userWeight}</strong>
                    </div>
                    ${myVote ? `
                    <div style="padding: 0.4rem 1rem; border-radius: 0.5rem; background: #10b98120; color: #10b981; font-weight: 600;">
                        <i class="fa-solid fa-check-circle"></i> لقد صوّتت بالفعل
                    </div>` : ''}
                </div>
            </div>`;

        html += '<div class="uc-grid">';
        approvedCandidates.forEach(candidate => {
            const user = candidate.user;
            const avatar = user?.avatar_url || '../assets/default-avatar.png';
            const isVotedFor = myVote?.candidate_id === candidate.id;

            html += `
                <div class="uc-card" ${isVotedFor ? 'style="border: 2px solid #10b981;"' : ''}>
                    <div class="uc-card__header">
                        <img class="uc-card__icon" src="${avatar}" alt="${user?.full_name}" style="border-radius: 50%; width: 48px; height: 48px; object-fit: cover;">
                        <div>
                            <h3 class="uc-card__title">${user?.full_name || 'غير معروف'}</h3>
                            ${isVotedFor ? '<span style="color: #10b981; font-size: 0.8rem;"><i class="fa-solid fa-check"></i> اخترت هذا المرشح</span>' : ''}
                        </div>
                    </div>
                    <div class="uc-card__body">
                        ${candidate.candidacy_statement ? `<p style="color: var(--text-secondary); font-size: 0.9rem;">${candidate.candidacy_statement}</p>` : ''}
                    </div>
                    ${!myVote ? `
                    <div class="uc-card__footer">
                        <button class="btn btn-primary cast-vote-btn" data-candidate-id="${candidate.id}">
                            <i class="fa-solid fa-check-to-slot"></i> صوّت لهذا المرشح
                        </button>
                    </div>` : ''}
                </div>`;
        });
        html += '</div>';
        return html;
    }

    // =============================================
    // تبويب النتائج
    // =============================================

    renderResultsTab(election, results, canManage) {
        if (!['voting_open', 'voting_closed', 'completed'].includes(election.status)) {
            return `<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">النتائج غير متاحة بعد</div>`;
        }

        if (!results.length) {
            return `<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">لا توجد نتائج</div>`;
        }

        const maxVotes = Math.max(...results.map(r => Number(r.total_weighted_votes)), 1);

        let html = '<div style="display: grid; gap: 1rem;">';
        results.forEach((result, index) => {
            const percentage = (Number(result.total_weighted_votes) / maxVotes * 100).toFixed(1);
            const avatar = result.avatar_url || '../assets/default-avatar.png';
            const isWinner = election.winner_user_id === result.user_id;
            const medalColors = ['#fbbf24', '#94a3b8', '#cd7f32'];
            const medal = index < 3 ? `<span style="color: ${medalColors[index]}; font-size: 1.3rem; margin-left: 0.5rem;"><i class="fa-solid fa-trophy"></i></span>` : '';

            html += `
                <div class="card" ${isWinner ? 'style="border: 2px solid #10b981;"' : ''}>
                    <div class="card-body">
                        <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.75rem;">
                            <span style="font-size: 1.5rem; font-weight: 700; color: var(--text-secondary); min-width: 2rem;">#${index + 1}</span>
                            <img src="${avatar}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                            <div style="flex: 1;">
                                <strong>${result.full_name}</strong>
                                ${medal}
                                ${isWinner ? '<span style="color: #10b981; font-size: 0.8rem; margin-right: 0.5rem;"><i class="fa-solid fa-crown"></i> الفائز</span>' : ''}
                            </div>
                            <div style="text-align: left;">
                                <strong style="font-size: 1.2rem;">${Number(result.total_weighted_votes).toFixed(1)}</strong>
                                <span style="color: var(--text-secondary); font-size: 0.8rem;"> نقطة</span>
                                <br><span style="color: var(--text-secondary); font-size: 0.8rem;">(${result.vote_count} صوت)</span>
                            </div>
                        </div>
                        <div style="background: var(--bg-secondary); border-radius: 999px; height: 8px; overflow: hidden;">
                            <div style="background: var(--color-primary); height: 100%; width: ${percentage}%; border-radius: 999px; transition: width 0.5s;"></div>
                        </div>
                    </div>
                </div>`;
        });
        html += '</div>';

        // زر إعلان الفائز
        if (canManage && election.status === 'voting_closed' && results.length && !election.winner_user_id) {
            const topCandidate = results[0];
            html += `
                <div style="text-align: center; margin-top: 1.5rem;">
                    <button class="btn btn-success declare-winner-btn" data-candidate-user-id="${topCandidate.user_id}">
                        <i class="fa-solid fa-crown"></i> إعلان ${topCandidate.full_name} فائزاً
                    </button>
                </div>`;
        }

        return html;
    }

    // =============================================
    // ربط أحداث صفحة التفاصيل
    // =============================================

    bindDetailEvents(container, election) {
        // الرجوع لقائمة الانتخابات (breadcrumb)
        container.querySelector('#backToElectionsListBtn')?.addEventListener('click', () => this.showListView());

        // تقديم ترشح
        container.querySelector('#submitCandidacyBtn')?.addEventListener('click', () => {
            this.showCandidacyModal(election.id);
        });

        // قبول/رفض مرشح
        container.querySelectorAll('.approve-candidate-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.confirmApprove(btn.dataset.candidateId);
            });
        });
        container.querySelectorAll('.reject-candidate-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showRejectModal(btn.dataset.candidateId);
            });
        });

        // طلب تعديل
        container.querySelectorAll('.request-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showRequestEditModal(btn.dataset.candidateId);
            });
        });

        // إرجاع للمراجعة (من مقبول/مرفوض/بانتظار التعديل)
        container.querySelectorAll('.reset-to-pending-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.resetCandidateToPending(btn.dataset.candidateId);
            });
        });

        // عرض التفاصيل الكاملة
        container.querySelectorAll('.view-candidate-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showCandidateDetailsModal(btn.dataset.candidateId);
            });
        });

        // أزرار المرشح نفسه (تعديل/انسحاب)
        container.querySelectorAll('.edit-my-candidacy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showEditMyCandidacyModal(btn.dataset.candidateId, btn.dataset.electionId);
            });
        });
        container.querySelectorAll('.withdraw-my-candidacy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.withdrawMyCandidacy(btn.dataset.candidateId);
            });
        });

        // بحث + شرائح فلترة
        const searchInput = container.querySelector('#candidateSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this._currentSearch = e.target.value;
                this.rerenderCandidatesTab(election);
            });
        }
        container.querySelectorAll('[data-candidate-filter]').forEach(chip => {
            chip.addEventListener('click', (e) => {
                e.stopPropagation();
                this._currentFilter = chip.dataset.candidateFilter;
                this.rerenderCandidatesTab(election);
            });
        });

        // التصويت
        container.querySelectorAll('.cast-vote-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.confirmVote(election.id, btn.dataset.candidateId);
            });
        });

        // إعلان الفائز
        container.querySelector('.declare-winner-btn')?.addEventListener('click', (e) => {
            this.declareWinner(election.id, e.currentTarget.dataset.candidateUserId);
        });
    }

    // =============================================
    // عمليات CRUD
    // =============================================

    async updateElectionStatus(electionId, newStatus) {
        const confirmed = await this.confirmAction(
            newStatus === 'cancelled' ? 'هل أنت متأكد من إلغاء هذا الانتخاب؟' :
            `هل تريد تغيير حالة الانتخاب إلى "${ElectionsManager.STATUS_LABELS[newStatus]}"؟`
        );
        if (!confirmed) return;

        try {
            const { error } = await this.supabase
                .from('elections')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', electionId);

            if (error) {
                if (error.code === 'P0001') {
                    this.showError(error.message || 'تعذّر تحديث الحالة');
                    return;
                }
                throw error;
            }
            this.showSuccess('تم تحديث حالة الانتخاب');
            await this.loadElections();
            const openSection = document.getElementById('elections-open-section');
            if (openSection && !openSection.classList.contains('d-none')) {
                this.renderOpenSection();
            } else {
                await this.showElectionDetail(electionId);
            }
        } catch (error) {
            console.error('Error updating election status:', error);
            this.showError('حدث خطأ أثناء تحديث الحالة');
        }
    }

    async showCandidacyModal(electionId) {
        const election = this.elections.find(e => e.id === electionId)
            || this.eligibleElections?.find(e => e.id === electionId);
        const positionName = election ? this.getElectionName(election) : '';

        let modalRef = null;
        modalRef = await window.ModalHelper.show({
            title: 'تقديم طلب ترشح',
            iconClass: 'fa-user-plus',
            size: 'md',
            type: 'success',
            html: `
                <form id="candidacyForm" class="form-stack">
                    ${positionName ? `
                    <small>
                        <i class="fa-solid fa-circle-info"></i>
                        <span>ستتقدّم للترشح لمنصب <strong>${positionName}</strong></span>
                    </small>` : ''}
                    <div class="form-group">
                        <label class="form-label">
                            <i class="label-icon fa-solid fa-align-right"></i> بيان الترشح
                        </label>
                        <textarea id="candidacyStatement" class="form-input" rows="5" placeholder="اكتب بيانك الانتخابي هنا..." style="resize: vertical;"></textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">
                            <i class="label-icon fa-solid fa-file-arrow-up"></i> الملف الانتخابي
                        </label>
                        <div class="form-file">
                            <input type="file" id="candidacyFile" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt">
                            <div class="form-dropzone">
                                <div class="form-dropzone-icon"><i class="fa-solid fa-cloud-arrow-up"></i></div>
                                <div class="form-dropzone-title">اسحب وأفلت الملف هنا</div>
                                <div class="form-dropzone-hint">أو انقر للاختيار · PDF, DOC/DOCX, TXT أو صورة · حتى ${ElectionsManager.CANDIDACY_FILE_MAX_LABEL} (اختياري)</div>
                            </div>
                        </div>
                        <div class="form-file-list" id="candidacyFileList" style="display: none;"></div>
                    </div>
                </form>`,
            showFooter: true,
            footerButtons: [
                { text: 'إلغاء', class: 'btn btn-outline' },
                {
                    text: '<i class="fa-solid fa-paper-plane"></i> تقديم الترشح',
                    class: 'btn btn-success',
                    keepOpen: true,
                    callback: () => this.submitCandidacy(electionId, modalRef)
                }
            ]
        });

        const fileInput = modalRef?.element?.querySelector('#candidacyFile');
        const fileList  = modalRef?.element?.querySelector('#candidacyFileList');
        if (fileInput && fileList) {
            const fileIconFor = (name) => {
                const ext = (name || '').split('.').pop().toLowerCase();
                if (ext === 'pdf') return 'fa-regular fa-file-pdf';
                if (['doc', 'docx'].includes(ext)) return 'fa-regular fa-file-word';
                if (ext === 'txt') return 'fa-regular fa-file-lines';
                if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) return 'fa-regular fa-file-image';
                return 'fa-regular fa-file';
            };
            const fmtSize = (b) => {
                if (b < 1024) return `${b} B`;
                if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
                return `${(b / 1024 / 1024).toFixed(1)} MB`;
            };
            const render = () => {
                const f = fileInput.files?.[0];
                if (!f) {
                    fileList.style.display = 'none';
                    fileList.innerHTML = '';
                    return;
                }
                if (f.size > ElectionsManager.CANDIDACY_FILE_MAX_BYTES) {
                    this.showError(`الحد الأقصى لحجم الملف الانتخابي هو ${ElectionsManager.CANDIDACY_FILE_MAX_LABEL} — حجم الملف المختار ${fmtSize(f.size)}`);
                    fileInput.value = '';
                    fileList.style.display = 'none';
                    fileList.innerHTML = '';
                    return;
                }
                fileList.style.display = '';
                fileList.innerHTML = `
                    <div class="form-file-item">
                        <div class="form-file-icon"><i class="${fileIconFor(f.name)}"></i></div>
                        <span class="form-file-name">${this.escapeHtml(f.name)}</span>
                        <span class="form-file-size">${fmtSize(f.size)}</span>
                        <button type="button" class="form-file-remove" aria-label="إزالة"><i class="fa-solid fa-xmark"></i></button>
                    </div>`;
                fileList.querySelector('.form-file-remove')?.addEventListener('click', () => {
                    fileInput.value = '';
                    render();
                });
            };
            fileInput.addEventListener('change', render);
        }
    }

    async submitCandidacy(electionId, modalRef = null) {
        const statement = document.getElementById('candidacyStatement')?.value?.trim();
        const fileInput = document.getElementById('candidacyFile');
        let fileUrl = null;

        const election = (this.eligibleElections || []).find(e => e.id === electionId)
                      || (this.elections || []).find(e => e.id === electionId);
        const ineligibleReason = election ? this.getIneligibilityReason(election) : null;
        if (ineligibleReason) {
            this.showError(ineligibleReason);
            return;
        }

        if (fileInput?.files?.[0]?.size > ElectionsManager.CANDIDACY_FILE_MAX_BYTES) {
            this.showError(`الحد الأقصى لحجم الملف الانتخابي هو ${ElectionsManager.CANDIDACY_FILE_MAX_LABEL}`);
            return;
        }

        try {
            // رفع الملف إذا وُجد
            if (fileInput?.files?.length) {
                const file = fileInput.files[0];
                const ext = file.name.split('.').pop();
                const path = `${electionId}/${this.currentUser.id}/election-file.${ext}`;

                const { data, error: uploadError } = await this.supabase.storage
                    .from('election-applications')
                    .upload(path, file, { upsert: true });

                if (uploadError) throw uploadError;

                const { data: urlData } = this.supabase.storage
                    .from('election-applications')
                    .getPublicUrl(path);
                fileUrl = urlData?.publicUrl;
            }

            const { error } = await this.supabase
                .from('election_candidates')
                .insert({
                    election_id: electionId,
                    user_id: this.currentUser.id,
                    candidacy_statement: statement || null,
                    election_file_url: fileUrl
                });

            if (error) throw error;

            modalRef?.close?.();
            this.showSuccess('تم تقديم طلب الترشح بنجاح');

            await window.rebuildNavigation?.();

            const candidacySection = document.getElementById('candidacy-section');
            if (candidacySection && !candidacySection.classList.contains('d-none')) {
                window.navigateToSection?.('candidacy-section');
            } else {
                await this.showElectionDetail(electionId);
            }
        } catch (error) {
            console.error('Error submitting candidacy:', error);
            const dbMsg = error?.code === 'P0001' ? error.message : null;
            this.showError(dbMsg || 'حدث خطأ أثناء تقديم الترشح');
        }
    }

    async reviewCandidate(candidateId, status, note = '') {
        try {
            const { error } = await this.supabase
                .from('election_candidates')
                .update({
                    status,
                    reviewed_by: this.currentUser.id,
                    review_note: note || null,
                    reviewed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', candidateId);

            if (error) throw error;

            this.showSuccess(status === 'approved' ? 'تم قبول المرشح' : 'تم رفض المرشح');
            if (this.currentElection) {
                await this.showElectionDetail(this.currentElection.id);
            }
        } catch (error) {
            console.error('Error reviewing candidate:', error);
            this.showError('حدث خطأ أثناء مراجعة المرشح');
        }
    }

    async showRejectModal(candidateId) {
        await window.ModalHelper.show({
            title: 'رفض المرشح',
            size: 'sm',
            type: 'danger',
            html: `
                <div class="form-group">
                    <label class="form-label"><span class="label-icon"><i class="fa-solid fa-circle-xmark"></i></span> سبب الرفض (اختياري)</label>
                    <textarea id="rejectNote" class="form-input" rows="3" placeholder="اكتب سبب الرفض..." style="resize: vertical;"></textarea>
                </div>`,
            showFooter: true,
            footerButtons: [
                { text: 'إلغاء', class: 'btn btn-outline', dismiss: true },
                {
                    text: '<i class="fa-solid fa-xmark"></i> رفض',
                    class: 'btn btn-danger',
                    callback: () => {
                        const note = document.getElementById('rejectNote')?.value?.trim();
                        this.reviewCandidate(candidateId, 'rejected', note);
                    }
                }
            ]
        });
    }

    async confirmApprove(candidateId) {
        const confirmed = await this.confirmAction('هل تريد قبول هذا المرشح؟');
        if (!confirmed) return;
        this.reviewCandidate(candidateId, 'approved');
    }

    async showRequestEditModal(candidateId) {
        let modalRef = null;
        modalRef = await window.ModalHelper.show({
            title: 'طلب تعديل من المرشح',
            iconClass: 'fa-pen-to-square',
            size: 'sm',
            type: 'primary',
            html: `
                <div class="form-group">
                    <label class="form-label"><span class="label-icon"><i class="fa-solid fa-pen-to-square"></i></span> ما المطلوب تعديله؟ <span class="required-dot">*</span></label>
                    <textarea id="editRequestNote" class="form-input" rows="4"
                              placeholder="اكتب بوضوح ما تريد من المرشح تعديله في بيانه أو ملفه الانتخابي..."
                              style="resize: vertical;"></textarea>
                    <small>
                        <i class="fa-solid fa-circle-info"></i>
                        <span>سيظهر هذا النص للمرشح، ويستطيع تعديل طلبه وإعادة إرساله.</span>
                    </small>
                </div>`,
            showFooter: true,
            footerButtons: [
                { text: 'إلغاء', class: 'btn btn-outline', dismiss: true },
                {
                    text: '<i class="fa-solid fa-paper-plane"></i> إرسال طلب التعديل',
                    class: 'btn btn-primary',
                    keepOpen: true,
                    callback: async () => {
                        const note = document.getElementById('editRequestNote')?.value?.trim();
                        if (!note) {
                            this.showError('يرجى كتابة ملاحظات التعديل');
                            return;
                        }
                        await this.requestCandidateEdit(candidateId, note);
                        modalRef?.close?.();
                    }
                }
            ]
        });
    }

    async requestCandidateEdit(candidateId, note) {
        try {
            const { data: existing, error: fetchError } = await this.supabase
                .from('election_candidates')
                .select('edit_requests_log')
                .eq('id', candidateId)
                .single();
            if (fetchError) throw fetchError;

            const now = new Date().toISOString();
            const log = Array.isArray(existing?.edit_requests_log) ? existing.edit_requests_log : [];
            log.push({ at: now, by: this.currentUser.id, note });

            const { error } = await this.supabase
                .from('election_candidates')
                .update({
                    status: 'needs_edit',
                    edit_request_note: note,
                    edit_requested_by: this.currentUser.id,
                    edit_requested_at: now,
                    edit_requests_log: log,
                    updated_at: now
                })
                .eq('id', candidateId);
            if (error) throw error;
            this.showSuccess('تم إرسال طلب التعديل للمرشح');
            if (this.currentElection) await this.showElectionDetail(this.currentElection.id);
        } catch (error) {
            console.error('Error requesting edit:', error);
            this.showError('حدث خطأ أثناء إرسال طلب التعديل');
        }
    }

    async resetCandidateToPending(candidateId) {
        const confirmed = await this.confirmAction('هل تريد إرجاع الطلب إلى حالة "قيد المراجعة"؟');
        if (!confirmed) return;
        try {
            const { error } = await this.supabase
                .from('election_candidates')
                .update({
                    status: 'pending',
                    review_note: null,
                    reviewed_by: null,
                    reviewed_at: null,
                    edit_request_note: null,
                    edit_requested_by: null,
                    edit_requested_at: null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', candidateId);
            if (error) throw error;
            this.showSuccess('تم إرجاع الطلب للمراجعة');
            if (this.currentElection) await this.showElectionDetail(this.currentElection.id);
        } catch (error) {
            console.error('Error resetting candidate:', error);
            this.showError('حدث خطأ أثناء إرجاع الطلب');
        }
    }

    async showCandidateDetailsModal(candidateId) {
        const c = (this._currentCandidates || []).find(x => x.id === candidateId);
        if (!c) return;
        const u = c.user || {};
        const avatar = u.avatar_url || '../assets/default-avatar.png';
        const variant = ElectionsManager.CANDIDATE_STATUS_VARIANT[c.status] || ElectionsManager.CANDIDATE_STATUS_VARIANT.pending;
        const statusLabel = ElectionsManager.CANDIDATE_STATUS_LABELS[c.status];

        const modalTypeMap = {
            pending: 'warning',
            approved: 'success',
            rejected: 'danger',
            withdrawn: 'info',
            needs_edit: 'primary'
        };
        const modalType = modalTypeMap[c.status] || 'primary';

        const fmt = (iso) => iso ? new Date(iso).toLocaleString('ar-SA', {
            calendar: 'gregory', numberingSystem: 'latn', dateStyle: 'medium', timeStyle: 'short'
        }).replace(/،\s*/, ' الساعة ') : '—';

        const reviewerName = c.reviewer?.full_name || null;

        await window.ModalHelper.show({
            title: 'تفاصيل طلب الترشح',
            iconClass: 'fa-user-tie',
            size: 'md',
            type: modalType,
            html: `
                <div class="modal-media modal-media--avatar">
                    <img src="${avatar}" alt="${this.escapeHtml(u.full_name || '')}">
                    <div class="avatar-name">${this.escapeHtml(u.full_name || 'غير معروف')}</div>
                    ${u.email ? `<div class="avatar-meta">${this.escapeHtml(u.email)}</div>` : ''}
                    <span class="avatar-badge">
                        <i class="fa-solid ${variant.icon}"></i> ${statusLabel}
                    </span>
                </div>

                <div class="modal-section">
                    <h3><i class="fa-solid fa-align-right"></i> بيان الترشح</h3>
                    ${c.candidacy_statement
                        ? `<p style="white-space: pre-wrap; margin: 0; line-height: 1.8;">${this.escapeHtml(c.candidacy_statement)}</p>`
                        : `<div class="modal-info-box"><i class="fa-solid fa-circle-info"></i><span>لا يوجد بيان ترشّح.</span></div>`
                    }
                </div>

                <div class="modal-section">
                    <h3><i class="fa-solid fa-paperclip"></i> الملف الانتخابي</h3>
                    ${c.election_file_url
                        ? `<button type="button" class="btn btn-block ${variant.btnClass}" onclick="window.open('${c.election_file_url}', '_blank', 'noopener')">
                                <i class="fa-solid fa-file-arrow-down"></i> عرض/تحميل الملف
                            </button>`
                        : `<div class="modal-info-box"><i class="fa-solid fa-file-circle-xmark"></i><span>لم يُرفَق أي ملف.</span></div>`
                    }
                </div>

                <div class="modal-section">
                    <h3><i class="fa-solid fa-clock-rotate-left"></i> سجل الطلب</h3>
                    <div class="modal-detail-grid">
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">تاريخ التقديم</span>
                            <span class="modal-detail-value">${fmt(c.created_at)}</span>
                        </div>
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">آخر تحديث</span>
                            <span class="modal-detail-value">${fmt(c.updated_at)}</span>
                        </div>
                        ${['approved', 'rejected'].includes(c.status) ? `
                        <div class="modal-detail-item${reviewerName ? '' : ' modal-detail-item--empty'}">
                            <span class="modal-detail-label">المراجِع</span>
                            <span class="modal-detail-value">${reviewerName ? this.escapeHtml(reviewerName) : '—'}</span>
                        </div>
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">تاريخ المراجعة</span>
                            <span class="modal-detail-value">${fmt(c.reviewed_at)}</span>
                        </div>` : ''}
                    </div>
                </div>

                ${c.status === 'rejected' && c.review_note ? `
                <div class="modal-info-box box-danger">
                    <i class="fa-solid fa-circle-xmark"></i>
                    <span><strong>سبب الرفض:</strong> ${this.escapeHtml(c.review_note)}</span>
                </div>` : ''}

                ${c.status === 'needs_edit' && c.edit_request_note ? `
                <div class="modal-info-box box-info">
                    <i class="fa-solid fa-pen-to-square"></i>
                    <span><strong>ملاحظات طلب التعديل:</strong> ${this.escapeHtml(c.edit_request_note)}</span>
                </div>` : ''}

                ${c.status === 'withdrawn' && c.withdrawal_reason ? `
                <div class="modal-info-box">
                    <i class="fa-solid fa-arrow-rotate-left"></i>
                    <span><strong>سبب الانسحاب:</strong> ${this.escapeHtml(c.withdrawal_reason)}</span>
                </div>` : ''}
            `,
            showFooter: true,
            footerButtons: [
                { text: 'إغلاق', class: 'btn btn-outline', dismiss: true }
            ]
        });
    }

    rerenderCandidatesTab(election) {
        const container = document.getElementById('election-tab-candidates');
        if (!container) return;
        const canApprove = this.canApproveCandidates();
        const isInTargetCommittee = this.isUserInCommittee(election.target_committee_id);
        container.innerHTML = this.renderCandidatesTab(
            election,
            this._currentCandidates || [],
            canApprove,
            isInTargetCommittee
        );
        const detailContainer = document.getElementById('election-detail-content');
        if (detailContainer) this.bindDetailEvents(detailContainer, election);
    }

    async showEditMyCandidacyModal(candidateId, electionId, scope = 'all') {
        const c = (this._currentCandidates || []).find(x => x.id === candidateId)
               || (this.myCandidacies || []).find(x => x.id === candidateId);
        const election = (this.elections || []).find(e => e.id === electionId)
                      || (this.eligibleElections || []).find(e => e.id === electionId);
        const positionName = election ? this.getElectionName(election) : '';
        const currentStatement = c?.candidacy_statement || '';
        const editNote = c?.status === 'needs_edit' ? (c?.edit_request_note || '') : '';
        const currentFileUrl = c?.election_file_url || '';
        const currentFileName = currentFileUrl
            ? decodeURIComponent(currentFileUrl.split('/').pop().split('?')[0])
            : '';
        const currentFileExt = currentFileName.split('.').pop().toLowerCase();
        const currentFileIcon = currentFileExt === 'pdf'
            ? 'fa-regular fa-file-pdf'
            : (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(currentFileExt)
                ? 'fa-regular fa-file-image'
                : 'fa-regular fa-file');

        const showStatement = scope === 'all' || scope === 'statement';
        const showFile      = scope === 'all' || scope === 'file';
        const modalTitle = scope === 'statement' ? 'تعديل البيان الانتخابي'
                         : scope === 'file'      ? 'تعديل الملف الانتخابي'
                         : 'تعديل طلب الترشح';

        let modalRef = null;
        modalRef = await window.ModalHelper.show({
            title: modalTitle,
            iconClass: 'fa-pen',
            size: 'md',
            html: `
                <form id="editCandidacyForm" class="form-stack">
                    ${editNote ? `
                    <div class="modal-info-box box-info">
                        <i class="fa-solid fa-comment-dots"></i>
                        <span style="white-space: pre-wrap;"><strong>ملاحظات الإدارة:</strong> ${this.escapeHtml(editNote)}</span>
                    </div>` : ''}
                    ${showStatement ? `
                    <div class="form-group">
                        <label class="form-label"><span class="label-icon"><i class="fa-solid fa-align-right"></i></span> بيان الترشح</label>
                        <textarea id="editCandidacyStatement" class="form-input" rows="5"
                                  style="resize: vertical;"
                                  placeholder="اكتب بيانك الانتخابي هنا...">${this.escapeHtml(currentStatement)}</textarea>
                    </div>` : ''}
                    ${showFile ? `
                    <div class="form-group">
                        <label class="form-label"><span class="label-icon"><i class="fa-solid fa-cloud-arrow-up"></i></span> الملف الانتخابي${scope === 'file' ? '' : ' (اختياري)'}</label>
                        ${currentFileUrl ? `
                        <div class="form-file-list" id="editCandidacyCurrentFile">
                            <div class="form-file-item">
                                <div class="form-file-icon"><i class="${currentFileIcon}"></i></div>
                                <span class="form-file-name">${this.escapeHtml(currentFileName)}</span>
                                <a href="${currentFileUrl}" target="_blank" rel="noopener" class="btn btn-primary btn-sm btn-outline btn-icon" title="فتح الملف الحالي">
                                    <i class="fa-solid fa-up-right-from-square"></i>
                                </a>
                            </div>
                        </div>` : ''}
                        <div class="form-file">
                            <input type="file" id="editCandidacyFile" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt">
                            <div class="form-dropzone form-dropzone-compact">
                                <div class="form-dropzone-icon"><i class="fa-solid fa-paperclip"></i></div>
                                <div>
                                    <div class="form-dropzone-title">${currentFileUrl ? 'انقر لاستبدال الملف' : 'انقر لرفع الملف الانتخابي'}</div>
                                    <div class="form-dropzone-hint">PDF, DOC/DOCX, TXT, PNG, JPG · حتى ${ElectionsManager.CANDIDACY_FILE_MAX_LABEL} — اتركه فارغاً للإبقاء على الملف الحالي</div>
                                </div>
                            </div>
                        </div>
                        <div class="form-file-list" id="editCandidacyFileList" style="display: none;"></div>
                    </div>` : ''}
                </form>`,
            showFooter: true,
            footerButtons: [
                { text: 'إلغاء', class: 'btn btn-outline', dismiss: true },
                {
                    text: '<i class="fa-solid fa-paper-plane"></i> حفظ وإعادة الإرسال',
                    class: 'btn btn-primary',
                    keepOpen: true,
                    callback: () => this.updateMyCandidacy(candidateId, electionId, modalRef)
                }
            ]
        });

        const fileInput = modalRef?.element?.querySelector('#editCandidacyFile');
        const fileList  = modalRef?.element?.querySelector('#editCandidacyFileList');
        const currentFileBox = modalRef?.element?.querySelector('#editCandidacyCurrentFile');
        if (fileInput && fileList) {
            const fileIconFor = (name) => {
                const ext = (name || '').split('.').pop().toLowerCase();
                if (ext === 'pdf') return 'fa-regular fa-file-pdf';
                if (['doc', 'docx'].includes(ext)) return 'fa-regular fa-file-word';
                if (ext === 'txt') return 'fa-regular fa-file-lines';
                if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) return 'fa-regular fa-file-image';
                return 'fa-regular fa-file';
            };
            const fmtSize = (b) => {
                if (b < 1024) return `${b} B`;
                if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
                return `${(b / 1024 / 1024).toFixed(1)} MB`;
            };
            const render = () => {
                const f = fileInput.files?.[0];
                if (!f) {
                    fileList.style.display = 'none';
                    fileList.innerHTML = '';
                    if (currentFileBox) currentFileBox.style.display = '';
                    return;
                }
                if (f.size > ElectionsManager.CANDIDACY_FILE_MAX_BYTES) {
                    this.showError(`الحد الأقصى لحجم الملف الانتخابي هو ${ElectionsManager.CANDIDACY_FILE_MAX_LABEL} — حجم الملف المختار ${fmtSize(f.size)}`);
                    fileInput.value = '';
                    fileList.style.display = 'none';
                    fileList.innerHTML = '';
                    if (currentFileBox) currentFileBox.style.display = '';
                    return;
                }
                if (currentFileBox) currentFileBox.style.display = 'none';
                fileList.style.display = '';
                fileList.innerHTML = `
                    <div class="form-file-item">
                        <div class="form-file-icon"><i class="${fileIconFor(f.name)}"></i></div>
                        <span class="form-file-name">${this.escapeHtml(f.name)}</span>
                        <span class="form-file-size">${fmtSize(f.size)}</span>
                        <button type="button" class="form-file-remove" aria-label="إزالة"><i class="fa-solid fa-xmark"></i></button>
                    </div>`;
                fileList.querySelector('.form-file-remove')?.addEventListener('click', () => {
                    fileInput.value = '';
                    render();
                });
            };
            fileInput.addEventListener('change', render);
        }
    }

    async updateMyCandidacy(candidateId, electionId, modalRef = null) {
        const statementInput = document.getElementById('editCandidacyStatement');
        const fileInput = document.getElementById('editCandidacyFile');
        const hasStatementField = !!statementInput;
        const hasFileField      = !!fileInput;
        const statement = hasStatementField ? (statementInput.value?.trim() || null) : null;
        const hasNewFile = hasFileField && !!fileInput?.files?.length;

        const current = (this._currentCandidates || []).find(x => x.id === candidateId)
                     || (this.myCandidacies || []).find(x => x.id === candidateId);
        const currentStatement = current?.candidacy_statement || null;
        const statementChanged = hasStatementField && (statement || null) !== (currentStatement || null);

        if (!statementChanged && !hasNewFile) {
            const msg = hasStatementField && hasFileField ? 'لم تُجرِ أي تعديل على البيان أو الملف الانتخابي'
                      : hasStatementField ? 'لم تُجرِ أي تعديل على البيان'
                      : 'لم تختر ملفاً جديداً';
            this.showError(msg);
            return;
        }

        if (hasNewFile && fileInput.files[0].size > ElectionsManager.CANDIDACY_FILE_MAX_BYTES) {
            this.showError(`الحد الأقصى لحجم الملف الانتخابي هو ${ElectionsManager.CANDIDACY_FILE_MAX_LABEL}`);
            return;
        }

        try {
            const patch = {
                status: 'pending',
                updated_at: new Date().toISOString()
            };
            if (statementChanged) patch.candidacy_statement = statement;

            if (hasNewFile) {
                const file = fileInput.files[0];
                const ext = file.name.split('.').pop();
                const path = `${electionId}/${this.currentUser.id}/election-file.${ext}`;
                const { error: uploadError } = await this.supabase.storage
                    .from('election-applications')
                    .upload(path, file, { upsert: true });
                if (uploadError) throw uploadError;
                const { data: urlData } = this.supabase.storage
                    .from('election-applications')
                    .getPublicUrl(path);
                patch.election_file_url = urlData?.publicUrl || null;
            }

            const { error } = await this.supabase
                .from('election_candidates')
                .update(patch)
                .eq('id', candidateId);
            if (error) throw error;

            modalRef?.close?.();
            this.showSuccess('تم تحديث طلبك وإعادة إرساله للمراجعة');

            await window.rebuildNavigation?.();

            const candidacySection = document.getElementById('candidacy-section');
            if (candidacySection && !candidacySection.classList.contains('d-none')) {
                window.navigateToSection?.('candidacy-section');
            } else if (this.currentElection) {
                await this.showElectionDetail(this.currentElection.id);
            }
        } catch (error) {
            console.error('Error updating candidacy:', error);
            this.showError('حدث خطأ أثناء تحديث الطلب');
        }
    }

    async withdrawMyCandidacy(candidateId) {
        await window.ModalHelper.show({
            title: 'الانسحاب من الترشح',
            iconClass: 'fa-arrow-rotate-left',
            size: 'md',
            type: 'danger',
            html: `
                <div class="modal-info-box box-danger">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <span>هل أنت متأكد من الانسحاب من هذا الترشح؟ هذا الإجراء نهائي.</span>
                </div>
                <div class="form-group">
                    <label class="form-label">سبب الانسحاب <span class="required-dot">*</span></label>
                    <textarea id="withdrawalReasonInput" class="form-input" rows="4"
                              placeholder="اكتب سبب انسحابك من الترشح..."
                              style="resize: vertical;"></textarea>
                </div>`,
            showFooter: true,
            footerButtons: [
                { text: 'تراجع', class: 'btn btn-slate', dismiss: true },
                {
                    text: '<i class="fa-solid fa-arrow-rotate-left"></i> تأكيد الانسحاب',
                    class: 'btn btn-danger',
                    keepOpen: true,
                    callback: async (_, modalRef) => {
                        const reason = document.getElementById('withdrawalReasonInput')?.value?.trim();
                        if (!reason) {
                            this.showError('يرجى كتابة سبب الانسحاب');
                            return;
                        }
                        await this.performWithdrawal(candidateId, reason);
                        modalRef?.close?.();
                    }
                }
            ]
        });
    }

    async performWithdrawal(candidateId, reason) {
        try {
            const now = new Date().toISOString();
            const { error } = await this.supabase
                .from('election_candidates')
                .update({
                    status: 'withdrawn',
                    withdrawal_reason: reason,
                    withdrawn_at: now,
                    updated_at: now
                })
                .eq('id', candidateId);
            if (error) throw error;
            this.showSuccess('تم الانسحاب من الترشح');

            await window.rebuildNavigation?.();

            const candidacySection = document.getElementById('candidacy-section');
            if (candidacySection && !candidacySection.classList.contains('d-none')) {
                window.navigateToSection?.('candidacy-section');
            } else if (this.currentElection) {
                await this.showElectionDetail(this.currentElection.id);
            }
        } catch (error) {
            console.error('Error withdrawing:', error);
            this.showError('حدث خطأ أثناء الانسحاب');
        }
    }

    async confirmVote(electionId, candidateId) {
        const weight = this.getUserVoteWeight();
        const confirmed = await this.confirmAction(
            `هل أنت متأكد من التصويت لهذا المرشح؟ وزن صوتك: ${weight}`
        );
        if (!confirmed) return;
        await this.castVote(electionId, candidateId);
    }

    async castVote(electionId, candidateId) {
        try {
            // جلب الوزن من قاعدة البيانات
            const { data: weight } = await this.supabase.rpc('get_vote_weight', {
                p_user_id: this.currentUser.id
            });

            // جلب اسم الدور الحالي
            const roleName = this.currentUserRole?.role?.role_name || 'committee_member';

            const { error } = await this.supabase
                .from('election_votes')
                .insert({
                    election_id: electionId,
                    voter_id: this.currentUser.id,
                    candidate_id: candidateId,
                    vote_weight: weight || 1.0,
                    voter_role_name: roleName
                });

            if (error) {
                if (error.code === '23505' && /election_votes/i.test(error.message || '')) {
                    this.showError('لقد صوّتت مسبقاً في هذا الانتخاب');
                    return;
                }
                if (error.code === 'P0001') {
                    this.showError(error.message || 'تعذّر التصويت');
                    return;
                }
                throw error;
            }

            this.showSuccess('تم تسجيل صوتك بنجاح');
            await this.showElectionDetail(electionId);
        } catch (error) {
            console.error('Error casting vote:', error);
            this.showError('حدث خطأ أثناء التصويت');
        }
    }

    async declareWinner(electionId, winnerUserId) {
        const confirmed = await this.confirmAction('هل أنت متأكد من إعلان هذا المرشح فائزاً؟');
        if (!confirmed) return;

        try {
            const { error } = await this.supabase
                .from('elections')
                .update({
                    winner_user_id: winnerUserId,
                    status: 'completed',
                    updated_at: new Date().toISOString()
                })
                .eq('id', electionId);

            if (error) {
                if (error.code === 'P0001') {
                    this.showError(error.message || 'تعذّر إعلان الفائز');
                    return;
                }
                throw error;
            }

            this.showSuccess('تم إعلان الفائز بنجاح');
            await this.loadElections();
            await this.showElectionDetail(electionId);
        } catch (error) {
            console.error('Error declaring winner:', error);
            this.showError('حدث خطأ أثناء إعلان الفائز');
        }
    }

    // =============================================
    // دوال مساعدة
    // =============================================

    getElectionName(election) {
        const role = election.target_role?.role_name_ar || '—';
        const unit = election.target_committee?.committee_name_ar
                  || election.target_department?.name_ar;
        return unit ? `${role} — ${unit}` : role;
    }

    canManageElections() {
        return window.PermissionsHelper?.hasPermission('manage_elections') || false;
    }

    canApproveCandidates() {
        return window.PermissionsHelper?.hasAnyPermission(['approve_candidates', 'manage_elections']) || false;
    }

    isUserInCommittee(committeeId) {
        if (!committeeId || !this.currentUserRole) return false;
        return this.currentUserRole.committee_id === committeeId;
    }

    getUserVoteWeight() {
        if (!this.currentUserRole?.role?.role_name) return 1.0;
        const found = this.voteWeights.find(w => w.role_name === this.currentUserRole.role.role_name);
        return found ? Number(found.weight) : 1.0;
    }

    async confirmAction(message) {
        return new Promise(resolve => {
            if (window.ModalHelper?.confirm) {
                window.ModalHelper.confirm({
                    title: 'تأكيد',
                    message,
                    type: 'warning',
                    onConfirm: () => resolve(true),
                    onCancel: () => resolve(false)
                });
            } else {
                resolve(confirm(message));
            }
        });
    }

    showSuccess(message) {
        window.Toast?.show({ type: 'success', title: message });
    }

    showError(message) {
        window.Toast?.show({ type: 'error', title: message });
    }
}

// تصدير عام
window.ElectionsManager = ElectionsManager;
window.electionsManagerInstance = null;
