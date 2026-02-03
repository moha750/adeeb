class CommitteeMembersManager {
    constructor() {
        this.supabase = window.sbClient;
        this.currentUser = null;
        this.userCommittee = null;
        this.members = [];
        this.filteredMembers = [];
        this.roles = [];
        this.init();
    }

    async init() {
        try {
            this.currentUser = await window.AuthManager.getCurrentUser();
            if (!this.currentUser) {
                console.error('User not authenticated');
                return;
            }

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
            } else {
                this.isLeaderOrDeputy = false;
            }
        } catch (error) {
            console.error('Error checking leadership role:', error);
            this.isLeaderOrDeputy = false;
        }
    }

    async loadRoles() {
        try {
            const { data, error } = await this.supabase
                .from('roles')
                .select('*')
                .order('role_level', { ascending: true });

            if (error) throw error;

            this.roles = data || [];
            this.populateRoleFilter();
        } catch (error) {
            console.error('Error loading roles:', error);
        }
    }

    populateRoleFilter() {
        const roleFilter = document.getElementById('committeeMembersRoleFilter');
        if (!roleFilter) return;

        const committeeRoles = this.roles.filter(r => 
            r.role_name.includes('committee') || r.role_level >= 3
        );

        committeeRoles.forEach(role => {
            const option = document.createElement('option');
            option.value = role.id;
            option.textContent = role.display_name || role.role_name;
            roleFilter.appendChild(option);
        });
    }

    async loadMembers() {
        try {
            if (!this.userCommittee) return;

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

            this.members = data || [];
            this.filteredMembers = [...this.members];
            this.updateStats();
            this.renderMembersTable();
        } catch (error) {
            console.error('Error loading members:', error);
            this.showError('حدث خطأ أثناء تحميل بيانات الأعضاء');
        }
    }

    updateStats() {
        const activeMembers = this.members.filter(m => m.profiles?.account_status === 'active').length;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const newMembers = this.members.filter(m => 
            new Date(m.assigned_at) >= thirtyDaysAgo
        ).length;
        const pendingMembers = this.members.filter(m => m.profiles?.account_status === 'inactive').length;

        document.getElementById('committeeActiveMembersCount').textContent = activeMembers;
        document.getElementById('committeeNewMembersCount').textContent = newMembers;
        document.getElementById('committeePendingMembersCount').textContent = pendingMembers;
    }

    renderMembersTable() {
        const container = document.getElementById('committeeMembersTableContainer');
        if (!container) return;

        if (this.filteredMembers.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-users-slash"></i>
                    <p>لا توجد بيانات أعضاء</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="applications-cards-grid">
                ${this.filteredMembers.map(member => this.renderMemberCard(member)).join('')}
            </div>
        `;
    }

    renderMemberCard(member) {
        const user = member.profiles;
        const role = member.roles;
        const statusClass = user?.account_status === 'active' ? 'success' : 
                          user?.account_status === 'suspended' ? 'danger' : 'warning';
        const statusText = user?.account_status === 'active' ? 'نشط' : 
                         user?.account_status === 'suspended' ? 'معلق' : 'غير نشط';
        
        const avatarUrl = user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || 'User')}&background=3d8fd6&color=fff`;

        return `
            <div class="application-card" data-member-id="${member.id}" data-user-id="${user?.id}">
                <div class="application-card-header">
                    <div class="applicant-info">
                        <div class="applicant-avatar">
                            <img src="${avatarUrl}" alt="${user?.full_name || 'عضو'}" />
                        </div>
                        <div class="applicant-details">
                            <h3 class="applicant-name">${user?.full_name || 'غير محدد'}</h3>
                            <span class="badge badge-${statusClass}">${statusText}</span>
                        </div>
                    </div>
                </div>
                
                <div class="application-card-body">
                    <div class="application-info-grid">
                        ${user?.email ? `
                            <div class="info-item">
                                <i class="fa-solid fa-envelope"></i>
                                <div class="info-content">
                                    <span class="info-label">البريد الإلكتروني</span>
                                    <span class="info-value">${user.email}</span>
                                </div>
                            </div>
                        ` : ''}
                        
                        ${user?.phone ? `
                            <div class="info-item">
                                <i class="fa-solid fa-phone"></i>
                                <div class="info-content">
                                    <span class="info-label">الجوال</span>
                                    <span class="info-value">${user.phone}</span>
                                </div>
                            </div>
                        ` : ''}
                        
                        <div class="info-item">
                            <i class="fa-solid fa-user-tag"></i>
                            <div class="info-content">
                                <span class="info-label">المنصب</span>
                                <span class="info-value">${role?.role_name_ar || role?.role_name || 'غير محدد'}</span>
                            </div>
                        </div>
                        
                        <div class="info-item">
                            <i class="fa-solid fa-calendar"></i>
                            <div class="info-content">
                                <span class="info-label">تاريخ الانضمام</span>
                                <span class="info-value">${this.formatDate(member.assigned_at)}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
            </div>
        `;
    }

    attachCardEventListeners() {
        document.querySelectorAll('.view-member-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = e.currentTarget.dataset.userId;
                this.viewMemberDetails(userId);
            });
        });

        document.querySelectorAll('.edit-member-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = e.currentTarget.dataset.userId;
                this.editMember(userId);
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

            const modalContent = `
                <div class="member-details-modal">
                    <div class="member-header">
                        <img src="${user.avatar_url || '../adeeb-logo.png'}" alt="${user.full_name}">
                        <div>
                            <h2>${user.full_name}</h2>
                            <p>${user.email}</p>
                        </div>
                    </div>
                    <div class="member-info-grid">
                        <div class="info-item">
                            <label><i class="fa-solid fa-phone"></i> الهاتف</label>
                            <p>${user.phone || 'غير محدد'}</p>
                        </div>
                        <div class="info-item">
                            <label><i class="fa-solid fa-calendar"></i> تاريخ الانضمام</label>
                            <p>${this.formatDate(user.created_at)}</p>
                        </div>
                        <div class="info-item">
                            <label><i class="fa-solid fa-shield"></i> الحالة</label>
                            <p>${user.status === 'active' ? 'نشط' : user.status === 'suspended' ? 'معلق' : 'غير نشط'}</p>
                        </div>
                        <div class="info-item">
                            <label><i class="fa-solid fa-user-tag"></i> المناصب</label>
                            <div>
                                ${user.user_roles.filter(ur => ur.is_active).map(ur => `
                                    <span class="badge badge--primary">${ur.role?.display_name || ur.role?.role_name}</span>
                                `).join('')}
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

    async editMember(userId) {
        const member = this.members.find(m => m.user?.id === userId);
        if (!member) return;

        const modalContent = `
            <form id="editMemberForm" class="form">
                <div class="form-group">
                    <label>ملاحظات</label>
                    <textarea id="memberNotes" rows="4" placeholder="أضف ملاحظات عن العضو...">${member.notes || ''}</textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn--outline btn--outline-primary" onclick="window.closeModal()">إلغاء</button>
                    <button type="submit" class="btn btn--primary">حفظ التغييرات</button>
                </div>
            </form>
        `;

        this.showModal('تعديل بيانات العضو', modalContent);

        document.getElementById('editMemberForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveMemberEdit(member.id);
        });
    }

    async saveMemberEdit(userRoleId) {
        try {
            const notes = document.getElementById('memberNotes').value;

            const { error } = await this.supabase
                .from('user_roles')
                .update({ notes })
                .eq('id', userRoleId);

            if (error) throw error;

            this.showSuccess('تم حفظ التغييرات بنجاح');
            window.closeModal();
            await this.loadMembers();
        } catch (error) {
            console.error('Error saving member edit:', error);
            this.showError('حدث خطأ أثناء حفظ التغييرات');
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
            const matchesSearch = !searchTerm || 
                member.profiles?.full_name?.toLowerCase().includes(searchTerm) ||
                member.profiles?.email?.toLowerCase().includes(searchTerm) ||
                member.profiles?.phone?.includes(searchTerm);

            return matchesSearch;
        });

        this.renderMembersTable();
    }

    formatDate(dateString) {
        if (!dateString) return 'غير محدد';
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    showModal(title, content) {
        if (typeof window.showModal === 'function') {
            window.showModal(title, content);
        } else {
            alert(content);
        }
    }

    showSuccess(message) {
        if (typeof window.showToast === 'function') {
            window.showToast(message, 'success');
        } else {
            alert(message);
        }
    }

    showError(message) {
        if (typeof window.showToast === 'function') {
            window.showToast(message, 'error');
        } else {
            alert(message);
        }
    }
}

window.committeeMembersManager = null;

if (typeof CommitteeMembersManager !== 'undefined') {
    window.CommitteeMembersManager = CommitteeMembersManager;
}
