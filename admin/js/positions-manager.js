/**
 * مدير قسم تعيين المناصب
 */

class PositionsManager {
    constructor() {
        this.supabase = window.sbClient;
        this.allMembers = [];
        this.searchTimeout = null;
        this.selectedMember = null;
        this.roles = [];
        this.committees = [];
    }

    async init() {
        try {
            await this.loadRoles();
            await this.loadCommittees();
            await this.loadStats();
            await this.loadPositionsHierarchy();
            this.setupEventListeners();
        } catch (error) {
            console.error('Error initializing positions manager:', error);
            this.showError('حدث خطأ أثناء تهيئة صفحة المناصب');
        }
    }

    async loadRoles() {
        try {
            const { data: roles, error } = await this.supabase
                .from('roles')
                .select('*')
                .order('role_level', { ascending: false });

            if (error) {
                console.error('Error loading roles:', error);
                throw error;
            }

            console.log('Loaded roles:', roles);
            this.roles = roles || [];
            this.populateRolesSelect();
        } catch (error) {
            console.error('Error loading roles:', error);
            this.showError('حدث خطأ أثناء تحميل الأدوار');
        }
    }

    populateRolesSelect() {
        const select = document.getElementById('positionRoleSelect');
        if (!select) return;

        let html = '<option value="">اختر المنصب</option>';
        this.roles.forEach(role => {
            if (role.role_name !== 'committee_member') {
                html += `<option value="${role.id}" data-level="${role.role_level}" data-name="${role.role_name}">${role.role_name_ar}</option>`;
            }
        });
        select.innerHTML = html;
    }

    async loadCommittees() {
        try {
            const { data: committees, error } = await this.supabase
                .from('committees')
                .select('*')
                .eq('is_active', true)
                .order('committee_name_ar');

            if (error) {
                console.error('Error loading committees:', error);
                throw error;
            }

            console.log('Loaded committees:', committees);
            this.committees = committees || [];
            this.populateCommitteesSelect();
        } catch (error) {
            console.error('Error loading committees:', error);
            this.showError('حدث خطأ أثناء تحميل اللجان');
        }
    }

    populateCommitteesSelect() {
        const select = document.getElementById('positionCommitteeSelect');
        if (!select) return;

        let html = '<option value="">اختر اللجنة</option>';
        this.committees.forEach(committee => {
            html += `<option value="${committee.id}">${committee.committee_name_ar}</option>`;
        });
        select.innerHTML = html;
    }

    async loadStats() {
        try {
            const stats = {
                clubPresident: 0,
                councilLeaders: 0,
                committeeLeaders: 0,
                totalMembers: 0
            };

            const { data: userRoles, error } = await this.supabase
                .from('user_roles')
                .select(`
                    role:roles(role_level)
                `)
                .eq('is_active', true);

            if (error) {
                console.error('Error loading stats:', error);
                throw error;
            }

            console.log('Stats user roles:', userRoles);

            if (userRoles) {
                userRoles.forEach(ur => {
                    const level = ur.role?.role_level;
                    if (level === 10) stats.clubPresident++;
                    else if (level === 9) stats.councilLeaders++;
                    else if (level === 8) stats.committeeLeaders++;
                    stats.totalMembers++;
                });
            }

            console.log('Calculated stats:', stats);
            this.renderStats(stats);
        } catch (error) {
            console.error('Error loading stats:', error);
            this.showError('حدث خطأ أثناء تحميل الإحصائيات');
        }
    }

    renderStats(stats) {
        const elements = {
            clubPresidentCount: document.getElementById('clubPresidentCount'),
            councilLeadersCount: document.getElementById('councilLeadersCount'),
            committeeLeadersCount: document.getElementById('committeeLeadersCount'),
            totalMembersCount: document.getElementById('totalMembersCount')
        };

        if (elements.clubPresidentCount) elements.clubPresidentCount.textContent = stats.clubPresident;
        if (elements.councilLeadersCount) elements.councilLeadersCount.textContent = stats.councilLeaders;
        if (elements.committeeLeadersCount) elements.committeeLeadersCount.textContent = stats.committeeLeaders;
        if (elements.totalMembersCount) elements.totalMembersCount.textContent = stats.totalMembers;
    }

