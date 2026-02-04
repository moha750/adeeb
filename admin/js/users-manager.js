/**
 * مدير قسم إدارة المستخدمين
 */

class UsersManager {
    constructor() {
        this.supabase = window.sbClient;
        this.allUsers = [];
        this.filteredUsers = [];
        this.currentFilters = {
            search: '',
            role: '',
            committee: '',
            status: ''
        };
    }

    /**
     * تهيئة المدير
     */
    async init() {
        try {
            await this.loadUsers();
            await this.loadStats();
            await this.loadFilterOptions();
            this.setupEventListeners();
        } catch (error) {
            console.error('Error initializing users manager:', error);
        }
    }

    /**
     * جلب جميع المستخدمين
     */
    async loadUsers() {
        try {
            const { data: users, error: usersError } = await this.supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (usersError) throw usersError;

            // جلب الأدوار وحالة التفعيل لكل مستخدم
            const usersWithRoles = await Promise.all(users.map(async (user) => {
                const { data: userRoles } = await this.supabase
                    .from('user_roles')
                    .select(`
                        role:roles (
                            role_name_ar,
                            role_level
                        ),
                        committee:committees (
                            committee_name_ar
                        )
                    `)
                    .eq('user_id', user.id)
                    .eq('is_active', true)
                    .limit(1);

                // فحص حالة التفعيل من member_onboarding_tokens
                let token = null;
                try {
                    const { data } = await this.supabase
                        .from('member_onboarding_tokens')
                        .select('is_used')
                        .eq('user_id', user.id)
                        .maybeSingle();
                    token = data;
                } catch (error) {
                    // تجاهل أخطاء RLS - قد يكون المستخدم في وضع التنكر
                    console.debug('Could not fetch token for user:', user.id);
                }

                // تحديد الحالة الفعلية
                let actualStatus = user.account_status;
                if (token && !token.is_used) {
                    actualStatus = 'pending'; // معلق - لم يفعل الحساب
                }

                return {
                    ...user,
                    user_roles: userRoles || [],
                    actual_status: actualStatus,
                    is_activated: !token || token.is_used
                };
            }));

            this.allUsers = usersWithRoles;
            this.filteredUsers = usersWithRoles;
            this.renderUsers();
        } catch (error) {
            console.error('Error loading users:', error);
            this.showError('حدث خطأ أثناء تحميل المستخدمين');
        }
    }

    /**
     * تحميل الإحصائيات
     */
    async loadStats() {
        try {
            // جلب IDs الأعضاء المعلقين (الذين لديهم tokens غير مستخدمة)
            const { data: pendingTokens } = await this.supabase
                .from('member_onboarding_tokens')
                .select('user_id')
                .eq('is_used', false);

            const pendingUserIds = pendingTokens ? pendingTokens.map(t => t.user_id) : [];

            const { count: totalUsers } = await this.supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true });

            // استثناء الأعضاء المعلقين من النشطين
            let activeQuery = this.supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('account_status', 'active');
            
            if (pendingUserIds.length > 0) {
                activeQuery = activeQuery.not('id', 'in', `(${pendingUserIds.join(',')})`);
            }

            const { count: activeUsers } = await activeQuery;

            const { count: inactiveUsers } = await this.supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('account_status', 'inactive');

            const { count: suspendedUsers } = await this.supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('account_status', 'suspended');

