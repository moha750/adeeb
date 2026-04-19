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

                this.pendingMembers = await this.enrichWithAcceptanceDate(tokensWithProfiles);
                return this.pendingMembers;
            }

            const enriched = await this.enrichWithAcceptanceDate(tokens || []);
            this.pendingMembers = enriched;
            this.filteredMembers = enriched;
            return this.pendingMembers;
        } catch (error) {
            console.error('Error fetching pending members:', error);
            throw error;
        }
    }

    /**
     * إثراء البيانات بتاريخ القبول من جدول membership_accepted_members
     */
    async enrichWithAcceptanceDate(members) {
        if (!members || members.length === 0) return members;

        const emails = members
            .map(m => m.profile?.email || m.sent_to_email)
            .filter(Boolean);

        if (emails.length === 0) return members;

        const { data: accepted } = await this.supabase
            .from('membership_accepted_members')
            .select('email, created_at')
            .in('email', emails);

        const acceptedMap = new Map((accepted || []).map(a => [a.email, a.created_at]));

        return members.map(m => ({
            ...m,
            accepted_at: acceptedMap.get(m.profile?.email || m.sent_to_email) || null
        }));
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
            const res = await window.edgeInvoke('resend-onboarding-email', { user_id: userId });
            if (!res.ok) {
                throw new Error(res.error || 'Failed to resend email');
            }
            return res.data;
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
                <div class="empty-state empty-state--warning">
                    <div class="empty-state__icon"><i class="fa-solid fa-user-clock"></i></div>
                    <p class="empty-state__title">لا يوجد أعضاء معلقين</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="uc-grid">
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
        const createdDate = new Date(member.created_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
        const expiresDate = new Date(member.expires_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
        const acceptedDate = member.accepted_at
            ? new Date(member.accepted_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })
            : null;

        const profile = member.profile || {};
        const fullName = profile.full_name || 'غير محدد';
        const email = profile.email || member.sent_to_email || 'غير محدد';
        const phone = profile.phone || null;

        const statusLabel = isExpired ? 'منتهي الصلاحية' : 'قيد الانتظار';
        const statusIcon = isExpired ? 'fa-clock-rotate-left' : 'fa-clock';
        const heroGradient = isExpired
            ? 'linear-gradient(135deg, #f75555ff 0%, #ef4444 100%)'
            : 'linear-gradient(135deg, #ff9720ff 0%, #eb8511ff 100%)';

        return `
            <div class="uc-card ${isExpired ? 'uc-card--danger' : 'uc-card--warning'}" data-user-id="${member.user_id}">

                <div class="uc-card__header" style="background: ${heroGradient};">
                    <div class="uc-card__header-inner">
                        <div class="uc-card__icon">
                            <i class="fa-solid fa-user"></i>
                        </div>
                        <div class="uc-card__header-info">
                            <h3 class="uc-card__title">${fullName}</h3>
                            <span class="uc-card__badge">
                                <i class="fa-solid ${statusIcon}"></i>
                                ${statusLabel}
                            </span>
                        </div>
                    </div>
                </div>

                <div class="uc-card__body">
                    <div class="uc-card__info-item">
                        <div class="uc-card__info-icon"><i class="fa-regular fa-envelope"></i></div>
                        <div class="uc-card__info-content">
                            <span class="uc-card__info-label">البريد الإلكتروني</span>
                            <span class="uc-card__info-value">${email}</span>
                        </div>
                    </div>
                    ${phone ? `
                    <div class="uc-card__info-item">
                        <div class="uc-card__info-icon"><i class="fa-solid fa-phone"></i></div>
                        <div class="uc-card__info-content">
                            <span class="uc-card__info-label">الجوال</span>
                            <span class="uc-card__info-value">${phone}</span>
                        </div>
                    </div>` : ''}
                    ${acceptedDate ? `
                    <div class="uc-card__info-item">
                        <div class="uc-card__info-icon"><i class="fa-solid fa-user-check"></i></div>
                        <div class="uc-card__info-content">
                            <span class="uc-card__info-label">تاريخ القبول</span>
                            <span class="uc-card__info-value">${acceptedDate}</span>
                        </div>
                    </div>` : ''}
                    <div class="uc-card__info-item">
                        <div class="uc-card__info-icon"><i class="fa-regular fa-calendar-plus"></i></div>
                        <div class="uc-card__info-content">
                            <span class="uc-card__info-label">تاريخ الإرسال</span>
                            <span class="uc-card__info-value">${createdDate}</span>
                        </div>
                    </div>
                    <div class="uc-card__info-item">
                        <div class="uc-card__info-icon"><i class="fa-regular fa-calendar-xmark"></i></div>
                        <div class="uc-card__info-content">
                            <span class="uc-card__info-label">تاريخ انتهاء الرابط</span>
                            <span class="uc-card__info-value">${expiresDate}</span>
                        </div>
                    </div>
                </div>

                <div class="uc-card__footer">
                    <button class="btn-resend-email btn btn-warning btn-block" data-user-id="${member.user_id}">
                        <i class="fa-solid fa-paper-plane"></i>
                        إعادة إرسال
                    </button>
                    ${!isExpired ? `
                    <button class="btn-copy-link btn btn-success btn-block" data-token="${member.token}">
                        <i class="fa-solid fa-copy"></i>
                        نسخ الرابط
                    </button>` : ''}
                    <button class="btn-revoke-membership btn btn-danger btn-block" data-user-id="${member.user_id}" data-user-name="${fullName}">
                        <i class="fa-solid fa-user-xmark"></i>
                        سحب القبول
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

            // زر سحب القبول
            const revokeBtn = e.target.closest('.btn-revoke-membership');
            if (revokeBtn) {
                const userId = revokeBtn.dataset.userId;
                const userName = revokeBtn.dataset.userName;
                if (userId) await this.handleRevokeMembership(userId, userName);
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
     * معالج سحب القبول
     */
    async handleRevokeMembership(userId, userName) {
        if (!window.Swal) return;

        const result = await Swal.fire({
            title: 'تأكيد سحب القبول',
            icon: 'error',
            html: `
                <div class="modal-info-box box-danger" style="margin-bottom:1.25rem;">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <span>سيتم سحب قبول <strong>${userName}</strong> وإلغاء دعوة الانضمام. هذا الإجراء لا يمكن التراجع عنه.</span>
                </div>
                <div class="modal-form-grid">
                    <div class="form-group full-width">
                        <label class="form-label">
                            <span class="label-icon"><i class="fa-solid fa-comment-dots"></i></span>
                            سبب سحب القبول <span class="required-dot">*</span>
                        </label>
                        <div class="form-radio-group">
                            <label class="form-radio">
                                <input type="radio" name="revokePreset" value="تراجع المقبول عن الانضمام" onchange="document.getElementById('revokeReasonInput').value=this.value">
                                <span class="form-radio-label">تراجع المقبول عن الانضمام</span>
                            </label>
                            <label class="form-radio">
                                <input type="radio" name="revokePreset" value="انتهاء مدة الدعوة المتجددة دون استجابة" onchange="document.getElementById('revokeReasonInput').value=this.value">
                                <span class="form-radio-label">انتهاء مدة الدعوة المتجددة دون استجابة</span>
                            </label>
                            <label class="form-radio">
                                <input type="radio" name="revokePreset" value="قرار إداري بسحب القبول" onchange="document.getElementById('revokeReasonInput').value=this.value">
                                <span class="form-radio-label">قرار إداري بسحب القبول</span>
                            </label>
                        </div>
                        <textarea id="revokeReasonInput" class="form-input form-textarea" rows="2"
                            placeholder="أو اكتب سبباً مخصصاً..." style="margin-top:0.75rem;"></textarea>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'نعم، سحب القبول',
            cancelButtonText: 'إلغاء',
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#94a3b8',
            preConfirm: () => {
                const reason = document.getElementById('revokeReasonInput')?.value?.trim();
                if (!reason) {
                    Swal.showValidationMessage('يرجى تحديد سبب سحب القبول');
                    return false;
                }
                return reason;
            }
        });

        if (!result.isConfirmed) return;
        const revokeReason = result.value;

        try {
            // 1. إلغاء token الدعوة
            const { error: tokenError } = await this.supabase
                .from('member_onboarding_tokens')
                .update({ is_used: true })
                .eq('user_id', userId);

            if (tokenError) throw tokenError;

            // 2. تحديث حالة الحساب مع سبب السحب
            const { error: profileError } = await this.supabase
                .from('profiles')
                .update({
                    account_status: 'suspended',
                    termination_reason: revokeReason,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);

            if (profileError) throw profileError;

            if (window.Toast) {
                Toast.success(`تم سحب قبول ${userName} بنجاح`);
            } else {
                await Swal.fire({
                    title: 'تم سحب القبول',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false,
                    toast: true,
                    position: 'top-end'
                });
            }

            await this.fetchPendingMembers();
            this.renderStats();
            this.applyFilters();

        } catch (error) {
            console.error('Error revoking membership:', error);
            if (window.Toast) {
                Toast.error('حدث خطأ أثناء سحب القبول. يرجى المحاولة مرة أخرى.');
            } else {
                Swal.fire({
                    title: 'خطأ',
                    text: 'حدث خطأ أثناء سحب القبول. يرجى المحاولة مرة أخرى.',
                    icon: 'error',
                    confirmButtonText: 'حسناً'
                });
            }
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
