/**
 * Contact Messages Manager
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
        this.init();
    }

    init() {
        this.attachEventListeners();
        this.loadMessages();
    }

    attachEventListeners() {
        const searchInput = document.getElementById('messageSearchInput');
        const statusFilter = document.getElementById('messageStatusFilter');
        const priorityFilter = document.getElementById('messagePriorityFilter');
        const refreshBtn = document.getElementById('refreshMessagesBtn');
        const saveBtn = document.getElementById('saveMessageBtn');
        const deleteBtn = document.getElementById('deleteMessageBtn');
        const closeBtn = document.getElementById('closeMessageDetailBtn');
        const closeModalBtn = document.getElementById('closeMessageDetailModal');

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

        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveMessage());
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.deleteMessage());
        }

        if (closeBtn || closeModalBtn) {
            [closeBtn, closeModalBtn].forEach(btn => {
                if (btn) btn.addEventListener('click', () => this.closeMessageModal());
            });
        }
    }

    async loadMessages() {
        try {
            const sb = window.sbClient;
            if (!sb) {
                console.error('Supabase client not initialized');
                return;
            }

            const { data, error } = await sb
                .from('contact_messages')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            this.messages = data || [];
            this.updateStats();
            this.renderMessages();
        } catch (error) {
            console.error('Error loading messages:', error);
            this.showNotification('حدث خطأ في تحميل الرسائل', 'error');
        }
    }

    updateStats() {
        const stats = {
            new: this.messages.filter(m => m.status === 'new').length,
            read: this.messages.filter(m => m.status === 'read').length,
            replied: this.messages.filter(m => m.status === 'replied').length,
            archived: this.messages.filter(m => m.status === 'archived').length
        };

        const newCount = document.getElementById('newMessagesCount');
        const readCount = document.getElementById('readMessagesCount');
        const repliedCount = document.getElementById('repliedMessagesCount');
        const archivedCount = document.getElementById('archivedMessagesCount');

        if (newCount) newCount.textContent = stats.new;
        if (readCount) readCount.textContent = stats.read;
        if (repliedCount) repliedCount.textContent = stats.replied;
        if (archivedCount) archivedCount.textContent = stats.archived;
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
        if (!container) return;

        const filteredMessages = this.filterMessages();

        if (filteredMessages.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-inbox"></i>
                    <p>لا توجد رسائل</p>
                </div>
            `;
            return;
        }

        const cardsHtml = `
            <div class="applications-cards-grid">
                ${filteredMessages.map(message => this.renderMessageCard(message)).join('')}
            </div>
        `;

        container.innerHTML = cardsHtml;
    }

    renderMessageCard(message) {
        const statusBadges = {
            new: '<span class="badge badge-info">جديدة</span>',
            read: '<span class="badge badge-success">مقروءة</span>',
            replied: '<span class="badge" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; box-shadow: 0 2px 6px rgba(139, 92, 246, 0.3);">تم الرد</span>',
            archived: '<span class="badge badge-secondary">مؤرشفة</span>'
        };

        const priorityBadges = {
            low: '<span class="badge" style="background: linear-gradient(135deg, #94a3b8, #64748b); color: white; box-shadow: 0 2px 6px rgba(148, 163, 184, 0.3);">منخفض</span>',
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
                            <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
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
                                <span class="info-value" style="color: #64748b; font-size: 0.9rem;">${messagePreview}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="application-card-footer">
                    <button class="btn-view-details" onclick="contactMessagesManager.viewMessage('${message.id}')">
                        <i class="fa-solid fa-eye"></i>
                        عرض التفاصيل الكاملة
                    </button>
                </div>
            </div>
        `;
    }

    async viewMessage(messageId) {
        const message = this.messages.find(m => m.id === messageId);
        if (!message) return;

        this.currentMessage = message;

        document.getElementById('messageDetailName').textContent = message.name;
        document.getElementById('messageDetailEmail').textContent = message.email;
        document.getElementById('messageDetailSubject').textContent = message.subject || 'بدون موضوع';
        document.getElementById('messageDetailMessage').textContent = message.message;
        
        const date = new Date(message.created_at).toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        document.getElementById('messageDetailDate').textContent = date;

        const statusBadges = {
            new: '<span class="badge" style="background: #3b82f6; color: white;">جديدة</span>',
            read: '<span class="badge" style="background: #10b981; color: white;">مقروءة</span>',
            replied: '<span class="badge" style="background: #8b5cf6; color: white;">تم الرد</span>',
            archived: '<span class="badge" style="background: #6b7280; color: white;">مؤرشفة</span>'
        };

        const priorityBadges = {
            low: '<span class="badge" style="background: #94a3b8; color: white;">منخفض</span>',
            normal: '<span class="badge" style="background: #64748b; color: white;">عادي</span>',
            high: '<span class="badge" style="background: #f59e0b; color: white;">عالي</span>',
            urgent: '<span class="badge" style="background: #ef4444; color: white;">عاجل</span>'
        };

        document.getElementById('messageDetailStatus').innerHTML = statusBadges[message.status];
        document.getElementById('messageDetailPriority').innerHTML = priorityBadges[message.priority];

        document.getElementById('messageDetailStatusSelect').value = message.status;
        document.getElementById('messageDetailPrioritySelect').value = message.priority;

        if (message.reply_message) {
            document.getElementById('messageReplySection').style.display = 'block';
            document.getElementById('messageDetailReply').textContent = message.reply_message;
            document.getElementById('messageDetailRepliedAt').textContent = new Date(message.replied_at).toLocaleDateString('ar-SA');
        } else {
            document.getElementById('messageReplySection').style.display = 'none';
        }

        if (message.notes) {
            document.getElementById('messageNotesSection').style.display = 'block';
            document.getElementById('messageDetailNotes').textContent = message.notes;
        } else {
            document.getElementById('messageNotesSection').style.display = 'none';
        }

        document.getElementById('messageReplyInput').value = message.reply_message || '';
        document.getElementById('messageNotesInput').value = message.notes || '';

        this.openMessageModal();

        if (message.status === 'new') {
            await this.markAsRead(messageId);
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
        } catch (error) {
            console.error('Error marking message as read:', error);
        }
    }

    async saveMessage() {
        if (!this.currentMessage) return;

        try {
            const sb = window.sbClient;
            const user = await sb.auth.getUser();

            const updates = {
                status: document.getElementById('messageDetailStatusSelect').value,
                priority: document.getElementById('messageDetailPrioritySelect').value,
                notes: document.getElementById('messageNotesInput').value || null
            };

            const replyInput = document.getElementById('messageReplyInput').value;
            if (replyInput && replyInput !== this.currentMessage.reply_message) {
                updates.reply_message = replyInput;
                updates.replied_by = user.data.user.id;
                updates.replied_at = new Date().toISOString();
                if (updates.status === 'new' || updates.status === 'read') {
                    updates.status = 'replied';
                }
            }

            const { error } = await sb
                .from('contact_messages')
                .update(updates)
                .eq('id', this.currentMessage.id);

            if (error) throw error;

            this.showNotification('تم حفظ التغييرات بنجاح', 'success');
            this.closeMessageModal();
            await this.loadMessages();
        } catch (error) {
            console.error('Error saving message:', error);
            this.showNotification('حدث خطأ في حفظ التغييرات', 'error');
        }
    }

    async deleteMessage() {
        if (!this.currentMessage) return;

        const confirmed = await this.showConfirmDialog(
            'هل أنت متأكد؟',
            'سيتم حذف هذه الرسالة نهائياً ولن يمكن استرجاعها'
        );

        if (!confirmed) return;

        try {
            const sb = window.sbClient;
            const { error } = await sb
                .from('contact_messages')
                .delete()
                .eq('id', this.currentMessage.id);

            if (error) throw error;

            this.showNotification('تم حذف الرسالة بنجاح', 'success');
            this.closeMessageModal();
            await this.loadMessages();
        } catch (error) {
            console.error('Error deleting message:', error);
            this.showNotification('حدث خطأ في حذف الرسالة', 'error');
        }
    }

    openMessageModal() {
        const modal = document.getElementById('messageDetailModal');
        const overlay = document.getElementById('overlay');
        if (modal) modal.classList.add('active');
        if (overlay) overlay.classList.add('active');
    }

    closeMessageModal() {
        const modal = document.getElementById('messageDetailModal');
        const overlay = document.getElementById('overlay');
        if (modal) modal.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
        this.currentMessage = null;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message, type = 'info') {
        if (window.Swal) {
            Swal.fire({
                text: message,
                icon: type,
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true
            });
        } else {
            alert(message);
        }
    }

    async showConfirmDialog(title, text) {
        if (window.Swal) {
            const result = await Swal.fire({
                title: title,
                text: text,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'نعم، احذف',
                cancelButtonText: 'إلغاء',
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#6b7280'
            });
            return result.isConfirmed;
        } else {
            return confirm(text);
        }
    }
}

window.contactMessagesManager = null;

document.addEventListener('DOMContentLoaded', () => {
    const contactSection = document.getElementById('contact-messages-section');
    if (contactSection) {
        window.contactMessagesManager = new ContactMessagesManager();
    }
});
