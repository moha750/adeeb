/**
 * نظام تعيين الأدوار والمناصب - نادي أدِيب
 */

(function() {
    const sb = window.sbClient;
    let allUsers = [];
    let allRoles = [];
    let allCommittees = [];

    class RoleAssignmentManager {
        constructor() {
            this.currentUser = null;
        }

        async init(user) {
            this.currentUser = user;
            await this.loadRoles();
            await this.loadCommittees();
            await this.loadUsers();
            this.setupEventListeners();
        }

        async loadRoles() {
            try {
                const { data, error } = await sb
                    .from('roles')
                    .select('*')
                    .order('role_level', { ascending: false });

                if (error) throw error;
                allRoles = data || [];
            } catch (error) {
                console.error('Error loading roles:', error);
            }
        }

        async loadCommittees() {
            try {
                const { data, error } = await sb
                    .from('committees')
                    .select('*')
                    .eq('is_active', true)
                    .order('committee_name_ar');

                if (error) throw error;
                allCommittees = data || [];
            } catch (error) {
                console.error('Error loading committees:', error);
            }
        }

        async loadUsers() {
            try {
                const { data: profiles, error: profilesError } = await sb
                    .from('profiles')
                    .select(`
                        *,
                        user_roles!user_roles_user_id_fkey (
                            id,
                            role_id,
                            committee_id,
                            is_active,
                            assigned_at,
                            roles (
                                role_name,
                                role_name_ar,
                                role_level
                            ),
                            committees (
                                committee_name_ar
                            )
                        )
                    `)
                    .order('full_name');

                if (profilesError) throw profilesError;

                allUsers = profiles || [];
                this.renderUsersWithRoles();
            } catch (error) {
                console.error('Error loading users:', error);
            }
        }

        renderUsersWithRoles() {
            const container = document.getElementById('roleAssignmentContainer');
            if (!container) return;

            if (allUsers.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fa-solid fa-users"></i>
                        <p>لا توجد مستخدمين</p>
                    </div>
                `;
                return;
            }

            let html = '<div class="applications-cards-grid">';

            allUsers.forEach(user => {
                const activeRoles = user.user_roles?.filter(r => r.is_active) || [];
                const primaryRole = activeRoles[0];

                html += `
                    <div class="application-card">
                        <div class="application-card-header">
                            <div class="applicant-info">
                                <div class="applicant-avatar">
                                    <i class="fa-solid fa-user"></i>
                                </div>
                                <div class="applicant-details">
                                    <h3 class="applicant-name">${this.escapeHtml(user.full_name)}</h3>
                                    ${primaryRole 
                                        ? `<span class="badge badge-primary">${primaryRole.roles?.role_name_ar || 'دور'}</span>`
                                        : '<span class="badge badge-secondary">بدون دور</span>'
                                    }
                                </div>
                            </div>
                        </div>
                        
                        <div class="application-card-body">
                            <div class="application-info-grid">
                                <div class="info-item">
                                    <i class="fa-solid fa-envelope"></i>
                                    <div class="info-content">
                                        <span class="info-label">البريد الإلكتروني</span>
                                        <span class="info-value">${this.escapeHtml(user.email)}</span>
                                    </div>
                                </div>
                                
                                ${primaryRole?.committees ? `
                                    <div class="info-item">
                                        <i class="fa-solid fa-users"></i>
                                        <div class="info-content">
                                            <span class="info-label">اللجنة</span>
                                            <span class="info-value">${this.escapeHtml(primaryRole.committees.committee_name_ar)}</span>
                                        </div>
                                    </div>
                                ` : ''}
                                
                                <div class="info-item">
                                    <i class="fa-solid fa-shield"></i>
                                    <div class="info-content">
                                        <span class="info-label">عدد الأدوار</span>
                                        <span class="info-value">${activeRoles.length}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="application-card-footer">
                            <div class="card-actions-grid">
                                <button class="btn-action btn-action-primary assign-role-btn" data-user-id="${user.id}">
                                    <i class="fa-solid fa-user-plus"></i>
                                    تعيين دور
                                </button>
                                ${activeRoles.length > 0 ? `
                                    <button class="btn-action btn-action-info view-roles-btn" data-user-id="${user.id}">
                                        <i class="fa-solid fa-eye"></i>
                                        عرض الأدوار
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `;
            });

            html += '</div>';
            container.innerHTML = html;
        }

        setupEventListeners() {
            const container = document.getElementById('roleAssignmentContainer');
            if (container) {
                container.addEventListener('click', (e) => {
                    const assignBtn = e.target.closest('.assign-role-btn');
                    const viewBtn = e.target.closest('.view-roles-btn');

                    if (assignBtn) {
                        const userId = assignBtn.dataset.userId;
                        this.openAssignRoleModal(userId);
                    } else if (viewBtn) {
                        const userId = viewBtn.dataset.userId;
                        this.openViewRolesModal(userId);
                    }
                });
            }

            const refreshBtn = document.getElementById('refreshRoleAssignmentBtn');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => this.loadUsers());
            }
        }

        openAssignRoleModal(userId) {
            const user = allUsers.find(u => u.id === userId);
            if (!user) return;

            const modalContent = `
                <div class="card">
                    <div class="card-header">
                        <h3>تعيين دور لـ ${this.escapeHtml(user.full_name)}</h3>
                    </div>
                    <div class="card-body">
                        <form id="assignRoleForm">
                            <div class="form-group">
                                <label>الدور *</label>
                                <select id="roleSelect" required class="filter-select">
                                    <option value="">اختر الدور</option>
                                    ${allRoles.map(role => `
                                        <option value="${role.id}" data-needs-committee="${['committee_leader', 'deputy_committee_leader', 'committee_member'].includes(role.role_name)}">
                                            ${this.escapeHtml(role.role_name_ar)} (المستوى ${role.role_level})
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                            
                            <div class="form-group" id="committeeSelectGroup" style="display: none;">
                                <label>اللجنة *</label>
                                <select id="committeeSelect" class="filter-select">
                                    <option value="">اختر اللجنة</option>
                                    ${allCommittees.map(committee => `
                                        <option value="${committee.id}">
                                            ${this.escapeHtml(committee.committee_name_ar)}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>

                            <div class="form-group">
                                <label>ملاحظات</label>
                                <textarea id="roleNotes" rows="3" placeholder="ملاحظات اختيارية..."></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="card-footer">
                        <button type="button" class="btn btn--outline btn--outline-primary" onclick="window.closeFormModal()">إلغاء</button>
                        <button type="button" class="btn btn--primary" id="saveRoleAssignment">
                            <i class="fa-solid fa-save"></i>
                            تعيين الدور
                        </button>
                    </div>
                </div>
            `;

            if (window.openFormModal) {
                window.openFormModal({
                    title: 'تعيين دور',
                    content: modalContent,
                    icon: 'fa-user-shield'
                });
            }

            // Event listeners
            const roleSelect = document.getElementById('roleSelect');
            const committeeGroup = document.getElementById('committeeSelectGroup');
            const committeeSelect = document.getElementById('committeeSelect');

            roleSelect.addEventListener('change', (e) => {
                const selectedOption = e.target.options[e.target.selectedIndex];
                const needsCommittee = selectedOption.dataset.needsCommittee === 'true';
                
                if (needsCommittee) {
                    committeeGroup.style.display = 'block';
                    committeeSelect.required = true;
                } else {
                    committeeGroup.style.display = 'none';
                    committeeSelect.required = false;
                    committeeSelect.value = '';
                }
            });

            document.getElementById('saveRoleAssignment').addEventListener('click', async () => {
                const roleId = roleSelect.value;
                const committeeId = committeeSelect.value || null;
                const notes = document.getElementById('roleNotes').value;

                if (!roleId) {
                    alert('يرجى اختيار الدور');
                    return;
                }

                const selectedOption = roleSelect.options[roleSelect.selectedIndex];
                if (selectedOption.dataset.needsCommittee === 'true' && !committeeId) {
                    alert('يرجى اختيار اللجنة');
                    return;
                }

                await this.assignRole(userId, roleId, committeeId, notes);
            });
        }

        async assignRole(userId, roleId, committeeId, notes) {
            try {
                const { error } = await sb
                    .from('user_roles')
                    .insert({
                        user_id: userId,
                        role_id: roleId,
                        committee_id: committeeId,
                        is_active: true,
                        assigned_by: this.currentUser.id,
                        notes: notes
                    });

                if (error) throw error;

                // تسجيل النشاط
                await window.AuthManager.logActivity(
                    this.currentUser.id,
                    'assign_role',
                    'user_role',
                    userId,
                    { role_id: roleId, committee_id: committeeId }
                );

                alert('تم تعيين الدور بنجاح');
                window.closeFormModal();
                await this.loadUsers();
            } catch (error) {
                console.error('Error assigning role:', error);
                alert('حدث خطأ أثناء تعيين الدور: ' + error.message);
            }
        }

        openViewRolesModal(userId) {
            const user = allUsers.find(u => u.id === userId);
            if (!user) return;

            const activeRoles = user.user_roles?.filter(r => r.is_active) || [];

            const modalContent = `
                <div class="card">
                    <div class="card-header">
                        <h3>أدوار ${this.escapeHtml(user.full_name)}</h3>
                    </div>
                    <div class="card-body">
                        ${activeRoles.length === 0 ? `
                            <div class="empty-state">
                                <i class="fa-solid fa-shield"></i>
                                <p>لا توجد أدوار مفعلة</p>
                            </div>
                        ` : `
                            <div class="roles-list">
                                ${activeRoles.map(role => `
                                    <div class="role-item card mb-1rem">
                                        <div class="card-body">
                                            <div class="d-flex justify-content-between align-items-start">
                                                <div>
                                                    <h4>${this.escapeHtml(role.roles?.role_name_ar || 'دور')}</h4>
                                                    ${role.committees ? `
                                                        <p><i class="fa-solid fa-users"></i> ${this.escapeHtml(role.committees.committee_name_ar)}</p>
                                                    ` : ''}
                                                    <small>تم التعيين: ${new Date(role.assigned_at).toLocaleDateString('ar-SA')}</small>
                                                </div>
                                                <button class="btn btn--outline btn--outline-danger btn-sm remove-role-btn" data-role-assignment-id="${role.id}">
                                                    <i class="fa-solid fa-trash"></i>
                                                    إزالة
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        `}
                    </div>
                </div>
            `;

            if (window.openFormModal) {
                window.openFormModal({
                    title: 'عرض الأدوار',
                    content: modalContent,
                    icon: 'fa-shield'
                });
            }

            // Event listeners for remove buttons
            document.querySelectorAll('.remove-role-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const roleAssignmentId = e.target.closest('.remove-role-btn').dataset.roleAssignmentId;
                    if (confirm('هل أنت متأكد من إزالة هذا الدور؟')) {
                        await this.removeRole(roleAssignmentId);
                    }
                });
            });
        }

        async removeRole(roleAssignmentId) {
            try {
                const { error } = await sb
                    .from('user_roles')
                    .update({ is_active: false })
                    .eq('id', roleAssignmentId);

                if (error) throw error;

                alert('تم إزالة الدور بنجاح');
                window.closeFormModal();
                await this.loadUsers();
            } catch (error) {
                console.error('Error removing role:', error);
                alert('حدث خطأ أثناء إزالة الدور: ' + error.message);
            }
        }

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    }

    window.RoleAssignmentManager = RoleAssignmentManager;
})();
