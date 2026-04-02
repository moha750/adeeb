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
        <form id="editUserForm" style="display:grid; gap:1rem;">
            <h4 style="margin:0 0 0.25rem; color:#374151; font-size:0.95rem; border-bottom:1px solid #e5e7eb; padding-bottom:0.5rem;">البيانات الأساسية</h4>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
                <div class="form-group">
                    <label>الاسم الكامل <span style="color:#ef4444">*</span></label>
                    <input type="text" id="ef-full_name" class="form-input" value="${user.full_name || ''}" required />
                </div>
                <div class="form-group">
                    <label>الاسم الثلاثي</label>
                    <input type="text" id="ef-full_name_triple" class="form-input" value="${md.full_name_triple || ''}" />
                </div>
                <div class="form-group">
                    <label>البريد الإلكتروني <span style="color:#ef4444">*</span></label>
                    <input type="email" id="ef-email" class="form-input" value="${user.email || ''}" required />
                </div>
                <div class="form-group">
                    <label>رقم الجوال</label>
                    <input type="tel" id="ef-phone" class="form-input" value="${user.phone || md.phone || ''}" />
                </div>
                <div class="form-group">
                    <label>رقم الهوية الوطنية</label>
                    <input type="text" id="ef-national_id" class="form-input" value="${md.national_id || ''}" />
                </div>
                <div class="form-group">
                    <label>تاريخ الميلاد</label>
                    <input type="date" id="ef-birth_date" class="form-input" value="${md.birth_date || ''}" />
                </div>
            </div>

            <h4 style="margin:0.5rem 0 0.25rem; color:#374151; font-size:0.95rem; border-bottom:1px solid #e5e7eb; padding-bottom:0.5rem;">البيانات الأكاديمية</h4>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
                <div class="form-group">
                    <label>الدرجة الأكاديمية</label>
                    <select id="ef-academic_degree" class="form-input">
                        ${academicDegrees.map(d => `<option value="${d.value}" ${md.academic_degree === d.value ? 'selected' : ''}>${d.label}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>الرقم الأكاديمي</label>
                    <input type="text" id="ef-academic_record_number" class="form-input" value="${md.academic_record_number || ''}" />
                </div>
                <div class="form-group">
                    <label>الكلية</label>
                    <input type="text" id="ef-college" class="form-input" value="${md.college || ''}" />
                </div>
                <div class="form-group">
                    <label>التخصص</label>
                    <input type="text" id="ef-major" class="form-input" value="${md.major || ''}" />
                </div>
            </div>

            <h4 style="margin:0.5rem 0 0.25rem; color:#374151; font-size:0.95rem; border-bottom:1px solid #e5e7eb; padding-bottom:0.5rem;">الحسابات الاجتماعية</h4>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
                <div class="form-group">
                    <label><i class="fa-brands fa-twitter" style="color:#1da1f2;"></i> تويتر</label>
                    <input type="url" id="ef-twitter_account" class="form-input" placeholder="https://x.com/..." value="${md.twitter_account || ''}" />
                </div>
                <div class="form-group">
                    <label><i class="fa-brands fa-instagram" style="color:#e1306c;"></i> إنستقرام</label>
                    <input type="url" id="ef-instagram_account" class="form-input" placeholder="https://instagram.com/..." value="${md.instagram_account || ''}" />
                </div>
                <div class="form-group">
                    <label><i class="fa-brands fa-linkedin" style="color:#0077b5;"></i> لينكد إن</label>
                    <input type="url" id="ef-linkedin_account" class="form-input" placeholder="https://linkedin.com/..." value="${md.linkedin_account || ''}" />
                </div>
                <div class="form-group">
                    <label><i class="fa-brands fa-tiktok"></i> تيك توك</label>
                    <input type="url" id="ef-tiktok_account" class="form-input" placeholder="https://tiktok.com/@..." value="${md.tiktok_account || ''}" />
                </div>
            </div>

            <div class="form-group">
                <label>نبذة تعريفية (bio)</label>
                <textarea id="ef-bio" class="form-input" rows="2" placeholder="نبذة مختصرة عن العضو...">${user.bio || ''}</textarea>
            </div>

            <div class="form-group">
                <label>ملاحظات</label>
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
                    full_name_triple: g('ef-full_name_triple'),
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

        const fields = [
            {
                id: 'new-committee',
                label: `تغيير لجنة العضو: ${user.full_name}`,
                type: 'select',
                required: true,
                options: options.map(o => ({ value: o.value, label: o.label }))
            }
        ];

        window.openFormModal(
            'تغيير اللجنة',
            fields,
            async (formData) => {
                const newCommitteeId = formData['new-committee'];
                if (!newCommitteeId) return;

                try {
                    if (currentRole) {
                        // تحديث الدور الحالي بلجنة جديدة
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
            },
            { icon: 'fa-sitemap', submitText: 'حفظ التغيير' }
        );
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
            icon: 'warning',
            html: `
                <div class="form-stack">
                    <p>هل أنت متأكد من إنهاء عضوية <strong>${user.full_name}</strong>؟</p>
                    <div class="form-group">
                        <label class="form-label">
                            سبب إنهاء العضوية
                            <span class="form-hint" style="display:inline;margin-inline-start:0.3rem;">(اختياري)</span>
                        </label>
                        <div class="form-radio-group">
                            <label class="form-radio">
                                <input type="radio" name="terminationPreset" value="تقدّم العضو بطلب إنهاء عضويته" onchange="document.getElementById('terminationReasonInput').value=this.value">
                                <span class="form-radio-label">تقدّم العضو بطلب إنهاء عضويته</span>
                            </label>
                            <label class="form-radio">
                                <input type="radio" name="terminationPreset" value="خروج العضو من مجتمع أدِيب دون إبلاغ لجنة الموارد البشرية بالخروج" onchange="document.getElementById('terminationReasonInput').value=this.value">
                                <span class="form-radio-label">خروج العضو من مجتمع أدِيب دون إبلاغ لجنة الموارد البشرية بالخروج</span>
                            </label>
                        </div>
                    </div>
                                            <textarea id="terminationReasonInput" class="form-input form-textarea" rows="2"
                            placeholder="أو اكتب سبباً مخصصاً..."></textarea>

                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'نعم، إنهاء العضوية',
            cancelButtonText: 'إلغاء',
            preConfirm: () => {
                return document.getElementById('terminationReasonInput')?.value?.trim() || null;
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
            <div class="form-stack">
                <div class="form-group">
                    <label class="form-label">فلترة حسب اللجنة</label>
                    <select id="exportCommitteeFilter" class="form-select">
                        <option value="">جميع اللجان</option>
                        ${(committees || []).map(c => `<option value="${c.id}">${c.committee_name_ar}</option>`).join('')}
                    </select>
                </div>

                <div class="form-group">
                    <label class="form-label">الحقول المراد تصديرها</label>
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
                </div>
                                    <div class="form-actions form-actions-start">
                        <button class="btn btn-success" onclick="document.querySelectorAll('.export-field').forEach(cb => cb.checked = true)">
                            تحديد الكل
                        </button>
                        <button class="btn btn-danger" onclick="document.querySelectorAll('.export-field').forEach(cb => cb.checked = false)">
                            إلغاء التحديد
                        </button>
                    </div>
            </div>
        `;

        const result = await Swal.fire({
            title: 'تصدير بيانات الأعضاء',
            html: content,
            iconClass: 'fa-solid fa-file-export',
            showCancelButton: true,
            cancelButtonText: 'إلغاء',
            confirmButtonText: '<i class="fa-solid fa-download"></i> تصدير كـ Excel',
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

