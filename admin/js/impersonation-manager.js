/**
 * نظام إدارة التنكر (User Impersonation) - نادي أدِيب
 * متاح لرئيس النادي فقط
 */

window.ImpersonationManager = (function() {
    const sb = window.sbClient;
    let currentImpersonation = null;

    /**
     * التحقق من صلاحية التنكر (رئيس النادي فقط)
     */
    async function canImpersonate() {
        try {
            const { data: { session } } = await sb.auth.getSession();
            if (!session) return false;

            const userRole = await AuthManager.getUserRole(session.user.id);
            return userRole && userRole.role_level >= 10;
        } catch (error) {
            console.error('Error checking impersonation permission:', error);
            return false;
        }
    }

    /**
     * بدء جلسة تنكر
     */
    async function startImpersonation(targetUserId, reason = null) {
        try {
            if (!await canImpersonate()) {
                throw new Error('غير مصرح لك بهذه العملية');
            }

            const { data, error } = await sb.rpc('start_impersonation', {
                p_target_user_id: targetUserId,
                p_reason: reason
            });

            if (error) throw error;

            currentImpersonation = {
                sessionId: data,
                targetUserId: targetUserId,
                startedAt: new Date()
            };

            localStorage.setItem('impersonation_session', JSON.stringify(currentImpersonation));
            
            showImpersonationBanner();
            
            return { success: true, sessionId: data };
        } catch (error) {
            console.error('Error starting impersonation:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * إنهاء جلسة التنكر
     */
    async function endImpersonation(sessionId = null) {
        try {
            const { data, error } = await sb.rpc('end_impersonation', {
                p_session_id: sessionId
            });

            if (error) throw error;

            currentImpersonation = null;
            localStorage.removeItem('impersonation_session');
            
            hideImpersonationBanner();
            
            return { success: true };
        } catch (error) {
            console.error('Error ending impersonation:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * الحصول على الجلسة النشطة
     */
    async function getActiveImpersonation() {
        try {
            const { data, error } = await sb.rpc('get_active_impersonation');

            if (error) throw error;

            if (data && data.length > 0) {
                currentImpersonation = {
                    sessionId: data[0].session_id,
                    adminUserId: data[0].admin_user_id,
                    impersonatedUserId: data[0].impersonated_user_id,
                    adminName: data[0].admin_name,
                    adminEmail: data[0].admin_email,
                    startedAt: new Date(data[0].started_at)
                };
                
                localStorage.setItem('impersonation_session', JSON.stringify(currentImpersonation));
                
                return currentImpersonation;
            }

            return null;
        } catch (error) {
            console.error('Error getting active impersonation:', error);
            return null;
        }
    }

    /**
     * الحصول على سجل التنكر
     */
    async function getImpersonationHistory(limit = 50, offset = 0) {
        try {
            const { data, error } = await sb.rpc('get_impersonation_history', {
                p_limit: limit,
                p_offset: offset
            });

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Error getting impersonation history:', error);
            return [];
        }
    }

    /**
     * عرض شريط التنبيه عند التنكر
     */
    function showImpersonationBanner() {
        hideImpersonationBanner();

        const banner = document.createElement('div');
        banner.id = 'impersonation-banner';
        banner.className = 'impersonation-banner';
        banner.innerHTML = `
            <div class="impersonation-banner__content">
                <div class="impersonation-banner__icon">
                    <i class="fa-solid fa-user-secret"></i>
                </div>
                <div class="impersonation-banner__text">
                    <strong>وضع التنكر نشط</strong>
                    <span>أنت تتصفح كمستخدم آخر</span>
                </div>
                <button class="impersonation-banner__btn" onclick="ImpersonationManager.endImpersonationAndReload()">
                    <i class="fa-solid fa-right-from-bracket"></i>
                    إنهاء التنكر
                </button>
            </div>
        `;

        document.body.insertBefore(banner, document.body.firstChild);
        document.body.style.paddingTop = '60px';
    }

    /**
     * إخفاء شريط التنبيه
     */
    function hideImpersonationBanner() {
        const banner = document.getElementById('impersonation-banner');
        if (banner) {
            banner.remove();
            document.body.style.paddingTop = '0';
        }
    }

    /**
     * إنهاء التنكر وإعادة تحميل الصفحة
     */
    async function endImpersonationAndReload() {
        const result = await endImpersonation();
        if (result.success) {
            location.reload();
        }
    }

    /**
     * فتح نافذة اختيار المستخدم للتنكر
     */
    async function openImpersonationDialog() {
        if (!await canImpersonate()) {
            if (window.Swal) {
                Swal.fire({
                    title: 'غير مصرح',
                    text: 'غير مصرح لك بهذه العملية',
                    icon: 'error',
                    confirmButtonText: 'حسناً'
                });
            } else {
                alert('غير مصرح لك بهذه العملية');
            }
            return;
        }

        const { value: formValues } = await Swal.fire({
            title: '<i class="fa-solid fa-user-secret"></i> التنكر كمستخدم آخر',
            html: `
                <div class="modal-content-rtl">
                    <div class="info-box info-box--warning">
                        <i class="fa-solid fa-exclamation-triangle"></i>
                        <strong>تحذير:</strong> هذه الميزة متاحة لرئيس النادي فقط. سيتم تسجيل جميع جلسات التنكر.
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">البحث عن مستخدم</label>
                        <input type="text" id="impersonationUserSearch" class="form-input" placeholder="ابحث بالاسم أو البريد الإلكتروني...">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">سبب التنكر (اختياري)</label>
                        <textarea id="impersonationReason" class="form-input" rows="2" placeholder="مثال: استكشاف مشكلة في الصلاحيات"></textarea>
                    </div>
                    
                    <div id="impersonationUsersList" class="users-list-container">
                        <div class="loading-spinner">
                            <i class="fa-solid fa-spinner fa-spin fa-2x"></i>
                            <p>جاري تحميل المستخدمين...</p>
                        </div>
                    </div>
                </div>
            `,
            width: '600px',
            showCancelButton: false,
            showConfirmButton: false,
            didOpen: () => {
                loadUsersForImpersonation();
            }
        });
    }

    /**
     * تحميل قائمة المستخدمين للتنكر
     */
    async function loadUsersForImpersonation() {
        try {
            const { data: { session } } = await sb.auth.getSession();
            
            const { data: profiles, error } = await sb
                .from('profiles')
                .select(`
                    id,
                    full_name,
                    email,
                    account_status,
                    avatar_url
                `)
                .neq('id', session.user.id)
                .eq('account_status', 'active')
                .order('full_name');

            if (error) throw error;

            const usersList = document.getElementById('impersonationUsersList');
            
            if (!profiles || profiles.length === 0) {
                usersList.innerHTML = `
                    <div class="empty-state">
                        <i class="fa-solid fa-users-slash empty-state__icon"></i>
                        <p class="empty-state__title">لا يوجد مستخدمين متاحين</p>
                    </div>
                `;
                return;
            }

            usersList.innerHTML = profiles.map(user => `
                <div class="user-select-item" data-user-id="${user.id}" data-user-name="${(user.full_name || user.email).replace(/"/g, '&quot;')}">
                    <div class="user-select-avatar-container">
                        ${user.avatar_url 
                            ? `<img src="${user.avatar_url}" alt="${user.full_name}" class="user-select-avatar">` 
                            : `<div class="user-select-avatar-placeholder"><i class="fa-solid fa-user"></i></div>`
                        }
                    </div>
                    <div class="user-select-info">
                        <div class="user-select-name">${user.full_name || 'بدون اسم'}</div>
                        <div class="user-select-email">${user.email}</div>
                    </div>
                    <button class="btn btn--primary btn--sm" onclick="ImpersonationManager.selectUserForImpersonation('${user.id}', '${(user.full_name || user.email).replace(/'/g, "\\'")}'); event.stopPropagation();">
                        <i class="fa-solid fa-user-secret"></i>
                        تنكر
                    </button>
                </div>
            `).join('');

            const searchInput = document.getElementById('impersonationUserSearch');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    const searchTerm = e.target.value.toLowerCase();
                    const userItems = document.querySelectorAll('.impersonation-user-item');
                    
                    userItems.forEach(item => {
                        const userName = item.dataset.userName.toLowerCase();
                        if (userName.includes(searchTerm)) {
                            item.style.display = '';
                        } else {
                            item.style.display = 'none';
                        }
                    });
                });
            }

        } catch (error) {
            console.error('Error loading users:', error);
            const usersList = document.getElementById('impersonationUsersList');
            if (usersList) {
                usersList.innerHTML = `
                    <div class="info-box info-box--error">
                        <i class="fa-solid fa-exclamation-circle"></i>
                        حدث خطأ في تحميل المستخدمين
                    </div>
                `;
            }
        }
    }

    /**
     * اختيار مستخدم للتنكر
     */
    async function selectUserForImpersonation(userId, userName) {
        const reason = document.getElementById('impersonationReason')?.value || '';
        
        const confirmed = await Swal.fire({
            title: 'تأكيد التنكر',
            html: `هل أنت متأكد من التنكر كـ <strong>"${userName}"</strong>؟<br><br><small class="form-hint">سيتم تسجيل هذه العملية.</small>`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'نعم، تنكر',
            cancelButtonText: 'إلغاء',
            confirmButtonColor: '#3b82f6',
            cancelButtonColor: '#6b7280'
        });

        if (!confirmed.isConfirmed) {
            return;
        }

        Swal.fire({
            title: 'جاري التنكر...',
            html: 'يرجى الانتظار',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        const result = await startImpersonation(userId, reason);

        if (result.success) {
            await Swal.fire({
                title: 'تم بنجاح',
                text: 'سيتم إعادة تحميل الصفحة الآن',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
            
            setTimeout(() => {
                location.reload();
            }, 1500);
        } else {
            Swal.fire({
                title: 'خطأ',
                text: result.error || 'حدث خطأ أثناء التنكر',
                icon: 'error',
                confirmButtonText: 'حسناً'
            });
        }
    }

    /**
     * التحقق من وجود جلسة تنكر عند تحميل الصفحة
     */
    async function checkImpersonationOnLoad() {
        const storedSession = localStorage.getItem('impersonation_session');
        
        if (storedSession) {
            try {
                const session = JSON.parse(storedSession);
                const activeSession = await getActiveImpersonation();
                
                if (activeSession) {
                    showImpersonationBanner();
                } else {
                    localStorage.removeItem('impersonation_session');
                }
            } catch (error) {
                console.error('Error checking impersonation:', error);
                localStorage.removeItem('impersonation_session');
            }
        }
    }

    /**
     * تهيئة صفحة التنكر الكاملة
     */
    async function initImpersonationPage() {
        try {
            if (!await canImpersonate()) {
                return;
            }

            await loadImpersonationStats();
            await loadActiveImpersonation();
            await loadImpersonationHistory();
            setupImpersonationPageListeners();
        } catch (error) {
            console.error('Error initializing impersonation page:', error);
        }
    }

    /**
     * تحميل إحصائيات التنكر
     */
    async function loadImpersonationStats() {
        try {
            const history = await getImpersonationHistory(1000, 0);
            
            const totalCount = history.length;
            const activeCount = history.filter(h => !h.ended_at).length;
            
            const now = new Date();
            const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const thisMonthCount = history.filter(h => new Date(h.started_at) >= thisMonthStart).length;
            
            const uniqueUsers = new Set(history.map(h => h.impersonated_user_id)).size;

            document.getElementById('totalImpersonationsCount').textContent = totalCount;
            document.getElementById('activeImpersonationsCount').textContent = activeCount;
            document.getElementById('thisMonthImpersonationsCount').textContent = thisMonthCount;
            document.getElementById('uniqueUsersImpersonatedCount').textContent = uniqueUsers;
        } catch (error) {
            console.error('Error loading impersonation stats:', error);
        }
    }

    /**
     * تحميل الجلسة النشطة
     */
    async function loadActiveImpersonation() {
        try {
            const activeSession = await getActiveImpersonation();
            const activeCard = document.getElementById('activeImpersonationCard');
            const activeDetails = document.getElementById('activeImpersonationDetails');

            if (activeSession && activeDetails) {
                const durationSeconds = Math.floor((new Date() - new Date(activeSession.startedAt)) / 1000);
                const minutes = Math.floor(durationSeconds / 60);
                const seconds = durationSeconds % 60;
                const durationText = minutes > 0 ? `${minutes} دقيقة و ${seconds} ثانية` : `${seconds} ثانية`;
                
                activeDetails.innerHTML = `
                    <div class="stats-grid">
                        <div class="stat-item">
                            <div class="stat-item__label">المسؤول</div>
                            <div class="stat-item__value">${activeSession.adminName || 'غير معروف'}</div>
                            <div class="stat-item__sub">${activeSession.adminEmail || ''}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-item__label">المدة</div>
                            <div class="stat-item__value">${durationText}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-item__label">بدأت في</div>
                            <div class="stat-item__value">${new Date(activeSession.startedAt).toLocaleString('ar-SA')}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-item__label">معرف الجلسة</div>
                            <div class="stat-item__value stat-item__value--mono">${activeSession.sessionId}</div>
                        </div>
                    </div>
                `;
                
                activeCard.style.display = 'block';
            } else if (activeCard) {
                activeCard.style.display = 'none';
            }
        } catch (error) {
            console.error('Error loading active impersonation:', error);
        }
    }

    /**
     * تحميل سجل التنكر
     */
    async function loadImpersonationHistory() {
        try {
            const history = await getImpersonationHistory(100, 0);
            const tableContainer = document.getElementById('impersonationHistoryTable');

            if (!history || history.length === 0) {
                tableContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fa-solid fa-inbox empty-state__icon"></i>
                        <p class="empty-state__title">لا يوجد سجل للتنكر</p>
                        <p class="empty-state__text">لم يتم تسجيل أي جلسات تنكر حتى الآن</p>
                    </div>
                `;
                return;
            }

            let cardsHTML = '<div class="items-grid">';

            history.forEach(session => {
                const startDate = new Date(session.started_at);
                const endDate = session.ended_at ? new Date(session.ended_at) : null;
                const durationSeconds = endDate 
                    ? Math.floor((endDate - startDate) / 1000) 
                    : Math.floor((new Date() - startDate) / 1000);
                const minutes = Math.floor(durationSeconds / 60);
                const seconds = durationSeconds % 60;
                const duration = minutes > 0 ? `${minutes} دقيقة و ${seconds} ثانية` : `${seconds} ثانية`;
                
                const isActive = !session.ended_at;
                const statusBadge = isActive
                    ? '<span class="badge badge-success"><i class="fa-solid fa-circle-dot"></i> نشط</span>'
                    : '<span class="badge badge-secondary"><i class="fa-solid fa-circle-check"></i> منتهي</span>';

                cardsHTML += `
                    <div class="application-card">
                        <div class="application-card-header">
                            <div class="applicant-info">
                                <div class="applicant-avatar">
                                    <i class="fa-solid fa-user-secret"></i>
                                </div>
                                <div class="applicant-details">
                                    <h4 class="applicant-name">${session.admin_name || 'غير معروف'}</h4>
                                    <p class="news-card__meta">${session.admin_email || ''}</p>
                                </div>
                            </div>
                        </div>
                        <div class="application-card-body">
                            <div class="application-info-grid">
                                <div class="info-item">
                                    <i class="fa-solid fa-user"></i>
                                    <div class="info-content">
                                        <span class="info-label">المستخدم المتنكر به</span>
                                        <span class="info-value">${session.impersonated_name || 'غير معروف'}</span>
                                        <span class="info-value--sub">${session.impersonated_email || ''}</span>
                                    </div>
                                </div>
                                <div class="info-item">
                                    <i class="fa-solid fa-clock"></i>
                                    <div class="info-content">
                                        <span class="info-label">بدأت في</span>
                                        <span class="info-value">${startDate.toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' })}</span>
                                    </div>
                                </div>
                                <div class="info-item">
                                    <i class="fa-solid fa-flag-checkered"></i>
                                    <div class="info-content">
                                        <span class="info-label">انتهت في</span>
                                        <span class="info-value">${endDate ? endDate.toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' }) : 'لا تزال نشطة'}</span>
                                    </div>
                                </div>
                                <div class="info-item">
                                    <i class="fa-solid fa-hourglass-half"></i>
                                    <div class="info-content">
                                        <span class="info-label">المدة</span>
                                        <span class="info-value">${duration}</span>
                                    </div>
                                </div>
                                ${session.reason ? `
                                    <div class="info-item">
                                        <i class="fa-solid fa-comment"></i>
                                        <div class="info-content">
                                            <span class="info-label">السبب</span>
                                            <span class="info-value info-value--italic">${session.reason}</span>
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                        <div class="application-card-footer">
                            ${statusBadge}
                            <span class="session-id">
                                <i class="fa-solid fa-fingerprint"></i> ${session.session_id.substring(0, 8)}...
                            </span>
                        </div>
                    </div>
                `;
            });

            cardsHTML += '</div>';
            tableContainer.innerHTML = cardsHTML;
        } catch (error) {
            console.error('Error loading impersonation history:', error);
            const tableContainer = document.getElementById('impersonationHistoryTable');
            if (tableContainer) {
                tableContainer.innerHTML = `
                    <div class="empty-state empty-state--error">
                        <i class="fa-solid fa-exclamation-circle empty-state__icon"></i>
                        <p class="empty-state__title">حدث خطأ في تحميل السجل</p>
                    </div>
                `;
            }
        }
    }

    /**
     * إعداد مستمعات الأحداث لصفحة التنكر
     */
    function setupImpersonationPageListeners() {
        const startBtn = document.getElementById('startImpersonationBtn');
        if (startBtn) {
            startBtn.addEventListener('click', openImpersonationDialog);
        }

        const endActiveBtn = document.getElementById('endActiveImpersonationBtn');
        if (endActiveBtn) {
            endActiveBtn.addEventListener('click', async () => {
                const result = await endImpersonation();
                if (result.success) {
                    await loadImpersonationStats();
                    await loadActiveImpersonation();
                    await loadImpersonationHistory();
                    if (window.Swal) {
                        Swal.fire({
                            title: 'تم بنجاح',
                            text: 'تم إنهاء جلسة التنكر',
                            icon: 'success',
                            timer: 2000,
                            showConfirmButton: false
                        });
                    }
                }
            });
        }

        const refreshBtn = document.getElementById('refreshImpersonationHistoryBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                await loadImpersonationStats();
                await loadActiveImpersonation();
                await loadImpersonationHistory();
            });
        }

        const exportBtn = document.getElementById('exportImpersonationHistoryBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', exportImpersonationHistory);
        }

        const searchInput = document.getElementById('impersonationSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', filterImpersonationHistory);
        }

        const statusFilter = document.getElementById('impersonationStatusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', filterImpersonationHistory);
        }

        const dateFilter = document.getElementById('impersonationDateFilter');
        if (dateFilter) {
            dateFilter.addEventListener('change', filterImpersonationHistory);
        }
    }

    /**
     * تصفية سجل التنكر
     */
    function filterImpersonationHistory() {
        const searchTerm = document.getElementById('impersonationSearchInput')?.value.toLowerCase() || '';
        const statusFilter = document.getElementById('impersonationStatusFilter')?.value || '';
        const dateFilter = document.getElementById('impersonationDateFilter')?.value || '';

        const rows = document.querySelectorAll('#impersonationHistoryTable tbody tr');
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            const matchesSearch = text.includes(searchTerm);
            
            let matchesStatus = true;
            if (statusFilter) {
                const statusBadge = row.querySelector('span');
                const isActive = statusBadge?.textContent.includes('نشط');
                matchesStatus = (statusFilter === 'active' && isActive) || (statusFilter === 'ended' && !isActive);
            }

            row.style.display = matchesSearch && matchesStatus ? '' : 'none';
        });
    }

    /**
     * تصدير سجل التنكر
     */
    async function exportImpersonationHistory() {
        try {
            const history = await getImpersonationHistory(1000, 0);
            
            let csv = 'المسؤول,البريد الإلكتروني للمسؤول,المستخدم المتنكر به,البريد الإلكتروني للمستخدم,بدأت في,انتهت في,المدة (دقيقة),السبب,الحالة\n';
            
            history.forEach(session => {
                const startDate = new Date(session.started_at);
                const endDate = session.ended_at ? new Date(session.ended_at) : null;
                const durationSeconds = endDate 
                    ? Math.floor((endDate - startDate) / 1000) 
                    : Math.floor((new Date() - startDate) / 1000);
                const minutes = Math.floor(durationSeconds / 60);
                const seconds = durationSeconds % 60;
                const durationText = minutes > 0 ? `${minutes} دقيقة و ${seconds} ثانية` : `${seconds} ثانية`;
                
                csv += `"${session.admin_name || ''}","${session.admin_email || ''}","${session.impersonated_name || ''}","${session.impersonated_email || ''}","${startDate.toLocaleString('ar-SA')}","${endDate ? endDate.toLocaleString('ar-SA') : '-'}","${durationText}","${session.reason || '-'}","${session.ended_at ? 'منتهي' : 'نشط'}"\n`;
            });

            const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `impersonation-history-${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
        } catch (error) {
            console.error('Error exporting history:', error);
            if (window.Swal) {
                Swal.fire({
                    title: 'خطأ',
                    text: 'حدث خطأ أثناء تصدير السجل',
                    icon: 'error',
                    confirmButtonText: 'حسناً'
                });
            }
        }
    }

    return {
        canImpersonate,
        startImpersonation,
        endImpersonation,
        getActiveImpersonation,
        getImpersonationHistory,
        openImpersonationDialog,
        selectUserForImpersonation,
        endImpersonationAndReload,
        checkImpersonationOnLoad,
        initImpersonationPage
    };
})();

document.addEventListener('DOMContentLoaded', () => {
    ImpersonationManager.checkImpersonationOnLoad();
});
