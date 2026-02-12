/**
 * نظام إدارة بيانات الأعضاء - تغيير البريد الإلكتروني وكلمة المرور
 */

(function() {
    const sb = window.sbClient;
    let currentMembers = [];
    let filteredMembers = [];
    let allCommittees = [];

    // إضافة النوافذ المنبثقة إلى الصفحة
    function injectModals() {
        // إزالة أي نوافذ منبثقة قديمة إن وجدت
        document.getElementById('changeMemberEmailModal')?.remove();
        document.getElementById('changeMemberEmailBackdrop')?.remove();
        document.getElementById('changeMemberPasswordModal')?.remove();
        document.getElementById('changeMemberPasswordBackdrop')?.remove();

        const modalsHTML = `
            <!-- خلفية نافذة تغيير البريد الإلكتروني -->
            <div class="modal-backdrop" id="changeMemberEmailBackdrop"></div>
            <!-- نافذة تغيير البريد الإلكتروني للعضو -->
            <div class="modal modal-md modal-warning" id="changeMemberEmailModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <div class="modal-header-content">
                            <h3>
                                <i class="fa-solid fa-envelope"></i>
                                تغيير البريد الإلكتروني
                            </h3>
                        </div>
                        <button class="modal-close-x" id="closeChangeMemberEmailModal">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="form-error" style="margin-bottom: 1rem;">
                            <i class="fa-solid fa-exclamation-triangle"></i>
                            <strong>تحذير:</strong> سيتم تغيير البريد الإلكتروني للعضو فوراً. تأكد من صحة البريد الجديد.
                        </div>
                        <form id="changeMemberEmailForm" class="modal-form-fields">
                            <input type="hidden" id="memberEmailUserId">
                            <div class="form-group">
                                <label>اسم العضو</label>
                                <input type="text" class="form-input" id="memberEmailName" readonly>
                            </div>
                            <div class="form-group">
                                <label>البريد الإلكتروني الحالي</label>
                                <input type="email" class="form-input" id="memberEmailCurrent" readonly>
                            </div>
                            <div class="form-group">
                                <label>البريد الإلكتروني الجديد <span class="required">*</span></label>
                                <input type="email" class="form-input" id="memberEmailNew" required placeholder="أدخل البريد الإلكتروني الجديد">
                            </div>
                            <div class="form-group">
                                <label>تأكيد البريد الإلكتروني الجديد <span class="required">*</span></label>
                                <input type="email" class="form-input" id="memberEmailConfirm" required placeholder="أعد إدخال البريد الإلكتروني الجديد">
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn--outline btn--outline-secondary" id="cancelChangeMemberEmail">
                            <i class="fa-solid fa-times"></i>
                            إلغاء
                        </button>
                        <button type="button" class="btn btn--primary" id="saveMemberEmail">
                            <i class="fa-solid fa-save"></i>
                            تغيير البريد الإلكتروني
                        </button>
                    </div>
                </div>
            </div>

            <!-- خلفية نافذة تغيير كلمة المرور -->
            <div class="modal-backdrop" id="changeMemberPasswordBackdrop"></div>
            <!-- نافذة تغيير كلمة المرور للعضو -->
            <div class="modal modal-md modal-warning" id="changeMemberPasswordModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <div class="modal-header-content">
                            <h3>
                                <i class="fa-solid fa-key"></i>
                                تغيير كلمة المرور
                            </h3>
                        </div>
                        <button class="modal-close-x" id="closeChangeMemberPasswordModal">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="form-error" style="margin-bottom: 1rem;">
                            <i class="fa-solid fa-exclamation-triangle"></i>
                            <strong>تحذير:</strong> سيتم تغيير كلمة المرور للعضو فوراً. تأكد من إبلاغ العضو بكلمة المرور الجديدة.
                        </div>
                        <form id="changeMemberPasswordForm" class="modal-form-fields">
                            <input type="hidden" id="memberPasswordUserId">
                            <div class="form-group">
                                <label>اسم العضو</label>
                                <input type="text" class="form-input" id="memberPasswordName" readonly>
                            </div>
                            <div class="form-group">
                                <label>البريد الإلكتروني</label>
                                <input type="email" class="form-input" id="memberPasswordEmail" readonly>
                            </div>
                            <div class="form-group">
                                <label>كلمة المرور الجديدة <span class="required">*</span></label>
                                <input type="password" class="form-input" id="memberPasswordNew" required placeholder="أدخل كلمة المرور الجديدة" minlength="8">
                                <small class="form-hint">يجب أن تكون 8 أحرف على الأقل</small>
                            </div>
                            <div class="form-group">
                                <label>تأكيد كلمة المرور الجديدة <span class="required">*</span></label>
                                <input type="password" class="form-input" id="memberPasswordConfirm" required placeholder="أعد إدخال كلمة المرور الجديدة">
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn--outline btn--outline-secondary" id="cancelChangeMemberPassword">
                            <i class="fa-solid fa-times"></i>
                            إلغاء
                        </button>
                        <button type="button" class="btn btn--primary" id="saveMemberPassword">
                            <i class="fa-solid fa-save"></i>
                            تغيير كلمة المرور
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalsHTML);
    }

    // تهيئة النظام
    async function init() {
        if (!sb) {
            console.error('Member Data Manager: Supabase client not found!');
            showError('خطأ في الاتصال بقاعدة البيانات');
            return;
        }
        
        injectModals();
        await loadCommittees();
        await loadMembers();
        setupEventListeners();
    }

    // تحميل اللجان
    async function loadCommittees() {
        try {
            const { data, error } = await sb
                .from('committees')
                .select('id, committee_name_ar')
                .order('committee_name_ar');

            if (error) throw error;

            allCommittees = data || [];
            populateCommitteeFilter();
        } catch (error) {
            console.error('Error loading committees:', error);
        }
    }

    // ملء فلتر اللجان
    function populateCommitteeFilter() {
        const filter = document.getElementById('memberDataCommitteeFilter');
        if (!filter) return;

        filter.innerHTML = '<option value="">جميع اللجان</option>';
        allCommittees.forEach(committee => {
            filter.innerHTML += `<option value="${committee.id}">${committee.committee_name_ar}</option>`;
        });
    }

    // تحميل الأعضاء
    async function loadMembers() {
        try {
            showLoading(true);

            // Load profiles (استبعاد الأعضاء المنتهية عضوياتهم - terminated)
            const { data: profiles, error: profilesError } = await sb
                .from('profiles')
                .select('id, full_name, email, account_status, created_at')
                .neq('account_status', 'terminated')
                .order('full_name');

            if (profilesError) throw profilesError;

            // Load member_details with committees
            const { data: memberDetails, error: detailsError } = await sb
                .from('member_details')
                .select(`
                    user_id,
                    committee_id,
                    committees (
                        id,
                        committee_name_ar
                    )
                `);

            if (detailsError) throw detailsError;

            // Create a map of user_id to member_details
            const detailsMap = {};
            if (memberDetails) {
                memberDetails.forEach(detail => {
                    detailsMap[detail.user_id] = detail;
                });
            }

            // Merge profiles with member_details
            // لا حاجة للتحقق من tokens بعد الآن لأن account_status يحدد الحالة مباشرة
            currentMembers = profiles.map(profile => ({
                ...profile,
                member_details: detailsMap[profile.id] ? [detailsMap[profile.id]] : []
            }));

            filteredMembers = [...currentMembers];
            
            await updateStatistics();
            renderMembersTable();
            showLoading(false);
        } catch (error) {
            console.error('Error loading members:', error);
            showError('حدث خطأ أثناء تحميل الأعضاء');
            showLoading(false);
        }
    }

    // تحديث الإحصائيات
    async function updateStatistics() {
        // جلب عدد الأعضاء المعلقين من جدول member_onboarding_tokens
        const { count: pendingCount } = await sb
            .from('member_onboarding_tokens')
            .select('*', { count: 'exact', head: true })
            .eq('is_used', false);
        
        const activeCount = currentMembers.filter(m => m.account_status === 'active').length;

        document.getElementById('totalMembersDataCount').textContent = pendingCount || 0;
        document.getElementById('activeMembersDataCount').textContent = activeCount;
        document.getElementById('passwordChangesCount').textContent = '0';
        document.getElementById('emailChangesCount').textContent = '0';
    }

    // عرض الأعضاء بنظام الكارد
    function renderMembersTable() {
        const container = document.getElementById('memberDataTable');
        if (!container) return;

        if (filteredMembers.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-users"></i>
                    <p>لا توجد أعضاء</p>
                </div>
            `;
            return;
        }

        let html = '<div class="applications-cards-grid">';

        filteredMembers.forEach(member => {
            const statusBadge = getStatusBadge(member.account_status);

            html += `
                <div class="application-card">
                    <div class="application-card-header">
                        <div class="applicant-info">
                            <div class="applicant-avatar">
                                <i class="fa-solid fa-user"></i>
                            </div>
                            <div class="applicant-details">
                                <h3 class="applicant-name">${member.full_name}</h3>
                                ${statusBadge}
                            </div>
                        </div>
                    </div>
                    
                    <div class="application-card-body">
                        <div class="application-info-grid">
                            ${member.phone ? `
                                <div class="info-item">
                                    <i class="fa-solid fa-phone"></i>
                                    <div class="info-content">
                                        <span class="info-label">الجوال</span>
                                        <span class="info-value">${member.phone}</span>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="application-card-footer">
                        <div class="card-actions-grid">
                            <button class="btn btn--info btn--sm change-email-btn" data-user-id="${member.id}">
                                <i class="fa-solid fa-envelope"></i>
                                تغيير البريد
                            </button>
                            <button class="btn btn--warning btn--sm change-password-btn" data-user-id="${member.id}">
                                <i class="fa-solid fa-key"></i>
                                تغيير كلمة المرور
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';

        container.innerHTML = html;
    }

    // الحصول على شارة الحالة
    function getStatusBadge(status) {
        const badges = {
            'active': '<span class="badge badge-success">نشط</span>',
            'inactive': '<span class="badge badge-warning">معلق - لم يفعل الحساب</span>',
            'suspended': '<span class="badge badge-danger">عضوية منتهية</span>'
        };
        return badges[status] || '<span class="badge badge-secondary">غير محدد</span>';
    }

    // فتح نافذة تغيير البريد الإلكتروني
    function changeEmail(userId) {
        const member = currentMembers.find(m => m.id === userId);
        if (!member) return;

        document.getElementById('memberEmailUserId').value = userId;
        document.getElementById('memberEmailName').value = member.full_name;
        document.getElementById('memberEmailCurrent').value = member.email;
        document.getElementById('memberEmailNew').value = '';
        document.getElementById('memberEmailConfirm').value = '';

        const modal = document.getElementById('changeMemberEmailModal');
        const backdrop = document.getElementById('changeMemberEmailBackdrop');
        document.body.classList.add('modal-open');
        setTimeout(() => {
            backdrop.classList.add('active');
            modal.classList.add('active');
        }, 10);
    }

    // فتح نافذة تغيير كلمة المرور
    function changePassword(userId) {
        const member = currentMembers.find(m => m.id === userId);
        if (!member) return;

        document.getElementById('memberPasswordUserId').value = userId;
        document.getElementById('memberPasswordName').value = member.full_name;
        document.getElementById('memberPasswordEmail').value = member.email;
        document.getElementById('memberPasswordNew').value = '';
        document.getElementById('memberPasswordConfirm').value = '';

        const modal = document.getElementById('changeMemberPasswordModal');
        const backdrop = document.getElementById('changeMemberPasswordBackdrop');
        document.body.classList.add('modal-open');
        setTimeout(() => {
            backdrop.classList.add('active');
            modal.classList.add('active');
        }, 10);
    }

    // حفظ البريد الإلكتروني الجديد
    async function saveMemberEmail() {
        const userId = document.getElementById('memberEmailUserId').value;
        const newEmail = document.getElementById('memberEmailNew').value.trim();
        const confirmEmail = document.getElementById('memberEmailConfirm').value.trim();

        if (!newEmail || !confirmEmail) {
            showError('الرجاء ملء جميع الحقول');
            return;
        }

        if (newEmail !== confirmEmail) {
            showError('البريد الإلكتروني غير متطابق');
            return;
        }

        if (!isValidEmail(newEmail)) {
            showError('البريد الإلكتروني غير صالح');
            return;
        }

        try {
            showLoading(true);

            const { data, error } = await sb.rpc('update_member_email', {
                p_user_id: userId,
                p_new_email: newEmail
            });

            if (error) throw error;

            if (data && !data.success) {
                throw new Error(data.message || 'فشل تحديث البريد الإلكتروني');
            }

            showSuccess('تم تغيير البريد الإلكتروني بنجاح');
            closeMemberEmailModal();
            await loadMembers();
            
            // تحديث عداد التغييرات
            const currentCount = parseInt(document.getElementById('emailChangesCount').textContent) || 0;
            document.getElementById('emailChangesCount').textContent = currentCount + 1;
            
            showLoading(false);
        } catch (error) {
            console.error('Error changing email:', error);
            showError('حدث خطأ أثناء تغيير البريد الإلكتروني: ' + error.message);
            showLoading(false);
        }
    }

    // حفظ كلمة المرور الجديدة
    async function saveMemberPassword() {
        const userId = document.getElementById('memberPasswordUserId').value;
        const newPassword = document.getElementById('memberPasswordNew').value;
        const confirmPassword = document.getElementById('memberPasswordConfirm').value;

        if (!newPassword || !confirmPassword) {
            showError('الرجاء ملء جميع الحقول');
            return;
        }

        if (newPassword !== confirmPassword) {
            showError('كلمة المرور غير متطابقة');
            return;
        }

        if (newPassword.length < 8) {
            showError('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
            return;
        }

        try {
            showLoading(true);

            const { data, error } = await sb.rpc('update_member_password', {
                p_user_id: userId,
                p_new_password: newPassword
            });

            if (error) throw error;

            if (data && !data.success) {
                throw new Error(data.message || 'فشل تحديث كلمة المرور');
            }

            showSuccess('تم تغيير كلمة المرور بنجاح');
            closeMemberPasswordModal();
            
            // تحديث عداد التغييرات
            const currentCount = parseInt(document.getElementById('passwordChangesCount').textContent) || 0;
            document.getElementById('passwordChangesCount').textContent = currentCount + 1;
            
            showLoading(false);
        } catch (error) {
            console.error('Error changing password:', error);
            showError('حدث خطأ أثناء تغيير كلمة المرور: ' + error.message);
            showLoading(false);
        }
    }

    // إغلاق نافذة تغيير البريد الإلكتروني
    function closeMemberEmailModal() {
        const modal = document.getElementById('changeMemberEmailModal');
        const backdrop = document.getElementById('changeMemberEmailBackdrop');
        if (modal) modal.classList.remove('active');
        if (backdrop) backdrop.classList.remove('active');
        document.body.classList.remove('modal-open');
    }

    // إغلاق نافذة تغيير كلمة المرور
    function closeMemberPasswordModal() {
        const modal = document.getElementById('changeMemberPasswordModal');
        const backdrop = document.getElementById('changeMemberPasswordBackdrop');
        if (modal) modal.classList.remove('active');
        if (backdrop) backdrop.classList.remove('active');
        document.body.classList.remove('modal-open');
    }

    // التحقق من صحة البريد الإلكتروني
    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    // تطبيق الفلاتر
    function applyFilters() {
        const searchTerm = document.getElementById('memberDataSearchInput').value.toLowerCase();
        const statusFilter = document.getElementById('memberDataStatusFilter').value;
        const committeeFilter = document.getElementById('memberDataCommitteeFilter').value;

        filteredMembers = currentMembers.filter(member => {
            const matchesSearch = !searchTerm || 
                member.full_name.toLowerCase().includes(searchTerm) ||
                member.email.toLowerCase().includes(searchTerm);

            const matchesStatus = !statusFilter || member.account_status === statusFilter;

            const memberCommitteeId = member.member_details?.[0]?.committee_id?.toString();
            const matchesCommittee = !committeeFilter || memberCommitteeId === committeeFilter;

            return matchesSearch && matchesStatus && matchesCommittee;
        });

        renderMembersTable();
    }

    // إعداد المستمعات
    function setupEventListeners() {
        // البحث والفلاتر
        const searchInput = document.getElementById('memberDataSearchInput');
        const statusFilter = document.getElementById('memberDataStatusFilter');
        const committeeFilter = document.getElementById('memberDataCommitteeFilter');
        const refreshBtn = document.getElementById('refreshMemberDataBtn');

        if (searchInput) searchInput.addEventListener('input', applyFilters);
        if (statusFilter) statusFilter.addEventListener('change', applyFilters);
        if (committeeFilter) committeeFilter.addEventListener('change', applyFilters);
        if (refreshBtn) refreshBtn.addEventListener('click', loadMembers);

        // Event delegation للأزرار في الجدول
        const memberDataTable = document.getElementById('memberDataTable');
        if (memberDataTable) {
            memberDataTable.addEventListener('click', (e) => {
                const emailBtn = e.target.closest('.change-email-btn');
                const passwordBtn = e.target.closest('.change-password-btn');
                
                if (emailBtn) {
                    const userId = emailBtn.dataset.userId;
                    if (userId) changeEmail(userId);
                } else if (passwordBtn) {
                    const userId = passwordBtn.dataset.userId;
                    if (userId) changePassword(userId);
                }
            });
        }

        // نافذة تغيير البريد الإلكتروني
        const closeEmailModal = document.getElementById('closeChangeMemberEmailModal');
        const cancelEmailBtn = document.getElementById('cancelChangeMemberEmail');
        const saveEmailBtn = document.getElementById('saveMemberEmail');

        if (closeEmailModal) closeEmailModal.addEventListener('click', closeMemberEmailModal);
        if (cancelEmailBtn) cancelEmailBtn.addEventListener('click', closeMemberEmailModal);
        if (saveEmailBtn) saveEmailBtn.addEventListener('click', saveMemberEmail);

        // إغلاق عند الضغط على الخلفية
        const emailBackdrop = document.getElementById('changeMemberEmailBackdrop');
        if (emailBackdrop) emailBackdrop.addEventListener('click', closeMemberEmailModal);

        // نافذة تغيير كلمة المرور
        const closePasswordModal = document.getElementById('closeChangeMemberPasswordModal');
        const cancelPasswordBtn = document.getElementById('cancelChangeMemberPassword');
        const savePasswordBtn = document.getElementById('saveMemberPassword');

        if (closePasswordModal) closePasswordModal.addEventListener('click', closeMemberPasswordModal);
        if (cancelPasswordBtn) cancelPasswordBtn.addEventListener('click', closeMemberPasswordModal);
        if (savePasswordBtn) savePasswordBtn.addEventListener('click', saveMemberPassword);

        // إغلاق عند الضغط على الخلفية
        const passwordBackdrop = document.getElementById('changeMemberPasswordBackdrop');
        if (passwordBackdrop) passwordBackdrop.addEventListener('click', closeMemberPasswordModal);
    }

    // دوال مساعدة
    function showLoading(show) {
        const loadingBar = document.getElementById('loadingBar');
        if (loadingBar) {
            loadingBar.style.display = show ? 'block' : 'none';
        }
    }

    function showError(message) {
        Swal.fire({
            icon: 'error',
            title: 'خطأ',
            text: message,
            confirmButtonText: 'حسناً'
        });
    }

    function showSuccess(message) {
        Swal.fire({
            icon: 'success',
            title: 'نجح',
            text: message,
            confirmButtonText: 'حسناً',
            timer: 3000
        });
    }

    // تصدير الوظائف العامة
    window.memberDataManager = {
        init,
        changeEmail,
        changePassword,
        loadMembers
    };
})();
