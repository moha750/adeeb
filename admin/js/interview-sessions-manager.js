// ============================================================================
// نظام إدارة جلسات المقابلات - Interview Sessions Manager
// ============================================================================

(function() {
    'use strict';

    let currentUser = null;
    let allSessions = [];

    /**
     * تهيئة مدير جلسات المقابلات
     */
    async function initInterviewSessionsManager(user) {
        currentUser = user;
        await loadSessions();
        bindEvents();
    }

    /**
     * ربط الأحداث
     */
    function bindEvents() {
        const createBtn = document.getElementById('createSessionBtn');
        const refreshBtn = document.getElementById('refreshSessionsBtn');

        if (createBtn) {
            createBtn.addEventListener('click', createNewSession);
        }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => loadSessions());
        }
    }

    /**
     * تحميل جميع الجلسات
     */
    async function loadSessions() {
        try {
            showLoading();

            const { data, error } = await window.sbClient
                .from('interview_sessions')
                .select('*')
                .order('session_date', { ascending: false });

            if (error) throw error;

            allSessions = data || [];
            await renderSessions();
            await updateStatistics();

        } catch (error) {
            console.error('خطأ في تحميل الجلسات:', error);
            showNotification('خطأ في تحميل جلسات المقابلات', 'error');
        }
    }

    /**
     * عرض الجلسات
     */
    async function renderSessions() {
        const container = document.getElementById('sessionsTable');
        if (!container) return;

        if (allSessions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-calendar-xmark"></i>
                    <p>لا توجد جلسات مقابلات</p>
                    <button class="btn-primary" onclick="window.interviewSessionsManager.createNewSession()" style="margin-top: 1rem;">
                        <i class="fa-solid fa-plus"></i>
                        إنشاء جلسة جديدة
                    </button>
                </div>
            `;
            return;
        }

        let html = '<div class="applications-cards-grid">';

        for (const session of allSessions) {
            const stats = await getSessionStats(session.id);
            const date = new Date(session.session_date).toLocaleDateString('ar-SA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const typeIcons = {
                'online': 'fa-video',
                'in_person': 'fa-building',
                'phone': 'fa-phone'
            };

            const typeLabels = {
                'online': 'أونلاين',
                'in_person': 'حضوري',
                'phone': 'هاتفي'
            };

            const statusBadge = session.is_active 
                ? '<span class="badge badge-success">نشط</span>'
                : '<span class="badge badge-secondary">معطل</span>';

            // تحويل الوقت إلى نظام 12 ساعة
            const startTime = new Date(`2000-01-01 ${session.start_time}`).toLocaleTimeString('ar-SA', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
            const endTime = new Date(`2000-01-01 ${session.end_time}`).toLocaleTimeString('ar-SA', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });

            const bookingPercentage = stats.total_slots > 0 
                ? Math.round((stats.booked_slots / stats.total_slots) * 100) 
                : 0;

            html += `
                <div class="application-card">
                    <div class="application-card-header">
                        <div class="applicant-info">
                            <div class="applicant-avatar">
                                <i class="fa-solid ${typeIcons[session.interview_type] || 'fa-calendar'}"></i>
                            </div>
                            <div class="applicant-details">
                                <h3 class="applicant-name">${escapeHtml(session.session_name)}</h3>
                                <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                                    ${statusBadge}
                                    <span class="badge badge-info">${typeLabels[session.interview_type] || session.interview_type}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="application-card-body">
                        ${session.session_description ? `
                            <div style="padding: 0.75rem; background: #f8fafc; border-radius: 8px; margin-bottom: 1rem; border-right: 3px solid var(--accent-blue);">
                                <p style="margin: 0; color: #64748b; font-size: 0.9rem; line-height: 1.5;">
                                    <i class="fa-solid fa-quote-right" style="color: var(--accent-blue); margin-left: 0.5rem;"></i>
                                    ${escapeHtml(session.session_description)}
                                </p>
                            </div>
                        ` : ''}
                        
                        <div class="application-info-grid">
                            <div class="info-item">
                                <i class="fa-solid fa-calendar-day"></i>
                                <div class="info-content">
                                    <span class="info-label">تاريخ الجلسة</span>
                                    <span class="info-value">${date}</span>
                                </div>
                            </div>
                            
                            <div class="info-item">
                                <i class="fa-solid fa-clock"></i>
                                <div class="info-content">
                                    <span class="info-label">الوقت</span>
                                    <span class="info-value">${startTime} - ${endTime}</span>
                                </div>
                            </div>
                            
                            <div class="info-item">
                                <i class="fa-solid fa-list-ol"></i>
                                <div class="info-content">
                                    <span class="info-label">إجمالي الفترات</span>
                                    <span class="info-value">${stats.total_slots} فترة</span>
                                </div>
                            </div>
                            
                            <div class="info-item">
                                <i class="fa-solid fa-check-circle"></i>
                                <div class="info-content">
                                    <span class="info-label">الفترات المحجوزة</span>
                                    <span class="info-value">${stats.booked_slots} من ${stats.total_slots}</span>
                                </div>
                            </div>
                            
                            <div class="info-item full-width">
                                <i class="fa-solid fa-chart-line"></i>
                                <div class="info-content">
                                    <span class="info-label">نسبة الحجز</span>
                                    <div style="margin-top: 0.5rem;">
                                        <div style="background: #e2e8f0; border-radius: 20px; height: 8px; overflow: hidden;">
                                            <div style="background: linear-gradient(135deg, #10b981, #059669); height: 100%; width: ${bookingPercentage}%; transition: width 0.3s ease;"></div>
                                        </div>
                                        <span class="info-value" style="margin-top: 0.25rem; display: block;">${bookingPercentage}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="application-card-footer">
                        <div class="card-actions-grid" style="grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));">
                            <button class="btn-action btn-action-primary" onclick="window.interviewSessionsManager.viewSession('${session.id}')" title="عرض التفاصيل">
                                <i class="fa-solid fa-eye"></i>
                                عرض
                            </button>
                            <button class="btn-action btn-action-warning" onclick="window.interviewSessionsManager.editSession('${session.id}')" title="تعديل الجلسة">
                                <i class="fa-solid fa-pen-to-square"></i>
                                تعديل
                            </button>
                            ${session.interview_type === 'online' ? `
                                <button class="btn-action" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white;" onclick="window.interviewSessionsManager.updateMeetingLink('${session.id}')" title="تحديث رابط المقابلة">
                                    <i class="fa-solid fa-video"></i>
                                    الرابط
                                </button>
                            ` : ''}
                            <button class="btn-action" style="background: linear-gradient(135deg, #06b6d4, #0891b2); color: white;" onclick="window.interviewSessionsManager.copyLink('${session.public_link_token}')" title="نسخ رابط الحجز">
                                <i class="fa-solid fa-link"></i>
                                نسخ
                            </button>
                            <button class="btn-action ${session.is_active ? 'btn-action-warning' : 'btn-action-success'}" onclick="window.interviewSessionsManager.toggleSession('${session.id}', ${!session.is_active})" title="${session.is_active ? 'تعطيل' : 'تفعيل'}">
                                <i class="fa-solid fa-${session.is_active ? 'pause' : 'play'}"></i>
                                ${session.is_active ? 'تعطيل' : 'تفعيل'}
                            </button>
                            <button class="btn-action btn-action-danger" onclick="window.interviewSessionsManager.deleteSession('${session.id}')" title="حذف">
                                <i class="fa-solid fa-trash"></i>
                                حذف
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }

        html += '</div>';
        container.innerHTML = html;
    }

    /**
     * الحصول على إحصائيات جلسة
     */
    async function getSessionStats(sessionId) {
        try {
            const { data, error } = await window.sbClient
                .rpc('get_session_statistics', { p_session_id: sessionId });

            if (error) throw error;

            return data[0] || {
                total_slots: 0,
                booked_slots: 0,
                available_slots: 0,
                cancelled_slots: 0,
                booking_rate: 0
            };
        } catch (error) {
            console.error('خطأ في جلب الإحصائيات:', error);
            return {
                total_slots: 0,
                booked_slots: 0,
                available_slots: 0,
                cancelled_slots: 0,
                booking_rate: 0
            };
        }
    }

    /**
     * تحديث الإحصائيات العامة
     */
    async function updateStatistics() {
        const activeSessions = allSessions.filter(s => s.is_active).length;
        let totalSlots = 0;
        let bookedSlots = 0;

        for (const session of allSessions) {
            const stats = await getSessionStats(session.id);
            totalSlots += stats.total_slots;
            bookedSlots += stats.booked_slots;
        }

        const bookingRate = totalSlots > 0 ? ((bookedSlots / totalSlots) * 100).toFixed(1) : 0;

        document.getElementById('activeSessionsCount').textContent = activeSessions;
        document.getElementById('totalSlotsCount').textContent = totalSlots;
        document.getElementById('bookedSlotsCount').textContent = bookedSlots;
        document.getElementById('bookingRate').textContent = `${bookingRate}%`;
    }

    /**
     * إنشاء جلسة جديدة
     */
    async function createNewSession() {
        const formHtml = `
            <div class="form-group">
                <label>اسم الجلسة <span class="required">*</span></label>
                <input type="text" id="session-name" class="form-input" placeholder="مثال: مقابلات لجنة الإعلام">
            </div>
            <div class="form-group">
                <label>الوصف (اختياري)</label>
                <textarea id="session-description" class="form-textarea" placeholder="وصف مختصر للجلسة"></textarea>
            </div>
            <div class="form-group">
                <label>تاريخ الجلسة <span class="required">*</span></label>
                <input type="date" id="session-date" class="form-input">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>وقت البداية <span class="required">*</span></label>
                    <input type="time" id="session-start" class="form-input">
                </div>
                <div class="form-group">
                    <label>وقت النهاية <span class="required">*</span></label>
                    <input type="time" id="session-end" class="form-input">
                </div>
            </div>
            <div class="form-group">
                <label>مدة كل مقابلة (بالدقائق) <span class="required">*</span></label>
                <input type="number" id="session-duration" class="form-input" min="5" max="60" value="15">
                <span class="form-hint">سيتم تقسيم الوقت بين البداية والنهاية إلى فترات بهذه المدة</span>
            </div>
            <div class="form-group">
                <label>نوع المقابلة <span class="required">*</span></label>
                <select id="session-type" class="form-select">
                    <option value="online">أونلاين</option>
                    <option value="in_person">حضوري</option>
                    <option value="phone">هاتفي</option>
                </select>
            </div>
            <div class="form-group" id="meeting-link-group">
                <label>رابط الاجتماع (للمقابلات الأونلاين)</label>
                <input type="url" id="session-link" class="form-input" placeholder="https://meet.google.com/xxx">
            </div>
            <div class="form-group" id="location-group" style="display: none;">
                <label>الموقع (للمقابلات الحضورية)</label>
                <input type="text" id="session-location" class="form-input" placeholder="مثال: مبنى النادي، الطابق الثاني">
            </div>
        `;

        const actionsHtml = `
            <button class="modal-btn modal-btn-primary" onclick="window.interviewSessionsManager.submitNewSession()">
                <i class="fa-solid fa-check"></i>
                إنشاء الجلسة
            </button>
            <button class="modal-btn modal-btn-secondary" onclick="window.closeFormModal()" style="background: #e2e8f0; color: #475569;">
                <i class="fa-solid fa-times"></i>
                إلغاء
            </button>
        `;

        document.getElementById('formModalContent').innerHTML = formHtml;
        document.getElementById('formModalActions').innerHTML = actionsHtml;
        window.setFormModalTitle('إنشاء جلسة مقابلات جديدة', 'fa-plus-circle');
        window.openFormModal();

        // إضافة مستمع لتغيير نوع المقابلة
        setTimeout(() => {
            const typeSelect = document.getElementById('session-type');
            const linkGroup = document.getElementById('meeting-link-group');
            const locationGroup = document.getElementById('location-group');

            if (typeSelect && linkGroup && locationGroup) {
                typeSelect.addEventListener('change', () => {
                    if (typeSelect.value === 'online') {
                        linkGroup.style.display = 'block';
                        locationGroup.style.display = 'none';
                    } else if (typeSelect.value === 'in_person') {
                        linkGroup.style.display = 'none';
                        locationGroup.style.display = 'block';
                    } else {
                        linkGroup.style.display = 'none';
                        locationGroup.style.display = 'none';
                    }
                });
            }
        }, 100);
    }

    /**
     * إرسال بيانات الجلسة الجديدة
     */
    async function submitNewSession() {
        try {
            const name = document.getElementById('session-name').value.trim();
            const description = document.getElementById('session-description').value.trim();
            const date = document.getElementById('session-date').value;
            const startTime = document.getElementById('session-start').value;
            const endTime = document.getElementById('session-end').value;
            const duration = document.getElementById('session-duration').value;
            const type = document.getElementById('session-type').value;
            const link = document.getElementById('session-link').value.trim();
            const location = document.getElementById('session-location').value.trim();

            if (!name || !date || !startTime || !endTime || !duration) {
                showNotification('يرجى ملء جميع الحقول المطلوبة', 'warning');
                return;
            }

            if (startTime >= endTime) {
                showNotification('وقت النهاية يجب أن يكون بعد وقت البداية', 'warning');
                return;
            }

            const { data, error } = await window.sbClient
                .from('interview_sessions')
                .insert({
                    session_name: name,
                    session_description: description || null,
                    session_date: date,
                    start_time: startTime,
                    end_time: endTime,
                    slot_duration: parseInt(duration),
                    interview_type: type,
                    meeting_link: type === 'online' ? link : null,
                    interview_location: type === 'in_person' ? location : null,
                    is_active: true
                })
                .select()
                .single();

            if (error) throw error;

            showNotification('تم إنشاء الجلسة بنجاح', 'success');
            window.closeFormModal();
            await loadSessions();

        } catch (error) {
            console.error('خطأ في إنشاء الجلسة:', error);
            showNotification('خطأ في إنشاء الجلسة', 'error');
        }
    }

    /**
     * عرض تفاصيل جلسة
     */
    async function viewSession(sessionId) {
        try {
            const session = allSessions.find(s => s.id === sessionId);
            if (!session) return;

            const stats = await getSessionStats(sessionId);

            const { data: slots, error: slotsError } = await window.sbClient
                .from('interview_slots')
                .select(`
                    *,
                    booked_by_app:membership_applications!booked_by(full_name, email, preferred_committee)
                `)
                .eq('session_id', sessionId)
                .order('slot_time', { ascending: true });

            if (slotsError) throw slotsError;

            const sessionDate = new Date(session.session_date).toLocaleDateString('ar-SA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const startTime = new Date(`2000-01-01 ${session.start_time}`).toLocaleTimeString('ar-SA', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });

            const endTime = new Date(`2000-01-01 ${session.end_time}`).toLocaleTimeString('ar-SA', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });

            const bookingLink = `${window.location.origin}/booking.html?token=${session.public_link_token}`;

            const typeBadge = session.interview_type === 'online' 
                ? '<span class="badge badge-primary">أونلاين</span>'
                : session.interview_type === 'in_person'
                ? '<span class="badge badge-info">حضوري</span>'
                : '<span class="badge badge-secondary">هاتفي</span>';

            const statusBadge = session.is_active
                ? '<span class="badge badge-success">نشطة</span>'
                : '<span class="badge badge-secondary">معطلة</span>';

            let slotsTableHtml = '';
            if (slots && slots.length > 0) {
                slotsTableHtml = `
                    <div style="max-height: 300px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead style="position: sticky; top: 0; background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                                <tr>
                                    <th style="padding: 0.75rem; text-align: right;">الوقت</th>
                                    <th style="padding: 0.75rem; text-align: center;">الحالة</th>
                                    <th style="padding: 0.75rem; text-align: right;">المتقدم</th>
                                </tr>
                            </thead>
                            <tbody>
                `;

                slots.forEach(slot => {
                    const time = new Date(slot.slot_time).toLocaleTimeString('ar-SA', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                    });

                    const status = slot.is_booked
                        ? '<span class="badge badge-danger">محجوز</span>'
                        : '<span class="badge badge-success">متاح</span>';

                    const applicant = slot.booked_by_app
                        ? `${escapeHtml(slot.booked_by_app.full_name)}<br><small style="color: #64748b;">${escapeHtml(slot.booked_by_app.preferred_committee)}</small>`
                        : '-';

                    slotsTableHtml += `
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 0.75rem;">${time}</td>
                            <td style="padding: 0.75rem; text-align: center;">${status}</td>
                            <td style="padding: 0.75rem;">${applicant}</td>
                        </tr>
                    `;
                });

                slotsTableHtml += '</tbody></table></div>';
            } else {
                slotsTableHtml = '<p style="text-align: center; color: #64748b; padding: 2rem;">لا توجد فترات زمنية</p>';
            }

            const contentHtml = `
                <div class="detail-section">
                    <div class="detail-section-header">
                        <i class="fa-solid fa-calendar-days"></i>
                        <h3>معلومات الجلسة</h3>
                    </div>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <div class="detail-label">
                                <i class="fa-solid fa-calendar"></i>
                                التاريخ
                            </div>
                            <div class="detail-value">${sessionDate}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">
                                <i class="fa-solid fa-clock"></i>
                                الوقت
                            </div>
                            <div class="detail-value">${startTime} - ${endTime}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">
                                <i class="fa-solid fa-hourglass-half"></i>
                                مدة المقابلة
                            </div>
                            <div class="detail-value">${session.slot_duration} دقيقة</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">
                                <i class="fa-solid fa-video"></i>
                                النوع
                            </div>
                            <div class="detail-value">${typeBadge}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">
                                <i class="fa-solid fa-flag"></i>
                                الحالة
                            </div>
                            <div class="detail-value">${statusBadge}</div>
                        </div>
                        ${session.interview_location ? `
                            <div class="detail-item">
                                <div class="detail-label">
                                    <i class="fa-solid fa-location-dot"></i>
                                    الموقع
                                </div>
                                <div class="detail-value">${escapeHtml(session.interview_location)}</div>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <div class="detail-section">
                    <div class="detail-section-header">
                        <i class="fa-solid fa-chart-pie"></i>
                        <h3>الإحصائيات</h3>
                    </div>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <div class="detail-label">
                                <i class="fa-solid fa-list"></i>
                                إجمالي الفترات
                            </div>
                            <div class="detail-value"><strong>${stats.total_slots}</strong></div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">
                                <i class="fa-solid fa-check"></i>
                                المحجوز
                            </div>
                            <div class="detail-value" style="color: #ef4444; font-weight: 600;">${stats.booked_slots}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">
                                <i class="fa-solid fa-calendar-check"></i>
                                المتاح
                            </div>
                            <div class="detail-value" style="color: #10b981; font-weight: 600;">${stats.available_slots}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">
                                <i class="fa-solid fa-percent"></i>
                                نسبة الحجز
                            </div>
                            <div class="detail-value" style="color: var(--accent-blue); font-weight: 600;">${stats.booking_rate}%</div>
                        </div>
                    </div>
                </div>

                <div class="detail-section">
                    <div class="detail-section-header">
                        <i class="fa-solid fa-link"></i>
                        <h3>رابط الحجز</h3>
                    </div>
                    <div style="display: flex; gap: 0.75rem; align-items: center;">
                        <input type="text" value="${bookingLink}" readonly 
                            style="flex: 1; padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.875rem;"
                            onclick="this.select()">
                        <button class="modal-btn modal-btn-primary" 
                            onclick="navigator.clipboard.writeText('${bookingLink}'); window.interviewSessionsManager.copyLinkNotification();" 
                            style="white-space: nowrap;">
                            <i class="fa-solid fa-copy"></i>
                            نسخ
                        </button>
                    </div>
                </div>

                <div class="detail-section">
                    <div class="detail-section-header">
                        <i class="fa-solid fa-clock"></i>
                        <h3>الفترات الزمنية (${slots ? slots.length : 0})</h3>
                    </div>
                    ${slotsTableHtml}
                </div>
            `;

            document.getElementById('applicationDetailsContent').innerHTML = contentHtml;
            document.getElementById('applicationDetailsActions').innerHTML = '';
            window.setModalTitle(session.session_name);
            window.openApplicationModal();

        } catch (error) {
            console.error('خطأ في عرض تفاصيل الجلسة:', error);
            showNotification('خطأ في عرض التفاصيل', 'error');
        }
    }

    /**
     * نسخ رابط الحجز
     */
    function copyLink(token) {
        const link = `${window.location.origin}/booking.html?token=${token}`;
        navigator.clipboard.writeText(link).then(() => {
            showNotification('تم نسخ رابط الحجز', 'success');
        }).catch(() => {
            showNotification('فشل نسخ الرابط', 'error');
        });
    }

    /**
     * تفعيل/تعطيل جلسة
     */
    async function toggleSession(sessionId, isActive) {
        try {
            const { error } = await window.sbClient
                .from('interview_sessions')
                .update({ is_active: isActive })
                .eq('id', sessionId);

            if (error) throw error;

            showNotification(isActive ? 'تم تفعيل الجلسة' : 'تم تعطيل الجلسة', 'success');
            await loadSessions();

        } catch (error) {
            console.error('خطأ في تحديث الجلسة:', error);
            showNotification('خطأ في تحديث حالة الجلسة', 'error');
        }
    }

    /**
     * تعديل جلسة
     */
    async function editSession(sessionId) {
        const session = allSessions.find(s => s.id === sessionId);
        if (!session) return;

        const formHtml = `
            <input type="hidden" id="edit-session-id" value="${sessionId}">
            <div class="form-group">
                <label>اسم الجلسة <span class="required">*</span></label>
                <input type="text" id="session-name" class="form-input" value="${escapeHtml(session.session_name)}">
            </div>
            <div class="form-group">
                <label>الوصف (اختياري)</label>
                <textarea id="session-description" class="form-textarea">${escapeHtml(session.session_description || '')}</textarea>
            </div>
            <div class="form-group">
                <label>تاريخ الجلسة <span class="required">*</span></label>
                <input type="date" id="session-date" class="form-input" value="${session.session_date}">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>وقت البداية <span class="required">*</span></label>
                    <input type="time" id="session-start" class="form-input" value="${session.start_time}">
                </div>
                <div class="form-group">
                    <label>وقت النهاية <span class="required">*</span></label>
                    <input type="time" id="session-end" class="form-input" value="${session.end_time}">
                </div>
            </div>
            <div class="form-group">
                <label>مدة كل مقابلة (بالدقائق) <span class="required">*</span></label>
                <input type="number" id="session-duration" class="form-input" min="5" max="60" value="${session.slot_duration}">
            </div>
            <div class="form-group">
                <label>نوع المقابلة <span class="required">*</span></label>
                <select id="session-type" class="form-select">
                    <option value="online" ${session.interview_type === 'online' ? 'selected' : ''}>أونلاين</option>
                    <option value="in_person" ${session.interview_type === 'in_person' ? 'selected' : ''}>حضوري</option>
                    <option value="phone" ${session.interview_type === 'phone' ? 'selected' : ''}>هاتفي</option>
                </select>
            </div>
            <div class="form-group" id="meeting-link-group" style="display: ${session.interview_type === 'online' ? 'block' : 'none'};">
                <label>رابط الاجتماع</label>
                <input type="url" id="session-link" class="form-input" value="${session.meeting_link || ''}">
            </div>
            <div class="form-group" id="location-group" style="display: ${session.interview_type === 'in_person' ? 'block' : 'none'};">
                <label>الموقع</label>
                <input type="text" id="session-location" class="form-input" value="${session.interview_location || ''}">
            </div>
        `;

        const actionsHtml = `
            <button class="modal-btn modal-btn-primary" onclick="window.interviewSessionsManager.submitEditSession()">
                <i class="fa-solid fa-save"></i>
                حفظ التعديلات
            </button>
            <button class="modal-btn modal-btn-secondary" onclick="window.closeFormModal()" style="background: #e2e8f0; color: #475569;">
                <i class="fa-solid fa-times"></i>
                إلغاء
            </button>
        `;

        document.getElementById('formModalContent').innerHTML = formHtml;
        document.getElementById('formModalActions').innerHTML = actionsHtml;
        window.setFormModalTitle('تعديل جلسة المقابلات', 'fa-edit');
        window.openFormModal();

        setTimeout(() => {
            const typeSelect = document.getElementById('session-type');
            const linkGroup = document.getElementById('meeting-link-group');
            const locationGroup = document.getElementById('location-group');

            if (typeSelect && linkGroup && locationGroup) {
                typeSelect.addEventListener('change', () => {
                    if (typeSelect.value === 'online') {
                        linkGroup.style.display = 'block';
                        locationGroup.style.display = 'none';
                    } else if (typeSelect.value === 'in_person') {
                        linkGroup.style.display = 'none';
                        locationGroup.style.display = 'block';
                    } else {
                        linkGroup.style.display = 'none';
                        locationGroup.style.display = 'none';
                    }
                });
            }
        }, 100);
    }

    async function submitEditSession() {
        try {
            const sessionId = document.getElementById('edit-session-id').value;
            const name = document.getElementById('session-name').value.trim();
            const description = document.getElementById('session-description').value.trim();
            const date = document.getElementById('session-date').value;
            const startTime = document.getElementById('session-start').value;
            const endTime = document.getElementById('session-end').value;
            const duration = document.getElementById('session-duration').value;
            const type = document.getElementById('session-type').value;
            const link = document.getElementById('session-link').value.trim();
            const location = document.getElementById('session-location').value.trim();

            if (!name || !date || !startTime || !endTime || !duration) {
                showNotification('يرجى ملء جميع الحقول المطلوبة', 'warning');
                return;
            }

            if (startTime >= endTime) {
                showNotification('وقت النهاية يجب أن يكون بعد وقت البداية', 'warning');
                return;
            }

            const { error } = await window.sbClient
                .from('interview_sessions')
                .update({
                    session_name: name,
                    session_description: description || null,
                    session_date: date,
                    start_time: startTime,
                    end_time: endTime,
                    slot_duration: parseInt(duration),
                    interview_type: type,
                    meeting_link: type === 'online' ? link : null,
                    interview_location: type === 'in_person' ? location : null
                })
                .eq('id', sessionId);

            if (error) throw error;

            showNotification('تم تحديث الجلسة بنجاح', 'success');
            window.closeFormModal();
            await loadSessions();

        } catch (error) {
            console.error('خطأ في تعديل الجلسة:', error);
            showNotification('خطأ في تحديث الجلسة', 'error');
        }

    }

    /**
     * تحديث رابط المقابلة
     */
    async function updateMeetingLink(sessionId) {
        const session = allSessions.find(s => s.id === sessionId);
        if (!session) return;

        if (session.interview_type !== 'online') {
            showNotification('هذه الميزة متاحة فقط للمقابلات الأونلاين', 'warning');
            return;
        }

        const formHtml = `
            <input type="hidden" id="update-session-id" value="${sessionId}">
            <div class="form-group">
                <label>الرابط الحالي</label>
                <input type="text" class="form-input" value="${session.meeting_link || 'لا يوجد'}" disabled>
            </div>
            <div class="form-group">
                <label>الرابط الجديد <span class="required">*</span></label>
                <input type="url" id="new-meeting-link" class="form-input" placeholder="https://meet.google.com/xxx">
                <span class="form-hint">أدخل رابط Zoom أو Google Meet أو Teams</span>
            </div>
        `;

        const actionsHtml = `
            <button class="modal-btn modal-btn-primary" onclick="window.interviewSessionsManager.submitUpdateLink()">
                <i class="fa-solid fa-check"></i>
                تحديث الرابط
            </button>
            <button class="modal-btn modal-btn-secondary" onclick="window.closeFormModal()" style="background: #e2e8f0; color: #475569;">
                <i class="fa-solid fa-times"></i>
                إلغاء
            </button>
        `;

        document.getElementById('formModalContent').innerHTML = formHtml;
        document.getElementById('formModalActions').innerHTML = actionsHtml;
        window.setFormModalTitle('تحديث رابط المقابلة', 'fa-link');
        window.openFormModal();
    }

    async function submitUpdateLink() {
        try {
            const sessionId = document.getElementById('update-session-id').value;
            const newLink = document.getElementById('new-meeting-link').value.trim();

            if (!newLink) {
                showNotification('يرجى إدخال رابط المقابلة', 'warning');
                return;
            }

            try {
                new URL(newLink);
            } catch (e) {
                showNotification('الرابط غير صحيح. يرجى إدخال رابط صحيح', 'warning');
                return;
            }

            const { error } = await window.sbClient
                .from('interview_sessions')
                .update({ meeting_link: newLink })
                .eq('id', sessionId);

            if (error) throw error;

            showNotification('تم تحديث رابط المقابلة بنجاح', 'success');
            window.closeFormModal();
            await loadSessions();

        } catch (error) {
            console.error('خطأ في تحديث رابط المقابلة:', error);
            showNotification('خطأ في تحديث الرابط', 'error');
        }
    }

    /**
     * حذف جلسة
     */
    async function deleteSession(sessionId) {
        const session = allSessions.find(s => s.id === sessionId);
        if (!session) return;

        const contentHtml = `
            <div style="text-align: center; padding: 1rem;">
                <i class="fa-solid fa-triangle-exclamation" style="font-size: 3rem; color: #f59e0b; margin-bottom: 1rem;"></i>
                <p style="font-size: 1.1rem; margin-bottom: 0.5rem; font-weight: 600;">هل أنت متأكد من حذف هذه الجلسة؟</p>
                <p style="color: #64748b; margin-bottom: 1rem;">${escapeHtml(session.session_name)}</p>
                <p style="color: #ef4444; font-size: 0.9rem;">⚠️ سيتم حذف جميع الفترات والحجوزات المرتبطة بها</p>
                <input type="hidden" id="delete-session-id" value="${sessionId}">
            </div>
        `;

        const actionsHtml = `
            <button class="modal-btn modal-btn-danger" onclick="window.interviewSessionsManager.confirmDelete()">
                <i class="fa-solid fa-trash"></i>
                نعم، احذف
            </button>
            <button class="modal-btn modal-btn-secondary" onclick="window.closeConfirmModal()" style="background: #e2e8f0; color: #475569;">
                <i class="fa-solid fa-times"></i>
                إلغاء
            </button>
        `;

        document.getElementById('confirmModalContent').innerHTML = contentHtml;
        document.getElementById('confirmModalActions').innerHTML = actionsHtml;
        window.setConfirmModalTitle('تأكيد الحذف', 'fa-triangle-exclamation');
        window.openConfirmModal();
    }

    async function confirmDelete() {
        try {
            const sessionId = document.getElementById('delete-session-id').value;

            const { error } = await window.sbClient
                .from('interview_sessions')
                .delete()
                .eq('id', sessionId);

            if (error) throw error;

            showNotification('تم حذف الجلسة بنجاح', 'success');
            window.closeConfirmModal();
            await loadSessions();

        } catch (error) {
            console.error('خطأ في حذف الجلسة:', error);
            showNotification('خطأ في حذف الجلسة', 'error');
        }
    }

    /**
     * دوال مساعدة
     */
    function showLoading() {
        const container = document.getElementById('sessionsTable');
        if (container) {
            container.innerHTML = '<div style="text-align: center; padding: 2rem;"><i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem;"></i></div>';
        }
    }

    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `custom-notification custom-notification-${type}`;
        
        const icons = {
            success: 'fa-circle-check',
            error: 'fa-circle-xmark',
            warning: 'fa-triangle-exclamation',
            info: 'fa-circle-info'
        };
        
        notification.innerHTML = `
            <i class="fa-solid ${icons[type] || icons.info}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        setTimeout(() => notification.classList.add('show'), 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // دالة إشعار نسخ الرابط
    function copyLinkNotification() {
        showNotification('تم نسخ رابط الحجز', 'success');
    }

    // تصدير الوظائف
    window.interviewSessionsManager = {
        init: initInterviewSessionsManager,
        copyLinkNotification: copyLinkNotification,
        createNewSession,
        submitNewSession,
        viewSession,
        editSession,
        submitEditSession,
        updateMeetingLink,
        submitUpdateLink,
        copyLink,
        toggleSession,
        deleteSession,
        confirmDelete
    };

})();

