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
            <div class="applications-cards-grid">
                ${filteredMessages.map(message => this.renderMessageCard(message)).join('')}
            </div>
        `;

        // إضافة مستمعات الأحداث للأزرار
        this.attachMessageCardListeners();
    }

    renderMessageCard(message) {
        const statusBadges = {
            new: '<span class="badge badge-info">جديدة</span>',
            read: '<span class="badge badge-success">مقروءة</span>',
            replied: '<span class="badge">تم الرد</span>',
            archived: '<span class="badge badge-secondary">مؤرشفة</span>'
        };

        const priorityBadges = {
            low: '<span class="badge">منخفض</span>',
            normal: '<span class="badge badge-secondary">عادي</span>',
            high: '<span class="badge badge-warning">عالي</span>',
            urgent: '<span class="badge badge-danger">عاجل</span>'
        };

        const date = new Date(message.created_at).toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const time = new Date(message.created_at).toLocaleTimeString('ar-SA', {
            hour: '2-digit',
            minute: '2-digit'
        });

        const messagePreview = message.message.length > 100 
            ? this.escapeHtml(message.message.substring(0, 100)) + '...' 
            : this.escapeHtml(message.message);

        return `
            <div class="application-card ${message.status === 'new' ? 'new-message' : ''}">
                <div class="application-card-header">
                    <div class="applicant-info">
                        <div class="applicant-avatar">
                            <i class="fa-solid fa-envelope"></i>
                        </div>
                        <div class="applicant-details">
                            <h3 class="applicant-name">${this.escapeHtml(message.name)}</h3>
                            <div>
                                ${statusBadges[message.status] || statusBadges.new}
                                ${priorityBadges[message.priority] || priorityBadges.normal}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="application-card-body">
                    <div class="application-info-grid">
                        <div class="info-item">
                            <i class="fa-solid fa-at"></i>
                            <div class="info-content">
                                <span class="info-label">البريد الإلكتروني</span>
                                <span class="info-value">${this.escapeHtml(message.email)}</span>
                            </div>
                        </div>
                        
                        <div class="info-item">
                            <i class="fa-solid fa-calendar"></i>
                            <div class="info-content">
                                <span class="info-label">تاريخ الإرسال</span>
                                <span class="info-value">${date} - ${time}</span>
                            </div>
                        </div>
                        
                        <div class="info-item full-width">
                            <i class="fa-solid fa-tag"></i>
                            <div class="info-content">
                                <span class="info-label">الموضوع</span>
                                <span class="info-value">${message.subject ? this.escapeHtml(message.subject) : 'بدون موضوع'}</span>
                            </div>
                        </div>
                        
                        <div class="info-item full-width">
                            <i class="fa-solid fa-message"></i>
                            <div class="info-content">
                                <span class="info-label">محتوى الرسالة</span>
                                <span class="info-value">${messagePreview}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="application-card-footer">
                    <button class="btn btn--primary btn--sm btn-view-details" data-message-id="${message.id}">
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
                        <p><strong>البريد الإلكتروني:</strong> ${this.escapeHtml(message.email)}</p>
                        <p><strong>الموضوع:</strong> ${message.subject ? this.escapeHtml(message.subject) : 'بدون موضوع'}</p>
                        <p><strong>التاريخ:</strong> ${new Date(message.created_at).toLocaleString('ar-SA')}</p>
                        <hr>
                        <p><strong>الرسالة:</strong></p>
                        <p class="message-content">${this.escapeHtml(message.message)}</p>
                    </div>
                `,
                icon: 'info',
                showCancelButton: true,
                confirmButtonText: 'تعليم كمقروءة',
                cancelButtonText: 'إغلاق',
                width: '600px'
            });

            if (result.isConfirmed && message.status === 'new') {
                await this.markAsRead(messageId);
            }
        } else {
            alert(`رسالة من: ${message.name}\nالبريد: ${message.email}\n\n${message.message}`);
            if (message.status === 'new') {
                await this.markAsRead(messageId);
            }
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
