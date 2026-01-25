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
        addToCalendarBtn: document.getElementById('addToCalendarBtn')
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

        // تنسيق الوقت
        elements.sessionTime.textContent = `${sessionData.start_time.substring(0, 5)} - ${sessionData.end_time.substring(0, 5)}`;

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
    // التحقق من رقم الهاتف
    // ============================================================================
    
    elements.verifyPhoneBtn.addEventListener('click', async () => {
        const phone = elements.phoneInput.value.trim();

        // التحقق من صحة الرقم
        if (!phone) {
            showPhoneError('يرجى إدخال رقم الهاتف');
            return;
        }

        if (!/^05\d{8}$/.test(phone)) {
            showPhoneError('رقم الهاتف غير صحيح. يجب أن يبدأ بـ 05 ويتكون من 10 أرقام');
            return;
        }

        elements.verifyPhoneBtn.disabled = true;
        elements.verifyPhoneBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';

        try {
            const { data, error } = await window.sbClient
                .rpc('validate_phone_for_booking', {
                    p_phone: phone,
                    p_session_id: sessionData.id
                });

            if (error) throw error;

            const result = data[0];

            // حفظ بيانات المتقدم
            applicantData = {
                id: result.application_id,
                name: result.full_name,
                email: result.email,
                committee: result.preferred_committee
            };

            // التحقق من وجود حجز مسبق
            if (result.has_existing_booking) {
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
                showPhoneError(result.error_message);
                elements.verifyPhoneBtn.disabled = false;
                elements.verifyPhoneBtn.innerHTML = '<i class="fas fa-arrow-left"></i> التالي';
                return;
            }

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
                    <span class="slot-time">${timeStr}</span>
                    <span class="slot-status">محجوز</span>
                `;
            } else if (isExpired) {
                // منتهي
                expiredCount++;
                slotBtn.classList.add('expired');
                slotBtn.disabled = true;
                slotBtn.innerHTML = `
                    <span class="slot-time">${timeStr}</span>
                    <span class="slot-status">انتهى</span>
                `;
            } else {
                // متاح
                availableCount++;
                slotBtn.classList.add('available');
                slotBtn.innerHTML = `
                    <span class="slot-time">${timeStr}</span>
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

        const confirmed = confirm(`هل تريد حجز الموعد:\n${dateStr}\nالساعة ${timeStr}؟`);

        if (confirmed) {
            await bookSlot(slot);
        }
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
                alert(result.message);
                await loadAvailableSlots(); // إعادة تحميل المواعيد
                return;
            }

            // الحجز نجح
            showConfirmation(slot);

        } catch (error) {
            console.error('خطأ في حجز الموعد:', error);
            alert('حدث خطأ أثناء حجز الموعد. يرجى المحاولة مرة أخرى');
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
        // تأكيد الحذف
        const confirmed = confirm('هل أنت متأكد من حذف هذا الموعد؟');
        if (!confirmed) return;

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
                alert('خطأ: ' + result.message);
                elements.cancelBookingBtn.disabled = false;
                elements.cancelBookingBtn.innerHTML = '<i class="fas fa-trash"></i> حذف الموعد';
                return;
            }

            // إعادة تعيين بيانات الحجز الحالي
            existingBookingData = null;

            // عرض رسالة نجاح
            alert('تم حذف الموعد بنجاح. يمكنك الآن حجز موعد جديد.');

            // إعادة تعيين زر الحذف
            elements.cancelBookingBtn.disabled = false;
            elements.cancelBookingBtn.innerHTML = '<i class="fas fa-trash"></i> حذف الموعد';

            // الانتقال لاختيار موعد جديد
            await showSlotStep();

        } catch (error) {
            console.error('خطأ في حذف الحجز:', error);
            alert('حدث خطأ أثناء حذف الحجز. يرجى المحاولة مرة أخرى');
            elements.cancelBookingBtn.disabled = false;
            elements.cancelBookingBtn.innerHTML = '<i class="fas fa-trash"></i> حذف الموعد';
        }
    });

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

    // بدء التهيئة
    init();

})();
