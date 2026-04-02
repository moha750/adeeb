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

    // التحقق من صلاحيات القيادة - باستخدام نظام الصلاحيات الجديد
    function isLeaderOrDeputy() {
        // استخدام نظام الصلاحيات الجديد إن وجد
        if (window.PermissionsHelper) {
            return window.PermissionsHelper.hasAnyPermission(['manage_news', 'publish_news', 'instant_publish']);
        }
        // fallback للنظام القديم
        if (!currentUserRole) return false;
        return ['club_president', 'president_advisor', 'committee_leader', 'committee_deputy'].includes(currentUserRole.role_name);
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

            // بناء HTML للنموذج - نظام جديد يسمح بتحديد حقول لكل كاتب
            const fieldsOptions = `
                <div class="writer-fields-options">
                    <label class="writer-field-label field-label" data-field="title">
                        <input type="checkbox" class="writer-field writer-field-checkbox" value="title" onchange="window.NewsWorkflowManager.handleFieldSelection(this)">
                        <span>العنوان</span>
                    </label>
                    <label class="writer-field-label field-label" data-field="content">
                        <input type="checkbox" class="writer-field writer-field-checkbox" value="content" onchange="window.NewsWorkflowManager.handleFieldSelection(this)">
                        <span>المحتوى</span>
                    </label>
                    <label class="writer-field-label field-label" data-field="summary">
                        <input type="checkbox" class="writer-field writer-field-checkbox" value="summary" onchange="window.NewsWorkflowManager.handleFieldSelection(this)">
                        <span>الملخص</span>
                    </label>
                    <label class="writer-field-label field-label" data-field="image_url">
                        <input type="checkbox" class="writer-field writer-field-checkbox" value="image_url" onchange="window.NewsWorkflowManager.handleFieldSelection(this)">
                        <span>صورة الغلاف</span>
                    </label>
                    <label class="writer-field-label writer-field-label--full field-label" data-field="gallery_images">
                        <input type="checkbox" class="writer-field writer-field-checkbox" value="gallery_images" onchange="window.NewsWorkflowManager.handleFieldSelection(this)">
                        <span>معرض الصور (2-4 صور)</span>
                    </label>
                </div>
            `;

            const membersHTML = uniqueMembers.map(member => `
                <div class="writer-assignment-card" data-writer-id="${member.id}">
                    <label class="writer-assignment-label">
                        <input type="checkbox" name="writers" value="${member.id}" class="writer-checkbox" onchange="this.closest('.writer-assignment-card').querySelector('.writer-fields-container').classList.toggle('writer-fields-container--visible', this.checked); this.closest('.writer-assignment-card').classList.toggle('writer-assignment-card--selected', this.checked);">
                        <img src="${member.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(member.full_name)}" class="writer-avatar">
                        <div class="writer-info">
                            <div class="writer-name">${member.full_name}</div>
                            <div class="writer-email">${member.email}</div>
                        </div>
                    </label>
                    <div class="writer-fields-container">
                        <p class="writer-fields-title">الحقول المكلف بها:</p>
                        ${fieldsOptions}
                        <div class="writer-instructions-group">
                            <label class="writer-instructions-label">تعليمات خاصة لهذا الكاتب:</label>
                            <textarea class="writer-instructions writer-instructions-textarea" rows="2" placeholder="أضف تعليمات مخصصة لهذا الكاتب..."></textarea>
                        </div>
                    </div>
                </div>
            `).join('');

            const modalHTML = `
                <div class="modal-content-rtl">
                    <div class="news-info-box">
                        <h4 class="news-info-title">📰 ${news.title}</h4>
                        <p class="news-info-subtitle">
                            <i class="fa-solid fa-sitemap"></i> ${news.committees?.committee_name_ar || 'غير محدد'}
                        </p>
                    </div>

                    <div class="form-section">
                        <label class="form-section-label">
                            <i class="fa-solid fa-users"></i>
                            اختر الكتّاب وحدد الحقول لكل كاتب *
                        </label>
                        <p class="form-section-hint">
                            <i class="fa-solid fa-info-circle"></i>
                            اختر الكاتب ثم حدد الحقول التي سيكون مسؤولاً عنها
                        </p>
                        <div class="form-section-scroll">
                            ${membersHTML}
                        </div>
                    </div>

                    <div class="info-box info-box--success">
                        <p class="info-box__text">
                            <i class="fa-solid fa-info-circle"></i>
                            يمكنك إضافة تعليمات مخصصة لكل كاتب في الحقل الخاص به أعلاه
                        </p>
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
                        class: 'btn-outline'
                    },
                    {
                        text: 'تعيين الكتّاب',
                        class: 'btn-primary',
                        callback: async () => {
                            const modalElement = document.querySelector('.modal.active');
                            
                            // جمع بيانات الكتّاب المختارين مع حقولهم
                            const writerCards = modalElement.querySelectorAll('.writer-assignment-card');
                            const writersWithFields = [];
                            let allSelectedFields = new Set();

                            writerCards.forEach(card => {
                                const checkbox = card.querySelector('input[name="writers"]');
                                if (checkbox && checkbox.checked) {
                                    const writerId = checkbox.value;
                                    const writerFields = Array.from(card.querySelectorAll('.writer-field:checked'))
                                        .map(cb => cb.value);
                                    const writerInstructions = card.querySelector('.writer-instructions')?.value || '';
                                    
                                    if (writerFields.length > 0) {
                                        writersWithFields.push({
                                            writerId: writerId,
                                            fields: writerFields,
                                            instructions: writerInstructions.trim()
                                        });
                                        writerFields.forEach(f => allSelectedFields.add(f));
                                    }
                                }
                            });

                            if (writersWithFields.length === 0) {
                                Toast.warning('يرجى اختيار كاتب واحد على الأقل');
                                return;
                            }

                            // التحقق من أن كل كاتب لديه حقل واحد على الأقل
                            const writersWithoutFields = writersWithFields.filter(w => w.fields.length === 0);
                            if (writersWithoutFields.length > 0) {
                                Toast.warning('يرجى تحديد حقل واحد على الأقل لكل كاتب');
                                return;
                            }

                            const savingToast = Toast.loading('جاري تعيين الكتّاب...');

                            try {
                                const selectedWriterIds = writersWithFields.map(w => w.writerId);
                                
                                // تحديث حالة الخبر
                                const { error: updateError } = await sb
                                    .from('news')
                                    .update({
                                        workflow_status: 'assigned',
                                        assigned_writers: selectedWriterIds,
                                        assigned_by: currentUser.id,
                                        assigned_at: new Date().toISOString(),
                                        available_fields: { 
                                            fields: Array.from(allSelectedFields),
                                            writers_fields: writersWithFields.reduce((acc, w) => {
                                                acc[w.writerId] = w.fields;
                                                return acc;
                                            }, {})
                                        }
                                    })
                                    .eq('id', newsId);

                                if (updateError) throw updateError;

                                // إنشاء سجلات التعيين مع الحقول الخاصة بكل كاتب
                                const assignments = writersWithFields.map(writer => ({
                                    news_id: newsId,
                                    writer_id: writer.writerId,
                                    assigned_by: currentUser.id,
                                    status: 'pending',
                                    assignment_notes: writer.instructions || null,
                                    assigned_fields: writer.fields
                                }));

                                const { error: assignError } = await sb
                                    .from('news_writer_assignments')
                                    .insert(assignments);

                                if (assignError) throw assignError;

                                // إنشاء صلاحيات الحقول لكل الحقول المختارة
                                const allFieldsArray = Array.from(allSelectedFields);
                                const fieldPermissions = allFieldsArray.map(field => ({
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
                                    writers_count: selectedWriterIds.length,
                                    fields: allFieldsArray,
                                    writers_fields: writersWithFields
                                });

                                // إرسال إشعارات للكتّاب
                                await sendWriterNotifications(newsId, selectedWriterIds, news.title);

                                Toast.close(savingToast);
                                Toast.success(`تم تعيين ${selectedWriterIds.length} كاتب للخبر`);

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
            // بناء HTML مخصص لنموذج النشر مع خيار النشر الفوري/الجدولة
            const publishModalHTML = `
                <div class="modal-content-rtl">
                    <div class="form-section">
                        <label class="publish-option">
                            <input type="checkbox" name="isFeatured" class="publish-option__checkbox">
                            <span class="publish-option__label">⭐ خبر مميز</span>
                        </label>
                    </div>

                    <div class="form-section">
                        <label class="form-section-label">نوع النشر *</label>
                        <div class="publish-type-options">
                            <label class="publish-type-option publish-type-option--selected" id="publishNowLabel">
                                <input type="radio" name="publishType" value="now" checked class="publish-option__checkbox" onchange="document.getElementById('scheduleDateContainer').classList.remove('schedule-fields--visible');">
                                <div>
                                    <div class="publish-option__label">🚀 نشر فوري</div>
                                    <div class="form-section-hint">ينشر الخبر الآن مباشرة</div>
                                </div>
                            </label>
                            <label class="publish-type-option" id="scheduleLabel">
                                <input type="radio" name="publishType" value="schedule" class="publish-option__checkbox" onchange="document.getElementById('scheduleDateContainer').classList.add('schedule-fields--visible');">
                                <div>
                                    <div class="publish-option__label">📅 جدولة النشر</div>
                                    <div class="form-section-hint">حدد تاريخ ووقت النشر</div>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div id="scheduleDateContainer" class="schedule-fields">
                        <label class="form-section-label">تاريخ ووقت النشر المجدول</label>
                        <input type="datetime-local" name="scheduleDate" class="form-input">
                    </div>
                </div>
            `;

            try {
                const modal = await ModalHelper.show({
                    title: '🚀 نشر الخبر',
                    html: publishModalHTML,
                    size: 'md',
                    showClose: true,
                    showFooter: true,
                    footerButtons: [
                        {
                            text: 'إلغاء',
                            class: 'btn-outline'
                        },
                        {
                            text: 'نشر الخبر',
                            class: 'btn-primary',
                            callback: async () => {
                                const modalElement = document.querySelector('.modal.active');
                                const isFeatured = modalElement.querySelector('input[name="isFeatured"]').checked;
                                const publishType = modalElement.querySelector('input[name="publishType"]:checked').value;
                                const scheduleDate = modalElement.querySelector('input[name="scheduleDate"]').value;

                                // التحقق من تاريخ الجدولة إذا كان مجدول
                                if (publishType === 'schedule' && !scheduleDate) {
                                    Toast.warning('يرجى تحديد تاريخ ووقت النشر المجدول');
                                    return;
                                }

                                const loadingToast = Toast.loading('جاري النشر...');

                                try {
                                    const publishDate = publishType === 'now' 
                                        ? new Date().toISOString() 
                                        : new Date(scheduleDate).toISOString();

                                    const { error } = await sb
                                        .from('news')
                                        .update({
                                            workflow_status: 'published',
                                            status: 'published',
                                            is_featured: isFeatured,
                                            published_at: publishDate,
                                            reviewed_by: currentUser.id,
                                            reviewed_at: new Date().toISOString(),
                                            author_name: authorNames[0],
                                            authors: authorNames
                                        })
                                        .eq('id', newsId);

                                    if (error) throw error;

                                    await logActivity(newsId, 'published', {
                                        is_featured: isFeatured,
                                        publish_type: publishType,
                                        scheduled_for: publishType === 'schedule' ? publishDate : null
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

                                    if (modal && modal.close) {
                                        modal.close();
                                    }
                                } catch (error) {
                                    Toast.close(loadingToast);
                                    Toast.error('حدث خطأ في النشر');
                                    console.error('Error publishing:', error);
                                }
                            },
                            keepOpen: true
                        }
                    ]
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

    // تعديل تعيين الكتّاب (للأخبار قيد الكتابة)
    async function editWritersAssignment(newsId) {
        if (!isLeaderOrDeputy()) {
            Toast.error('غير مصرح لك بتعديل تعيين الكتّاب');
            return;
        }

        const loadingToast = Toast.loading('جاري تحميل البيانات...');

        try {
            // الحصول على الخبر مع التعيينات الحالية
            const { data: news, error: newsError } = await sb
                .from('news')
                .select('*, committees(committee_name_ar)')
                .eq('id', newsId)
                .single();

            if (newsError) throw newsError;

            // الحصول على التعيينات الحالية
            const { data: currentAssignments, error: assignError } = await sb
                .from('news_writer_assignments')
                .select('*, profiles:writer_id(id, full_name, email, avatar_url)')
                .eq('news_id', newsId);

            if (assignError) throw assignError;

            // الحصول على أعضاء اللجنة
            const { data: members, error: membersError } = await sb
                .from('user_roles')
                .select(`
                    user_id,
                    roles!user_roles_role_id_fkey(role_name),
                    profiles!user_roles_user_id_fkey(id, full_name, avatar_url, email)
                `)
                .eq('committee_id', news.committee_id)
                .eq('is_active', true);

            if (membersError) throw membersError;

            // تصفية الأعضاء المتاحين
            let filteredMembers = members.filter(m => {
                const memberRole = m.roles?.role_name;
                if (m.profiles.id === currentUser.id) return false;
                if (memberRole === 'committee_leader') return false;
                return true;
            });

            const uniqueMembers = Array.from(
                new Map(filteredMembers.map(m => [m.profiles.id, m.profiles])).values()
            );

            // بناء خريطة التعيينات الحالية
            const currentAssignmentsMap = {};
            currentAssignments.forEach(a => {
                currentAssignmentsMap[a.writer_id] = a.assigned_fields || [];
            });

            Toast.close(loadingToast);

            // بناء HTML للنموذج
            const fieldsOptions = (writerId, currentFields = []) => `
                <div class="writer-fields-options">
                    <label class="writer-field-label">
                        <input type="checkbox" class="writer-field writer-field-checkbox" value="title" ${currentFields.includes('title') ? 'checked' : ''}>
                        <span>العنوان</span>
                    </label>
                    <label class="writer-field-label">
                        <input type="checkbox" class="writer-field writer-field-checkbox" value="content" ${currentFields.includes('content') ? 'checked' : ''}>
                        <span>المحتوى</span>
                    </label>
                    <label class="writer-field-label">
                        <input type="checkbox" class="writer-field writer-field-checkbox" value="summary" ${currentFields.includes('summary') ? 'checked' : ''}>
                        <span>الملخص</span>
                    </label>
                    <label class="writer-field-label">
                        <input type="checkbox" class="writer-field writer-field-checkbox" value="image_url" ${currentFields.includes('image_url') ? 'checked' : ''}>
                        <span>صورة الغلاف</span>
                    </label>
                    <label class="writer-field-label writer-field-label--full">
                        <input type="checkbox" class="writer-field writer-field-checkbox" value="gallery_images" ${currentFields.includes('gallery_images') ? 'checked' : ''}>
                        <span>معرض الصور (2-4 صور)</span>
                    </label>
                </div>
            `;

            const membersHTML = uniqueMembers.map(member => {
                const isAssigned = currentAssignmentsMap.hasOwnProperty(member.id);
                const currentFields = currentAssignmentsMap[member.id] || [];
                
                return `
                <div class="writer-assignment-card ${isAssigned ? 'writer-assignment-card--selected' : ''}" data-writer-id="${member.id}">
                    <label class="writer-assignment-label">
                        <input type="checkbox" name="writers" value="${member.id}" ${isAssigned ? 'checked' : ''} class="writer-checkbox" onchange="this.closest('.writer-assignment-card').querySelector('.writer-fields-container').classList.toggle('writer-fields-container--visible', this.checked); this.closest('.writer-assignment-card').classList.toggle('writer-assignment-card--selected', this.checked);">
                        <img src="${member.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(member.full_name)}" class="writer-avatar">
                        <div class="writer-info">
                            <div class="writer-name">${member.full_name}</div>
                            <div class="writer-email">${member.email}</div>
                        </div>
                    </label>
                    <div class="writer-fields-container ${isAssigned ? 'writer-fields-container--visible' : ''}">
                        <p class="writer-fields-title">الحقول المكلف بها:</p>
                        ${fieldsOptions(member.id, currentFields)}
                    </div>
                </div>
            `}).join('');

            const modalHTML = `
                <div class="modal-content-rtl">
                    <div class="info-box info-box--warning">
                        <h4 class="news-info-title">✏️ تعديل تعيين الكتّاب</h4>
                        <p class="news-info-subtitle">
                            <strong>${news.title}</strong>
                        </p>
                    </div>

                    <div class="form-section">
                        <label class="form-section-label">
                            <i class="fa-solid fa-users"></i>
                            الكتّاب وحقولهم
                        </label>
                        <div class="form-section-scroll">
                            ${membersHTML}
                        </div>
                    </div>
                </div>
            `;

            const modal = await ModalHelper.show({
                title: '✏️ تعديل تعيين الكتّاب',
                html: modalHTML,
                size: 'lg',
                showClose: true,
                showFooter: true,
                footerButtons: [
                    {
                        text: 'إلغاء',
                        class: 'btn-outline'
                    },
                    {
                        text: 'حفظ التعديلات',
                        class: 'btn-primary',
                        callback: async () => {
                            const modalElement = document.querySelector('.modal.active');
                            
                            const writerCards = modalElement.querySelectorAll('.writer-assignment-card');
                            const writersWithFields = [];
                            let allSelectedFields = new Set();

                            writerCards.forEach(card => {
                                const checkbox = card.querySelector('input[name="writers"]');
                                if (checkbox && checkbox.checked) {
                                    const writerId = checkbox.value;
                                    const writerFields = Array.from(card.querySelectorAll('.writer-field:checked'))
                                        .map(cb => cb.value);
                                    
                                    if (writerFields.length > 0) {
                                        writersWithFields.push({
                                            writerId: writerId,
                                            fields: writerFields
                                        });
                                        writerFields.forEach(f => allSelectedFields.add(f));
                                    }
                                }
                            });

                            if (writersWithFields.length === 0) {
                                Toast.warning('يرجى اختيار كاتب واحد على الأقل مع تحديد حقوله');
                                return;
                            }

                            const savingToast = Toast.loading('جاري حفظ التعديلات...');

                            try {
                                const selectedWriterIds = writersWithFields.map(w => w.writerId);
                                
                                // حذف التعيينات القديمة
                                await sb
                                    .from('news_writer_assignments')
                                    .delete()
                                    .eq('news_id', newsId);

                                // حذف صلاحيات الحقول القديمة
                                await sb
                                    .from('news_field_permissions')
                                    .delete()
                                    .eq('news_id', newsId);

                                // تحديث الخبر
                                await sb
                                    .from('news')
                                    .update({
                                        assigned_writers: selectedWriterIds,
                                        available_fields: { 
                                            fields: Array.from(allSelectedFields),
                                            writers_fields: writersWithFields.reduce((acc, w) => {
                                                acc[w.writerId] = w.fields;
                                                return acc;
                                            }, {})
                                        }
                                    })
                                    .eq('id', newsId);

                                // إنشاء التعيينات الجديدة
                                const assignments = writersWithFields.map(writer => ({
                                    news_id: newsId,
                                    writer_id: writer.writerId,
                                    assigned_by: currentUser.id,
                                    status: 'pending',
                                    assigned_fields: writer.fields
                                }));

                                await sb
                                    .from('news_writer_assignments')
                                    .insert(assignments);

                                // إنشاء صلاحيات الحقول الجديدة
                                const allFieldsArray = Array.from(allSelectedFields);
                                const fieldPermissions = allFieldsArray.map(field => ({
                                    news_id: newsId,
                                    field_name: field,
                                    is_editable: true,
                                    is_required: ['content', 'summary'].includes(field)
                                }));

                                await sb
                                    .from('news_field_permissions')
                                    .insert(fieldPermissions);

                                await logActivity(newsId, 'writers_assignment_updated', {
                                    writers_count: selectedWriterIds.length,
                                    writers_fields: writersWithFields
                                });

                                Toast.close(savingToast);
                                Toast.success('تم تحديث تعيين الكتّاب بنجاح');

                                if (window.NewsManagerEnhanced) {
                                    await window.NewsManagerEnhanced.loadAllNews();
                                }

                                if (modal && modal.close) {
                                    modal.close();
                                }
                            } catch (error) {
                                Toast.close(savingToast);
                                Toast.error('حدث خطأ في حفظ التعديلات');
                                console.error('Error updating writers assignment:', error);
                            }
                        },
                        keepOpen: true
                    }
                ]
            });

        } catch (error) {
            Toast.close(loadingToast);
            Toast.error('حدث خطأ في تحميل البيانات');
            console.error('Error in editWritersAssignment:', error);
        }
    }

    // معالجة اختيار الحقول - منع تحديد نفس الحقل لكاتبين مختلفين
    function handleFieldSelection(checkbox) {
        const fieldValue = checkbox.value;
        const currentCard = checkbox.closest('.writer-assignment-card');
        const currentWriterId = currentCard.dataset.writerId;
        const isChecked = checkbox.checked;

        if (isChecked) {
            // البحث عن جميع الكتّاب الآخرين الذين لديهم نفس الحقل محدد
            const allCards = document.querySelectorAll('.writer-assignment-card');
            allCards.forEach(card => {
                if (card.dataset.writerId !== currentWriterId) {
                    const writerCheckbox = card.querySelector('input[name="writers"]');
                    if (writerCheckbox && writerCheckbox.checked) {
                        const sameFieldCheckbox = card.querySelector(`.writer-field[value="${fieldValue}"]`);
                        if (sameFieldCheckbox && sameFieldCheckbox.checked) {
                            // إلغاء تحديد الحقل من الكاتب الآخر
                            sameFieldCheckbox.checked = false;
                            // إظهار تنبيه
                            Toast.info(`تم إلغاء تحديد "${getFieldLabel(fieldValue)}" من الكاتب الآخر لتجنب التضارب`);
                        }
                    }
                }
            });
        }
    }

    // الحصول على تسمية الحقل
    function getFieldLabel(field) {
        const labels = {
            'title': 'العنوان',
            'content': 'المحتوى',
            'summary': 'الملخص',
            'image_url': 'صورة الغلاف',
            'gallery_images': 'معرض الصور'
        };
        return labels[field] || field;
    }

    return {
        init,
        createNewsDraft,
        assignWriters,
        editWritersAssignment,
        submitForReview,
        reviewAndPublish,
        isLeaderOrDeputy,
        logActivity,
        handleFieldSelection
    };
})();

