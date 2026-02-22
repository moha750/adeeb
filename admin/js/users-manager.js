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
     * جلب جميع المستخدمين النشطين فقط
     */
    async loadUsers() {
        try {
            // جلب الأعضاء النشطين فقط
            const { data: users, error: usersError } = await this.supabase
                .from('profiles')
                .select('*')
                .eq('account_status', 'active')
                .order('created_at', { ascending: false });

            if (usersError) throw usersError;

            // جلب الأدوار لكل مستخدم
            const usersWithRoles = await Promise.all(users.map(async (user) => {
                const { data: userRoles } = await this.supabase
                    .from('user_roles')
                    .select(`
                        role_id,
                        committee_id,
                        role:roles (
                            id,
                            role_name_ar,
                            role_level
                        ),
                        committee:committees (
                            id,
                            committee_name_ar
                        )
                    `)
                    .eq('user_id', user.id)
                    .eq('is_active', true)
                    .limit(1);

                return {
                    ...user,
                    user_roles: userRoles || []
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
     * تحميل الإحصائيات - عرض الأعضاء النشطين فقط
     */
    async loadStats() {
        try {
            const { count: activeUsers } = await this.supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('account_status', 'active');

            this.renderStats({
                active: activeUsers || 0
            });
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    /**
     * عرض الإحصائيات - كارت واحد للأعضاء النشطين فقط
     */
    renderStats(stats) {
        const container = document.getElementById('usersStatsGrid');
        if (!container) return;

        container.innerHTML = `
            <div class="stat-card" style="--stat-color: #10b981">
                <div class="stat-card-wrapper">
                    <div class="stat-icon">
                        <i class="fa-solid fa-user-check"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${stats.active}</div>
                        <div class="stat-label">أعضاء أديب النشطين</div>
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
                // تفريغ الخيارات الموجودة (ما عدا الخيار الأول)
                while (roleFilter.options.length > 1) {
                    roleFilter.remove(1);
                }
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
                // تفريغ الخيارات الموجودة (ما عدا الخيار الأول)
                while (committeeFilter.options.length > 1) {
                    committeeFilter.remove(1);
                }
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
            'inactive': { label: 'معلق - لم يفعل الحساب', class: 'badge-warning' },
            'suspended': { label: 'عضوية منتهية', class: 'badge-danger' }
        };
        
        const status = statusMap[user.account_status] || { label: 'غير محدد', class: 'badge-secondary' };
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
                    <button class="btn btn--info btn--sm btn-view-user" data-user-id="${user.id}">
                        <i class="fa-solid fa-eye"></i>
                        عرض التفاصيل
                    </button>
                    <button class="btn btn--outline-secondary btn--sm btn-edit-user" data-user-id="${user.id}">
                        <i class="fa-solid fa-edit"></i>
                        تعديل
                    </button>
                    <button class="btn btn--danger btn--sm btn-terminate-membership" data-user-id="${user.id}" title="إنهاء العضوية نهائياً">
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

            // فلتر الدور - استخدام role_id مباشرة
            if (this.currentFilters.role) {
                const userRoleId = user.user_roles?.[0]?.role_id;
                if (!userRoleId || String(userRoleId) !== String(this.currentFilters.role)) return false;
            }

            // فلتر اللجنة - استخدام committee_id مباشرة
            if (this.currentFilters.committee) {
                const userCommitteeId = user.user_roles?.[0]?.committee_id;
                if (!userCommitteeId || String(userCommitteeId) !== String(this.currentFilters.committee)) return false;
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

        // زر التصدير
        const exportBtn = document.getElementById('exportMembersBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.showExportDialog());
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
    async viewUserDetails(userId) {
        const user = this.allUsers.find(u => u.id === userId);
        if (!user) return;

        const role = user.user_roles?.[0]?.role;
        const committee = user.user_roles?.[0]?.committee;
        
        const statusLabels = {
            'active': 'نشط',
            'inactive': 'معلق - لم يفعل الحساب',
            'suspended': 'عضوية منتهية'
        };
        
        const avatarUrl = user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name)}&background=3d8fd6&color=fff&size=100`;

        // جلب بيانات member_details
        let memberDetails = null;
        try {
            const { data, error } = await this.supabase
                .from('member_details')
                .select('*')
                .eq('user_id', userId)
                .single();
            
            if (!error && data) {
                memberDetails = data;
            }
        } catch (error) {
            console.warn('Error fetching member details:', error);
        }

        const content = `
            <div class="user-details-modal">
                <div class="user-details-header">
                    <img src="${avatarUrl}" alt="${user.full_name}" class="user-avatar-lg" />
                    <h3 class="user-name-lg">${user.full_name}</h3>
                </div>
                <div class="application-info-grid" style="margin-top: 1.5rem;">
                    <div class="info-item">
                        <i class="fa-solid fa-envelope"></i>
                        <div class="info-content">
                            <span class="info-label">البريد الإلكتروني</span>
                            <span class="info-value">${user.email || 'غير محدد'}</span>
                        </div>
                    </div>
                    <div class="info-item">
                        <i class="fa-solid fa-phone"></i>
                        <div class="info-content">
                            <span class="info-label">الجوال</span>
                            <span class="info-value">${user.phone || memberDetails?.phone || 'غير محدد'}</span>
                        </div>
                    </div>
                    ${memberDetails?.national_id ? `
                    <div class="info-item">
                        <i class="fa-solid fa-id-card"></i>
                        <div class="info-content">
                            <span class="info-label">الهوية الوطنية</span>
                            <span class="info-value">${memberDetails.national_id}</span>
                        </div>
                    </div>
                    ` : ''}
                    ${memberDetails?.full_name_triple ? `
                    <div class="info-item">
                        <i class="fa-solid fa-signature"></i>
                        <div class="info-content">
                            <span class="info-label">الاسم الثلاثي</span>
                            <span class="info-value">${memberDetails.full_name_triple}</span>
                        </div>
                    </div>
                    ` : ''}
                    ${memberDetails?.birth_date ? `
                    <div class="info-item">
                        <i class="fa-solid fa-cake-candles"></i>
                        <div class="info-content">
                            <span class="info-label">تاريخ الميلاد</span>
                            <span class="info-value">${new Date(memberDetails.birth_date).toLocaleDateString('ar-SA')}</span>
                        </div>
                    </div>
                    ` : ''}
                    ${memberDetails?.academic_record_number ? `
                    <div class="info-item">
                        <i class="fa-solid fa-graduation-cap"></i>
                        <div class="info-content">
                            <span class="info-label">الرقم الأكاديمي</span>
                            <span class="info-value">${memberDetails.academic_record_number}</span>
                        </div>
                    </div>
                    ` : ''}
                    ${memberDetails?.academic_degree ? `
                    <div class="info-item">
                        <i class="fa-solid fa-user-graduate"></i>
                        <div class="info-content">
                            <span class="info-label">الدرجة الأكاديمية</span>
                            <span class="info-value">${memberDetails.academic_degree}</span>
                        </div>
                    </div>
                    ` : ''}
                    ${memberDetails?.college ? `
                    <div class="info-item">
                        <i class="fa-solid fa-building-columns"></i>
                        <div class="info-content">
                            <span class="info-label">الكلية</span>
                            <span class="info-value">${memberDetails.college}</span>
                        </div>
                    </div>
                    ` : ''}
                    ${memberDetails?.major ? `
                    <div class="info-item">
                        <i class="fa-solid fa-book"></i>
                        <div class="info-content">
                            <span class="info-label">التخصص</span>
                            <span class="info-value">${memberDetails.major}</span>
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
                    <div class="info-item">
                        <i class="fa-solid fa-users"></i>
                        <div class="info-content">
                            <span class="info-label">اللجنة</span>
                            <span class="info-value">${committee?.committee_name_ar || 'غير محدد'}</span>
                        </div>
                    </div>
                    <div class="info-item">
                        <i class="fa-solid fa-circle-check"></i>
                        <div class="info-content">
                            <span class="info-label">حالة الحساب</span>
                            <span class="info-value">${statusLabels[user.account_status] || user.account_status}</span>
                        </div>
                    </div>
                    <div class="info-item">
                        <i class="fa-solid fa-calendar-plus"></i>
                        <div class="info-content">
                            <span class="info-label">تاريخ الانضمام</span>
                            <span class="info-value">${new Date(user.created_at).toLocaleDateString('ar-SA')}</span>
                        </div>
                    </div>
                    ${memberDetails?.twitter_account ? `
                    <div class="info-item">
                        <i class="fa-brands fa-twitter"></i>
                        <div class="info-content">
                            <span class="info-label">تويتر</span>
                            <span class="info-value"><a href="${memberDetails.twitter_account}" target="_blank">${memberDetails.twitter_account}</a></span>
                        </div>
                    </div>
                    ` : ''}
                    ${memberDetails?.instagram_account ? `
                    <div class="info-item">
                        <i class="fa-brands fa-instagram"></i>
                        <div class="info-content">
                            <span class="info-label">إنستقرام</span>
                            <span class="info-value"><a href="${memberDetails.instagram_account}" target="_blank">${memberDetails.instagram_account}</a></span>
                        </div>
                    </div>
                    ` : ''}
                    ${memberDetails?.linkedin_account ? `
                    <div class="info-item">
                        <i class="fa-brands fa-linkedin"></i>
                        <div class="info-content">
                            <span class="info-label">لينكد إن</span>
                            <span class="info-value"><a href="${memberDetails.linkedin_account}" target="_blank">${memberDetails.linkedin_account}</a></span>
                        </div>
                    </div>
                    ` : ''}
                    ${memberDetails?.tiktok_account ? `
                    <div class="info-item">
                        <i class="fa-brands fa-tiktok"></i>
                        <div class="info-content">
                            <span class="info-label">تيك توك</span>
                            <span class="info-value"><a href="${memberDetails.tiktok_account}" target="_blank">${memberDetails.tiktok_account}</a></span>
                        </div>
                    </div>
                    ` : ''}
                    ${memberDetails?.notes ? `
                    <div class="info-item" style="grid-column: 1 / -1;">
                        <i class="fa-solid fa-note-sticky"></i>
                        <div class="info-content">
                            <span class="info-label">ملاحظات</span>
                            <span class="info-value">${memberDetails.notes}</span>
                        </div>
                    </div>
                    ` : ''}
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
                <div class="modal-content-rtl">
                    <p class="confirm-message">
                        هل أنت متأكد من إنهاء عضوية <strong>${user.full_name}</strong>؟
                    </p>
                    <div class="info-box info-box--warning">
                        <i class="fa-solid fa-exclamation-triangle"></i>
                        <p class="warning-title">
                            تحذير: هذا الإجراء سيقوم بـ:
                        </p>
                        <ul class="warning-list">
                            <li>حذف جميع أدوار ومناصب المستخدم</li>
                            <li>تعطيل حساب المستخدم نهائياً</li>
                            <li>منع المستخدم من الدخول للنظام</li>
                        </ul>
                    </div>
                    <p class="danger-text">
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
                    <p class="form-hint">
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
     * عرض نافذة خيارات التصدير
     */
    async showExportDialog() {
        // جلب اللجان
        const { data: committees } = await this.supabase
            .from('committees')
            .select('*')
            .eq('is_active', true)
            .order('committee_name_ar');

        const content = `
            <div class="export-dialog">
                <h3 style="margin-bottom: 1rem;">اختر البيانات المراد تصديرها</h3>
                
                <div style="margin-bottom: 1.5rem;">
                    <h4 style="margin-bottom: 0.5rem; font-size: 0.95rem;">فلترة حسب اللجنة:</h4>
                    <select id="exportCommitteeFilter" class="form-select" style="width: 100%;">
                        <option value="">جميع اللجان</option>
                        ${(committees || []).map(c => `<option value="${c.id}">${c.committee_name_ar}</option>`).join('')}
                    </select>
                </div>

                <div style="margin-bottom: 1rem;">
                    <h4 style="margin-bottom: 0.5rem; font-size: 0.95rem;">الحقول المراد تصديرها:</h4>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem;">
                        <label style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="checkbox" class="export-field" value="full_name" checked>
                            <span>الاسم الكامل</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="checkbox" class="export-field" value="email" checked>
                            <span>البريد الإلكتروني</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="checkbox" class="export-field" value="phone" checked>
                            <span>الجوال</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="checkbox" class="export-field" value="national_id">
                            <span>الهوية الوطنية</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="checkbox" class="export-field" value="academic_record_number">
                            <span>الرقم الأكاديمي</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="checkbox" class="export-field" value="birth_date">
                            <span>تاريخ الميلاد</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="checkbox" class="export-field" value="college">
                            <span>الكلية</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="checkbox" class="export-field" value="major">
                            <span>التخصص</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="checkbox" class="export-field" value="role" checked>
                            <span>الدور</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="checkbox" class="export-field" value="committee" checked>
                            <span>اللجنة</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="checkbox" class="export-field" value="joined_date">
                            <span>تاريخ الانضمام</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="checkbox" class="export-field" value="twitter_account">
                            <span>تويتر</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="checkbox" class="export-field" value="instagram_account">
                            <span>إنستقرام</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="checkbox" class="export-field" value="linkedin_account">
                            <span>لينكد إن</span>
                        </label>
                    </div>
                </div>

                <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                    <button class="btn btn--sm btn--outline-secondary" onclick="document.querySelectorAll('.export-field').forEach(cb => cb.checked = true)">
                        تحديد الكل
                    </button>
                    <button class="btn btn--sm btn--outline-secondary" onclick="document.querySelectorAll('.export-field').forEach(cb => cb.checked = false)">
                        إلغاء التحديد
                    </button>
                </div>
            </div>
        `;

        const result = await Swal.fire({
            title: 'تصدير بيانات الأعضاء',
            html: content,
            showCancelButton: true,
            confirmButtonText: '<i class="fa-solid fa-download"></i> تصدير كـ Excel',
            cancelButtonText: 'إلغاء',
            width: '600px',
            preConfirm: () => {
                const selectedFields = Array.from(document.querySelectorAll('.export-field:checked')).map(cb => cb.value);
                const selectedCommittee = document.getElementById('exportCommitteeFilter').value;
                
                if (selectedFields.length === 0) {
                    Swal.showValidationMessage('يرجى اختيار حقل واحد على الأقل');
                    return false;
                }
                
                return { fields: selectedFields, committee: selectedCommittee };
            }
        });

        if (result.isConfirmed) {
            await this.exportToExcel(result.value.fields, result.value.committee);
        }
    }

    /**
     * تصدير البيانات إلى Excel
     */
    async exportToExcel(fields, committeeId) {
        try {
            // جلب البيانات
            let query = this.supabase
                .from('profiles')
                .select(`
                    *,
                    user_roles!user_roles_user_id_fkey (
                        role:roles (role_name_ar),
                        committee:committees (committee_name_ar),
                        committee_id
                    )
                `)
                .eq('account_status', 'active');

            if (committeeId) {
                query = query.eq('user_roles.committee_id', parseInt(committeeId));
            }

            const { data: users, error } = await query;
            if (error) throw error;

            // جلب member_details لكل مستخدم
            const usersWithDetails = await Promise.all(users.map(async (user) => {
                const { data: details } = await this.supabase
                    .from('member_details')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();
                
                return { ...user, member_details: details };
            }));

            // إعداد البيانات للتصدير
            const exportData = usersWithDetails.map(user => {
                const row = {};
                const details = user.member_details;
                const role = user.user_roles?.[0]?.role;
                const committee = user.user_roles?.[0]?.committee;

                if (fields.includes('full_name')) row['الاسم الكامل'] = user.full_name || '';
                if (fields.includes('email')) row['البريد الإلكتروني'] = user.email || '';
                if (fields.includes('phone')) row['الجوال'] = user.phone || details?.phone || '';
                if (fields.includes('national_id')) row['الهوية الوطنية'] = details?.national_id || '';
                if (fields.includes('academic_record_number')) row['الرقم الأكاديمي'] = details?.academic_record_number || '';
                if (fields.includes('birth_date')) row['تاريخ الميلاد'] = details?.birth_date ? new Date(details.birth_date).toLocaleDateString('ar-SA') : '';
                if (fields.includes('college')) row['الكلية'] = details?.college || '';
                if (fields.includes('major')) row['التخصص'] = details?.major || '';
                if (fields.includes('role')) row['الدور'] = role?.role_name_ar || '';
                if (fields.includes('committee')) row['اللجنة'] = committee?.committee_name_ar || '';
                if (fields.includes('joined_date')) row['تاريخ الانضمام'] = user.joined_date ? new Date(user.joined_date).toLocaleDateString('ar-SA') : '';
                if (fields.includes('twitter_account')) row['تويتر'] = details?.twitter_account || '';
                if (fields.includes('instagram_account')) row['إنستقرام'] = details?.instagram_account || '';
                if (fields.includes('linkedin_account')) row['لينكد إن'] = details?.linkedin_account || '';

                return row;
            });

            // تحويل إلى CSV
            const headers = Object.keys(exportData[0]);
            const csvContent = [
                headers.join(','),
                ...exportData.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
            ].join('\n');

            // تنزيل الملف
            const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `adeeb_members_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            await Swal.fire({
                icon: 'success',
                title: 'تم التصدير بنجاح',
                text: `تم تصدير ${exportData.length} عضو`,
                confirmButtonText: 'حسناً'
            });
        } catch (error) {
            console.error('Error exporting:', error);
            await Swal.fire({
                icon: 'error',
                title: 'خطأ',
                text: 'حدث خطأ أثناء التصدير',
                confirmButtonText: 'حسناً'
            });
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
