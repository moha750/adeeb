// ============================================================================
// نظام إدارة جلسات المقابلات - Interview Sessions Manager
// ============================================================================

(function() {
    'use strict';

    let currentUser = null;
    let allSessions = [];

    /**
     * التحقق من انتهاء الجلسة بناءً على وقت النهاية
     * Single Source of Truth للحالة الزمنية
     */
    function isSessionExpired(session) {
        const now = new Date();
        const sessionEndDateTime = new Date(`${session.session_date}T${session.end_time}`);
        return sessionEndDateTime < now;
    }

    /**
     * التحقق من انتهاء الفترة الزمنية
     * Helper function لتوحيد منطق حساب حالة الفترة
     */
    function isSlotExpired(slotTime) {
        const now = new Date();
        const slot = new Date(slotTime);
        return slot < now;
    }

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
                    <div class="empty-state__icon"><i class="fa-solid fa-calendar-xmark"></i></div>
                    <p class="empty-state__title">لا توجد جلسات مقابلات</p>
                    <div class="empty-state__action">
                        <button class="btn btn-primary" onclick="window.interviewSessionsManager.createNewSession()">
                            <i class="fa-solid fa-plus"></i>
                            إنشاء جلسة جديدة
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        let html = '<div class="uc-grid">';

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

            // تحديد حالة الجلسة بناءً على الوقت والحالة النشطة
            const isExpired = isSessionExpired(session);
            let statusBadge;
            if (isExpired) {
                statusBadge = '<span class="uc-card__badge uc-card__badge--muted">منتهية</span>';
            } else if (session.is_active) {
                statusBadge = '<span class="uc-card__badge">نشط</span>';
            } else {
                statusBadge = '<span class="uc-card__badge uc-card__badge--muted">معطل</span>';
            }

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
                <div class="uc-card">
                    <div class="uc-card__header">
                        <div class="uc-card__header-inner">
                            <div class="uc-card__icon">
                                <i class="fa-solid ${typeIcons[session.interview_type] || 'fa-calendar'}"></i>
                            </div>
                            <div class="uc-card__header-info">
                                <h3 class="uc-card__title">${escapeHtml(session.session_name)}</h3>
                                <div>
                                    ${statusBadge}
                                    <span class="uc-card__badge">${typeLabels[session.interview_type] || session.interview_type}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="uc-card__body">
                        <div class="uc-card__info-item">
                                <div class="uc-card__info-icon"><i class="fa-solid fa-quote-right"></i></div>
                                <div class="uc-card__info-content">
                                    <span class="uc-card__info-label">الوصف</span>
                                    <span class="uc-card__info-value${session.session_description ? '' : ' text-muted'}">${session.session_description ? escapeHtml(session.session_description) : 'لا يوجد وصف'}</span>
                                </div>
                            </div>

                            <div class="uc-card__info-item">
                                <div class="uc-card__info-icon"><i class="fa-solid fa-calendar-day"></i></div>
                                <div class="uc-card__info-content">
                                    <span class="uc-card__info-label">تاريخ الجلسة</span>
                                    <span class="uc-card__info-value">${date}</span>
                                </div>
                            </div>

                            <div class="uc-card__info-item">
                                <div class="uc-card__info-icon"><i class="fa-solid fa-clock"></i></div>
                                <div class="uc-card__info-content">
                                    <span class="uc-card__info-label">الوقت</span>
                                    <span class="uc-card__info-value">${startTime} - ${endTime}</span>
                                </div>
                            </div>

                            <div class="uc-card__info-item">
                                <div class="uc-card__info-icon"><i class="fa-solid fa-list-ol"></i></div>
                                <div class="uc-card__info-content">
                                    <span class="uc-card__info-label">إجمالي الفترات</span>
                                    <span class="uc-card__info-value">${stats.total_slots} فترة</span>
                                </div>
                            </div>

                            <div class="uc-card__info-item">
                                <div class="uc-card__info-icon"><i class="fa-solid fa-check-circle"></i></div>
                                <div class="uc-card__info-content">
                                    <span class="uc-card__info-label">الفترات المحجوزة</span>
                                    <span class="uc-card__info-value">${stats.booked_slots} من ${stats.total_slots}</span>
                                </div>
                            </div>

                            <div class="uc-card__info-item">
                                <div class="uc-card__info-icon"><i class="fa-solid fa-chart-line"></i></div>
                                <div class="uc-card__info-content">
                                    <span class="uc-card__info-label">نسبة الحجز</span>
                                    <div>
                                        <div>
                                            <div></div>
                                        </div>
                                        <span class="uc-card__info-value">${bookingPercentage}%</span>
                                    </div>
                                </div>
                            </div>
                    </div>

                    <div class="uc-card__footer">
                            <button class="btn btn-primary" onclick="window.interviewSessionsManager.viewSession('${session.id}')" title="عرض التفاصيل">
                                <i class="fa-solid fa-eye"></i>
                                عرض
                            </button>
                            <button class="btn btn-warning" onclick="window.interviewSessionsManager.editSession('${session.id}')" title="تعديل الجلسة">
                                <i class="fa-solid fa-pen-to-square"></i>
                                تعديل
                            </button>
                            ${session.interview_type === 'online' ? `
                                <button class="btn btn-secondary" onclick="window.interviewSessionsManager.updateMeetingLink('${session.id}')" title="تحديث رابط المقابلة">
                                    <i class="fa-solid fa-video"></i>
                                    الرابط
                                </button>
                            ` : ''}
                            <button class="btn btn-secondary" onclick="window.interviewSessionsManager.copyLink('${session.public_link_token}')" title="نسخ رابط الحجز">
                                <i class="fa-solid fa-link"></i>
                                نسخ
                            </button>
                            <button class="btn ${session.is_active ? 'btn-secondary' : 'btn-success'}" onclick="window.interviewSessionsManager.toggleSession('${session.id}', ${!session.is_active})" title="${session.is_active ? 'تعطيل' : 'تفعيل'}">
                                <i class="fa-solid fa-${session.is_active ? 'pause' : 'play'}"></i>
                                ${session.is_active ? 'تعطيل' : 'تفعيل'}
                            </button>
                            <button class="btn btn-danger" onclick="window.interviewSessionsManager.deleteSession('${session.id}')" title="حذف">
                                <i class="fa-solid fa-trash"></i>
                                حذف
                            </button>
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
        const container = document.getElementById('sessionsStatsGrid');
        if (!container) return;

        // فصل الجلسات النشطة عن المنتهية
        const activeNonExpiredSessions = allSessions.filter(s => s.is_active && !isSessionExpired(s));
        const expiredSessions = allSessions.filter(s => isSessionExpired(s));
        
        let totalSlots = 0;
        let bookedSlots = 0;

        // احتساب الفترات للجلسات النشطة غير المنتهية فقط
        for (const session of activeNonExpiredSessions) {
            const stats = await getSessionStats(session.id);
            totalSlots += stats.total_slots;
            bookedSlots += stats.booked_slots;
        }

        const bookingRate = totalSlots > 0 ? ((bookedSlots / totalSlots) * 100).toFixed(1) : 0;

        container.className = 'stats-grid';
        container.innerHTML = `
            <div class="stat-card" style="--stat-color: #3b82f6;">
                <div class="stat-card-wrapper">
                    <div class="stat-icon">
                        <i class="fa-solid fa-calendar-check"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${activeNonExpiredSessions.length}</div>
                        <div class="stat-label">الجلسات النشطة</div>
                    </div>
                </div>
            </div>
            <div class="stat-card" style="--stat-color: #10b981;">
                <div class="stat-card-wrapper">
                    <div class="stat-icon">
                        <i class="fa-solid fa-clock"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${totalSlots}</div>
                        <div class="stat-label">إجمالي الفترات</div>
                    </div>
                </div>
            </div>
            <div class="stat-card" style="--stat-color: #8b5cf6;">
                <div class="stat-card-wrapper">
                    <div class="stat-icon">
                        <i class="fa-solid fa-user-check"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${bookedSlots}</div>
                        <div class="stat-label">الفترات المحجوزة</div>
                    </div>
                </div>
            </div>
            <div class="stat-card" style="--stat-color: #f59e0b;">
                <div class="stat-badge"><i class="fa-solid fa-percentage"></i> ${bookingRate}%</div>
                <div class="stat-card-wrapper">
                    <div class="stat-icon">
                        <i class="fa-solid fa-chart-line"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${bookingRate}%</div>
                        <div class="stat-label">معدل الحجز</div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * إنشاء جلسة جديدة
     */
    async function createNewSession() {
        const fields = [
            {
                id: 'session-name',
                label: 'اسم الجلسة',
                type: 'text',
                icon: 'fa-heading',
                placeholder: 'مثال: مقابلات لجنة الإعلام',
                required: true,
                fullWidth: true
            },
            {
                id: 'session-description',
                label: 'الوصف (اختياري)',
                type: 'textarea',
                icon: 'fa-align-right',
                placeholder: 'وصف مختصر للجلسة',
                rows: 3
            },
            {
                id: 'session-date',
                label: 'تاريخ الجلسة',
                type: 'date',
                icon: 'fa-calendar',
                required: true
            },
            {
                id: 'session-start',
                label: 'وقت البداية',
                type: 'time',
                icon: 'fa-clock',
                required: true
            },
            {
                id: 'session-end',
                label: 'وقت النهاية',
                type: 'time',
                icon: 'fa-clock',
                required: true
            },
            {
                id: 'session-duration',
                label: 'مدة كل مقابلة (بالدقائق)',
                type: 'number',
                icon: 'fa-hourglass-half',
                value: '15',
                required: true
            },
            {
                id: 'session-type',
                label: 'نوع المقابلة',
                type: 'select',
                icon: 'fa-list-check',
                options: [
                    { value: 'online', label: 'أونلاين' },
                    { value: 'in_person', label: 'حضوري' },
                    { value: 'phone', label: 'هاتفي' }
                ],
                required: true
            },
            {
                id: 'session-link',
                label: 'رابط الاجتماع (للمقابلات الأونلاين)',
                type: 'url',
                icon: 'fa-link',
                placeholder: 'https://meet.google.com/xxx',
                fullWidth: true
            },
            {
                id: 'session-location',
                label: 'الموقع (للمقابلات الحضورية)',
                type: 'text',
                icon: 'fa-location-dot',
                placeholder: 'مثال: مبنى النادي، الطابق الثاني',
                fullWidth: true
            }
        ];

        window.openFormModal('إنشاء جلسة مقابلات جديدة', fields, submitNewSession, {
            icon: 'fa-plus-circle',
            submitText: 'إنشاء الجلسة'
        });

        // إضافة مستمع لتغيير نوع المقابلة
        setTimeout(() => {
            const typeSelect = document.getElementById('session-type');
            const linkGroup = document.getElementById('session-link')?.closest('.form-group');
            const locationGroup = document.getElementById('session-location')?.closest('.form-group');

            if (!typeSelect || !linkGroup || !locationGroup) return;

            function toggleFields() {
                const val = typeSelect.value;
                linkGroup.style.display = val === 'online' ? '' : 'none';
                locationGroup.style.display = val === 'in_person' ? '' : 'none';
            }

            toggleFields();
            typeSelect.addEventListener('change', toggleFields);
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

            // التحقق من الحقول المطلوبة
            if (!name || !date || !startTime || !endTime || !duration) {
                showNotification('يرجى ملء جميع الحقول المطلوبة', 'warning');
                return;
            }

            // التحقق من صحة الوقت
            if (startTime >= endTime) {
                showNotification('وقت النهاية يجب أن يكون بعد وقت البداية', 'warning');
                return;
            }

            // التحقق من أن التاريخ ليس في الماضي
            const selectedDateTime = new Date(`${date}T${startTime}`);
            const now = new Date();
            if (selectedDateTime < now) {
                Toast.error('لا يمكن جدولة مقابلة في وقت سابق للوقت الحالي');
                return;
            }

            // التحقق من رابط الاجتماع للمقابلات الأونلاين
            if (type === 'online' && !link) {
                showNotification('رابط الاجتماع إلزامي للمقابلات الأونلاين', 'error');
                return;
            }

            // التحقق من صحة رابط الاجتماع
            if (type === 'online' && link) {
                try {
                    new URL(link);
                } catch (e) {
                    showNotification('يرجى إدخال رابط صحيح للاجتماع', 'error');
                    return;
                }
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
                    location: type === 'in_person' ? location : null,
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

            const bookingLink = `${window.location.origin}/booking/booking.html?token=${session.public_link_token}`;

            const typeBadge = session.interview_type === 'online' 
                ? '<span class="badge badge-primary">أونلاين</span>'
                : session.interview_type === 'in_person'
                ? '<span class="badge badge-info">حضوري</span>'
                : '<span class="badge badge-secondary">هاتفي</span>';

            // تحديد حالة الجلسة في النافذة المنبثقة
            const isExpired = isSessionExpired(session);
            let statusBadge;
            if (isExpired) {
                statusBadge = '<span class="badge badge-secondary">منتهية</span>';
            } else if (session.is_active) {
                statusBadge = '<span class="badge badge-success">نشطة</span>';
            } else {
                statusBadge = '<span class="badge badge-secondary">معطلة</span>';
            }

            let slotsTableHtml = '';
            if (slots && slots.length > 0) {
                slotsTableHtml = `
                    <table>
                        <thead>
                            <tr>
                                <th>الوقت</th>
                                <th>الحالة</th>
                                <th>المتقدم</th>
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

                    // تحديد حالة الفترة بناءً على الحجز والوقت
                    const isExpired = isSlotExpired(slot.slot_time);
                    let status;
                    if (slot.is_booked) {
                        status = '<span class="badge badge-danger">محجوز</span>';
                    } else if (isExpired) {
                        status = '<span class="badge badge-secondary">منتهية</span>';
                    } else {
                        status = '<span class="uc-card__badge">متاح</span>';
                    }

                    const applicant = slot.booked_by_app
                        ? `${escapeHtml(slot.booked_by_app.full_name)}<br><small>${escapeHtml(slot.booked_by_app.preferred_committee)}</small>`
                        : '-';

                    slotsTableHtml += `
                        <tr>
                            <td>${time}</td>
                            <td>${status}</td>
                            <td>${applicant}</td>
                        </tr>
                    `;
                });

                slotsTableHtml += '</tbody></table>';
            } else {
                slotsTableHtml = '<p>لا توجد فترات زمنية</p>';
            }

            const contentHtml = `
                <div class="modal-section">
                    <h3><i class="fa-solid fa-calendar-days"></i> معلومات الجلسة</h3>
                    <div class="modal-detail-grid">
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">التاريخ</span>
                            <span class="modal-detail-value">${sessionDate}</span>
                        </div>
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">الوقت</span>
                            <span class="modal-detail-value">${startTime} - ${endTime}</span>
                        </div>
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">مدة المقابلة</span>
                            <span class="modal-detail-value">${session.slot_duration} دقيقة</span>
                        </div>
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">النوع</span>
                            <span class="modal-detail-value">${typeBadge}</span>
                        </div>
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">الحالة</span>
                            <span class="modal-detail-value">${statusBadge}</span>
                        </div>
                        ${session.location ? `
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">الموقع</span>
                            <span class="modal-detail-value">${escapeHtml(session.location)}</span>
                        </div>
                        ` : ''}
                        ${session.session_description ? `
                        <div class="modal-detail-item" style="grid-column: 1 / -1;">
                            <span class="modal-detail-label">الوصف</span>
                            <span class="modal-detail-value">${escapeHtml(session.session_description)}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>

                <hr class="modal-divider">

                <div class="modal-section">
                    <h3><i class="fa-solid fa-chart-pie"></i> الإحصائيات</h3>
                    <div class="modal-detail-grid">
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">إجمالي الفترات</span>
                            <span class="modal-detail-value">${stats.total_slots}</span>
                        </div>
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">المحجوز</span>
                            <span class="modal-detail-value">${stats.booked_slots}</span>
                        </div>
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">المتاح</span>
                            <span class="modal-detail-value">${stats.available_slots}</span>
                        </div>
                        <div class="modal-detail-item">
                            <span class="modal-detail-label">نسبة الحجز</span>
                            <span class="modal-detail-value">${stats.booking_rate}%</span>
                        </div>
                    </div>
                </div>

                <hr class="modal-divider">

                <div class="modal-section">
                    <h3><i class="fa-solid fa-link"></i> رابط الحجز</h3>
                    <div class="modal-detail-item" style="grid-column: 1 / -1;">
                        <span class="modal-detail-label">الرابط</span>
                        <span class="modal-detail-value" style="direction:ltr;text-align:right;">${bookingLink}</span>
                        <div class="modal-detail-actions">
                            <button class="mdi-btn mdi-btn--copy" onclick="navigator.clipboard.writeText('${bookingLink}'); window.interviewSessionsManager.copyLinkNotification(this);" title="نسخ الرابط"><i class="fa-regular fa-copy"></i></button>
                        </div>
                    </div>
                </div>

                <hr class="modal-divider">

                <div class="modal-section">
                    <h3><i class="fa-solid fa-clock"></i> الفترات الزمنية (${slots ? slots.length : 0})</h3>
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
        const link = `${window.location.origin}/booking/booking.html?token=${token}`;
        navigator.clipboard.writeText(link).then(() => {
            Toast.success('تم نسخ رابط الحجز بنجاح', 'نسخ الرابط');
        }).catch(() => {
            Toast.error('فشل نسخ الرابط', 'خطأ');
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

        const showLink = session.interview_type === 'online';
        const showLocation = session.interview_type === 'in_person';

        const formHtml = `
            <input type="hidden" id="edit-session-id" value="${sessionId}">
            <div class="modal-form-grid">
                <div class="form-group full-width">
                    <label class="form-label"><span class="label-icon"><i class="fa-solid fa-heading"></i></span> اسم الجلسة <span class="required-dot">*</span></label>
                    <input type="text" id="session-name" class="form-input" value="${escapeHtml(session.session_name)}">
                </div>
                <div class="form-group full-width">
                    <label class="form-label"><span class="label-icon"><i class="fa-solid fa-align-right"></i></span> الوصف (اختياري)</label>
                    <textarea id="session-description" class="form-input form-textarea" rows="3">${escapeHtml(session.session_description || '')}</textarea>
                </div>
                <div class="form-group">
                    <label class="form-label"><span class="label-icon"><i class="fa-solid fa-calendar"></i></span> تاريخ الجلسة <span class="required-dot">*</span></label>
                    <input type="date" id="session-date" class="form-input" value="${session.session_date}">
                </div>
                <div class="form-group">
                    <label class="form-label"><span class="label-icon"><i class="fa-solid fa-hourglass-half"></i></span> مدة كل مقابلة (بالدقائق) <span class="required-dot">*</span></label>
                    <input type="number" id="session-duration" class="form-input" min="5" max="60" value="${session.slot_duration}">
                </div>
                <div class="form-group">
                    <label class="form-label"><span class="label-icon"><i class="fa-solid fa-clock"></i></span> وقت البداية <span class="required-dot">*</span></label>
                    <input type="time" id="session-start" class="form-input" value="${session.start_time}">
                </div>
                <div class="form-group">
                    <label class="form-label"><span class="label-icon"><i class="fa-solid fa-clock"></i></span> وقت النهاية <span class="required-dot">*</span></label>
                    <input type="time" id="session-end" class="form-input" value="${session.end_time}">
                </div>
                <div class="form-group full-width">
                    <label class="form-label"><span class="label-icon"><i class="fa-solid fa-list"></i></span> نوع المقابلة <span class="required-dot">*</span></label>
                    <select id="session-type" class="form-select">
                        <option value="online" ${session.interview_type === 'online' ? 'selected' : ''}>أونلاين</option>
                        <option value="in_person" ${session.interview_type === 'in_person' ? 'selected' : ''}>حضوري</option>
                        <option value="phone" ${session.interview_type === 'phone' ? 'selected' : ''}>هاتفي</option>
                    </select>
                </div>
                <div class="form-group full-width" id="meeting-link-group" style="display:${showLink ? '' : 'none'}">
                    <label class="form-label"><span class="label-icon"><i class="fa-solid fa-link"></i></span> رابط الاجتماع</label>
                    <input type="url" id="session-link" class="form-input" value="${session.meeting_link || ''}">
                </div>
                <div class="form-group full-width" id="location-group" style="display:${showLocation ? '' : 'none'}">
                    <label class="form-label"><span class="label-icon"><i class="fa-solid fa-location-dot"></i></span> الموقع</label>
                    <input type="text" id="session-location" class="form-input" value="${session.location || ''}">
                </div>
            </div>
        `;

        const footer = `
            <button class="btn btn-outline" onclick="closeModal()">
                <i class="fa-solid fa-times"></i>
                إلغاء
            </button>
            <button class="btn btn-primary" onclick="window.interviewSessionsManager.submitEditSession()">
                <i class="fa-solid fa-save"></i>
                حفظ التعديلات
            </button>
        `;

        openModal('تعديل جلسة المقابلات', formHtml, {
            icon: 'fa-edit',
            footer: footer,
            size: 'md',
            onOpen: () => {
                const typeSelect = document.getElementById('session-type');
                const linkGroup = document.getElementById('meeting-link-group');
                const locationGroup = document.getElementById('location-group');

                if (typeSelect && linkGroup && locationGroup) {
                    typeSelect.addEventListener('change', () => {
                        if (typeSelect.value === 'online') {
                            linkGroup.style.display = '';
                            locationGroup.style.display = 'none';
                        } else if (typeSelect.value === 'in_person') {
                            linkGroup.style.display = 'none';
                            locationGroup.style.display = '';
                        } else {
                            linkGroup.style.display = 'none';
                            locationGroup.style.display = 'none';
                        }
                    });
                }
            }
        });
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

            // التحقق من الحقول المطلوبة
            if (!name || !date || !startTime || !endTime || !duration) {
                showNotification('يرجى ملء جميع الحقول المطلوبة', 'warning');
                return;
            }

            // التحقق من صحة الوقت
            if (startTime >= endTime) {
                showNotification('وقت النهاية يجب أن يكون بعد وقت البداية', 'warning');
                return;
            }

            // التحقق من أن التاريخ ليس في الماضي
            const selectedDateTime = new Date(`${date}T${startTime}`);
            const now = new Date();
            if (selectedDateTime < now) {
                Toast.error('لا يمكن جدولة مقابلة في وقت سابق للوقت الحالي');
                return;
            }

            // التحقق من رابط الاجتماع للمقابلات الأونلاين
            if (type === 'online' && !link) {
                showNotification('رابط الاجتماع إلزامي للمقابلات الأونلاين', 'error');
                return;
            }

            // التحقق من صحة رابط الاجتماع
            if (type === 'online' && link) {
                try {
                    new URL(link);
                } catch (e) {
                    showNotification('يرجى إدخال رابط صحيح للاجتماع', 'error');
                    return;
                }
            }

            // الحصول على البيانات القديمة للمقارنة
            const oldSession = allSessions.find(s => s.id === sessionId);
            const timeFieldsChanged = oldSession && (
                oldSession.session_date !== date ||
                oldSession.start_time !== startTime ||
                oldSession.end_time !== endTime ||
                oldSession.slot_duration !== parseInt(duration)
            );

            // تحديث بيانات الجلسة
            const { error: updateError } = await window.sbClient
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
                    location: type === 'in_person' ? location : null
                })
                .eq('id', sessionId);

            if (updateError) throw updateError;

            // إذا تغيرت حقول الوقت، نحتاج لإعادة توليد الفترات
            if (timeFieldsChanged) {
                // حذف الفترات القديمة غير المحجوزة
                const { error: deleteError } = await window.sbClient
                    .from('interview_slots')
                    .delete()
                    .eq('session_id', sessionId)
                    .eq('is_booked', false);

                if (deleteError) {
                    console.error('خطأ في حذف الفترات القديمة:', deleteError);
                }

                // إعادة توليد الفترات الجديدة
                const { error: generateError } = await window.sbClient
                    .rpc('generate_interview_slots', {
                        p_session_id: sessionId,
                        p_session_date: date,
                        p_start_time: startTime,
                        p_end_time: endTime,
                        p_slot_duration: parseInt(duration)
                    });

                if (generateError) {
                    console.error('خطأ في إعادة توليد الفترات:', generateError);
                    showNotification('تم تحديث الجلسة ولكن حدث خطأ في إعادة توليد الفترات الزمنية', 'warning');
                } else {
                    showNotification('تم تحديث الجلسة وإعادة توليد الفترات الزمنية بنجاح', 'success');
                }
            } else {
                showNotification('تم تحديث الجلسة بنجاح', 'success');
            }

            closeModal();
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
                <label>الرابط الجديد <span class="required-dot">*</span></label>
                <input type="url" id="new-meeting-link" class="form-input" placeholder="https://meet.google.com/xxx">
                <span class="form-hint">أدخل رابط Zoom أو Google Meet أو Teams</span>
            </div>
        `;

        const actionsHtml = `
            <button class="modal-btn modal-btn-primary" onclick="window.interviewSessionsManager.submitUpdateLink()">
                <i class="fa-solid fa-check"></i>
                تحديث الرابط
            </button>
            <button class="modal-btn modal-btn-secondary" onclick="window.closeFormModal()">
                <i class="fa-solid fa-times"></i>
                إلغاء
            </button>
        `;

        document.getElementById('formModalContent').innerHTML = formHtml;
        document.getElementById('formModalActions').innerHTML = actionsHtml;
        window.setFormModalTitle('تحديث رابط المقابلة', 'fa-link');
        window.openCustomFormModal();
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

        const message = `
            <p>هل أنت متأكد من حذف هذه الجلسة؟</p>
            <p><strong>${escapeHtml(session.session_name)}</strong></p>
            <p>⚠️ سيتم حذف جميع الفترات والحجوزات المرتبطة بها</p>
        `;

        window.openConfirmModal(
            'تأكيد الحذف',
            message,
            async () => {
                try {
                    const { error } = await window.sbClient
                        .from('interview_sessions')
                        .delete()
                        .eq('id', sessionId);

                    if (error) throw error;

                    showNotification('تم حذف الجلسة بنجاح', 'success');
                    loadSessions();
                } catch (error) {
                    console.error('Error deleting session:', error);
                    showNotification('حدث خطأ أثناء حذف الجلسة', 'error');
                }
            },
            { danger: true, confirmText: 'نعم، احذف' }
        );
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
            container.innerHTML = '<div><i class="fa-solid fa-spinner fa-spin"></i></div>';
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
    function copyLinkNotification(btn) {
        Toast.success('تم نسخ رابط الحجز بنجاح', 'نسخ الرابط');
        if (btn) {
            btn.classList.add('mdi-btn--copied');
            setTimeout(() => btn.classList.remove('mdi-btn--copied'), 1500);
        }
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
window.openCustomFormModal = function() {
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


