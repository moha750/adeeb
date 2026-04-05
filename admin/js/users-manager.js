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
            <div class="uc-grid">
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
        
        const avatarUrl = user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name)}&background=3d8fd6&color=fff&size=200`;
        
        let roleLabel = '';
        if (role && committee) {
            roleLabel = `${role.role_name_ar} · ${committee.committee_name_ar}`;
        } else if (role) {
            roleLabel = role.role_name_ar;
        } else {
            roleLabel = 'عضو';
        }

        const joinDate = new Date(user.created_at).toLocaleDateString('ar-SA', {
            year: 'numeric', month: 'long', day: 'numeric'
        });

        return `
            <div class="uc-card" data-user-id="${user.id}">

                <div class="uc-card__header">
                    <div class="uc-card__options">
                        <button class="btn-user-options uc-card__options-btn btn btn-white btn-outline btn-icon btn-sm" data-user-id="${user.id}" title="خيارات">
                            <i class="fa-solid fa-ellipsis-vertical" style="pointer-events:none;"></i>
                        </button>
                        <div class="user-options-dropdown uc-card__dropdown" data-user-id="${user.id}" style="display:none;">
                            <button class="btn-edit-user btn btn-primary btn-block btn-outline" data-user-id="${user.id}">
                                <i class="fa-solid fa-pen-to-square"></i>
                                تعديل البيانات
                            </button>
                            <button class="btn-change-committee btn btn-warning btn-block btn-outline" style="margin:0.5rem 0;" data-user-id="${user.id}">
                                <i class="fa-solid fa-sitemap"></i>
                                تغيير اللجنة
                            </button>
                            <div class="uc-card__dropdown-divider"></div>
                            <button class="btn-terminate-membership btn btn-danger btn-block btn-outline" style="margin-top:0.5rem;" data-user-id="${user.id}">
                                <i class="fa-solid fa-user-slash"></i>
                                إنهاء العضوية
                            </button>
                        </div>
                    </div>
                    <div class="uc-card__header-inner">
                        <div class="uc-card__icon">
                            ${user.avatar_url
                                ? `<img src="${user.avatar_url}" alt="${user.full_name}" class="uc-card__avatar" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" /><i class="fa-solid fa-user" style="display:none;"></i>`
                                : `<i class="fa-solid fa-user"></i>`
                            }
                        </div>
                        <div class="uc-card__header-info">
                            <h3 class="uc-card__title">${user.full_name}</h3>
                            <span class="uc-card__badge">
                                <i class="fa-solid fa-shield-halved"></i>
                                ${roleLabel}
                            </span>
                        </div>
                    </div>
                </div>

                <div class="uc-card__body">
                    ${user.email ? `
                    <div class="uc-card__info-item">
                        <div class="uc-card__info-icon"><i class="fa-regular fa-envelope"></i></div>
                        <div class="uc-card__info-content">
                            <span class="uc-card__info-label">البريد الإلكتروني</span>
                            <span class="uc-card__info-value">${user.email}</span>
                        </div>
                    </div>` : ''}

                    ${user.phone ? `
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
                            <span class="uc-card__info-value">${joinDate}</span>
                        </div>
                    </div>
                </div>

                <div class="uc-card__footer">
                    <button class="btn-view-user btn btn-primary btn-block" data-user-id="${user.id}">
                        <i class="fa-solid fa-eye"></i>
                        عرض التفاصيل
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

        // أزرار عرض التفاصيل وتعديل وإنهاء العضوية (مرة واحدة فقط)
        if (!this._clickListenerBound) {
            this._clickListenerBound = true;
            document.addEventListener('click', (e) => {
                // زر الخيارات
                if (e.target.closest('.btn-user-options')) {
                    e.stopPropagation();
                    const btn = e.target.closest('.btn-user-options');
                    const userId = btn.dataset.userId;
                    const dropdown = document.querySelector(`.user-options-dropdown[data-user-id="${userId}"]`);
                    // إغلاق كل القوائم الأخرى
                    document.querySelectorAll('.user-options-dropdown').forEach(d => {
                        if (d !== dropdown) d.style.display = 'none';
                    });
                    const isOpen = dropdown?.style.display === 'block';
                    if (dropdown) dropdown.style.display = isOpen ? 'none' : 'block';
                } else if (e.target.closest('.btn-view-user')) {
                    const userId = e.target.closest('.btn-view-user').dataset.userId;
                    this.viewUserDetails(userId);
                } else if (e.target.closest('.btn-edit-user')) {
                    const userId = e.target.closest('.btn-edit-user').dataset.userId;
                    this.editUser(userId);
                    document.querySelectorAll('.user-options-dropdown').forEach(d => d.style.display = 'none');
                } else if (e.target.closest('.btn-change-committee')) {
                    const userId = e.target.closest('.btn-change-committee').dataset.userId;
                    this.changeCommittee(userId);
                    document.querySelectorAll('.user-options-dropdown').forEach(d => d.style.display = 'none');
                } else if (e.target.closest('.btn-terminate-membership')) {
                    const userId = e.target.closest('.btn-terminate-membership').dataset.userId;
                    this.terminateMembership(userId);
                    document.querySelectorAll('.user-options-dropdown').forEach(d => d.style.display = 'none');
                } else {
                    // إغلاق عند النقر خارج القائمة
                    document.querySelectorAll('.user-options-dropdown').forEach(d => d.style.display = 'none');
                }
            });
        }
    }

    /**
     * بناء رابط المنصة الاجتماعية من اسم الحساب
     */
    static socialUrl(platform, account) {
        if (account.startsWith('http://') || account.startsWith('https://')) return account;
        const bases = {
            twitter:   'https://x.com/',
            instagram: 'https://www.instagram.com/',
            linkedin:  'https://www.linkedin.com/in/',
            tiktok:    'https://www.tiktok.com/@'
        };
        return (bases[platform] || '') + account;
    }

    /**
     * نسخ قيمة من بطاقة التفاصيل
     */
    static copyDetailValue(btn) {
        const text = btn.dataset.copy;
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            const icon = btn.querySelector('i');
            const originalClass = icon.className;
            icon.className = 'fa-solid fa-check';
            btn.classList.add('mdi-btn--copied');
            setTimeout(() => {
                icon.className = originalClass;
                btn.classList.remove('mdi-btn--copied');
            }, 1800);
        }).catch(() => {});
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

        let roleLabel = '';
        if (role && committee) {
            roleLabel = `${role.role_name_ar} · ${committee.committee_name_ar}`;
        } else if (role) {
            roleLabel = role.role_name_ar;
        } else {
            roleLabel = 'عضو';
        }

        const academicDegreeLabels = {
            'bachelor': 'بكالوريوس', 'Bachelor': 'بكالوريوس', "Bachelor's": 'بكالوريوس',
            'master':   'ماجستير',   'Master':   'ماجستير',   "Master's":   'ماجستير',
            'phd':      'دكتوراه',   'PhD':      'دكتوراه',   'doctorate':  'دكتوراه',
            'diploma':  'دبلوم',     'Diploma':  'دبلوم'
        };
        const formatDegree = (v) => academicDegreeLabels[v] || v;

        const hasAcademic = memberDetails && (
            memberDetails.national_id || memberDetails.full_name_triple ||
            memberDetails.birth_date || memberDetails.academic_record_number ||
            memberDetails.academic_degree || memberDetails.college || memberDetails.major
        );

        const hasSocial = memberDetails && (
            memberDetails.twitter_account || memberDetails.instagram_account ||
            memberDetails.linkedin_account || memberDetails.tiktok_account
        );

        const content = `
            <div class="modal-media modal-media--avatar">
                <img src="${avatarUrl}" alt="${user.full_name}" />
                <span class="avatar-name">${user.full_name}</span>
                <span class="avatar-meta">${roleLabel}</span>
                <span class="avatar-badge">
                    <i class="fa-solid fa-circle-check"></i>
                    ${statusLabels[user.account_status] || user.account_status}
                </span>
            </div>

            <div class="modal-section">
                <h3><i class="fa-solid fa-id-card"></i> البيانات الأساسية</h3>
                <div class="modal-detail-grid">
                    ${user.email ? `
                    <div class="modal-detail-item">
                        <span class="modal-detail-label">البريد الإلكتروني</span>
                        <span class="modal-detail-value">${user.email}</span>
                        <div class="modal-detail-actions">
                            <button class="mdi-btn mdi-btn--copy" onclick="UsersManager.copyDetailValue(this)" data-copy="${user.email}" title="نسخ"><i class="fa-regular fa-copy"></i></button>
                        </div>
                    </div>` : ''}
                    ${(user.phone || memberDetails?.phone) ? `
                    <div class="modal-detail-item">
                        <span class="modal-detail-label">رقم الجوال</span>
                        <span class="modal-detail-value" style="direction:ltr;text-align:right;">${user.phone || memberDetails.phone}</span>
                        <div class="modal-detail-actions">
                            <button class="mdi-btn mdi-btn--copy" onclick="UsersManager.copyDetailValue(this)" data-copy="${user.phone || memberDetails.phone}" title="نسخ"><i class="fa-regular fa-copy"></i></button>
                        </div>
                    </div>` : ''}
                    <div class="modal-detail-item">
                        <span class="modal-detail-label">الدور</span>
                        <span class="modal-detail-value">${role?.role_name_ar || 'عضو'}</span>
                        <div class="modal-detail-actions">
                            <button class="mdi-btn mdi-btn--copy" onclick="UsersManager.copyDetailValue(this)" data-copy="${role?.role_name_ar || 'عضو'}" title="نسخ"><i class="fa-regular fa-copy"></i></button>
                        </div>
                    </div>
                    <div class="modal-detail-item">
                        <span class="modal-detail-label">اللجنة</span>
                        <span class="modal-detail-value">${committee?.committee_name_ar || 'غير محدد'}</span>
                        <div class="modal-detail-actions">
                            <button class="mdi-btn mdi-btn--copy" onclick="UsersManager.copyDetailValue(this)" data-copy="${committee?.committee_name_ar || 'غير محدد'}" title="نسخ"><i class="fa-regular fa-copy"></i></button>
                        </div>
                    </div>
                    <div class="modal-detail-item">
                        <span class="modal-detail-label">تاريخ الانضمام</span>
                        <span class="modal-detail-value">${new Date(user.created_at).toLocaleDateString('ar-SA')}</span>
                        <div class="modal-detail-actions">
                            <button class="mdi-btn mdi-btn--copy" onclick="UsersManager.copyDetailValue(this)" data-copy="${new Date(user.created_at).toLocaleDateString('ar-SA')}" title="نسخ"><i class="fa-regular fa-copy"></i></button>
                        </div>
                    </div>
                    <div class="modal-detail-item">
                        <span class="modal-detail-label">حالة الحساب</span>
                        <span class="modal-detail-value">${statusLabels[user.account_status] || user.account_status}</span>
                        <div class="modal-detail-actions">
                            <button class="mdi-btn mdi-btn--copy" onclick="UsersManager.copyDetailValue(this)" data-copy="${statusLabels[user.account_status] || user.account_status}" title="نسخ"><i class="fa-regular fa-copy"></i></button>
                        </div>
                    </div>
                </div>
            </div>

            ${hasAcademic ? `
            <hr class="modal-divider">
            <div class="modal-section">
                <h3><i class="fa-solid fa-graduation-cap"></i> البيانات الأكاديمية</h3>
                <div class="modal-detail-grid">
                    ${memberDetails.national_id ? `
                    <div class="modal-detail-item">
                        <span class="modal-detail-label"> رقم الهوية</span>
                        <span class="modal-detail-value">${memberDetails.national_id}</span>
                        <div class="modal-detail-actions">
                            <button class="mdi-btn mdi-btn--copy" onclick="UsersManager.copyDetailValue(this)" data-copy="${memberDetails.national_id}" title="نسخ"><i class="fa-regular fa-copy"></i></button>
                        </div>
                    </div>` : ''}
                    ${memberDetails.birth_date ? `
                    <div class="modal-detail-item">
                        <span class="modal-detail-label"> تاريخ الميلاد</span>
                        <span class="modal-detail-value">${new Date(memberDetails.birth_date).toLocaleDateString('ar-SA')}</span>
                        <div class="modal-detail-actions">
                            <button class="mdi-btn mdi-btn--copy" onclick="UsersManager.copyDetailValue(this)" data-copy="${new Date(memberDetails.birth_date).toLocaleDateString('ar-SA')}" title="نسخ"><i class="fa-regular fa-copy"></i></button>
                        </div>
                    </div>` : ''}
                    ${memberDetails.academic_degree ? `
                    <div class="modal-detail-item">
                        <span class="modal-detail-label"> الدرجة الأكاديمية</span>
                        <span class="modal-detail-value">${formatDegree(memberDetails.academic_degree)}</span>
                        <div class="modal-detail-actions">
                            <button class="mdi-btn mdi-btn--copy" onclick="UsersManager.copyDetailValue(this)" data-copy="${formatDegree(memberDetails.academic_degree)}" title="نسخ"><i class="fa-regular fa-copy"></i></button>
                        </div>
                    </div>` : ''}
                    ${memberDetails.academic_record_number ? `
                    <div class="modal-detail-item">
                        <span class="modal-detail-label"> الرقم الأكاديمي</span>
                        <span class="modal-detail-value">${memberDetails.academic_record_number}</span>
                        <div class="modal-detail-actions">
                            <button class="mdi-btn mdi-btn--copy" onclick="UsersManager.copyDetailValue(this)" data-copy="${memberDetails.academic_record_number}" title="نسخ"><i class="fa-regular fa-copy"></i></button>
                        </div>
                    </div>` : ''}
                    ${memberDetails.college ? `
                    <div class="modal-detail-item">
                        <span class="modal-detail-label"> الكلية</span>
                        <span class="modal-detail-value">${memberDetails.college}</span>
                        <div class="modal-detail-actions">
                            <button class="mdi-btn mdi-btn--copy" onclick="UsersManager.copyDetailValue(this)" data-copy="${memberDetails.college}" title="نسخ"><i class="fa-regular fa-copy"></i></button>
                        </div>
                    </div>` : ''}
                    ${memberDetails.major ? `
                    <div class="modal-detail-item">
                        <span class="modal-detail-label"> التخصص</span>
                        <span class="modal-detail-value">${memberDetails.major}</span>
                        <div class="modal-detail-actions">
                            <button class="mdi-btn mdi-btn--copy" onclick="UsersManager.copyDetailValue(this)" data-copy="${memberDetails.major}" title="نسخ"><i class="fa-regular fa-copy"></i></button>
                        </div>
                    </div>` : ''}
                </div>
            </div>` : ''}

            ${hasSocial ? `
            <hr class="modal-divider">
            <div class="modal-section">
                <h3><i class="fa-solid fa-share-nodes"></i> الحسابات الاجتماعية</h3>
                <div class="modal-detail-grid">
                    ${memberDetails.twitter_account ? `
                    <div class="modal-detail-item">
                        <span class="modal-detail-label"> تويتر</span>
                        <span class="modal-detail-value">${memberDetails.twitter_account}@</span>
                        <div class="modal-detail-actions">
                            <button class="mdi-btn mdi-btn--visit" onclick="window.open(UsersManager.socialUrl('twitter','${memberDetails.twitter_account}'),'_blank')" title="زيارة"><i class="fa-solid fa-arrow-up-right-from-square"></i></button>
                        </div>
                    </div>` : ''}
                    ${memberDetails.instagram_account ? `
                    <div class="modal-detail-item">
                        <span class="modal-detail-label"> إنستقرام</span>
                        <span class="modal-detail-value">${memberDetails.instagram_account}@</span>
                        <div class="modal-detail-actions">
                            <button class="mdi-btn mdi-btn--visit" onclick="window.open(UsersManager.socialUrl('instagram','${memberDetails.instagram_account}'),'_blank')" title="زيارة"><i class="fa-solid fa-arrow-up-right-from-square"></i></button>
                        </div>
                    </div>` : ''}
                    ${memberDetails.linkedin_account ? `
                    <div class="modal-detail-item">
                        <span class="modal-detail-label"> لينكد إن</span>
                        <span class="modal-detail-value">${memberDetails.linkedin_account}@</span>
                        <div class="modal-detail-actions">
                            <button class="mdi-btn mdi-btn--visit" onclick="window.open(UsersManager.socialUrl('linkedin','${memberDetails.linkedin_account}'),'_blank')" title="زيارة"><i class="fa-solid fa-arrow-up-right-from-square"></i></button>
                        </div>
                    </div>` : ''}
                    ${memberDetails.tiktok_account ? `
                    <div class="modal-detail-item">
                        <span class="modal-detail-label"> تيك توك</span>
                        <span class="modal-detail-value">${memberDetails.tiktok_account}@</span>
                        <div class="modal-detail-actions">
                            <button class="mdi-btn mdi-btn--visit" onclick="window.open(UsersManager.socialUrl('tiktok','${memberDetails.tiktok_account}'),'_blank')" title="زيارة"><i class="fa-solid fa-arrow-up-right-from-square"></i></button>
                        </div>
                    </div>` : ''}
                </div>
            </div>` : ''}

            ${memberDetails?.notes ? `
            <hr class="modal-divider">
            <div class="modal-section">
                <h3><i class="fa-solid fa-note-sticky"></i> ملاحظات</h3>
                <p>${memberDetails.notes}</p>
            </div>` : ''}
        `;

        window.openModal('تفاصيل العضو', content, { icon: 'fa-user' });
    }

    /**
     * تعديل بيانات المستخدم - جميع الحقول
     */
    async editUser(userId) {
        const user = this.allUsers.find(u => u.id === userId);
        if (!user) return;

        // جلب بيانات member_details
        let md = {};
        try {
            const { data } = await this.supabase
                .from('member_details')
                .select('*')
                .eq('user_id', userId)
                .single();
            if (data) md = data;
        } catch (e) {}

        const academicDegrees = [
            { value: '', label: '-- اختر الدرجة --' },
            { value: 'بكالوريوس', label: 'بكالوريوس' },
            { value: 'ماجستير', label: 'ماجستير' },
            { value: 'دكتوراه', label: 'دكتوراه' },
            { value: 'دبلوم', label: 'دبلوم' }
        ];

        const content = `
        <form id="editUserForm" style="display:grid; gap:1.25rem;">
            <p class="modal-section-title"><i class="fa-solid fa-user"></i> البيانات الأساسية</p>
            <div class="modal-form-grid">
                <div class="form-group">
                    <label class="form-label"><span class="label-icon"><i class="fa-solid fa-user"></i></span> الاسم الثلاثي</label>
                    <input type="text" id="ef-full_name" class="form-input" value="${user.full_name || ''}" required />
                </div>
                <div class="form-group">
                    <label class="form-label"><span class="label-icon"><i class="fa-solid fa-envelope"></i></span> البريد الإلكتروني</label>
                    <input type="email" id="ef-email" class="form-input" value="${user.email || ''}" required />
                </div>
                <div class="form-group">
                    <label class="form-label"><span class="label-icon"><i class="fa-solid fa-phone"></i></span> رقم الجوال</label>
                    <input type="tel" id="ef-phone" class="form-input" value="${user.phone || md.phone || ''}" />
                </div>
                <div class="form-group">
                    <label class="form-label"><span class="label-icon"><i class="fa-solid fa-id-card"></i></span> رقم الهوية الوطنية</label>
                    <input type="text" id="ef-national_id" class="form-input" value="${md.national_id || ''}" />
                </div>
                <div class="form-group">
                    <label class="form-label"><span class="label-icon"><i class="fa-solid fa-calendar"></i></span> تاريخ الميلاد</label>
                    <input type="date" id="ef-birth_date" class="form-input" value="${md.birth_date || ''}" />
                </div>
                <div class="form-group">
                    <label class="form-label"><span class="label-icon"><i class="fa-solid fa-palette"></i></span> اللون المفضل</label>
                    <input type="color" id="ef-favorite_color" class="form-input" value="${md.favorite_color || '#3d8fd6'}" style="height:2.6rem;padding:0.25rem 0.4rem;cursor:pointer;" />
                </div>
            </div>

            <hr class="modal-divider">

            <p class="modal-section-title"><i class="fa-solid fa-graduation-cap"></i> البيانات الأكاديمية</p>
            <div class="modal-form-grid">
                <div class="form-group">
                    <label class="form-label"><span class="label-icon"><i class="fa-solid fa-graduation-cap"></i></span> الدرجة الأكاديمية</label>
                    <select id="ef-academic_degree" class="form-input">
                        ${academicDegrees.map(d => `<option value="${d.value}" ${md.academic_degree === d.value ? 'selected' : ''}>${d.label}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label"><span class="label-icon"><i class="fa-solid fa-hashtag"></i></span> الرقم الأكاديمي</label>
                    <input type="text" id="ef-academic_record_number" class="form-input" value="${md.academic_record_number || ''}" />
                </div>
                <div class="form-group">
                    <label class="form-label"><span class="label-icon"><i class="fa-solid fa-building-columns"></i></span> الكلية</label>
                    <input type="text" id="ef-college" class="form-input" value="${md.college || ''}" />
                </div>
                <div class="form-group">
                    <label class="form-label"><span class="label-icon"><i class="fa-solid fa-book"></i></span> التخصص</label>
                    <input type="text" id="ef-major" class="form-input" value="${md.major || ''}" />
                </div>
            </div>

            <hr class="modal-divider">

            <p class="modal-section-title"><i class="fa-solid fa-hashtag"></i> الحسابات الاجتماعية</p>
            <div class="modal-form-grid">
                <div class="form-group">
                    <label class="form-label"><span class="label-icon"><i class="fa-brands fa-twitter"></i></span> تويتر</label>
                    <input type="url" id="ef-twitter_account" class="form-input" placeholder="https://x.com/..." value="${md.twitter_account || ''}" />
                </div>
                <div class="form-group">
                    <label class="form-label"><span class="label-icon"><i class="fa-brands fa-instagram"></i></span> إنستقرام</label>
                    <input type="url" id="ef-instagram_account" class="form-input" placeholder="https://instagram.com/..." value="${md.instagram_account || ''}" />
                </div>
                <div class="form-group">
                    <label class="form-label"><span class="label-icon"><i class="fa-brands fa-linkedin"></i></span> لينكد إن</label>
                    <input type="url" id="ef-linkedin_account" class="form-input" placeholder="https://linkedin.com/..." value="${md.linkedin_account || ''}" />
                </div>
                <div class="form-group">
                    <label class="form-label"><span class="label-icon"><i class="fa-brands fa-tiktok"></i></span> تيك توك</label>
                    <input type="url" id="ef-tiktok_account" class="form-input" placeholder="https://tiktok.com/@..." value="${md.tiktok_account || ''}" />
                </div>
            </div>

            <hr class="modal-divider">

            <div class="form-group">
                <label class="form-label"><span class="label-icon"><i class="fa-solid fa-quote-left"></i></span> نبذة تعريفية (bio)</label>
                <textarea id="ef-bio" class="form-input" rows="2" placeholder="نبذة مختصرة عن العضو...">${user.bio || ''}</textarea>
            </div>

            <div class="form-group">
                <label class="form-label"><span class="label-icon"><i class="fa-solid fa-note-sticky"></i></span> ملاحظات</label>
                <textarea id="ef-notes" class="form-input" rows="2" placeholder="ملاحظات إدارية...">${md.notes || ''}</textarea>
            </div>
        </form>`;

        const footer = `
            <button class="btn btn-secondary" onclick="closeModal()">
                <i class="fa-solid fa-times"></i> إلغاء
            </button>
            <button class="btn btn-primary" onclick="window._submitEditUser('${userId}')">
                <i class="fa-solid fa-save"></i> حفظ التعديلات
            </button>`;

        window._submitEditUser = async (uid) => {
            const form = document.getElementById('editUserForm');
            if (!form.checkValidity()) { form.reportValidity(); return; }

            const g = (id) => document.getElementById(id)?.value?.trim() || null;

            try {
                // 1. تحديث profiles
                const { error: pErr } = await this.supabase
                    .from('profiles')
                    .update({
                        full_name: g('ef-full_name'),
                        email: g('ef-email'),
                        phone: g('ef-phone'),
                        bio: g('ef-bio')
                    })
                    .eq('id', uid);
                if (pErr) throw pErr;

                // 2. تحديث member_details (إنشاء إذا لم يوجد)
                const mdUpdate = {
                    user_id: uid,
                    favorite_color: g('ef-favorite_color'),
                    national_id: g('ef-national_id'),
                    birth_date: g('ef-birth_date') || null,
                    academic_degree: g('ef-academic_degree'),
                    academic_record_number: g('ef-academic_record_number'),
                    college: g('ef-college'),
                    major: g('ef-major'),
                    twitter_account: g('ef-twitter_account'),
                    instagram_account: g('ef-instagram_account'),
                    linkedin_account: g('ef-linkedin_account'),
                    tiktok_account: g('ef-tiktok_account'),
                    notes: g('ef-notes'),
                    updated_at: new Date().toISOString()
                };

                const { error: mdErr } = await this.supabase
                    .from('member_details')
                    .upsert(mdUpdate, { onConflict: 'user_id' });
                if (mdErr) throw mdErr;

                closeModal();
                window.showSuccessModal('تم التحديث', 'تم تحديث بيانات العضو بنجاح');
                await this.loadUsers();
            } catch (err) {
                console.error('Error updating user:', err);
                window.showErrorModal('خطأ', 'حدث خطأ أثناء تحديث البيانات');
            }
        };

        window.openModal('تعديل بيانات العضو', content, { icon: 'fa-pen-to-square', footer, size: 'lg' });
    }

    /**
     * تغيير لجنة العضو
     */
    async changeCommittee(userId) {
        const user = this.allUsers.find(u => u.id === userId);
        if (!user) return;

        const currentRole = user.user_roles?.[0];
        const currentCommittee = currentRole?.committee;

        // جلب جميع اللجان النشطة
        const { data: committees } = await this.supabase
            .from('committees')
            .select('id, committee_name_ar')
            .eq('is_active', true)
            .order('committee_name_ar');

        if (!committees || committees.length === 0) {
            window.showErrorModal('خطأ', 'لا توجد لجان متاحة');
            return;
        }

        const options = [
            { value: '', label: '-- اختر اللجنة الجديدة --' },
            ...committees.map(c => ({ value: String(c.id), label: c.committee_name_ar }))
        ];

        const currentCommitteeName = currentCommittee?.committee_name_ar || 'غير محددة';
        const committeeOptionsHtml = options
            .map(o => `<option value="${o.value}">${o.label}</option>`)
            .join('');

        const formHtml = `
            <div class="modal-info-box box-warning">
                <i class="fa-solid fa-circle-info"></i>
                <span>اللجنة الحالية للعضو <strong>${user.full_name}</strong>: <strong>${currentCommitteeName}</strong></span>
            </div>
            <div class="modal-form-grid" style="margin-top:1.25rem;">
                <div class="form-group full-width">
                    <label class="form-label">
                        <span class="label-icon"><i class="fa-solid fa-sitemap"></i></span>
                        اللجنة الجديدة <span class="required-dot">*</span>
                    </label>
                    <select id="cc-new-committee" class="form-select" required>
                        ${committeeOptionsHtml}
                    </select>
                </div>
            </div>`;

        const footer = `
            <button class="btn btn-outline" onclick="closeModal()">
                <i class="fa-solid fa-times"></i> إلغاء
            </button>
            <button class="btn btn-warning" onclick="window._submitChangeCommittee()">
                <i class="fa-solid fa-check"></i> حفظ التغيير
            </button>`;

        window._submitChangeCommittee = async () => {
            const newCommitteeId = document.getElementById('cc-new-committee')?.value;
            if (!newCommitteeId) {
                document.getElementById('cc-new-committee').reportValidity();
                return;
            }
            closeModal();
            try {
                if (currentRole) {
                    const { error } = await this.supabase
                        .from('user_roles')
                        .update({ committee_id: Number(newCommitteeId) })
                        .eq('id', currentRole.id);
                    if (error) throw error;
                } else {
                    window.showErrorModal('خطأ', 'لا يوجد دور محدد لهذا العضو');
                    return;
                }
                const newCommitteeName = committees.find(c => String(c.id) === newCommitteeId)?.committee_name_ar;
                window.showSuccessModal('تم التغيير', `تم نقل العضو إلى لجنة ${newCommitteeName} بنجاح`);
                await this.loadUsers();
            } catch (err) {
                console.error('Error changing committee:', err);
                window.showErrorModal('خطأ', 'حدث خطأ أثناء تغيير اللجنة');
            }
        };

        window.openModal('تغيير اللجنة', formHtml, { footer, icon: 'fa-sitemap', variant: 'warning' });
    }

    /**
     * إنهاء عضوية المستخدم نهائياً
     */
    async terminateMembership(userId) {
        const user = this.allUsers.find(u => u.id === userId);
        if (!user) return;

        const result = await Swal.fire({
            title: 'تأكيد إنهاء العضوية',
            iconClass: 'fa-solid fa-user-xmark',
            icon: 'error',
            html: `
                <div class="modal-info-box box-danger" style="margin-bottom:1.25rem;">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <span>سيتم إنهاء عضوية <strong>${user.full_name}</strong> نهائياً. هذا الإجراء لا يمكن التراجع عنه.</span>
                </div>
                <div class="modal-form-grid">
                    <div class="form-group full-width">
                        <label class="form-label">
                            <span class="label-icon"><i class="fa-solid fa-comment-dots"></i></span>
                            سبب إنهاء العضوية <span class="required-dot">*</span>
                        </label>
                        <div class="form-radio-group">
                            <label class="form-radio">
                                <input type="radio" name="terminationPreset" value="تقدّم العضو بطلب إنهاء عضويته" onchange="document.getElementById('terminationReasonInput').value=this.value">
                                <span class="form-radio-label">تقدّم العضو بطلب إنهاء عضويته</span>
                            </label>
                            <label class="form-radio">
                                <input type="radio" name="terminationPreset" value="خروج العضو من مجتمع أدِيب دون إبلاغ إدارة الموارد البشرية بالخروج" onchange="document.getElementById('terminationReasonInput').value=this.value">
                                <span class="form-radio-label">خروج العضو من مجتمع أدِيب دون إبلاغ إدارة الموارد البشرية بالخروج</span>
                            </label>
                        </div>
                        <textarea id="terminationReasonInput" class="form-input form-textarea" rows="2"
                            placeholder="أو اكتب سبباً مخصصاً..." style="margin-top:0.75rem;"></textarea>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'نعم، إنهاء العضوية',
            cancelButtonText: 'إلغاء',
            preConfirm: () => {
                const reason = document.getElementById('terminationReasonInput')?.value?.trim();
                if (!reason) {
                    Swal.showValidationMessage('يرجى تحديد سبب إنهاء العضوية');
                    return false;
                }
                return reason;
            }
        });

        if (!result.isConfirmed) return;
        const terminationReason = result.value || null;

        try {
            // 1. تعطيل جميع أدوار المستخدم
            const { error: rolesError } = await this.supabase
                .from('user_roles')
                .update({ is_active: false })
                .eq('user_id', userId);

            if (rolesError) throw rolesError;

            // 2. تحديث حالة الحساب إلى معلق مع سبب الإنهاء
            const { error: profileError } = await this.supabase
                .from('profiles')
                .update({
                    account_status: 'suspended',
                    termination_reason: terminationReason,
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

            Toast.success(`تم إنهاء عضوية ${user.full_name} بنجاح`);
            await this.loadUsers();
            await this.loadStats();
        } catch (error) {
            console.error('Error terminating membership:', error);
            Toast.error('حدث خطأ أثناء إنهاء العضوية. يرجى المحاولة مرة أخرى.');
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
            <div class="modal-info-box box-info">
                <i class="fa-solid fa-circle-info"></i>
                <span>اختر اللجنة والحقول المراد تضمينها في ملف التصدير.</span>
            </div>

            <div class="modal-section">
                <p class="modal-section-title"><i class="fa-solid fa-filter"></i> فلترة حسب اللجنة</p>
                <div class="form-group">
                    <select id="exportCommitteeFilter" class="form-select">
                        <option value="">جميع اللجان</option>
                        ${(committees || []).map(c => `<option value="${c.id}">${c.committee_name_ar}</option>`).join('')}
                    </select>
                </div>
            </div>

            <hr class="modal-divider">

            <div class="modal-section">
                <p class="modal-section-title"><i class="fa-solid fa-table-columns"></i> الحقول المراد تصديرها</p>
                <div class="form-checkbox-group cols-2">
                    <label class="form-checkbox">
                        <input type="checkbox" class="export-field" value="full_name" checked>
                        <span class="form-checkbox-label">الاسم الكامل</span>
                    </label>
                    <label class="form-checkbox">
                        <input type="checkbox" class="export-field" value="email" checked>
                        <span class="form-checkbox-label">البريد الإلكتروني</span>
                    </label>
                    <label class="form-checkbox">
                        <input type="checkbox" class="export-field" value="phone" checked>
                        <span class="form-checkbox-label">الجوال</span>
                    </label>
                    <label class="form-checkbox">
                        <input type="checkbox" class="export-field" value="national_id">
                        <span class="form-checkbox-label">الهوية الوطنية</span>
                    </label>
                    <label class="form-checkbox">
                        <input type="checkbox" class="export-field" value="academic_record_number">
                        <span class="form-checkbox-label">الرقم الأكاديمي</span>
                    </label>
                    <label class="form-checkbox">
                        <input type="checkbox" class="export-field" value="birth_date">
                        <span class="form-checkbox-label">تاريخ الميلاد</span>
                    </label>
                    <label class="form-checkbox">
                        <input type="checkbox" class="export-field" value="college">
                        <span class="form-checkbox-label">الكلية</span>
                    </label>
                    <label class="form-checkbox">
                        <input type="checkbox" class="export-field" value="major">
                        <span class="form-checkbox-label">التخصص</span>
                    </label>
                    <label class="form-checkbox">
                        <input type="checkbox" class="export-field" value="role" checked>
                        <span class="form-checkbox-label">الدور</span>
                    </label>
                    <label class="form-checkbox">
                        <input type="checkbox" class="export-field" value="committee" checked>
                        <span class="form-checkbox-label">اللجنة</span>
                    </label>
                    <label class="form-checkbox">
                        <input type="checkbox" class="export-field" value="joined_date">
                        <span class="form-checkbox-label">تاريخ الانضمام</span>
                    </label>
                    <label class="form-checkbox">
                        <input type="checkbox" class="export-field" value="twitter_account">
                        <span class="form-checkbox-label">تويتر</span>
                    </label>
                    <label class="form-checkbox">
                        <input type="checkbox" class="export-field" value="instagram_account">
                        <span class="form-checkbox-label">إنستقرام</span>
                    </label>
                    <label class="form-checkbox">
                        <input type="checkbox" class="export-field" value="linkedin_account">
                        <span class="form-checkbox-label">لينكد إن</span>
                    </label>
                </div>
                <div class="form-actions form-actions-start" style="margin-top:0.875rem;">
                    <button class="btn btn-success btn-sm" type="button" onclick="document.querySelectorAll('.export-field').forEach(cb => cb.checked = true)">
                        تحديد الكل
                    </button>
                    <button class="btn btn-danger btn-sm" type="button" onclick="document.querySelectorAll('.export-field').forEach(cb => cb.checked = false)">
                        إلغاء التحديد
                    </button>
                </div>
            </div>
        `;

        const footer = `
            <button class="btn btn-ghost btn-md" onclick="closeModal()">
                <i class="fa-solid fa-times"></i> إلغاء
            </button>
            <button class="btn btn-success btn-md" onclick="window._doExportMembers()">
                <i class="fa-solid fa-download"></i> تصدير كـ Excel
            </button>
        `;

        window._doExportMembers = async () => {
            const selectedFields = Array.from(document.querySelectorAll('.export-field:checked')).map(cb => cb.value);
            const selectedCommittee = document.getElementById('exportCommitteeFilter')?.value || '';

            if (selectedFields.length === 0) {
                if (window.Toast) Toast.warning('يرجى اختيار حقل واحد على الأقل');
                return;
            }

            closeModal();
            await this.exportToExcel(selectedFields, selectedCommittee);
        };

        window.openModal('تصدير بيانات الأعضاء', content, { icon: 'fa-file-export', footer });
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

            if (window.Toast) Toast.success(`تم تصدير ${exportData.length} عضو بنجاح`);
        } catch (error) {
            console.error('Error exporting:', error);
            if (window.Toast) Toast.error('حدث خطأ أثناء التصدير');
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

