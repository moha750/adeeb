/**
 * Contact Messages Manager - إعادة بناء كاملة
 * إدارة رسائل التواصل في لوحة التحكم
 */

class ContactMessagesManager {
    constructor() {
        this.messages = [];
        this.currentMessage = null;
        this.filters = {
            search: '',
            status: '',
            priority: ''
        };
        console.log('ContactMessagesManager: Initialized');
    }

    async init() {
        console.log('ContactMessagesManager: Starting init...');
        this.attachEventListeners();
        await this.loadMessages();
    }

    attachEventListeners() {
        const searchInput = document.getElementById('messageSearchInput');
        const statusFilter = document.getElementById('messageStatusFilter');
        const priorityFilter = document.getElementById('messagePriorityFilter');
        const refreshBtn = document.getElementById('refreshMessagesBtn');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filters.search = e.target.value;
                this.renderMessages();
            });
        }

        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filters.status = e.target.value;
                this.renderMessages();
            });
        }

        if (priorityFilter) {
            priorityFilter.addEventListener('change', (e) => {
                this.filters.priority = e.target.value;
                this.renderMessages();
            });
        }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadMessages());
        }
    }

    async loadMessages() {
        try {
            console.log('ContactMessagesManager: Loading messages...');
            const sb = window.sbClient;
            if (!sb) {
                console.error('ContactMessagesManager: Supabase client not initialized');
                this.showError('لم يتم تهيئة الاتصال بقاعدة البيانات');
                return;
            }

            const { data, error } = await sb
                .from('contact_messages')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('ContactMessagesManager: Error loading messages:', error);
                throw error;
            }

            console.log('ContactMessagesManager: Loaded messages:', data?.length || 0);
            this.messages = data || [];
            this.updateStats();
            this.renderMessages();
        } catch (error) {
            console.error('ContactMessagesManager: Error in loadMessages:', error);
            this.showError('حدث خطأ في تحميل الرسائل: ' + error.message);
        }
    }

    updateStats() {
        const stats = {
            new: this.messages.filter(m => m.status === 'new').length,
            read: this.messages.filter(m => m.status === 'read').length,
            replied: this.messages.filter(m => m.status === 'replied').length,
            archived: this.messages.filter(m => m.status === 'archived').length
        };

        const elements = {
            newMessagesCount: stats.new,
            readMessagesCount: stats.read,
            repliedMessagesCount: stats.replied,
            archivedMessagesCount: stats.archived
        };

        Object.keys(elements).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = elements[id];
        });

        console.log('ContactMessagesManager: Stats updated:', stats);
    }

    filterMessages() {
        return this.messages.filter(message => {
            const matchesSearch = !this.filters.search || 
                message.name.toLowerCase().includes(this.filters.search.toLowerCase()) ||
                message.email.toLowerCase().includes(this.filters.search.toLowerCase()) ||
                (message.subject && message.subject.toLowerCase().includes(this.filters.search.toLowerCase())) ||
                message.message.toLowerCase().includes(this.filters.search.toLowerCase());

            const matchesStatus = !this.filters.status || message.status === this.filters.status;
            const matchesPriority = !this.filters.priority || message.priority === this.filters.priority;

            return matchesSearch && matchesStatus && matchesPriority;
        });
    }

    renderMessages() {
        const container = document.getElementById('contactMessagesTable');
        if (!container) {
            console.error('ContactMessagesManager: contactMessagesTable container not found');
            return;
        }

        const filteredMessages = this.filterMessages();
        console.log('ContactMessagesManager: Rendering', filteredMessages.length, 'messages');

        if (filteredMessages.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-inbox"></i>
                    <p>لا توجد رسائل</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="uc-grid">
                ${filteredMessages.map(message => this.renderMessageCard(message)).join('')}
            </div>
        `;

        // إضافة مستمعات الأحداث للأزرار
        this.attachMessageCardListeners();
    }

    renderMessageCard(message) {
        const isNew = message.status === 'new';
        const badgeClass = isNew ? '' : 'badge-success';
        const badgeLabel = isNew ? 'جديد' : 'تم الرد';
        const badgeIcon = isNew ? 'fa-envelope' : 'fa-reply';

        const date = new Date(message.created_at).toLocaleDateString('ar-SA', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
        const timeSince = this.getTimeSince(message.created_at);
        const messagePreview = message.message.length > 100
            ? this.escapeHtml(message.message.substring(0, 100)) + '...'
            : this.escapeHtml(message.message);

        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(message.name)}&background=335c81&color=fff&size=200`;

        return `
            <div class="uc-card${isNew ? ' new-message' : ''}" data-message-id="${message.id}">
                <div class="uc-card__header">
                    <div class="uc-card__header-inner">
                        <img class="uc-card__icon" src="${avatarUrl}" alt="${this.escapeHtml(message.name)}" />
                        <div class="uc-card__header-info">
                            <h3 class="uc-card__title">${this.escapeHtml(message.name)}</h3>
                            <div class="uc-card__badge ${badgeClass}">
                                <i class="fa-solid ${badgeIcon}"></i>
                                <span>${badgeLabel} · ${timeSince}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="uc-card__body">
                    <div class="uc-card__info-item">
                        <div class="uc-card__info-icon"><i class="fa-solid fa-at"></i></div>
                        <div class="uc-card__info-content">
                            <div class="uc-card__info-label">البريد الإلكتروني</div>
                            <div class="uc-card__info-value">${this.escapeHtml(message.email)}</div>
                        </div>
                    </div>
                    <div class="uc-card__info-item">
                        <div class="uc-card__info-icon"><i class="fa-solid fa-tag"></i></div>
                        <div class="uc-card__info-content">
                            <div class="uc-card__info-label">الموضوع</div>
                            <div class="uc-card__info-value">${message.subject ? this.escapeHtml(message.subject) : 'بدون موضوع'}</div>
                        </div>
                    </div>
                    <div class="uc-card__info-item">
                        <div class="uc-card__info-icon"><i class="fa-regular fa-calendar"></i></div>
                        <div class="uc-card__info-content">
                            <div class="uc-card__info-label">تاريخ الإرسال</div>
                            <div class="uc-card__info-value">${date}</div>
                        </div>
                    </div>
                    <div class="uc-card__info-item">
                        <div class="uc-card__info-icon"><i class="fa-solid fa-message"></i></div>
                        <div class="uc-card__info-content">
                            <div class="uc-card__info-label">محتوى الرسالة</div>
                            <div class="uc-card__info-value">${messagePreview}</div>
                        </div>
                    </div>
                </div>
                <div class="uc-card__footer">
                    <button class="member-card-view-btn btn-view-details" data-message-id="${message.id}">
                        <i class="fa-solid fa-eye"></i>
                        عرض التفاصيل الكاملة
                    </button>
                </div>
            </div>
        `;
    }

    attachMessageCardListeners() {
        document.querySelectorAll('.btn-view-details').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const messageId = e.currentTarget.dataset.messageId;
                this.viewMessage(messageId);
            });
        });
    }

    async viewMessage(messageId) {
        const message = this.messages.find(m => m.id === messageId);
        if (!message) return;

        this.currentMessage = message;
        console.log('ContactMessagesManager: Viewing message:', messageId);

        // عرض تفاصيل الرسالة باستخدام SweetAlert أو Modal
        if (window.Swal) {
            const result = await Swal.fire({
                title: `رسالة من ${this.escapeHtml(message.name)}`,
                html: `
                    <div class="modal-content-rtl">
                        <div class="uc-grid">
                            <div class="uc-card__info-item">
                                <div class="uc-card__info-icon"><i class="fa-solid fa-envelope"></i></div>
                                <div class="uc-card__info-content">
                                    <span class="uc-card__info-label">البريد الإلكتروني</span>
                                    <span class="uc-card__info-value">${this.escapeHtml(message.email)}</span>
                                </div>
                            </div>
                            <div class="uc-card__info-item">
                                <div class="uc-card__info-icon"><i class="fa-solid fa-tag"></i></div>
                                <div class="uc-card__info-content">
                                    <span class="uc-card__info-label">الموضوع</span>
                                    <span class="uc-card__info-value">${message.subject ? this.escapeHtml(message.subject) : 'بدون موضوع'}</span>
                                </div>
                            </div>
                            <div class="uc-card__info-item">
                                <div class="uc-card__info-icon"><i class="fa-solid fa-calendar"></i></div>
                                <div class="uc-card__info-content">
                                    <span class="uc-card__info-label">التاريخ</span>
                                    <span class="uc-card__info-value">${new Date(message.created_at).toLocaleString('ar-SA')}</span>
                                </div>
                            </div>
                            <div class="uc-card__info-item">
                                <div class="uc-card__info-icon"><i class="fa-solid fa-message"></i></div>
                                <div class="uc-card__info-content">
                                    <span class="uc-card__info-label">الرسالة</span>
                                    <span class="uc-card__info-value" style="white-space: pre-wrap;">${this.escapeHtml(message.message)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `,
                icon: 'info',
                showCancelButton: true,
                showDenyButton: true,
                confirmButtonText: '<i class="fa-solid fa-reply"></i> الرد عبر البريد',
                denyButtonText: 'تعليم كمقروءة',
                cancelButtonText: 'إغلاق',
                width: '600px',
                customClass: {
                    confirmButton: 'btn btn-primary',
                    denyButton: 'btn btn-secondary',
                    cancelButton: 'btn btn-outline'
                }
            });

            if (result.isConfirmed) {
                // فتح البريد الإلكتروني للرد
                const subject = encodeURIComponent(`رد: ${message.subject || 'رسالة من موقع أدِيب'}`);
                window.open(`mailto:${message.email}?subject=${subject}`, '_blank');
                // تحديث حالة الرسالة إلى "تم الرد"
                await this.markAsReplied(messageId);
            } else if (result.isDenied && message.status === 'new') {
                await this.markAsRead(messageId);
            }
        } else {
            alert(`رسالة من: ${message.name}\nالبريد: ${message.email}\n\n${message.message}`);
            if (message.status === 'new') {
                await this.markAsRead(messageId);
            }
        }
    }

    // حساب المدة منذ إرسال الرسالة
    getTimeSince(dateString) {
        const now = new Date();
        const date = new Date(dateString);
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffMonths = Math.floor(diffDays / 30);
        const diffYears = Math.floor(diffDays / 365);

        if (diffMins < 1) return 'الآن';
        if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
        if (diffHours < 24) return `منذ ${diffHours} ساعة`;
        if (diffDays < 30) return `منذ ${diffDays} يوم`;
        if (diffMonths < 12) return `منذ ${diffMonths} شهر`;
        return `منذ ${diffYears} سنة`;
    }

    // تعليم الرسالة كـ "تم الرد"
    async markAsReplied(messageId) {
        try {
            const sb = window.sbClient;
            const { error } = await sb
                .from('contact_messages')
                .update({ status: 'replied' })
                .eq('id', messageId);

            if (error) throw error;

            const message = this.messages.find(m => m.id === messageId);
            if (message) message.status = 'replied';
            
            this.updateStats();
            this.renderMessages();
            console.log('ContactMessagesManager: Message marked as replied');
        } catch (error) {
            console.error('ContactMessagesManager: Error marking message as replied:', error);
        }
    }

    async markAsRead(messageId) {
        try {
            const sb = window.sbClient;
            const { error } = await sb
                .from('contact_messages')
                .update({ status: 'read' })
                .eq('id', messageId);

            if (error) throw error;

            const message = this.messages.find(m => m.id === messageId);
            if (message) message.status = 'read';
            
            this.updateStats();
            this.renderMessages();
            console.log('ContactMessagesManager: Message marked as read');
        } catch (error) {
            console.error('ContactMessagesManager: Error marking message as read:', error);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showError(message) {
        if (window.Swal) {
            Swal.fire({
                icon: 'error',
                title: 'خطأ',
                text: message
            });
        } else {
            alert(message);
        }
    }
}

// تصدير الـ class
window.ContactMessagesManager = ContactMessagesManager;


