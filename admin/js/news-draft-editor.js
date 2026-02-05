/**
 * محرر المسودات - نظام تعديل شامل للمسودات
 * يتيح تعديل جميع خصائص المسودة بما في ذلك إدارة الكتّاب
 */

window.NewsDraftEditor = (function() {
    const sb = window.sbClient;
    let currentUser = null;
    let currentUserRole = null;

    async function init(user, role) {
        currentUser = user;
        currentUserRole = role;
    }

    // تعديل مسودة
    async function editDraft(newsId) {
        const loadingToast = Toast.loading('جاري تحميل البيانات...');

        try {
            // تحميل بيانات الخبر
            const { data: news, error: newsError } = await sb
                .from('news')
                .select(`
                    *,
                    committees(id, committee_name_ar),
                    news_writer_assignments(
                        id,
                        writer_id,
                        status,
                        profiles:writer_id(id, full_name, email, avatar_url)
                    )
                `)
                .eq('id', newsId)
                .single();

            if (newsError) throw newsError;

            // تحميل قائمة اللجان
            const { data: committees } = await sb
                .from('committees')
                .select('id, committee_name_ar')
                .eq('is_active', true)
                .order('committee_name_ar');

            Toast.close(loadingToast);

            // بناء HTML للنموذج
            const assignedWriters = news.news_writer_assignments || [];
            const writersHTML = assignedWriters.length > 0 ? `
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.75rem; font-weight: 600; color: #374151;">الكتّاب المعينون</label>
                    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                        ${assignedWriters.map(assignment => `
                            <div style="display: flex; align-items: center; gap: 0.75rem; padding: 0.875rem; background: #f9fafb; border-radius: 10px; border: 1px solid #e5e7eb;">
                                <img src="${assignment.profiles.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(assignment.profiles.full_name)}" 
                                     style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                                <div style="flex: 1; text-align: right;">
                                    <div style="font-weight: 600; color: #111827;">${assignment.profiles.full_name}</div>
                                    <div style="font-size: 0.875rem; color: #6b7280;">${assignment.profiles.email}</div>
                                </div>
                                <span style="padding: 0.25rem 0.75rem; background: ${getStatusColor(assignment.status)}; color: white; border-radius: 6px; font-size: 0.8125rem;">
                                    ${getStatusText(assignment.status)}
                                </span>
                                <button type="button" class="remove-writer-btn" data-assignment-id="${assignment.id}" data-writer-id="${assignment.writer_id}" 
                                        style="padding: 0.5rem; background: #fef2f2; color: #991b1b; border: none; border-radius: 6px; cursor: pointer; transition: all 0.2s;">
                                    <i class="fa-solid fa-times"></i>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : '<p style="color: #6b7280; font-size: 0.9375rem; margin-bottom: 1.5rem;">لم يتم تعيين كتّاب بعد</p>';

            const modalHTML = `
                <div style="text-align: right;">
                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; margin-bottom: 0.75rem; font-weight: 600; color: #374151;">عنوان الخبر *</label>
                        <input type="text" name="title" value="${escapeHtml(news.title)}" 
                               style="width: 100%; padding: 0.875rem; border: 2px solid #e5e7eb; border-radius: 10px; font-size: 0.9375rem;">
                    </div>

                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; margin-bottom: 0.75rem; font-weight: 600; color: #374151;">اللجنة المسؤولة *</label>
                        <select name="committee" style="width: 100%; padding: 0.875rem; border: 2px solid #e5e7eb; border-radius: 10px; font-size: 0.9375rem;">
                            <option value="">-- اختر اللجنة --</option>
                            ${committees?.map(c => `
                                <option value="${c.id}" ${c.id === news.committee_id ? 'selected' : ''}>
                                    ${c.committee_name_ar}
                                </option>
                            `).join('')}
                        </select>
                    </div>

                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; margin-bottom: 0.75rem; font-weight: 600; color: #374151;">التصنيف</label>
                        <select name="category" style="width: 100%; padding: 0.875rem; border: 2px solid #e5e7eb; border-radius: 10px; font-size: 0.9375rem;">
                            <option value="">-- اختر التصنيف --</option>
                            <option value="events" ${news.category === 'events' ? 'selected' : ''}>فعاليات</option>
                            <option value="achievements" ${news.category === 'achievements' ? 'selected' : ''}>إنجازات</option>
                            <option value="announcements" ${news.category === 'announcements' ? 'selected' : ''}>إعلانات</option>
                            <option value="workshops" ${news.category === 'workshops' ? 'selected' : ''}>ورش عمل</option>
                            <option value="meetings" ${news.category === 'meetings' ? 'selected' : ''}>اجتماعات</option>
                            <option value="general" ${news.category === 'general' ? 'selected' : ''}>عام</option>
                        </select>
                    </div>

                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; margin-bottom: 0.75rem; font-weight: 600; color: #374151;">الملخص</label>
                        <textarea name="summary" rows="3" 
                                  style="width: 100%; padding: 0.875rem; border: 2px solid #e5e7eb; border-radius: 10px; font-size: 0.9375rem; font-family: inherit; resize: vertical;">${escapeHtml(news.summary || '')}</textarea>
                    </div>

                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; margin-bottom: 0.75rem; font-weight: 600; color: #374151;">ملاحظات المراجعة</label>
                        <textarea name="notes" rows="2" 
                                  style="width: 100%; padding: 0.875rem; border: 2px solid #e5e7eb; border-radius: 10px; font-size: 0.9375rem; font-family: inherit; resize: vertical;">${escapeHtml(news.review_notes || '')}</textarea>
                    </div>

                    ${writersHTML}
                </div>
            `;

            const modal = await ModalHelper.show({
                title: '✏️ تعديل المسودة',
                html: modalHTML,
                size: 'lg',
                showClose: true,
                showFooter: true,
                footerButtons: [
                    {
                        text: 'إلغاء',
                        class: 'btn--outline btn--outline-secondary'
                    },
                    {
                        text: 'حفظ التعديلات',
                        class: 'btn--primary',
                        callback: async () => {
                            const modalElement = document.querySelector('.modal.active');
                            const title = modalElement.querySelector('input[name="title"]').value;
                            const committee = modalElement.querySelector('select[name="committee"]').value;
                            const category = modalElement.querySelector('select[name="category"]').value;
                            const summary = modalElement.querySelector('textarea[name="summary"]').value;
                            const notes = modalElement.querySelector('textarea[name="notes"]').value;

                            if (!title.trim()) {
                                Toast.warning('يرجى إدخال عنوان الخبر');
                                return;
                            }

                            if (!committee) {
                                Toast.warning('يرجى اختيار اللجنة المسؤولة');
                                return;
                            }

                            const savingToast = Toast.loading('جاري حفظ التعديلات...');

                            try {
                                const { error } = await sb
                                    .from('news')
                                    .update({
                                        title: title.trim(),
                                        committee_id: committee,
                                        category: category || null,
                                        summary: summary.trim() || null,
                                        review_notes: notes.trim() || null,
                                        updated_at: new Date().toISOString()
                                    })
                                    .eq('id', newsId);

                                if (error) throw error;

                                // تسجيل النشاط
                                await window.NewsWorkflowManager.logActivity(newsId, 'draft_updated', {
                                    updated_fields: ['title', 'committee_id', 'category', 'summary', 'review_notes']
                                });

                                Toast.close(savingToast);
                                Toast.success('تم حفظ التعديلات بنجاح');

                                // إعادة تحميل القائمة
                                if (window.NewsManagerEnhanced) {
                                    await window.NewsManagerEnhanced.loadAllNews();
                                }

                                if (modal && modal.close) {
                                    modal.close();
                                }
                            } catch (error) {
                                Toast.close(savingToast);
                                Toast.error('حدث خطأ في حفظ التعديلات');
                                console.error('Error updating draft:', error);
                            }
                        },
                        keepOpen: true
                    }
                ]
            });

            // إضافة مستمعي الأحداث لأزرار إزالة الكتّاب
            const modalElement = document.querySelector('.modal.active');
            if (modalElement) {
                modalElement.querySelectorAll('.remove-writer-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        e.preventDefault();
                        const assignmentId = btn.dataset.assignmentId;
                        const writerId = btn.dataset.writerId;
                        await removeWriter(newsId, assignmentId, writerId, btn);
                    });
                });
            }

        } catch (error) {
            Toast.close(loadingToast);
            Toast.error('حدث خطأ في تحميل البيانات');
            console.error('Error in editDraft:', error);
        }
    }

    // إزالة كاتب من المسودة
    async function removeWriter(newsId, assignmentId, writerId, buttonElement) {
        const confirmed = await ModalHelper.confirm({
            title: 'إزالة الكاتب',
            message: 'هل أنت متأكد من إزالة هذا الكاتب من المسودة؟',
            type: 'warning',
            confirmText: 'نعم، أزل',
            cancelText: 'إلغاء'
        });

        if (!confirmed) return;

        const loadingToast = Toast.loading('جاري الإزالة...');

        try {
            // حذف التعيين
            const { error: deleteError } = await sb
                .from('news_writer_assignments')
                .delete()
                .eq('id', assignmentId);

            if (deleteError) throw deleteError;

            // تحديث قائمة الكتّاب المعينين في الخبر
            const { data: news } = await sb
                .from('news')
                .select('assigned_writers')
                .eq('id', newsId)
                .single();

            if (news?.assigned_writers) {
                const updatedWriters = news.assigned_writers.filter(id => id !== writerId);
                
                await sb
                    .from('news')
                    .update({
                        assigned_writers: updatedWriters.length > 0 ? updatedWriters : null,
                        workflow_status: updatedWriters.length > 0 ? 'assigned' : 'draft'
                    })
                    .eq('id', newsId);
            }

            // تسجيل النشاط
            await window.NewsWorkflowManager.logActivity(newsId, 'writer_removed', {
                writer_id: writerId
            });

            Toast.close(loadingToast);
            Toast.success('تم إزالة الكاتب بنجاح');

            // إزالة العنصر من الواجهة
            buttonElement.closest('div[style*="display: flex"]').remove();

            // إعادة تحميل القائمة
            if (window.NewsManagerEnhanced) {
                await window.NewsManagerEnhanced.loadAllNews();
            }

        } catch (error) {
            Toast.close(loadingToast);
            Toast.error('حدث خطأ في إزالة الكاتب');
            console.error('Error removing writer:', error);
        }
    }

    // حذف مسودة
    async function deleteDraft(newsId) {
        const confirmed = await ModalHelper.confirm({
            title: 'حذف المسودة',
            message: 'هل أنت متأكد من حذف هذه المسودة؟ لا يمكن التراجع عن هذا الإجراء.',
            type: 'danger',
            confirmText: 'نعم، احذف',
            cancelText: 'إلغاء'
        });

        if (!confirmed) return;

        const loadingToast = Toast.loading('جاري الحذف...');

        try {
            // حذف التعيينات أولاً
            await sb
                .from('news_writer_assignments')
                .delete()
                .eq('news_id', newsId);

            // حذف صلاحيات الحقول
            await sb
                .from('news_field_permissions')
                .delete()
                .eq('news_id', newsId);

            // حذف سجل النشاط
            await sb
                .from('news_activity_log')
                .delete()
                .eq('news_id', newsId);

            // حذف الخبر
            const { error } = await sb
                .from('news')
                .delete()
                .eq('id', newsId);

            if (error) throw error;

            Toast.close(loadingToast);
            Toast.success('تم حذف المسودة بنجاح');

            // إعادة تحميل القائمة
            if (window.NewsManagerEnhanced) {
                await window.NewsManagerEnhanced.loadAllNews();
            }

        } catch (error) {
            Toast.close(loadingToast);
            Toast.error('حدث خطأ في حذف المسودة');
            console.error('Error deleting draft:', error);
        }
    }

    // دوال مساعدة
    function getStatusColor(status) {
        const colors = {
            'pending': '#f59e0b',
            'in_progress': '#3b82f6',
            'completed': '#10b981',
            'rejected': '#ef4444'
        };
        return colors[status] || '#6b7280';
    }

    function getStatusText(status) {
        const texts = {
            'pending': 'قيد الانتظار',
            'in_progress': 'قيد العمل',
            'completed': 'مكتمل',
            'rejected': 'مرفوض'
        };
        return texts[status] || status;
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    return {
        init,
        editDraft,
        deleteDraft,
        removeWriter
    };
})();
