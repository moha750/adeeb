/**
 * نظام إدارة دعوات التسجيل
 * يدعم: لجنة واحدة، مجموعة لجان، جميع اللجان
 * مدة الصلاحية: 24 ساعة - 7 أيام
 * أرشفة مستقلة لكل دعوة
 */

(function () {
    'use strict';

    let currentInvitations = [];
    let currentUser = null;
    let availableCommittees = [];

    /**
     * تهيئة مدير الدعوات
     */
    async function init(user) {
        currentUser = user;
        await loadCommittees();
        await loadInvitations();
        bindEvents();
    }

    /**
     * تحميل اللجان المتاحة
     */
    async function loadCommittees() {
        try {
            const { data, error } = await window.sbClient
                .from('committees')
                .select('*')
                .order('committee_name_ar');

            if (error) throw error;
            availableCommittees = data || [];
        } catch (error) {
            console.error('خطأ في تحميل اللجان:', error);
            showNotification('فشل تحميل اللجان', 'error');
        }
    }

    /**
     * تحميل الدعوات
     */
    async function loadInvitations() {
        try {
            const loadingBar = document.getElementById('loadingBar');
            if (loadingBar) loadingBar.style.display = 'block';

            const { data, error } = await window.sbClient
                .from('membership_invitations')
                .select(`
                    *,
                    selected_committee:committees!membership_invitations_selected_committee_id_fkey(id, committee_name_ar)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            currentInvitations = data || [];
            updateStatistics();
            renderInvitationsTable();
        } catch (error) {
            console.error('خطأ في تحميل الدعوات:', error);
            showNotification('فشل تحميل الدعوات', 'error');
        } finally {
            const loadingBar = document.getElementById('loadingBar');
            if (loadingBar) loadingBar.style.display = 'none';
        }
    }

    /**
     * تحديث الإحصائيات
     */
    function updateStatistics() {
        const total = currentInvitations.length;
        const active = currentInvitations.filter(i => i.status === 'active').length;
        const used = currentInvitations.filter(i => i.status === 'used').length;
        const expired = currentInvitations.filter(i => i.status === 'expired').length;

        document.getElementById('totalInvitationsCount').textContent = total;
        document.getElementById('activeInvitationsCount').textContent = active;
        document.getElementById('usedInvitationsCount').textContent = used;
        document.getElementById('expiredInvitationsCount').textContent = expired;
    }

    /**
     * عرض جدول الدعوات
     */
    function renderInvitationsTable() {
        const container = document.getElementById('invitationsTable');
        const statusFilter = document.getElementById('invitationStatusFilter')?.value || '';

        if (!container) return;

        let filtered = currentInvitations;

        // تطبيق الفلتر
        if (statusFilter) {
            filtered = filtered.filter(i => i.status === statusFilter);
        }

        if (filtered.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #64748b; padding: 2rem;">لا توجد دعوات</p>';
            return;
        }

        const html = `
            <table>
                <thead>
                    <tr>
                        <th>كود الدعوة</th>
                        <th>نوع اللجنة</th>
                        <th>الاستخدامات</th>
                        <th>الصلاحية</th>
                        <th>الحالة</th>
                        <th>تاريخ الإنشاء</th>
                        <th>الإجراءات</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map(invitation => `
                        <tr>
                            <td>
                                <code style="background: #f1f5f9; padding: 0.25rem 0.5rem; border-radius: 4px; font-family: monospace;">
                                    ${invitation.invitation_code}
                                </code>
                            </td>
                            <td>${getCommitteeModeText(invitation)}</td>
                            <td>
                                <span style="color: ${invitation.current_uses >= invitation.max_uses ? '#ef4444' : '#10b981'};">
                                    ${invitation.current_uses}
                                </span>
                                / ${invitation.max_uses}
                            </td>
                            <td>${formatExpiryDate(invitation.expires_at)}</td>
                            <td>${getStatusBadge(invitation.status)}</td>
                            <td>${new Date(invitation.created_at).toLocaleDateString('ar-SA')}</td>
                            <td>
                                <div style="display: flex; gap: 0.5rem;">
                                    <button class="btn-sm btn-outline" onclick="window.invitationsManager.copyInvitationLink('${invitation.invitation_code}')" title="نسخ الرابط">
                                        <i class="fa-solid fa-copy"></i>
                                    </button>
                                    <button class="btn-sm btn-info" onclick="window.invitationsManager.viewInvitationDetails('${invitation.id}')" title="التفاصيل">
                                        <i class="fa-solid fa-eye"></i>
                                    </button>
                                    ${invitation.status === 'active' ? `
                                        <button class="btn-sm btn-warning" onclick="window.invitationsManager.cancelInvitation('${invitation.id}')" title="إلغاء">
                                            <i class="fa-solid fa-ban"></i>
                                        </button>
                                    ` : ''}
                                    <button class="btn-sm btn-success" onclick="window.invitationsManager.archiveInvitation('${invitation.id}')" title="أرشفة">
                                        <i class="fa-solid fa-box-archive"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        container.innerHTML = html;
    }

    /**
     * الحصول على نص نوع اللجنة
     */
    function getCommitteeModeText(invitation) {
        switch (invitation.committee_mode) {
            case 'single':
                return `<span style="color: #3b82f6;"><i class="fa-solid fa-user"></i> ${invitation.selected_committee?.committee_name_ar || 'لجنة واحدة'}</span>`;
            case 'multiple':
                const count = invitation.selected_committee_ids?.length || 0;
                return `<span style="color: #8b5cf6;"><i class="fa-solid fa-users"></i> ${count} لجان</span>`;
            case 'all':
                return `<span style="color: #10b981;"><i class="fa-solid fa-globe"></i> جميع اللجان</span>`;
            default:
                return 'غير محدد';
        }
    }

    /**
     * تنسيق تاريخ انتهاء الصلاحية
     */
    function formatExpiryDate(expiresAt) {
        const now = new Date();
        const expiry = new Date(expiresAt);
        const diff = expiry - now;
        const hours = Math.floor(diff / (1000 * 60 * 60));

        if (diff < 0) {
            return '<span style="color: #ef4444;">منتهية</span>';
        } else if (hours < 24) {
            return `<span style="color: #f59e0b;">${hours} ساعة</span>`;
        } else {
            const days = Math.floor(hours / 24);
            return `<span style="color: #10b981;">${days} يوم</span>`;
        }
    }

    /**
     * الحصول على شارة الحالة
     */
    function getStatusBadge(status) {
        const badges = {
            active: '<span class="badge badge-success">نشطة</span>',
            used: '<span class="badge badge-info">مستخدمة</span>',
            expired: '<span class="badge badge-warning">منتهية</span>',
            cancelled: '<span class="badge badge-danger">ملغاة</span>'
        };
        return badges[status] || status;
    }

    /**
     * نسخ رابط الدعوة
     */
    async function copyInvitationLink(code) {
        const link = `${window.location.origin}/membership.html?invite=${code}`;
        try {
            await navigator.clipboard.writeText(link);
            showNotification('تم نسخ الرابط بنجاح', 'success');
        } catch (error) {
            console.error('خطأ في النسخ:', error);
            showNotification('فشل نسخ الرابط', 'error');
        }
    }

    /**
     * عرض تفاصيل الدعوة
     */
    async function viewInvitationDetails(invitationId) {
        const invitation = currentInvitations.find(i => i.id === invitationId);
        if (!invitation) return;

        // جلب استخدامات الدعوة
        const { data: usages, error } = await window.sbClient
            .from('invitation_usages')
            .select('*')
            .eq('invitation_id', invitationId)
            .order('used_at', { ascending: false });

        if (error) {
            console.error('خطأ في جلب الاستخدامات:', error);
        }

        const modalHtml = `
            <div class="modal-overlay" id="invitationDetailsModal" onclick="if(event.target === this) this.remove()">
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h2><i class="fa-solid fa-envelope-open-text"></i> تفاصيل الدعوة</h2>
                        <button class="modal-close" onclick="document.getElementById('invitationDetailsModal').remove()">
                            <i class="fa-solid fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div style="display: grid; gap: 1rem;">
                            <div>
                                <strong>كود الدعوة:</strong>
                                <code style="background: #f1f5f9; padding: 0.5rem; border-radius: 4px; display: block; margin-top: 0.5rem;">
                                    ${invitation.invitation_code}
                                </code>
                            </div>
                            <div>
                                <strong>الرابط:</strong>
                                <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                                    <input type="text" value="${window.location.origin}/membership.html?invite=${invitation.invitation_code}" 
                                           readonly style="flex: 1; padding: 0.5rem; border: 1px solid #e2e8f0; border-radius: 4px;">
                                    <button class="btn-sm btn-primary" onclick="window.invitationsManager.copyInvitationLink('${invitation.invitation_code}')">
                                        <i class="fa-solid fa-copy"></i>
                                    </button>
                                </div>
                            </div>
                            <div>
                                <strong>نوع اللجنة:</strong> ${getCommitteeModeText(invitation)}
                            </div>
                            <div>
                                <strong>الاستخدامات:</strong> ${invitation.current_uses} / ${invitation.max_uses}
                            </div>
                            <div>
                                <strong>تاريخ الإنشاء:</strong> ${new Date(invitation.created_at).toLocaleString('ar-SA')}
                            </div>
                            <div>
                                <strong>تاريخ الانتهاء:</strong> ${new Date(invitation.expires_at).toLocaleString('ar-SA')}
                            </div>
                            <div>
                                <strong>الحالة:</strong> ${getStatusBadge(invitation.status)}
                            </div>
                            ${invitation.notes ? `<div><strong>ملاحظات:</strong> ${invitation.notes}</div>` : ''}
                            
                            ${usages && usages.length > 0 ? `
                                <div>
                                    <strong>سجل الاستخدامات:</strong>
                                    <div style="margin-top: 0.5rem; max-height: 200px; overflow-y: auto;">
                                        ${usages.map(u => `
                                            <div style="padding: 0.5rem; background: #f8fafc; border-radius: 4px; margin-bottom: 0.5rem;">
                                                <div><strong>${u.applicant_name || 'غير محدد'}</strong></div>
                                                <div style="font-size: 0.875rem; color: #64748b;">${u.applicant_email || ''}</div>
                                                <div style="font-size: 0.75rem; color: #94a3b8;">${new Date(u.used_at).toLocaleString('ar-SA')}</div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    /**
     * إلغاء الدعوة
     */
    async function cancelInvitation(invitationId) {
        if (!confirm('هل أنت متأكد من إلغاء هذه الدعوة؟')) return;

        try {
            const { error } = await window.sbClient
                .from('membership_invitations')
                .update({ status: 'cancelled' })
                .eq('id', invitationId);

            if (error) throw error;

            showNotification('تم إلغاء الدعوة بنجاح', 'success');
            await loadInvitations();
        } catch (error) {
            console.error('خطأ في إلغاء الدعوة:', error);
            showNotification('فشل إلغاء الدعوة', 'error');
        }
    }

    /**
     * أرشفة دعوة واحدة
     */
    async function archiveInvitation(invitationId) {
        if (!confirm('هل أنت متأكد من أرشفة هذه الدعوة؟\n\nسيتم نقلها إلى الأرشيف بشكل مستقل.')) return;

        try {
            const { data, error } = await window.sbClient
                .rpc('archive_single_invitation', {
                    p_invitation_id: invitationId
                });

            if (error) throw error;

            if (data && data.success) {
                showNotification(`✅ ${data.message}\n\nإجمالي الاستخدامات: ${data.total_uses}`, 'success');
                await loadInvitations();
            } else {
                showNotification('فشلت عملية الأرشفة', 'error');
            }
        } catch (error) {
            console.error('خطأ في الأرشفة:', error);
            showNotification(`فشل أرشفة الدعوة: ${error.message}`, 'error');
        }
    }

    /**
     * فتح نافذة إنشاء دعوة جديدة
     */
    function openCreateInvitationModal() {
        const modalHtml = `
            <div class="modal-overlay" id="createInvitationModal" onclick="if(event.target === this) this.remove()">
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h2><i class="fa-solid fa-plus"></i> إنشاء دعوة تسجيل جديدة</h2>
                        <button class="modal-close" onclick="document.getElementById('createInvitationModal').remove()">
                            <i class="fa-solid fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form id="createInvitationForm" style="display: grid; gap: 1.5rem;">
                            <!-- نوع اللجنة -->
                            <div class="form-group">
                                <label><strong>نوع اللجنة</strong></label>
                                <select id="committeeModeSelect" required onchange="window.invitationsManager.handleCommitteeModeChange(this.value)">
                                    <option value="">اختر نوع اللجنة</option>
                                    <option value="single">لجنة واحدة محددة</option>
                                    <option value="multiple">مجموعة لجان مختارة</option>
                                    <option value="all">جميع اللجان</option>
                                </select>
                            </div>

                            <!-- لجنة واحدة -->
                            <div id="singleCommitteeGroup" class="form-group" style="display: none;">
                                <label><strong>اللجنة المحددة</strong></label>
                                <select id="singleCommitteeSelect">
                                    <option value="">اختر اللجنة</option>
                                    ${availableCommittees.map(c => `<option value="${c.id}">${c.committee_name_ar}</option>`).join('')}
                                </select>
                            </div>

                            <!-- مجموعة لجان -->
                            <div id="multipleCommitteesGroup" class="form-group" style="display: none;">
                                <label><strong>اللجان المختارة</strong></label>
                                <div style="max-height: 200px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem;">
                                    ${availableCommittees.map(c => `
                                        <label style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; cursor: pointer;">
                                            <input type="checkbox" name="committees" value="${c.id}" style="width: auto;">
                                            <span>${c.committee_name_ar}</span>
                                        </label>
                                    `).join('')}
                                </div>
                            </div>

                            <!-- عدد مرات الاستخدام -->
                            <div class="form-group">
                                <label><strong>عدد مرات الاستخدام</strong></label>
                                <input type="number" id="maxUsesInput" min="1" max="100" value="1" required>
                                <small style="color: #64748b;">الحد الأدنى: 1، الحد الأقصى: 100</small>
                            </div>

                            <!-- مدة الصلاحية -->
                            <div class="form-group">
                                <label><strong>مدة الصلاحية</strong></label>
                                <select id="validityDurationSelect" required onchange="window.invitationsManager.handleValidityChange(this.value)">
                                    <option value="">اختر المدة</option>
                                    <option value="24">24 ساعة</option>
                                    <option value="48">48 ساعة (يومين)</option>
                                    <option value="72">72 ساعة (3 أيام)</option>
                                    <option value="168">7 أيام (أسبوع)</option>
                                    <option value="custom">مخصص</option>
                                </select>
                            </div>

                            <!-- مدة مخصصة -->
                            <div id="customValidityGroup" class="form-group" style="display: none;">
                                <label><strong>عدد الساعات (24 - 168)</strong></label>
                                <input type="number" id="customHoursInput" min="24" max="168" placeholder="أدخل عدد الساعات">
                                <small style="color: #64748b;">الحد الأدنى: 24 ساعة، الحد الأقصى: 168 ساعة (7 أيام)</small>
                            </div>

                            <!-- ملاحظات -->
                            <div class="form-group">
                                <label><strong>ملاحظات (اختياري)</strong></label>
                                <textarea id="invitationNotesInput" rows="3" placeholder="أضف ملاحظات عن هذه الدعوة..."></textarea>
                            </div>

                            <!-- أزرار -->
                            <div style="display: flex; gap: 0.75rem; justify-content: flex-end;">
                                <button type="button" class="btn-outline" onclick="document.getElementById('createInvitationModal').remove()">
                                    إلغاء
                                </button>
                                <button type="submit" class="btn-primary">
                                    <i class="fa-solid fa-plus"></i>
                                    إنشاء الدعوة
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // ربط حدث الإرسال
        document.getElementById('createInvitationForm').addEventListener('submit', handleCreateInvitation);
    }

    /**
     * التعامل مع تغيير نوع اللجنة
     */
    function handleCommitteeModeChange(mode) {
        document.getElementById('singleCommitteeGroup').style.display = mode === 'single' ? 'block' : 'none';
        document.getElementById('multipleCommitteesGroup').style.display = mode === 'multiple' ? 'block' : 'none';
    }

    /**
     * التعامل مع تغيير مدة الصلاحية
     */
    function handleValidityChange(value) {
        document.getElementById('customValidityGroup').style.display = value === 'custom' ? 'block' : 'none';
    }

    /**
     * معالجة إنشاء الدعوة
     */
    async function handleCreateInvitation(e) {
        e.preventDefault();

        const committeeMode = document.getElementById('committeeModeSelect').value;
        const maxUses = parseInt(document.getElementById('maxUsesInput').value);
        const validityDuration = document.getElementById('validityDurationSelect').value;
        const notes = document.getElementById('invitationNotesInput').value;

        // التحقق من البيانات
        if (!committeeMode) {
            showNotification('يجب اختيار نوع اللجنة', 'warning');
            return;
        }

        let selectedCommitteeId = null;
        let selectedCommitteeIds = null;

        if (committeeMode === 'single') {
            selectedCommitteeId = document.getElementById('singleCommitteeSelect').value;
            if (!selectedCommitteeId) {
                showNotification('يجب اختيار اللجنة', 'warning');
                return;
            }
        } else if (committeeMode === 'multiple') {
            const checkboxes = document.querySelectorAll('input[name="committees"]:checked');
            if (checkboxes.length === 0) {
                showNotification('يجب اختيار لجنة واحدة على الأقل', 'warning');
                return;
            }
            selectedCommitteeIds = Array.from(checkboxes).map(cb => cb.value);
        }

        // حساب تاريخ الانتهاء
        let hours;
        if (validityDuration === 'custom') {
            hours = parseInt(document.getElementById('customHoursInput').value);
            if (!hours || hours < 24 || hours > 168) {
                showNotification('يجب أن تكون المدة بين 24 و 168 ساعة', 'warning');
                return;
            }
        } else {
            hours = parseInt(validityDuration);
        }

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + hours);

        // إنشاء كود فريد
        const invitationCode = generateInvitationCode();

        try {
            const { data, error } = await window.sbClient
                .from('membership_invitations')
                .insert({
                    invitation_code: invitationCode,
                    committee_mode: committeeMode,
                    selected_committee_id: selectedCommitteeId,
                    selected_committee_ids: selectedCommitteeIds,
                    max_uses: maxUses,
                    expires_at: expiresAt.toISOString(),
                    created_by: currentUser.id,
                    notes: notes || null
                })
                .select()
                .single();

            if (error) throw error;

            showNotification('تم إنشاء الدعوة بنجاح', 'success');
            document.getElementById('createInvitationModal').remove();
            await loadInvitations();

            // عرض الرابط
            copyInvitationLink(invitationCode);
        } catch (error) {
            console.error('خطأ في إنشاء الدعوة:', error);
            showNotification(`فشل إنشاء الدعوة: ${error.message}`, 'error');
        }
    }

    /**
     * توليد كود دعوة فريد
     */
    function generateInvitationCode() {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `INV-${timestamp}-${random}`;
    }

    /**
     * تصدير الدعوات
     */
    function exportInvitations() {
        if (currentInvitations.length === 0) {
            showNotification('لا توجد بيانات للتصدير', 'warning');
            return;
        }

        const headers = ['كود الدعوة', 'نوع اللجنة', 'الاستخدامات', 'الحد الأقصى', 'الحالة', 'تاريخ الإنشاء', 'تاريخ الانتهاء'];
        const rows = currentInvitations.map(inv => [
            inv.invitation_code,
            inv.committee_mode === 'single' ? 'لجنة واحدة' : inv.committee_mode === 'multiple' ? 'مجموعة لجان' : 'جميع اللجان',
            inv.current_uses,
            inv.max_uses,
            inv.status,
            new Date(inv.created_at).toLocaleDateString('ar-SA'),
            new Date(inv.expires_at).toLocaleDateString('ar-SA')
        ]);

        const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `invitations_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();

        showNotification('تم تصدير الدعوات بنجاح', 'success');
    }

    /**
     * ربط الأحداث
     */
    function bindEvents() {
        const createBtn = document.getElementById('createInvitationBtn');
        const refreshBtn = document.getElementById('refreshInvitationsBtn');
        const exportBtn = document.getElementById('exportInvitationsBtn');
        const statusFilter = document.getElementById('invitationStatusFilter');

        if (createBtn) {
            createBtn.removeEventListener('click', openCreateInvitationModal);
            createBtn.addEventListener('click', openCreateInvitationModal);
        }

        if (refreshBtn) {
            refreshBtn.removeEventListener('click', loadInvitations);
            refreshBtn.addEventListener('click', loadInvitations);
        }

        if (exportBtn) {
            exportBtn.removeEventListener('click', exportInvitations);
            exportBtn.addEventListener('click', exportInvitations);
        }

        if (statusFilter) {
            statusFilter.removeEventListener('change', renderInvitationsTable);
            statusFilter.addEventListener('change', renderInvitationsTable);
        }
    }

    /**
     * عرض إشعار
     */
    function showNotification(message, type = 'info') {
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            alert(message);
        }
    }

    // تصدير الوظائف
    window.invitationsManager = {
        init,
        copyInvitationLink,
        viewInvitationDetails,
        cancelInvitation,
        archiveInvitation,
        handleCommitteeModeChange,
        handleValidityChange
    };
})();
