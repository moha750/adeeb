/**
 * نظام إدارة التنكر (User Impersonation) - نادي أدِيب
 * متاح لرئيس النادي ومستشاره (المستوى 9 وأعلى)
 */

window.ImpersonationManager = (function() {
    const sb = window.sbClient;
    let currentImpersonation = null;

    /**
     * التحقق من صلاحية التنكر - باستخدام نظام الصلاحيات الجديد
     */
    async function canImpersonate() {
        try {
            // استخدام نظام الصلاحيات الجديد إن وجد
            if (window.PermissionsHelper) {
                return window.PermissionsHelper.hasPermission('impersonate_users');
            }
            
            // fallback للنظام القديم
            const { data: { session } } = await sb.auth.getSession();
            if (!session) return false;

            const userRole = await AuthManager.getUserRole(session.user.id);
            return userRole && userRole.role_level >= 9;
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
            showToast('غير مصرح لك بهذه العملية', 'error');
            return;
        }

        const modal = document.getElementById('impersonationModal');
        const backdrop = document.getElementById('impersonationModalBackdrop');
        if (modal) {
            modal.classList.remove('d-none');
            document.body.classList.add('modal-open');
            setTimeout(() => {
                if (backdrop) backdrop.classList.add('active');
                modal.classList.add('active');
            }, 10);
            
            // إعادة تعيين الحقول
            const searchInput = document.getElementById('impersonationUserSearch');
            const reasonInput = document.getElementById('impersonationReason');
            if (searchInput) searchInput.value = '';
            if (reasonInput) reasonInput.value = '';
            
            // تحميل المستخدمين
            loadUsersForImpersonation();
            
            // إعداد البحث
            if (searchInput) {
                searchInput.addEventListener('input', filterUsersInModal);
            }
        }
    }
    
    /**
     * إغلاق نافذة التنكر
     */
    function closeImpersonationDialog() {
        const modal = document.getElementById('impersonationModal');
        const backdrop = document.getElementById('impersonationModalBackdrop');
        if (modal) {
            modal.classList.remove('active');
            if (backdrop) backdrop.classList.remove('active');
            modal.classList.add('d-none');
            document.body.classList.remove('modal-open');
        }
    }
    
    /**
     * فلترة المستخدمين في النافذة
     */
    function filterUsersInModal() {
        const searchTerm = document.getElementById('impersonationUserSearch')?.value.toLowerCase() || '';
        const userItems = document.querySelectorAll('#impersonationUsersList .user-item');
        
        userItems.forEach(item => {
            const userName = (item.dataset.userName || '').toLowerCase();
            const userEmail = (item.dataset.userEmail || '').toLowerCase();
            if (userName.includes(searchTerm) || userEmail.includes(searchTerm)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    }
    
    /**
     * عرض رسالة Toast
     */
    function showToast(message, type = 'info') {
        if (window.Toast) {
            window.Toast.show({ message, type });
        } else {
            console.log(`[${type}] ${message}`);
        }
    }

    /**
     * تحميل قائمة المستخدمين للتنكر
     */
    async function loadUsersForImpersonation() {
        try {
            const { data: sessionData } = await sb.auth.getSession();
            const session = sessionData?.session;
            
            if (!session || !session.user) {
                throw new Error('لم يتم العثور على جلسة نشطة');
            }
            
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
                <div class="impersonation-user-item"
                     data-user-id="${user.id}"
                     data-user-name="${(user.full_name || user.email).replace(/"/g, '&quot;')}"
                     data-user-email="${user.email}">
                    <div class="impersonation-user-item__avatar">
                        ${user.avatar_url
                            ? `<img src="${user.avatar_url}" alt="${user.full_name}">`
                            : `<i class="fa-solid fa-user"></i>`
                        }
                    </div>
                    <div class="impersonation-user-item__info">
                        <span class="impersonation-user-item__name">${user.full_name || 'بدون اسم'}</span>
                        <span class="impersonation-user-item__email">${user.email}</span>
                    </div>
                    <button class="btn btn-primary btn-sm" onclick="ImpersonationManager.selectUserForImpersonation('${user.id}', '${(user.full_name || user.email).replace(/'/g, "\\'")}'); event.stopPropagation();">
                        <i class="fa-solid fa-user-secret"></i>
                        تنكر
                    </button>
                </div>
            `).join('');

        } catch (error) {
            console.error('Error loading users:', error);
            const usersList = document.getElementById('impersonationUsersList');
            if (usersList) {
                usersList.innerHTML = `
                    <div class="empty-state empty-state--error">
                        <i class="fa-solid fa-exclamation-circle empty-state__icon"></i>
                        <p class="empty-state__title">حدث خطأ في تحميل المستخدمين</p>
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
        
        // استخدام ModalHelper بدلاً من confirm
        if (window.ModalHelper) {
            window.ModalHelper.confirm({
                title: 'تأكيد التنكر',
                message: `هل أنت متأكد من التنكر كـ "${userName}"؟<br><br>سيتم تسجيل هذه العملية.`,
                confirmText: 'تنكر',
                cancelText: 'إلغاء',
                type: 'warning',
                onConfirm: async () => {
                    await executeImpersonation(userId, reason);
                }
            });
        } else {
            // fallback إذا لم يكن ModalHelper متاحاً
            await executeImpersonation(userId, reason);
        }
    }
    
    /**
     * تنفيذ عملية التنكر
     */
    async function executeImpersonation(userId, reason) {
        // إغلاق النافذة
        closeImpersonationDialog();
        
        showToast('جاري التنكر...', 'info');

        const result = await startImpersonation(userId, reason);

        if (result.success) {
            showToast('تم التنكر بنجاح، سيتم إعادة تحميل الصفحة', 'success');
            setTimeout(() => {
                location.reload();
            }, 1500);
        } else {
            showToast(result.error || 'حدث خطأ أثناء التنكر', 'error');
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

            let cardsHTML = '<div class="uc-grid">';

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
                    <div class="uc-card">
                        <div class="uc-card__header ${isActive ? 'uc-card__header--success' : 'uc-card__header--neutral'}">
                            <div class="uc-card__header-inner">
                                <div class="uc-card__icon">
                                    <i class="fa-solid fa-user-secret"></i>
                                </div>
                                <div class="uc-card__header-info">
                                    <h3 class="uc-card__title">${session.admin_name || 'غير معروف'}</h3>
                                    <span class="uc-card__badge">
                                        <i class="fa-solid fa-user-secret"></i>
                                        ${isActive ? 'جلسة نشطة' : 'جلسة منتهية'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div class="uc-card__body">
                            <div class="uc-card__info-item">
                                <div class="uc-card__info-icon"><i class="fa-solid fa-user"></i></div>
                                <div class="uc-card__info-content">
                                    <span class="uc-card__info-label">المتنكر به</span>
                                    <span class="uc-card__info-value">${session.impersonated_name || 'غير معروف'}</span>
                                </div>
                            </div>
                            <div class="uc-card__info-item">
                                <div class="uc-card__info-icon"><i class="fa-regular fa-clock"></i></div>
                                <div class="uc-card__info-content">
                                    <span class="uc-card__info-label">بدأت في</span>
                                    <span class="uc-card__info-value">${startDate.toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' })}</span>
                                </div>
                            </div>
                            <div class="uc-card__info-item">
                                <div class="uc-card__info-icon"><i class="fa-solid fa-flag-checkered"></i></div>
                                <div class="uc-card__info-content">
                                    <span class="uc-card__info-label">انتهت في</span>
                                    <span class="uc-card__info-value">${endDate ? endDate.toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' }) : 'لا تزال نشطة'}</span>
                                </div>
                            </div>
                            <div class="uc-card__info-item">
                                <div class="uc-card__info-icon"><i class="fa-solid fa-hourglass-half"></i></div>
                                <div class="uc-card__info-content">
                                    <span class="uc-card__info-label">المدة</span>
                                    <span class="uc-card__info-value">${duration}</span>
                                </div>
                            </div>
                            ${session.reason ? `
                            <div class="uc-card__info-item">
                                <div class="uc-card__info-icon"><i class="fa-solid fa-comment"></i></div>
                                <div class="uc-card__info-content">
                                    <span class="uc-card__info-label">السبب</span>
                                    <span class="uc-card__info-value">${session.reason}</span>
                                </div>
                            </div>` : ''}
                        </div>
                        <div class="uc-card__footer" style="justify-content:flex-end;">
                            <span style="font-size:0.72rem;color:#94a3b8;font-family:monospace;">
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
        // زر بدء التنكر
        const startBtn = document.getElementById('startImpersonationBtn');
        if (startBtn) {
            startBtn.addEventListener('click', openImpersonationDialog);
        }
        
        // أزرار النافذة المنبثقة
        document.getElementById('closeImpersonationModal')?.addEventListener('click', closeImpersonationDialog);
        document.getElementById('cancelImpersonation')?.addEventListener('click', closeImpersonationDialog);
        
        // إغلاق النافذة عند النقر على الخلفية
        document.getElementById('impersonationModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'impersonationModal') {
                closeImpersonationDialog();
            }
        });

        const endActiveBtn = document.getElementById('endActiveImpersonationBtn');
        if (endActiveBtn) {
            endActiveBtn.addEventListener('click', async () => {
                const result = await endImpersonation();
                if (result.success) {
                    await loadImpersonationStats();
                    await loadActiveImpersonation();
                    await loadImpersonationHistory();
                    showToast('تم إنهاء جلسة التنكر', 'success');
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
            showToast('حدث خطأ أثناء تصدير السجل', 'error');
        }
    }

    return {
        canImpersonate,
        startImpersonation,
        endImpersonation,
        getActiveImpersonation,
        getImpersonationHistory,
        openImpersonationDialog,
        closeImpersonationDialog,
        selectUserForImpersonation,
        executeImpersonation,
        endImpersonationAndReload,
        checkImpersonationOnLoad,
        initImpersonationPage
    };
})();

document.addEventListener('DOMContentLoaded', () => {
    ImpersonationManager.checkImpersonationOnLoad();
});

