/**
 * نظام إدارة الملف الشخصي
 * عرض وتعديل المعلومات الشخصية، الأمان، النشاط
 */

(function () {
    'use strict';

    let currentUser = null;

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

            // جلب معلومات اللجنة من user_roles
            const { data: userRole } = await window.sbClient
                .from('user_roles')
                .select('committee_id, committees(committee_name_ar)')
                .eq('user_id', currentUser.id)
                .eq('is_active', true)
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

            // تحديث الدور
            const role = document.getElementById('profileRole');
            if (role) {
                const roleInfo = getRoleInfo(currentUser.role_level);
                role.innerHTML = `<i class="fa-solid fa-shield-halved"></i> <span>${roleInfo.name}</span>`;
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
                lastLogin.textContent = lastSignIn 
                    ? new Date(lastSignIn).toLocaleString('ar-SA', {
                        year: 'numeric',
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                    : 'غير معروف';
            }

            // تحديث اللجنة من user_roles
            const committee = document.getElementById('profileCommittee');
            if (committee) {
                const committeeName = userRole?.committees?.committee_name_ar || memberDetails?.committees?.committee_name_ar;
                committee.textContent = committeeName || 'غير محدد';
            }

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
            nationalId.textContent = details.national_id || 'غير محدد';
        }

        const academicRecord = document.getElementById('profileAcademicRecord');
        if (academicRecord) {
            academicRecord.textContent = details.academic_record_number || 'غير محدد';
        }

        const birthDate = document.getElementById('profileBirthDate');
        if (birthDate && details.birth_date) {
            birthDate.textContent = new Date(details.birth_date).toLocaleDateString('ar-SA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }

        const academicDegree = document.getElementById('profileAcademicDegree');
        if (academicDegree) {
            academicDegree.textContent = degreeMap[details.academic_degree] || details.academic_degree || 'غير محدد';
        }

        const college = document.getElementById('profileCollege');
        if (college) {
            college.textContent = details.college || 'غير محدد';
        }

        const major = document.getElementById('profileMajor');
        if (major) {
            major.textContent = details.major || 'غير محدد';
        }

        const twitter = document.getElementById('profileTwitter');
        if (twitter) {
            twitter.textContent = details.twitter_account || 'غير محدد';
        }

        const instagram = document.getElementById('profileInstagram');
        if (instagram) {
            instagram.textContent = details.instagram_account || 'غير محدد';
        }

        const tiktok = document.getElementById('profileTiktok');
        if (tiktok) {
            tiktok.textContent = details.tiktok_account || 'غير محدد';
        }

        const linkedin = document.getElementById('profileLinkedin');
        if (linkedin) {
            linkedin.textContent = details.linkedin_account || 'غير محدد';
        }
    }

    /**
     * الحصول على معلومات الدور
     */
    function getRoleInfo(roleLevel) {
        const levels = {
            10: { name: 'رئيس نادي أدِيب', color: '#dc2626' },
            9: { name: 'قائد لجنة الموارد البشرية', color: '#ea580c' },
            8: { name: 'قائد لجنة الضمان والجودة', color: '#f59e0b' },
            7: { name: 'عضو إداري', color: '#eab308' },
            6: { name: 'رئيس المجلس التنفيذي', color: '#f97316' },
            5: { name: 'قائد لجنة', color: '#84cc16' },
            4: { name: 'نائب قائد لجنة', color: '#22c55e' },
            3: { name: 'عضو لجنة', color: '#10b981' }
        };
        return levels[roleLevel] || { name: 'عضو لجنة', color: '#64748b' };
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
                container.innerHTML = '<p>لا يوجد نشاط مسجل</p>';
                return;
            }

            const html = data.map(activity => `
                <div>
                    <div>
                        <i class="fa-solid ${getActivityIcon(activity.action_type)}"></i>
                    </div>
                    <div>
                        <div>
                            ${getActivityText(activity)}
                        </div>
                        <div>
                            <i class="fa-solid fa-clock"></i>
                            ${new Date(activity.created_at).toLocaleString('ar-SA')}
                        </div>
                    </div>
                </div>
            `).join('');

            container.innerHTML = html;

        } catch (error) {
            console.error('خطأ في تحميل النشاط:', error);
            const container = document.getElementById('recentActivityContainer');
            if (container) {
                container.innerHTML = '<p>فشل تحميل النشاط</p>';
            }
        }
    }

    /**
     * الحصول على لون النشاط
     */
    function getActivityColor(actionType) {
        const colors = {
            'login': '#10b981',
            'logout': '#64748b',
            'create': '#3b82f6',
            'update': '#f59e0b',
            'delete': '#ef4444',
            'approve': '#10b981',
            'reject': '#ef4444'
        };
        return colors[actionType] || '#64748b';
    }

    /**
     * الحصول على أيقونة النشاط
     */
    function getActivityIcon(actionType) {
        const icons = {
            'login': 'fa-right-to-bracket',
            'logout': 'fa-right-from-bracket',
            'create': 'fa-plus',
            'update': 'fa-pen',
            'delete': 'fa-trash',
            'approve': 'fa-check',
            'reject': 'fa-xmark'
        };
        return icons[actionType] || 'fa-circle';
    }

    /**
     * الحصول على نص النشاط
     */
    function getActivityText(activity) {
        const texts = {
            'login': 'تسجيل دخول',
            'logout': 'تسجيل خروج',
            'create': 'إنشاء',
            'update': 'تحديث',
            'delete': 'حذف',
            'approve': 'موافقة',
            'reject': 'رفض'
        };
        const action = texts[activity.action_type] || activity.action_type;
        const module = activity.module || '';
        return `${action} ${module}`;
    }

    /**
     * فتح نافذة تعديل الملف الشخصي
     */
    async function openEditProfileModal() {
        const modal = document.getElementById('editProfileModal');
        if (!modal) return;

        try {
            const { data: memberDetails, error } = await window.sbClient
                .from('member_details')
                .select('*')
                .eq('user_id', currentUser.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('خطأ في جلب بيانات العضو:', error);
            }

            document.getElementById('editFullName').value = memberDetails?.full_name_triple || currentUser.full_name || '';
            document.getElementById('editEmail').value = memberDetails?.email || currentUser.email || '';
            document.getElementById('editPhone').value = memberDetails?.phone || currentUser.phone || '';
            document.getElementById('editNationalId').value = memberDetails?.national_id || '';
            document.getElementById('editBirthDate').value = memberDetails?.birth_date || '';
            document.getElementById('editAcademicRecord').value = memberDetails?.academic_record_number || '';
            document.getElementById('editAcademicDegree').value = memberDetails?.academic_degree || '';
            document.getElementById('editCollege').value = memberDetails?.college || '';
            document.getElementById('editMajor').value = memberDetails?.major || '';
            document.getElementById('editTwitter').value = memberDetails?.twitter_account || '';
            document.getElementById('editInstagram').value = memberDetails?.instagram_account || '';
            document.getElementById('editTiktok').value = memberDetails?.tiktok_account || '';
            document.getElementById('editLinkedin').value = memberDetails?.linkedin_account || '';

            const canChangeName = await checkCanChangeName();
            const nameWarning = document.getElementById('nameChangeWarning');
            if (!canChangeName && nameWarning) {
                nameWarning.style.display = 'block';
            }

            modal.style.display = 'flex';

            const closeBtn = document.getElementById('closeEditProfileModal');
            const cancelBtn = document.getElementById('cancelEditProfile');
            const saveBtn = document.getElementById('saveProfileChanges');

            closeBtn.onclick = () => modal.style.display = 'none';
            cancelBtn.onclick = () => modal.style.display = 'none';
            saveBtn.onclick = handleSaveProfileChanges;

        } catch (error) {
            console.error('خطأ في فتح نافذة التعديل:', error);
            showNotification('فشل فتح نافذة التعديل', 'error');
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
     * حفظ التغييرات على البيانات الشخصية
     */
    async function handleSaveProfileChanges() {
        try {
            const newFullName = document.getElementById('editFullName').value.trim();
            const newEmail = document.getElementById('editEmail').value.trim();
            const newPhone = document.getElementById('editPhone').value.trim();
            const newNationalId = document.getElementById('editNationalId').value.trim();
            const newBirthDate = document.getElementById('editBirthDate').value;
            const newAcademicRecord = document.getElementById('editAcademicRecord').value.trim();
            const newAcademicDegree = document.getElementById('editAcademicDegree').value;
            const newCollege = document.getElementById('editCollege').value.trim();
            const newMajor = document.getElementById('editMajor').value.trim();
            const newTwitter = document.getElementById('editTwitter').value.trim();
            const newInstagram = document.getElementById('editInstagram').value.trim();
            const newTiktok = document.getElementById('editTiktok').value.trim();
            const newLinkedin = document.getElementById('editLinkedin').value.trim();

            const { data: oldData } = await window.sbClient
                .from('member_details')
                .select('full_name_triple')
                .eq('user_id', currentUser.id)
                .single();

            const nameChanged = oldData && oldData.full_name_triple !== newFullName;

            if (nameChanged) {
                const canChange = await checkCanChangeName();
                if (!canChange) {
                    showNotification('لا يمكن تغيير الاسم إلا مرة واحدة كل 30 يومًا', 'error');
                    return;
                }

                const { error: nameChangeError } = await window.sbClient
                    .from('profile_name_changes')
                    .insert({
                        user_id: currentUser.id,
                        old_name: oldData.full_name_triple,
                        new_name: newFullName,
                        changed_by: currentUser.id
                    });

                if (nameChangeError) {
                    console.error('خطأ في تسجيل تغيير الاسم:', nameChangeError);
                }
            }

            const { error: updateError } = await window.sbClient
                .from('member_details')
                .update({
                    full_name_triple: newFullName,
                    email: newEmail,
                    phone: newPhone,
                    national_id: newNationalId,
                    birth_date: newBirthDate,
                    academic_record_number: newAcademicRecord,
                    academic_degree: newAcademicDegree,
                    college: newCollege || null,
                    major: newMajor || null,
                    twitter_account: newTwitter || null,
                    instagram_account: newInstagram || null,
                    tiktok_account: newTiktok || null,
                    linkedin_account: newLinkedin || null,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', currentUser.id);

            if (updateError) throw updateError;

            const { error: profileError } = await window.sbClient
                .from('profiles')
                .update({
                    full_name: newFullName,
                    phone: newPhone,
                    updated_at: new Date().toISOString()
                })
                .eq('id', currentUser.id);

            if (profileError) {
                console.warn('تحذير: فشل تحديث جدول profiles:', profileError);
            }

            showNotification('تم حفظ التغييرات بنجاح', 'success');
            document.getElementById('editProfileModal').style.display = 'none';
            
            await loadProfileData();

        } catch (error) {
            console.error('خطأ في حفظ التغييرات:', error);
            showNotification(`فشل حفظ التغييرات: ${error.message}`, 'error');
        }
    }

    /**
     * معالجة تعديل الملف الشخصي
     */
    async function handleEditProfile(e) {
        e.preventDefault();

        const fullName = document.getElementById('editFullName').value.trim();
        const phone = document.getElementById('editPhone').value.trim();

        try {
            const { error } = await window.sbClient
                .from('user_profiles')
                .update({
                    full_name: fullName,
                    phone: phone || null
                })
                .eq('id', currentUser.id);

            if (error) throw error;

            showNotification('تم تحديث الملف الشخصي بنجاح', 'success');
            document.getElementById('editProfileModal').remove();
            
            // تحديث البيانات المحلية
            currentUser.full_name = fullName;
            currentUser.phone = phone;
            await loadProfileData();

        } catch (error) {
            console.error('خطأ في تحديث الملف الشخصي:', error);
            showNotification(`فشل تحديث الملف الشخصي: ${error.message}`, 'error');
        }
    }

    /**
     * فتح نافذة تغيير كلمة المرور
     */
    function openChangePasswordModal() {
        const modal = document.getElementById('changePasswordModal');
        if (!modal) return;

        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmNewPassword').value = '';

        modal.style.display = 'flex';

        const closeBtn = document.getElementById('closeChangePasswordModal');
        const cancelBtn = document.getElementById('cancelChangePassword');
        const saveBtn = document.getElementById('saveNewPassword');

        closeBtn.onclick = () => modal.style.display = 'none';
        cancelBtn.onclick = () => modal.style.display = 'none';
        saveBtn.onclick = handleChangePassword;
    }

    /**
     * معالجة تغيير كلمة المرور
     */
    async function handleChangePassword() {
        try {
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmNewPassword').value;

            if (newPassword !== confirmPassword) {
                showNotification('كلمة المرور الجديدة غير متطابقة', 'error');
                return;
            }

            if (newPassword.length < 8) {
                showNotification('كلمة المرور يجب أن تكون 8 أحرف على الأقل', 'error');
                return;
            }

            const { error } = await window.sbClient.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            showNotification('تم تغيير كلمة المرور بنجاح', 'success');
            document.getElementById('changePasswordModal').style.display = 'none';

        } catch (error) {
            console.error('خطأ في تغيير كلمة المرور:', error);
            showNotification(`فشل تغيير كلمة المرور: ${error.message}`, 'error');
        }
    }

    /**
     * فتح نافذة تغيير كلمة المرور (قديم - سيتم حذفه)
     */
    function openChangePasswordModalOld() {
        const modalHtml = `
            <div class="modal-overlay" id="changePasswordModalOld" onclick="if(event.target === this) this.remove()">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fa-solid fa-key"></i> تغيير كلمة المرور</h2>
                        <button class="modal-close" onclick="document.getElementById('changePasswordModalOld').remove()">
                            <i class="fa-solid fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form id="changePasswordFormOld">
                            <div class="form-group">
                                <label><strong>كلمة المرور الجديدة</strong></label>
                                <input type="password" id="newPasswordOld" required minlength="8" placeholder="8 أحرف على الأقل">
                            </div>
                            <div class="form-group">
                                <label><strong>تأكيد كلمة المرور</strong></label>
                                <input type="password" id="confirmPassword" required minlength="8" placeholder="أعد إدخال كلمة المرور">
                            </div>
                            <div>
                                <i class="fa-solid fa-triangle-exclamation"></i>
                                تأكد من استخدام كلمة مرور قوية تحتوي على أحرف كبيرة وصغيرة وأرقام
                            </div>
                            <div>
                                <button type="button" class="btn-outline" onclick="document.getElementById('changePasswordModal').remove()">
                                    إلغاء
                                </button>
                                <button type="submit" class="btn-primary">
                                    <i class="fa-solid fa-check"></i>
                                    تغيير كلمة المرور
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        document.getElementById('changePasswordForm').addEventListener('submit', handleChangePassword);
    }

    /**
     * معالجة تغيير كلمة المرور
     */
    async function handleChangePassword(e) {
        e.preventDefault();

        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword !== confirmPassword) {
            showNotification('كلمتا المرور غير متطابقتين', 'warning');
            return;
        }

        if (newPassword.length < 8) {
            showNotification('كلمة المرور يجب أن تكون 8 أحرف على الأقل', 'warning');
            return;
        }

        try {
            const { error } = await window.sbClient.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            showNotification('تم تغيير كلمة المرور بنجاح', 'success');
            document.getElementById('changePasswordModal').remove();

        } catch (error) {
            console.error('خطأ في تغيير كلمة المرور:', error);
            showNotification(`فشل تغيير كلمة المرور: ${error.message}`, 'error');
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
    function changeAvatar() {
        showNotification('ميزة تغيير الصورة الشخصية قيد التطوير', 'info');
    }

    /**
     * ربط الأحداث
     */
    function bindEvents() {
        const editProfileBtn = document.getElementById('editProfileBtn');
        const changePasswordBtn = document.getElementById('changePasswordBtn');
        const viewSessionsBtn = document.getElementById('viewSessionsBtn');
        const changeAvatarBtn = document.getElementById('changeAvatarBtn');

        if (editProfileBtn) {
            editProfileBtn.removeEventListener('click', openEditProfileModal);
            editProfileBtn.addEventListener('click', openEditProfileModal);
        }

        if (changePasswordBtn) {
            changePasswordBtn.removeEventListener('click', openChangePasswordModal);
            changePasswordBtn.addEventListener('click', openChangePasswordModal);
        }

        if (viewSessionsBtn) {
            viewSessionsBtn.removeEventListener('click', viewActiveSessions);
            viewSessionsBtn.addEventListener('click', viewActiveSessions);
        }

        if (changeAvatarBtn) {
            changeAvatarBtn.removeEventListener('click', changeAvatar);
            changeAvatarBtn.addEventListener('click', changeAvatar);
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

    /**
     * تحميل بيانات اللجنة
     */
    async function loadCommitteeData(userRole) {
        try {
            if (!userRole || !userRole.committee_id) {
                return;
            }

            const { data: committee, error: committeeError } = await window.sbClient
                .from('committees')
                .select('*')
                .eq('id', userRole.committee_id)
                .single();

            if (committeeError) {
                console.error('خطأ في جلب بيانات اللجنة:', committeeError);
                return;
            }

            // جلب قائد اللجنة (role_id: 7 = قائد لجنة، 8 = نائب قائد لجنة)
            const { data: leaders, error: leadersError } = await window.sbClient
                .from('user_roles')
                .select('user_id, role_id, profiles!user_roles_user_id_fkey(full_name), roles(role_name_ar)')
                .eq('committee_id', userRole.committee_id)
                .eq('is_active', true)
                .in('role_id', [7, 8]) // 7 = قائد لجنة، 8 = نائب قائد لجنة
                .order('role_id', { ascending: true }); // قائد اللجنة أولاً

            if (leadersError) {
                console.error('خطأ في جلب قادة اللجنة:', leadersError);
            }
            
            console.log('قادة اللجنة:', leaders);

            // اختيار القائد أو النائب
            const mainLeader = leaders?.find(l => l.role_id === 7); // قائد اللجنة
            const viceLeader = leaders?.find(l => l.role_id === 8); // نائب قائد اللجنة
            const displayLeader = mainLeader || viceLeader;

            // عد أعضاء اللجنة
            const { count: totalMembers } = await window.sbClient
                .from('user_roles')
                .select('*', { count: 'exact', head: true })
                .eq('committee_id', userRole.committee_id)
                .eq('is_active', true);

            // تعبئة البيانات - دعم كلا القسمين (الملف الشخصي و لجنتي)
            const nameDisplay = document.getElementById('committeeNameDisplay');
            const description = document.getElementById('committeeDescription');
            const leaderDisplay = document.getElementById('committeeLeader');
            const membersCountEl = document.getElementById('committeeMembersCount');
            
            const myNameDisplay = document.getElementById('myCommitteeNameDisplay');
            const myDescription = document.getElementById('myCommitteeDescription');
            const myLeaderDisplay = document.getElementById('myCommitteeLeader');
            const myMembersCountEl = document.getElementById('myCommitteeMembersCount');
            
            // تنسيق عرض القائد/النائب
            let leaderText = 'غير محدد';
            if (displayLeader?.profiles?.full_name) {
                const roleTitle = displayLeader.roles?.role_name_ar || (displayLeader.role_id === 7 ? 'قائد اللجنة' : 'نائب قائد اللجنة');
                leaderText = `${displayLeader.profiles.full_name} (${roleTitle})`;
            }
            
            if (nameDisplay) nameDisplay.textContent = committee.committee_name_ar;
            if (description) description.textContent = committee.description || 'لا يوجد تعريف متاح';
            if (leaderDisplay) leaderDisplay.textContent = leaderText;
            if (membersCountEl) membersCountEl.textContent = totalMembers || 0;
            
            if (myNameDisplay) myNameDisplay.textContent = committee.committee_name_ar;
            if (myDescription) myDescription.textContent = committee.description || 'لا يوجد تعريف متاح';
            if (myLeaderDisplay) myLeaderDisplay.textContent = leaderText;
            if (myMembersCountEl) myMembersCountEl.textContent = totalMembers || 0;

            // عرض رابط القروب إذا كان موجوداً
            const groupLinkContainer = document.getElementById('committeeGroupLinkContainer');
            const groupLink = document.getElementById('committeeGroupLink');
            const myGroupLinkContainer = document.getElementById('myCommitteeGroupLinkContainer');
            const myGroupLink = document.getElementById('myCommitteeGroupLink');
            
            if (committee.group_link) {
                if (groupLinkContainer && groupLink) {
                    groupLink.href = committee.group_link;
                    groupLinkContainer.style.display = 'block';
                }
                if (myGroupLinkContainer && myGroupLink) {
                    myGroupLink.href = committee.group_link;
                    myGroupLinkContainer.style.display = 'block';
                }
            } else {
                if (groupLinkContainer) groupLinkContainer.style.display = 'none';
                if (myGroupLinkContainer) myGroupLinkContainer.style.display = 'none';
            }

        } catch (error) {
            console.error('خطأ في تحميل بيانات اللجنة:', error);
        }
    }

    /**
     * تحميل بيانات بطاقة العضوية
     */
    async function loadMembershipCard(memberDetails) {
        try {
            const cardAvatar = document.getElementById('cardAvatar');
            if (cardAvatar) {
                const displayName = memberDetails?.full_name_triple || currentUser.full_name || 'User';
                cardAvatar.src = currentUser.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=3d8fd6&color=fff&size=200`;
            }

            const cardFullName = document.getElementById('cardFullName');
            if (cardFullName) {
                cardFullName.textContent = memberDetails?.full_name_triple || currentUser.full_name || 'غير محدد';
            }

            const cardNationalId = document.getElementById('cardNationalId');
            if (cardNationalId && memberDetails?.national_id) {
                const maskedId = memberDetails.national_id.substring(0, 3) + '*******';
                cardNationalId.textContent = maskedId;
            }

            const cardAcademicRecord = document.getElementById('cardAcademicRecord');
            if (cardAcademicRecord && memberDetails?.academic_record_number) {
                const maskedRecord = memberDetails.academic_record_number.substring(0, 3) + '*******';
                cardAcademicRecord.textContent = maskedRecord;
            }

            const cardRole = document.getElementById('cardRole');
            if (cardRole) {
                const roleInfo = getRoleInfo(currentUser.role_level);
                cardRole.textContent = roleInfo.name;
            }

            const cardType = document.getElementById('cardType');
            if (cardType) {
                const roleInfo = getRoleInfo(currentUser.role_level);
                cardType.textContent = roleInfo.name;
            }

            const cardJoinDate = document.getElementById('cardJoinDate');
            if (cardJoinDate) {
                cardJoinDate.textContent = new Date(currentUser.created_at).toLocaleDateString('ar-SA', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                });
            }

            const cardMemberId = document.getElementById('cardMemberId');
            if (cardMemberId) {
                cardMemberId.textContent = currentUser.id.substring(0, 8).toUpperCase();
            }

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
