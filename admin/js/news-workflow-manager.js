/**
 * نظام إدارة سير عمل الأخبار - نادي أدِيب (محدث بدون SweetAlert)
 * يدير workflow الأخبار من المسودة إلى النشر
 */

window.NewsWorkflowManager = (function() {
    const sb = window.sbClient;
    let currentUser = null;
    let currentUserRole = null;

    async function init(user, role) {
        currentUser = user;
        currentUserRole = role;
    }

    // التحقق من صلاحيات القيادة
    function isLeaderOrDeputy() {
        if (!currentUserRole) return false;
        return ['club_president', 'committee_leader', 'committee_deputy'].includes(currentUserRole.role_name);
    }

    // الحصول على لجنة المستخدم
    function getUserCommitteeId() {
        if (!currentUserRole) return null;
        if (['committee_leader', 'committee_deputy'].includes(currentUserRole.role_name)) {
            return currentUserRole.committee_id || null;
        }
        return null;
    }

    // معرف لجنة التقارير والأرشفة (الأخبار دائماً تابعة لها)
    const REPORTS_COMMITTEE_ID = 18;

    // إنشاء مسودة خبر جديد
    async function createNewsDraft() {
        if (!isLeaderOrDeputy()) {
            Toast.error('غير مصرح لك بإنشاء الأخبار');
            throw new Error('غير مصرح لك بإنشاء الأخبار');
        }

        // الأخبار دائماً تابعة للجنة التقارير والأرشفة
        const committeeId = REPORTS_COMMITTEE_ID;

        const fields = [
            {
                name: 'title',
                type: 'text',
                label: 'عنوان الخبر',
                placeholder: 'أدخل عنوان الخبر',
                required: true
            },
            {
                name: 'notes',
                type: 'textarea',
                label: 'ملاحظات أولية',
                placeholder: 'ملاحظات أو تعليمات للكتّاب...'
            }
        ];

        try {
            await ModalHelper.form({
                title: '📰 إنشاء مسودة خبر جديد',
                fields: fields,
                submitText: 'إنشاء المسودة',
                cancelText: 'إلغاء',
                onSubmit: async (formData) => {
                    const loadingToast = Toast.loading('جاري إنشاء المسودة...');

                    try {
                        const newsData = {
                            title: formData.title,
                            workflow_status: 'draft',
                            status: 'draft',
                            committee_id: committeeId,
                            created_by: currentUser.id,
                            review_notes: formData.notes || null,
                            content: '',
                            summary: ''
                        };

                        const { data, error } = await sb
                            .from('news')
                            .insert([newsData])
                            .select()
                            .single();

                        if (error) throw error;

                        // تسجيل النشاط
                        await logActivity(data.id, 'created', {
                            title: data.title,
                            category: data.category
                        });

                        Toast.close(loadingToast);
                        Toast.success('تم إنشاء مسودة الخبر بنجاح');

                        // إعادة تحميل القائمة
                        if (window.NewsManagerEnhanced) {
                            await window.NewsManagerEnhanced.loadAllNews();
                        }

                        return data;
                    } catch (error) {
                        Toast.close(loadingToast);
                        Toast.error('حدث خطأ في إنشاء المسودة');
                        console.error('Error creating news draft:', error);
                        throw error;
                    }
                }
            });
        } catch (error) {
            console.error('Error in createNewsDraft:', error);
        }

        return null;
    }

    // تعيين كتّاب للخبر
    async function assignWriters(newsId) {
        if (!isLeaderOrDeputy()) {
            Toast.error('غير مصرح لك بتعيين الكتّاب');
            throw new Error('غير مصرح لك بتعيين الكتّاب');
        }

        const loadingToast = Toast.loading('جاري تحميل البيانات...');

        try {
            // الحصول على الخبر
            const { data: news, error: newsError } = await sb
                .from('news')
                .select('*, committees(committee_name_ar)')
                .eq('id', newsId)
                .single();

            if (newsError) throw newsError;

            // الحصول على أعضاء اللجنة مع أدوارهم
            const { data: members, error: membersError } = await sb
                .from('user_roles')
                .select(`
                    user_id,
                    role_id,
                    roles!user_roles_role_id_fkey(role_name, role_level),
                    profiles!user_roles_user_id_fkey(id, full_name, avatar_url, email)
                `)
                .eq('committee_id', news.committee_id)
                .eq('is_active', true);

            if (membersError) throw membersError;

            // تصفية الأعضاء المتاحين للتعيين
            // - قائد اللجنة لا يُعيّن له خبر أبداً (يتم استبعاده دائماً)
            // - نائب اللجنة والأعضاء يمكن تعيينهم
            let filteredMembers = members.filter(m => {
                const memberRole = m.roles?.role_name;
                // استبعاد المستخدم الحالي من القائمة
                if (m.profiles.id === currentUser.id) return false;
                
                // استبعاد قائد اللجنة دائماً - لا يُعيّن له خبر
                if (memberRole === 'committee_leader') {
                    return false;
                }
                
                return true;
            });

            // إزالة التكرار
            const uniqueMembers = Array.from(
                new Map(filteredMembers.map(m => [m.profiles.id, m.profiles])).values()
            );

            Toast.close(loadingToast);

            // بناء HTML للنموذج
            const membersHTML = uniqueMembers.map(member => `
                <label style="display: flex; align-items: center; gap: 0.75rem; padding: 0.875rem; border: 2px solid #e5e7eb; border-radius: 10px; margin-bottom: 0.75rem; cursor: pointer; transition: all 0.2s;">
                    <input type="checkbox" name="writers" value="${member.id}" style="width: 18px; height: 18px; cursor: pointer;">
                    <img src="${member.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(member.full_name)}" 
                         style="width: 42px; height: 42px; border-radius: 50%; object-fit: cover; border: 2px solid #e5e7eb;">
                    <div style="flex: 1; text-align: right;">
                        <div style="font-weight: 600; color: #111827;">${member.full_name}</div>
                        <div style="font-size: 0.875rem; color: #6b7280;">${member.email}</div>
                    </div>
                </label>
            `).join('');

            const modalHTML = `
                <div style="text-align: right;">
                    <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 1.25rem; border-radius: 12px; margin-bottom: 1.5rem; border-right: 4px solid #3b82f6;">
                        <h4 style="margin: 0 0 0.5rem 0; font-size: 1.125rem; color: #1e40af;">📰 ${news.title}</h4>
                        <p style="margin: 0; font-size: 0.875rem; color: #6b7280;">
                            <i class="fa-solid fa-sitemap"></i> ${news.committees?.committee_name_ar || 'غير محدد'}
                        </p>
                    </div>

                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; margin-bottom: 0.875rem; font-weight: 600; color: #374151;">اختر الكتّاب *</label>
                        <div style="max-height: 320px; overflow-y: auto; padding: 0.5rem;">
                            ${membersHTML}
                        </div>
                    </div>

                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; margin-bottom: 0.875rem; font-weight: 600; color: #374151;">الحقول المتاحة للكتّاب *</label>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; padding: 1rem; background: #f9fafb; border-radius: 10px; border: 1px solid #e5e7eb;">
                            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                                <input type="checkbox" name="fields" value="title" style="width: 16px; height: 16px; cursor: pointer;">
                                <span style="font-size: 0.9375rem;">عنوان الخبر</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                                <input type="checkbox" name="fields" value="content" checked style="width: 16px; height: 16px; cursor: pointer;">
                                <span style="font-size: 0.9375rem;">المحتوى الرئيسي</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                                <input type="checkbox" name="fields" value="summary" checked style="width: 16px; height: 16px; cursor: pointer;">
                                <span style="font-size: 0.9375rem;">الملخص</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                                <input type="checkbox" name="fields" value="image_url" style="width: 16px; height: 16px; cursor: pointer;">
                                <span style="font-size: 0.9375rem;">صورة الغلاف</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                                <input type="checkbox" name="fields" value="gallery_images" style="width: 16px; height: 16px; cursor: pointer;">
                                <span style="font-size: 0.9375rem;">معرض الصور (2-4 صور)</span>
                            </label>
                        </div>
                    </div>

                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.75rem; font-weight: 600; color: #374151;">تعليمات للكتّاب</label>
                        <textarea name="notes" rows="3" placeholder="أضف تعليمات أو ملاحظات للكتّاب..." style="width: 100%; padding: 0.875rem; border: 2px solid #e5e7eb; border-radius: 10px; font-size: 0.9375rem; font-family: inherit; resize: vertical;"></textarea>
                    </div>
                </div>
            `;

            const modal = await ModalHelper.show({
                title: '👥 تعيين كتّاب للخبر',
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
                        text: 'تعيين الكتّاب',
                        class: 'btn--primary',
                        callback: async () => {
                            const modalElement = document.querySelector('.modal.active');
                            const selectedWriters = Array.from(modalElement.querySelectorAll('input[name="writers"]:checked'))
                                .map(cb => cb.value);
                            
                            const selectedFields = Array.from(modalElement.querySelectorAll('input[name="fields"]:checked'))
                                .map(cb => cb.value);

                            const notes = modalElement.querySelector('textarea[name="notes"]').value;

                            if (selectedWriters.length === 0) {
                                Toast.warning('يرجى اختيار كاتب واحد على الأقل');
                                return;
                            }

                            if (selectedFields.length === 0) {
                                Toast.warning('يرجى اختيار حقل واحد على الأقل');
                                return;
                            }

                            const savingToast = Toast.loading('جاري تعيين الكتّاب...');

                            try {
                                // تحديث حالة الخبر
                                const { error: updateError } = await sb
                                    .from('news')
                                    .update({
                                        workflow_status: 'assigned',
                                        assigned_writers: selectedWriters,
                                        assigned_by: currentUser.id,
                                        assigned_at: new Date().toISOString(),
                                        available_fields: { fields: selectedFields }
                                    })
                                    .eq('id', newsId);

                                if (updateError) throw updateError;

                                // إنشاء سجلات التعيين
                                const assignments = selectedWriters.map(writerId => ({
                                    news_id: newsId,
                                    writer_id: writerId,
                                    assigned_by: currentUser.id,
                                    status: 'pending',
                                    assignment_notes: notes || null
                                }));

                                const { error: assignError } = await sb
                                    .from('news_writer_assignments')
                                    .insert(assignments);

                                if (assignError) throw assignError;

                                // إنشاء صلاحيات الحقول
                                const fieldPermissions = selectedFields.map(field => ({
                                    news_id: newsId,
                                    field_name: field,
                                    is_editable: true,
                                    is_required: ['content', 'summary'].includes(field)
                                }));

                                const { error: permError } = await sb
                                    .from('news_field_permissions')
                                    .insert(fieldPermissions);

                                if (permError) throw permError;

                                // تسجيل النشاط
                                await logActivity(newsId, 'writers_assigned', {
                                    writers_count: selectedWriters.length,
                                    fields: selectedFields
                                });

                                // إرسال إشعارات للكتّاب
                                await sendWriterNotifications(newsId, selectedWriters, news.title);

                                Toast.close(savingToast);
                                Toast.success(`تم تعيين ${selectedWriters.length} كاتب للخبر`);

                                // إعادة تحميل القائمة
                                if (window.NewsManagerEnhanced) {
                                    await window.NewsManagerEnhanced.loadAllNews();
                                }

                                // إغلاق المودال
                                if (modal && modal.close) {
                                    modal.close();
                                }
                            } catch (error) {
                                Toast.close(savingToast);
                                Toast.error('حدث خطأ في تعيين الكتّاب');
                                console.error('Error assigning writers:', error);
                            }
                        },
                        keepOpen: true
                    }
                ]
            });

        } catch (error) {
            Toast.close(loadingToast);
            Toast.error('حدث خطأ في تحميل البيانات');
            console.error('Error in assignWriters:', error);
            throw error;
        }

        return false;
    }

    // إرسال إشعارات للكتّاب
    async function sendWriterNotifications(newsId, writerIds, newsTitle) {
        try {
            const notifications = writerIds.map(writerId => ({
                user_id: writerId,
                type: 'news_assignment',
                title: 'تم تعيينك لكتابة خبر جديد',
                message: `تم تعيينك لكتابة خبر: ${newsTitle}`,
                action_url: `/admin/dashboard.html#news-my-assignments`,
                metadata: { news_id: newsId },
                is_read: false
            }));

            await sb.from('notifications').insert(notifications);

            // تحديث حالة الإشعار في التعيينات
            await sb
                .from('news_writer_assignments')
                .update({ 
                    notified: true,
                    notification_sent_at: new Date().toISOString()
                })
                .eq('news_id', newsId)
                .in('writer_id', writerIds);

        } catch (error) {
            console.error('Error sending notifications:', error);
        }
    }

    // تسجيل نشاط
    async function logActivity(newsId, action, details = {}) {
        try {
            await sb.from('news_activity_log').insert({
                news_id: newsId,
                user_id: currentUser.id,
                action: action,
                details: details
            });
        } catch (error) {
            console.error('Error logging activity:', error);
        }
    }

    // تقديم الخبر للمراجعة (من قبل الكاتب)
    async function submitForReview(newsId, userId = null) {
        try {
            // استخدام userId المُمرر أو currentUser
            const writerId = userId || currentUser?.id;
            
            if (!writerId) {
                throw new Error('لم يتم تحديد معرف المستخدم');
            }

            // التحقق من أن الكاتب أكمل عمله
            const { data: assignment } = await sb
                .from('news_writer_assignments')
                .select('*')
                .eq('news_id', newsId)
                .eq('writer_id', writerId)
                .single();

            if (!assignment) {
                throw new Error('لم يتم العثور على التعيين');
            }

            // تحديث حالة التعيين
            const { error: assignError } = await sb
                .from('news_writer_assignments')
                .update({
                    status: 'completed',
                    completed_at: new Date().toISOString()
                })
                .eq('id', assignment.id);

            if (assignError) throw assignError;

            // التحقق من إكمال جميع الكتّاب
            const { data: allAssignments } = await sb
                .from('news_writer_assignments')
                .select('status')
                .eq('news_id', newsId);

            const allCompleted = allAssignments.every(a => a.status === 'completed');

            if (allCompleted) {
                // تحديث حالة الخبر
                await sb
                    .from('news')
                    .update({
                        workflow_status: 'ready_for_review',
                        submitted_at: new Date().toISOString()
                    })
                    .eq('id', newsId);

                // إشعار القائد
                const { data: news } = await sb
                    .from('news')
                    .select('title, assigned_by')
                    .eq('id', newsId)
                    .single();

                if (news?.assigned_by) {
                    await sb.from('notifications').insert({
                        user_id: news.assigned_by,
                        type: 'news_ready_for_review',
                        title: 'خبر جاهز للمراجعة',
                        message: `الخبر "${news.title}" جاهز للمراجعة`,
                        action_url: `/admin/dashboard.html#news-review`,
                        metadata: { news_id: newsId },
                        is_read: false
                    });
                }
            }

            await logActivity(newsId, 'submitted_for_review', {
                writer_id: writerId
            });

            return allCompleted;
        } catch (error) {
            console.error('Error submitting for review:', error);
            throw error;
        }
    }

    // مراجعة ونشر الخبر
    async function reviewAndPublish(newsId, action = 'publish') {
        if (!isLeaderOrDeputy()) {
            Toast.error('غير مصرح لك بمراجعة الأخبار');
            throw new Error('غير مصرح لك بمراجعة الأخبار');
        }

        const { data: news } = await sb
            .from('news')
            .select('*')
            .eq('id', newsId)
            .single();

        // جلب أسماء الكتّاب المعينين للخبر
        let authorNames = [];
        if (news.assigned_writers?.length > 0) {
            const { data: writers } = await sb
                .from('profiles')
                .select('full_name')
                .in('id', news.assigned_writers);
            
            if (writers && writers.length > 0) {
                authorNames = writers.map(w => w.full_name);
            }
        }
        
        // إذا لم يكن هناك كتّاب معينين، استخدم اسم المستخدم الحالي
        if (authorNames.length === 0) {
            authorNames = [currentUser.full_name];
        }

        if (action === 'publish') {
            const fields = [
                {
                    name: 'isFeatured',
                    type: 'checkbox',
                    checkboxLabel: '⭐ خبر مميز',
                    checked: false
                },
                {
                    name: 'publishDate',
                    type: 'datetime-local',
                    label: 'تاريخ النشر',
                    value: new Date().toISOString().slice(0, 16),
                    required: true
                },
                {
                    name: 'notes',
                    type: 'textarea',
                    label: 'ملاحظات النشر',
                    placeholder: 'ملاحظات اختيارية...'
                }
            ];

            try {
                await ModalHelper.form({
                    title: '🚀 نشر الخبر',
                    fields: fields,
                    submitText: 'نشر الآن',
                    cancelText: 'إلغاء',
                    onSubmit: async (formData) => {
                        const loadingToast = Toast.loading('جاري النشر...');

                        try {
                            const { error } = await sb
                                .from('news')
                                .update({
                                    workflow_status: 'published',
                                    status: 'published',
                                    is_featured: formData.isFeatured === 'on',
                                    published_at: new Date(formData.publishDate).toISOString(),
                                    reviewed_by: currentUser.id,
                                    reviewed_at: new Date().toISOString(),
                                    review_notes: formData.notes || null,
                                    author_name: authorNames[0],
                                    authors: authorNames
                                })
                                .eq('id', newsId);

                            if (error) throw error;

                            await logActivity(newsId, 'published', {
                                is_featured: formData.isFeatured === 'on'
                            });

                            // إشعار الكتّاب
                            if (news.assigned_writers?.length > 0) {
                                const notifications = news.assigned_writers.map(writerId => ({
                                    user_id: writerId,
                                    type: 'news_published',
                                    title: 'تم نشر الخبر',
                                    message: `تم نشر الخبر "${news.title}" الذي شاركت في كتابته`,
                                    action_url: `/news/news-detail.html?id=${newsId}`,
                                    metadata: { news_id: newsId },
                                    is_read: false
                                }));

                                await sb.from('notifications').insert(notifications);
                            }

                            Toast.close(loadingToast);
                            Toast.success('تم نشر الخبر بنجاح');

                            // إعادة تحميل القائمة
                            if (window.NewsManagerEnhanced) {
                                await window.NewsManagerEnhanced.loadAllNews();
                            }
                        } catch (error) {
                            Toast.close(loadingToast);
                            Toast.error('حدث خطأ في النشر');
                            console.error('Error publishing:', error);
                        }
                    }
                });
            } catch (error) {
                console.error('Error in publish modal:', error);
            }
        } else if (action === 'request_changes') {
            try {
                await Toast.prompt({
                    title: 'طلب تعديلات',
                    message: 'ما هي التعديلات المطلوبة؟',
                    placeholder: 'اكتب التعديلات المطلوبة...',
                    confirmText: 'إرسال',
                    cancelText: 'إلغاء',
                    onConfirm: async (notes) => {
                        if (!notes) {
                            Toast.warning('يرجى كتابة التعديلات المطلوبة');
                            return;
                        }

                        const loadingToast = Toast.loading('جاري الإرسال...');

                        try {
                            await sb
                                .from('news')
                                .update({
                                    workflow_status: 'in_progress',
                                    review_notes: notes
                                })
                                .eq('id', newsId);

                            // إعادة تعيين حالة الكتّاب
                            await sb
                                .from('news_writer_assignments')
                                .update({ status: 'in_progress' })
                                .eq('news_id', newsId);

                            await logActivity(newsId, 'changes_requested', { notes });

                            // إشعار الكتّاب
                            if (news.assigned_writers?.length > 0) {
                                const notifications = news.assigned_writers.map(writerId => ({
                                    user_id: writerId,
                                    type: 'news_changes_requested',
                                    title: 'طُلب تعديل الخبر',
                                    message: `طُلب منك تعديل الخبر "${news.title}"`,
                                    action_url: `/admin/dashboard.html#news-my-assignments`,
                                    metadata: { news_id: newsId, notes },
                                    is_read: false
                                }));

                                await sb.from('notifications').insert(notifications);
                            }

                            Toast.close(loadingToast);
                            Toast.success('تم إرسال طلب التعديلات');

                            // إعادة تحميل القائمة
                            if (window.NewsManagerEnhanced) {
                                await window.NewsManagerEnhanced.loadAllNews();
                            }
                        } catch (error) {
                            Toast.close(loadingToast);
                            Toast.error('حدث خطأ في إرسال الطلب');
                            console.error('Error requesting changes:', error);
                        }
                    }
                });
            } catch (error) {
                console.error('Error in request changes:', error);
            }
        }

        return false;
    }

    return {
        init,
        createNewsDraft,
        assignWriters,
        submitForReview,
        reviewAndPublish,
        isLeaderOrDeputy,
        logActivity
    };
})();