    async loadPositionsHierarchy() {
        try {
            const { data: userRoles, error } = await this.supabase
                .from('user_roles')
                .select(`
                    *,
                    profile:user_id(
                        id,
                        full_name,
                        email,
                        avatar_url
                    ),
                    role:roles(
                        role_name_ar,
                        role_level
                    ),
                    committee:committees(
                        committee_name_ar
                    )
                `)
                .eq('is_active', true);

            if (error) {
                console.error('Error loading user roles:', error);
                throw error;
            }

            console.log('Loaded user roles:', userRoles);

            const levels = [10, 9, 8, 7, 6, 5, 4, 3];
            for (const level of levels) {
                const levelMembers = userRoles?.filter(ur => ur.role?.role_level === level) || [];
                console.log(`Level ${level} members:`, levelMembers);
                this.renderLevelMembers(level, levelMembers);
            }
        } catch (error) {
            console.error('Error loading positions hierarchy:', error);
            this.showError('حدث خطأ أثناء تحميل هيكلة المناصب');
        }
    }

    renderLevelMembers(level, members) {
        const container = document.getElementById(`level-${level}-members`);
        if (!container) return;

        if (members.length === 0) {
            container.innerHTML = `
                <div class="empty-position">
                    <i class="fa-solid fa-user-slash"></i>
                    <p>لا يوجد أعضاء في هذا المستوى</p>
                </div>
            `;
            return;
        }

        let html = '';
        members.forEach(member => {
            const profile = member.profile;
            const committee = member.committee;
            const avatarUrl = profile?.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(profile?.full_name || 'User');

            const showDeleteButton = level !== 3 && level !== 10;
            html += `
                <div class="position-member-card" data-user-role-id="${member.id}">
                    <img src="${avatarUrl}" alt="${profile?.full_name}" class="position-member-avatar" />
                    <div class="position-member-info">
                        <h5 class="position-member-name">${profile?.full_name || 'غير محدد'}</h5>
                        ${committee ? `<p class="position-member-committee"><i class="fa-solid fa-users"></i> ${committee.committee_name_ar}</p>` : ''}
                    </div>
                    ${showDeleteButton ? `
                    <div class="position-member-actions">
                        <button class="btn btn--icon btn--icon-sm btn--outline btn--outline-danger" 
                                onclick="window.positionsManager.removePosition('${member.id}')" 
                                title="إزالة المنصب">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                    ` : ''}
                </div>
            `;
        });

        container.innerHTML = html;
    }

