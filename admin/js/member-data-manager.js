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
        const modalsHTML = `
            <!-- نافذة تغيير البريد الإلكتروني للعضو -->
            <div class="modal" id="changeMemberEmailModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>
                            <i class="fa-solid fa-envelope"></i>
                            تغيير البريد الإلكتروني
                        </h2>
                        <button class="btn-icon" id="closeChangeMemberEmailModal">
                            <i class="fa-solid fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div>
                            <p>
                                <i class="fa-solid fa-exclamation-triangle"></i>
                                <strong>تحذير:</strong> سيتم تغيير البريد الإلكتروني للعضو فوراً. تأكد من صحة البريد الجديد.
                            </p>
                        </div>
                        <form id="changeMemberEmailForm">
                            <input type="hidden" id="memberEmailUserId">
                            <div class="form-group">
                                <label>اسم العضو</label>
                                <input type="text" id="memberEmailName" readonly>
                            </div>
                            <div class="form-group">
                                <label>البريد الإلكتروني الحالي</label>
                                <input type="email" id="memberEmailCurrent" readonly>
                            </div>
                            <div class="form-group">
                                <label>البريد الإلكتروني الجديد <span>*</span></label>
                                <input type="email" id="memberEmailNew" required placeholder="أدخل البريد الإلكتروني الجديد">
                            </div>
                            <div class="form-group">
                                <label>تأكيد البريد الإلكتروني الجديد <span>*</span></label>
                                <input type="email" id="memberEmailConfirm" required placeholder="أعد إدخال البريد الإلكتروني الجديد">
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn-outline" id="cancelChangeMemberEmail">إلغاء</button>
                        <button type="button" class="btn-primary" id="saveMemberEmail">
                            <i class="fa-solid fa-save"></i>
                            تغيير البريد الإلكتروني
                        </button>
                    </div>
                </div>
            </div>

            <!-- نافذة تغيير كلمة المرور للعضو -->
            <div class="modal" id="changeMemberPasswordModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>
                            <i class="fa-solid fa-key"></i>
                            تغيير كلمة المرور
                        </h2>
                        <button class="btn-icon" id="closeChangeMemberPasswordModal">
                            <i class="fa-solid fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div>
                            <p>
                                <i class="fa-solid fa-exclamation-triangle"></i>
                                <strong>تحذير:</strong> سيتم تغيير كلمة المرور للعضو فوراً. تأكد من إبلاغ العضو بكلمة المرور الجديدة.
                            </p>
                        </div>
                        <form id="changeMemberPasswordForm">
                            <input type="hidden" id="memberPasswordUserId">
                            <div class="form-group">
                                <label>اسم العضو</label>
                                <input type="text" id="memberPasswordName" readonly>
                            </div>
                            <div class="form-group">
                                <label>البريد الإلكتروني</label>
                                <input type="email" id="memberPasswordEmail" readonly>
                            </div>
                            <div class="form-group">
                                <label>كلمة المرور الجديدة <span>*</span></label>
                                <input type="password" id="memberPasswordNew" required placeholder="أدخل كلمة المرور الجديدة" minlength="8">
                                <small>يجب أن تكون 8 أحرف على الأقل</small>
                            </div>
                            <div class="form-group">
                                <label>تأكيد كلمة المرور الجديدة <span>*</span></label>
                                <input type="password" id="memberPasswordConfirm" required placeholder="أعد إدخال كلمة المرور الجديدة">
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn-outline" id="cancelChangeMemberPassword">إلغاء</button>
                        <button type="button" class="btn-primary" id="saveMemberPassword">
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

            // Load profiles
            const { data: profiles, error: profilesError } = await sb
                .from('profiles')
                .select('id, full_name, email, account_status, created_at')
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
            currentMembers = profiles.map(profile => ({
                ...profile,
                member_details: detailsMap[profile.id] ? [detailsMap[profile.id]] : []
            }));

            filteredMembers = [...currentMembers];
            
            updateStatistics();
            renderMembersTable();
            showLoading(false);
        } catch (error) {
            console.error('Error loading members:', error);
            showError('حدث خطأ أثناء تحميل الأعضاء');
            showLoading(false);
        }
    }

    // تحديث الإحصائيات
    function updateStatistics() {
        const totalCount = currentMembers.length;
        const activeCount = currentMembers.filter(m => m.account_status === 'active').length;

        document.getElementById('totalMembersDataCount').textContent = totalCount;
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
            const committeeName = member.member_details?.[0]?.committees?.committee_name_ar || 'غير محدد';
            const statusBadge = getStatusBadge(member.account_status);
            const joinDate = new Date(member.created_at).toLocaleDateString('ar-SA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

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
                            <div class="info-item">
                                <i class="fa-solid fa-envelope"></i>
                                <div class="info-content">
                                    <span class="info-label">البريد الإلكتروني</span>
                                    <span class="info-value">${member.email}</span>
                                </div>
                            </div>
                            
                            <div class="info-item">
                                <i class="fa-solid fa-users"></i>
                                <div class="info-content">
                                    <span class="info-label">اللجنة</span>
                                    <span class="info-value">${committeeName}</span>
                                </div>
                            </div>
                            
                            <div class="info-item">
                                <i class="fa-solid fa-calendar"></i>
                                <div class="info-content">
                                    <span class="info-label">تاريخ الانضمام</span>
                                    <span class="info-value">${joinDate}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="application-card-footer">
                        <div class="card-actions-grid">
                            <button class="btn-action btn-action-primary change-email-btn" data-user-id="${member.id}">
                                <i class="fa-solid fa-envelope"></i>
                                تغيير البريد
                            </button>
                            <button class="btn-action btn-action-warning change-password-btn" data-user-id="${member.id}">
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
            'inactive': '<span class="badge badge-secondary">غير نشط</span>',
            'suspended': '<span class="badge badge-danger">معلق</span>'
        };
        return badges[status] || badges['inactive'];
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
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);
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
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);
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
            const modal = document.getElementById('changeMemberEmailModal');
            modal.classList.remove('active');
            setTimeout(() => modal.style.display = 'none', 300);
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
            const modal = document.getElementById('changeMemberPasswordModal');
            modal.classList.remove('active');
            setTimeout(() => modal.style.display = 'none', 300);
            
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

        const closeEmailModalFunc = () => {
            const modal = document.getElementById('changeMemberEmailModal');
            modal.classList.remove('active');
            setTimeout(() => modal.style.display = 'none', 300);
        };

        if (closeEmailModal) closeEmailModal.addEventListener('click', closeEmailModalFunc);
        if (cancelEmailBtn) cancelEmailBtn.addEventListener('click', closeEmailModalFunc);
        if (saveEmailBtn) saveEmailBtn.addEventListener('click', saveMemberEmail);

        // نافذة تغيير كلمة المرور
        const closePasswordModal = document.getElementById('closeChangeMemberPasswordModal');
        const cancelPasswordBtn = document.getElementById('cancelChangeMemberPassword');
        const savePasswordBtn = document.getElementById('saveMemberPassword');

        const closePasswordModalFunc = () => {
            const modal = document.getElementById('changeMemberPasswordModal');
            modal.classList.remove('active');
            setTimeout(() => modal.style.display = 'none', 300);
        };

        if (closePasswordModal) closePasswordModal.addEventListener('click', closePasswordModalFunc);
        if (cancelPasswordBtn) cancelPasswordBtn.addEventListener('click', closePasswordModalFunc);
        if (savePasswordBtn) savePasswordBtn.addEventListener('click', saveMemberPassword);
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
