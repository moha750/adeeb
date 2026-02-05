/**
 * نظام إدارة سير عمل الأخبار - نادي أدِيب
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

    // إنشاء مسودة خبر جديد
    async function createNewsDraft() {
        if (!isLeaderOrDeputy()) {
            throw new Error('غير مصرح لك بإنشاء الأخبار');
        }

        const committeeId = getUserCommitteeId();
        const isPresident = currentUserRole?.role_name === 'club_president';

        // الحصول على قائمة اللجان إذا كان رئيس النادي
        let committeesOptions = '';
        if (isPresident) {
            const { data: committees } = await sb
                .from('committees')
                .select('id, committee_name_ar')
                .eq('is_active', true)
                .order('committee_name_ar');
            
            committeesOptions = committees?.map(c => 
                `<option value="${c.id}">${c.committee_name_ar}</option>`
            ).join('') || '';
        }

        const { value: formValues } = await Swal.fire({
            title: '<i class="fa-solid fa-newspaper"></i> إنشاء مسودة خبر جديد',
            html: `
                <div style="text-align: right;">
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">عنوان الخبر *</label>
                        <input type="text" id="newsTitle" class="swal2-input" placeholder="عنوان الخبر" style="width: 100%; margin: 0;">
                    </div>
                    ${isPresident ? `
                        <div style="margin-bottom: 1rem;">
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">اللجنة المسؤولة *</label>
                            <select id="newsCommittee" class="swal2-select" style="width: 100%; margin: 0;">
                                <option value="">-- اختر اللجنة --</option>
                                ${committeesOptions}
                            </select>
                        </div>
                    ` : ''}
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">التصنيف</label>
                        <select id="newsCategory" class="swal2-select" style="width: 100%; margin: 0;">
                            <option value="">-- اختر التصنيف --</option>
                            <option value="events">فعاليات</option>
                            <option value="achievements">إنجازات</option>
                            <option value="announcements">إعلانات</option>
                            <option value="workshops">ورش عمل</option>
                            <option value="meetings">اجتماعات</option>
                            <option value="general">عام</option>
                        </select>
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">ملاحظات أولية</label>
                        <textarea id="newsNotes" class="swal2-textarea" rows="3" placeholder="ملاحظات أو تعليمات للكتّاب..." style="width: 100%; margin: 0;"></textarea>
                    </div>
                </div>
            `,
            width: '600px',
            showCancelButton: true,
            confirmButtonText: 'إنشاء المسودة',
            cancelButtonText: 'إلغاء',
            preConfirm: () => {
                const title = document.getElementById('newsTitle').value;
                const category = document.getElementById('newsCategory').value;
                const notes = document.getElementById('newsNotes').value;
                const selectedCommittee = isPresident ? document.getElementById('newsCommittee').value : committeeId;

                if (!title) {
                    Swal.showValidationMessage('يرجى إدخال عنوان الخبر');
                    return false;
                }

                if (isPresident && !selectedCommittee) {
                    Swal.showValidationMessage('يرجى اختيار اللجنة المسؤولة');
                    return false;
                }

                return { title, category, notes, committeeId: selectedCommittee };
            }
        });

        if (formValues) {
            try {
                const newsData = {
                    title: formValues.title,
                    category: formValues.category || null,
                    workflow_status: 'draft',
                    status: 'draft',
                    committee_id: formValues.committeeId,
                    created_by: currentUser.id,
                    review_notes: formValues.notes || null,
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

                await Swal.fire({
                    title: 'تم بنجاح',
                    text: 'تم إنشاء مسودة الخبر بنجاح',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });

                return data;
            } catch (error) {
                console.error('Error creating news draft:', error);
                throw error;
            }
        }

        return null;
    }

    // تعيين كتّاب للخبر
    async function assignWriters(newsId) {
        if (!isLeaderOrDeputy()) {
            throw new Error('غير مصرح لك بتعيين الكتّاب');
        }

        // الحصول على الخبر
        const { data: news, error: newsError } = await sb
            .from('news')
            .select('*, committees(committee_name_ar)')
            .eq('id', newsId)
            .single();

        if (newsError) throw newsError;

        // الحصول على أعضاء اللجنة
        const { data: members, error: membersError } = await sb
            .from('user_roles')
            .select(`
                user_id,
                profiles!user_roles_user_id_fkey(id, full_name, avatar_url, email)
            `)
            .eq('committee_id', news.committee_id)
            .eq('is_active', true);

        if (membersError) throw membersError;

        // إزالة التكرار
        const uniqueMembers = Array.from(
            new Map(members.map(m => [m.profiles.id, m.profiles])).values()
        );

        const membersOptions = uniqueMembers.map(member => `
            <div class="writer-option" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; margin-bottom: 0.5rem; cursor: pointer; transition: all 0.2s;" onclick="toggleWriter(this, '${member.id}')">
                <input type="checkbox" value="${member.id}" class="writer-checkbox" style="width: 18px; height: 18px;">
                <img src="${member.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(member.full_name)}" 
                     style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                <div style="flex: 1; text-align: right;">
                    <div style="font-weight: 600;">${member.full_name}</div>
                    <div style="font-size: 0.875rem; color: #6b7280;">${member.email}</div>
                </div>
            </div>
        `).join('');

        const { value: formValues } = await Swal.fire({
            title: `<i class="fa-solid fa-users"></i> تعيين كتّاب للخبر`,
            html: `
                <div style="text-align: right;">
                    <div style="background: #f3f4f6; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                        <h4 style="margin: 0 0 0.5rem 0; font-size: 1rem;">📰 ${news.title}</h4>
                        <p style="margin: 0; font-size: 0.875rem; color: #6b7280;">
                            <i class="fa-solid fa-sitemap"></i> ${news.committees?.committee_name_ar || 'غير محدد'}
                        </p>
                    </div>

                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.75rem; font-weight: 600;">اختر الكتّاب *</label>
                        <div id="writersContainer" style="max-height: 300px; overflow-y: auto; padding: 0.5rem;">
                            ${membersOptions}
                        </div>
                    </div>

                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">الحقول المتاحة للكتّاب *</label>
                        <div style="display: flex; flex-direction: column; gap: 0.5rem; padding: 0.75rem; background: #f9fafb; border-radius: 8px;">
                            <label style="display: flex; align-items: center; gap: 0.5rem;">
                                <input type="checkbox" id="field_content" value="content" checked>
                                <span>المحتوى الرئيسي</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 0.5rem;">
                                <input type="checkbox" id="field_summary" value="summary" checked>
                                <span>الملخص</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 0.5rem;">
                                <input type="checkbox" id="field_image_url" value="image_url">
                                <span>الصورة</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 0.5rem;">
                                <input type="checkbox" id="field_tags" value="tags">
                                <span>الوسوم (Tags)</span>
                            </label>
                        </div>
                    </div>

                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">تعليمات للكتّاب</label>
                        <textarea id="assignmentNotes" class="swal2-textarea" rows="3" placeholder="أضف تعليمات أو ملاحظات للكتّاب..." style="width: 100%; margin: 0;"></textarea>
                    </div>
                </div>

                <script>
                    function toggleWriter(element, writerId) {
                        const checkbox = element.querySelector('.writer-checkbox');
                        checkbox.checked = !checkbox.checked;
                        if (checkbox.checked) {
                            element.style.borderColor = '#3b82f6';
                            element.style.background = '#eff6ff';
                        } else {
                            element.style.borderColor = '#e5e7eb';
                            element.style.background = 'transparent';
                        }
                    }
                </script>
            `,
            width: '700px',
            showCancelButton: true,
            confirmButtonText: 'تعيين الكتّاب',
            cancelButtonText: 'إلغاء',
            preConfirm: () => {
                const selectedWriters = Array.from(document.querySelectorAll('.writer-checkbox:checked'))
                    .map(cb => cb.value);
                
                const selectedFields = Array.from(document.querySelectorAll('[id^="field_"]:checked'))
                    .map(cb => cb.value);

                const notes = document.getElementById('assignmentNotes').value;

                if (selectedWriters.length === 0) {
                    Swal.showValidationMessage('يرجى اختيار كاتب واحد على الأقل');
                    return false;
                }

                if (selectedFields.length === 0) {
                    Swal.showValidationMessage('يرجى اختيار حقل واحد على الأقل');
                    return false;
                }

                return { writers: selectedWriters, fields: selectedFields, notes };
            }
        });

        if (formValues) {
            try {
                // تحديث حالة الخبر
                const { error: updateError } = await sb
                    .from('news')
                    .update({
                        workflow_status: 'assigned',
                        assigned_writers: formValues.writers,
                        assigned_by: currentUser.id,
                        assigned_at: new Date().toISOString(),
                        available_fields: { fields: formValues.fields }
                    })
                    .eq('id', newsId);

                if (updateError) throw updateError;

                // إنشاء سجلات التعيين
                const assignments = formValues.writers.map(writerId => ({
                    news_id: newsId,
                    writer_id: writerId,
                    assigned_by: currentUser.id,
                    status: 'pending',
                    assignment_notes: formValues.notes || null
                }));

                const { error: assignError } = await sb
                    .from('news_writer_assignments')
                    .insert(assignments);

                if (assignError) throw assignError;

                // إنشاء صلاحيات الحقول
                const fieldPermissions = formValues.fields.map(field => ({
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
                    writers_count: formValues.writers.length,
                    fields: formValues.fields
                });

                // إرسال إشعارات للكتّاب
                await sendWriterNotifications(newsId, formValues.writers, news.title);

                await Swal.fire({
                    title: 'تم بنجاح',
                    text: `تم تعيين ${formValues.writers.length} كاتب للخبر`,
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });

                return true;
            } catch (error) {
                console.error('Error assigning writers:', error);
                throw error;
            }
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
    async function submitForReview(newsId) {
        try {
            // التحقق من أن الكاتب أكمل عمله
            const { data: assignment } = await sb
                .from('news_writer_assignments')
                .select('*')
                .eq('news_id', newsId)
                .eq('writer_id', currentUser.id)
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
                writer_id: currentUser.id
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
            throw new Error('غير مصرح لك بمراجعة الأخبار');
        }

        const { data: news } = await sb
            .from('news')
            .select('*')
            .eq('id', newsId)
            .single();

        if (action === 'publish') {
            const { value: formValues } = await Swal.fire({
                title: '<i class="fa-solid fa-paper-plane"></i> نشر الخبر',
                html: `
                    <div style="text-align: right;">
                        <div style="background: #f3f4f6; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                            <h4 style="margin: 0 0 0.5rem 0;">📰 ${news.title}</h4>
                        </div>

                        <div style="margin-bottom: 1rem;">
                            <label style="display: flex; align-items: center; gap: 0.5rem;">
                                <input type="checkbox" id="isFeatured">
                                <span>⭐ خبر مميز</span>
                            </label>
                        </div>

                        <div style="margin-bottom: 1rem;">
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">تاريخ النشر</label>
                            <input type="datetime-local" id="publishDate" class="swal2-input" style="width: 100%; margin: 0;" value="${new Date().toISOString().slice(0, 16)}">
                        </div>

                        <div style="margin-bottom: 1rem;">
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">ملاحظات النشر</label>
                            <textarea id="publishNotes" class="swal2-textarea" rows="2" placeholder="ملاحظات اختيارية..." style="width: 100%; margin: 0;"></textarea>
                        </div>
                    </div>
                `,
                width: '600px',
                showCancelButton: true,
                confirmButtonText: 'نشر الآن',
                cancelButtonText: 'إلغاء',
                preConfirm: () => {
                    return {
                        isFeatured: document.getElementById('isFeatured').checked,
                        publishDate: document.getElementById('publishDate').value,
                        notes: document.getElementById('publishNotes').value
                    };
                }
            });

            if (formValues) {
                const { error } = await sb
                    .from('news')
                    .update({
                        workflow_status: 'published',
                        status: 'published',
                        is_featured: formValues.isFeatured,
                        published_at: new Date(formValues.publishDate).toISOString(),
                        reviewed_by: currentUser.id,
                        reviewed_at: new Date().toISOString(),
                        review_notes: formValues.notes || null
                    })
                    .eq('id', newsId);

                if (error) throw error;

                await logActivity(newsId, 'published', {
                    is_featured: formValues.isFeatured
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

                await Swal.fire({
                    title: 'تم النشر',
                    text: 'تم نشر الخبر بنجاح',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });

                return true;
            }
        } else if (action === 'request_changes') {
            const { value: notes } = await Swal.fire({
                title: 'طلب تعديلات',
                input: 'textarea',
                inputLabel: 'ما هي التعديلات المطلوبة؟',
                inputPlaceholder: 'اكتب التعديلات المطلوبة...',
                showCancelButton: true,
                confirmButtonText: 'إرسال',
                cancelButtonText: 'إلغاء'
            });

            if (notes) {
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

                return true;
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
