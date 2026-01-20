// =====================================================
// مدير النشرة البريدية
// Newsletter Manager
// =====================================================

class NewsletterManager {
    constructor() {
        this.subscribers = [];
        this.filteredSubscribers = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // زر التحديث
        const refreshBtn = document.getElementById('refreshSubscribersBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadSubscribers());
        }

        // زر التصدير
        const exportBtn = document.getElementById('exportSubscribersBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportSubscribers());
        }

        // البحث
        const searchInput = document.getElementById('subscriberSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.filterSubscribers());
        }

        // فلتر الحالة
        const statusFilter = document.getElementById('subscriberStatusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.filterSubscribers());
        }
    }

    async loadSubscribers() {
        try {
            const sb = window.sbClient;
            if (!sb) {
                console.error('Supabase client not initialized');
                return;
            }

            // جلب جميع المشتركين
            const { data, error } = await sb
                .from('newsletter_subscribers')
                .select('*')
                .order('subscribed_at', { ascending: false });

            if (error) throw error;

            this.subscribers = data || [];
            this.filteredSubscribers = [...this.subscribers];
            
            this.updateStats();
            this.renderSubscribers();
        } catch (error) {
            console.error('Error loading subscribers:', error);
            this.showError('حدث خطأ أثناء تحميل المشتركين');
        }
    }

    updateStats() {
        const total = this.subscribers.length;
        const active = this.subscribers.filter(s => s.status === 'active').length;
        const unsubscribed = this.subscribers.filter(s => s.status === 'unsubscribed').length;
        
        // اشتراكات هذا الشهر
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisMonth = this.subscribers.filter(s => 
            new Date(s.subscribed_at) >= firstDayOfMonth
        ).length;

        document.getElementById('totalSubscribersCount').textContent = total;
        document.getElementById('activeSubscribersCount').textContent = active;
        document.getElementById('unsubscribedCount').textContent = unsubscribed;
        document.getElementById('thisMonthSubscribersCount').textContent = thisMonth;
    }

    filterSubscribers() {
        const searchTerm = document.getElementById('subscriberSearchInput')?.value.toLowerCase() || '';
        const statusFilter = document.getElementById('subscriberStatusFilter')?.value || '';

        this.filteredSubscribers = this.subscribers.filter(subscriber => {
            const matchesSearch = subscriber.email.toLowerCase().includes(searchTerm);
            const matchesStatus = !statusFilter || subscriber.status === statusFilter;
            
            return matchesSearch && matchesStatus;
        });

        this.renderSubscribers();
    }

