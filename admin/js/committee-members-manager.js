class CommitteeMembersManager {
    constructor(options = {}) {
        this.supabase = window.sbClient;
        this.userCommittee = options.committee || null;
        this.userRole = options.roleName || null;
        this.isLeaderOrDeputy = this.userRole === 'committee_leader' || this.userRole === 'deputy_committee_leader';
        this.members = [];
        this.filteredMembers = [];
        this.init();
    }

    async init() {
        if (!this.isLeaderOrDeputy || !this.userCommittee?.id) return;
        try {
            this.renderTitle();
            await this.loadMembers();
            this.setupEventListeners();
        } catch (error) {
            console.error('Error initializing committee members manager:', error);
        }
    }

    renderTitle() {
        const el = document.getElementById('manageMyCommitteeTitle');
        if (el && this.userCommittee?.committee_name_ar) {
            el.textContent = `إدارة أعضاء ${this.userCommittee.committee_name_ar}`;
        }
    }

    updateStats() {
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const newCount = this.members.filter(m => m.assigned_at && new Date(m.assigned_at).getTime() >= thirtyDaysAgo).length;

        const set = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };
        set('committeeActiveMembersCount', this.members.length);
        set('committeeNewMembersCount', newCount);
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
            const activeMembers = (data || []).filter(m => m.profiles?.account_status === 'active');

            // جلب رقم الجوال من member_details كـ fallback
            const userIds = activeMembers.map(m => m.profiles.id).filter(Boolean);
            const phonesByUserId = {};
            if (userIds.length > 0) {
                const { data: details } = await this.supabase
                    .from('member_details')
                    .select('user_id, phone')
                    .in('user_id', userIds);
                (details || []).forEach(d => { phonesByUserId[d.user_id] = d.phone; });
            }

            this.members = activeMembers.map(m => ({
                ...m,
                profiles: { ...m.profiles, member_details_phone: phonesByUserId[m.profiles.id] || null }
            }));
            this.filteredMembers = [...this.members];
            this.updateStats();
            this.renderMembers();
        } catch (error) {
            console.error('Error loading members:', error);
            this.showError('حدث خطأ أثناء تحميل بيانات الأعضاء');
        }
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
        const phone = user?.phone || user?.member_details_phone || null;

        const avatarUrl = user?.avatar_url || null;

        // لون البطاقة الافتراضي
        const colorClass = '';

        // حساب المدة منذ الانضمام
        const joinDays = member.assigned_at
            ? Math.floor((Date.now() - new Date(member.assigned_at).getTime()) / (1000 * 60 * 60 * 24))
            : null;
        const isNew = joinDays !== null && joinDays <= 30;

        return `
            <div class="uc-card ${colorClass}" data-member-id="${member.id}" data-user-id="${user?.id}">

                <div class="uc-card__header">
                    <div class="uc-card__header-inner">
                        <div class="uc-card__icon">
                            ${avatarUrl
                                ? `<img src="${avatarUrl}" alt="${user?.full_name || 'عضو'}" />`
                                : `<i class="fa-solid fa-user"></i>`}
                        </div>
                        <div class="uc-card__header-info">
                            <h3 class="uc-card__title">${user?.full_name || 'غير محدد'}</h3>
                            <div style="display: flex; flex-wrap: wrap; gap: 0.35rem; align-items: center;">
                                <span class="uc-card__badge">
                                    <i class="fa-solid fa-shield-halved"></i>
                                    ${roleLabel}
                                </span>
                                ${isNew ? `
                                <span class="uc-card__badge">
                                    <i class="fa-solid fa-star"></i>
                                    انضم حديثًا
                                </span>` : ''}
                            </div>
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
                    ${phone ? `
                    <div class="uc-card__info-item">
                        <div class="uc-card__info-icon"><i class="fa-solid fa-phone"></i></div>
                        <div class="uc-card__info-content">
                            <span class="uc-card__info-label">الجوال</span>
                            <span class="uc-card__info-value">${phone}</span>
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
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;

            const { data: memberDetails } = await this.supabase
                .from('member_details')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();

            const member = this.members.find(m => m.profiles?.id === userId);
            const role = member?.roles;
            const committee = this.userCommittee;

            const content = window.UsersManager?.buildMemberDetailsContent
                ? window.UsersManager.buildMemberDetailsContent(user, memberDetails, role, committee)
                : null;

            if (!content) {
                this.showError('تعذر بناء نافذة التفاصيل');
                return;
            }

            window.openModal('تفاصيل العضو', content, { icon: 'fa-user' });
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
                member.profiles?.phone?.includes(searchTerm) ||
                member.profiles?.member_details_phone?.includes(searchTerm);
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
