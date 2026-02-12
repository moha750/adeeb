/**
 * إدارة الأعضاء المعلقين (الذين لم يكملوا التسجيل)
 */

class PendingMembersManager {
    constructor() {
        this.supabase = window.sbClient;
        this.pendingMembers = [];
        this.filteredMembers = [];
        this.currentFilters = {
            search: '',
            tokenStatus: ''
        };
    }

    /**
     * جلب الأعضاء الذين لم يكملوا التسجيل
     */
    async fetchPendingMembers() {
        try {
            // جلب جميع tokens غير المستخدمة مع بيانات المستخدم من profiles
            const { data: tokens, error: tokensError } = await this.supabase.rpc('get_pending_members');

            if (tokensError) {
                // إذا فشلت الدالة، نستخدم استعلام بديل
                const { data: rawTokens, error: rawError } = await this.supabase
                    .from('member_onboarding_tokens')
                    .select('*')
                    .eq('is_used', false)
                    .order('created_at', { ascending: false });

                if (rawError) throw rawError;

                // جلب بيانات profiles لكل token
                const tokensWithProfiles = await Promise.all(
                    (rawTokens || []).map(async (token) => {
                        const { data: profile } = await this.supabase
                            .from('profiles')
                            .select('id, full_name, email, phone, account_status, created_at')
                            .eq('id', token.user_id)
                            .single();

                        return {
                            ...token,
                            profile: profile || null
                        };
                    })
                );

                this.pendingMembers = tokensWithProfiles;
                return this.pendingMembers;
            }

            this.pendingMembers = tokens || [];
            this.filteredMembers = tokens || [];
            return this.pendingMembers;
        } catch (error) {
            console.error('Error fetching pending members:', error);
            throw error;
        }
    }

    /**
     * حساب وعرض الإحصائيات
     */
    renderStats() {
        const container = document.getElementById('pendingMembersStatsGrid');
        if (!container) return;

        const total = this.pendingMembers.length;
        const expired = this.pendingMembers.filter(m => this.isTokenExpired(m.expires_at)).length;
        const valid = total - expired;

        container.innerHTML = `
            <div class="stat-card" style="--stat-color: #f59e0b;">
                <div class="stat-card-wrapper">
                    <div class="stat-icon">
                        <i class="fa-solid fa-clock"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${total}</div>
                        <div class="stat-label">إجمالي المعلقين</div>
                    </div>
                </div>
            </div>
            <div class="stat-card" style="--stat-color: #10b981;">
                <div class="stat-card-wrapper">
                    <div class="stat-icon">
                        <i class="fa-solid fa-check-circle"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${valid}</div>
                        <div class="stat-label">روابط صالحة</div>
                    </div>
                </div>
            </div>
            <div class="stat-card" style="--stat-color: #ef4444;">
                <div class="stat-card-wrapper">
                    <div class="stat-icon">
                        <i class="fa-solid fa-times-circle"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${expired}</div>
                        <div class="stat-label">روابط منتهية</div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * التحقق من انتهاء صلاحية token
     */
    isTokenExpired(expiresAt) {
        return new Date(expiresAt) < new Date();
    }

    /**
     * إعادة إرسال رابط التسجيل
     */
    async resendOnboardingEmail(userId) {
        try {
            const { data: { session } } = await this.supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            const response = await fetch(
                `${this.supabase.supabaseUrl}/functions/v1/resend-onboarding-email`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ user_id: userId })
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to resend email');
            }

            return result;
        } catch (error) {
            console.error('Error resending email:', error);
            throw error;
        }
    }

    /**
     * عرض قائمة الأعضاء المعلقين
     */
    renderPendingMembersList(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (this.filteredMembers.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-user-clock"></i>
                    <p>لا يوجد أعضاء معلقين</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="applications-cards-grid">
                ${this.filteredMembers.map(member => this.renderMemberCard(member)).join('')}
            </div>
        `;
    }

    /**
     * تطبيق الفلاتر
     */
    applyFilters() {
        this.filteredMembers = this.pendingMembers.filter(member => {
            // فلتر البحث
            if (this.currentFilters.search) {
                const searchLower = this.currentFilters.search.toLowerCase();
                const matchesSearch = 
                    member.profile?.full_name?.toLowerCase().includes(searchLower) ||
                    member.profile?.email?.toLowerCase().includes(searchLower) ||
                    member.sent_to_email?.toLowerCase().includes(searchLower) ||
                    member.profile?.phone?.includes(searchLower);
                
                if (!matchesSearch) return false;
            }

            // فلتر حالة Token
            if (this.currentFilters.tokenStatus) {
                const isExpired = this.isTokenExpired(member.expires_at);
                if (this.currentFilters.tokenStatus === 'valid' && isExpired) return false;
                if (this.currentFilters.tokenStatus === 'expired' && !isExpired) return false;
            }

            return true;
        });

        this.renderPendingMembersList('pendingMembersContainer');
    }

