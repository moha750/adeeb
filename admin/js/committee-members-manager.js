class CommitteeMembersManager {
    constructor() {
        this.supabase = window.sbClient;
        this.currentUser = null;
        this.userCommittee = null;
        this.members = [];
        this.filteredMembers = [];
        this.isLeaderOrDeputy = false;
        this.init();
    }

    async init() {
        try {
            this.currentUser = await window.AuthManager.getCurrentUser();
            if (!this.currentUser) return;

            await this.checkLeadershipRole();
            if (this.isLeaderOrDeputy) {
                await this.loadMembers();
                this.setupEventListeners();
            }
        } catch (error) {
            console.error('Error initializing committee members manager:', error);
        }
    }

    async checkLeadershipRole() {
        try {
            const { data: userRoles, error } = await this.supabase
                .from('user_roles')
                .select(`
                    *,
                    role:roles(role_name, role_level),
                    committee:committees(id, committee_name_ar)
                `)
                .eq('user_id', this.currentUser.id)
                .eq('is_active', true);

            if (error) throw error;

            const leaderRole = userRoles.find(ur =>
                ur.role?.role_name === 'committee_leader' ||
                ur.role?.role_name === 'deputy_committee_leader'
            );

            if (leaderRole) {
                this.isLeaderOrDeputy = true;
                this.userCommittee = leaderRole.committee;
                this.userRole = leaderRole.role.role_name;
                document.getElementById('committeeMembersManagementCard')?.classList.remove('d-none');
            }
        } catch (error) {
            console.error('Error checking leadership role:', error);
            this.isLeaderOrDeputy = false;
        }
    }

    async loadMembers() {
        try {
            if (!this.userCommittee) return;

            const container = document.getElementById('committeeMembersTableContainer');
            if (container) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 3rem; color: #94a3b8;">
                        <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 0.75rem; display: block;"></i>
                        <p>جاري تحميل بيانات الأعضاء...</p>
                    </div>
                `;
            }

            const { data, error } = await this.supabase
                .from('user_roles')
                .select(`
                    id,
                    user_id,
                    role_id,
                    is_active,
                    assigned_at,
                    notes,
                    profiles!user_roles_user_id_fkey(
                        id,
                        full_name,
                        email,
                        phone,
                        avatar_url,
                        account_status,
                        created_at
                    ),
                    roles(
                        id,
                        role_name,
                        role_name_ar,
                        role_level
                    )
                `)
                .eq('committee_id', this.userCommittee.id)
                .eq('is_active', true)
                .order('assigned_at', { ascending: false });

            if (error) throw error;

            // فلترة الأعضاء النشطين فقط
            this.members = (data || []).filter(m => m.profiles?.account_status === 'active');
            this.filteredMembers = [...this.members];
            this.updateStats();
            this.renderMembers();
        } catch (error) {
            console.error('Error loading members:', error);
            this.showError('حدث خطأ أثناء تحميل بيانات الأعضاء');
        }
    }

    updateStats() {
        const activeCount = this.members.filter(m => m.profiles?.account_status === 'active').length;

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const newCount = this.members.filter(m => new Date(m.assigned_at) >= thirtyDaysAgo).length;

        const pendingCount = this.members.filter(m => m.profiles?.account_status === 'inactive').length;

        const set = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        set('committeeActiveMembersCount', activeCount);
        set('committeeNewMembersCount', newCount);
        set('committeePendingMembersCount', pendingCount);
    }

    renderMembers() {
        const container = document.getElementById('committeeMembersTableContainer');
        if (!container) return;

        if (this.filteredMembers.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 3rem; color: #94a3b8;">
                    <div style="width: 64px; height: 64px; border-radius: 16px; background: linear-gradient(135deg, #3d8fd6, #274060); display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; color: #fff; font-size: 1.5rem;">
                        <i class="fa-solid fa-users-slash"></i>
                    </div>
                    <p style="font-weight: 600; color: #1e293b; margin-bottom: 0.25rem;">لا توجد نتائج</p>
                    <p style="font-size: 0.85rem;">لم يتم العثور على أعضاء مطابقين لبحثك</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="uc-grid">
                ${this.filteredMembers.map(member => this.renderMemberCard(member)).join('')}
            </div>
        `;

        this.attachCardListeners();
    }

    renderMemberCard(member) {
        const user = member.profiles;
        const role = member.roles;
        const roleLabel = role?.role_name_ar || role?.role_name || 'عضو';

        const avatarUrl = user?.avatar_url ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || 'User')}&background=3d8fd6&color=fff&size=200`;

        // تحديد لون البطاقة حسب الدور
        let colorClass = 'uc-card--primary';
        if (role?.role_name === 'committee_leader') colorClass = 'uc-card--info';
        else if (role?.role_name === 'deputy_committee_leader') colorClass = 'uc-card--purple';

        // حساب المدة منذ الانضمام
        const joinDays = member.assigned_at
            ? Math.floor((Date.now() - new Date(member.assigned_at).getTime()) / (1000 * 60 * 60 * 24))
            : null;
        const isNew = joinDays !== null && joinDays <= 30;

        return `
            <div class="uc-card ${colorClass}" data-member-id="${member.id}" data-user-id="${user?.id}">

                <div class="uc-card__header">
                    ${isNew ? `
                    <div class="uc-card__badges-overlay">
                        <span class="uc-badge uc-badge--success" style="background: rgba(255,255,255,0.2); color: #fff;">
                            <i class="fa-solid fa-sparkles"></i> جديد
                        </span>
                    </div>` : ''}
                    <div class="uc-card__header-inner">
                        <div class="uc-card__icon">
                            <img src="${avatarUrl}" alt="${user?.full_name || 'عضو'}" />
                        </div>
                        <div class="uc-card__header-info">
                            <h3 class="uc-card__title">${user?.full_name || 'غير محدد'}</h3>
                            <span class="uc-card__badge">
                                <i class="fa-solid fa-shield-halved"></i>
                                ${roleLabel}
                            </span>
                        </div>
                    </div>
                </div>

                <div class="uc-card__body">
                    ${user?.email ? `
                    <div class="uc-card__info-item">
                        <div class="uc-card__info-icon"><i class="fa-regular fa-envelope"></i></div>
                        <div class="uc-card__info-content">
                            <span class="uc-card__info-label">البريد الإلكتروني</span>
                            <span class="uc-card__info-value">${user.email}</span>
                        </div>
                    </div>` : ''}
                    ${user?.phone ? `
                    <div class="uc-card__info-item">
                        <div class="uc-card__info-icon"><i class="fa-solid fa-phone"></i></div>
                        <div class="uc-card__info-content">
                            <span class="uc-card__info-label">الجوال</span>
                            <span class="uc-card__info-value">${user.phone}</span>
                        </div>
                    </div>` : ''}
                    <div class="uc-card__info-item">
                        <div class="uc-card__info-icon"><i class="fa-regular fa-calendar-alt"></i></div>
                        <div class="uc-card__info-content">
                            <span class="uc-card__info-label">تاريخ الانضمام</span>
                            <span class="uc-card__info-value">${this.formatDate(member.assigned_at)}</span>
                        </div>
                    </div>
                </div>

                <div class="uc-card__footer" style="grid-template-columns: 1fr;">
                    <button class="view-member-btn btn btn-primary" data-user-id="${user?.id}">
                        <i class="fa-solid fa-eye"></i>
                        عرض التفاصيل
                    </button>
                </div>

            </div>
        `;
    }

    attachCardListeners() {
        document.querySelectorAll('.view-member-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = e.currentTarget.dataset.userId;
                this.viewMemberDetails(userId);
            });
        });
    }

    async viewMemberDetails(userId) {
        try {
            const { data: user, error } = await this.supabase
                .from('profiles')
                .select(`
                    *,
                    user_roles!inner(
                        *,
                        role:roles(*),
                        committee:committees(*)
                    )
                `)
                .eq('id', userId)
                .single();

            if (error) throw error;

            const avatarUrl = user.avatar_url ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || 'User')}&background=3d8fd6&color=fff&size=200`;

            const activeRoles = user.user_roles.filter(ur => ur.is_active);

            const modalContent = `
                <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                    <!-- رأس الملف الشخصي -->
                    <div style="display: flex; align-items: center; gap: 1rem; padding: 1.25rem; background: linear-gradient(145deg, rgba(61,143,214,0.08), transparent); border-radius: 16px; border: 1px solid rgba(61,143,214,0.12);">
                        <img src="${avatarUrl}" alt="${user.full_name}" style="width: 64px; height: 64px; border-radius: 16px; object-fit: cover; border: 2px solid rgba(61,143,214,0.2);" />
                        <div>
                            <h3 style="margin: 0 0 0.25rem; font-size: 1.1rem; color: #1e293b;">${user.full_name}</h3>
                            <p style="margin: 0; font-size: 0.85rem; color: #64748b;">${user.email}</p>
                        </div>
                    </div>
                    <!-- التفاصيل -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                        <div class="uc-card__info-item">
                            <div class="uc-card__info-icon"><i class="fa-solid fa-phone"></i></div>
                            <div class="uc-card__info-content">
                                <span class="uc-card__info-label">الهاتف</span>
                                <span class="uc-card__info-value">${user.phone || 'غير محدد'}</span>
                            </div>
                        </div>
                        <div class="uc-card__info-item">
                            <div class="uc-card__info-icon"><i class="fa-solid fa-calendar"></i></div>
                            <div class="uc-card__info-content">
                                <span class="uc-card__info-label">تاريخ الانضمام</span>
                                <span class="uc-card__info-value">${this.formatDate(user.created_at)}</span>
                            </div>
                        </div>
                        <div class="uc-card__info-item" style="grid-column: 1 / -1;">
                            <div class="uc-card__info-icon"><i class="fa-solid fa-user-tag"></i></div>
                            <div class="uc-card__info-content">
                                <span class="uc-card__info-label">المناصب</span>
                                <div style="display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.25rem;">
                                    ${activeRoles.map(ur => `
                                        <span class="uc-badge uc-badge--primary">${ur.role?.role_name_ar || ur.role?.role_name || 'عضو'}</span>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            this.showModal('تفاصيل العضو', modalContent);
        } catch (error) {
            console.error('Error viewing member details:', error);
            this.showError('حدث خطأ أثناء تحميل بيانات العضو');
        }
    }

    setupEventListeners() {
        const searchInput = document.getElementById('committeeMembersSearchInput');
        const refreshBtn = document.getElementById('refreshCommitteeMembersBtn');

        if (searchInput) {
            searchInput.addEventListener('input', () => this.applyFilters());
        }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadMembers());
        }
    }

    applyFilters() {
        const searchTerm = document.getElementById('committeeMembersSearchInput')?.value.toLowerCase() || '';

        this.filteredMembers = this.members.filter(member => {
            if (!searchTerm) return true;
            return member.profiles?.full_name?.toLowerCase().includes(searchTerm) ||
                member.profiles?.email?.toLowerCase().includes(searchTerm) ||
                member.profiles?.phone?.includes(searchTerm);
        });

        this.renderMembers();
    }

    formatDate(dateString) {
        if (!dateString) return 'غير محدد';
        return new Date(dateString).toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    showModal(title, content) {
        if (typeof window.showModal === 'function') {
            window.showModal(title, content);
        }
    }

    showError(message) {
        if (typeof window.showToast === 'function') {
            window.showToast(message, 'error');
        }
    }
}

window.committeeMembersManager = null;

if (typeof CommitteeMembersManager !== 'undefined') {
    window.CommitteeMembersManager = CommitteeMembersManager;
}
