/**
 * نظام إدارة الملف الشخصي
 * عرض وتعديل المعلومات الشخصية، الأمان، النشاط
 */

(function () {
    'use strict';

    let currentUser = null;
    let cachedMemberDetails = null;

    /**
     * تهيئة مدير الملف الشخصي
     */
    async function init(user) {
        currentUser = user;
        
        // جلب role_level من user_roles
        const { data: userRoleData } = await window.sbClient
            .from('user_roles')
            .select('role:roles(role_level)')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .single();
        
        if (userRoleData && userRoleData.role) {
            currentUser.role_level = userRoleData.role.role_level;
        }
        
        const memberDetails = await loadProfileData();
        await loadRecentActivity();
        
        // تحميل بيانات اللجنة
        const { data: userRole } = await window.sbClient
            .from('user_roles')
            .select('committee_id, committees(committee_name_ar)')
            .eq('user_id', currentUser.id)
            .eq('is_active', true)
            .single();
        
        if (userRole && userRole.committee_id) {
            await loadCommitteeData(userRole);
        }
        
        // تحميل بطاقة العضوية
        await loadMembershipCard(memberDetails);
        
        // تحميل الرابط الشخصي
        await loadProfileLink(memberDetails);

        bindEvents();
    }

    /**
     * تحميل بيانات الملف الشخصي
     */
    async function loadProfileData() {
        try {
            if (!currentUser) return null;

            // جلب بيانات member_details
            const { data: memberDetails, error: memberError } = await window.sbClient
                .from('member_details')
                .select('*, committees(committee_name_ar)')
                .eq('user_id', currentUser.id)
                .single();

            if (memberError && memberError.code !== 'PGRST116') {
                console.error('خطأ في جلب بيانات العضو:', memberError);
                return null;
            }

            cachedMemberDetails = memberDetails;

            // جلب معلومات اللجنة من user_roles
            const { data: userRole } = await window.sbClient
                .from('user_roles')
                .select('committee_id, committees(committee_name_ar), roles(role_name, role_level)')
                .eq('user_id', currentUser.id)
                .eq('is_active', true)
                .order('roles(role_level)', { ascending: false })
                .limit(1)
                .single();

            // جلب آخر تسجيل دخول من auth.users
            const { data: { user: authUser } } = await window.sbClient.auth.getUser();

            // تحديث الصورة الشخصية
            const avatar = document.getElementById('profileAvatar');
            if (avatar) {
                const displayName = memberDetails?.full_name_triple || currentUser.full_name || 'User';
                avatar.src = currentUser.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=3d8fd6&color=fff&size=200`;
            }

            // تحديث الاسم
            const fullName = document.getElementById('profileFullName');
            if (fullName) {
                fullName.textContent = memberDetails?.full_name_triple || currentUser.full_name || currentUser.email;
            }

            // تحديث الدور بالطريقة المطلوبة
            const role = document.getElementById('profileRole');
            if (role) {
                const roleDisplay = await getRoleDisplay(currentUser, userRole);
                role.innerHTML = `<i class="fa-solid fa-shield-halved"></i> <span>${roleDisplay}</span>`;
            }

            // تحديث البريد الإلكتروني
            const email = document.getElementById('profileEmail');
            if (email) {
                email.textContent = memberDetails?.email || currentUser.email;
            }

            // تحديث رقم الهاتف
            const phone = document.getElementById('profilePhone');
            if (phone) {
                phone.textContent = memberDetails?.phone || currentUser.phone || 'غير محدد';
            }

            // تحديث تاريخ الانضمام
            const joinDate = document.getElementById('profileJoinDate');
            if (joinDate) {
                joinDate.textContent = new Date(currentUser.created_at).toLocaleDateString('ar-SA', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            }

            // تحديث آخر تسجيل دخول من auth.users
            const lastLogin = document.getElementById('profileLastLogin');
            if (lastLogin) {
                const lastSignIn = authUser?.last_sign_in_at || currentUser.last_sign_in_at;
                if (lastSignIn) {
                    const d = new Date(lastSignIn);
                    const datePart = d.toLocaleDateString('ar-SA', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                    const timePart = d.toLocaleTimeString('ar-SA', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                    });
                    lastLogin.textContent = `${datePart}، الساعة ${timePart}`;
                } else {
                    lastLogin.textContent = 'غير معروف';
                }
            }

            // تحديث رقم الهوية الوطنية في كارد المعلومات الأساسية
            const nationalIdBasic = document.getElementById('profileNationalIdBasic');
            if (nationalIdBasic && memberDetails?.national_id) {
                nationalIdBasic.textContent = memberDetails.national_id;
            }

            // تحديث تاريخ الميلاد في كارد المعلومات الأساسية
            const birthDateBasic = document.getElementById('profileBirthDateBasic');
            if (birthDateBasic && memberDetails?.birth_date) {
                birthDateBasic.textContent = new Date(memberDetails.birth_date).toLocaleDateString('ar-SA', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            }

            // تحديث اللون المفضل
            const favoriteColorEl = document.getElementById('profileFavoriteColor');
            if (favoriteColorEl) {
                favoriteColorEl.textContent = memberDetails?.favorite_color || 'غير محدد';
            }

            // تحديث اللجنة من user_roles
            const committee = document.getElementById('profileCommittee');
            if (committee) {
                const committeeName = userRole?.committees?.committee_name_ar || memberDetails?.committees?.committee_name_ar;
                committee.textContent = committeeName || 'غير محدد';
            }

            // عرض حقول المجلس / القسم / اللجنة بناءً على الدور
            await displayCouncilFields(userRole);

            // تحديث آخر تغيير لكلمة المرور
            const lastPasswordChange = document.getElementById('lastPasswordChange');
            if (lastPasswordChange) {
                lastPasswordChange.textContent = 'غير معروف';
            }

            // عرض بيانات member_details الإضافية إذا كانت موجودة
            displayMemberDetails(memberDetails, userRole);

            // تحميل بيانات اللجنة
            await loadCommitteeData(userRole);

            // تحميل بطاقة العضوية
            await loadMembershipCard(memberDetails);

            return memberDetails;

        } catch (error) {
            console.error('خطأ في تحميل بيانات الملف الشخصي:', error);
            showNotification('فشل تحميل بيانات الملف الشخصي', 'error');
            return null;
        }
    }

    /**
     * عرض بيانات العضو التفصيلية
     */
    function displayMemberDetails(details, userRole) {
        if (!details) {
            const card = document.getElementById('memberDetailsCard');
            if (card) card.style.display = 'none';
            return;
        }

        const degreeMap = {
            'high_school': 'ثانوية عامة',
            'diploma': 'دبلوم',
            'bachelor': 'بكالوريوس',
            'master': 'ماجستير',
            'phd': 'دكتوراه',
            'other': 'أخرى'
        };

        const nationalId = document.getElementById('profileNationalId');
        if (nationalId) {
            nationalId.innerHTML = `<span class="info-value">${details.national_id || 'غير محدد'}</span>`;
        }

        const academicRecord = document.getElementById('profileAcademicRecord');
        if (academicRecord) {
            academicRecord.innerHTML = `<span class="info-value">${details.academic_record_number || 'غير محدد'}</span>`;
        }

        const birthDate = document.getElementById('profileBirthDate');
        if (birthDate && details.birth_date) {
            birthDate.innerHTML = `<span class="info-value">${new Date(details.birth_date).toLocaleDateString('ar-SA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })}</span>`;
        }

        const academicDegree = document.getElementById('profileAcademicDegree');
        if (academicDegree) {
            academicDegree.innerHTML = `<span class="info-value">${degreeMap[details.academic_degree] || details.academic_degree || 'غير محدد'}</span>`;
        }

        const college = document.getElementById('profileCollege');
        if (college) {
            college.innerHTML = `<span class="info-value">${details.college || 'غير محدد'}</span>`;
        }

        const major = document.getElementById('profileMajor');
        if (major) {
            major.innerHTML = `<span class="info-value">${details.major || 'غير محدد'}</span>`;
        }

        const twitter = document.getElementById('profileTwitter');
        if (twitter) {
            twitter.innerHTML = `<span class="info-value">${details.twitter_account || 'غير محدد'}</span>`;
        }

        const instagram = document.getElementById('profileInstagram');
        if (instagram) {
            instagram.innerHTML = `<span class="info-value">${details.instagram_account || 'غير محدد'}</span>`;
        }

        const tiktok = document.getElementById('profileTiktok');
        if (tiktok) {
            tiktok.innerHTML = `<span class="info-value">${details.tiktok_account || 'غير محدد'}</span>`;
        }

        const linkedin = document.getElementById('profileLinkedin');
        if (linkedin) {
            linkedin.innerHTML = `<span class="info-value">${details.linkedin_account || 'غير محدد'}</span>`;
        }
    }

    /**
     * عرض حقول المجلس / القسم / اللجنة بناءً على الدور
     */
    async function displayCouncilFields(userRole) {
        const councilRow = document.getElementById('profileCouncilRow');
        const councilEl = document.getElementById('profileCouncil');
        const departmentRow = document.getElementById('profileDepartmentRow');
        const departmentEl = document.getElementById('profileDepartment');
        const committeeRowBasic = document.getElementById('profileCommitteeRowBasic');
        const committeeBasicEl = document.getElementById('profileCommitteeBasic');

        if (!userRole) return;

        const roleName = userRole.roles?.role_name || '';
        const roleLevel = userRole.roles?.role_level || 0;

        // المجلس الإداري: رئيس أدِيب، مستشار الرئيس، الرئيس التنفيذي،
        // قائد إدارة الموارد البشرية، قائد إدارة الضمان والجودة،
        // عضو إداري الموارد البشرية، عضو إداري الضمان والجودة
        const adminCouncilRoles = [
            'club_president',
            'president_advisor',
            'executive_council_president',
            'hr_committee_leader',
            'qa_committee_leader',
            'hr_admin_member',
            'qa_admin_member'
        ];

        // المجلس التنفيذي: رئيس قسم، قادة اللجان، نواب اللجان
        const execCouncilRoles = [
            'department_head',
            'committee_leader',
            'deputy_committee_leader'
        ];

        if (adminCouncilRoles.includes(roleName)) {
            if (councilRow) councilRow.style.display = 'flex';
            if (councilEl) councilEl.textContent = 'المجلس الإداري';
        } else if (execCouncilRoles.includes(roleName)) {
            if (councilRow) councilRow.style.display = 'flex';
            if (councilEl) councilEl.textContent = 'المجلس التنفيذي';
        }

        // عضو: يظهر له القسم واللجنة
        if (roleName === 'committee_member') {
            // جلب بيانات القسم إذا كان الدور عضو لجنة
            if (userRole.committee_id) {
                try {
                    const { data: committeeData } = await window.sbClient
                        .from('committees')
                        .select('committee_name_ar, department_id, departments(name_ar)')
                        .eq('id', userRole.committee_id)
                        .single();

                    if (committeeData) {
                        if (committeeRowBasic) committeeRowBasic.style.display = 'flex';
                        if (committeeBasicEl) committeeBasicEl.textContent = committeeData.committee_name_ar || '-';

                        if (committeeData.departments?.name_ar) {
                            if (departmentRow) departmentRow.style.display = 'flex';
                            if (departmentEl) departmentEl.textContent = committeeData.departments.name_ar;
                        }
                    }
                } catch (e) {
                    console.error('خطأ في جلب بيانات القسم/اللجنة:', e);
                }
            }
        }
    }

    /**
     * الحصول على عرض الدور بالطريقة المطلوبة
     */
    async function getRoleDisplay(user, userRole) {
        try {
            // جلب جميع أدوار المستخدم النشطة مع الأولوية للدور الأعلى
            const { data: rolesData, error } = await window.sbClient
                .from('user_roles')
                .select('committee_id, committees(committee_name_ar), roles(role_name, role_level)')
                .eq('user_id', user.id)
                .eq('is_active', true)
                .order('roles(role_level)', { ascending: false });

            if (error) {
                console.error('خطأ في جلب الأدوار:', error);
                return 'عضو لجنة';
            }

            if (!rolesData || rolesData.length === 0) return 'عضو لجنة';

            // اختيار الدور الأعلى (أول عنصر بعد الترتيب)
            const roleData = rolesData[0];
            const roleName = roleData.roles?.role_name;
            const committeeName = roleData.committees?.committee_name_ar || '';

            // تحديد عرض الدور بناءً على نوع الدور
            switch (roleName) {
                case 'club_president':
                    return 'رئيس نادي أدِيب';
                case 'executive_president':
                    return 'الرئيس التنفيذي';
                case 'committee_leader':
                    return committeeName ? `قائد ${committeeName}` : 'قائد لجنة';
                case 'deputy_committee_leader':
                    return committeeName ? `نائب ${committeeName}` : 'نائب قائد لجنة';
                case 'committee_member':
                    return committeeName ? `عضو ${committeeName}` : 'عضو لجنة';
                default:
                    return 'عضو لجنة';
            }
        } catch (error) {
            console.error('خطأ في جلب عرض الدور:', error);
            return 'عضو لجنة';
        }
    }

    /**
     * تحميل النشاط الأخير
     */
    async function loadRecentActivity() {
        try {
            const container = document.getElementById('recentActivityContainer');
            if (!container) return;

            const { data, error } = await window.sbClient
                .from('activity_log')
                .select('*')
                .eq('user_id', currentUser.id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;

            if (!data || data.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state__icon"><i class="fa-solid fa-inbox"></i></div>
                        <p class="empty-state__message">لا يوجد نشاط مسجل</p>
                    </div>
                `;
                return;
            }

            const html = data.map(activity => `
                <div class="uc-card__info-item" style="--_uc-color-rgb: ${getActivityColorRgb(activity.action_type)};">
                    <div class="uc-card__info-icon" style="background: ${getActivityColor(activity.action_type)};">
                        <i class="fa-solid ${getActivityIcon(activity.action_type)}"></i>
                    </div>
                    <div class="uc-card__info-content">
                        <span class="uc-card__info-value">${getActivityText(activity)}</span>
                        <span class="uc-card__info-label"><i class="fa-regular fa-clock"></i> ${formatActivityDate(activity.created_at)}</span>
                    </div>
                </div>
            `).join('');

            container.innerHTML = html;

        } catch (error) {
            console.error('خطأ في تحميل النشاط:', error);
            const container = document.getElementById('recentActivityContainer');
            if (container) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state__icon"><i class="fa-solid fa-exclamation-circle" style="color: var(--color-danger);"></i></div>
                        <p class="empty-state__message">فشل تحميل النشاط</p>
                    </div>
                `;
            }
        }
    }

    /**
     * تنسيق تاريخ النشاط
     */
    function formatActivityDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'الآن';
        if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
        if (diffHours < 24) return `منذ ${diffHours} ساعة`;
        if (diffDays < 7) return `منذ ${diffDays} يوم`;
        
        return date.toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * استخراج الفعل الأساسي من نوع النشاط
     */
    function getBaseAction(actionType) {
        if (!actionType) return 'other';
        if (actionType === 'login')                          return 'login';
        if (actionType === 'logout')                         return 'logout';
        if (actionType.startsWith('create') || actionType.startsWith('add') || actionType.startsWith('grant')) return 'create';
        if (actionType.startsWith('update') || actionType.startsWith('edit') || actionType.startsWith('change')) return 'update';
        if (actionType.startsWith('delete') || actionType.startsWith('remove') || actionType.startsWith('cancel')) return 'delete';
        if (actionType.startsWith('approve') || actionType.startsWith('accept')) return 'approve';
        if (actionType.startsWith('reject'))                 return 'reject';
        if (actionType.startsWith('publish') || actionType.startsWith('send')) return 'publish';
        if (actionType.startsWith('archive'))                return 'archive';
        if (actionType.startsWith('reply'))                  return 'reply';
        if (actionType.startsWith('start'))                  return 'start';
        if (actionType.startsWith('end') || actionType.startsWith('finish') || actionType.startsWith('close')) return 'end';
        if (actionType.startsWith('impersonate_start'))      return 'impersonate_start';
        if (actionType.startsWith('impersonate_end'))        return 'impersonate_end';
        if (actionType.startsWith('impersonate'))            return 'impersonate_start';
        return 'other';
    }

    /**
     * الحصول على لون النشاط
     */
    function getActivityColor(actionType) {
        const base = getBaseAction(actionType);
        const colors = {
            'login':   '#10b981',
            'logout':  '#ef4444',
            'create':  '#3b82f6',
            'update':  '#f59e0b',
            'delete':  '#ef4444',
            'approve': '#10b981',
            'reject':  '#f43f5e',
            'publish': '#8b5cf6',
            'archive': '#64748b',
            'reply':   '#06b6d4',
            'start':   '#14b8a6',
            'end':              '#f97316',
            'impersonate_start':'#a855f7',
            'impersonate_end':  '#14b8a6',
            'other':            '#64748b',
        };
        return colors[base] || '#64748b';
    }

    /**
     * الحصول على لون النشاط بصيغة RGB
     */
    function getActivityColorRgb(actionType) {
        const base = getBaseAction(actionType);
        const colors = {
            'login':            '16, 185, 129',
            'logout':           '239, 68, 68',
            'create':           '59, 130, 246',
            'update':           '245, 158, 11',
            'delete':           '239, 68, 68',
            'approve':          '16, 185, 129',
            'reject':           '244, 63, 94',
            'publish':          '139, 92, 246',
            'archive':          '100, 116, 139',
            'reply':            '6, 182, 212',
            'start':            '20, 184, 166',
            'end':              '249, 115, 22',
            'impersonate_start':'168, 85, 247',
            'impersonate_end':  '20, 184, 166',
            'other':            '100, 116, 139',
        };
        return colors[base] || '100, 116, 139';
    }

    /**
     * الحصول على أيقونة النشاط
     */
    function getActivityIcon(actionType) {
        const base = getBaseAction(actionType);
        const icons = {
            'login':            'fa-right-to-bracket',
            'logout':           'fa-right-from-bracket',
            'create':           'fa-plus',
            'update':           'fa-pen',
            'delete':           'fa-trash',
            'approve':          'fa-check',
            'reject':           'fa-xmark',
            'publish':          'fa-paper-plane',
            'archive':          'fa-box-archive',
            'reply':            'fa-reply',
            'start':            'fa-play',
            'end':              'fa-stop',
            'impersonate_start':'fa-user-secret',
            'impersonate_end':  'fa-user-check',
            'other':            'fa-circle-dot',
        };
        return icons[base] || 'fa-circle-dot';
    }

    /**
     * الحصول على نص النشاط بالعربية
     */
    function getActivityText(activity) {
        const type = activity.action_type || '';

        // جدول نصوص كاملة (action_type مركّب أو بسيط)
        const fullTexts = {
            // مصادقة
            'login':                       'تسجيل دخول',
            'logout':                      'تسجيل خروج',
            'impersonate_start':           'بدء انتحال هوية مستخدم',
            'impersonate_end':             'إنهاء انتحال هوية مستخدم',
            // أعضاء
            'create_member':               'إضافة عضو جديد',
            'update_member':               'تعديل بيانات عضو',
            'delete_member':               'حذف عضو',
            'approve_member':              'قبول طلب عضوية',
            'reject_member':               'رفض طلب عضوية',
            // عضوية هدية
            'create_gift_membership':      'منح عضوية هدية',
            'update_gift_membership':      'تعديل عضوية هدية',
            'delete_gift_membership':      'إلغاء عضوية هدية',
            // عضوية
            'create_membership':           'إنشاء عضوية',
            'update_membership':           'تحديث عضوية',
            'approve_membership':          'قبول عضوية',
            'reject_membership':           'رفض عضوية',
            'archive_membership':          'أرشفة عضوية',
            // طلبات معلّقة
            'approve_pending':             'قبول طلب معلّق',
            'reject_pending':              'رفض طلب معلّق',
            // أخبار
            'create_news':                 'نشر خبر جديد',
            'update_news':                 'تعديل خبر',
            'delete_news':                 'حذف خبر',
            'publish_news':                'نشر خبر',
            'draft_news':                  'حفظ مسودة خبر',
            // نشرة بريدية
            'create_newsletter':           'إنشاء نشرة بريدية',
            'send_newsletter':             'إرسال نشرة بريدية',
            'delete_newsletter':           'حذف نشرة بريدية',
            // استبيانات
            'create_survey':               'إنشاء استبيان',
            'update_survey':               'تعديل استبيان',
            'delete_survey':               'حذف استبيان',
            'publish_survey':              'نشر استبيان',
            // مناصب
            'create_position':             'إضافة منصب',
            'update_position':             'تعديل منصب',
            'delete_position':             'حذف منصب',
            // مستخدمون
            'create_user':                 'إضافة مستخدم',
            'update_user':                 'تعديل مستخدم',
            'delete_user':                 'حذف مستخدم',
            // لجنة
            'create_committee_member':     'إضافة عضو في اللجنة',
            'update_committee_member':     'تعديل عضو في اللجنة',
            'delete_committee_member':     'حذف عضو من اللجنة',
            // مقابلات
            'create_interview':            'إنشاء جلسة مقابلة',
            'update_interview':            'تعديل جلسة مقابلة',
            'delete_interview':            'حذف جلسة مقابلة',
            // الملف الشخصي
            'update_profile':              'تحديث الملف الشخصي',
            'update_avatar':               'تغيير الصورة الشخصية',
            'update_password':             'تغيير كلمة المرور',
            // صلاحيات
            'update_permissions':          'تعديل الصلاحيات',
            // رسائل التواصل
            'reply_contact':               'الرد على رسالة تواصل',
            'delete_contact':              'حذف رسالة تواصل',
            // أفعال بسيطة
            'create':                      'إنشاء',
            'update':                      'تحديث',
            'delete':                      'حذف',
            'approve':                     'موافقة',
            'reject':                      'رفض',
            'publish':                     'نشر',
            'archive':                     'أرشفة',
            'send':                        'إرسال',
            'reply':                       'رد',
            'start':                       'بدء',
            'end':                         'إنهاء',
        };

        if (fullTexts[type]) return fullTexts[type];

        // محاولة action_type + module
        const moduleLabels = {
            'members':             'الأعضاء',
            'member':              'عضو',
            'membership':          'العضوية',
            'pending_members':     'الطلبات المعلّقة',
            'membership_archives': 'أرشيف العضوية',
            'membership_decisions':'قرارات العضوية',
            'gift_membership':     'عضوية هدية',
            'news':                'الأخبار',
            'news_workflow':       'سير الأخبار',
            'news_draft':          'مسودة أخبار',
            'newsletter':          'النشرة البريدية',
            'positions':           'المناصب',
            'position':            'منصب',
            'surveys':             'الاستبيانات',
            'survey':              'استبيان',
            'users':               'المستخدمين',
            'user':                'مستخدم',
            'committee':           'اللجنة',
            'committee_members':   'أعضاء اللجنة',
            'interviews':          'جدولة مقابلات فردية',
            'interview_sessions':  'جدولة مقابلات جماعية',
            'profile':             'الملف الشخصي',
            'avatar':              'الصورة الشخصية',
            'permissions':         'الصلاحيات',
            'contact_messages':    'رسائل التواصل',
            'contacts':            'جهات الاتصال',
            'settings':            'الإعدادات',
        };

        const actionLabels = {
            'login':   'تسجيل دخول',
            'logout':  'تسجيل خروج',
            'create':  'إنشاء',
            'update':  'تحديث',
            'delete':  'حذف',
            'approve': 'موافقة',
            'reject':  'رفض',
            'publish': 'نشر',
            'archive': 'أرشفة',
            'send':    'إرسال',
            'reply':   'رد على',
            'start':   'بدء',
            'end':     'إنهاء',
        };

        const moduleKey = activity.module ? `${type}_${activity.module}` : null;
        if (moduleKey && fullTexts[moduleKey]) return fullTexts[moduleKey];

        const base = getBaseAction(type);
        const actionText = actionLabels[base] || type;
        const moduleText = activity.module ? (moduleLabels[activity.module] || '') : '';
        return `${actionText}${moduleText ? ' ' + moduleText : ''}`;
    }

    /**
     * ربط حقول كل كارد بمدخلات الـ Modal
     */
    const MODAL_FIELDS = {
        'basic': {
            'profilePhone':           'modalEditPhone',
            'profileNationalIdBasic': 'modalEditNationalId',
            'profileBirthDateBasic':  'modalEditBirthDate',
            'profileFavoriteColor':   'modalEditFavoriteColor',
        },
        'academic': {
            'profileAcademicRecord': 'modalEditAcademicRecord',
            'profileAcademicDegree': 'modalEditAcademicDegree',
            'profileCollege':        'modalEditCollege',
            'profileMajor':          'modalEditMajor',
        },
        'social': {
            'profileTwitter':   'modalEditTwitter',
            'profileInstagram': 'modalEditInstagram',
            'profileLinkedin':  'modalEditLinkedin',
            'profileTiktok':    'modalEditTiktok',
        },
    };

    const FIELD_MAPPING = {
        'profilePhone':           { column: 'phone', also: 'profiles' },
        'profileNationalIdBasic': { column: 'national_id' },
        'profileBirthDateBasic':  { column: 'birth_date' },
        'profileFavoriteColor':   { column: 'favorite_color' },
        'profileAcademicRecord':  { column: 'academic_record_number' },
        'profileAcademicDegree':  { column: 'academic_degree' },
        'profileCollege':         { column: 'college' },
        'profileMajor':           { column: 'major' },
        'profileTwitter':         { column: 'twitter_account' },
        'profileInstagram':       { column: 'instagram_account' },
        'profileTiktok':          { column: 'tiktok_account' },
        'profileLinkedin':        { column: 'linkedin_account' },
    };

    /**
     * ربط أزرار التعديل بالـ Modals
     */
    function setupEditModals() {
        document.querySelectorAll('[data-card-edit]').forEach(btn => {
            btn.addEventListener('click', () => openEditModal(btn.dataset.cardEdit));
        });

        // basic
        document.getElementById('closeEditBasicModal')?.addEventListener('click', () => closeEditModal('basic'));
        document.getElementById('cancelEditBasicBtn')?.addEventListener('click',   () => closeEditModal('basic'));
        document.getElementById('saveEditBasicBtn')?.addEventListener('click',     () => saveModalEdit('basic'));
        document.getElementById('editBasicBackdrop')?.addEventListener('click',    () => closeEditModal('basic'));

        setupFavoriteColorSync();

        // academic
        document.getElementById('closeEditAcademicModal')?.addEventListener('click', () => closeEditModal('academic'));
        document.getElementById('cancelEditAcademicBtn')?.addEventListener('click',   () => closeEditModal('academic'));
        document.getElementById('saveEditAcademicBtn')?.addEventListener('click',     () => saveModalEdit('academic'));
        document.getElementById('editAcademicBackdrop')?.addEventListener('click',    () => closeEditModal('academic'));

        // social
        document.getElementById('closeEditSocialModal')?.addEventListener('click', () => closeEditModal('social'));
        document.getElementById('cancelEditSocialBtn')?.addEventListener('click',   () => closeEditModal('social'));
        document.getElementById('saveEditSocialBtn')?.addEventListener('click',     () => saveModalEdit('social'));
        document.getElementById('editSocialBackdrop')?.addEventListener('click',    () => closeEditModal('social'));
    }

    function openEditModal(cardName) {
        // ملء حقول الـ Modal — نفضّل القيمة الخام من cachedMemberDetails ثم نرجع للـ span
        Object.entries(MODAL_FIELDS[cardName] || {}).forEach(([fieldId, inputId]) => {
            const span  = document.getElementById(fieldId);
            const input = document.getElementById(inputId);
            if (!input) return;

            const mapping = FIELD_MAPPING[fieldId];
            let value = '';

            if (mapping && cachedMemberDetails && cachedMemberDetails[mapping.column] != null) {
                const raw = cachedMemberDetails[mapping.column];
                // تاريخ الميلاد يحتاج صيغة YYYY-MM-DD لـ input[type=date]
                if (input.type === 'date' && typeof raw === 'string') {
                    value = raw.length >= 10 ? raw.slice(0, 10) : raw;
                } else {
                    value = String(raw);
                }
            } else if (span) {
                const raw = span.textContent.trim();
                value = (raw === 'غير محدد' || raw === 'جاري التحميل...') ? '' : raw;
            }

            if (input.tagName === 'SELECT') {
                const byVal  = [...input.options].find(o => o.value === value);
                const byText = [...input.options].find(o => o.textContent.trim() === value);
                input.value = byVal ? value : (byText ? byText.value : '');
            } else {
                input.value = value;
            }
        });

        if (cardName === 'basic') {
            const hex = document.getElementById('modalEditFavoriteColor');
            const valid = normalizeHex(hex?.value);
            // إذا كانت القيمة المخزّنة hex صالحاً نزامنه بالكامل؛ وإلا نحدّث الـ picker والـ swatch فقط دون مسح النص
            applyFavoriteColor(valid || '#3d77bc', valid ? 'init' : 'hex');
        }

        const cap = cardName.charAt(0).toUpperCase() + cardName.slice(1);
        document.getElementById(`edit${cap}Backdrop`)?.classList.add('active');
        document.getElementById(`edit${cap}Modal`)?.classList.add('active');
        // التركيز على أول حقل قابل للتعديل
        document.getElementById(`edit${cap}Modal`)?.querySelector('.form-input')?.focus();
    }

    function closeEditModal(cardName) {
        const cap = cardName.charAt(0).toUpperCase() + cardName.slice(1);
        document.getElementById(`edit${cap}Backdrop`)?.classList.remove('active');
        document.getElementById(`edit${cap}Modal`)?.classList.remove('active');
    }

    /**
     * تحويل قيمة اللون لصيغة #RRGGBB
     */
    function normalizeHex(raw) {
        if (!raw || typeof raw !== 'string') return null;
        const v = raw.trim();
        if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) return null;
        return v.length === 4
            ? '#' + v.slice(1).split('').map(c => c + c).join('')
            : v;
    }

    /**
     * تطبيق لون على مكوّن الـ favorite color (picker + hex + swatch + presets)
     */
    function applyFavoriteColor(value, origin) {
        const normalized = normalizeHex(value);
        if (!normalized) return;

        const picker  = document.getElementById('favoriteColorPicker');
        const hex     = document.getElementById('modalEditFavoriteColor');
        const swatch  = document.getElementById('favoriteColorSwatch');
        const presets = document.getElementById('favoriteColorPresets');

        if (swatch) swatch.style.background = normalized;
        if (picker && origin !== 'picker') picker.value = normalized;
        if (hex && origin !== 'hex') hex.value = normalized.toUpperCase();
        if (presets) {
            presets.querySelectorAll('.form-color-preset').forEach(btn => {
                btn.classList.toggle('is-active',
                    btn.dataset.color?.toLowerCase() === normalized.toLowerCase());
            });
        }
    }

    /**
     * ربط تزامن حقل اللون المفضل (يُستدعى مرة واحدة)
     */
    function setupFavoriteColorSync() {
        const picker  = document.getElementById('favoriteColorPicker');
        const hex     = document.getElementById('modalEditFavoriteColor');
        const presets = document.getElementById('favoriteColorPresets');

        picker?.addEventListener('input', () => applyFavoriteColor(picker.value, 'picker'));

        // يقبل حروف hex (0-9, a-f) فقط ويضيف # تلقائياً
        hex?.addEventListener('input', () => {
            const atEnd = (hex.selectionStart ?? 0) >= hex.value.length;
            const cleaned = hex.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6).toUpperCase();
            const formatted = cleaned ? '#' + cleaned : '';
            if (formatted !== hex.value) {
                hex.value = formatted;
                if (atEnd) {
                    try { hex.setSelectionRange(formatted.length, formatted.length); } catch (_) {}
                }
            }
            if (cleaned.length === 3 || cleaned.length === 6) {
                applyFavoriteColor('#' + cleaned, 'hex');
            }
        });

        presets?.addEventListener('click', (e) => {
            const btn = e.target.closest('.form-color-preset');
            if (btn?.dataset.color) applyFavoriteColor(btn.dataset.color, 'preset');
        });
    }

    async function saveModalEdit(cardName) {
        const cap     = cardName.charAt(0).toUpperCase() + cardName.slice(1);
        const saveBtn = document.getElementById(`saveEdit${cap}Btn`);
        const originalHTML = saveBtn.innerHTML;
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الحفظ...';

        try {
            const updateData = { updated_at: new Date().toISOString() };
            let newPhone;

            Object.entries(MODAL_FIELDS[cardName] || {}).forEach(([fieldId, inputId]) => {
                const input   = document.getElementById(inputId);
                const mapping = FIELD_MAPPING[fieldId];
                if (!input || !mapping) return;
                const value = input.value.trim() || null;
                updateData[mapping.column] = value;
                if (mapping.also === 'profiles') newPhone = value;
            });

            const { error } = await window.sbClient
                .from('member_details')
                .update(updateData)
                .eq('user_id', currentUser.id);
            if (error) throw error;

            if (newPhone !== undefined) {
                await window.sbClient
                    .from('profiles')
                    .update({ phone: newPhone, updated_at: new Date().toISOString() })
                    .eq('id', currentUser.id);
            }

            showNotification('تم حفظ التغييرات بنجاح', 'success');
            closeEditModal(cardName);
            await loadProfileData();
        } catch (err) {
            console.error('خطأ في حفظ البيانات:', err);
            showNotification('فشل الحفظ: ' + err.message, 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalHTML;
        }
    }
    

    /**
     * التحقق من إمكانية تغيير الاسم
     */
    async function checkCanChangeName() {
        try {
            const { data, error } = await window.sbClient
                .rpc('can_change_name', { p_user_id: currentUser.id });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('خطأ في التحقق من إمكانية تغيير الاسم:', error);
            return true;
        }
    }

    /**
     * فتح Modal تغيير الاسم
     */
    async function openChangeNameModal() {
        const canChange = await checkCanChangeName();
        if (canChange === false) {
            showNotification('لا يمكنك تغيير الاسم حالياً. يرجى التواصل مع الإدارة.', 'warning');
            return;
        }

        const input = document.getElementById('modalEditFullNameTriple');
        const currentName = document.getElementById('profileFullName')?.textContent?.trim() || '';
        if (input) input.value = (currentName === 'جاري التحميل...') ? '' : currentName;

        document.getElementById('editNameBackdrop')?.classList.add('active');
        document.getElementById('editNameModal')?.classList.add('active');
        input?.focus();
    }

    function closeChangeNameModal() {
        document.getElementById('editNameBackdrop')?.classList.remove('active');
        document.getElementById('editNameModal')?.classList.remove('active');
    }

    /**
     * حفظ الاسم الجديد
     */
    async function saveNameChange() {
        const input = document.getElementById('modalEditFullNameTriple');
        const saveBtn = document.getElementById('saveEditNameBtn');
        const newName = (input?.value || '').trim();

        if (!newName) {
            showNotification('يرجى إدخال الاسم', 'warning');
            return;
        }
        const partsCount = newName.split(/\s+/).length;
        if (partsCount < 3 || partsCount > 4) {
            showNotification('يجب إدخال الاسم الثلاثي أو الرباعي فقط', 'warning');
            return;
        }

        saveBtn.disabled = true;
        const originalHTML = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الحفظ...';

        try {
            const nowIso = new Date().toISOString();

            const { error: memberError } = await window.sbClient
                .from('member_details')
                .update({ full_name_triple: newName, updated_at: nowIso })
                .eq('user_id', currentUser.id);
            if (memberError) throw memberError;

            const { error: profileError } = await window.sbClient
                .from('profiles')
                .update({ full_name: newName, updated_at: nowIso })
                .eq('id', currentUser.id);
            if (profileError) throw profileError;

            currentUser.full_name = newName;
            const headerName = document.getElementById('userName');
            if (headerName) headerName.textContent = newName;
            showNotification('تم تغيير الاسم بنجاح', 'success');
            closeChangeNameModal();
            await loadProfileData();
        } catch (err) {
            console.error('خطأ في تغيير الاسم:', err);
            showNotification('فشل تغيير الاسم: ' + err.message, 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalHTML;
        }
    }


    /**
     * عرض الجلسات النشطة
     */
    function viewActiveSessions() {
        showNotification('ميزة عرض الجلسات النشطة قيد التطوير', 'info');
    }

    /**
     * تغيير الصورة الشخصية
     */
    async function changeAvatar() {
        // إنشاء input لاختيار الملف
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // التحقق من حجم الملف (أقل من 5MB)
            if (file.size > 5 * 1024 * 1024) {
                showNotification('حجم الصورة يجب أن يكون أقل من 5 ميجابايت', 'error');
                return;
            }

            // التحقق من نوع الملف
            if (!file.type.startsWith('image/')) {
                showNotification('يرجى اختيار ملف صورة صحيح', 'error');
                return;
            }

            try {
                showNotification('جاري رفع الصورة...', 'info');

                // رفع الصورة إلى Supabase Storage
                const fileExt = file.name.split('.').pop();
                const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`;
                const filePath = fileName;

                const { data: uploadData, error: uploadError } = await window.sbClient.storage
                    .from('avatars')
                    .upload(filePath, file, {
                        cacheControl: '3600',
                        upsert: true
                    });

                if (uploadError) throw uploadError;

                // الحصول على URL العام للصورة
                const { data: urlData } = window.sbClient.storage
                    .from('avatars')
                    .getPublicUrl(filePath);

                const avatarUrl = urlData.publicUrl;

                // تحديث الصورة في قاعدة البيانات
                const { error: updateError } = await window.sbClient
                    .from('profiles')
                    .update({ avatar_url: avatarUrl })
                    .eq('id', currentUser.id);

                if (updateError) throw updateError;

                // تحديث الصورة في الواجهة
                currentUser.avatar_url = avatarUrl;
                const profileAvatar = document.getElementById('profileAvatar');
                if (profileAvatar) {
                    profileAvatar.src = avatarUrl;
                }

                showNotification('تم تحديث الصورة الشخصية بنجاح', 'success');
            } catch (error) {
                console.error('خطأ في رفع الصورة:', error);
                showNotification('فشل رفع الصورة: ' + error.message, 'error');
            }
        };

        input.click();
    }


    /**
     * ربط الأحداث
     */
    function bindEvents() {
        const viewSessionsBtn = document.getElementById('viewSessionsBtn');
        const changeAvatarBtn = document.getElementById('changeAvatarBtn');
        const changeNameBtn = document.getElementById('changeNameBtn');
        const copyProfileLinkBtn = document.getElementById('copyProfileLinkBtn');
        const openProfileLinkBtn = document.getElementById('openProfileLinkBtn');

        setupEditModals();

        document.getElementById('closeEditNameModal')?.addEventListener('click', closeChangeNameModal);
        document.getElementById('cancelEditNameBtn')?.addEventListener('click', closeChangeNameModal);
        document.getElementById('editNameBackdrop')?.addEventListener('click', closeChangeNameModal);
        document.getElementById('saveEditNameBtn')?.addEventListener('click', saveNameChange);

        if (viewSessionsBtn) {
            viewSessionsBtn.removeEventListener('click', viewActiveSessions);
            viewSessionsBtn.addEventListener('click', viewActiveSessions);
        }

        if (changeAvatarBtn) {
            changeAvatarBtn.removeEventListener('click', changeAvatar);
            changeAvatarBtn.addEventListener('click', changeAvatar);
        }

        if (changeNameBtn) {
            changeNameBtn.removeEventListener('click', openChangeNameModal);
            changeNameBtn.addEventListener('click', openChangeNameModal);
        }

        if (copyProfileLinkBtn) {
            copyProfileLinkBtn.addEventListener('click', copyProfileLink);
        }

        if (openProfileLinkBtn) {
            openProfileLinkBtn.addEventListener('click', openProfileLink);
        }

        document.querySelectorAll('.mc-flip__btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const target = document.querySelector(btn.dataset.flipTarget || '#membershipCard');
                target?.classList.toggle('is-flipped');
            });
        });
    }

    /**
     * نسخ الرابط الشخصي
     */
    async function copyProfileLink() {
        try {
            const profileLinkInput = document.getElementById('profileLinkInput');
            const profileUrl = profileLinkInput.value;

            if (profileUrl === 'جاري التحميل...' || profileUrl === 'لم يتم إنشاء رابط شخصي بعد') {
                showNotification('الرابط الشخصي غير متاح حالياً', 'warning');
                return;
            }

            await navigator.clipboard.writeText(profileUrl);
            
            const copyBtn = document.getElementById('copyProfileLinkBtn');
            const originalHTML = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> تم النسخ';
            copyBtn.disabled = true;

            setTimeout(() => {
                copyBtn.innerHTML = originalHTML;
                copyBtn.disabled = false;
            }, 2000);

            showNotification('تم نسخ الرابط بنجاح', 'success');
        } catch (error) {
            console.error('خطأ في نسخ الرابط:', error);
            showNotification('فشل نسخ الرابط', 'error');
        }
    }

    /**
     * فتح الرابط الشخصي في نافذة جديدة
     */
    function openProfileLink() {
        const profileLinkInput = document.getElementById('profileLinkInput');
        const profileUrl = profileLinkInput.value;

        if (profileUrl === 'جاري التحميل...' || profileUrl === 'لم يتم إنشاء رابط شخصي بعد') {
            showNotification('الرابط الشخصي غير متاح حالياً', 'warning');
            return;
        }

        window.open(profileUrl, '_blank');
    }

    /**
     * عرض إشعار
     */
    function showNotification(message, type = 'info') {
        if (window.Toast && typeof window.Toast[type] === 'function') {
            window.Toast[type](message);
            return;
        }
        if (window.Toast && typeof window.Toast.show === 'function') {
            window.Toast.show({ type, message });
            return;
        }
        console[type === 'error' ? 'error' : 'log'](`[${type}] ${message}`);
    }

    /**
     * تحميل بيانات اللجنة والقسم
     */
    async function loadCommitteeData(userRole) {
        try {
            if (!userRole || !userRole.committee_id) {
                return;
            }

            // جلب بيانات اللجنة مع القسم
            const { data: committee, error: committeeError } = await window.sbClient
                .from('committees')
                .select('*, departments(id, name_ar, description, group_link)')
                .eq('id', userRole.committee_id)
                .single();

            if (committeeError) {
                console.error('خطأ في جلب بيانات اللجنة:', committeeError);
                return;
            }

            // جلب قادة اللجنة (7 = قائد، 8 = نائب)
            const { data: leaders } = await window.sbClient
                .from('user_roles')
                .select('user_id, role_id, profiles!user_roles_user_id_fkey(full_name), roles(role_name_ar)')
                .eq('committee_id', userRole.committee_id)
                .eq('is_active', true)
                .in('role_id', [7, 8])
                .order('role_id', { ascending: true });

            const mainLeader = leaders?.find(l => l.role_id === 7);
            const viceLeader = leaders?.find(l => l.role_id === 8);

            // عد أعضاء اللجنة
            const { count: totalMembers } = await window.sbClient
                .from('user_roles')
                .select('*', { count: 'exact', head: true })
                .eq('committee_id', userRole.committee_id)
                .eq('is_active', true);

            // ═══════════════════════════════════════════
            // تعبئة تبويب "لجنتي"
            // ═══════════════════════════════════════════

            const setText = (id, text) => {
                const el = document.getElementById(id);
                if (el) el.textContent = text;
            };

            setText('myCommitteeNameDisplay', committee.committee_name_ar);
            setText('myCommitteeDescription', committee.description || 'لا يوجد تعريف متاح');
            setText('myCommitteeMembersCount', totalMembers || 0);
            // قائد اللجنة
            if (mainLeader?.profiles?.full_name) {
                setText('myCommitteeLeader', mainLeader.profiles.full_name);
            } else if (viceLeader?.profiles?.full_name) {
                setText('myCommitteeLeader', viceLeader.profiles.full_name + ' (نائب)');
            } else {
                setText('myCommitteeLeader', 'لم يُعيَّن بعد');
            }

            // نائب القائد
            setText('myCommitteeViceLeader', viceLeader?.profiles?.full_name || 'لم يُعيَّن بعد');

            // القسم التابعة له
            const dept = committee.departments;
            if (dept) {
                setText('myCommitteeDepartment', dept.name_ar);
            }

            // دعم الملف الشخصي (القسم القديم إذا وُجد)
            const nameDisplay = document.getElementById('committeeNameDisplay');
            const description = document.getElementById('committeeDescription');
            const leaderDisplay = document.getElementById('committeeLeader');
            const membersCountEl = document.getElementById('committeeMembersCount');

            const displayLeader = mainLeader || viceLeader;
            let leaderText = 'غير محدد';
            if (displayLeader?.profiles?.full_name) {
                const roleTitle = displayLeader.roles?.role_name_ar || (displayLeader.role_id === 7 ? 'قائد اللجنة' : 'نائب قائد اللجنة');
                leaderText = `${displayLeader.profiles.full_name} (${roleTitle})`;
            }

            if (nameDisplay) nameDisplay.textContent = committee.committee_name_ar;
            if (description) description.textContent = committee.description || 'لا يوجد تعريف متاح';
            if (leaderDisplay) leaderDisplay.textContent = leaderText;
            if (membersCountEl) membersCountEl.textContent = totalMembers || 0;

            // رابط قروب اللجنة
            const myGroupLinkContainer = document.getElementById('myCommitteeGroupLinkContainer');
            const myGroupLink = document.getElementById('myCommitteeGroupLink');
            if (committee.group_link && myGroupLinkContainer && myGroupLink) {
                myGroupLink.href = committee.group_link;
                myGroupLinkContainer.classList.remove('d-none');
            }

            const groupLinkContainer = document.getElementById('committeeGroupLinkContainer');
            const groupLink = document.getElementById('committeeGroupLink');
            if (committee.group_link && groupLinkContainer && groupLink) {
                groupLink.href = committee.group_link;
                groupLinkContainer.style.display = 'block';
            } else if (groupLinkContainer) {
                groupLinkContainer.style.display = 'none';
            }

            // جلب وعرض أعضاء اللجنة (member-chips)
            await loadCommitteeMembers(userRole.committee_id);

            // ═══════════════════════════════════════════
            // تعبئة تبويب "قسمي"
            // ═══════════════════════════════════════════

            const deptCard = document.getElementById('myDepartmentInfoCard');
            if (dept && deptCard) {
                setText('myDepartmentNameDisplay', dept.name_ar);
                setText('myDepartmentDescription', dept.description || 'لا يوجد تعريف متاح');

                // جلب رئيس القسم
                const { data: deptHeads } = await window.sbClient
                    .from('user_roles')
                    .select('profiles!user_roles_user_id_fkey(full_name), roles!inner(role_name, role_name_ar)')
                    .eq('department_id', dept.id)
                    .eq('is_active', true)
                    .eq('roles.role_name', 'department_head')
                    .limit(1);

                setText('myDepartmentHead', deptHeads?.[0]?.profiles?.full_name || 'لم يُعيَّن بعد');

                // جلب لجان القسم مع عدد الأعضاء
                const { data: deptCommittees } = await window.sbClient
                    .from('committees')
                    .select('id, committee_name_ar, description, is_active')
                    .eq('department_id', dept.id)
                    .eq('is_active', true)
                    .order('committee_name_ar');

                setText('myDepartmentCommitteesCount', deptCommittees?.length || 0);

                // عرض لجان القسم كبطاقات
                const committeesList = document.getElementById('myDepartmentCommitteesList');
                if (committeesList && deptCommittees?.length) {
                    // جلب عدد الأعضاء وقادة كل لجنة
                    const committeeData = await Promise.all(
                        deptCommittees.map(async (c) => {
                            const [{ count }, { data: cLeaders }] = await Promise.all([
                                window.sbClient
                                    .from('user_roles')
                                    .select('*', { count: 'exact', head: true })
                                    .eq('committee_id', c.id)
                                    .eq('is_active', true),
                                window.sbClient
                                    .from('user_roles')
                                    .select('role_id, profiles!user_roles_user_id_fkey(full_name)')
                                    .eq('committee_id', c.id)
                                    .eq('is_active', true)
                                    .in('role_id', [7, 8])
                                    .order('role_id', { ascending: true })
                            ]);
                            const leader = cLeaders?.find(l => l.role_id === 7);
                            const vice = cLeaders?.find(l => l.role_id === 8);
                            return { ...c, membersCount: count || 0, leaderName: leader?.profiles?.full_name, viceName: vice?.profiles?.full_name };
                        })
                    );

                    committeesList.innerHTML = committeeData.map(c => {
                        const isMyCommittee = c.id === userRole.committee_id;
                        return `
                            <div class="uc-card uc-card--primary">
                                <div class="uc-card__header">
                                    <div class="uc-card__header-inner">
                                        <div class="uc-card__icon">
                                            <i class="fa-solid fa-users"></i>
                                        </div>
                                        <div class="uc-card__header-info">
                                            <h3 class="uc-card__title">${c.committee_name_ar}</h3>
                                            <span class="uc-card__badge"><i class="fa-solid fa-${isMyCommittee ? 'star' : 'users'}"></i> ${isMyCommittee ? 'لجنتي' : 'لجنة'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="uc-card__body">
                                    ${c.description ? `
                                    <div class="uc-card__info-item uc-card__info-item--full">
                                        <div class="uc-card__info-icon"><i class="fa-solid fa-info-circle"></i></div>
                                        <div class="uc-card__info-content">
                                            <span class="uc-card__info-label">تعريف اللجنة</span>
                                            <span class="uc-card__info-value" style="white-space: normal;">${c.description}</span>
                                        </div>
                                    </div>` : ''}
                                    <div class="uc-card__info-item">
                                        <div class="uc-card__info-icon"><i class="fa-solid fa-user-tie"></i></div>
                                        <div class="uc-card__info-content">
                                            <span class="uc-card__info-label">قائد اللجنة</span>
                                            <span class="uc-card__info-value">${c.leaderName || 'لم يُعيَّن بعد'}</span>
                                        </div>
                                    </div>
                                    <div class="uc-card__info-item">
                                        <div class="uc-card__info-icon"><i class="fa-solid fa-user-shield"></i></div>
                                        <div class="uc-card__info-content">
                                            <span class="uc-card__info-label">نائب اللجنة</span>
                                            <span class="uc-card__info-value">${c.viceName || 'لم يُعيَّن بعد'}</span>
                                        </div>
                                    </div>
                                    <div class="uc-card__info-item">
                                        <div class="uc-card__info-icon"><i class="fa-solid fa-users-line"></i></div>
                                        <div class="uc-card__info-content">
                                            <span class="uc-card__info-label">عدد الأعضاء</span>
                                            <span class="uc-card__info-value">${c.membersCount} عضو</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('');
                } else if (committeesList) {
                    committeesList.innerHTML = `
                        <div class="empty-state" style="text-align: center; padding: 2rem; color: #94a3b8;">
                            <i class="fa-solid fa-users-slash" style="font-size: 2rem; margin-bottom: 0.5rem; display: block;"></i>
                            <p>لا توجد لجان في هذا القسم</p>
                        </div>
                    `;
                }

                // رابط قروب القسم
                const deptGroupContainer = document.getElementById('myDepartmentGroupLinkContainer');
                const deptGroupLink = document.getElementById('myDepartmentGroupLink');
                if (dept.group_link && deptGroupContainer && deptGroupLink) {
                    deptGroupLink.href = dept.group_link;
                    deptGroupContainer.classList.remove('d-none');
                }

                // جلب أعضاء القسم
                await loadDepartmentMembers(dept.id, deptCommittees || []);
            } else if (deptCard) {
                deptCard.style.display = 'none';
            }

        } catch (error) {
            console.error('خطأ في تحميل بيانات اللجنة:', error);
        }
    }

    /**
     * تحميل أعضاء القسم
     */
    async function loadDepartmentMembers(departmentId, committees) {
        const container = document.getElementById('myDepartmentMembersList');
        if (!container) return;

        try {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #94a3b8; grid-column: 1 / -1;">
                    <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 0.75rem; display: block;"></i>
                    <p>جاري تحميل أعضاء القسم...</p>
                </div>
            `;

            // جلب كل الأعضاء النشطين في لجان القسم
            const committeeIds = committees.map(c => c.id);
            if (!committeeIds.length) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: #94a3b8; grid-column: 1 / -1;">
                        <i class="fa-solid fa-users-slash" style="font-size: 2rem; margin-bottom: 0.5rem; display: block;"></i>
                        <p>لا يوجد أعضاء في هذا القسم</p>
                    </div>
                `;
                return;
            }

            // جلب أعضاء القسم (رئيس القسم + أعضاء اللجان)
            const [{ data: committeeMembers }, { data: deptDirectMembers }] = await Promise.all([
                window.sbClient
                    .from('user_roles')
                    .select(`
                        id, user_id, role_id, assigned_at,
                        profiles!user_roles_user_id_fkey(id, full_name, email, phone, avatar_url, account_status),
                        roles(role_name, role_name_ar),
                        committees(committee_name_ar)
                    `)
                    .in('committee_id', committeeIds)
                    .eq('is_active', true)
                    .order('assigned_at', { ascending: false }),
                window.sbClient
                    .from('user_roles')
                    .select(`
                        id, user_id, role_id, assigned_at,
                        profiles!user_roles_user_id_fkey(id, full_name, email, phone, avatar_url, account_status),
                        roles(role_name, role_name_ar)
                    `)
                    .eq('department_id', departmentId)
                    .eq('is_active', true)
                    .order('assigned_at', { ascending: false })
            ]);

            // دمج الأعضاء وإزالة المكررين
            const allRaw = [...(deptDirectMembers || []).map(m => ({ ...m, committeeName: null })), ...(committeeMembers || []).map(m => ({ ...m, committeeName: m.committees?.committee_name_ar }))];
            const seen = new Set();
            const allMembers = allRaw.filter(m => {
                if (!m.profiles || m.profiles.account_status !== 'active') return false;
                if (seen.has(m.user_id)) return false;
                seen.add(m.user_id);
                return true;
            });

            // تحديث إحصائية عدد أعضاء القسم
            const deptMembersCountEl = document.getElementById('myDepartmentMembersCount');
            if (deptMembersCountEl) deptMembersCountEl.textContent = allMembers.length;

            renderDepartmentMembers(allMembers);

        } catch (error) {
            console.error('خطأ في تحميل أعضاء القسم:', error);
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #ef4444; grid-column: 1 / -1;">
                    <i class="fa-solid fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 0.5rem; display: block;"></i>
                    <p>حدث خطأ أثناء تحميل الأعضاء</p>
                </div>
            `;
        }
    }

    function renderDepartmentMembers(members) {
        const container = document.getElementById('myDepartmentMembersList');
        if (!container) return;

        if (!members.length) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #94a3b8; grid-column: 1 / -1;">
                    <div style="width: 64px; height: 64px; border-radius: 16px; background: linear-gradient(135deg, #3d8fd6, #274060); display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; color: #fff; font-size: 1.5rem;">
                        <i class="fa-solid fa-users-slash"></i>
                    </div>
                    <p style="font-weight: 600; color: #1e293b; margin-bottom: 0.25rem;">لا توجد نتائج</p>
                    <p style="font-size: 0.85rem;">لم يتم العثور على أعضاء مطابقين لبحثك</p>
                </div>
            `;
            return;
        }

        container.innerHTML = members.map(m => {
            const user = m.profiles;
            const role = m.roles;
            const avatarUrl = user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || 'User')}&background=3d8fd6&color=fff&size=200`;
            const roleName = role?.role_name_ar || 'عضو';
            const committeeName = m.committeeName || '';
            const badgeLabel = committeeName ? `${roleName} · ${committeeName}` : roleName;

            return `
                <div class="member-chip">
                    <img class="member-chip__avatar" src="${avatarUrl}" alt="${user?.full_name || 'عضو'}" />
                    <div class="member-chip__info">
                        <span class="member-chip__name">${user?.full_name || 'غير محدد'}</span>
                        <span class="member-chip__role">
                            <i class="fa-solid fa-shield-halved"></i>
                            ${badgeLabel}
                        </span>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * تحميل أعضاء اللجنة (member-chips)
     */
    async function loadCommitteeMembers(committeeId) {
        const container = document.getElementById('myCommitteeMembersList');
        if (!container) return;

        try {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #94a3b8; grid-column: 1 / -1;">
                    <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 0.75rem; display: block;"></i>
                    <p>جاري تحميل أعضاء اللجنة...</p>
                </div>
            `;

            const { data, error } = await window.sbClient
                .from('user_roles')
                .select(`
                    id, user_id, role_id, assigned_at,
                    profiles!user_roles_user_id_fkey(id, full_name, avatar_url, account_status),
                    roles(role_name, role_name_ar)
                `)
                .eq('committee_id', committeeId)
                .eq('is_active', true)
                .order('assigned_at', { ascending: false });

            if (error) throw error;

            const members = (data || []).filter(m => m.profiles?.account_status === 'active');

            if (!members.length) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: #94a3b8; grid-column: 1 / -1;">
                        <i class="fa-solid fa-users-slash" style="font-size: 2rem; margin-bottom: 0.5rem; display: block;"></i>
                        <p>لا يوجد أعضاء في اللجنة</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = members.map(m => {
                const user = m.profiles;
                const role = m.roles;
                const avatarUrl = user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || 'User')}&background=3d8fd6&color=fff&size=200`;
                const roleLabel = role?.role_name_ar || 'عضو';

                return `
                    <div class="member-chip">
                        <img class="member-chip__avatar" src="${avatarUrl}" alt="${user?.full_name || 'عضو'}" />
                        <div class="member-chip__info">
                            <span class="member-chip__name">${user?.full_name || 'غير محدد'}</span>
                            <span class="member-chip__role">
                                <i class="fa-solid fa-shield-halved"></i>
                                ${roleLabel}
                            </span>
                        </div>
                    </div>
                `;
            }).join('');
        } catch (error) {
            console.error('خطأ في تحميل أعضاء اللجنة:', error);
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #ef4444; grid-column: 1 / -1;">
                    <i class="fa-solid fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 0.5rem; display: block;"></i>
                    <p>حدث خطأ أثناء تحميل الأعضاء</p>
                </div>
            `;
        }
    }

    /**
     * تحميل الرابط الشخصي — يملأ حقل الرابط ويرسم QR إن وُجد slug.
     */
    async function loadProfileLink(memberDetails) {
        const profileLinkInput = document.getElementById('profileLinkInput');
        const qrContainer = document.getElementById('cardQr');
        const slug = memberDetails?.profile_slug;

        if (!slug) {
            if (profileLinkInput) profileLinkInput.value = 'لم يتم إنشاء رابط شخصي بعد';
            clearProfileQr(qrContainer);
            return;
        }

        const profileUrl = `${window.location.origin}/profile.html?slug=${slug}`;
        if (profileLinkInput) profileLinkInput.value = profileUrl;
        await renderProfileQr(qrContainer, profileUrl);
    }

    /**
     * رسم QR Code داخل بطاقة العضوية
     * المكتبة: node-qrcode (soldair) — UMD عبر CDN → window.QRCode
     * المخرج SVG ليبقى حادًا عند أي حجم عرض.
     */
    async function renderProfileQr(container, url) {
        if (!container) return;

        if (!url) {
            clearProfileQr(container);
            return;
        }

        await waitForQrLibrary();

        if (typeof window.QRCode?.toString !== 'function') {
            console.warn('مكتبة QRCode لم تُحمَّل');
            clearProfileQr(container);
            return;
        }

        try {
            const svg = await window.QRCode.toString(url, {
                type: 'svg',
                errorCorrectionLevel: 'M',
                margin: 1,
                color: {
                    dark: '#274060',
                    light: '#00000000'
                }
            });

            container.innerHTML = svg;
            container.hidden = false;
            container.setAttribute('role', 'button');
            container.setAttribute('tabindex', '0');
            container.setAttribute('aria-label', 'افتح الملف الشخصي');
            container.onclick = () => window.open(url, '_blank', 'noopener');
            container.onkeydown = (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    window.open(url, '_blank', 'noopener');
                }
            };
        } catch (error) {
            console.error('فشل توليد QR:', error);
            clearProfileQr(container);
        }
    }

    /**
     * انتظار تحميل مكتبة QRCode (ES module deferred) بحد أقصى 3 ثوانٍ.
     */
    function waitForQrLibrary() {
        if (typeof window.QRCode?.toString === 'function') return Promise.resolve();
        return new Promise(resolve => {
            const done = () => { cleanup(); resolve(); };
            const cleanup = () => {
                window.removeEventListener('qrcode-ready', done);
                clearTimeout(timer);
            };
            const timer = setTimeout(done, 3000);
            window.addEventListener('qrcode-ready', done, { once: true });
        });
    }

    /**
     * إخفاء/تفريغ حاوية QR عند غياب الرابط أو حدوث خطأ.
     */
    function clearProfileQr(container) {
        if (!container) return;
        container.innerHTML = '';
        container.hidden = true;
        container.onclick = null;
        container.onkeydown = null;
        container.removeAttribute('role');
        container.removeAttribute('tabindex');
        container.removeAttribute('aria-label');
    }

    /**
     * استخراج تسمية الدور الحقيقية من user_roles (role_name + اللجنة عند اللزوم).
     * يتجاوز الاعتماد على role_level الذي قد يتداخل بين أدوار مختلفة.
     */
    async function resolveRoleLabel(userId) {
        try {
            const { data, error } = await window.sbClient
                .from('user_roles')
                .select('committees(committee_name_ar), roles(role_name, role_name_ar, role_level)')
                .eq('user_id', userId)
                .eq('is_active', true)
                .order('roles(role_level)', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error || !data?.roles) return 'عضو';

            const roleName = data.roles.role_name;
            const roleNameAr = data.roles.role_name_ar || 'عضو';
            const committeeName = data.committees?.committee_name_ar || '';

            const committeeScoped = {
                committee_leader: n => n ? `قائد ${n}` : 'قائد لجنة',
                deputy_committee_leader: n => n ? `نائب قائد ${n}` : 'نائب قائد لجنة',
                committee_member: n => n ? `عضو ${n}` : 'عضو لجنة'
            };

            if (committeeScoped[roleName]) return committeeScoped[roleName](committeeName);
            return roleNameAr;
        } catch (err) {
            console.error('خطأ في استخراج تسمية الدور:', err);
            return 'عضو';
        }
    }

    /**
     * تحميل بيانات بطاقة العضوية
     */
    async function loadMembershipCard(memberDetails) {
        try {
            const setText = (id, text) => {
                const el = document.getElementById(id);
                if (el) el.textContent = text;
            };

            const displayName = memberDetails?.full_name_triple || currentUser.full_name || 'غير محدد';
            const avatarSrc = currentUser.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=3d8fd6&color=fff&size=200`;

            const cardAvatar = document.getElementById('cardAvatar');
            if (cardAvatar) {
                cardAvatar.src = avatarSrc;
                cardAvatar.alt = displayName;
            }

            setText('cardFullName', displayName);

            const roleLabel = await resolveRoleLabel(currentUser.id);
            setText('cardType', roleLabel);

            const joinDate = new Date(currentUser.created_at).toLocaleDateString('ea-EA', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
            setText('cardJoinDate', joinDate);

        } catch (error) {
            console.error('خطأ في تحميل بطاقة العضوية:', error);
        }
    }

    // تصدير الوظائف
    window.profileManager = {
        init,
        loadCommitteeData,
        loadMembershipCard
    };
})();