    renderSubscribers() {
        const container = document.getElementById('subscribersTable');
        if (!container) return;

        if (this.filteredSubscribers.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #64748b;">
                    <i class="fa-solid fa-inbox" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p>لا توجد اشتراكات</p>
                </div>
            `;
            return;
        }

        const table = `
            <table>
                <thead>
                    <tr>
                        <th>البريد الإلكتروني</th>
                        <th>الحالة</th>
                        <th>تاريخ الاشتراك</th>
                        <th>عدد الرسائل</th>
                        <th>آخر رسالة</th>
                        <th>الإجراءات</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.filteredSubscribers.map(subscriber => this.renderSubscriberRow(subscriber)).join('')}
                </tbody>
            </table>
        `;

        container.innerHTML = table;
        this.attachRowEventListeners();
    }

    renderSubscriberRow(subscriber) {
        const statusBadges = {
            active: '<span class="badge" style="background: #10b981; color: white;">نشط</span>',
            unsubscribed: '<span class="badge" style="background: #ef4444; color: white;">ألغى الاشتراك</span>',
            bounced: '<span class="badge" style="background: #f59e0b; color: white;">بريد غير صالح</span>'
        };

        const subscribedDate = new Date(subscriber.subscribed_at).toLocaleDateString('ar-SA');
        const lastEmailDate = subscriber.last_email_sent_at 
            ? new Date(subscriber.last_email_sent_at).toLocaleDateString('ar-SA')
            : '-';

        return `
            <tr data-id="${subscriber.id}">
                <td>${subscriber.email}</td>
                <td>${statusBadges[subscriber.status] || subscriber.status}</td>
                <td>${subscribedDate}</td>
                <td>${subscriber.email_count || 0}</td>
                <td>${lastEmailDate}</td>
                <td>
                    <div class="action-buttons">
                        ${subscriber.status === 'active' 
                            ? `<button class="btn-sm btn-warning unsubscribe-btn" data-id="${subscriber.id}">
                                <i class="fa-solid fa-user-xmark"></i>
                                إلغاء الاشتراك
                            </button>`
                            : `<button class="btn-sm btn-success resubscribe-btn" data-id="${subscriber.id}">
                                <i class="fa-solid fa-user-check"></i>
                                إعادة الاشتراك
                            </button>`
                        }
                        <button class="btn-sm btn-danger delete-subscriber-btn" data-id="${subscriber.id}">
                            <i class="fa-solid fa-trash"></i>
                            حذف
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    attachRowEventListeners() {
        // أزرار إلغاء الاشتراك
        document.querySelectorAll('.unsubscribe-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                this.updateSubscriberStatus(id, 'unsubscribed');
            });
        });

        // أزرار إعادة الاشتراك
        document.querySelectorAll('.resubscribe-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                this.updateSubscriberStatus(id, 'active');
            });
        });

        // أزرار الحذف
        document.querySelectorAll('.delete-subscriber-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                this.deleteSubscriber(id);
            });
        });
    }

    async updateSubscriberStatus(id, status) {
        try {
            const confirmed = await this.confirm(
                status === 'unsubscribed' 
                    ? 'هل أنت متأكد من إلغاء اشتراك هذا المستخدم؟'
                    : 'هل أنت متأكد من إعادة تفعيل اشتراك هذا المستخدم؟'
            );

            if (!confirmed) return;

            const sb = window.sbClient;
            if (!sb) return;

            const updateData = {
                status: status,
                updated_at: new Date().toISOString()
            };

            if (status === 'unsubscribed') {
                updateData.unsubscribed_at = new Date().toISOString();
            }

            const { error } = await sb
                .from('newsletter_subscribers')
                .update(updateData)
                .eq('id', id);

            if (error) throw error;

            this.showSuccess('تم تحديث حالة المشترك بنجاح');
            await this.loadSubscribers();
        } catch (error) {
            console.error('Error updating subscriber:', error);
            this.showError('حدث خطأ أثناء تحديث حالة المشترك');
        }
    }

    async deleteSubscriber(id) {
        try {
            const confirmed = await this.confirm('هل أنت متأكد من حذف هذا المشترك نهائياً؟ لا يمكن التراجع عن هذا الإجراء.');
            if (!confirmed) return;

            const sb = window.sbClient;
            if (!sb) return;

            const { error } = await sb
                .from('newsletter_subscribers')
                .delete()
                .eq('id', id);

            if (error) throw error;

            this.showSuccess('تم حذف المشترك بنجاح');
            await this.loadSubscribers();
        } catch (error) {
            console.error('Error deleting subscriber:', error);
            this.showError('حدث خطأ أثناء حذف المشترك');
        }
    }

    exportSubscribers() {
        if (this.filteredSubscribers.length === 0) {
            this.showError('لا توجد بيانات للتصدير');
            return;
        }

        // تحضير البيانات للتصدير
        const csvContent = this.convertToCSV(this.filteredSubscribers);
        
        // إنشاء ملف وتحميله
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `newsletter_subscribers_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.showSuccess('تم تصدير البيانات بنجاح');
    }

    convertToCSV(data) {
        const headers = ['البريد الإلكتروني', 'الحالة', 'تاريخ الاشتراك', 'عدد الرسائل', 'آخر رسالة'];
        const rows = data.map(subscriber => [
            subscriber.email,
            subscriber.status,
            new Date(subscriber.subscribed_at).toLocaleDateString('ar-SA'),
            subscriber.email_count || 0,
            subscriber.last_email_sent_at ? new Date(subscriber.last_email_sent_at).toLocaleDateString('ar-SA') : '-'
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        return '\uFEFF' + csvContent; // BOM for UTF-8
    }

    showSuccess(message) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success',
                title: 'نجح!',
                text: message,
                timer: 3000,
                showConfirmButton: false
            });
        } else {
            alert(message);
        }
    }

    showError(message) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'خطأ!',
                text: message
            });
        } else {
            alert(message);
        }
    }

    async confirm(text) {
        if (typeof Swal !== 'undefined') {
            const result = await Swal.fire({
                title: 'تأكيد',
                text: text,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'نعم',
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

window.newsletterManager = null;

document.addEventListener('DOMContentLoaded', () => {
    const newsletterSection = document.getElementById('newsletter-section');
    if (newsletterSection) {
        window.newsletterManager = new NewsletterManager();
    }
});
