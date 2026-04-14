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
        await loadGroupBookings();
        bindEvents();
    }

    /**
     * ربط الأحداث
     */
    function bindEvents() {
        const createBtn = document.getElementById('createSessionBtn');
        const refreshBookingsBtn = document.getElementById('refreshGroupBookingsBtn');

        if (createBtn) {
            createBtn.addEventListener('click', createNewSession);
        }

        if (refreshBookingsBtn) {
            refreshBookingsBtn.addEventListener('click', () => loadGroupBookings());
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
            const date = new Date(session.session_date).toLocaleDateString('ar-EA', {
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
                statusBadge = '<span class="uc-card__badge"><i class="fa-solid fa-clock"></i> منتهية</span>';
            } else if (session.is_active) {
                statusBadge = '<span class="uc-card__badge">نشط</span>';
            } else {
                statusBadge = '<span class="uc-card__badge uc-card__badge--muted">معطل</span>';
            }

            // تحويل الوقت إلى نظام 12 ساعة
            const startTime = new Date(`2000-01-01 ${session.start_time}`).toLocaleTimeString('ar-EA', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
            const endTime = new Date(`2000-01-01 ${session.end_time}`).toLocaleTimeString('ar-EA', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });

            const bookingPercentage = stats.total_slots > 0 
                ? Math.round((stats.booked_slots / stats.total_slots) * 100) 
                : 0;

            html += `
                <div class="uc-card${isExpired ? ' uc-card--danger' : session.is_active ? ' uc-card--success' : ''}">
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
                                <div class="uc-card__info-icon"><i class="fa-solid fa-hourglass-half"></i></div>
                                <div class="uc-card__info-content">
                                    <span class="uc-card__info-label">مدة المقابلة</span>
                                    <span class="uc-card__info-value">${session.slot_duration} دقيقة</span>
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
                            <button class="btn btn-primary" onclick="window.interviewSessionsManager.showSessionBookings('${session.id}')" title="جدول الحجوزات">
                                <i class="fa-solid fa-users-rectangle"></i>
                                الحجوزات
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
            closeModal();
            await loadSessions();

        } catch (error) {
            console.error('خطأ في إنشاء الجلسة:', error);
            showNotification('خطأ في إنشاء الجلسة', 'error');
        }
    }

    /**
     * عرض جميع فترات جلسة معينة في نافذة منبثقة
     */
    async function showSessionBookings(sessionId) {
        const session = allSessions.find(s => s.id === sessionId);
        if (!session) return;

        try {
            const { data: slots, error } = await window.sbClient
                .from('interview_slots')
                .select(`
                    *,
                    booked_by_app:membership_applications!booked_by(full_name, preferred_committee)
                `)
                .eq('session_id', sessionId)
                .order('slot_time', { ascending: true });

            if (error) throw error;

            let tableHtml = '';

            if (!slots || slots.length === 0) {
                tableHtml = `
                    <div class="empty-state">
                        <div class="empty-state__icon"><i class="fa-solid fa-inbox"></i></div>
                        <p class="empty-state__title">لا توجد فترات لهذه الجلسة</p>
                    </div>`;
            } else {
                tableHtml = `
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>الوقت</th>
                                <th>الحالة</th>
                                <th>الاسم</th>
                                <th>اللجنة المرغوبة</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${slots.map((slot, i) => {
                                const time = new Date(slot.slot_time).toLocaleTimeString('ar-EA', { hour: '2-digit', minute: '2-digit', hour12: true });
                                const statusBadge = slot.is_booked
                                    ? '<span class="badge badge-success">محجوزة</span>'
                                    : '<span class="badge badge-secondary">متاحة</span>';
                                return `
                                    <tr>
                                        <td>${i + 1}</td>
                                        <td>${time}</td>
                                        <td>${statusBadge}</td>
                                        <td>${slot.is_booked ? escapeHtml(slot.booked_by_app?.full_name || '-') : '-'}</td>
                                        <td>${slot.is_booked ? escapeHtml(slot.booked_by_app?.preferred_committee || '-') : '-'}</td>
                                    </tr>`;
                            }).join('')}
                        </tbody>
                    </table>`;
            }

            openModal(`فترات: ${escapeHtml(session.session_name)}`, tableHtml, {
                icon: 'fa-users-rectangle',
                size: 'lg'
            });

        } catch (err) {
            console.error('خطأ في تحميل الفترات:', err);
            showNotification('خطأ في تحميل فترات الجلسة', 'error');
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

            const sessionDate = new Date(session.session_date).toLocaleDateString('ar-EA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const startTime = new Date(`2000-01-01 ${session.start_time}`).toLocaleTimeString('ar-EA', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });

            const endTime = new Date(`2000-01-01 ${session.end_time}`).toLocaleTimeString('ar-EA', {
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
                    const time = new Date(slot.slot_time).toLocaleTimeString('ar-EA', {
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
            document.getElementById('applicationDetailEActions').innerHTML = '';
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
    async function toggleSession(sessionId, iEActive) {
        try {
            const { error } = await window.sbClient
                .from('interview_sessions')
                .update({ is_active: iEActive })
                .eq('id', sessionId);

            if (error) throw error;

            showNotification(iEActive ? 'تم تفعيل الجلسة' : 'تم تعطيل الجلسة', 'success');
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
                <i class="fa-solid fa-EAve"></i>
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
                <label class="form-label">الرابط الحالي</label>
                <input type="text" class="form-input" value="${session.meeting_link || 'لا يوجد'}" diEAbled>
            </div>
            <div class="form-group">
                <label class="form-label">الرابط الجديد <span class="required-dot">*</span></label>
                <input type="url" id="new-meeting-link" class="form-input" placeholder="https://meet.google.com/xxx">
                <span class="form-hint">أدخل رابط Zoom أو Google Meet أو Teams</span>
            </div>
        `;

        const footerHtml = `
            <button class="btn btn-outline" onclick="closeModal()">
                <i class="fa-solid fa-times"></i>
                إلغاء
            </button>
            <button class="btn btn-primary" onclick="window.interviewSessionsManager.submitUpdateLink()">
                <i class="fa-solid fa-check"></i>
                تحديث الرابط
            </button>
        `;

        openModal('تحديث رابط المقابلة', formHtml, {
            icon: 'fa-link',
            footer: footerHtml
        });
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
            closeModal();
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

        const mesEAge = `
            <p>هل أنت متأكد من حذف هذه الجلسة؟</p>
            <p><strong>${escapeHtml(session.session_name)}</strong></p>
            <p>⚠️ سيتم حذف جميع الفترات والحجوزات المرتبطة بها</p>
        `;

        window.openConfirmModal(
            'تأكيد الحذف',
            mesEAge,
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
            closeModal();
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

    function showNotification(mesEAge, type = 'info') {
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
            <span>${mesEAge}</span>
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

    // ========================================================================
    // قسم حجوزات المقابلات الجماعية
    // ========================================================================

    /**
     * تحميل حجوزات المقابلات الجماعية (المرتبطة بجلسات)
     */
    async function loadGroupBookings() {
        try {
            const container = document.getElementById('groupBookingsTable');
            if (!container) return;

            container.innerHTML = '<div><i class="fa-solid fa-spinner fa-spin"></i></div>';

            // جلب المقابلات المجدولة التي لها slot مرتبط بجلسة
            const { data: interviews, error: interviewsError } = await window.sbClient
                .from('membership_interviews')
                .select(`
                    *,
                    application:membership_applications(id, full_name, email, phone, preferred_committee),
                    interviewer:profiles!interviewer_id(full_name),
                    decided_by_user:profiles!decided_by(full_name),
                    slot:interview_slots(id, session_id, interview_sessions(id, session_name))
                `)
                .eq('status', 'scheduled')
                .order('interview_date', { ascending: true });

            if (interviewsError) throw interviewsError;

            // فلترة المقابلات الجماعية فقط (التي لها slot مرتبط)
            const groupInterviews = (interviews || []).filter(interview => {
                return interview.slot && interview.slot.length > 0;
            });

            // حفظ في cache للفلترة المحلية
            container._cachedBookings = groupInterviews;

            populateGroupBookingsSessionFilter(groupInterviews);
            renderGroupBookings(groupInterviews);
            bindGroupBookingsEvents();

        } catch (error) {
            console.error('خطأ في تحميل حجوزات المقابلات الجماعية:', error);
            showNotification('خطأ في تحميل الحجوزات', 'error');
        }
    }

    /**
     * ملء فلتر الجلسات في قسم الحجوزات
     */
    function populateGroupBookingsSessionFilter(interviews) {
        const filter = document.getElementById('groupBookingsSessionFilter');
        if (!filter) return;

        const sessionsMap = new Map();
        interviews.forEach(interview => {
            if (interview.slot && interview.slot[0] && interview.slot[0].interview_sessions) {
                const session = interview.slot[0].interview_sessions;
                if (!sessionsMap.has(session.id)) {
                    sessionsMap.set(session.id, session.session_name);
                }
            }
        });

        filter.innerHTML = '<option value="">جميع الجلسات</option>';
        sessionsMap.forEach((name, id) => {
            filter.innerHTML += `<option value="${id}">${escapeHtml(name)}</option>`;
        });
    }

    /**
     * عرض بطاقات الحجوزات الجماعية
     */
    function renderGroupBookings(interviews) {
        const container = document.getElementById('groupBookingsTable');
        const searchInput = document.getElementById('groupBookingsSearchInput');
        const sessionFilter = document.getElementById('groupBookingsSessionFilter');
        const sortFilter = document.getElementById('groupBookingsSortFilter');
        if (!container) return;

        const searchTerm = searchInput?.value.toLowerCase() || '';
        const sessionValue = sessionFilter?.value || '';
        const sortValue = sortFilter?.value || 'nearest';

        // فلترة
        let filtered = interviews.filter(interview => {
            const matchSearch = !searchTerm ||
                interview.application?.full_name?.toLowerCase().includes(searchTerm) ||
                interview.application?.email?.toLowerCase().includes(searchTerm) ||
                (interview.application?.phone && interview.application.phone.includes(searchTerm));

            const matchSession = !sessionValue ||
                (interview.slot && interview.slot[0] && String(interview.slot[0].session_id) === String(sessionValue));

            return matchSearch && matchSession;
        });

        // ترتيب
        filtered.sort((a, b) => {
            const dateA = new Date(a.interview_date);
            const dateB = new Date(b.interview_date);
            return sortValue === 'nearest' ? dateA - dateB : dateB - dateA;
        });

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state__icon"><i class="fa-solid fa-inbox"></i></div>
                    <p class="empty-state__title">لا توجد حجوزات</p>
                </div>
            `;
            return;
        }

        const typeIcons = {
            'online': 'fa-video',
            'in_person': 'fa-building',
            'phone': 'fa-phone'
        };

        const typeBadges = {
            'in_person': '<span class="uc-card__badge">حضوري</span>',
            'online': '<span class="uc-card__badge">أونلاين</span>',
            'phone': '<span class="uc-card__badge">هاتفي</span>'
        };

        const resultBadges = {
            'pending': '<span class="badge badge-warning">معلقة</span>',
            'accepted': '<span class="uc-card__badge">مقبول</span>',
            'rejected': '<span class="badge badge-danger">مرفوض</span>',
            'no_show': '<span class="badge badge-secondary">لم يحضر</span>'
        };

        let html = '<div class="uc-grid">';

        filtered.forEach(interview => {
            const date = new Date(interview.interview_date).toLocaleDateString('ar-EA', {
                year: 'numeric', month: 'long', day: 'numeric'
            });

            const time = new Date(interview.interview_date).toLocaleTimeString('ar-EA', {
                hour: '2-digit', minute: '2-digit'
            });

            const typeBadge = typeBadges[interview.interview_type] || '<span class="badge badge-secondary">-</span>';
            const resultBadge = resultBadges[interview.result] || '';
            const sessionName = interview.slot?.[0]?.interview_sessions?.session_name || 'غير محدد';

            html += `
                <div class="uc-card">
                    <div class="uc-card__header">
                        <div class="uc-card__header-inner">
                            <div class="uc-card__icon">
                                <i class="fa-solid ${typeIcons[interview.interview_type] || 'fa-user-tie'}"></i>
                            </div>
                            <div class="uc-card__header-info">
                                <h3 class="uc-card__title">${escapeHtml(interview.application?.full_name || 'غير محدد')}</h3>
                                <div>
                                    <span class="uc-card__badge">محجوزة</span>
                                    ${typeBadge}
                                    ${resultBadge}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="uc-card__body">
                        <div class="uc-card__info-item">
                            <div class="uc-card__info-icon"><i class="fa-solid fa-users-rectangle"></i></div>
                            <div class="uc-card__info-content">
                                <span class="uc-card__info-label">الجلسة</span>
                                <span class="uc-card__info-value">${escapeHtml(sessionName)}</span>
                            </div>
                        </div>

                        <div class="uc-card__info-item">
                            <div class="uc-card__info-icon"><i class="fa-solid fa-envelope"></i></div>
                            <div class="uc-card__info-content">
                                <span class="uc-card__info-label">البريد الإلكتروني</span>
                                <span class="uc-card__info-value">${escapeHtml(interview.application?.email || 'غير متوفر')}</span>
                            </div>
                        </div>

                        <div class="uc-card__info-item">
                            <div class="uc-card__info-icon"><i class="fa-solid fa-phone"></i></div>
                            <div class="uc-card__info-content">
                                <span class="uc-card__info-label">رقم الجوال</span>
                                <span class="uc-card__info-value">${escapeHtml(interview.application?.phone || 'غير متوفر')}</span>
                            </div>
                        </div>

                        <div class="uc-card__info-item">
                            <div class="uc-card__info-icon"><i class="fa-solid fa-users"></i></div>
                            <div class="uc-card__info-content">
                                <span class="uc-card__info-label">اللجنة المرغوبة</span>
                                <span class="uc-card__info-value">${escapeHtml(interview.application?.preferred_committee || 'غير محدد')}</span>
                            </div>
                        </div>

                        <div class="uc-card__info-item">
                            <div class="uc-card__info-icon"><i class="fa-solid fa-calendar-day"></i></div>
                            <div class="uc-card__info-content">
                                <span class="uc-card__info-label">تاريخ المقابلة</span>
                                <span class="uc-card__info-value">${date}</span>
                            </div>
                        </div>

                        <div class="uc-card__info-item">
                            <div class="uc-card__info-icon"><i class="fa-solid fa-clock"></i></div>
                            <div class="uc-card__info-content">
                                <span class="uc-card__info-label">وقت المقابلة</span>
                                <span class="uc-card__info-value">${time}</span>
                            </div>
                        </div>

                    </div>

                    <div class="uc-card__footer">
                        <button class="btn btn-primary" onclick="window.membershipManager.viewApplication('${interview.application?.id}')">
                            <i class="fa-solid fa-user"></i>
                            عرض المتقدم
                        </button>
                        ${interview.result === 'pending' || !interview.result ? `
                        <button class="btn btn-success" onclick="window.interviewSessionsManager.acceptGroupBooking('${interview.id}')">
                            <i class="fa-solid fa-check"></i>
                            قبول
                        </button>
                        <button class="btn btn-danger" onclick="window.interviewSessionsManager.rejectGroupBooking('${interview.id}')">
                            <i class="fa-solid fa-times"></i>
                            رفض
                        </button>
                        ` : ''}
                        <button class="btn btn-warning" onclick="window.membershipManager.cancelInterviewAdmin('${interview.id}', '${interview.slot?.[0]?.id || ''}')">
                            <i class="fa-solid fa-trash-alt"></i>
                            حذف الموعد
                        </button>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    /**
     * ربط أحداث قسم الحجوزات
     */
    function bindGroupBookingsEvents() {
        const searchInput = document.getElementById('groupBookingsSearchInput');
        const sessionFilter = document.getElementById('groupBookingsSessionFilter');
        const sortFilter = document.getElementById('groupBookingsSortFilter');

        const rerender = () => {
            const container = document.getElementById('groupBookingsTable');
            if (container && container._cachedBookings) {
                renderGroupBookings(container._cachedBookings);
            }
        };

        if (searchInput) {
            searchInput.removeEventListener('input', rerender);
            searchInput.addEventListener('input', rerender);
        }
        if (sessionFilter) {
            sessionFilter.removeEventListener('change', rerender);
            sessionFilter.addEventListener('change', rerender);
        }
        if (sortFilter) {
            sortFilter.removeEventListener('change', rerender);
            sortFilter.addEventListener('change', rerender);
        }
    }

    /**
     * قبول حجز من المقابلات الجماعية
     */
    async function acceptGroupBooking(interviewId) {
        if (!currentUser) {
            const { data: { user } } = await window.sbClient.auth.getUser();
            if (!user) {
                showNotification('يجب تسجيل الدخول أولاً', 'error');
                return;
            }
            currentUser = user;
        }

        const contentHtml = `
            <div>
                <div class="modal-info-box box-success">
                    <i class="fa-solid fa-circle-check"></i>
                    <p>هل أنت متأكد من قبول هذا المتقدم؟</p>
                </div>
                <div class="form-group">
                    <label class="form-label"><span class="label-icon"><i class="fa-solid fa-note-sticky"></i></span> ملاحظات القبول (اختياري)</label>
                    <textarea id="groupAcceptNotes" class="form-input form-textarea" placeholder="أضف ملاحظات حول قبول المتقدم..." rows="3"></textarea>
                </div>
                <input type="hidden" id="group-accept-interview-id" value="${interviewId}">
            </div>
        `;

        const footerHtml = `
            <button class="btn btn-outline" onclick="closeModal()">
                <i class="fa-solid fa-times"></i>
                إلغاء
            </button>
            <button class="btn btn-success" onclick="window.interviewSessionsManager.confirmAcceptGroupBooking()">
                <i class="fa-solid fa-check"></i>
                قبول
            </button>
        `;

        openModal('قبول المتقدم', contentHtml, {
            icon: 'fa-circle-check',
            variant: 'success',
            footer: footerHtml
        });
    }

    /**
     * تأكيد قبول حجز جماعي
     */
    async function confirmAcceptGroupBooking() {
        try {
            const interviewId = document.getElementById('group-accept-interview-id').value;
            const notes = document.getElementById('groupAcceptNotes')?.value?.trim() || null;
            closeModal();

            const { data: interview, error: interviewError } = await window.sbClient
                .from('membership_interviews')
                .select('id, application_id, result, status')
                .eq('id', interviewId)
                .single();

            if (interviewError) throw interviewError;

            if (interview.result === 'accepted' && interview.status === 'completed') {
                showNotification('تم قبول هذا المتقدم مسبقاً', 'info');
                await loadGroupBookings();
                return;
            }

            const { data: application, error: appError } = await window.sbClient
                .from('membership_applications')
                .select('*')
                .eq('id', interview.application_id)
                .single();

            if (appError) throw appError;

            const { error: acceptedError } = await window.sbClient
                .from('membership_accepted_members')
                .insert({
                    application_id: application.id,
                    interview_id: interviewId,
                    full_name: application.full_name,
                    email: application.email,
                    phone: application.phone,
                    assigned_committee: application.preferred_committee,
                    added_by: currentUser.id
                });

            if (acceptedError) {
                const isConflict = acceptedError.code === '23505' || acceptedError.status === 409;
                if (!isConflict) throw acceptedError;
            }

            const { error: updateError } = await window.sbClient
                .from('membership_interviews')
                .update({
                    result: 'accepted',
                    result_notes: notes,
                    decided_by: currentUser.id,
                    decided_at: new Date().toISOString(),
                    status: 'completed'
                })
                .eq('id', interviewId);

            if (updateError) throw updateError;

            showNotification('تم قبول المتقدم بنجاح', 'success');
            await loadGroupBookings();
        } catch (error) {
            console.error('خطأ في قبول المتقدم:', error);
            showNotification('خطأ في قبول المتقدم', 'error');
        }
    }

    /**
     * رفض حجز من المقابلات الجماعية
     */
    async function rejectGroupBooking(interviewId) {
        if (!currentUser) {
            const { data: { user } } = await window.sbClient.auth.getUser();
            if (!user) {
                showNotification('يجب تسجيل الدخول أولاً', 'error');
                return;
            }
            currentUser = user;
        }

        const contentHtml = `
            <div>
                <div class="modal-info-box box-danger">
                    <i class="fa-solid fa-circle-xmark"></i>
                    <p>هل أنت متأكد من رفض هذا المتقدم؟</p>
                </div>
                <div class="form-group">
                    <label class="form-label"><span class="label-icon"><i class="fa-solid fa-note-sticky"></i></span> سبب الرفض (اختياري)</label>
                    <textarea id="groupRejectNotes" class="form-input form-textarea" placeholder="أضف سبب رفض المتقدم..." rows="3"></textarea>
                </div>
                <input type="hidden" id="group-reject-interview-id" value="${interviewId}">
            </div>
        `;

        const footerHtml = `
            <button class="btn btn-outline" onclick="closeModal()">
                <i class="fa-solid fa-times"></i>
                إلغاء
            </button>
            <button class="btn btn-danger" onclick="window.interviewSessionsManager.confirmRejectGroupBooking()">
                <i class="fa-solid fa-user-xmark"></i>
                رفض
            </button>
        `;

        openModal('رفض المتقدم', contentHtml, {
            icon: 'fa-circle-xmark',
            variant: 'danger',
            footer: footerHtml
        });
    }

    /**
     * تأكيد رفض حجز جماعي
     */
    async function confirmRejectGroupBooking() {
        try {
            const interviewId = document.getElementById('group-reject-interview-id').value;
            const notes = document.getElementById('groupRejectNotes')?.value?.trim() || null;
            closeModal();

            const updateData = {
                result: 'rejected',
                decided_by: currentUser.id,
                decided_at: new Date().toISOString(),
                status: 'completed'
            };

            if (notes) {
                updateData.result_notes = notes;
            }

            const { error } = await window.sbClient
                .from('membership_interviews')
                .update(updateData)
                .eq('id', interviewId);

            if (error) throw error;

            showNotification('تم رفض المتقدم', 'success');
            await loadGroupBookings();
        } catch (error) {
            console.error('خطأ في رفض المتقدم:', error);
            showNotification('خطأ في رفض المتقدم', 'error');
        }
    }

    // تصدير الوظائف
    window.interviewSessionsManager = {
        init: initInterviewSessionsManager,
        copyLinkNotification: copyLinkNotification,
        createNewSession,
        submitNewSession,
        viewSession,
        showSessionBookings,
        editSession,
        submitEditSession,
        updateMeetingLink,
        submitUpdateLink,
        copyLink,
        toggleSession,
        deleteSession,
        confirmDelete,
        loadGroupBookings,
        acceptGroupBooking,
        confirmAcceptGroupBooking,
        rejectGroupBooking,
        confirmRejectGroupBooking
    };

})();


