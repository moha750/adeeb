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

    // خريطة الحالات والانتقالات المسموحة
    static STATUS_TRANSITIONS = {
        'candidacy_open': ['candidacy_closed', 'cancelled'],
        'candidacy_closed': ['voting_open', 'cancelled'],
        'voting_open': ['voting_closed', 'cancelled'],
        'voting_closed': ['completed', 'cancelled'],
        'completed': [],
        'cancelled': []
    };

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
        'withdrawn': 'منسحب'
    };

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
                .eq('is_active', true)
                .order('role:roles(role_level)', { ascending: false })
                .limit(1);
            this.currentUserRole = data?.[0] || null;
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
                    winner:winner_user_id(id, full_name, avatar_url)
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

        // زر الرجوع للقائمة
        container.querySelector('#backToElectionsListBtn')?.addEventListener('click', () => this.showListView());
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
        const isAdmin = this.canManageElections();

        // إخفاء/إظهار عناصر الإدارة
        const statsGrid = document.querySelector('#elections-section .stats-grid');
        const filtersBar = document.querySelector('#elections-section .filters-bar');

        if (!isAdmin) {
            // عرض العضو: إخفاء الإحصائيات والفلاتر الإدارية
            if (statsGrid) statsGrid.classList.add('d-none');
            if (filtersBar) filtersBar.classList.add('d-none');
        } else {
            if (statsGrid) statsGrid.classList.remove('d-none');
            if (filtersBar) filtersBar.classList.remove('d-none');
            this.renderStats();
        }

        if (isAdmin) {
            this.renderElectionsGrid(this.elections);
        } else {
            this.renderMemberView();
        }
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
    // عرض العضو (واجهة مبسطة)
    // =============================================

    renderMemberView() {
        const grid = document.getElementById('electionsGrid');
        if (!grid) return;

        // فقط الانتخابات المفتوحة للترشح أو التصويت أو المكتملة
        const visibleElections = this.elections.filter(e =>
            ['candidacy_open', 'voting_open', 'voting_closed', 'completed'].includes(e.status)
        );

        if (!visibleElections.length) {
            grid.innerHTML = `
                <div style="text-align: center; padding: 4rem 2rem; color: var(--text-secondary); grid-column: 1/-1;">
                    <i class="fa-solid fa-box-open fa-3x" style="margin-bottom: 1rem; opacity: 0.25;"></i>
                    <p style="font-size: 1.1rem;">لا توجد انتخابات متاحة حالياً</p>
                    <p style="font-size: 0.85rem; margin-top: 0.5rem;">سيتم إشعارك عند فتح انتخاب جديد</p>
                </div>`;
            return;
        }

        // تقسيم حسب الأولوية: ترشح مفتوح أولاً، ثم تصويت، ثم مكتمل
        const candidacyOpen = visibleElections.filter(e => e.status === 'candidacy_open');
        const votingOpen = visibleElections.filter(e => e.status === 'voting_open');
        const others = visibleElections.filter(e => ['voting_closed', 'completed'].includes(e.status));

        let html = '';

        if (candidacyOpen.length) {
            html += this.renderMemberSection('باب الترشح مفتوح', 'fa-user-plus', '#f59e0b', candidacyOpen, 'candidacy');
        }

        if (votingOpen.length) {
            html += this.renderMemberSection('صوّت الآن', 'fa-check-to-slot', '#10b981', votingOpen, 'voting');
        }

        if (others.length) {
            html += this.renderMemberSection('انتخابات سابقة', 'fa-flag-checkered', '#6b7280', others, 'past');
        }

        grid.innerHTML = html;

        // ربط أحداث النقر
        grid.querySelectorAll('[data-election-id]').forEach(card => {
            card.style.cursor = 'pointer';
            card.addEventListener('click', () => {
                this.showElectionDetail(card.dataset.electionId);
            });
        });
    }

    renderMemberSection(title, icon, color, elections, type) {
        let html = `
            <div style="grid-column: 1/-1; margin-top: 0.5rem;">
                <h3 style="display: flex; align-items: center; gap: 0.5rem; font-size: 1rem; color: ${color}; margin-bottom: 1rem;">
                    <i class="fa-solid ${icon}"></i> ${title}
                </h3>
            </div>`;

        elections.forEach(election => {
            const roleName   = election.target_role?.role_name_ar || '';
            const unitName   = election.target_committee?.committee_name_ar
                            || election.target_department?.name_ar || '';
            const statusColor = ElectionsManager.STATUS_COLORS[election.status];
            const isInCommittee = this.isUserInCommittee(election.target_committee_id);

            let actionHint = '';
            if (type === 'candidacy' && isInCommittee) {
                actionHint = `<span style="color: #f59e0b; font-size: 0.8rem; font-weight: 600;"><i class="fa-solid fa-star"></i> يمكنك الترشح</span>`;
            } else if (type === 'voting') {
                actionHint = `<span style="color: #10b981; font-size: 0.8rem; font-weight: 600;"><i class="fa-solid fa-check-circle"></i> التصويت متاح</span>`;
            } else if (election.status === 'completed' && election.winner) {
                actionHint = `<span style="color: #059669; font-size: 0.8rem;"><i class="fa-solid fa-crown"></i> الفائز: ${election.winner.full_name}</span>`;
            }

            let dateInfo = '';
            if (type === 'candidacy' && election.candidacy_end) {
                const end = new Date(election.candidacy_end);
                const now = new Date();
                const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
                if (daysLeft > 0) {
                    dateInfo = `<span style="color: var(--text-secondary); font-size: 0.8rem;"><i class="fa-regular fa-clock"></i> متبقي ${daysLeft} يوم</span>`;
                }
            } else if (type === 'voting' && election.voting_end) {
                const end = new Date(election.voting_end);
                const now = new Date();
                const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
                if (daysLeft > 0) {
                    dateInfo = `<span style="color: var(--text-secondary); font-size: 0.8rem;"><i class="fa-regular fa-clock"></i> متبقي ${daysLeft} يوم</span>`;
                }
            }

            html += `
                <div class="uc-card" data-election-id="${election.id}" style="border-right: 4px solid ${statusColor};">
                    <div class="uc-card__header">
                        <div class="uc-card__icon" style="background: ${statusColor}20; color: ${statusColor};">
                            <i class="fa-solid ${type === 'candidacy' ? 'fa-user-plus' : type === 'voting' ? 'fa-check-to-slot' : 'fa-flag-checkered'}"></i>
                        </div>
                        <div>
                            <h3 class="uc-card__title">${this.getElectionName(election)}</h3>
                            <span style="color: var(--text-secondary); font-size: 0.85rem;">${roleName}${unitName ? ' — ' + unitName : ''}</span>
                        </div>
                    </div>
                    <div class="uc-card__body">
                        <div style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
                            ${actionHint}
                            ${dateInfo}
                        </div>
                    </div>
                    <div class="uc-card__footer">
                        <button class="btn  ${type === 'candidacy' ? 'btn-warning' : type === 'voting' ? 'btn-success' : 'btn-outline'}">
                            <i class="fa-solid ${type === 'candidacy' ? 'fa-arrow-left' : type === 'voting' ? 'fa-check-to-slot' : 'fa-eye'}"></i>
                            ${type === 'candidacy' ? 'عرض التفاصيل والترشح' : type === 'voting' ? 'صوّت الآن' : 'عرض النتائج'}
                        </button>
                    </div>
                </div>`;
        });

        return html;
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

    renderOpenSection() {
        const grid = document.getElementById('openSectionGrid');
        const statsEl = document.getElementById('openSectionStats');
        if (!grid) return;

        const openElections = this.elections.filter(e => e.status === 'candidacy_open');

        // إحصائية سريعة
        if (statsEl) {
            statsEl.innerHTML = `
                <div class="stats-grid" style="--stats-cols: 2;">
                    <div class="stat-card" style="--stat-color: #f59e0b;">
                        <div class="stat-card-wrapper">
                            <div class="stat-icon"><i class="fa-solid fa-door-open"></i></div>
                            <div class="stat-content">
                                <div class="stat-value">${openElections.length}</div>
                                <div class="stat-label">باب الترشح مفتوح حالياً</div>
                            </div>
                        </div>
                    </div>
                    <div class="stat-card" style="--stat-color: #10b981;">
                        <div class="stat-card-wrapper">
                            <div class="stat-icon"><i class="fa-solid fa-check-to-slot"></i></div>
                            <div class="stat-content">
                                <div class="stat-value">${this.elections.filter(e => e.status === 'voting_open').length}</div>
                                <div class="stat-label">التصويت مفتوح حالياً</div>
                            </div>
                        </div>
                    </div>
                </div>`;
        }

        if (!openElections.length) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <div class="empty-state__icon"><i class="fa-solid fa-inbox"></i></div>
                    <p class="empty-state__title">لا يوجد باب ترشح مفتوح حالياً</p>
                    <p class="empty-state__message">أنشئ انتخاباً جديداً لفتح باب الترشح</p>
                </div>`;
            return;
        }

        grid.innerHTML = openElections.map(e => this.renderOpenSectionCard(e)).join('');

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
    }

    renderOpenSectionCard(election) {
        const roleName = election.target_role?.role_name_ar || '—';
        const unitLabel = election.target_department_id ? 'القسم' : 'اللجنة';
        const unitName  = election.target_committee?.committee_name_ar
                       || election.target_department?.name_ar || '';
        const createdDate = new Date(election.created_at).toLocaleDateString('ar-SA');

        const candidacyStart = election.candidacy_start
            ? new Date(election.candidacy_start).toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' })
            : null;
        const candidacyEnd = election.candidacy_end
            ? new Date(election.candidacy_end).toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' })
            : null;

        return `
            <div class="uc-card" data-election-id="${election.id}">
                <div class="uc-card__header">
                    <div class="uc-card__header-inner">
                        <div class="uc-card__icon" style="background: #f59e0b20; color: #f59e0b;">
                            <i class="fa-solid fa-door-open"></i>
                        </div>
                        <div class="uc-card__header-info">
                            <h3 class="uc-card__title">${this.getElectionName(election)}</h3>
                            <div class="uc-card__badge" style="background: #f59e0b15; color: #f59e0b;">
                                <i class="fa-solid fa-circle-dot"></i>
                                <span>باب الترشح مفتوح</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="uc-card__body">
                    <div class="uc-card__info-item">
                        <div class="uc-card__info-icon"><i class="fa-solid fa-user-tie"></i></div>
                        <div class="uc-card__info-content">
                            <div class="uc-card__info-label">المنصب</div>
                            <div class="uc-card__info-value">${roleName}</div>
                        </div>
                    </div>
                    ${unitName ? `
                    <div class="uc-card__info-item">
                        <div class="uc-card__info-icon"><i class="fa-solid ${election.target_department_id ? 'fa-building' : 'fa-people-group'}"></i></div>
                        <div class="uc-card__info-content">
                            <div class="uc-card__info-label">${unitLabel}</div>
                            <div class="uc-card__info-value">${unitName}</div>
                        </div>
                    </div>` : ''}
                    <div class="uc-card__info-item">
                        <div class="uc-card__info-icon"><i class="fa-regular fa-calendar"></i></div>
                        <div class="uc-card__info-content">
                            <div class="uc-card__info-label">تاريخ الإنشاء</div>
                            <div class="uc-card__info-value">${createdDate}</div>
                        </div>
                    </div>
                    <div class="uc-card__info-item">
                        <div class="uc-card__info-icon"><i class="fa-regular fa-clock"></i></div>
                        <div class="uc-card__info-content">
                            <div class="uc-card__info-label">بداية الترشح</div>
                            <div class="uc-card__info-value">${candidacyStart || 'لم يحدد الموعد'}</div>
                        </div>
                    </div>
                    <div class="uc-card__info-item">
                        <div class="uc-card__info-icon"><i class="fa-solid fa-flag-checkered"></i></div>
                        <div class="uc-card__info-content">
                            <div class="uc-card__info-label">نهاية الترشح</div>
                            <div class="uc-card__info-value">${candidacyEnd || 'لم يحدد الموعد'}</div>
                        </div>
                    </div>
                </div>
                <div class="uc-card__footer" style="flex-direction: column; gap: 0.5rem;">
                    <button class="btn btn-warning view-candidates-btn" data-election-id="${election.id}" style="width: 100%;">
                        <i class="fa-solid fa-users"></i> عرض المرشحين
                    </button>
                    ${!election.candidacy_end ? `
                    <button class="btn btn-outline set-end-date-btn" data-election-id="${election.id}" style="width: 100%;">
                        <i class="fa-regular fa-calendar-plus"></i> تحديد موعد إغلاق الترشح
                    </button>` : ''}
                    <button class="btn btn-danger cancel-election-btn" data-election-id="${election.id}" style="width: 100%;">
                        <i class="fa-solid fa-ban"></i> إلغاء الانتخاب
                    </button>
                </div>
            </div>`;
    }

    async showSetEndDateModal(electionId) {
        const election = this.elections.find(e => e.id === electionId);
        if (!election) return;

        let modalRef = null;
        modalRef = await window.ModalHelper.show({
            title: 'تحديد موعد إغلاق الترشح',
            size: 'sm',
            type: 'info',
            html: `
                <div class="form-group">
                    <label class="form-label">تاريخ ووقت إغلاق باب الترشح <span class="required-dot">*</span></label>
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
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">
                                    <i class="label-icon fa-solid fa-hourglass-start"></i> بداية الترشح
                                </label>
                                <input type="datetime-local" id="electionCandidacyStart" class="form-input">
                            </div>
                            <div class="form-group">
                                <label class="form-label">
                                    <i class="label-icon fa-solid fa-hourglass-end"></i> نهاية الترشح
                                </label>
                                <input type="datetime-local" id="electionCandidacyEnd" class="form-input">
                            </div>
                        </div>
                        <small>
                            <i class="fa-solid fa-circle-info"></i>
                            <span><strong>تحديد الأوقات اختياري،</strong> يمكنك إنشاء الانتخاب الآن وتحديد موعد نهاية الترشح لاحقًا.</span>
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
        const candidacyStartRaw = document.getElementById('electionCandidacyStart')?.value;
        const candidacyEndRaw   = document.getElementById('electionCandidacyEnd')?.value;
        const candidacyStart = candidacyStartRaw ? new Date(candidacyStartRaw).toISOString() : null;
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
        if (entityGroup?.style.display !== 'none' && !entityId) {
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
                    candidacy_start: candidacyStart || null,
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
        container.querySelector('#elections-list-view').classList.add('d-none');
        container.querySelector('#elections-detail-view').classList.remove('d-none');

        this.renderElectionDetail(election, candidates, myVote, results);
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

        const canManage = this.canManageElections();
        const canApprove = this.canApproveCandidates();
        const isInTargetCommittee = this.isUserInCommittee(election.target_committee_id);

        if (canManage) {
            this.renderAdminDetail(detailContainer, election, candidates, myVote, results, canApprove, isInTargetCommittee);
        } else {
            this.renderMemberDetail(detailContainer, election, candidates, myVote, results, isInTargetCommittee);
        }

        // ربط أحداث الأزرار
        this.bindDetailEvents(detailContainer, election, candidates);
    }

    // عرض تفاصيل الإدارة (العرض الكامل)
    renderAdminDetail(detailContainer, election, candidates, myVote, results, canApprove, isInTargetCommittee) {
        const statusLabel = ElectionsManager.STATUS_LABELS[election.status];
        const statusColor = ElectionsManager.STATUS_COLORS[election.status];

        let html = `
            <div class="card" style="margin-bottom: 1.5rem;">
                <div class="card-body" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                    <div>
                        <h2 style="margin: 0 0 0.5rem;">${this.getElectionName(election)}</h2>
                        <span style="display: inline-block; padding: 0.3rem 0.8rem; border-radius: 999px; font-size: 0.85rem; background: ${statusColor}15; color: ${statusColor}; font-weight: 600;">
                            ${statusLabel}
                        </span>
                    </div>
                    ${this.renderStatusActions(election)}
                </div>
            </div>`;

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

    // عرض تفاصيل العضو (واجهة مبسطة)
    renderMemberDetail(detailContainer, election, candidates, myVote, results, isInTargetCommittee) {
        const statusLabel = ElectionsManager.STATUS_LABELS[election.status];
        const statusColor = ElectionsManager.STATUS_COLORS[election.status];
        const approvedCandidates = candidates.filter(c => c.status === 'approved');
        const alreadyCandidate = candidates.some(c => c.user_id === this.currentUser?.id);
        const userWeight = this.getUserVoteWeight();

        let html = '';

        // رأس مبسط
        html += `
            <div style="text-align: center; padding: 1.5rem 1rem; margin-bottom: 1.5rem;">
                <h2 style="margin: 0 0 0.75rem; font-size: 1.4rem;">${this.getElectionName(election)}</h2>
                <span style="display: inline-block; padding: 0.3rem 1rem; border-radius: 999px; font-size: 0.9rem; background: ${statusColor}15; color: ${statusColor}; font-weight: 600;">
                    ${statusLabel}
                </span>
            </div>`;

        // --- مرحلة الترشح ---
        if (election.status === 'candidacy_open') {
            // زر الترشح إذا كان العضو مؤهلاً
            if (isInTargetCommittee && !alreadyCandidate) {
                html += `
                    <div class="card" style="margin-bottom: 1.5rem; border: 2px solid var(--color-primary); text-align: center; padding: 2rem;">
                        <i class="fa-solid fa-hand-point-up fa-2x" style="color: var(--color-primary); margin-bottom: 0.75rem;"></i>
                        <h3 style="margin-bottom: 0.5rem;">أنت مؤهل للترشح!</h3>
                        <p style="color: var(--text-secondary); margin-bottom: 1rem;">قدّم ملفك الانتخابي وبيان ترشحك الآن</p>
                        <button class="btn btn-primary" id="submitCandidacyBtn" style="font-size: 1rem; padding: 0.6rem 2rem;">
                            <i class="fa-solid fa-user-plus"></i> تقدّم للترشح
                        </button>
                    </div>`;
            } else if (alreadyCandidate) {
                const myCandidate = candidates.find(c => c.user_id === this.currentUser?.id);
                const cStatus = ElectionsManager.CANDIDATE_STATUS_LABELS[myCandidate?.status] || '';
                const cColor = myCandidate?.status === 'approved' ? '#10b981' : myCandidate?.status === 'rejected' ? '#ef4444' : '#f59e0b';
                html += `
                    <div class="card" style="margin-bottom: 1.5rem; border: 2px solid ${cColor}; text-align: center; padding: 1.5rem;">
                        <i class="fa-solid fa-check-circle fa-2x" style="color: ${cColor}; margin-bottom: 0.5rem;"></i>
                        <p style="font-weight: 600;">لقد تقدمت بطلب ترشح</p>
                        <span style="display: inline-block; padding: 0.2rem 0.8rem; border-radius: 999px; font-size: 0.85rem; background: ${cColor}15; color: ${cColor}; font-weight: 600; margin-top: 0.5rem;">
                            ${cStatus}
                        </span>
                    </div>`;
            }

            // قائمة المرشحين الحاليين
            if (approvedCandidates.length) {
                html += `<h3 style="font-size: 1rem; margin-bottom: 1rem; color: var(--text-secondary);"><i class="fa-solid fa-users"></i> المرشحون المعتمدون</h3>`;
                html += this.renderMemberCandidatesList(approvedCandidates);
            }
        }

        // --- مرحلة التصويت ---
        else if (election.status === 'voting_open') {
            if (myVote) {
                html += `
                    <div class="card" style="margin-bottom: 1.5rem; border: 2px solid #10b981; text-align: center; padding: 1.5rem;">
                        <i class="fa-solid fa-check-circle fa-2x" style="color: #10b981; margin-bottom: 0.5rem;"></i>
                        <p style="font-weight: 600; font-size: 1.1rem;">شكراً لمشاركتك! تم تسجيل صوتك</p>
                        <p style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 0.5rem;">وزن صوتك: <strong>${myVote.vote_weight}</strong></p>
                    </div>`;
            } else {
                html += `
                    <div style="text-align: center; margin-bottom: 1.5rem; padding: 1rem; background: var(--bg-secondary); border-radius: 0.75rem;">
                        <p style="color: var(--text-secondary); font-size: 0.9rem;">وزن صوتك: <strong style="color: var(--color-primary); font-size: 1.1rem;">${userWeight}</strong></p>
                        <p style="color: var(--text-secondary); font-size: 0.8rem; margin-top: 0.25rem;">اختر المرشح الذي تراه الأنسب</p>
                    </div>`;
            }

            // بطاقات المرشحين للتصويت
            html += '<div class="uc-grid">';
            approvedCandidates.forEach(candidate => {
                const user = candidate.user;
                const avatar = user?.avatar_url || '../assets/default-avatar.png';
                const isVotedFor = myVote?.candidate_id === candidate.id;

                html += `
                    <div class="uc-card" ${isVotedFor ? 'style="border: 2px solid #10b981;"' : ''}>
                        <div class="uc-card__header" style="flex-direction: column; text-align: center;">
                            <img src="${avatar}" alt="${user?.full_name}" style="border-radius: 50%; width: 64px; height: 64px; object-fit: cover; margin-bottom: 0.5rem;">
                            <h3 class="uc-card__title">${user?.full_name || 'غير معروف'}</h3>
                            ${isVotedFor ? '<span style="color: #10b981; font-size: 0.85rem;"><i class="fa-solid fa-check-circle"></i> اخترت هذا المرشح</span>' : ''}
                        </div>
                        ${candidate.candidacy_statement ? `
                        <div class="uc-card__body">
                            <p style="color: var(--text-secondary); font-size: 0.9rem; text-align: center;">${candidate.candidacy_statement}</p>
                        </div>` : ''}
                        ${candidate.election_file_url ? `
                        <div style="text-align: center; padding: 0 1rem;">
                            <a href="${candidate.election_file_url}" target="_blank" class="btn  btn-outline" style="font-size: 0.8rem;">
                                <i class="fa-solid fa-file-pdf"></i> الملف الانتخابي
                            </a>
                        </div>` : ''}
                        ${!myVote ? `
                        <div class="uc-card__footer" style="justify-content: center;">
                            <button class="btn btn-primary cast-vote-btn" data-candidate-id="${candidate.id}" style="width: 100%;">
                                <i class="fa-solid fa-check-to-slot"></i> صوّت
                            </button>
                        </div>` : ''}
                    </div>`;
            });
            html += '</div>';
        }

        // --- النتائج ---
        else if (['voting_closed', 'completed'].includes(election.status)) {
            if (results.length) {
                const maxVotes = Math.max(...results.map(r => Number(r.total_weighted_votes)), 1);

                html += `<h3 style="font-size: 1rem; margin-bottom: 1rem; text-align: center;"><i class="fa-solid fa-trophy" style="color: #fbbf24;"></i> النتائج</h3>`;
                html += '<div style="display: grid; gap: 1rem;">';

                results.forEach((result, index) => {
                    const percentage = (Number(result.total_weighted_votes) / maxVotes * 100).toFixed(1);
                    const avatar = result.avatar_url || '../assets/default-avatar.png';
                    const isWinner = election.winner_user_id === result.user_id;
                    const medalColors = ['#fbbf24', '#94a3b8', '#cd7f32'];
                    const medal = index < 3 ? `<span style="color: ${medalColors[index]};"><i class="fa-solid fa-trophy"></i></span>` : '';

                    html += `
                        <div class="card" ${isWinner ? 'style="border: 2px solid #10b981;"' : ''}>
                            <div class="card-body">
                                <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem;">
                                    <span style="font-size: 1.3rem; font-weight: 700; color: var(--text-secondary);">#${index + 1}</span>
                                    <img src="${avatar}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                                    <div style="flex: 1;">
                                        <strong>${result.full_name}</strong> ${medal}
                                        ${isWinner ? '<span style="color: #10b981; font-size: 0.8rem; margin-right: 0.3rem;"><i class="fa-solid fa-crown"></i> الفائز</span>' : ''}
                                    </div>
                                    <span style="font-weight: 700; font-size: 1.1rem;">${Number(result.total_weighted_votes).toFixed(1)}</span>
                                </div>
                                <div style="background: var(--bg-secondary); border-radius: 999px; height: 8px; overflow: hidden;">
                                    <div style="background: var(--color-primary); height: 100%; width: ${percentage}%; border-radius: 999px; transition: width 0.5s;"></div>
                                </div>
                            </div>
                        </div>`;
                });
                html += '</div>';
            } else {
                html += `<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">لا توجد نتائج بعد</div>`;
            }
        }

        // حالة انتظار
        else {
            html += `
                <div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                    <i class="fa-solid fa-hourglass-half fa-2x" style="opacity: 0.3; margin-bottom: 1rem;"></i>
                    <p>هذا الانتخاب في مرحلة التجهيز</p>
                </div>`;
        }

        detailContainer.innerHTML = html;
    }

    renderMemberCandidatesList(candidates) {
        let html = '<div class="uc-grid">';
        candidates.forEach(candidate => {
            const user = candidate.user;
            const avatar = user?.avatar_url || '../assets/default-avatar.png';
            html += `
                <div class="uc-card">
                    <div class="uc-card__header" style="flex-direction: column; text-align: center;">
                        <img src="${avatar}" alt="${user?.full_name}" style="border-radius: 50%; width: 56px; height: 56px; object-fit: cover; margin-bottom: 0.5rem;">
                        <h3 class="uc-card__title">${user?.full_name || 'غير معروف'}</h3>
                    </div>
                    ${candidate.candidacy_statement ? `
                    <div class="uc-card__body">
                        <p style="color: var(--text-secondary); font-size: 0.9rem; text-align: center;">${candidate.candidacy_statement}</p>
                    </div>` : ''}
                    ${candidate.election_file_url ? `
                    <div class="uc-card__footer" style="justify-content: center;">
                        <a href="${candidate.election_file_url}" target="_blank" class="btn  btn-outline">
                            <i class="fa-solid fa-file-pdf"></i> الملف الانتخابي
                        </a>
                    </div>` : ''}
                </div>`;
        });
        html += '</div>';
        return html;
    }

    renderStatusActions(election) {
        const transitions = ElectionsManager.STATUS_TRANSITIONS[election.status] || [];
        if (!transitions.length) return '';

        const buttons = transitions.map(nextStatus => {
            const label = ElectionsManager.STATUS_LABELS[nextStatus];
            const color = ElectionsManager.STATUS_COLORS[nextStatus];
            const icon = nextStatus === 'cancelled' ? 'fa-ban' : 'fa-arrow-left';
            return `<button class="btn  status-transition-btn" data-next-status="${nextStatus}"
                        style="background: ${color}; color: white; border: none;">
                        <i class="fa-solid ${icon}"></i> ${label}
                    </button>`;
        }).join('');

        return `<div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">${buttons}</div>`;
    }

    // =============================================
    // تبويب المرشحين
    // =============================================

    renderCandidatesTab(election, candidates, canApprove, isInTargetCommittee) {
        let html = '';

        // زر تقديم ترشح
        const canSubmitCandidacy = ['candidacy_open'].includes(election.status) && isInTargetCommittee;
        const alreadyCandidate = candidates.some(c => c.user_id === this.currentUser?.id);

        if (canSubmitCandidacy && !alreadyCandidate) {
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

        if (!candidates.length) {
            html += `<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">لا يوجد مرشحون بعد</div>`;
            return html;
        }

        html += '<div class="uc-grid">';
        candidates.forEach(candidate => {
            const user = candidate.user;
            const avatar = user?.avatar_url || '../assets/default-avatar.png';
            const cStatusLabel = ElectionsManager.CANDIDATE_STATUS_LABELS[candidate.status];
            const cStatusColor = candidate.status === 'approved' ? '#10b981' :
                                 candidate.status === 'rejected' ? '#ef4444' :
                                 candidate.status === 'withdrawn' ? '#6b7280' : '#f59e0b';

            html += `
                <div class="uc-card">
                    <div class="uc-card__header">
                        <img class="uc-card__icon" src="${avatar}" alt="${user?.full_name}" style="border-radius: 50%; width: 48px; height: 48px; object-fit: cover;">
                        <div>
                            <h3 class="uc-card__title">${user?.full_name || 'غير معروف'}</h3>
                            <span style="display: inline-block; padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.7rem; background: ${cStatusColor}15; color: ${cStatusColor}; font-weight: 600;">
                                ${cStatusLabel}
                            </span>
                        </div>
                    </div>
                    <div class="uc-card__body">
                        ${candidate.candidacy_statement ? `
                        <div class="uc-card__info-item">
                            <span class="uc-card__info-label">بيان الترشح</span>
                            <span class="uc-card__info-value">${candidate.candidacy_statement}</span>
                        </div>` : ''}
                        ${candidate.election_file_url ? `
                        <div class="uc-card__info-item">
                            <a href="${candidate.election_file_url}" target="_blank" class="btn  btn-outline" style="margin-top: 0.5rem;">
                                <i class="fa-solid fa-file-pdf"></i> الملف الانتخابي
                            </a>
                        </div>` : ''}
                        ${candidate.review_note ? `
                        <div class="uc-card__info-item">
                            <span class="uc-card__info-label">ملاحظة المراجعة</span>
                            <span class="uc-card__info-value">${candidate.review_note}</span>
                        </div>` : ''}
                    </div>
                    ${canApprove && candidate.status === 'pending' ? `
                    <div class="uc-card__footer">
                        <button class="btn  btn-success approve-candidate-btn" data-candidate-id="${candidate.id}">
                            <i class="fa-solid fa-check"></i> قبول
                        </button>
                        <button class="btn  btn-danger reject-candidate-btn" data-candidate-id="${candidate.id}">
                            <i class="fa-solid fa-xmark"></i> رفض
                        </button>
                    </div>` : ''}
                </div>`;
        });
        html += '</div>';
        return html;
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
        // تغيير الحالة
        container.querySelectorAll('.status-transition-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const nextStatus = btn.dataset.nextStatus;
                await this.updateElectionStatus(election.id, nextStatus);
            });
        });

        // تقديم ترشح
        container.querySelector('#submitCandidacyBtn')?.addEventListener('click', () => {
            this.showCandidacyModal(election.id);
        });

        // قبول/رفض مرشح
        container.querySelectorAll('.approve-candidate-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.reviewCandidate(btn.dataset.candidateId, 'approved');
            });
        });
        container.querySelectorAll('.reject-candidate-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showRejectModal(btn.dataset.candidateId);
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

            if (error) throw error;
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
        await window.ModalHelper.show({
            title: 'تقديم طلب ترشح',
            size: 'md',
            type: 'info',
            html: `
                <form id="candidacyForm" style="display: grid; gap: 1rem;">
                    <div class="form-group">
                        <label class="form-label">بيان الترشح</label>
                        <textarea id="candidacyStatement" class="form-input" rows="4" placeholder="اكتب بيانك الانتخابي..."></textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">الملف الانتخابي (PDF أو صورة)</label>
                        <input type="file" id="candidacyFile" class="form-input" accept=".pdf,.png,.jpg,.jpeg">
                    </div>
                </form>`,
            showFooter: true,
            footerButtons: [
                { text: 'إلغاء', class: 'btn btn-outline', dismiss: true },
                {
                    text: '<i class="fa-solid fa-paper-plane"></i> تقديم الترشح',
                    class: 'btn btn-primary',
                    callback: () => this.submitCandidacy(electionId)
                }
            ]
        });
    }

    async submitCandidacy(electionId) {
        const statement = document.getElementById('candidacyStatement')?.value?.trim();
        const fileInput = document.getElementById('candidacyFile');
        let fileUrl = null;

        try {
            // رفع الملف إذا وُجد
            if (fileInput?.files?.length) {
                const file = fileInput.files[0];
                const ext = file.name.split('.').pop();
                const path = `${electionId}/${this.currentUser.id}/election-file.${ext}`;

                const { data, error: uploadError } = await this.supabase.storage
                    .from('election-files')
                    .upload(path, file, { upsert: true });

                if (uploadError) throw uploadError;

                const { data: urlData } = this.supabase.storage
                    .from('election-files')
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

            window.ModalHelper.closeAll?.() || document.querySelector('.modal-backdrop')?.click();
            this.showSuccess('تم تقديم طلب الترشح بنجاح');
            await this.showElectionDetail(electionId);
        } catch (error) {
            console.error('Error submitting candidacy:', error);
            this.showError('حدث خطأ أثناء تقديم الترشح');
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
                    <label class="form-label">سبب الرفض (اختياري)</label>
                    <textarea id="rejectNote" class="form-input" rows="3" placeholder="اكتب سبب الرفض..."></textarea>
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
                if (error.code === '23505') {
                    this.showError('لقد صوّتت مسبقاً في هذا الانتخاب');
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

            if (error) throw error;

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