            this.renderStats({
                total: totalUsers || 0,
                active: activeUsers || 0,
                inactive: inactiveUsers || 0,
                suspended: suspendedUsers || 0
            });
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    /**
     * عرض الإحصائيات
     */
    renderStats(stats) {
        const container = document.getElementById('usersStatsGrid');
        if (!container) return;

        container.innerHTML = `
            <div class="stat-card" style="--stat-color: #3d8fd6">
                <div class="stat-card-wrapper">
                    <div class="stat-icon">
                        <i class="fa-solid fa-users"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${stats.total}</div>
                        <div class="stat-label">إجمالي المستخدمين</div>
                    </div>
                </div>
            </div>
            <div class="stat-card" style="--stat-color: #10b981">
                <div class="stat-card-wrapper">
                    <div class="stat-icon">
                        <i class="fa-solid fa-user-check"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${stats.active}</div>
                        <div class="stat-label">مستخدمين نشطين</div>
                    </div>
                </div>
            </div>
            <div class="stat-card" style="--stat-color: #f59e0b">
                <div class="stat-card-wrapper">
                    <div class="stat-icon">
                        <i class="fa-solid fa-user-clock"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${stats.inactive}</div>
                        <div class="stat-label">غير نشطين</div>
                    </div>
                </div>
            </div>
            <div class="stat-card" style="--stat-color: #ef4444">
                <div class="stat-card-wrapper">
                    <div class="stat-icon">
                        <i class="fa-solid fa-user-slash"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${stats.suspended}</div>
                        <div class="stat-label">معلقين</div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * تحميل خيارات الفلاتر
     */
    async loadFilterOptions() {
        try {
            // تحميل الأدوار
            const { data: roles } = await this.supabase
                .from('roles')
                .select('*')
                .order('role_level', { ascending: false });

            const roleFilter = document.getElementById('roleFilter');
            if (roleFilter && roles) {
                roles.forEach(role => {
                    const option = document.createElement('option');
                    option.value = role.id;
                    option.textContent = role.role_name_ar;
                    roleFilter.appendChild(option);
                });
            }

            // تحميل اللجان
            const { data: committees } = await this.supabase
                .from('committees')
                .select('*')
                .eq('is_active', true)
                .order('committee_name_ar');

            const committeeFilter = document.getElementById('committeeFilter');
            if (committeeFilter && committees) {
                committees.forEach(committee => {
                    const option = document.createElement('option');
                    option.value = committee.id;
                    option.textContent = committee.committee_name_ar;
                    committeeFilter.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading filter options:', error);
        }
    }

    /**
     * عرض المستخدمين
     */
    renderUsers() {
        const container = document.getElementById('usersTable');
        if (!container) return;

        if (this.filteredUsers.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-users-slash"></i>
                    <p>لا يوجد مستخدمين</p>
                </div>
            `;
            return;
        }

        const html = `
            <div class="applications-cards-grid">
                ${this.filteredUsers.map(user => this.renderUserCard(user)).join('')}
            </div>
        `;