    /**
     * إعداد Event Listeners للفلاتر
     */
    setupFilterListeners() {
        // البحث
        const searchInput = document.getElementById('pendingMembersSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.currentFilters.search = e.target.value;
                this.applyFilters();
            });
        }

        // فلتر حالة Token
        const tokenStatusFilter = document.getElementById('pendingTokenStatusFilter');
        if (tokenStatusFilter) {
            tokenStatusFilter.addEventListener('change', (e) => {
                this.currentFilters.tokenStatus = e.target.value;
                this.applyFilters();
            });
        }
    }

    /**
     * عرض بطاقة عضو معلق واحد
     */
    renderMemberCard(member) {
        const isExpired = this.isTokenExpired(member.expires_at);
        const createdDate = new Date(member.created_at).toLocaleDateString('ar-SA');
        const expiresDate = new Date(member.expires_at).toLocaleDateString('ar-SA');
        
        const profile = member.profile || {};
        const fullName = profile.full_name || 'غير محدد';
        const email = profile.email || member.sent_to_email || 'غير محدد';
        const phone = profile.phone || 'غير محدد';

        const statusClass = isExpired ? 'danger' : 'warning';
        const statusLabel = isExpired ? 'منتهي الصلاحية' : 'قيد الانتظار';
        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=f59e0b&color=fff`;

        return `
            <div class="application-card" data-user-id="${member.user_id}">
                <div class="application-card-header">
                    <div class="applicant-info">
                        <div class="applicant-avatar">
                            <img src="${avatarUrl}" alt="${fullName}" />
                        </div>
                        <div class="applicant-details">
                            <h3 class="applicant-name">${fullName}</h3>
                            <span class="badge badge-${statusClass}">${statusLabel}</span>
                        </div>
                    </div>
                </div>
                
                <div class="application-card-body">
                    <div class="application-info-grid">
                        <div class="info-item">
                            <i class="fa-solid fa-envelope"></i>
                            <div class="info-content">
                                <span class="info-label">البريد الإلكتروني</span>
                                <span class="info-value">${email}</span>
                            </div>
                        </div>
                        
                        <div class="info-item">
                            <i class="fa-solid fa-calendar-plus"></i>
                            <div class="info-content">
                                <span class="info-label">تاريخ الإرسال</span>
                                <span class="info-value">${createdDate}</span>
                            </div>
                        </div>
                        
                        <div class="info-item">
                            <i class="fa-solid fa-calendar-xmark"></i>
                            <div class="info-content">
                                <span class="info-label">تاريخ الانتهاء</span>
                                <span class="info-value">${expiresDate}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="application-card-footer">
                    <button class="btn btn--warning btn--sm btn-resend-email" data-user-id="${member.user_id}">
                        <i class="fa-solid fa-paper-plane"></i>
                        إعادة إرسال الرابط
                    </button>
                    <button class="btn btn--outline-secondary btn--sm btn-copy-link" data-token="${member.token}">
                        <i class="fa-solid fa-copy"></i>
                        نسخ الرابط
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * إضافة event listeners باستخدام event delegation
     */
    attachEventListeners() {
        const container = document.getElementById('pendingMembersContainer');
        if (!container || container._pendingListenersAttached) return;
        container._pendingListenersAttached = true;

        container.addEventListener('click', async (e) => {
            // زر إعادة الإرسال
            const resendBtn = e.target.closest('.btn-resend-email');
            if (resendBtn) {
                const userId = resendBtn.dataset.userId;
                if (userId) await this.handleResendEmail(userId);
                return;
            }

            // زر نسخ الرابط
            const copyBtn = e.target.closest('.btn-copy-link');
            if (copyBtn) {
                const token = copyBtn.dataset.token;
                if (token) this.handleCopyLink(token);
                return;
            }
        });
    }

    /**
     * معالج إعادة إرسال الإيميل
     */
    async handleResendEmail(userId) {
        if (!window.Swal) return;

        const result = await Swal.fire({
            title: 'إعادة إرسال رابط التسجيل',
            text: 'هل تريد إعادة إرسال رابط التسجيل لهذا العضو؟',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'نعم، أرسل',
            cancelButtonText: 'إلغاء',
            confirmButtonColor: '#3d8fd6',
            cancelButtonColor: '#94a3b8'
        });

        if (!result.isConfirmed) return;

        try {
            Swal.fire({
                title: 'جاري الإرسال...',
                text: 'يرجى الانتظار',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const response = await this.resendOnboardingEmail(userId);

            await Swal.fire({
                title: 'تم الإرسال!',
                text: `تم إعادة إرسال رابط التسجيل إلى ${response.email}`,
                icon: 'success',
                confirmButtonText: 'حسناً',
                confirmButtonColor: '#10b981'
            });

            // تحديث القائمة
            await this.fetchPendingMembers();
            this.renderPendingMembersList('pendingMembersContainer');

        } catch (error) {
            Swal.fire({
                title: 'فشل الإرسال',
                text: error.message || 'حدث خطأ أثناء إعادة إرسال الرابط',
                icon: 'error',
                confirmButtonText: 'حسناً',
                confirmButtonColor: '#ef4444'
            });
        }
    }

    /**
     * معالج نسخ الرابط
     */
    handleCopyLink(token) {
        const link = `https://adeeb.club/member-onboarding?token=${token}`;
        
        navigator.clipboard.writeText(link).then(() => {
            if (window.Swal) {
                Swal.fire({
                    title: 'تم النسخ!',
                    text: 'تم نسخ رابط التسجيل إلى الحافظة',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false,
                    toast: true,
                    position: 'top-end'
                });
            }
        }).catch(err => {
            console.error('Failed to copy:', err);
            if (window.Swal) {
                Swal.fire({
                    title: 'فشل النسخ',
                    text: 'حدث خطأ أثناء نسخ الرابط',
                    icon: 'error',
                    confirmButtonText: 'حسناً'
                });
            }
        });
    }

    /**
     * تهيئة المدير
     */
    async init(containerId) {
        try {
            await this.fetchPendingMembers();
            this.renderStats();
            this.renderPendingMembersList(containerId);
            this.attachEventListeners();
            this.setupFilterListeners();
        } catch (error) {
            console.error('Failed to initialize pending members manager:', error);
        }
    }
}

// تصدير للاستخدام العام
window.PendingMembersManager = PendingMembersManager;