    setupEventListeners() {
        const searchInput = document.getElementById('searchMemberInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(() => {
                    this.searchMembers(e.target.value);
                }, 300);
            });

            searchInput.addEventListener('focus', () => {
                if (searchInput.value.trim()) {
                    this.searchMembers(searchInput.value);
                }
            });
        }

        document.addEventListener('click', (e) => {
            const searchResults = document.getElementById('searchResults');
            const searchContainer = document.querySelector('.search-member-container');
            if (searchResults && !searchContainer?.contains(e.target)) {
                searchResults.classList.remove('active');
            }
        });

        const roleSelect = document.getElementById('positionRoleSelect');
        if (roleSelect) {
            roleSelect.addEventListener('change', (e) => {
                this.handleRoleChange(e.target.value);
            });
        }

        const form = document.getElementById('assignPositionForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.assignPosition();
            });

            form.addEventListener('reset', () => {
                this.resetForm();
            });
        }
    }

    async searchMembers(query) {
        const searchResults = document.getElementById('searchResults');
        if (!searchResults) return;

        if (!query || query.trim().length < 2) {
            searchResults.classList.remove('active');
            return;
        }

        try {
            const { data: members, error } = await this.supabase
                .from('profiles')
                .select('id, full_name, email, avatar_url, account_status')
                .eq('account_status', 'active')
                .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
                .limit(10);

            if (error) throw error;

            if (!members || members.length === 0) {
                searchResults.innerHTML = `
                    <div class="search-no-results">
                        <i class="fa-solid fa-user-slash"></i>
                        <p>لم يتم العثور على أعضاء</p>
                    </div>
                `;
                searchResults.classList.add('active');
                return;
            }

            let html = '';
            members.forEach(member => {
                const avatarUrl = member.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(member.full_name || 'User');
                html += `
                    <div class="search-result-item" data-member-id="${member.id}" data-member-name="${member.full_name}" data-member-email="${member.email}" data-member-avatar="${avatarUrl}">
                        <img src="${avatarUrl}" alt="${member.full_name}" class="search-result-avatar" />
                        <div class="search-result-info">
                            <h6 class="search-result-name">${member.full_name}</h6>
                            <p class="search-result-email">${member.email}</p>
                        </div>
                    </div>
                `;
            });

            searchResults.innerHTML = html;
            searchResults.classList.add('active');

            searchResults.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', () => {
                    this.selectMember({
                        id: item.dataset.memberId,
                        name: item.dataset.memberName,
                        email: item.dataset.memberEmail,
                        avatar: item.dataset.memberAvatar
                    });
                });
            });
        } catch (error) {
            console.error('Error searching members:', error);
        }
    }

    selectMember(member) {
        this.selectedMember = member;

        const searchInput = document.getElementById('searchMemberInput');
        const searchResults = document.getElementById('searchResults');
        const selectedMemberId = document.getElementById('selectedMemberId');
        const selectedMemberDisplay = document.getElementById('selectedMemberDisplay');

        if (searchInput) searchInput.value = '';
        if (searchResults) searchResults.classList.remove('active');
        if (selectedMemberId) selectedMemberId.value = member.id;

        if (selectedMemberDisplay) {
            selectedMemberDisplay.innerHTML = `
                <img src="${member.avatar}" alt="${member.name}" class="position-member-avatar" />
                <div class="position-member-info">
                    <h5 class="position-member-name">${member.name}</h5>
                    <p class="position-member-committee">${member.email}</p>
                </div>
                <button type="button" class="selected-member-remove" onclick="positionsManager.deselectMember()">
                    <i class="fa-solid fa-times"></i>
                </button>
            `;
            selectedMemberDisplay.classList.add('active');
        }
    }

    deselectMember() {
        this.selectedMember = null;
        const selectedMemberId = document.getElementById('selectedMemberId');
        const selectedMemberDisplay = document.getElementById('selectedMemberDisplay');

        if (selectedMemberId) selectedMemberId.value = '';
        if (selectedMemberDisplay) {
            selectedMemberDisplay.innerHTML = '';
            selectedMemberDisplay.classList.remove('active');
        }
    }

    handleRoleChange(roleId) {
        const committeeGroup = document.getElementById('positionCommitteeGroup');
        if (!committeeGroup) return;

        const roleSelect = document.getElementById('positionRoleSelect');
        const selectedOption = roleSelect?.options[roleSelect.selectedIndex];
        const roleName = selectedOption?.dataset.name;

        const needsCommittee = ['committee_leader', 'deputy_committee_leader', 'committee_member', 'hr_admin_member', 'qa_admin_member'].includes(roleName);

        if (needsCommittee) {
            committeeGroup.classList.remove('d-none');
            document.getElementById('positionCommitteeSelect')?.setAttribute('required', 'required');
        } else {
            committeeGroup.classList.add('d-none');
            document.getElementById('positionCommitteeSelect')?.removeAttribute('required');
        }
    }

    async assignPosition() {
        const memberId = document.getElementById('selectedMemberId')?.value;
        const roleId = document.getElementById('positionRoleSelect')?.value;
        const committeeId = document.getElementById('positionCommitteeSelect')?.value;
        const notes = document.getElementById('positionNotes')?.value;

        if (!memberId || !roleId) {
            this.showError('يرجى اختيار العضو والمنصب');
            return;
        }

        const roleSelect = document.getElementById('positionRoleSelect');
        const selectedOption = roleSelect?.options[roleSelect.selectedIndex];
        const roleName = selectedOption?.dataset.name;
        const needsCommittee = ['committee_leader', 'deputy_committee_leader', 'committee_member', 'hr_admin_member', 'qa_admin_member'].includes(roleName);

        if (needsCommittee && !committeeId) {
            this.showError('يرجى اختيار اللجنة');
            return;
        }

        try {
            const currentUser = await window.AuthManager.getCurrentUser();
            if (!currentUser) {
                this.showError('يجب تسجيل الدخول أولاً');
                return;
            }

            const { data: existingRoles, error: checkError } = await this.supabase
                .from('user_roles')
                .select('id')
                .eq('user_id', memberId)
                .eq('is_active', true);

            if (checkError) throw checkError;

            if (existingRoles && existingRoles.length > 0) {
                await this.supabase
                    .from('user_roles')
                    .update({ is_active: false })
                    .eq('user_id', memberId)
                    .eq('is_active', true);
            }

            // حذف أي سجلات قديمة بنفس المفتاح الفريد لتجنب خطأ duplicate key
            // يجب الحذف قبل الإدراج لتجنب التعارض
            const deleteConditions = {
                user_id: memberId,
                role_id: roleId
            };
            
            if (committeeId) {
                deleteConditions.committee_id = committeeId;
            } else {
                // للمناصب التي لا تحتاج لجنة، نحذف السجلات التي committee_id = null
                await this.supabase
                    .from('user_roles')
                    .delete()
                    .eq('user_id', memberId)
                    .eq('role_id', roleId)
                    .is('committee_id', null);
            }
            
            if (committeeId) {
                await this.supabase
                    .from('user_roles')
                    .delete()
                    .match(deleteConditions);
            }

            const insertData = {
                user_id: memberId,
                role_id: roleId,
                committee_id: committeeId || null,
                is_active: true,
                assigned_by: currentUser.id,
                notes: notes || null
            };

            const { error: insertError } = await this.supabase
                .from('user_roles')
                .insert(insertData);

            if (insertError) throw insertError;

            this.showSuccess('تم تعيين المنصب بنجاح');
            this.resetForm();
            await this.loadStats();
            await this.loadPositionsHierarchy();
        } catch (error) {
            console.error('Error assigning position:', error);
            this.showError('حدث خطأ أثناء تعيين المنصب');
        }
    }

    async removePosition(userRoleId) {
        try {
            const { data: currentRole, error: fetchError } = await this.supabase
                .from('user_roles')
                .select('*, role:roles(role_level, role_name), committee_id')
                .eq('id', userRoleId)
                .single();

            if (fetchError) throw fetchError;

            if (currentRole.role?.role_level === 3) {
                this.showError('لا يمكن إزالة منصب عضو لجنة لأنه أدنى منصب في النظام');
                return;
            }

            if (!confirm('هل أنت متأكد من إزالة هذا المنصب؟ سيتم إرجاع العضو لمنصب عضو لجنة.')) {
                return;
            }

            const currentUser = await window.AuthManager.getCurrentUser();
            if (!currentUser) {
                this.showError('يجب تسجيل الدخول أولاً');
                return;
            }

            const { error: deactivateError } = await this.supabase
                .from('user_roles')
                .update({ is_active: false })
                .eq('id', userRoleId);

            if (deactivateError) throw deactivateError;

            const committeeMemberRole = this.roles.find(r => r.role_name === 'committee_member');
            if (!committeeMemberRole) {
                throw new Error('لم يتم العثور على منصب عضو لجنة');
            }

            // التحقق من وجود منصب عضو لجنة سابق
            const { data: existingRole, error: checkError } = await this.supabase
                .from('user_roles')
                .select('id')
                .eq('user_id', currentRole.user_id)
                .eq('role_id', committeeMemberRole.id)
                .eq('committee_id', currentRole.committee_id)
                .maybeSingle();

            if (checkError) throw checkError;

            if (existingRole) {
                // تفعيل المنصب الموجود
                const { error: updateError } = await this.supabase
                    .from('user_roles')
                    .update({
                        is_active: true,
                        assigned_by: currentUser.id,
                        notes: 'تم الإرجاع تلقائياً بعد إزالة المنصب'
                    })
                    .eq('id', existingRole.id);

                if (updateError) throw updateError;
            } else {
                // إنشاء منصب جديد
                const { error: insertError } = await this.supabase
                    .from('user_roles')
                    .insert({
                        user_id: currentRole.user_id,
                        role_id: committeeMemberRole.id,
                        committee_id: currentRole.committee_id,
                        is_active: true,
                        assigned_by: currentUser.id,
                        notes: 'تم الإرجاع تلقائياً بعد إزالة المنصب'
                    });

                if (insertError) throw insertError;
            }

            this.showSuccess('تم إزالة المنصب وإرجاع العضو لمنصب عضو لجنة');
            await this.loadStats();
            await this.loadPositionsHierarchy();
        } catch (error) {
            console.error('Error removing position:', error);
            this.showError('حدث خطأ أثناء إزالة المنصب');
        }
    }

    resetForm() {
        const form = document.getElementById('assignPositionForm');
        if (form) form.reset();
        this.deselectMember();
        document.getElementById('positionCommitteeGroup')?.classList.add('d-none');
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

// تهيئة المدير كمتغير عام
window.positionsManager = null;

// إنشاء المدير عند الحاجة
if (typeof PositionsManager !== 'undefined') {
    window.PositionsManager = PositionsManager;
}