        container.innerHTML = html;
    }

    /**
     * عرض بطاقة مستخدم واحد
     */
    renderUserCard(user) {
        const role = user.user_roles?.[0]?.role;
        const committee = user.user_roles?.[0]?.committee;
        
        const statusMap = {
            'active': { label: 'نشط', class: 'badge-success' },
            'inactive': { label: 'غير نشط', class: 'badge-warning' },
            'suspended': { label: 'معلق', class: 'badge-danger' },
            'pending': { label: 'معلق - لم يفعل الحساب', class: 'badge-info' }
        };
        
        // استخدام الحالة الفعلية بدلاً من account_status
        const status = statusMap[user.actual_status] || { label: 'غير محدد', class: 'badge-secondary' };
        const avatarUrl = user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name)}&background=3d8fd6&color=fff`;

        return `
            <div class="application-card" data-user-id="${user.id}">
                <div class="application-card-header">
                    <div class="applicant-info">
                        <div class="applicant-avatar">
                            <img src="${avatarUrl}" alt="${user.full_name}" />
                        </div>
                        <div class="applicant-details">
                            <h3 class="applicant-name">${user.full_name}</h3>
                            <span class="badge ${status.class}">${status.label}</span>
                        </div>
                    </div>
                </div>
                
                <div class="application-card-body">
                    <div class="application-info-grid">
                        ${user.email ? `
                            <div class="info-item">
                                <i class="fa-solid fa-envelope"></i>
                                <div class="info-content">
                                    <span class="info-label">البريد الإلكتروني</span>
                                    <span class="info-value">${user.email}</span>
                                </div>
                            </div>
                        ` : ''}
                        
                        ${user.phone ? `
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
                                <span class="info-label">الدور</span>
                                <span class="info-value">${role?.role_name_ar || 'غير محدد'}</span>
                            </div>
                        </div>
                        
                        ${committee ? `
                            <div class="info-item">
                                <i class="fa-solid fa-sitemap"></i>
                                <div class="info-content">
                                    <span class="info-label">اللجنة</span>
                                    <span class="info-value">${committee.committee_name_ar}</span>
                                </div>
                            </div>
                        ` : ''}
                        
                        <div class="info-item">
                            <i class="fa-solid fa-calendar"></i>
                            <div class="info-content">
                                <span class="info-label">تاريخ الانضمام</span>
                                <span class="info-value">${new Date(user.created_at).toLocaleDateString('ar-SA')}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="application-card-footer">
                    <button class="btn-action btn-action-primary btn-view-user" data-user-id="${user.id}">
                        <i class="fa-solid fa-eye"></i>
                        عرض التفاصيل
                    </button>
                    <button class="btn-action btn-action-outline btn-edit-user" data-user-id="${user.id}">
                        <i class="fa-solid fa-edit"></i>
                        تعديل
                    </button>
                    <button class="btn-action btn-action-danger btn-terminate-membership" data-user-id="${user.id}" title="إنهاء العضوية نهائياً">
                        <i class="fa-solid fa-user-slash"></i>
                        إنهاء العضوية
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * تطبيق الفلاتر
     */
    applyFilters() {
        this.filteredUsers = this.allUsers.filter(user => {
            // فلتر البحث
            if (this.currentFilters.search) {
                const searchLower = this.currentFilters.search.toLowerCase();
                const matchesSearch = 
                    user.full_name?.toLowerCase().includes(searchLower) ||
                    user.email?.toLowerCase().includes(searchLower) ||
                    user.phone?.includes(searchLower);
                
                if (!matchesSearch) return false;
            }

            // فلتر الدور
            if (this.currentFilters.role) {
                const userRole = user.user_roles?.[0]?.role;
                if (!userRole || userRole.id !== this.currentFilters.role) return false;
            }

            // فلتر اللجنة
            if (this.currentFilters.committee) {
                const userCommittee = user.user_roles?.[0]?.committee;
                if (!userCommittee || userCommittee.id !== this.currentFilters.committee) return false;
            }

            // فلتر الحالة
            if (this.currentFilters.status) {
                if (user.actual_status !== this.currentFilters.status) return false;
            }

            return true;
        });

        this.renderUsers();
    }

    /**
     * إعداد Event Listeners
     */
    setupEventListeners() {
        // البحث
        const searchInput = document.getElementById('userSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.currentFilters.search = e.target.value;
                this.applyFilters();
            });
        }

        // فلتر الدور
        const roleFilter = document.getElementById('roleFilter');
        if (roleFilter) {
            roleFilter.addEventListener('change', (e) => {
                this.currentFilters.role = e.target.value;
                this.applyFilters();
            });
        }

        // فلتر اللجنة
        const committeeFilter = document.getElementById('committeeFilter');
        if (committeeFilter) {
            committeeFilter.addEventListener('change', (e) => {
                this.currentFilters.committee = e.target.value;
                this.applyFilters();
            });
        }

        // فلتر الحالة
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.currentFilters.status = e.target.value;
                this.applyFilters();
            });
        }

        // زر التنكر كمستخدم
        const impersonateBtn = document.getElementById('impersonateUserBtn');
        if (impersonateBtn) {
            this.checkImpersonationPermission(impersonateBtn);
            impersonateBtn.addEventListener('click', () => {
                if (window.ImpersonationManager) {
                    window.ImpersonationManager.openImpersonationDialog();
                }
            });
        }

        // أزرار عرض التفاصيل وتعديل وإنهاء العضوية
        document.addEventListener('click', (e) => {
            if (e.target.closest('.btn-view-user')) {
                const userId = e.target.closest('.btn-view-user').dataset.userId;
                this.viewUserDetails(userId);
            } else if (e.target.closest('.btn-edit-user')) {
                const userId = e.target.closest('.btn-edit-user').dataset.userId;
                this.editUser(userId);
            } else if (e.target.closest('.btn-terminate-membership')) {
                const userId = e.target.closest('.btn-terminate-membership').dataset.userId;
                this.terminateMembership(userId);
            }
        });
    }

    /**
     * عرض تفاصيل المستخدم
     */
    viewUserDetails(userId) {
        const user = this.allUsers.find(u => u.id === userId);
        if (!user) return;

        const role = user.user_roles?.[0]?.role;
        const committee = user.user_roles?.[0]?.committee;

        const content = `
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">الاسم الكامل</span>
                    <span class="detail-value">${user.full_name}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">البريد الإلكتروني</span>
                    <span class="detail-value">${user.email || 'غير محدد'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">الجوال</span>
                    <span class="detail-value">${user.phone || 'غير محدد'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">الدور</span>
                    <span class="detail-value">${role?.role_name_ar || 'غير محدد'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">اللجنة</span>
                    <span class="detail-value">${committee?.committee_name_ar || 'غير محدد'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">حالة الحساب</span>
                    <span class="detail-value">${user.account_status}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">تاريخ الانضمام</span>
                    <span class="detail-value">${new Date(user.created_at).toLocaleDateString('ar-SA')}</span>
                </div>
            </div>
        `;

        window.openModal('تفاصيل المستخدم', content, { icon: 'fa-user' });
    }

    /**
     * تعديل المستخدم
     */
    editUser(userId) {
        const user = this.allUsers.find(u => u.id === userId);
        if (!user) return;

        const fields = [
            {
                id: 'edit-full-name',
                label: 'الاسم الكامل',
                type: 'text',
                value: user.full_name,
                required: true
            },
            {
                id: 'edit-email',
                label: 'البريد الإلكتروني',
                type: 'email',
                value: user.email || '',
                required: true
            },
            {
                id: 'edit-phone',
                label: 'الجوال',
                type: 'tel',
                value: user.phone || ''
            }
        ];

        window.openFormModal('تعديل بيانات المستخدم', fields, async (formData) => {
            try {
                const { error } = await this.supabase
                    .from('profiles')
                    .update({
                        full_name: formData['edit-full-name'],
                        email: formData['edit-email'],
                        phone: formData['edit-phone']
                    })
                    .eq('id', userId);

                if (error) throw error;

                window.showSuccessModal('تم التحديث', 'تم تحديث بيانات المستخدم بنجاح');
                this.loadUsers();
            } catch (error) {
                console.error('Error updating user:', error);
                window.showErrorModal('خطأ', 'حدث خطأ أثناء تحديث البيانات');
            }
        }, { icon: 'fa-edit', submitText: 'حفظ التعديلات' });
    }

    /**
     * إنهاء عضوية المستخدم نهائياً
     */
    async terminateMembership(userId) {
        const user = this.allUsers.find(u => u.id === userId);
        if (!user) return;

        const result = await Swal.fire({
            title: 'تأكيد إنهاء العضوية',
            html: `
                <div style="text-align: center;">
                    <p style="font-size: 1.1rem; margin-bottom: 1rem;">
                        هل أنت متأكد من إنهاء عضوية <strong>${user.full_name}</strong>؟
                    </p>
                    <div style="background: #fff3cd; padding: 1rem; border-radius: 8px; border-right: 4px solid #ffc107; margin: 1rem 0;">
                        <i class="fa-solid fa-exclamation-triangle" style="color: #ffc107; font-size: 1.5rem;"></i>
                        <p style="margin: 0.5rem 0 0; color: #856404; font-weight: 600;">
                            تحذير: هذا الإجراء سيقوم بـ:
                        </p>
                        <ul style="text-align: right; margin: 0.5rem 0; padding-right: 1.5rem; color: #856404;">
                            <li>حذف جميع أدوار ومناصب المستخدم</li>
                            <li>تعطيل حساب المستخدم نهائياً</li>
                            <li>منع المستخدم من الدخول للنظام</li>
                        </ul>
                    </div>
                    <p style="color: #dc3545; font-weight: 600; margin-top: 1rem;">
                        لا يمكن التراجع عن هذا الإجراء!
                    </p>
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'نعم، إنهاء العضوية',
            cancelButtonText: 'إلغاء',
            reverseButtons: true
        });

        if (!result.isConfirmed) return;

        try {
            // 1. تعطيل جميع أدوار المستخدم
            const { error: rolesError } = await this.supabase
                .from('user_roles')
                .update({ is_active: false })
                .eq('user_id', userId);

            if (rolesError) throw rolesError;

            // 2. تحديث حالة الحساب إلى معلق
            const { error: profileError } = await this.supabase
                .from('profiles')
                .update({ 
                    account_status: 'suspended',
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);

            if (profileError) throw profileError;

            // 3. إلغاء أي tokens معلقة
            const { error: tokensError } = await this.supabase
                .from('member_onboarding_tokens')
                .update({ is_used: true })
                .eq('user_id', userId);

            if (tokensError) console.warn('Error updating tokens:', tokensError);

            await Swal.fire({
                title: 'تم إنهاء العضوية',
                html: `
                    <p>تم إنهاء عضوية <strong>${user.full_name}</strong> بنجاح</p>
                    <p style="color: #6c757d; font-size: 0.9rem; margin-top: 0.5rem;">
                        تم تعطيل جميع الأدوار والصلاحيات
                    </p>
                `,
                icon: 'success',
                confirmButtonText: 'حسناً'
            });

            await this.loadUsers();
            await this.loadStats();
        } catch (error) {
            console.error('Error terminating membership:', error);
            await Swal.fire({
                title: 'خطأ',
                text: 'حدث خطأ أثناء إنهاء العضوية. يرجى المحاولة مرة أخرى.',
                icon: 'error',
                confirmButtonText: 'حسناً'
            });
        }
    }

    /**
     * التحقق من صلاحية التنكر وإظهار الزر
     */
    async checkImpersonationPermission(button) {
        if (window.ImpersonationManager) {
            const canImpersonate = await window.ImpersonationManager.canImpersonate();
            if (canImpersonate) {
                button.style.display = 'block';
            }
        }
    }

    /**
     * عرض رسالة خطأ
     */
    showError(message) {
        const container = document.getElementById('usersTable');
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <i class="fa-solid fa-exclamation-triangle"></i>
                    <p>${message}</p>
                </div>
            `;
        }
    }
}

// تصدير للاستخدام العام
window.UsersManager = UsersManager;
