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
        this.departments = [];
    }

    async init() {
        try {
            await this.loadRoles();
            await this.loadCommittees();
            await this.loadDepartments();
            await this.loadOccupancy();
            this.populateRolesSelect();
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

        const occupied = this.occupancy?.globallyUnique || {};

        let html = '<option value="">اختر المنصب</option>';
        this.roles.forEach(role => {
            if (role.role_name === 'committee_member') return;
            const occupant = occupied[role.role_name];
            const label = occupant
                ? `${role.role_name_ar} — ✓ يشغله: ${occupant}`
                : role.role_name_ar;
            const disabled = occupant ? 'disabled' : '';
            html += `<option value="${role.id}" data-level="${role.role_level}" data-name="${role.role_name}" ${disabled}>${label}</option>`;
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

    populateCommitteesSelect(roleName = null) {
        const select = document.getElementById('positionCommitteeSelect');
        if (!select) return;

        // الأدوار الإدارية تُراقب اللجان التشغيلية فقط — لا تُعيَّن على اللجان الإدارية نفسها
        const isAdminRole = roleName === 'hr_admin_member' || roleName === 'qa_admin_member';
        const isPerCommitteeUnique = PositionsManager.PER_COMMITTEE_UNIQUE.includes(roleName);
        const byCommittee = this.occupancy?.byCommittee || {};

        let html = '<option value="">اختر اللجنة</option>';
        this.committees.forEach(committee => {
            if (isAdminRole && !committee.department_id) return;
            let label = committee.committee_name_ar;
            let disabled = '';
            if (isPerCommitteeUnique) {
                const occupant = byCommittee[`${roleName}|${committee.id}`];
                if (occupant) {
                    label += ` — ✓ يشغله: ${occupant}`;
                    disabled = 'disabled';
                }
            }
            html += `<option value="${committee.id}" ${disabled}>${label}</option>`;
        });
        select.innerHTML = html;
    }

    async loadDepartments() {
        try {
            const { data: departments, error } = await this.supabase
                .from('departments')
                .select('id, name_ar')
                .eq('is_active', true)
                .order('display_order', { ascending: true });

            if (error) throw error;
            this.departments = departments || [];
        } catch (error) {
            console.error('Error loading departments:', error);
            this.showError('حدث خطأ أثناء تحميل الأقسام');
        }
    }

    populateDepartmentsSelect() {
        const select = document.getElementById('positionCommitteeSelect');
        if (!select) return;

        const byDept = this.occupancy?.byDepartment || {};

        let html = '<option value="">اختر القسم</option>';
        this.departments.forEach(dept => {
            const occupant = byDept[`department_head|${dept.id}`];
            const label = occupant ? `${dept.name_ar} — ✓ يشغله: ${occupant}` : dept.name_ar;
            const disabled = occupant ? 'disabled' : '';
            html += `<option value="${dept.id}" ${disabled}>${label}</option>`;
        });
        select.innerHTML = html;
    }

    async loadOccupancy() {
        try {
            const { data: userRoles, error } = await this.supabase
                .from('user_roles')
                .select('role:roles(role_name), committee_id, department_id, profile:user_id(full_name)')
                .eq('is_active', true);

            if (error) throw error;

            const globallyUnique = {};
            const byCommittee = {};
            const byDepartment = {};

            (userRoles || []).forEach(ur => {
                const roleName = ur.role?.role_name;
                const name = ur.profile?.full_name || 'غير محدد';
                if (!roleName) return;

                if (PositionsManager.GLOBALLY_UNIQUE_ROLES.includes(roleName)) {
                    globallyUnique[roleName] = name;
                } else if (PositionsManager.PER_COMMITTEE_UNIQUE.includes(roleName) && ur.committee_id) {
                    byCommittee[`${roleName}|${ur.committee_id}`] = name;
                } else if (PositionsManager.PER_DEPARTMENT_UNIQUE.includes(roleName) && ur.department_id) {
                    byDepartment[`${roleName}|${ur.department_id}`] = name;
                }
            });

            this.occupancy = { globallyUnique, byCommittee, byDepartment };
        } catch (error) {
            console.error('Error loading occupancy:', error);
            this.occupancy = { globallyUnique: {}, byCommittee: {}, byDepartment: {} };
        }
    }

    refreshOccupancyUI() {
        this.populateRolesSelect();
        // أعد تعبئة قائمة اللجان/الأقسام حسب الدور الحالي لتحديث شارات الإشغال
        const roleSelect = document.getElementById('positionRoleSelect');
        if (roleSelect?.value) this.handleRoleChange(roleSelect.value);
    }

    // تصنيف الأدوار حسب قاعدة الإشغال — يحدد أيّها يعرض شارة «مشغول»
    static GLOBALLY_UNIQUE_ROLES = ['club_president', 'executive_council_president', 'hr_committee_leader', 'qa_committee_leader'];
    static PER_COMMITTEE_UNIQUE  = ['committee_leader', 'deputy_committee_leader'];
    static PER_DEPARTMENT_UNIQUE = ['department_head'];

    // أيقونة كل منصب حسب role_name
    static ROLE_ICONS = {
        club_president:               'fa-crown',
        president_advisor:            'fa-hat-wizard',
        executive_council_president:  'fa-landmark',
        hr_committee_leader:          'fa-users-gear',
        qa_committee_leader:          'fa-clipboard-check',
        department_head:              'fa-sitemap',
        hr_admin_member:              'fa-id-card-clip',
        qa_admin_member:              'fa-list-check',
        committee_leader:             'fa-people-group',
        deputy_committee_leader:      'fa-user-shield',
        committee_member:             'fa-user'
    };


    async loadStats() {
        try {
            const [{ data: allRoles, error: rolesErr }, { data: userRoles, error: urErr }] = await Promise.all([
                this.supabase.from('roles').select('role_name, council_type').neq('role_name', 'committee_member'),
                this.supabase.from('user_roles').select('role:roles(role_name, council_type)').eq('is_active', true)
            ]);

            if (rolesErr) throw rolesErr;
            if (urErr) throw urErr;

            const stats = { admin: 0, executive: 0, occupied: 0, vacant: 0 };
            const totalRoles = (allRoles || []).length;

            // أدوار مشغولة (فريدة)
            const occupiedRoles = new Set();
            (userRoles || []).forEach(ur => {
                const name = ur.role?.role_name;
                if (!name || name === 'committee_member') return;
                const ct = ur.role?.council_type;
                if (ct === 'administrative' || ct === 'both') stats.admin++;
                if (ct === 'executive' || ct === 'both') stats.executive++;
                occupiedRoles.add(name);
            });

            stats.occupied = occupiedRoles.size;
            stats.vacant = totalRoles - occupiedRoles.size;

            this.renderStats(stats);
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    renderStats(stats) {
        const el = id => document.getElementById(id);
        if (el('posStatAdmin'))   el('posStatAdmin').textContent   = stats.admin;
        if (el('posStatExec'))    el('posStatExec').textContent    = stats.executive;
        if (el('posStatRoles'))   el('posStatRoles').textContent   = stats.occupied;
        if (el('posStatVacant'))  el('posStatVacant').textContent  = stats.vacant;
    }

    async loadPositionsHierarchy() {
        const wrapper = document.getElementById('positionsHierarchyContainer');
        if (!wrapper) return;

        wrapper.innerHTML = `
            <div class="empty-state">
                <div class="empty-state__icon"><i class="fa-solid fa-spinner fa-spin"></i></div>
                <p class="empty-state__message">جاري التحميل...</p>
            </div>`;

        try {
            // جلب جميع الأدوار + التعيينات النشطة بالتوازي
            const [{ data: allRoles, error: rolesErr }, { data: userRoles, error: urErr }] = await Promise.all([
                this.supabase.from('roles').select('id, role_name, role_name_ar, role_level, council_type').order('role_level', { ascending: false }),
                this.supabase.from('user_roles').select(`
                    *,
                    profile:user_id(id, full_name, email, avatar_url),
                    role:roles(id, role_name, role_name_ar, role_level, council_type),
                    committee:committees(committee_name_ar)
                `).eq('is_active', true)
            ]);

            if (rolesErr) throw rolesErr;
            if (urErr) throw urErr;

            // بناء خريطة لجميع الأدوار (بما فيها الفارغة) — بدون committee_member
            const grouped = {};
            (allRoles || []).forEach(role => {
                if (role.role_name === 'committee_member') return;
                grouped[role.role_name] = {
                    role_name: role.role_name,
                    role_name_ar: role.role_name_ar,
                    role_level: role.role_level,
                    council_type: role.council_type,
                    members: []
                };
            });

            // تعبئة الأعضاء في كل منصب
            (userRoles || []).forEach(ur => {
                const key = ur.role?.role_name;
                if (!key || key === 'committee_member') return;
                if (grouped[key]) {
                    grouped[key].members.push(ur);
                }
            });

            // ترتيب حسب المستوى تنازلياً (للعرض فقط)
            const sorted = Object.values(grouped).sort((a, b) => b.role_level - a.role_level);

            if (sorted.length === 0) {
                wrapper.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state__icon"><i class="fa-solid fa-user-slash"></i></div>
                        <h4 class="empty-state__title">لا توجد مناصب</h4>
                        <p class="empty-state__message">لا توجد مناصب معيّنة حالياً</p>
                    </div>`;
                return;
            }

            let html = '';
            for (const group of sorted) {
                const icon = PositionsManager.ROLE_ICONS[group.role_name] || 'fa-user';
                const councilLabel = group.council_type === 'administrative' ? 'إداري'
                    : group.council_type === 'executive' ? 'تنفيذي'
                    : group.council_type === 'both' ? 'إداري وتنفيذي' : '';

                html += `
                <div class="uc-card" style="margin-bottom: 1rem;">
                    <div class="uc-card__header">
                        <div class="uc-card__header-inner">
                            <div class="uc-card__icon"><i class="fa-solid ${icon}"></i></div>
                            <div class="uc-card__header-info">
                                <h3 class="uc-card__title">${group.role_name_ar}</h3>
                                ${councilLabel ? `<span class="uc-card__badge">${councilLabel}</span>` : ''}
                                <span class="uc-card__badge"><i class="fa-solid fa-users"></i> ${group.members.length} ${group.members.length === 1 ? 'عضو' : 'أعضاء'}</span>
                            </div>
                        </div>
                    </div>
                    <div class="uc-card__body">`;

                if (group.members.length === 0) {
                    html += `
                        <div class="empty-state" style="padding:1.5rem;border:none;background:transparent;">
                            <div class="empty-state__icon"><i class="fa-solid fa-user-slash"></i></div>
                            <p class="empty-state__message">لم يُعيَّن أحد لهذا المنصب بعد</p>
                        </div>`;
                } else {
                    html += `<div class="member-chips">`;
                    for (const member of group.members) {
                        const profile = member.profile;
                        const committee = member.committee;
                        const avatarUrl = profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || 'User')}&background=3d8fd6&color=fff`;
                        const canDelete = group.role_name !== 'club_president';

                        html += `
                            <div class="member-chip" data-user-role-id="${member.id}">
                                <img src="${avatarUrl}" alt="${profile?.full_name}" class="member-chip__avatar" />
                                <div class="member-chip__info">
                                    <span class="member-chip__name">${profile?.full_name || 'غير محدد'}</span>
                                    ${committee ? `<span class="member-chip__role"><i class="fa-solid fa-users"></i> ${committee.committee_name_ar}</span>` : ''}
                                </div>
                                ${canDelete ? `
                                <button class="btn btn-icon btn-danger btn-sm" style="flex-shrink:0;margin-inline-start:auto;"
                                        onclick="window.positionsManager.removePosition('${member.id}')"
                                        title="إزالة المنصب">
                                    <i class="fa-solid fa-user-minus"></i>
                                </button>` : ''}
                            </div>`;
                    }
                    html += `</div>`;
                }

                html += `
                    </div>
                </div>`;
            }

            wrapper.innerHTML = html;
        } catch (error) {
            console.error('Error loading positions hierarchy:', error);
            wrapper.innerHTML = `
                <div class="empty-state empty-state--danger">
                    <div class="empty-state__icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
                    <h4 class="empty-state__title">خطأ</h4>
                    <p class="empty-state__message">حدث خطأ أثناء تحميل الهيكلة</p>
                </div>`;
        }
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
            if (searchResults && !searchResults.parentElement?.contains(e.target)) {
                searchResults.classList.remove('show');
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
            searchResults.classList.remove('show');
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
                    <div class="autocomplete-empty">
                        <div class="autocomplete-empty__icon"><i class="fa-solid fa-user-slash"></i></div>
                        <p class="autocomplete-empty__text">لم يتم العثور على أعضاء</p>
                        <p class="autocomplete-empty__hint">جرّب اسماً مختلفاً أو جزءاً من البريد الإلكتروني</p>
                    </div>
                `;
                searchResults.classList.add('show');
                return;
            }

            let itemsHtml = '';
            members.forEach(member => {
                const avatarUrl = member.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.full_name || 'User')}&background=3d8fd6&color=fff`;
                itemsHtml += `
                    <button type="button" class="autocomplete-item" data-member-id="${member.id}" data-member-name="${member.full_name}" data-member-email="${member.email}" data-member-avatar="${avatarUrl}">
                        <span class="autocomplete-item__avatar-wrap">
                            <img class="autocomplete-item__avatar" src="${avatarUrl}" alt="${member.full_name}" />
                        </span>
                        <div class="autocomplete-item__info">
                            <div class="autocomplete-item__name">${member.full_name}</div>
                            <div class="autocomplete-item__email">${member.email}</div>
                        </div>
                        <span class="btn btn-icon btn-primary btn-outline btn-sm"><i class="fa-solid fa-plus"></i></span>
                    </button>
                `;
            });

            const html = `
                <div class="autocomplete-menu__header">
                    <span><i class="fa-solid fa-magnifying-glass"></i> نتائج البحث</span>
                    <span class="autocomplete-menu__count">${members.length}</span>
                </div>
                <div class="autocomplete-menu__list">${itemsHtml}</div>
            `;

            searchResults.innerHTML = html;
            searchResults.classList.add('show');

            searchResults.querySelectorAll('.autocomplete-item').forEach(item => {
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
        if (searchResults) searchResults.classList.remove('show');
        if (selectedMemberId) selectedMemberId.value = member.id;

        if (selectedMemberDisplay) {
            selectedMemberDisplay.innerHTML = `
                <img src="${member.avatar}" alt="${member.name}" class="member-chip__avatar" />
                <div class="member-chip__info">
                    <span class="member-chip__name">${member.name}</span>
                    <span class="member-chip__role">${member.email}</span>
                </div>
                <button type="button" class="btn btn-icon btn-danger" style="position:absolute;top:6px;left:6px;width:26px;height:26px;min-width:26px;padding:0;" onclick="positionsManager.deselectMember()">
                    <i class="fa-solid fa-times" style="font-size:0.7rem;"></i>
                </button>
            `;
            selectedMemberDisplay.classList.remove('d-none');
        }
    }

    deselectMember() {
        this.selectedMember = null;
        const selectedMemberId = document.getElementById('selectedMemberId');
        const selectedMemberDisplay = document.getElementById('selectedMemberDisplay');

        if (selectedMemberId) selectedMemberId.value = '';
        if (selectedMemberDisplay) {
            selectedMemberDisplay.innerHTML = '';
            selectedMemberDisplay.classList.add('d-none');
        }
    }

    handleRoleChange(roleId) {
        const committeeGroup = document.getElementById('positionCommitteeGroup');
        if (!committeeGroup) return;

        const roleSelect = document.getElementById('positionRoleSelect');
        const selectedOption = roleSelect?.options[roleSelect.selectedIndex];
        const roleName = selectedOption?.dataset.name;

        const needsCommittee  = ['committee_leader', 'deputy_committee_leader', 'committee_member', 'hr_admin_member', 'qa_admin_member'].includes(roleName);
        const needsDepartment = roleName === 'department_head';

        const select = document.getElementById('positionCommitteeSelect');
        const label  = committeeGroup.querySelector('.form-label');

        if (needsCommittee) {
            committeeGroup.classList.remove('d-none');
            select?.setAttribute('required', 'required');
            if (label) label.innerHTML = '<i class="label-icon fa-solid fa-people-group"></i> اللجنة';
            this.populateCommitteesSelect(roleName);
        } else if (needsDepartment) {
            committeeGroup.classList.remove('d-none');
            select?.setAttribute('required', 'required');
            if (label) label.innerHTML = '<i class="label-icon fa-solid fa-sitemap"></i> القسم';
            this.populateDepartmentsSelect();
        } else {
            committeeGroup.classList.add('d-none');
            select?.removeAttribute('required');
        }
    }

    async assignPosition() {
        const memberId = document.getElementById('selectedMemberId')?.value;
        const roleId = document.getElementById('positionRoleSelect')?.value;
        const selectedEntityId = document.getElementById('positionCommitteeSelect')?.value;
        const notes = document.getElementById('positionNotes')?.value;

        if (!memberId || !roleId) {
            this.showError('يرجى اختيار العضو والمنصب');
            return;
        }

        const roleSelect = document.getElementById('positionRoleSelect');
        const selectedOption = roleSelect?.options[roleSelect.selectedIndex];
        const roleName = selectedOption?.dataset.name;
        const needsCommittee  = ['committee_leader', 'deputy_committee_leader', 'committee_member', 'hr_admin_member', 'qa_admin_member'].includes(roleName);
        const needsDepartment = roleName === 'department_head';

        if (needsCommittee && !selectedEntityId) {
            this.showError('يرجى اختيار اللجنة');
            return;
        }
        if (needsDepartment && !selectedEntityId) {
            this.showError('يرجى اختيار القسم');
            return;
        }

        const committeeId  = needsCommittee  ? selectedEntityId : null;
        const departmentId = needsDepartment ? selectedEntityId : null;

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
            const deleteBase = this.supabase
                .from('user_roles')
                .delete()
                .eq('user_id', memberId)
                .eq('role_id', roleId);

            if (committeeId) {
                await deleteBase.eq('committee_id', committeeId);
            } else if (departmentId) {
                await deleteBase.eq('department_id', departmentId);
            } else {
                await deleteBase.is('committee_id', null).is('department_id', null);
            }

            const insertData = {
                user_id: memberId,
                role_id: roleId,
                committee_id: committeeId,
                department_id: departmentId,
                is_active: true,
                assigned_by: currentUser.id,
                notes: notes || null
            };

            const { error: insertError } = await this.supabase
                .from('user_roles')
                .insert(insertData);

            if (insertError) throw insertError;

            // إرسال إيميل تهنئة للمعيَّن الجديد (غير موقف)
            if (window.edgeInvoke) {
                try { await window.sbClient?.auth?.refreshSession(); } catch (_) { /* تجاهل */ }

                window.edgeInvoke('send-position-assignment-email', {
                    userId: memberId,
                    action: 'assigned',
                    roleId,
                    committeeId,
                    departmentId
                }).then(res => { if (!res?.ok) console.warn('[positions] assignment email failed:', res); })
                  .catch(err => console.warn('[positions] assignment email error:', err));
            }

            this.showSuccess('تم تعيين المنصب بنجاح');
            this.resetForm();
            await this.loadOccupancy();
            this.refreshOccupancyUI();
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

            const confirmed = await window.confirmModal({
                title: 'إزالة المنصب',
                message: 'هل أنت متأكد من إزالة هذا المنصب؟ سيتم إرجاع العضو لمنصب عضو لجنة.',
                confirmText: 'إزالة',
                cancelText: 'إلغاء',
                type: 'warning'
            });
            if (!confirmed) return;

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

            // إيميل إشعار للعضو بإزالة المنصب (غير موقف)
            if (window.edgeInvoke) {
                try { await window.sbClient?.auth?.refreshSession(); } catch (_) { /* تجاهل */ }

                window.edgeInvoke('send-position-assignment-email', {
                    userId: currentRole.user_id,
                    action: 'removed',
                    roleId: currentRole.role_id,
                    committeeId: currentRole.committee_id || null,
                    departmentId: currentRole.department_id || null
                }).then(res => { if (!res?.ok) console.warn('[positions] removal email failed:', res); })
                  .catch(err => console.warn('[positions] removal email error:', err));
            }

            this.showSuccess('تم إزالة المنصب وإرجاع العضو لمنصب عضو لجنة');
            await this.loadOccupancy();
            this.refreshOccupancyUI();
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
            window.showToast({ message, type: 'success' });
        } else {
            alert(message);
        }
    }

    showError(message) {
        if (typeof window.showToast === 'function') {
            window.showToast({ message, type: 'error' });
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