// ============================================================================
// دوال التحكم في النوافذ المنبثقة للنماذج
// ============================================================================

/**
 * فتح نافذة النموذج
 */
window.openFormModal = function() {
    const modal = document.getElementById('formModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        const overlay = modal.querySelector('.custom-modal-overlay');
        if (overlay) {
            overlay.onclick = () => window.closeFormModal();
        }
    }
};

/**
 * إغلاق نافذة النموذج
 */
window.closeFormModal = function() {
    const modal = document.getElementById('formModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
};

/**
 * فتح نافذة التأكيد
 */
window.openConfirmModal = function() {
    const modal = document.getElementById('confirmModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
};

/**
 * إغلاق نافذة التأكيد
 */
window.closeConfirmModal = function() {
    const modal = document.getElementById('confirmModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
};

/**
 * تعيين عنوان نافذة النموذج
 */
window.setFormModalTitle = function(title, icon = 'fa-edit') {
    const titleElement = document.getElementById('formModalTitle');
    if (titleElement) {
        titleElement.innerHTML = `<i class="fa-solid ${icon}"></i>${title}`;
    }
};

/**
 * تعيين عنوان نافذة التأكيد
 */
window.setConfirmModalTitle = function(title, icon = 'fa-triangle-exclamation') {
    const titleElement = document.getElementById('confirmModalTitle');
    if (titleElement) {
        titleElement.innerHTML = `<i class="fa-solid ${icon}"></i>${title}`;
    }
};

// إضافة مستمع ESC للنوافذ
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        window.closeFormModal();
        window.closeConfirmModal();
    }
});
