// ============================================================================
// نظام حجز مواعيد المقابلات - Booking System JavaScript
// ============================================================================

(function() {
    'use strict';

    // المتغيرات العامة
    let sessionData = null;
    let applicantData = null;
    let availableSlots = [];
    let selectedSlot = null;
    let sessionToken = null;
    let existingBookingData = null;

    // عناصر DOM
    const elements = {
        loadingState: document.getElementById('loadingState'),
        errorState: document.getElementById('errorState'),
        errorMessage: document.getElementById('errorMessage'),
        phoneStep: document.getElementById('phoneStep'),
        slotStep: document.getElementById('slotStep'),
        confirmationStep: document.getElementById('confirmationStep'),
        
        // Phone Step
        phoneInput: document.getElementById('phoneInput'),
        verifyPhoneBtn: document.getElementById('verifyPhoneBtn'),
        phoneError: document.getElementById('phoneError'),
        
        // Session Info
        sessionName: document.getElementById('sessionName'),
        sessionDescription: document.getElementById('sessionDescription'),
        sessionDate: document.getElementById('sessionDate'),
        sessionTime: document.getElementById('sessionTime'),
        sessionType: document.getElementById('sessionType'),
        sessionTypeIcon: document.getElementById('sessionTypeIcon'),
        
        // Slot Step
        applicantName: document.getElementById('applicantName'),
        applicantCommittee: document.getElementById('applicantCommittee'),
        slotsLoading: document.getElementById('slotsLoading'),
        slotsError: document.getElementById('slotsError'),
        slotsGrid: document.getElementById('slotsGrid'),
        noSlotsMessage: document.getElementById('noSlotsMessage'),
        backToPhoneBtn: document.getElementById('backToPhoneBtn'),
        
        // Existing Booking Step
        existingBookingStep: document.getElementById('existingBookingStep'),
        existingBookingName: document.getElementById('existingBookingName'),
        existingBookingDate: document.getElementById('existingBookingDate'),
        existingBookingTime: document.getElementById('existingBookingTime'),
        existingBookingMeetingLink: document.getElementById('existingBookingMeetingLink'),
        existingMeetingLinkCard: document.getElementById('existingMeetingLinkCard'),
        existingBookingLocation: document.getElementById('existingBookingLocation'),
        existingLocationCard: document.getElementById('existingLocationCard'),
        cancelBookingBtn: document.getElementById('cancelBookingBtn'),
        backToPhoneFromExisting: document.getElementById('backToPhoneFromExisting'),
        
        // Confirmation
        confirmName: document.getElementById('confirmName'),
        confirmDate: document.getElementById('confirmDate'),
        confirmTime: document.getElementById('confirmTime'),
        confirmDuration: document.getElementById('confirmDuration'),
        confirmMeetingLink: document.getElementById('confirmMeetingLink'),
        confirmLocation: document.getElementById('confirmLocation'),
        meetingLinkCard: document.getElementById('meetingLinkCard'),
        locationCard: document.getElementById('locationCard'),
        addToCalendarBtn: document.getElementById('addToCalendarBtn'),
        copyDetailsBtn: document.getElementById('copyDetailsBtn')
    };

    // ============================================================================
    // التهيئة
    // ============================================================================
    
    async function init() {
        // الحصول على رمز الجلسة من URL
        const urlParams = new URLSearchParams(window.location.search);
        sessionToken = urlParams.get('token');

        if (!sessionToken) {
            showError('رابط غير صالح. يرجى التأكد من الرابط والمحاولة مرة أخرى.');
            return;
        }

        // تحميل بيانات الجلسة
        await loadSessionData();
    }

    // ============================================================================
    // تحميل بيانات الجلسة
    // ============================================================================
    
    async function loadSessionData() {
        try {
            const { data, error } = await window.sbClient
                .from('interview_sessions')
                .select('*')
                .eq('public_link_token', sessionToken)
                .eq('is_active', true)
                .single();

            if (error) throw error;

            if (!data) {
                showError('الجلسة غير موجودة أو غير نشطة');
                return;
            }

            sessionData = data;
            
            // التحقق من انتهاء الجلسة قبل عرض خطوة الهاتف
            const sessionEndDateTime = new Date(`${data.session_date}T${data.end_time}`);
            const now = new Date();
            
            if (sessionEndDateTime < now) {
                // الجلسة منتهية - عرض رسالة مباشرة
                showError('عذراً، انتهت هذه الجلسة ولم يعد بالإمكان حجز مواعيد فيها');
                return;
            }
            
            displaySessionInfo();
            showPhoneStep();
        } catch (error) {
            console.error('خطأ في تحميل بيانات الجلسة:', error);
            showError('حدث خطأ أثناء تحميل بيانات الجلسة');
        }
    }

    // ============================================================================
    // عرض معلومات الجلسة
    // ============================================================================
    
    function displaySessionInfo() {
        elements.sessionName.textContent = sessionData.session_name;
        
        if (sessionData.session_description) {
            elements.sessionDescription.textContent = sessionData.session_description;
        }

        // تنسيق التاريخ
        const date = new Date(sessionData.session_date);
        const dateStr = date.toLocaleDateString('ar-SA', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        elements.sessionDate.textContent = dateStr;

        // تنسيق الوقت - تحويل إلى نظام 12 ساعة
        const startTime12 = new Date(`2000-01-01 ${sessionData.start_time}`).toLocaleTimeString('ar-SA', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
        const endTime12 = new Date(`2000-01-01 ${sessionData.end_time}`).toLocaleTimeString('ar-SA', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
        elements.sessionTime.textContent = `${startTime12} - ${endTime12}`;

        // نوع المقابلة
        const typeMap = {
            'online': 'مقابلة أونلاين',
            'in_person': 'مقابلة حضورية',
            'phone': 'مقابلة هاتفية'
        };
        elements.sessionType.textContent = typeMap[sessionData.interview_type] || sessionData.interview_type;

        // أيقونة النوع
        const iconMap = {
            'online': 'fa-video',
            'in_person': 'fa-building',
            'phone': 'fa-phone'
        };
        elements.sessionTypeIcon.className = `fas ${iconMap[sessionData.interview_type] || 'fa-video'}`;
    }

    // ============================================================================
    // دالة توحيد صيغة رقم الهاتف
    // ============================================================================
    
    function normalizePhone(phone) {
        if (!phone) return null;
        
        // إزالة جميع المسافات والرموز والأحرف غير الرقمية
        phone = phone.replace(/[^0-9]/g, '');
        
        // إزالة الأصفار البادئة الزائدة
        phone = phone.replace(/^0+/, '');
        
        // إذا كان الرقم يبدأ بـ 966 (كود السعودية)، نزيله
        if (phone.startsWith('966')) {
            phone = phone.substring(3);
        }
        
        // إضافة 0 في البداية إذا لم يكن موجوداً
        if (!phone.startsWith('0')) {
            phone = '0' + phone;
        }
        
        // التأكد من أن الرقم يبدأ بـ 05 ويتكون من 10 أرقام
        if (!phone.startsWith('05') || phone.length !== 10) {
            return null;
        }
        
        return phone;
    }

    // ============================================================================
    // التحقق من رقم الهاتف
    // ============================================================================
    
    elements.verifyPhoneBtn.addEventListener('click', async () => {
        const phoneInput = elements.phoneInput.value.trim();

        // التحقق من صحة الرقم
        if (!phoneInput) {
            showPhoneError('يرجى إدخال رقم الهاتف');
            return;
        }

        // توحيد صيغة الرقم
        const normalizedPhone = normalizePhone(phoneInput);
        
        if (!normalizedPhone) {
            showPhoneError('رقم الهاتف غير صحيح. يجب أن يبدأ بـ 05 ويتكون من 10 أرقام');
            return;
        }

        elements.verifyPhoneBtn.disabled = true;
        elements.verifyPhoneBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';

        try {
            console.log('🔍 رقم الهاتف المُدخل:', phoneInput);
            console.log('✅ رقم الهاتف الموحد:', normalizedPhone);
            
            const { data, error } = await window.sbClient
                .rpc('validate_phone_for_booking', {
                    p_phone: normalizedPhone,
                    p_session_id: sessionData.id
                });

            if (error) {
                console.error('❌ خطأ من قاعدة البيانات:', error);
                throw error;
            }

            console.log('📦 البيانات المُستلمة من قاعدة البيانات:', data);

            if (!data || data.length === 0) {
                console.error('❌ لم يتم استلام أي بيانات من قاعدة البيانات');
                showPhoneError('حدث خطأ في التحقق من رقم الهاتف. يرجى المحاولة مرة أخرى');
                elements.verifyPhoneBtn.disabled = false;
                elements.verifyPhoneBtn.innerHTML = '<i class="fas fa-arrow-left"></i> التالي';
                return;
            }

            const result = data[0];
            console.log('📋 النتيجة:', result);

            // حفظ بيانات المتقدم
            applicantData = {
                id: result.application_id,
                name: result.full_name,
                email: result.email,
                committee: result.preferred_committee
            };

            // التحقق من وجود حجز مسبق
            if (result.has_existing_booking) {
                console.log('✅ يوجد حجز مسبق');
                // حفظ بيانات الحجز الحالي
                existingBookingData = {
                    slotId: result.existing_slot_id,
                    slotTime: result.existing_slot_time,
                    slotEndTime: result.existing_slot_end_time,
                    interviewId: result.existing_interview_id
                };
                
                // عرض صفحة الحجز الحالي
                showExistingBookingStep();
                return;
            }

            // التحقق من صحة البيانات
            if (!result.is_valid) {
                console.log('❌ الرقم غير صالح:', result.error_message);
                showPhoneError(result.error_message);
                elements.verifyPhoneBtn.disabled = false;
                elements.verifyPhoneBtn.innerHTML = '<i class="fas fa-arrow-left"></i> التالي';
                return;
            }

            console.log('✅ التحقق نجح - الانتقال لاختيار الموعد');

            // الانتقال لاختيار الموعد
            await showSlotStep();

        } catch (error) {
            console.error('خطأ في التحقق من رقم الهاتف:', error);
            showPhoneError('حدث خطأ أثناء التحقق. يرجى المحاولة مرة أخرى');
            elements.verifyPhoneBtn.disabled = false;
            elements.verifyPhoneBtn.innerHTML = '<i class="fas fa-arrow-left"></i> التالي';
        }
    });

    // ============================================================================
    // عرض خطوة اختيار الموعد
    // ============================================================================
    
    async function showSlotStep() {
        hideAllSteps();
        elements.slotStep.style.display = 'block';

        // عرض معلومات المتقدم
        elements.applicantName.textContent = applicantData.name;
        elements.applicantCommittee.textContent = applicantData.committee;

        // تحميل المواعيد المتاحة
        await loadAvailableSlots();
    }

    // ============================================================================
    // تحميل المواعيد المتاحة
    // ============================================================================
    
    async function loadAvailableSlots() {
        elements.slotsLoading.style.display = 'block';
        elements.slotsGrid.innerHTML = '';
        elements.slotsError.style.display = 'none';
        elements.noSlotsMessage.style.display = 'none';

        try {
            const { data, error } = await window.sbClient
                .from('interview_slots')
                .select('*')
                .eq('session_id', sessionData.id)
                .order('slot_time', { ascending: true });

            if (error) throw error;

            availableSlots = data || [];
            elements.slotsLoading.style.display = 'none';

            if (availableSlots.length === 0) {
                elements.noSlotsMessage.style.display = 'block';
                return;
            }

            renderSlots();

        } catch (error) {
            console.error('خطأ في تحميل المواعيد:', error);
            elements.slotsLoading.style.display = 'none';
            elements.slotsError.textContent = 'حدث خطأ أثناء تحميل المواعيد';
            elements.slotsError.style.display = 'block';
        }
    }

    // ============================================================================
    // عرض المواعيد
    // ============================================================================
    
    function renderSlots() {
        elements.slotsGrid.innerHTML = '';
        const now = new Date();
        
        // تصنيف المواعيد
        let availableCount = 0;
        let bookedCount = 0;
        let expiredCount = 0;

        availableSlots.forEach(slot => {
            const slotBtn = document.createElement('button');
            slotBtn.className = 'slot-button';
            
            const slotTime = new Date(slot.slot_time);
            const timeStr = slotTime.toLocaleTimeString('ar-SA', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });

            const endTime = new Date(slot.slot_end_time);
            const endTimeStr = endTime.toLocaleTimeString('ar-SA', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });

            // التحقق من أن الموعد انتهى
            const isExpired = slotTime <= now;

            if (slot.is_booked) {
                // محجوز
                bookedCount++;
                slotBtn.classList.add('booked');
                slotBtn.disabled = true;
                slotBtn.innerHTML = `
                    <span class="slot-time">${timeStr} - ${endTimeStr}</span>
                    <span class="slot-status">محجوز</span>
                `;
            } else if (isExpired) {
                // منتهي
                expiredCount++;
                slotBtn.classList.add('expired');
                slotBtn.disabled = true;
                slotBtn.innerHTML = `
                    <span class="slot-time">${timeStr} - ${endTimeStr}</span>
                    <span class="slot-status">انتهى</span>
                `;
            } else {
                // متاح
                availableCount++;
                slotBtn.classList.add('available');
                slotBtn.innerHTML = `
                    <span class="slot-time">${timeStr} - ${endTimeStr}</span>
                    <span class="slot-status">متاح</span>
                `;

                slotBtn.addEventListener('click', () => selectSlot(slot, slotBtn));
            }

            elements.slotsGrid.appendChild(slotBtn);
        });

        // إذا لم يكن هناك مواعيد متاحة
        if (availableCount === 0) {
            elements.slotsGrid.style.display = 'none';
            elements.noSlotsMessage.style.display = 'block';
            elements.noSlotsMessage.innerHTML = `
                <i class="fas fa-calendar-times"></i>
                <p>عذراً، جميع المواعيد إما محجوزة أو انتهى وقتها</p>
                <p style="font-size: 0.9rem; color: #64748b; margin-top: 0.5rem;">
                    يرجى التواصل مع الإدارة للحصول على موعد بديل
                </p>
            `;
        } else {
            elements.slotsGrid.style.display = 'grid';
        }
    }

    // ============================================================================
    // اختيار موعد
    // ============================================================================
    
    function selectSlot(slot, btnElement) {
        selectedSlot = slot;

        // إزالة التحديد من جميع الأزرار
        document.querySelectorAll('.slot-button').forEach(btn => {
            btn.classList.remove('selected');
        });

        // تحديد الزر المختار
        btnElement.classList.add('selected');

        // عرض نافذة تأكيد
        confirmSlotSelection(slot);
    }

    // ============================================================================
    // تأكيد اختيار الموعد
    // ============================================================================
    
    async function confirmSlotSelection(slot) {
        const slotTime = new Date(slot.slot_time);
        const timeStr = slotTime.toLocaleTimeString('ar-SA', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });

        const dateStr = slotTime.toLocaleDateString('ar-SA', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        showConfirmDialog(
            'تأكيد الحجز',
            `<div style="text-align: center; padding: 1rem;">
                <i class="fas fa-calendar-check" style="font-size: 3rem; color: #3d8fd6; margin-bottom: 1rem;"></i>
                <p style="font-size: 1.1rem; margin-bottom: 0.5rem; font-weight: 600;">هل تريد حجز هذا الموعد؟</p>
                <div style="background: #f8fafc; padding: 1rem; border-radius: 8px; margin-top: 1rem;">
                    <p style="color: #274060; margin: 0.5rem 0;"><i class="fas fa-calendar"></i> ${dateStr}</p>
                    <p style="color: #274060; margin: 0.5rem 0;"><i class="fas fa-clock"></i> ${timeStr}</p>
                </div>
            </div>`,
            async () => {
                await bookSlot(slot);
            }
        );
    }

    // ============================================================================
    // حجز الموعد
    // ============================================================================
    
    async function bookSlot(slot) {
        try {
            const { data, error } = await window.sbClient
                .rpc('book_interview_slot', {
                    p_slot_id: slot.id,
                    p_application_id: applicantData.id
                });

            if (error) throw error;

            const result = data[0];

            if (!result.success) {
                showAlertDialog('تنبيه', `<div style="text-align: center; padding: 1rem;">
                    <i class="fas fa-exclamation-circle" style="font-size: 3rem; color: #f59e0b; margin-bottom: 1rem;"></i>
                    <p style="font-size: 1.05rem; color: #64748b;">${result.message}</p>
                </div>`);
                await loadAvailableSlots();
                return;
            }

            // الحجز نجح
            showConfirmation(slot);

        } catch (error) {
            console.error('خطأ في حجز الموعد:', error);
            showAlertDialog('خطأ', `<div style="text-align: center; padding: 1rem;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ef4444; margin-bottom: 1rem;"></i>
                <p style="font-size: 1.05rem; color: #64748b;">حدث خطأ أثناء حجز الموعد. يرجى المحاولة مرة أخرى</p>
            </div>`);
        }
    }

    // ============================================================================
    // عرض صفحة التأكيد
    // ============================================================================
    
    function showConfirmation(slot) {
        hideAllSteps();
        elements.confirmationStep.style.display = 'block';

        const slotTime = new Date(slot.slot_time);
        
        elements.confirmName.textContent = applicantData.name;
        
        elements.confirmDate.textContent = slotTime.toLocaleDateString('ar-SA', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        elements.confirmTime.textContent = slotTime.toLocaleTimeString('ar-SA', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });

        elements.confirmDuration.textContent = `${sessionData.slot_duration} دقيقة`;

        // رابط المقابلة أو الموقع
        if (sessionData.interview_type === 'online' && sessionData.meeting_link) {
            elements.meetingLinkCard.style.display = 'flex';
            elements.confirmMeetingLink.href = sessionData.meeting_link;
        } else if (sessionData.location) {
            elements.locationCard.style.display = 'flex';
            elements.confirmLocation.textContent = sessionData.location;
        }

        // زر إضافة للتقويم
        elements.addToCalendarBtn.addEventListener('click', () => {
            addToCalendar(slot);
        });

        // زر نسخ التفاصيل
        if (elements.copyDetailsBtn) {
            elements.copyDetailsBtn.addEventListener('click', () => {
                copyBookingDetails(slot);
            });
        }
    }

    // ============================================================================
    // إضافة للتقويم
    // ============================================================================
    
    function addToCalendar(slot) {
        const slotTime = new Date(slot.slot_time);
        const endTime = new Date(slot.slot_end_time);

        const formatDate = (date) => {
            return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };

        const title = encodeURIComponent(`مقابلة - ${sessionData.session_name}`);
        const details = encodeURIComponent(`مقابلة مع ${applicantData.name}\nاللجنة: ${applicantData.committee}`);
        const location = encodeURIComponent(sessionData.location || sessionData.meeting_link || '');

        const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${formatDate(slotTime)}/${formatDate(endTime)}&details=${details}&location=${location}`;

        window.open(googleCalendarUrl, '_blank');
    }

    // ============================================================================
    // عرض صفحة الحجز الحالي
    // ============================================================================
    
    function showExistingBookingStep() {
        hideAllSteps();
        elements.existingBookingStep.style.display = 'block';

        // عرض معلومات المتقدم
        elements.existingBookingName.textContent = applicantData.name;

        // تنسيق التاريخ والوقت
        const slotTime = new Date(existingBookingData.slotTime);
        const slotEndTime = new Date(existingBookingData.slotEndTime);

        elements.existingBookingDate.textContent = slotTime.toLocaleDateString('ar-SA', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const timeStr = slotTime.toLocaleTimeString('ar-SA', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }) + ' - ' + slotEndTime.toLocaleTimeString('ar-SA', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
        elements.existingBookingTime.textContent = timeStr;

        // رابط المقابلة أو الموقع
        if (sessionData.interview_type === 'online' && sessionData.meeting_link) {
            elements.existingMeetingLinkCard.style.display = 'flex';
            elements.existingBookingMeetingLink.href = sessionData.meeting_link;
        } else if (sessionData.location) {
            elements.existingLocationCard.style.display = 'flex';
            elements.existingBookingLocation.textContent = sessionData.location;
        }
    }

    // ============================================================================
    // حذف الحجز الحالي
    // ============================================================================
    
    elements.cancelBookingBtn.addEventListener('click', async () => {
        showConfirmDialog(
            'تأكيد الحذف',
            `<div style="text-align: center; padding: 1rem;">
                <i class="fas fa-trash-alt" style="font-size: 3rem; color: #ef4444; margin-bottom: 1rem;"></i>
                <p style="font-size: 1.1rem; margin-bottom: 0.5rem; font-weight: 600;">هل أنت متأكد من حذف هذا الموعد؟</p>
                <p style="color: #64748b; font-size: 0.95rem;">لن تتمكن من التراجع عن هذا الإجراء</p>
            </div>`,
            async () => {
                await cancelBooking();
            }
        );
    });

    async function cancelBooking() {

        elements.cancelBookingBtn.disabled = true;
        elements.cancelBookingBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحذف...';

        try {
            const { data, error } = await window.sbClient
                .rpc('cancel_booking', {
                    p_slot_id: existingBookingData.slotId,
                    p_application_id: applicantData.id
                });

            if (error) throw error;

            const result = data[0];

            if (!result.success) {
                showAlertDialog('خطأ', `<div style="text-align: center; padding: 1rem;">
                    <i class="fas fa-exclamation-circle" style="font-size: 3rem; color: #ef4444; margin-bottom: 1rem;"></i>
                    <p style="font-size: 1.05rem; color: #64748b;">${result.message}</p>
                </div>`);
                elements.cancelBookingBtn.disabled = false;
                elements.cancelBookingBtn.innerHTML = '<i class="fas fa-trash"></i> حذف الموعد';
                return;
            }

            existingBookingData = null;

            showAlertDialog('نجح', `<div style="text-align: center; padding: 1rem;">
                <i class="fas fa-check-circle" style="font-size: 3rem; color: #10b981; margin-bottom: 1rem;"></i>
                <p style="font-size: 1.1rem; font-weight: 600; color: #274060;">تم حذف الموعد بنجاح</p>
                <p style="color: #64748b; font-size: 0.95rem; margin-top: 0.5rem;">يمكنك الآن حجز موعد جديد</p>
            </div>`, async () => {
                await showSlotStep();
            });

            elements.cancelBookingBtn.disabled = false;
            elements.cancelBookingBtn.innerHTML = '<i class="fas fa-trash"></i> حذف الموعد';

        } catch (error) {
            console.error('خطأ في حذف الحجز:', error);
            showAlertDialog('خطأ', `<div style="text-align: center; padding: 1rem;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ef4444; margin-bottom: 1rem;"></i>
                <p style="font-size: 1.05rem; color: #64748b;">حدث خطأ أثناء حذف الحجز. يرجى المحاولة مرة أخرى</p>
            </div>`);
            elements.cancelBookingBtn.disabled = false;
            elements.cancelBookingBtn.innerHTML = '<i class="fas fa-trash"></i> حذف الموعد';
        }
    }

    // ============================================================================
    // الرجوع من صفحة الحجز الحالي
    // ============================================================================
    
    elements.backToPhoneFromExisting.addEventListener('click', () => {
        showPhoneStep();
        elements.verifyPhoneBtn.disabled = false;
        elements.verifyPhoneBtn.innerHTML = '<i class="fas fa-arrow-left"></i> التالي';
    });

    // ============================================================================
    // الرجوع لخطوة الهاتف
    // ============================================================================
    
    elements.backToPhoneBtn.addEventListener('click', () => {
        showPhoneStep();
    });

    // ============================================================================
    // دوال مساعدة
    // ============================================================================
    
    function showPhoneStep() {
        hideAllSteps();
        elements.phoneStep.style.display = 'block';
        elements.phoneInput.value = '';
        elements.phoneError.style.display = 'none';
    }

    function hideAllSteps() {
        elements.loadingState.style.display = 'none';
        elements.errorState.style.display = 'none';
        elements.phoneStep.style.display = 'none';
        elements.slotStep.style.display = 'none';
        elements.confirmationStep.style.display = 'none';
        if (elements.existingBookingStep) {
            elements.existingBookingStep.style.display = 'none';
        }
    }

    function showError(message) {
        hideAllSteps();
        elements.errorState.style.display = 'block';
        elements.errorMessage.textContent = message;
    }

    function showPhoneError(message) {
        elements.phoneError.textContent = message;
        elements.phoneError.style.display = 'block';
    }

    // ============================================================================
    // بدء التطبيق
    // ============================================================================
    
    // التحقق من وجود Supabase
    if (typeof window.sbClient === 'undefined') {
        showError('خطأ في الاتصال بقاعدة البيانات. يرجى المحاولة لاحقاً');
        return;
    }

    // ============================================================================
    // نظام النوافذ المنبثقة الموحد
    // ============================================================================
    
    function showConfirmDialog(title, content, onConfirm) {
        const modalHtml = `
            <div class="custom-modal active" id="bookingConfirmModal">
                <div class="custom-modal-overlay"></div>
                <div class="custom-modal-container" style="max-width: 450px;">
                    <div class="custom-modal-header">
                        <h2 class="custom-modal-title">
                            <i class="fas fa-question-circle"></i>
                            ${title}
                        </h2>
                        <button class="custom-modal-close" onclick="this.closest('.custom-modal').remove(); document.body.style.overflow = '';">
                            <i class="fas fa-xmark"></i>
                        </button>
                    </div>
                    <div class="custom-modal-body">
                        ${content}
                    </div>
                    <div class="custom-modal-footer" style="justify-content: center; gap: 1rem;">
                        <button class="modal-btn modal-btn-primary" id="confirmBtn">
                            <i class="fas fa-check"></i>
                            تأكيد
                        </button>
                        <button class="modal-btn modal-btn-secondary" id="cancelBtn" style="background: #e2e8f0; color: #475569;">
                            <i class="fas fa-times"></i>
                            إلغاء
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        document.body.style.overflow = 'hidden';
        
        const modal = document.getElementById('bookingConfirmModal');
        const confirmBtn = modal.querySelector('#confirmBtn');
        const cancelBtn = modal.querySelector('#cancelBtn');
        const overlay = modal.querySelector('.custom-modal-overlay');
        
        const closeModal = () => {
            modal.remove();
            document.body.style.overflow = '';
        };
        
        confirmBtn.addEventListener('click', () => {
            closeModal();
            if (onConfirm) onConfirm();
        });
        
        cancelBtn.addEventListener('click', closeModal);
        overlay.addEventListener('click', closeModal);
        
        // ESC key
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }
    
    function showAlertDialog(title, content, onClose) {
        const modalHtml = `
            <div class="custom-modal active" id="bookingAlertModal">
                <div class="custom-modal-overlay"></div>
                <div class="custom-modal-container" style="max-width: 450px;">
                    <div class="custom-modal-header">
                        <h2 class="custom-modal-title">
                            <i class="fas fa-info-circle"></i>
                            ${title}
                        </h2>
                        <button class="custom-modal-close" onclick="this.closest('.custom-modal').remove(); document.body.style.overflow = '';">
                            <i class="fas fa-xmark"></i>
                        </button>
                    </div>
                    <div class="custom-modal-body">
                        ${content}
                    </div>
                    <div class="custom-modal-footer" style="justify-content: center;">
                        <button class="modal-btn modal-btn-primary" id="okBtn">
                            <i class="fas fa-check"></i>
                            حسناً
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        document.body.style.overflow = 'hidden';
        
        const modal = document.getElementById('bookingAlertModal');
        const okBtn = modal.querySelector('#okBtn');
        const overlay = modal.querySelector('.custom-modal-overlay');
        
        const closeModal = () => {
            modal.remove();
            document.body.style.overflow = '';
            if (onClose) onClose();
        };
        
        okBtn.addEventListener('click', closeModal);
        overlay.addEventListener('click', closeModal);
        
        // ESC key
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    // ============================================================================
    // نسخ تفاصيل الحجز
    // ============================================================================
    
    function copyBookingDetails(slot) {
        const slotTime = new Date(slot.slot_time);
        const slotEndTime = new Date(slot.slot_end_time);
        
        const dateStr = slotTime.toLocaleDateString('ar-SA', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        const timeStr = slotTime.toLocaleTimeString('ar-SA', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
        
        const endTimeStr = slotEndTime.toLocaleTimeString('ar-SA', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
        
        let details = `📋 تفاصيل حجز المقابلة\n`;
        details += `━━━━━━━━━━━━━━━━━━━━\n\n`;
        details += `👤 الاسم: ${applicantData.name}\n`;
        details += `📅 التاريخ: ${dateStr}\n`;
        details += `🕐 الوقت: ${timeStr} - ${endTimeStr}\n`;
        details += `⏱️ المدة: ${sessionData.slot_duration} دقيقة\n`;
        details += `📌 الجلسة: ${sessionData.session_name}\n`;
        
        if (sessionData.interview_type === 'online' && sessionData.meeting_link) {
            details += `🔗 رابط المقابلة: ${sessionData.meeting_link}\n`;
        } else if (sessionData.location) {
            details += `📍 الموقع: ${sessionData.location}\n`;
        }
        
        // نسخ إلى الحافظة
        navigator.clipboard.writeText(details).then(() => {
            showCopyNotification('تم نسخ التفاصيل بنجاح ✓');
        }).catch((err) => {
            console.error('خطأ في النسخ:', err);
            // Fallback للمتصفحات القديمة
            fallbackCopyText(details);
        });
    }
    
    // ============================================================================
    // Fallback للنسخ في المتصفحات القديمة
    // ============================================================================
    
    function fallbackCopyText(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                showCopyNotification('تم نسخ التفاصيل بنجاح ✓');
            } else {
                showCopyNotification('فشل النسخ. يرجى النسخ يدوياً', 'error');
            }
        } catch (err) {
            console.error('Fallback: خطأ في النسخ', err);
            showCopyNotification('فشل النسخ. يرجى النسخ يدوياً', 'error');
        }
        
        document.body.removeChild(textArea);
    }
    
    // ============================================================================
    // إظهار إشعار النسخ
    // ============================================================================
    
    function showCopyNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = 'copy-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #ef4444, #dc2626)'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            z-index: 10000;
            font-family: fb;
            font-size: 1rem;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            animation: slideInRight 0.3s ease-out;
            max-width: 350px;
        `;
        
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}" style="font-size: 1.25rem;"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    // بدء التهيئة
    init();

})();
