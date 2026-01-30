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
                <div class="empty-state">
                    <i class="fa-solid fa-user-check"></i>
                    <p>لا يوجد أعضاء مقبولين بانتظار الترحيل</p>
                    <p style="font-size: 0.9rem; color: #64748b;">جميع المقبولين تم ترحيلهم بنجاح</p>
                </div>
            `;
            return;
        }

        let html = `
            <div style="margin-bottom: 1rem; display: flex; gap: 1rem; align-items: center;">
                <button class="btn-primary" onclick="window.memberMigration.migrateAllSelected()" id="migrateSelectedBtn" disabled>
                    <i class="fa-solid fa-users-gear"></i>
                    ترحيل المحددين (<span id="selectedCount">0</span>)
                </button>
                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                    <input type="checkbox" id="selectAllCheckbox" onchange="window.memberMigration.toggleSelectAll(this.checked)" />
                    <span>تحديد الكل</span>
                </label>
            </div>
            <div class="migration-cards-grid">
        `;

        filtered.forEach(member => {
            const app = member.application;
            const decidedDate = member.decided_at ? new Date(member.decided_at).toLocaleDateString('ar-SA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }) : 'غير محدد';

            const committeeOptions = committees.map(c => 
                `<option value="${c.id}" ${c.committee_name_ar === app.preferred_committee ? 'selected' : ''}>
                    ${c.committee_name_ar}
                </option>`
            ).join('');

            html += `
                <div class="migration-card" data-member-id="${member.id}">
                    <div class="migration-card-header">
                        <label class="migration-checkbox">
                            <input type="checkbox" class="member-checkbox" data-member-id="${member.id}" onchange="window.memberMigration.updateSelectedCount()" />
                        </label>
                        <div class="member-info">
                            <div class="member-avatar">
                                <i class="fa-solid fa-user-graduate"></i>
                            </div>
                            <div class="member-details">
                                <h3>${escapeHtml(app.full_name)}</h3>
                                <span class="badge badge-success">مقبول نهائياً</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="migration-card-body">
                        <div class="info-grid">
                            <div class="info-item">
                                <i class="fa-solid fa-envelope"></i>
                                <div>
                                    <span class="info-label">البريد الإلكتروني</span>
                                    <span class="info-value">${escapeHtml(app.email)}</span>
                                </div>
                            </div>
                            
                            <div class="info-item">
                                <i class="fa-solid fa-phone"></i>
                                <div>
                                    <span class="info-label">رقم الجوال</span>
                                    <span class="info-value">${escapeHtml(app.phone || 'غير متوفر')}</span>
                                </div>
                            </div>
                            
                            <div class="info-item">
                                <i class="fa-solid fa-graduation-cap"></i>
                                <div>
                                    <span class="info-label">الدرجة العلمية</span>
                                    <span class="info-value">${escapeHtml(app.degree || 'غير محدد')}</span>
                                </div>
                            </div>
                            
                            <div class="info-item">
                                <i class="fa-solid fa-building-columns"></i>
                                <div>
                                    <span class="info-label">الكلية</span>
                                    <span class="info-value">${escapeHtml(app.college || 'غير محدد')}</span>
                                </div>
                            </div>
                            
                            <div class="info-item full-width">
                                <i class="fa-solid fa-users"></i>
                                <div style="flex: 1;">
                                    <span class="info-label">اللجنة</span>
                                    <select class="committee-select" data-member-id="${member.id}" style="width: 100%; padding: 0.5rem; border: 1px solid #e2e8f0; border-radius: 0.375rem; margin-top: 0.25rem;">
                                        ${committeeOptions}
                                    </select>
                                </div>
                            </div>
                            
                            <div class="info-item">
                                <i class="fa-solid fa-calendar-check"></i>
                                <div>
                                    <span class="info-label">تاريخ القبول</span>
                                    <span class="info-value">${decidedDate}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="migration-card-footer">
                        <button class="btn-primary btn-sm" onclick="window.memberMigration.migrateSingleMember('${member.id}')">
                            <i class="fa-solid fa-user-plus"></i>
                            ترحيل إلى حساب
                        </button>
                        <button class="btn-outline btn-sm" onclick="window.memberMigration.viewMemberDetails('${member.id}')">
                            <i class="fa-solid fa-eye"></i>
                            عرض التفاصيل
                        </button>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    function updateMigrationStatistics() {
        const totalEl = document.getElementById('totalAcceptedCount');
        const pendingEl = document.getElementById('pendingMigrationCount');

        if (totalEl) totalEl.textContent = acceptedMembers.length;
        if (pendingEl) pendingEl.textContent = acceptedMembers.length;
    }

    function toggleSelectAll(checked) {
        const checkboxes = document.querySelectorAll('.member-checkbox');
        checkboxes.forEach(cb => cb.checked = checked);
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

    async function migrateSingleMember(interviewId) {
        const member = acceptedMembers.find(m => m.id === interviewId);
        if (!member) return;

        const committeeSelect = document.querySelector(`.committee-select[data-member-id="${interviewId}"]`);
        const selectedCommitteeId = committeeSelect ? parseInt(committeeSelect.value) : null;

        const result = await Swal.fire({
            title: 'تأكيد الترحيل',
            html: `
                <p>هل أنت متأكد من ترحيل العضو:</p>
                <p style="font-weight: bold; margin: 1rem 0;">${escapeHtml(member.application.full_name)}</p>
                <p style="font-size: 0.9rem; color: #64748b;">سيتم إنشاء حساب جديد وإرسال بريد إلكتروني بكلمة المرور المؤقتة</p>
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

            // الحصول على session token
            const { data: { session } } = await window.sbClient.auth.getSession();
            if (!session) {
                throw new Error('يجب تسجيل الدخول أولاً');
            }

            const { data, error } = await window.sbClient.functions.invoke('migrate-accepted-member', {
                body: {
                    interview_id: interviewId,
                    committee_id: selectedCommitteeId,
                    send_welcome_email: true
                },
                headers: {
                    Authorization: `Bearer ${session.access_token}`
                }
            });

            if (error) throw error;

            if (data.success) {
                await Swal.fire({
                    title: 'تم الترحيل بنجاح! 🎉',
                    html: `
                        <p>تم إنشاء حساب للعضو بنجاح</p>
                        <div style="background: #e8f5e9; padding: 1rem; border-radius: 0.5rem; margin: 1rem 0;">
                            <p style="margin: 0.5rem 0; color: #2e7d32;"><i class="fa-solid fa-check-circle"></i> تم إرسال إيميل ترحيبي للعضو</p>
                            <p style="margin: 0.5rem 0; font-size: 0.9rem; color: #558b2f;">يحتوي الإيميل على رابط لتعبئة البيانات الشخصية والأكاديمية</p>
                        </div>
                        <div style="background: #f1f5f9; padding: 1rem; border-radius: 0.5rem; margin: 1rem 0; text-align: left; direction: ltr;">
                            <p style="margin: 0.5rem 0;"><strong>Email:</strong> ${data.email}</p>
                            <p style="margin: 0.5rem 0; font-size: 0.85rem; color: #64748b;">سيتمكن العضو من تسجيل الدخول بعد إكمال بياناته</p>
                        </div>
                    `,
                    icon: 'success',
                    confirmButtonText: 'حسناً'
                });

                await loadAcceptedMembers();
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
                <p style="font-size: 0.9rem; color: #64748b;">سيتم إنشاء حسابات لجميع الأعضاء المحددين</p>
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

        for (const interviewId of memberIds) {
            try {
                const member = acceptedMembers.find(m => m.id === interviewId);
                const committeeSelect = document.querySelector(`.committee-select[data-member-id="${interviewId}"]`);
                const selectedCommitteeId = committeeSelect ? parseInt(committeeSelect.value) : null;

                const { data, error } = await window.sbClient.functions.invoke('migrate-accepted-member', {
                    body: {
                        interview_id: interviewId,
                        committee_id: selectedCommitteeId,
                        send_welcome_email: true
                    }
                });

                if (error) throw error;

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
            <div style="background: #f1f5f9; padding: 0.75rem; border-radius: 0.375rem; margin: 0.5rem 0; text-align: left; direction: ltr;">
                <p style="margin: 0.25rem 0; font-weight: bold;">${r.name}</p>
                <p style="margin: 0.25rem 0; font-size: 0.9rem;">Email: ${r.email}</p>
                <p style="margin: 0.25rem 0; font-size: 0.9rem;">Password: <code style="background: white; padding: 0.125rem 0.375rem; border-radius: 0.25rem;">${r.password}</code></p>
            </div>
        `).join('');

        await Swal.fire({
            title: 'نتيجة الترحيل الجماعي',
            html: `
                <p>تم ترحيل <strong style="color: #10b981;">${successCount}</strong> عضو بنجاح</p>
                ${failCount > 0 ? `<p>فشل ترحيل <strong style="color: #ef4444;">${failCount}</strong> عضو</p>` : ''}
                <div style="max-height: 300px; overflow-y: auto; margin-top: 1rem;">
                    ${resultsHtml}
                </div>
                <p style="font-size: 0.9rem; color: #64748b; margin-top: 1rem;">يرجى حفظ كلمات المرور وإرسالها للأعضاء</p>
            `,
            icon: successCount > 0 ? 'success' : 'error',
            confirmButtonText: 'حسناً',
            width: '600px'
        });
    }

    function viewMemberDetails(interviewId) {
        const member = acceptedMembers.find(m => m.id === interviewId);
        if (!member || !member.application) return;

        const app = member.application;
        
        Swal.fire({
            title: 'تفاصيل العضو',
            html: `
                <div style="text-align: right; direction: rtl;">
                    <div style="margin: 1rem 0;">
                        <strong>الاسم الكامل:</strong> ${escapeHtml(app.full_name)}
                    </div>
                    <div style="margin: 1rem 0;">
                        <strong>البريد الإلكتروني:</strong> ${escapeHtml(app.email)}
                    </div>
                    <div style="margin: 1rem 0;">
                        <strong>رقم الجوال:</strong> ${escapeHtml(app.phone || 'غير متوفر')}
                    </div>
                    <div style="margin: 1rem 0;">
                        <strong>الدرجة العلمية:</strong> ${escapeHtml(app.degree || 'غير محدد')}
                    </div>
                    <div style="margin: 1rem 0;">
                        <strong>الكلية:</strong> ${escapeHtml(app.college || 'غير محدد')}
                    </div>
                    <div style="margin: 1rem 0;">
                        <strong>التخصص:</strong> ${escapeHtml(app.major || 'غير محدد')}
                    </div>
                    <div style="margin: 1rem 0;">
                        <strong>اللجنة المرغوبة:</strong> ${escapeHtml(app.preferred_committee || 'غير محدد')}
                    </div>
                </div>
            `,
            confirmButtonText: 'إغلاق',
            width: '500px'
        });
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
        const refreshBtn = document.getElementById('refreshMigrationBtn');
        const exportBtn = document.getElementById('exportMigrationBtn');

        if (searchInput) {
            searchInput.addEventListener('input', renderMigrationTable);
        }

        if (committeeFilter) {
            committeeFilter.addEventListener('change', renderMigrationTable);
        }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', loadAcceptedMembers);
        }

        if (exportBtn) {
            exportBtn.addEventListener('click', exportToExcel);
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
            container.innerHTML = '<div class="text-center" style="padding: 3rem;"><i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem;"></i><p style="margin-top: 1rem;">جاري التحميل...</p></div>';
        }
    }

    function showNotification(message, type) {
        if (window.showNotification) {
            window.showNotification(message, type);
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
