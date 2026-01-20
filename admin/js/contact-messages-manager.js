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
                <div style="text-align: center; padding: 3rem; color: #64748b;">
                    <i class="fa-solid fa-inbox" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                    <p>لا توجد رسائل</p>
                </div>
            `;
            return;
        }

        const table = `
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: #f8fafc; border-bottom: 2px solid #e5e7eb;">
                        <th style="padding: 1rem; text-align: right; font-weight: 600;">الاسم</th>
                        <th style="padding: 1rem; text-align: right; font-weight: 600;">البريد الإلكتروني</th>
                        <th style="padding: 1rem; text-align: right; font-weight: 600;">الموضوع</th>
                        <th style="padding: 1rem; text-align: center; font-weight: 600;">الحالة</th>
                        <th style="padding: 1rem; text-align: center; font-weight: 600;">الأولوية</th>
                        <th style="padding: 1rem; text-align: center; font-weight: 600;">التاريخ</th>
                        <th style="padding: 1rem; text-align: center; font-weight: 600;">الإجراءات</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredMessages.map(message => this.renderMessageRow(message)).join('')}
                </tbody>
            </table>
        `;

        container.innerHTML = table;
    }

    renderMessageRow(message) {
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

        const date = new Date(message.created_at).toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        return `
            <tr style="border-bottom: 1px solid #e5e7eb; ${message.status === 'new' ? 'background: #eff6ff;' : ''}" 
                data-message-id="${message.id}">
                <td style="padding: 1rem;">
                    <strong style="color: #274060;">${this.escapeHtml(message.name)}</strong>
                </td>
                <td style="padding: 1rem; color: #64748b;">
                    ${this.escapeHtml(message.email)}
                </td>
                <td style="padding: 1rem; color: #64748b;">
                    ${message.subject ? this.escapeHtml(message.subject) : '<em>بدون موضوع</em>'}
                </td>
                <td style="padding: 1rem; text-align: center;">
                    ${statusBadges[message.status] || statusBadges.new}
                </td>
                <td style="padding: 1rem; text-align: center;">
                    ${priorityBadges[message.priority] || priorityBadges.normal}
                </td>
                <td style="padding: 1rem; text-align: center; color: #64748b; font-size: 0.875rem;">
                    ${date}
                </td>
                <td style="padding: 1rem; text-align: center;">
                    <button class="btn-sm btn-primary" onclick="contactMessagesManager.viewMessage('${message.id}')" 
                        style="padding: 0.5rem 1rem; font-size: 0.875rem;">
                        <i class="fa-solid fa-eye"></i>
                        عرض
                    </button>
                </td>
            </tr>
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
