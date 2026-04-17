/**
 * نظام ترحيل المقبولين إلى حسابات مستخدمين حقيقية
 * يسمح بعرض المقبولين، تعديل لجانهم، وترحيلهم إلى حسابات فعلية
 */

(function() {
    'use strict';

    let acceptedMembers = [];
    let committees = [];
    let currentUser = null;

    async function initMemberMigration(user) {
        currentUser = user;
        await loadCommittees();
        await loadAcceptedMembers();
        bindEvents();
    }

    async function loadCommittees() {
        try {
            const { data, error } = await window.sbClient
                .from('committees')
                .select('*')
                .eq('is_active', true)
                .order('committee_name_ar', { ascending: true });

            if (error) throw error;
            committees = data || [];

            // ملء فلتر اللجان
            const filter = document.getElementById('migrationCommitteeFilter');
            if (filter) {
                let options = '<option value="">جميع اللجان</option>';
                committees.forEach(c => {
                    options += `<option value="${escapeHtml(c.committee_name_ar)}">${escapeHtml(c.committee_name_ar)}</option>`;
                });
                filter.innerHTML = options;
            }
        } catch (error) {
            console.error('خطأ في تحميل اللجان:', error);
            showNotification('خطأ في تحميل اللجان', 'error');
        }
    }

    async function loadAcceptedMembers() {
        try {
            const container = document.getElementById('migrationTable');
            if (!container) return;

            showLoading(container);

            const { data, error } = await window.sbClient
                .from('membership_interviews')
                .select(`
                    *,
                    application:membership_applications(
                        id,
                        full_name,
                        email,
                        phone,
                        preferred_committee,
                        degree,
                        college,
                        major
                    )
                `)
                .eq('result', 'accepted')
                .is('migrated_to_user_id', null)
                .order('decided_at', { ascending: false });

            if (error) throw error;

            acceptedMembers = data || [];
            renderMigrationTable();
            updateMigrationStatistics();
        } catch (error) {
            console.error('خطأ في تحميل المقبولين:', error);
            showNotification('خطأ في تحميل المقبولين', 'error');
            const container = document.getElementById('migrationTable');
            if (container) {
                container.innerHTML = '<div class="error-state">حدث خطأ في تحميل البيانات</div>';
            }
        }
    }

    function renderMigrationTable() {
        const container = document.getElementById('migrationTable');
        const searchInput = document.getElementById('migrationSearchInput');
        const committeeFilter = document.getElementById('migrationCommitteeFilter');

        if (!container) return;

        const searchTerm = searchInput?.value.toLowerCase() || '';
        const committeeValue = committeeFilter?.value || '';

        let filtered = acceptedMembers.filter(member => {
            const app = member.application;
            if (!app) return false;

            const matchSearch = !searchTerm || 
                app.full_name.toLowerCase().includes(searchTerm) ||
                app.email.toLowerCase().includes(searchTerm) ||
                (app.phone && app.phone.includes(searchTerm));
            
            const matchCommittee = !committeeValue || app.preferred_committee === committeeValue;

            return matchSearch && matchCommittee;
        });

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state empty-state--success">
                    <div class="empty-state__icon"><i class="fa-solid fa-user-check"></i></div>
                    <p class="empty-state__title">لا يوجد أعضاء مقبولين بانتظار الترحيل</p>
                    <p class="empty-state__message">جميع المقبولين تم ترحيلهم بنجاح</p>
                </div>
            `;
            return;
        }

        let html = `
            <div class="data-table-wrap">
                <div class="data-table-scroll">
                    <table class="data-table data-table--striped">
                        <thead>
                            <tr>
                                <th style="width:2.5rem;text-align:center;">تحديد</th>
                                <th>الاسم</th>
                                <th>اللجنة</th>
                                <th>تاريخ القبول</th>
                                <th style="text-align:center;">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        filtered.forEach(member => {
            const app = member.application;
            const decidedDate = member.decided_at ? new Date(member.decided_at).toLocaleDateString('ar-SA') : '-';

            const committeeOptions = committees.map(c =>
                `<option value="${c.id}" ${c.committee_name_ar === app.preferred_committee ? 'selected' : ''}>
                    ${c.committee_name_ar}
                </option>`
            ).join('');

            html += `
                        <tr data-member-id="${member.id}">
                            <td style="text-align:center;">
                                <label class="form-checkbox"><input type="checkbox" class="member-checkbox" data-member-id="${member.id}" onchange="window.memberMigration.updateSelectedCount()" /></label>
                            </td>
                            <td class="cell-strong">${escapeHtml(app.full_name)}</td>
                            <td>
                                <select class="committee-select form-select" data-member-id="${member.id}" style="min-width:130px;padding:0.35rem 0.5rem;font-size:0.8125rem;">
                                    ${committeeOptions}
                                </select>
                            </td>
                            <td class="cell-nowrap cell-muted">${decidedDate}</td>
                            <td>
                                <div class="data-table__actions">
                                    <button class="btn btn-icon btn-success btn-sm" title="ترحيل إلى حساب" onclick="window.memberMigration.migrateSingleMember('${member.id}')">
                                        <i class="fa-solid fa-user-plus"></i>
                                    </button>
                                    <button class="btn btn-icon btn-primary btn-sm" title="عرض التفاصيل" onclick="window.memberMigration.viewMemberDetails('${member.id}')">
                                        <i class="fa-solid fa-eye"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
            `;
        });

        html += '</tbody></table></div></div>';
        container.innerHTML = html;

        // ربط حدث تغيير اللجنة
        container.querySelectorAll('.committee-select').forEach(select => {
            select.addEventListener('change', (e) => {
                saveCommitteeChange(e.target.dataset.memberId, e.target.value);
            });
        });

        // شريط إجراءات الترحيل الجماعي (حائم خارج الكارد)
        const section = document.getElementById('member-migration-section');
        let actionsBar = document.getElementById('migrationActionsBar');
        if (!actionsBar) {
            actionsBar = document.createElement('div');
            actionsBar.id = 'migrationActionsBar';
            actionsBar.className = 'form-actions-sticky';
            actionsBar.innerHTML = `
                <div class="form-actions-bar">
                    <button class="btn btn-success" id="selectAllCheckbox" onclick="window.memberMigration.toggleSelectAll()">
                        <i class="fa-solid fa-check-double"></i>
                        تحديد الكل
                    </button>
                    <button class="btn btn-primary" onclick="window.memberMigration.migrateAllSelected()" id="migrateSelectedBtn" disabled>
                        <i class="fa-solid fa-users-gear"></i>
                        ترحيل المحددين
                    </button>
                </div>
            `;
            section.appendChild(actionsBar);
        }
    }

    function updateMigrationStatistics() {
        const container = document.getElementById('migrationStatsGrid');
        if (!container) return;

        const total = acceptedMembers.length;

        container.innerHTML = `
            <div class="stat-card" style="--stat-color: #10b981;">
                <div class="stat-card-wrapper">
                    <div class="stat-icon">
                        <i class="fa-solid fa-user-graduate"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${total}</div>
                        <div class="stat-label">المقبولين بانتظار الترحيل</div>
                    </div>
                </div>
            </div>
        `;
    }

    function toggleSelectAll() {
        const checkboxes = document.querySelectorAll('.member-checkbox');
        const allChecked = checkboxes.length > 0 && Array.from(checkboxes).every(cb => cb.checked);
        checkboxes.forEach(cb => cb.checked = !allChecked);
        const btn = document.getElementById('selectAllCheckbox');
        if (btn) {
            if (allChecked) {
                btn.innerHTML = '<i class="fa-solid fa-check-double"></i> تحديد الكل';
                btn.className = 'btn btn-success';
            } else {
                btn.innerHTML = '<i class="fa-solid fa-xmark"></i> إلغاء التحديد';
                btn.className = 'btn btn-danger';
            }
        }
        updateSelectedCount();
    }

    function updateSelectedCount() {
        const checkboxes = document.querySelectorAll('.member-checkbox:checked');
        const count = checkboxes.length;

        const countEl = document.getElementById('selectedCount');
        const migrateBtn = document.getElementById('migrateSelectedBtn');

        if (countEl) countEl.textContent = count;
        if (migrateBtn) migrateBtn.disabled = count === 0;
    }

    async function saveCommitteeChange(interviewId, committeeId) {
        const member = acceptedMembers.find(m => m.id === interviewId);
        if (!member || !member.application) return;

        const committee = committees.find(c => c.id === parseInt(committeeId));
        if (!committee) return;

        try {
            const { error } = await window.sbClient
                .from('membership_applications')
                .update({ preferred_committee: committee.committee_name_ar })
                .eq('id', member.application.id);

            if (error) throw error;

            // تحديث البيانات المحلية
            member.application.preferred_committee = committee.committee_name_ar;
            showNotification(`تم تغيير اللجنة إلى "${committee.committee_name_ar}" بنجاح`, 'success');
        } catch (error) {
            console.error('خطأ في حفظ اللجنة:', error);
            showNotification('خطأ في حفظ تغيير اللجنة', 'error');
            // إرجاع القيمة القديمة
            const select = document.querySelector(`.committee-select[data-member-id="${interviewId}"]`);
            if (select) {
                const oldCommittee = committees.find(c => c.committee_name_ar === member.application.preferred_committee);
                if (oldCommittee) select.value = oldCommittee.id;
            }
        }
    }

    async function migrateSingleMember(interviewId) {
        const member = acceptedMembers.find(m => m.id === interviewId);
        if (!member) return;

        const committeeSelect = document.querySelector(`.committee-select[data-member-id="${interviewId}"]`);
        const selectedCommitteeId = committeeSelect ? parseInt(committeeSelect.value) : null;

        const result = await Swal.fire({
            title: 'تأكيد الترحيل',
            html: `
                <p>هل أنت متأكد من ترحيل العضو:</p>
                <p>${escapeHtml(member.application.full_name)}</p>
                <p>سيتم إنشاء حساب جديد وإرسال بريد إلكتروني بكلمة المرور المؤقتة</p>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'نعم، ترحيل',
            cancelButtonText: 'إلغاء',
            confirmButtonColor: '#3b82f6'
        });

        if (!result.isConfirmed) return;

        try {
            showLoading(document.getElementById('migrationTable'));

            // تحديث الجلسة لضمان توكن صالح
            const { data: refreshData, error: refreshError } = await window.sbClient.auth.refreshSession();
            const session = refreshData?.session || (await window.sbClient.auth.getSession()).data.session;
            if (!session?.access_token) {
                throw new Error('جلسة منتهية - يرجى تسجيل الدخول مجدداً' + (refreshError ? `: ${refreshError.message}` : ''));
            }

            const res = await window.edgeInvoke('migrate-accepted-member', {
                interview_id: interviewId,
                committee_id: selectedCommitteeId,
                send_welcome_email: true
            });

            const data = res.data || {};

            if (!res.ok) {
                console.error('Migration response:', res.status, data);
                throw new Error(res.error || `HTTP ${res.status}`);
            }

            if (data.success) {
                await Swal.fire({
                    title: 'تم الترحيل بنجاح! 🎉',
                    html: `
                        <p>تم إنشاء حساب للعضو بنجاح</p>
                        <div>
                            <p><i class="fa-solid fa-check-circle"></i> تم إرسال إيميل ترحيبي للعضو</p>
                            <p>يحتوي الإيميل على رابط لتعبئة البيانات الشخصية والأكاديمية</p>
                        </div>
                        <div>
                            <p><strong>Email:</strong> ${data.email}</p>
                            <p>سيتمكن العضو من تسجيل الدخول بعد إكمال بياناته</p>
                        </div>
                    `,
                    icon: 'success',
                    confirmButtonText: 'حسناً'
                });

                await loadAcceptedMembers();
                await checkAndAutoArchive();
            } else {
                throw new Error(data.error || 'فشل الترحيل');
            }
        } catch (error) {
            console.error('خطأ في الترحيل:', error);
            Swal.fire({
                title: 'خطأ في الترحيل',
                text: error.message || 'حدث خطأ أثناء ترحيل العضو',
                icon: 'error',
                confirmButtonText: 'حسناً'
            });
            await loadAcceptedMembers();
        }
    }

    async function migrateAllSelected() {
        const checkboxes = document.querySelectorAll('.member-checkbox:checked');
        if (checkboxes.length === 0) return;

        const result = await Swal.fire({
            title: 'تأكيد الترحيل الجماعي',
            html: `
                <p>هل أنت متأكد من ترحيل <strong>${checkboxes.length}</strong> عضو؟</p>
                <p>سيتم إنشاء حسابات لجميع الأعضاء المحددين</p>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'نعم، ترحيل الكل',
            cancelButtonText: 'إلغاء',
            confirmButtonColor: '#3b82f6'
        });

        if (!result.isConfirmed) return;

        const memberIds = Array.from(checkboxes).map(cb => cb.dataset.memberId);
        let successCount = 0;
        let failCount = 0;
        const results = [];

        showLoading(document.getElementById('migrationTable'));

        const { data: { session: bulkSession } } = await window.sbClient.auth.getSession();
        if (!bulkSession) {
            showNotification('يجب تسجيل الدخول أولاً', 'error');
            return;
        }

        for (const interviewId of memberIds) {
            try {
                const member = acceptedMembers.find(m => m.id === interviewId);
                const committeeSelect = document.querySelector(`.committee-select[data-member-id="${interviewId}"]`);
                const selectedCommitteeId = committeeSelect ? parseInt(committeeSelect.value) : null;

                const res = await window.edgeInvoke('migrate-accepted-member', {
                    interview_id: interviewId,
                    committee_id: selectedCommitteeId,
                    send_welcome_email: true
                });

                const data = res.data || {};

                if (!res.ok) {
                    throw new Error(res.error || `HTTP ${res.status}`);
                }

                if (data.success) {
                    successCount++;
                    results.push({
                        name: member.application.full_name,
                        email: data.email,
                        password: data.temporary_password,
                        success: true
                    });
                } else {
                    throw new Error(data.error);
                }
            } catch (error) {
                failCount++;
                console.error(`فشل ترحيل ${interviewId}:`, error);
            }
        }

        await loadAcceptedMembers();

        const resultsHtml = results.map(r => `
            <div>
                <p>${r.name}</p>
                <p>Email: ${r.email}</p>
                <p>Password: <code>${r.password}</code></p>
            </div>
        `).join('');

        await Swal.fire({
            title: 'نتيجة الترحيل الجماعي',
            html: `
                <p>تم ترحيل <strong>${successCount}</strong> عضو بنجاح</p>
                ${failCount > 0 ? `<p>فشل ترحيل <strong>${failCount}</strong> عضو</p>` : ''}
                <div>
                    ${resultsHtml}
                </div>
                <p>يرجى حفظ كلمات المرور وإرسالها للأعضاء</p>
            `,
            icon: successCount > 0 ? 'success' : 'error',
            confirmButtonText: 'حسناً',
            width: '600px'
        });

        if (successCount > 0) {
            await checkAndAutoArchive();
        }
    }

    /**
     * التحقق من اكتمال الترحيل وأرشفة الدورة تلقائياً
     */
    async function checkAndAutoArchive() {
        // التحقق من عدم وجود أعضاء متبقين للترحيل
        if (acceptedMembers.length > 0) return;

        // التأكد مرة أخرى من قاعدة البيانات
        const { data: remaining, error: checkError } = await window.sbClient
            .from('membership_interviews')
            .select('id')
            .eq('result', 'accepted')
            .is('migrated_to_user_id', null)
            .limit(1);

        if (checkError || (remaining && remaining.length > 0)) return;

        // قراءة عنوان الدورة من الإعدادات
        const { data: settings, error: settingsError } = await window.sbClient
            .from('membership_settings')
            .select('cycle_title')
            .eq('id', 'default')
            .single();

        if (settingsError || !settings?.cycle_title) {
            console.warn('لا يوجد عنوان دورة للأرشفة');
            return;
        }

        const cycleTitle = settings.cycle_title;

        try {
            showLoading(document.getElementById('migrationTable'));

            // استدعاء دالة الأرشفة
            const { data, error } = await window.sbClient.rpc('archive_membership_cycle', {
                p_cycle_name: cycleTitle,
                p_cycle_year: new Date().getFullYear(),
                p_cycle_season: getCurrentSeason(),
                p_description: `أرشفة تلقائية بعد ترحيل جميع المقبولين - ${new Date().toLocaleDateString('ar-SA')}`,
                p_archived_by: currentUser?.id
            });

            if (error) throw error;

            // إغلاق باب التسجيل ومسح عنوان الدورة
            await window.sbClient
                .from('membership_settings')
                .update({
                    join_open: false,
                    cycle_title: null,
                    updated_by: currentUser?.id
                })
                .eq('id', 'default');

            await Swal.fire({
                title: 'تمت الأرشفة بنجاح',
                html: `
                    <p>تم ترحيل جميع المقبولين وأرشفة الدورة:</p>
                    <p><strong>${cycleTitle}</strong></p>
                    <p>تم إغلاق باب التسجيل وتجهيز النظام لدورة جديدة</p>
                `,
                icon: 'success',
                confirmButtonText: 'حسناً'
            });

            location.reload();
        } catch (error) {
            console.error('خطأ في الأرشفة التلقائية:', error);
            showNotification('خطأ في أرشفة الدورة: ' + error.message, 'error');
        }
    }

    /**
     * تحديد الموسم الحالي
     */
    function getCurrentSeason() {
        const month = new Date().getMonth() + 1;
        if (month >= 3 && month <= 5) return 'spring';
        if (month >= 6 && month <= 8) return 'summer';
        if (month >= 9 && month <= 11) return 'fall';
        return 'winter';
    }

    function viewMemberDetails(interviewId) {
        const member = acceptedMembers.find(m => m.id === interviewId);
        if (!member || !member.application) return;

        const app = member.application;
        const decidedDate = member.decided_at ? new Date(member.decided_at).toLocaleDateString('ar-SA') : 'غير محدد';

        const contentHtml = `
            <div class="modal-section">
                <h3><i class="fa-solid fa-user"></i> المعلومات الشخصية</h3>
                <div class="modal-detail-grid">
                    <div class="modal-detail-item">
                        <span class="modal-detail-label">الاسم الكامل</span>
                        <span class="modal-detail-value">${escapeHtml(app.full_name)}</span>
                    </div>
                    <div class="modal-detail-item">
                        <span class="modal-detail-label">البريد الإلكتروني</span>
                        <span class="modal-detail-value">${escapeHtml(app.email)}</span>
                    </div>
                    <div class="modal-detail-item">
                        <span class="modal-detail-label">رقم الجوال</span>
                        <span class="modal-detail-value">${escapeHtml(app.phone || 'غير متوفر')}</span>
                    </div>
                    <div class="modal-detail-item">
                        <span class="modal-detail-label">اللجنة المرغوبة</span>
                        <span class="modal-detail-value">${escapeHtml(app.preferred_committee || 'غير محدد')}</span>
                    </div>
                </div>
            </div>

            <hr class="modal-divider">

            <div class="modal-section">
                <h3><i class="fa-solid fa-graduation-cap"></i> المعلومات الأكاديمية</h3>
                <div class="modal-detail-grid">
                    <div class="modal-detail-item">
                        <span class="modal-detail-label">الدرجة العلمية</span>
                        <span class="modal-detail-value">${escapeHtml(app.degree || 'غير محدد')}</span>
                    </div>
                    <div class="modal-detail-item">
                        <span class="modal-detail-label">الكلية</span>
                        <span class="modal-detail-value">${escapeHtml(app.college || 'غير محدد')}</span>
                    </div>
                    <div class="modal-detail-item">
                        <span class="modal-detail-label">التخصص</span>
                        <span class="modal-detail-value">${escapeHtml(app.major || 'غير محدد')}</span>
                    </div>
                    <div class="modal-detail-item">
                        <span class="modal-detail-label">تاريخ القبول</span>
                        <span class="modal-detail-value">${decidedDate}</span>
                    </div>
                </div>
            </div>

            ${member.result_notes ? `
                <hr class="modal-divider">
                <div class="modal-section">
                    <h3><i class="fa-solid fa-note-sticky"></i> ملاحظات نتيجة المقابلة</h3>
                    <div class="modal-info-box box-success">
                        <i class="fa-solid fa-circle-check"></i>
                        <div>${escapeHtml(member.result_notes)}</div>
                    </div>
                </div>
            ` : ''}
        `;

        window.openModal('تفاصيل العضو', contentHtml, { icon: 'fa-user-check', variant: 'success' });
    }

    function exportToExcel() {
        try {
            if (acceptedMembers.length === 0) {
                showNotification('لا توجد بيانات للتصدير', 'warning');
                return;
            }

            // إعداد البيانات للتصدير
            const exportData = acceptedMembers.map((member, index) => {
                const app = member.application || {};
                const decidedDate = member.decided_at ? new Date(member.decided_at).toLocaleDateString('ar-SA') : '-';
                
                return {
                    '#': index + 1,
                    'الاسم الكامل': app.full_name || '-',
                    'البريد الإلكتروني': app.email || '-',
                    'رقم الجوال': app.phone || '-',
                    'اللجنة المفضلة': app.preferred_committee || '-',
                    'تاريخ القبول': decidedDate,
                    'حالة الترحيل': member.migrated_to_user_id ? 'تم الترحيل' : 'بانتظار الترحيل'
                };
            });

            // تحويل البيانات إلى CSV
            const headers = Object.keys(exportData[0]);
            const csvContent = [
                headers.join(','),
                ...exportData.map(row => 
                    headers.map(header => {
                        const value = row[header] || '';
                        // تنظيف البيانات وإضافة علامات اقتباس للنصوص التي تحتوي على فواصل
                        return `"${String(value).replace(/"/g, '""')}"`;
                    }).join(',')
                )
            ].join('\n');

            // إضافة BOM لدعم العربية
            const BOM = '\uFEFF';
            const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
            
            // إنشاء رابط التحميل
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            const timestamp = new Date().toISOString().split('T')[0];
            
            link.setAttribute('href', url);
            link.setAttribute('download', `المقبولين_للترحيل_${timestamp}.csv`);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showNotification(`تم تصدير ${exportData.length} سجل بنجاح`, 'success');
        } catch (error) {
            console.error('خطأ في التصدير:', error);
            showNotification('حدث خطأ أثناء التصدير', 'error');
        }
    }

    function bindEvents() {
        const searchInput = document.getElementById('migrationSearchInput');
        const committeeFilter = document.getElementById('migrationCommitteeFilter');

        if (searchInput) {
            searchInput.addEventListener('input', renderMigrationTable);
        }

        if (committeeFilter) {
            committeeFilter.addEventListener('change', renderMigrationTable);
        }

        // زر خيارات الهيدر
        const optionsBtn = document.getElementById('migrationOptionsBtn');
        if (optionsBtn) {
            let dropdown = document.getElementById('migrationOptionsDropdown');
            if (dropdown) dropdown.remove();
            dropdown = document.createElement('div');
            dropdown.id = 'migrationOptionsDropdown';
            dropdown.className = 'dropdown-menu';
            dropdown.innerHTML = `
                <button class="btn btn-slate btn-outline btn-block" data-action="refresh">
                    <i class="fa-solid fa-rotate"></i> تحديث
                </button>
                <button class="btn btn-primary btn-outline btn-block" data-action="export">
                    <i class="fa-solid fa-file-excel"></i> تصدير Excel
                </button>
            `;
            document.body.appendChild(dropdown);

            optionsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = dropdown.classList.toggle('show');
                if (isOpen) {
                    const rect = optionsBtn.getBoundingClientRect();
                    dropdown.style.top = (rect.bottom + 6) + 'px';
                    dropdown.style.left = rect.left + 'px';
                }
            });

            dropdown.addEventListener('click', (e) => {
                const actionBtn = e.target.closest('[data-action]');
                if (!actionBtn) return;
                dropdown.classList.remove('show');
                if (actionBtn.dataset.action === 'export') {
                    exportToExcel();
                } else if (actionBtn.dataset.action === 'refresh') {
                    loadAcceptedMembers();
                }
            });

            document.addEventListener('click', (e) => {
                if (!e.target.closest('#migrationOptionsBtn') && !e.target.closest('#migrationOptionsDropdown')) {
                    dropdown.classList.remove('show');
                }
            });
        }
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function showLoading(container) {
        if (container) {
            container.innerHTML = '<div class="text-center"><i class="fa-solid fa-spinner fa-spin"></i><p>جاري التحميل...</p></div>';
        }
    }

    function showNotification(message, type) {
        if (window.Toast) {
            window.Toast.show({ message, type });
        } else {
            console.log(`[${type}] ${message}`);
        }
    }

    window.memberMigration = {
        init: initMemberMigration,
        load: loadAcceptedMembers,
        migrateSingleMember,
        migrateAllSelected,
        viewMemberDetails,
        toggleSelectAll,
        updateSelectedCount,
        exportToExcel
    };

})();
